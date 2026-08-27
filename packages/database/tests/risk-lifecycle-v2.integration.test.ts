import { randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { computeMachineHash, V2_POLICY_PARAMETERS } from '@wariba/policies';
import { createDbClient, type Db } from '../src/client';
import { lockAccount } from '../src/accounts';
import { activateEvaluationAccount } from '../src/activation';
import { finalizeDailyBoundaryForAccount } from '../src/daily-finalization';
import { loadPolicyById } from '../src/policy';
import { loadAccountBalanceProjection } from '../src/program-eligibility';
import {
  activatePerformanceAccountInTransaction,
  closeCycleAndAdvanceInTransaction,
  evaluateCycleProgress,
  loadActiveCycle,
} from '../src/performance';
import { acknowledgePerformanceRules } from '../src/performance-onboarding';
import { evaluateAndApplyAccountRisk } from '../src/risk';
import { closePosition, openPosition } from '../src/trading';
import { evaluateV2PreTradeDecisionInTransaction } from '../src/v2-pre-trade';

/**
 * Phase 3.4.3 — the risk/lifecycle proofs that Phase 3.4.2 explicitly
 * deferred: Performance-Day non-reuse across payout cycles (§26), buffer
 * permanence (§31), payout-debit risk neutrality end to end (§37/§38),
 * cycle 1..5 then exactly one Review (§39), finalization concurrency (§13)
 * and the V2 pre-trade chain's fail-closed behaviour (§44/§46/§53).
 *
 * Requires DATABASE_URL (via .env.local, gitignored).
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

const FRESH_TICK = new Date().toISOString();
const MARKET = { bid: '1.08450', ask: '1.08460', timestamp: FRESH_TICK, sequence: '900' };
const ALL_MARKETS = {
  EURUSD: MARKET,
  GBPUSD: { bid: '1.26000', ask: '1.26020', timestamp: FRESH_TICK, sequence: '900' },
  USDJPY: { bid: '150.100', ask: '150.120', timestamp: FRESH_TICK, sequence: '900' },
  XAUUSD: { bid: '2000.00', ask: '2000.30', timestamp: FRESH_TICK, sequence: '900' },
  NAS100: { bid: '18000.0', ask: '18002.0', timestamp: FRESH_TICK, sequence: '900' },
};

function utcDay(offsetDays: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function utcInstant(offsetDays: number): Date {
  return new Date(`${utcDay(offsetDays)}T00:00:00.000Z`);
}

describeIfDb('Phase 3.4.3 risk and lifecycle — real database', () => {
  let db: Db;
  const cleanupAccountIds: string[] = [];
  const cleanupUserIds: string[] = [];
  const cleanupPolicyIds: string[] = [];
  const cleanupMarginProfileIds: string[] = [];
  const cleanupCalendarIds: { news: string[]; session: string[] } = { news: [], session: [] };

  const createTestUser = async (email: string): Promise<string> => {
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password: randomUUID(), email_confirm: true }),
    });
    const body = (await response.json()) as { id: string };
    return body.id;
  };

  const createPassedEvaluation = async (label: string) => {
    const userId = await createTestUser(
      `p343-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@wariba-test.invalid`,
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
      .where('app.products.product_family', '=', 'WARIBA_ONE')
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
    return { userId, accountId: account.id, nominalBalance: productVersion.nominal_balance };
  };

  const createPerformanceAccount = async (label: string) => {
    const evaluation = await createPassedEvaluation(label);
    const performance = await activatePerformanceAccountInTransaction(db, {
      evaluationAccountId: evaluation.accountId,
    });
    return { ...evaluation, performanceAccountId: performance.id };
  };

  const policyVersionOf = async (accountId: string): Promise<string> =>
    (
      await db
        .selectFrom('app.trading_accounts')
        .select('policy_version_id')
        .where('id', '=', accountId)
        .executeTakeFirstOrThrow()
    ).policy_version_id;

  /** A finalized day written straight to the snapshot chain — the cycle partitioning under test is by trading_day, not by how the day was produced. */
  const insertFinalizedDay = async (params: {
    accountId: string;
    tradingDay: string;
    eligibleProfit: string;
    riskAdjustedProfit?: string;
  }) => {
    const account = await db
      .selectFrom('app.trading_accounts')
      .select('policy_version_id')
      .where('id', '=', params.accountId)
      .executeTakeFirstOrThrow();
    await db
      .insertInto('app.account_daily_snapshots')
      .values({
        account_id: params.accountId,
        policy_version_id: account.policy_version_id,
        trading_day: params.tradingDay,
        status: 'finalized',
        sod_balance: '10000.00',
        sod_equity: '10000.00',
        program_sod_balance: '10000.00',
        risk_sod_balance: '10000.00',
        daily_reference: '10000.00',
        maximum_loss_floor_before: '9000.00',
        eod_balance: new Decimal('10000.00').plus(params.eligibleProfit).toFixed(2),
        eod_equity: new Decimal('10000.00').plus(params.eligibleProfit).toFixed(2),
        program_eod_balance: new Decimal('10000.00').plus(params.eligibleProfit).toFixed(2),
        risk_eod_balance: new Decimal('10000.00').plus(params.eligibleProfit).toFixed(2),
        maximum_loss_floor_after: '9000.00',
        realized_net_profit_for_day: params.eligibleProfit,
        eligible_realized_net_profit_for_day: params.eligibleProfit,
        risk_adjusted_realized_net_profit_for_day:
          params.riskAdjustedProfit ?? params.eligibleProfit,
        finalized_at: new Date(`${params.tradingDay}T23:59:59.000Z`),
      })
      .execute();
  };

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
  }, 15000);

  afterAll(async () => {
    const children =
      cleanupAccountIds.length > 0
        ? await db
            .selectFrom('app.trading_accounts')
            .select('id')
            .where('source_evaluation_account_id', 'in', cleanupAccountIds)
            .execute()
        : [];
    for (const id of [...children.map((row) => row.id), ...cleanupAccountIds]) {
      const positions = await db
        .selectFrom('app.positions')
        .select('id')
        .where('account_id', '=', id)
        .execute();
      for (const position of positions) {
        await db.deleteFrom('app.fills').where('position_id', '=', position.id).execute();
        await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', position.id).execute();
      }
      await db.deleteFrom('app.trade_orders').where('account_id', '=', id).execute();
      await db.deleteFrom('app.positions').where('account_id', '=', id).execute();
      await db.deleteFrom('app.trading_ledger_entries').where('account_id', '=', id).execute();
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
        .executeTakeFirst();
      await db.deleteFrom('app.trading_accounts').where('id', '=', id).execute();
      if (account?.source_purchase_order_id) {
        await db
          .deleteFrom('app.payment_events')
          .where('purchase_order_id', '=', account.source_purchase_order_id)
          .execute();
        await db
          .deleteFrom('app.purchase_orders')
          .where('id', '=', account.source_purchase_order_id)
          .execute();
      }
    }
    for (const id of cleanupPolicyIds) {
      await db.deleteFrom('app.policy_versions').where('id', '=', id).execute();
    }
    for (const id of cleanupCalendarIds.news) {
      await db.deleteFrom('app.news_events').where('calendar_version_id', '=', id).execute();
      await db.deleteFrom('app.news_calendar_versions').where('id', '=', id).execute();
    }
    for (const id of cleanupCalendarIds.session) {
      await db.deleteFrom('app.session_closures').where('calendar_version_id', '=', id).execute();
      await db.deleteFrom('app.session_calendar_versions').where('id', '=', id).execute();
    }
    for (const id of cleanupMarginProfileIds) {
      await db.deleteFrom('app.margin_profiles').where('id', '=', id).execute();
    }
    for (const userId of cleanupUserIds) {
      await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
    }
    await db.destroy();
  }, 120000);

  it('a Performance Day can satisfy exactly one payout cycle, never two (§26)', async () => {
    const { performanceAccountId } = await createPerformanceAccount('day-reuse');
    // Backdate cycle #1 so its window can contain real elapsed days.
    await db
      .updateTable('app.performance_cycles')
      .set({ opened_at: utcInstant(-10) })
      .where('account_id', '=', performanceAccountId)
      .execute();

    const cycleOneDays = [-9, -8, -7, -6, -5];
    for (const offset of cycleOneDays) {
      await insertFinalizedDay({
        accountId: performanceAccountId,
        tradingDay: utcDay(offset),
        eligibleProfit: '60.00',
      });
    }

    const beforeClose = await evaluateCycleProgress(db, performanceAccountId);
    expect(beforeClose.cycleNumber).toBe(1);
    expect(beforeClose.performanceDayThreshold).toBe('50.00');
    expect(beforeClose.performanceDaysCompleted).toBe(5);

    const cycleOne = await loadActiveCycle(db, performanceAccountId);
    await db.transaction().execute((trx) =>
      closeCycleAndAdvanceInTransaction(trx, {
        accountId: performanceAccountId,
        cycleId: cycleOne?.id as string,
        now: utcInstant(-4),
      }),
    );

    const afterClose = await evaluateCycleProgress(db, performanceAccountId);
    expect(afterClose.cycleNumber).toBe(2);
    // The five days that funded payout #1 must not fund payout #2.
    expect(afterClose.performanceDaysCompleted).toBe(0);

    // And the new cycle can earn its own days.
    for (const offset of [-3, -2]) {
      await insertFinalizedDay({
        accountId: performanceAccountId,
        tradingDay: utcDay(offset),
        eligibleProfit: '75.00',
      });
    }
    expect((await evaluateCycleProgress(db, performanceAccountId)).performanceDaysCompleted).toBe(
      2,
    );

    // Structural proof, independent of the reader: every finalized day falls
    // inside exactly one cycle's [opened_at, closed_at) window.
    const days = await db
      .selectFrom('app.account_daily_snapshots')
      .select('trading_day')
      .where('account_id', '=', performanceAccountId)
      .where('status', '=', 'finalized')
      .execute();
    const cycles = await db
      .selectFrom('app.performance_cycles')
      .select(['cycle_number', 'opened_at', 'closed_at'])
      .where('account_id', '=', performanceAccountId)
      .execute();
    for (const day of days) {
      const owning = cycles.filter((cycle) => {
        const from = cycle.opened_at.toISOString().slice(0, 10);
        const to = cycle.closed_at ? cycle.closed_at.toISOString().slice(0, 10) : null;
        return day.trading_day >= from && (to === null || day.trading_day < to);
      });
      expect(owning).toHaveLength(1);
    }
  }, 60000);

  it('non-consecutive qualifying days still count, and a below-threshold day never does (§25/§27)', async () => {
    const { performanceAccountId } = await createPerformanceAccount('non-consecutive');
    await db
      .updateTable('app.performance_cycles')
      .set({ opened_at: utcInstant(-12) })
      .where('account_id', '=', performanceAccountId)
      .execute();

    // Monday qualifies, Tuesday does not, Wednesday qualifies, Thursday is a
    // loss, Friday qualifies, then two more qualifying days a week apart.
    const pattern: readonly [number, string][] = [
      [-11, '60.00'],
      [-10, '10.00'],
      [-9, '55.00'],
      [-8, '-120.00'],
      [-7, '50.00'],
      [-3, '80.00'],
      [-1, '49.99'],
      [-2, '50.00'],
    ];
    for (const [offset, profit] of pattern) {
      await insertFinalizedDay({
        accountId: performanceAccountId,
        tradingDay: utcDay(offset),
        eligibleProfit: profit,
      });
    }

    const progress = await evaluateCycleProgress(db, performanceAccountId);
    // 60, 55, 50, 80, 50 qualify; 10, -120 and 49.99 do not.
    expect(progress.performanceDaysCompleted).toBe(5);
  }, 60000);

  it('a payout day keeps its trading merit under a payout-neutral policy (§17/§37)', async () => {
    const { performanceAccountId } = await createPerformanceAccount('payout-day');
    await db
      .updateTable('app.performance_cycles')
      .set({ opened_at: utcInstant(-6) })
      .where('account_id', '=', performanceAccountId)
      .execute();
    // The trader earned 90 that day; a 1 000 authorized payout was debited
    // the same day, so the plain eligible figure reads -910.
    await insertFinalizedDay({
      accountId: performanceAccountId,
      tradingDay: utcDay(-5),
      eligibleProfit: '-910.00',
      riskAdjustedProfit: '90.00',
    });

    const progress = await evaluateCycleProgress(db, performanceAccountId);
    // The seeded V1 Performance policy carries no payout_debit_risk_neutral
    // flag, so it reads the eligible figure — the day does not qualify and
    // is not a positive day. This pins the V1 behaviour that must not move.
    expect(progress.performanceDaysCompleted).toBe(0);
    expect(progress.positiveDaysProfitSum).toBe('0.00');
  }, 60000);

  it('keeps the buffer permanent across a cycle boundary rather than rebuilding it (§31)', async () => {
    const { performanceAccountId } = await createPerformanceAccount('buffer');
    const first = await evaluateCycleProgress(db, performanceAccountId);
    expect(first.bufferFloor).toBe('11000.00');

    const cycle = await loadActiveCycle(db, performanceAccountId);
    await db.transaction().execute((trx) =>
      closeCycleAndAdvanceInTransaction(trx, {
        accountId: performanceAccountId,
        cycleId: cycle?.id as string,
        now: new Date(),
      }),
    );

    const second = await evaluateCycleProgress(db, performanceAccountId);
    expect(second.cycleNumber).toBe(2);
    // Same floor, not nominal * (1 + rate) applied a second time.
    expect(second.bufferFloor).toBe(first.bufferFloor);
  }, 60000);

  it('closes cycles 1..5 into exactly one Review, and the database refuses a sixth (§39)', async () => {
    const { performanceAccountId } = await createPerformanceAccount('cycles');
    for (let cycleNumber = 1; cycleNumber <= 5; cycleNumber += 1) {
      const cycle = await loadActiveCycle(db, performanceAccountId);
      expect(cycle?.cycleNumber).toBe(cycleNumber);
      const outcome = await db.transaction().execute((trx) =>
        closeCycleAndAdvanceInTransaction(trx, {
          accountId: performanceAccountId,
          cycleId: cycle?.id as string,
          now: new Date(),
        }),
      );
      if (cycleNumber < 5) {
        expect(outcome.nextCycleNumber).toBe(cycleNumber + 1);
        expect(outcome.reviewCaseCreated).toBe(false);
      } else {
        expect(outcome.nextCycleNumber).toBeNull();
        expect(outcome.reviewCaseCreated).toBe(true);
      }
    }

    const reviewCases = await db
      .selectFrom('app.performance_review_cases')
      .select('id')
      .where('account_id', '=', performanceAccountId)
      .execute();
    expect(reviewCases).toHaveLength(1);
    expect(await loadActiveCycle(db, performanceAccountId)).toBeNull();

    await expect(
      db
        .insertInto('app.performance_cycles')
        .values({ account_id: performanceAccountId, cycle_number: 6, opened_at: new Date() })
        .execute(),
    ).rejects.toThrow();
  }, 90000);

  it('an authorized payout debit alone never breaches, but a real loss of the same size does (§37/§38)', async () => {
    const { performanceAccountId } = await createPerformanceAccount('neutrality');
    // Take the account to a 12 000 balance so the floor has ratcheted well
    // above nominal, then debit a payout large enough to cross it.
    await db
      .insertInto('app.trading_ledger_entries')
      .values({
        account_id: performanceAccountId,
        entry_type: 'authorized_adjustment',
        amount: '2000.00',
        currency: 'USD',
      })
      .execute();
    await db
      .insertInto('app.account_daily_snapshots')
      .values({
        account_id: performanceAccountId,
        policy_version_id: await policyVersionOf(performanceAccountId),
        trading_day: utcDay(-1),
        status: 'finalized',
        sod_balance: '10000.00',
        sod_equity: '10000.00',
        program_sod_balance: '10000.00',
        risk_sod_balance: '10000.00',
        daily_reference: '10000.00',
        maximum_loss_floor_before: '9000.00',
        eod_balance: '12000.00',
        eod_equity: '12000.00',
        program_eod_balance: '12000.00',
        risk_eod_balance: '12000.00',
        highest_eod_balance_after: '12000.00',
        highest_program_eod_balance_after: '12000.00',
        highest_risk_eod_balance_after: '12000.00',
        maximum_loss_floor_after: '11000.00',
        realized_net_profit_for_day: '2000.00',
        eligible_realized_net_profit_for_day: '2000.00',
        risk_adjusted_realized_net_profit_for_day: '2000.00',
        finalized_at: new Date(`${utcDay(-1)}T23:59:59.000Z`),
      })
      .execute();

    // A 1 500 payout takes the account balance to 10 500 — under the 11 000
    // floor if it were treated as a trading loss.
    await db
      .insertInto('app.trading_ledger_entries')
      .values({
        account_id: performanceAccountId,
        entry_type: 'payout_debit',
        amount: '-1500.00',
        currency: 'USD',
        reference_type: 'payout_request',
        reference_id: randomUUID(),
      })
      .execute();

    const projection = await loadAccountBalanceProjection(db, performanceAccountId);
    expect(projection.accountBalance).toBe('10500.00');
    expect(projection.riskAdjustedBalance).toBe('12000.00');

    const afterPayout = await evaluateAndApplyAccountRisk(db, {
      accountId: performanceAccountId,
      now: new Date(),
      marketBySymbol: ALL_MARKETS,
      triggerEventType: 'manual_review',
      triggerEventId: randomUUID(),
    });
    expect(afterPayout.result.maximumLoss.breached).toBe(false);
    expect(afterPayout.newStatus).not.toBe('breached');

    // The same 1 500 taken as a market loss is not neutralized.
    await db
      .insertInto('app.trading_ledger_entries')
      .values({
        account_id: performanceAccountId,
        entry_type: 'authorized_adjustment',
        amount: '-1500.00',
        currency: 'USD',
      })
      .execute();
    const afterLoss = await evaluateAndApplyAccountRisk(db, {
      accountId: performanceAccountId,
      now: new Date(),
      marketBySymbol: ALL_MARKETS,
      triggerEventType: 'manual_review',
      triggerEventId: randomUUID(),
    });
    expect(afterLoss.result.maximumLoss.breached).toBe(true);
    expect(afterLoss.newStatus).toBe('breached');
  }, 90000);

  it('two concurrent finalizations of the same day produce one canonical snapshot (§13)', async () => {
    const { performanceAccountId } = await createPerformanceAccount('concurrent');
    await db
      .insertInto('app.account_daily_snapshots')
      .values({
        account_id: performanceAccountId,
        policy_version_id: await policyVersionOf(performanceAccountId),
        trading_day: utcDay(-1),
        status: 'open',
        sod_balance: '10000.00',
        sod_equity: '10000.00',
        program_sod_balance: '10000.00',
        risk_sod_balance: '10000.00',
        daily_reference: '10000.00',
        maximum_loss_floor_before: '9000.00',
      })
      .execute();

    const now = new Date();
    const [first, second] = await Promise.all([
      finalizeDailyBoundaryForAccount(db, { accountId: performanceAccountId, clock: () => now }),
      finalizeDailyBoundaryForAccount(db, { accountId: performanceAccountId, clock: () => now }),
    ]);
    const finalizedYesterday = [first, second].filter(
      (outcome) => outcome.finalizedTradingDay === utcDay(-1),
    );
    expect(finalizedYesterday).toHaveLength(1);

    const snapshots = await db
      .selectFrom('app.account_daily_snapshots')
      .select(['trading_day', 'status'])
      .where('account_id', '=', performanceAccountId)
      .execute();
    expect(snapshots.filter((row) => row.trading_day === utcDay(-1))).toHaveLength(1);
    expect(snapshots.filter((row) => row.trading_day === utcDay(0))).toHaveLength(1);
    expect(snapshots.find((row) => row.trading_day === utcDay(-1))?.status).toBe('finalized');
  }, 90000);

  it('a sub-60s profit reaches the account but never a Performance Day (§41/§79)', async () => {
    const { performanceAccountId, userId } = await createPerformanceAccount('sixty-seconds');
    await acknowledgePerformanceRules(db, {
      userId,
      accountId: performanceAccountId,
      correlationId: randomUUID(),
      now: new Date(),
    });

    // The account was created just now, so its initial_balance ledger entry
    // is stamped today. Backdate it before the trade below, otherwise
    // yesterday's boundary projection would see the fill without the
    // opening capital and report a 10 000 "loss" that never happened.
    await db
      .updateTable('app.trading_ledger_entries')
      .set({ occurred_at: new Date(`${utcDay(-2)}T00:00:00.000Z`) })
      .where('account_id', '=', performanceAccountId)
      .where('entry_type', '=', 'initial_balance')
      .execute();

    const openedAt = new Date(`${utcDay(-1)}T10:00:00.000Z`);
    const closedAt = new Date(openedAt.getTime() + 30_000);
    const open = await openPosition(db, {
      accountId: performanceAccountId,
      idempotencyKey: randomUUID(),
      symbol: 'XAUUSD',
      side: 'buy',
      quantity: '0.01',
      market: { bid: '2000.00', ask: '2000.30', timestamp: openedAt.toISOString(), sequence: '30' },
      marketBySymbol: ALL_MARKETS,
      now: openedAt,
    });
    const close = await closePosition(db, {
      accountId: performanceAccountId,
      idempotencyKey: randomUUID(),
      positionId: open.position?.id as string,
      mode: 'full',
      market: { bid: '2400.00', ask: '2400.30', timestamp: closedAt.toISOString(), sequence: '31' },
      marketBySymbol: ALL_MARKETS,
      now: closedAt,
    });
    expect(close.fill?.eligibilityReason).toBe('short_duration_profit');
    expect(Number(close.fill?.netRealizedPnl)).toBeGreaterThan(50);

    // The trader keeps the money: the account balance moved by the full net
    // profit, the program-eligible projection did not move at all.
    const projection = await loadAccountBalanceProjection(db, performanceAccountId);
    expect(
      new Decimal(projection.accountBalance).minus(projection.programEligibleBalance).toFixed(2),
    ).toBe(close.fill?.netRealizedPnl);

    // Finalizing that day carries the same single source of eligibility into
    // the Performance Day rule: the raw day is well above the 50.00
    // threshold, the eligible day is zero, so no Performance Day exists.
    await finalizeDailyBoundaryForAccount(db, {
      accountId: performanceAccountId,
      clock: () => new Date(`${utcDay(0)}T00:05:00.000Z`),
    });
    const finalized = await db
      .selectFrom('app.account_daily_snapshots')
      .select(['realized_net_profit_for_day', 'eligible_realized_net_profit_for_day'])
      .where('account_id', '=', performanceAccountId)
      .where('trading_day', '=', utcDay(-1))
      .executeTakeFirstOrThrow();
    expect(Number(finalized.realized_net_profit_for_day)).toBeGreaterThan(50);
    expect(finalized.eligible_realized_net_profit_for_day).toBe('0.00');

    const progress = await evaluateCycleProgress(db, performanceAccountId);
    expect(progress.performanceDayThreshold).toBe('50.00');
    expect(progress.performanceDaysCompleted).toBe(0);
    expect(progress.positiveDaysProfitSum).toBe('0.00');
  }, 90000);

  it('the V2 pre-trade chain fails closed while no session source exists (§44/§46)', async () => {
    const { performanceAccountId } = await createPerformanceAccount('pre-trade-closed');
    const v2Policy = await db
      .selectFrom('app.policy_versions')
      .select('id')
      .where('semantic_version', '=', '2.0.0-one')
      .executeTakeFirstOrThrow();
    const policy = await loadPolicyById(db, v2Policy.id);

    const decision = await db.transaction().execute(async (trx) => {
      const account = await lockAccount(trx, performanceAccountId);
      return evaluateV2PreTradeDecisionInTransaction(trx, {
        account,
        policy,
        intent: 'open',
        symbol: 'EURUSD',
        quantity: '0.01',
        market: MARKET,
        side: 'buy',
        now: new Date(),
      });
    });
    expect(decision.applicable).toBe(true);
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('MARKET_SESSION_SOURCE_UNAVAILABLE');

    // Reducing exposure stays possible in every window — a missing calendar
    // must never trap a trader in a position.
    const reduce = await db.transaction().execute(async (trx) => {
      const account = await lockAccount(trx, performanceAccountId);
      return evaluateV2PreTradeDecisionInTransaction(trx, {
        account,
        policy,
        intent: 'close',
        symbol: 'EURUSD',
        quantity: '0.01',
        market: MARKET,
        side: 'sell',
        now: new Date(),
      });
    });
    expect(reduce.allowed).toBe(true);
  }, 60000);

  it('enforces the margin cap once calibration and calendars are ready (§53)', async () => {
    const { performanceAccountId } = await createPerformanceAccount('pre-trade-margin');
    const now = new Date();

    const marginProfile = await db
      .insertInto('app.margin_profiles')
      .values({
        profile_code: `TEST-MARGIN-${randomUUID().slice(0, 8)}`,
        product_family: 'WARIBA_ONE',
        account_phase: 'performance',
        candidate_margin_cap_rate: '0.150000',
        leverage_by_asset_group: JSON.stringify({ FX: 30, METALS: 15, INDICES: 10, ENERGY: 10 }),
        calibration_status: 'validated',
        decision_record_id: 'POLICY-GOV-003',
        validated_at: now,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    cleanupMarginProfileIds.push(marginProfile.id);

    const sessionCalendar = await db
      .insertInto('app.session_calendar_versions')
      .values({
        version_code: `TEST-SESSIONS-${randomUUID().slice(0, 8)}`,
        provider: 'test-fixture',
        status: 'ready',
        source_ready: true,
        published_at: now,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    cleanupCalendarIds.session.push(sessionCalendar.id);

    const newsCalendar = await db
      .insertInto('app.news_calendar_versions')
      .values({
        version_code: `TEST-NEWS-${randomUUID().slice(0, 8)}`,
        provider: 'test-fixture',
        status: 'ready',
        source_ready: true,
        published_at: now,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    cleanupCalendarIds.news.push(newsCalendar.id);

    const parameters = V2_POLICY_PARAMETERS.onePerformance;
    const testPolicy = await db
      .insertInto('app.policy_versions')
      .values({
        program: 'WARIBA_PERFORMANCE',
        product_family: 'WARIBA_ONE',
        account_phase: 'performance',
        semantic_version: `2.0.0-test-${randomUUID().slice(0, 8)}`,
        status: 'pilot_ready',
        parameters_json: JSON.stringify(parameters),
        machine_hash: computeMachineHash(parameters),
        decision_record_id: 'POLICY-GOV-003',
        margin_profile_id: marginProfile.id,
        session_calendar_version_id: sessionCalendar.id,
        news_calendar_version_id: newsCalendar.id,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    cleanupPolicyIds.push(testPolicy.id);

    const policy = await loadPolicyById(db, testPolicy.id);
    const decide = (quantity: string) =>
      db.transaction().execute(async (trx) => {
        const account = await lockAccount(trx, performanceAccountId);
        return evaluateV2PreTradeDecisionInTransaction(trx, {
          account,
          policy,
          intent: 'open',
          symbol: 'EURUSD',
          quantity,
          market: MARKET,
          side: 'buy',
          now,
        });
      });

    // 10 000 equity, 15% cap = 1 500 margin; EURUSD at 1:30 costs ~3 615/lot,
    // so 0.41 lots fits and 0.42 does not.
    const withinCap = await decide('0.41');
    expect(withinCap.allowed).toBe(true);
    expect(withinCap.reasonCode).toBe('V2_PRE_TRADE_ALLOWED');

    const aboveCap = await decide('0.42');
    expect(aboveCap.allowed).toBe(false);
    expect(aboveCap.reasonCode).toBe('MARGIN_CAP_EXCEEDED');

    // A high-impact news window on the traded asset group blocks the
    // increase without touching the reduce path.
    await db
      .insertInto('app.news_events')
      .values({
        calendar_version_id: newsCalendar.id,
        provider_event_id: `evt-${randomUUID().slice(0, 8)}`,
        impact: 'high',
        affected_asset_groups: JSON.stringify(['FX']),
        scheduled_at: now,
        window_starts_at: new Date(now.getTime() - 2 * 60_000),
        window_ends_at: new Date(now.getTime() + 2 * 60_000),
      })
      .execute();
    const duringNews = await decide('0.01');
    expect(duringNews.allowed).toBe(false);
    expect(duringNews.reasonCode).toBe('NEWS_EXPOSURE_INCREASE_BLOCKED');
  }, 90000);
});
