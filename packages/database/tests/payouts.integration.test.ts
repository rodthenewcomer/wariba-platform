import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import { activatePerformanceAccountInTransaction, loadActiveCycle } from '../src/performance';
import { openPosition, closePosition } from '../src/trading';
import { finalizeDailyBoundaryForAccount } from '../src/daily-finalization';
import {
  createPayoutRequestInTransaction,
  approvePayoutRequestInTransaction,
  settlePayoutProviderInTransaction,
} from '../src/payouts';

/**
 * Prompt 08 Phase D — real integration tests against the live hosted
 * database for the payout request/approve/settle flow. Requires
 * DATABASE_URL (via .env.local, gitignored).
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

describeIfDb('payout engine — real database', () => {
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

  const createPerformanceAccount = async (
    label: string,
  ): Promise<{ userId: string; accountId: string }> => {
    const userId = await createTestUser(
      `payout-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@wariba-test.invalid`,
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
    const evaluation = await activateEvaluationAccount(db, {
      purchaseOrderId: order.id,
      userId,
      nominalBalance: productVersion.nominal_balance,
      currency: productVersion.nominal_currency,
    });
    cleanupAccountIds.push(evaluation.id);
    const performance = await activatePerformanceAccountInTransaction(db, {
      evaluationAccountId: evaluation.id,
      userId,
      nominalBalance: productVersion.nominal_balance,
      currency: productVersion.nominal_currency,
    });
    return { userId, accountId: performance.id };
  };

  /** One realized-profit day (~537.60, well above the 10K/50 threshold), finalized to the next UTC day. */
  const realizeProfitableDay = async (accountId: string, dayStart: Date): Promise<void> => {
    const openMarket = {
      bid: '1.09995',
      ask: '1.10000',
      timestamp: dayStart.toISOString(),
      sequence: '1',
    };
    const open = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.60',
      market: openMarket,
      marketBySymbol: marketsWithEurusd(openMarket),
      now: dayStart,
    });
    const closeAt = new Date(dayStart.getTime() + 61_000);
    const closeMarket = {
      bid: '1.10900',
      ask: '1.10905',
      timestamp: closeAt.toISOString(),
      sequence: '2',
    };
    const closed = await closePosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId: open.position?.id as string,
      mode: 'full',
      market: closeMarket,
      marketBySymbol: marketsWithEurusd(closeMarket),
      now: closeAt,
    });
    expect(closed.fill?.realizedPnl).toBe('537.60');
    const nextDay = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    await finalizeDailyBoundaryForAccount(db, { accountId, clock: () => nextDay });
  };

  /** Five qualifying days (2,688.00 total) — clears both the 5-day requirement and the 11,000 buffer floor from a 10,000 nominal start. */
  const buildFivePayoutEligibleDays = async (accountId: string): Promise<Date> => {
    let day = NOW;
    for (let i = 0; i < 5; i += 1) {
      await realizeProfitableDay(accountId, day);
      day = new Date(day.getTime() + 24 * 60 * 60 * 1000);
    }
    return day;
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
      await db.deleteFrom('app.payout_requests').where('account_id', '=', id).execute();
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
  }, 90000);

  it('the full request -> approve -> settle flow debits the ledger exactly once and advances to cycle #2', async () => {
    const { accountId } = await createPerformanceAccount('happy-path');
    await db
      .updateTable('app.trading_accounts')
      .set({ kyc_sandbox_verified: true, payout_method_sandbox_configured: true })
      .where('id', '=', accountId)
      .execute();
    await buildFivePayoutEligibleDays(accountId);

    // 10K cycle #1 cap is 250 USD net (Program Rulebook v1.1 §10) — request
    // more than that to prove the cap, not the excess or the request, is
    // what binds here.
    const created = await createPayoutRequestInTransaction(db, {
      accountId,
      idempotencyKey: randomUUID(),
      requestedNetTraderCash: '1000',
      now: new Date(),
    });
    expect(created.status).toBe('pending_review');
    const requestId = created.request?.id as string;
    expect(created.request?.capApplied).toBe('250.00');

    const cycleAfterRequest = await loadActiveCycle(db, accountId);
    expect(cycleAfterRequest?.status).toBe('payout_pending');

    const approved = await approvePayoutRequestInTransaction(db, {
      payoutRequestId: requestId,
      staffUserId: randomUUID(),
      now: new Date(),
    });
    expect(approved.status).toBe('processing');
    // Capped at 250/0.85 = 294.12 gross, 250.00 net trader cash — not
    // the 1000 requested.
    expect(approved.approvedGrossBase).toBe('294.12');
    expect(approved.traderNetCash).toBe('250.00');
    expect(approved.waribaShare).toBe('44.12');
    expect(approved.providerReference).toBe(`wariba-payout:${requestId}`);

    const paid = await settlePayoutProviderInTransaction(db, {
      payoutRequestId: requestId,
      now: new Date(),
    });
    expect(paid.status).toBe('paid');

    const ledgerEntries = await db
      .selectFrom('app.trading_ledger_entries')
      .selectAll()
      .where('account_id', '=', accountId)
      .where('entry_type', '=', 'payout_debit')
      .execute();
    expect(ledgerEntries).toHaveLength(1);
    expect(ledgerEntries[0]?.amount).toBe('-294.12000000');
    expect(ledgerEntries[0]?.reference_id).toBe(requestId);

    const closedCycle = await db
      .selectFrom('app.performance_cycles')
      .select(['status', 'closed_at'])
      .where('account_id', '=', accountId)
      .where('cycle_number', '=', 1)
      .executeTakeFirstOrThrow();
    expect(closedCycle.status).toBe('closed');
    const newCycle = await loadActiveCycle(db, accountId);
    expect(newCycle?.cycleNumber).toBe(2);
    expect(newCycle?.status).toBe('active');

    // Settling again (worker retry / provider replay) must not double-debit.
    const settledAgain = await settlePayoutProviderInTransaction(db, {
      payoutRequestId: requestId,
      now: new Date(),
    });
    expect(settledAgain.status).toBe('paid');
    const ledgerEntriesAfterRetry = await db
      .selectFrom('app.trading_ledger_entries')
      .selectAll()
      .where('account_id', '=', accountId)
      .where('entry_type', '=', 'payout_debit')
      .execute();
    expect(ledgerEntriesAfterRetry).toHaveLength(1);
  }, 120000);

  it('is rejected without ever creating a row when KYC is not sandbox-verified', async () => {
    const { accountId } = await createPerformanceAccount('no-kyc');
    // payout_method_sandbox_configured left true would still block on KYC
    // first — deliberately leaving both false to prove KYC is checked
    // before payout-method, matching the ELIGIBILITY list's own order.
    await buildFivePayoutEligibleDays(accountId);

    const result = await createPayoutRequestInTransaction(db, {
      accountId,
      idempotencyKey: randomUUID(),
      requestedNetTraderCash: '100',
      now: new Date(),
    });
    expect(result.status).toBe('rejected');
    expect(result.rejectionCode).toBe('kyc_not_verified');
    expect(result.request).toBeNull();

    const rows = await db
      .selectFrom('app.payout_requests')
      .select('id')
      .where('account_id', '=', accountId)
      .execute();
    expect(rows).toHaveLength(0);

    // Never froze — no request was ever created.
    const cycle = await loadActiveCycle(db, accountId);
    expect(cycle?.status).toBe('active');
  }, 120000);

  it('the database itself refuses a second non-terminal payout request for the same cycle', async () => {
    const { accountId } = await createPerformanceAccount('double-request');
    await db
      .updateTable('app.trading_accounts')
      .set({ kyc_sandbox_verified: true, payout_method_sandbox_configured: true })
      .where('id', '=', accountId)
      .execute();
    await buildFivePayoutEligibleDays(accountId);

    const first = await createPayoutRequestInTransaction(db, {
      accountId,
      idempotencyKey: randomUUID(),
      requestedNetTraderCash: '50',
      now: new Date(),
    });
    expect(first.status).toBe('pending_review');
    const cycle = await loadActiveCycle(db, accountId);
    // cycle is now payout_pending, not active — createPayoutRequestInTransaction
    // itself won't even get past loadActiveCycle for a second app-level
    // call. The real guard under test here is the partial unique index —
    // proven directly against a second row for the same cycle_id.
    await expect(
      db
        .insertInto('app.payout_requests')
        .values({
          account_id: accountId,
          cycle_id: cycle?.id as string,
          cycle_number: cycle?.cycleNumber as number,
          idempotency_key: randomUUID(),
          requested_net_trader_cash: '50.00',
          requested_gross_base: '58.82',
          trader_split_rate: '0.85',
          cap_applied: '250.00',
          buffer_floor_at_request: '11000.00',
          eligible_excess_at_request: '2688.00',
        })
        .execute(),
    ).rejects.toThrow();
  }, 120000);
});
