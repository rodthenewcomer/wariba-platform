import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import { openPosition, closePosition } from '../src/trading';
import { acknowledgePerformanceRules } from '../src/performance-onboarding';
import {
  activatePerformanceAccountInTransaction,
  loadActiveCycle,
  evaluateCycleProgress,
  closeCycleAndAdvanceInTransaction,
} from '../src/performance';

/**
 * Prompt 08 Phase C — real integration tests against the live hosted
 * database for the Performance cycle/buffer/Performance-Days machinery.
 * Requires DATABASE_URL (via .env.local, gitignored).
 *
 * Performance accounts here are activated directly via
 * activatePerformanceAccountInTransaction against a real (but never
 * actually passed) Evaluation account, rather than driving a full
 * Evaluation to 'passed' — that atomic-activation path is already covered
 * by risk.integration.test.ts's own Prompt 08 Phase B test; this file is
 * about what happens on and after the Performance account exists.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

const NOW = new Date();
const FRESH_TICK = NOW.toISOString();
const ALL_MARKETS = {
  EURUSD: { bid: '1.08450', ask: '1.08460', timestamp: FRESH_TICK, sequence: '900' },
  GBPUSD: { bid: '1.26000', ask: '1.26020', timestamp: FRESH_TICK, sequence: '900' },
  USDJPY: { bid: '150.100', ask: '150.120', timestamp: FRESH_TICK, sequence: '900' },
  XAUUSD: { bid: '2000.00', ask: '2000.30', timestamp: FRESH_TICK, sequence: '900' },
  NAS100: { bid: '18000.0', ask: '18002.0', timestamp: FRESH_TICK, sequence: '900' },
};
function marketsWithEurusd(market: {
  bid: string;
  ask: string;
  timestamp: string;
  sequence: string;
}) {
  return { ...ALL_MARKETS, EURUSD: market };
}

describeIfDb('performance engine — real database', () => {
  let db: Db;
  const cleanupAccountIds: string[] = [];
  const cleanupUserIds: string[] = [];

  const createTestUser = async (email: string): Promise<string> => {
    const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password: randomUUID(), email_confirm: true }),
    });
    const body = (await res.json()) as { id: string };
    return body.id;
  };

  const deleteTestUser = async (id: string): Promise<void> => {
    await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${id}`, {
      method: 'DELETE',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
  };

  /** A real passed Evaluation account used as canonical Performance provenance. */
  const createEvaluationAccount = async (
    label: string,
  ): Promise<{ userId: string; accountId: string; nominalBalance: string; currency: string }> => {
    const userId = await createTestUser(
      `perf-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@wariba-test.invalid`,
    );
    cleanupUserIds.push(userId);
    const productVersion = await db
      .selectFrom('app.product_versions')
      .innerJoin('app.products', 'app.products.id', 'app.product_versions.product_id')
      .select([
        'app.product_versions.id',
        'app.products.nominal_balance',
        'app.products.nominal_currency',
      ])
      .where('app.products.code', '=', '10K')
      .executeTakeFirstOrThrow();
    const order = await db
      .insertInto('app.purchase_orders')
      .values({
        user_id: userId,
        product_version_id: productVersion.id,
        idempotency_key: randomUUID(),
        status: 'paid',
        total_amount: '39900.00',
        total_currency: 'XOF',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    const account = await activateEvaluationAccount(db, {
      purchaseOrderId: order.id,
      userId,
      nominalBalance: productVersion.nominal_balance,
      currency: productVersion.nominal_currency,
    });
    await db
      .updateTable('app.trading_accounts')
      .set({ status: 'passed' })
      .where('id', '=', account.id)
      .execute();
    cleanupAccountIds.push(account.id);
    return {
      userId,
      accountId: account.id,
      nominalBalance: productVersion.nominal_balance,
      currency: productVersion.nominal_currency,
    };
  };

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
  }, 15000);

  afterAll(async () => {
    const spawnedPerformanceAccounts =
      cleanupAccountIds.length > 0
        ? await db
            .selectFrom('app.trading_accounts')
            .select('id')
            .where('source_evaluation_account_id', 'in', cleanupAccountIds)
            .execute()
        : [];
    const allAccountIds = [
      ...spawnedPerformanceAccounts.map((row) => row.id),
      ...cleanupAccountIds,
    ];

    for (const id of allAccountIds) {
      const positions = await db
        .selectFrom('app.positions')
        .select('id')
        .where('account_id', '=', id)
        .execute();
      for (const p of positions) {
        await db.deleteFrom('app.fills').where('position_id', '=', p.id).execute();
      }
      await db.deleteFrom('app.trade_orders').where('account_id', '=', id).execute();
      await db.deleteFrom('app.positions').where('account_id', '=', id).execute();
      await db.deleteFrom('app.trading_ledger_entries').where('account_id', '=', id).execute();
      for (const p of positions) {
        await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', p.id).execute();
      }
      await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', id).execute();
      await db.deleteFrom('app.risk_violations').where('account_id', '=', id).execute();
      await db.deleteFrom('app.account_daily_snapshots').where('account_id', '=', id).execute();
      await db.deleteFrom('app.account_state_transitions').where('account_id', '=', id).execute();
      await db.deleteFrom('app.performance_cycles').where('account_id', '=', id).execute();
      await db.deleteFrom('app.performance_review_cases').where('account_id', '=', id).execute();
      await db
        .deleteFrom('app.performance_rule_acknowledgements')
        .where('account_id', '=', id)
        .execute();
      const account = await db
        .selectFrom('app.trading_accounts')
        .select('source_purchase_order_id')
        .where('id', '=', id)
        .executeTakeFirstOrThrow();
      await db.deleteFrom('app.trading_accounts').where('id', '=', id).execute();
      await db
        .deleteFrom('app.payment_events')
        .where('purchase_order_id', '=', account.source_purchase_order_id)
        .execute();
      await db
        .deleteFrom('app.purchase_orders')
        .where('id', '=', account.source_purchase_order_id)
        .execute();
    }
    for (const uid of cleanupUserIds) {
      await deleteTestUser(uid);
    }
    await db.destroy();
  }, 60000);

  it('activation creates cycle #1, and a fresh account has zero progress toward its buffer/Performance Days', async () => {
    const evaluation = await createEvaluationAccount('fresh');
    const performance = await activatePerformanceAccountInTransaction(db, {
      evaluationAccountId: evaluation.accountId,
    });

    const cycle = await loadActiveCycle(db, performance.id);
    expect(cycle?.cycleNumber).toBe(1);
    expect(cycle?.status).toBe('active');

    const progress = await evaluateCycleProgress(db, performance.id);
    expect(progress.cycleNumber).toBe(1);
    expect(progress.bufferFloor).toBe('11000.00'); // 10K * 1.10
    expect(progress.performanceDayThreshold).toBe('50.00'); // 10K * 0.50%
    expect(progress.performanceDaysCompleted).toBe(0);
    expect(progress.performanceDaysRequired).toBe(5);
    expect(progress.bufferReached).toBe(false);
    expect(progress.eligibleExcess).toBe('0.00');
  }, 30000);

  it('a fill above the buffer floor moves eligibleExcess by exactly the amount above it', async () => {
    const evaluation = await createEvaluationAccount('excess');
    const performance = await activatePerformanceAccountInTransaction(db, {
      evaluationAccountId: evaluation.accountId,
    });

    const beforeAcknowledgement = await openPosition(db, {
      accountId: performance.id,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.60',
      market: ALL_MARKETS.EURUSD,
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });
    expect(beforeAcknowledgement.order.rejectionCode).toBe('performance_rules_not_acknowledged');
    await acknowledgePerformanceRules(db, {
      userId: evaluation.userId,
      accountId: performance.id,
      correlationId: randomUUID(),
      now: NOW,
    });

    // 0.60 lot EURUSD, ~905 points — well above the 1000 needed to clear
    // the 11,000 floor from a 10,000 nominal start (same trade shape as
    // risk.integration.test.ts's own pass scenario).
    const openMarket = { bid: '1.09995', ask: '1.10000', timestamp: FRESH_TICK, sequence: '1' };
    const firstPerformanceTradeKey = randomUUID();
    const open = await openPosition(db, {
      accountId: performance.id,
      idempotencyKey: firstPerformanceTradeKey,
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.60',
      market: openMarket,
      marketBySymbol: marketsWithEurusd(openMarket),
      now: NOW,
    });
    const replayedOpen = await openPosition(db, {
      accountId: performance.id,
      idempotencyKey: firstPerformanceTradeKey,
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.60',
      market: openMarket,
      marketBySymbol: marketsWithEurusd(openMarket),
      now: NOW,
    });
    expect(replayedOpen.order.alreadyExisted).toBe(true);
    const firstTradeEvents = await db
      .selectFrom('app.outbox_events')
      .select('id')
      .where('aggregate_id', '=', performance.id)
      .where('event_type', '=', 'performance_first_trade')
      .execute();
    expect(firstTradeEvents).toHaveLength(1);
    const closeMarket = {
      bid: '1.10900',
      ask: '1.10905',
      timestamp: new Date(NOW.getTime() + 61_000).toISOString(),
      sequence: '2',
    };
    const closed = await closePosition(db, {
      accountId: performance.id,
      idempotencyKey: randomUUID(),
      positionId: open.position?.id as string,
      mode: 'full',
      market: closeMarket,
      marketBySymbol: marketsWithEurusd(closeMarket),
      now: new Date(NOW.getTime() + 61_000),
    });
    expect(closed.fill?.realizedPnl).toBe('537.60');

    const progress = await evaluateCycleProgress(db, performance.id);
    // realized balance = 10000 + 537.60 = 10537.60, still below the
    // 11000 floor — buffer not reached yet, excess still zero.
    expect(progress.bufferReached).toBe(false);
    expect(progress.eligibleExcess).toBe('0.00');
  }, 30000);

  it('closeCycleAndAdvanceInTransaction opens cycle #2 when closing cycle #1', async () => {
    const evaluation = await createEvaluationAccount('advance');
    const performance = await activatePerformanceAccountInTransaction(db, {
      evaluationAccountId: evaluation.accountId,
    });
    const cycle = await loadActiveCycle(db, performance.id);

    const result = await closeCycleAndAdvanceInTransaction(db, {
      accountId: performance.id,
      cycleId: cycle?.id as string,
      now: new Date(),
    });
    expect(result.nextCycleNumber).toBe(2);
    expect(result.reviewCaseCreated).toBe(false);

    const newCycle = await loadActiveCycle(db, performance.id);
    expect(newCycle?.cycleNumber).toBe(2);
    expect(newCycle?.status).toBe('active');

    const closedCycle = await db
      .selectFrom('app.performance_cycles')
      .select(['status', 'closed_at'])
      .where('id', '=', cycle?.id as string)
      .executeTakeFirstOrThrow();
    expect(closedCycle.status).toBe('closed');
    expect(closedCycle.closed_at).not.toBeNull();
  }, 30000);

  it('closeCycleAndAdvanceInTransaction opens the WARIBA Review case instead of a 6th cycle when closing cycle #5', async () => {
    const evaluation = await createEvaluationAccount('review');
    const performance = await activatePerformanceAccountInTransaction(db, {
      evaluationAccountId: evaluation.accountId,
    });
    const cycle1 = await loadActiveCycle(db, performance.id);

    // Fast-forward directly to cycle #5 rather than replaying four real
    // payout cycles — this test is about the max-cycle boundary
    // specifically, not the full realistic path there.
    await db
      .updateTable('app.performance_cycles')
      .set({ cycle_number: 5 })
      .where('id', '=', cycle1?.id as string)
      .execute();

    const result = await closeCycleAndAdvanceInTransaction(db, {
      accountId: performance.id,
      cycleId: cycle1?.id as string,
      now: new Date(),
    });
    expect(result.nextCycleNumber).toBeNull();
    expect(result.reviewCaseCreated).toBe(true);

    const activeCycle = await loadActiveCycle(db, performance.id);
    expect(activeCycle).toBeNull(); // no cycle #6

    const reviewCase = await db
      .selectFrom('app.performance_review_cases')
      .selectAll()
      .where('account_id', '=', performance.id)
      .executeTakeFirstOrThrow();
    expect(reviewCase.status).toBe('open');
  }, 30000);
});
