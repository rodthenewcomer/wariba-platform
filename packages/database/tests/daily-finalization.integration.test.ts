import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import { openPosition, closePosition } from '../src/trading';
import {
  finalizeDailyBoundaryForAccount,
  listAccountsDueForFinalization,
} from '../src/daily-finalization';

/**
 * Real integration tests against the live hosted database for Prompt 05's
 * daily worker (finalizeDailyBoundaryForAccount, listAccountsDueForFinalization).
 * Requires DATABASE_URL (via .env.local, gitignored).
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

describeIfDb('daily finalization — real database', () => {
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

  const createActiveAccount = async (label: string): Promise<string> => {
    const userId = await createTestUser(
      `dailyfin-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@wariba-test.invalid`,
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
    cleanupAccountIds.push(account.id);
    return account.id;
  };

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
  }, 15000);

  afterAll(async () => {
    for (const id of cleanupAccountIds) {
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

  it('is idempotent — finalizing the same UTC day twice reports alreadyUpToDate the second time, no duplicate row', async () => {
    const accountId = await createActiveAccount('idempotent');
    const dayTwo = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);

    // A trade is what actually bootstraps "today" (day 1)'s snapshot —
    // without one there is nothing yet to finalize.
    const openMarket = { bid: '1.09995', ask: '1.10000', timestamp: FRESH_TICK, sequence: '6' };
    await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.10',
      market: openMarket,
      marketBySymbol: { ...ALL_MARKETS, EURUSD: openMarket },
      now: NOW,
    });

    const first = await finalizeDailyBoundaryForAccount(db, { accountId, clock: () => dayTwo });
    expect(first.alreadyUpToDate).toBe(false);
    expect(first.finalizedTradingDay).not.toBeNull();

    const second = await finalizeDailyBoundaryForAccount(db, { accountId, clock: () => dayTwo });
    expect(second.alreadyUpToDate).toBe(true);
    expect(second.newTradingDay).toBe(first.newTradingDay);

    const snapshots = await db
      .selectFrom('app.account_daily_snapshots')
      .select('trading_day')
      .where('account_id', '=', accountId)
      .where('trading_day', '=', first.newTradingDay)
      .execute();
    expect(snapshots).toHaveLength(1); // unique(account_id, trading_day) — no duplicate from the second call
  }, 30000);

  it('resets a soft lock at the daily boundary (ONE-020: reset at next_daily_reset)', async () => {
    const accountId = await createActiveAccount('reset');
    const dayTwo = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);

    const openMarket = { bid: '1.09995', ask: '1.10000', timestamp: FRESH_TICK, sequence: '1' };
    const open = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.50',
      market: openMarket,
      marketBySymbol: { ...ALL_MARKETS, EURUSD: openMarket },
      now: NOW,
    });
    const closeMarket = { bid: '1.09200', ask: '1.09205', timestamp: FRESH_TICK, sequence: '2' };
    await closePosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId: open.position?.id as string,
      mode: 'full',
      market: closeMarket,
      marketBySymbol: { ...ALL_MARKETS, EURUSD: closeMarket },
      now: NOW,
    });

    const beforeReset = await db
      .selectFrom('app.trading_accounts')
      .select('status')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    expect(beforeReset.status).toBe('soft_locked');

    await finalizeDailyBoundaryForAccount(db, { accountId, clock: () => dayTwo });

    const afterReset = await db
      .selectFrom('app.trading_accounts')
      .select('status')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    expect(afterReset.status).toBe('active');

    const resetTransition = await db
      .selectFrom('app.account_state_transitions')
      .selectAll()
      .where('account_id', '=', accountId)
      .where('reason', '=', 'daily_loss_limit_reset')
      .executeTakeFirstOrThrow();
    expect(resetTransition.from_status).toBe('soft_locked');
    expect(resetTransition.to_status).toBe('active');
  }, 30000);

  it('lists an account with a stale open snapshot as due, and no longer due once caught up', async () => {
    const accountId = await createActiveAccount('due');
    const dayTwo = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);

    // Bootstrap today's snapshot via a trade, then check "due" from dayTwo's
    // perspective — today's row is now a stale 'open' day relative to dayTwo.
    const openMarket = { bid: '1.09995', ask: '1.10000', timestamp: FRESH_TICK, sequence: '3' };
    await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.10',
      market: openMarket,
      marketBySymbol: { ...ALL_MARKETS, EURUSD: openMarket },
      now: NOW,
    });

    const dueBefore = await listAccountsDueForFinalization(db, dayTwo);
    expect(dueBefore).toContain(accountId);

    await finalizeDailyBoundaryForAccount(db, { accountId, clock: () => dayTwo });

    const dueAfter = await listAccountsDueForFinalization(db, dayTwo);
    expect(dueAfter).not.toContain(accountId);
  }, 30000);

  it('the Maximum Loss floor ratchets up after a profitable finalized day and never decreases', async () => {
    const accountId = await createActiveAccount('ratchet');
    const dayTwo = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);
    const dayThree = new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000);

    const openMarket = { bid: '1.09995', ask: '1.10000', timestamp: FRESH_TICK, sequence: '4' };
    const open = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.60',
      market: openMarket,
      marketBySymbol: { ...ALL_MARKETS, EURUSD: openMarket },
      now: NOW,
    });
    // Large gain: pushes the EOD balance well above nominal + 10%, so the
    // next floor should ratchet up from the initial 9000.
    const closeMarket = { bid: '1.13000', ask: '1.13005', timestamp: FRESH_TICK, sequence: '5' };
    const eligibleCloseAt = new Date(NOW.getTime() + 61_000);
    await closePosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId: open.position?.id as string,
      mode: 'full',
      market: { ...closeMarket, timestamp: eligibleCloseAt.toISOString() },
      marketBySymbol: {
        ...ALL_MARKETS,
        EURUSD: { ...closeMarket, timestamp: eligibleCloseAt.toISOString() },
      },
      // Prompt 07B: this ratchet scenario exercises an eligible profit,
      // therefore the holding duration must clear the 60-second threshold.
      now: eligibleCloseAt,
    });

    const finalized = await finalizeDailyBoundaryForAccount(db, { accountId, clock: () => dayTwo });
    // (1.13000-0.00002 - 1.10002) * 100000 * 0.6 = 1798.68 PnL, -8.40 commission
    // => eod balance ~11790.28, highest_eod_balance - 10% = 10790.28 > initial 9000.
    expect(Number(finalized.maximumLossFloorAfter)).toBeGreaterThan(9000);

    // A second, uneventful day-boundary crossing (no trades in between) must
    // not decrease the floor even though nothing new happened.
    const finalizedAgain = await finalizeDailyBoundaryForAccount(db, {
      accountId,
      clock: () => dayThree,
    });
    expect(Number(finalizedAgain.maximumLossFloorAfter)).toBeGreaterThanOrEqual(
      Number(finalized.maximumLossFloorAfter),
    );
  }, 30000);
});
