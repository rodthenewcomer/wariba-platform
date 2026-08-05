import { randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import {
  openPosition,
  closePosition,
  closeAllPositions,
  modifyPositionRisk,
  countShortDurationProfitClosures,
} from '../src/trading';
import { loadAccountBalanceProjection } from '../src/program-eligibility';

/**
 * Real integration tests against the live hosted database — not mocked.
 * Requires DATABASE_URL in the environment (via .env.local, gitignored).
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

const NOW = new Date();
const FRESH_TICK = NOW.toISOString();
const EURUSD_MARKET = { bid: '1.08450', ask: '1.08460', timestamp: FRESH_TICK, sequence: '1' };
// Used only for the post-trade risk evaluation's equity calc (fill pricing
// always uses the per-call `market` param) — full 5-symbol coverage so an
// account with positions in multiple symbols always gets an accurate check.
const ALL_MARKETS = {
  EURUSD: EURUSD_MARKET,
  GBPUSD: { bid: '1.26000', ask: '1.26020', timestamp: FRESH_TICK, sequence: '900' },
  USDJPY: { bid: '150.100', ask: '150.120', timestamp: FRESH_TICK, sequence: '900' },
  XAUUSD: { bid: '2000.00', ask: '2000.30', timestamp: FRESH_TICK, sequence: '900' },
  NAS100: { bid: '18000.0', ask: '18002.0', timestamp: FRESH_TICK, sequence: '900' },
};

describeIfDb('trading — real database', () => {
  let db: Db;
  let userId: string;
  let accountId: string;
  const cleanupAccountIds: string[] = [];

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

  const createActiveAccount = async (): Promise<string> => {
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
    userId = await createTestUser(`trading-test-${Date.now()}@wariba-test.invalid`);
    accountId = await createActiveAccount();
  }, 60000);

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
      // risk_violations references both account_state_transitions and
      // account_daily_snapshots — must be deleted before either.
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
    await deleteTestUser(userId);
    await db.destroy();
  }, 60000);

  it('opens a position with the ask price for a buy, charges commission, and bumps account_sequence', async () => {
    const before = await db
      .selectFrom('app.trading_accounts')
      .select('version')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();

    const result = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.10',
      market: EURUSD_MARKET,
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });

    expect(result.order.status).toBe('filled');
    expect(result.position).not.toBeNull();
    expect(result.position?.status).toBe('open');
    expect(result.position?.openQuantity).toBe('0.1000');
    // ask 1.08460 + slippage (2 points at precision 5 = 0.00002) = 1.08462
    expect(result.position?.averageOpenPrice).toBe('1.08462');
    expect(result.fill?.commission).toBe('0.7000'); // 0.10 lot * 7.00/lot

    const after = await db
      .selectFrom('app.trading_accounts')
      .select('version')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    expect(after.version).toBe(before.version + 1);
    expect(result.order.accountSequence).toBe(String(after.version));

    const ledgerEntries = await db
      .selectFrom('app.trading_ledger_entries')
      .selectAll()
      .where('account_id', '=', accountId)
      .where('entry_type', '=', 'commission')
      .execute();
    expect(ledgerEntries).toHaveLength(1);
    expect(ledgerEntries[0]?.amount).toBe('-0.70');
  }, 15000);

  it('is idempotent on retry — a second call with the same idempotency key returns the same fill, no duplicate position', async () => {
    const idempotencyKey = randomUUID();
    const first = await openPosition(db, {
      accountId,
      idempotencyKey,
      symbol: 'GBPUSD',
      side: 'sell',
      quantity: '0.10',
      market: { bid: '1.26000', ask: '1.26020', timestamp: FRESH_TICK, sequence: '2' },
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });
    const second = await openPosition(db, {
      accountId,
      idempotencyKey,
      symbol: 'GBPUSD',
      side: 'sell',
      quantity: '0.10',
      market: { bid: '1.26000', ask: '1.26020', timestamp: FRESH_TICK, sequence: '2' },
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });

    expect(second.order.alreadyExisted).toBe(true);
    expect(second.position?.id).toBe(first.position?.id);

    const positions = await db
      .selectFrom('app.positions')
      .selectAll()
      .where('account_id', '=', accountId)
      .where('symbol', '=', 'GBPUSD')
      .execute();
    expect(positions).toHaveLength(1);
  }, 15000);

  it('rejects a quantity below the minimum, still advancing account.version', async () => {
    // A rejection touches no balance/position — but it must still bump
    // trading_accounts.version. That counter is the only signal
    // apps/web's realtime client has for "is this account.snapshot reply
    // fresher than the last one" (System Architecture §62-64's sequence
    // gate) — if a rejected order didn't advance it, the very next
    // resubscribe-fetched snapshot would look identical to the last one
    // and get silently dropped as a duplicate, hiding the rejection from
    // Positions/Orders/History no matter how long the client waited.
    const before = await db
      .selectFrom('app.trading_accounts')
      .select('version')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    const result = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.001',
      market: EURUSD_MARKET,
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });
    expect(result.order.status).toBe('rejected');
    expect(result.order.rejectionCode).toBe('invalid_quantity');
    const after = await db
      .selectFrom('app.trading_accounts')
      .select('version')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    expect(after.version).toBe(before.version + 1);
  }, 15000);

  it('rejects stale market data', async () => {
    const staleTick = new Date(NOW.getTime() - 60_000).toISOString();
    const result = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.10',
      market: { bid: '1.08450', ask: '1.08460', timestamp: staleTick, sequence: '3' },
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });
    expect(result.order.status).toBe('rejected');
    expect(result.order.rejectionCode).toBe('stale_market_data');
  }, 15000);

  it('rejects a Forex order that would exceed the 10K aggregate exposure limit', async () => {
    const result = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'USDJPY',
      side: 'buy',
      quantity: '0.50',
      market: { bid: '150.100', ask: '150.120', timestamp: FRESH_TICK, sequence: '14' },
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });

    expect(result.order.status).toBe('rejected');
    expect(result.order.rejectionCode).toBe('exposure_limit_exceeded');
  }, 15000);

  it('rejects opening a position on an inactive account', async () => {
    const secondUser = await createTestUser(
      `trading-test-inactive-${Date.now()}@wariba-test.invalid`,
    );
    try {
      const productVersion = await db
        .selectFrom('app.product_versions')
        .innerJoin('app.products', 'app.products.id', 'app.product_versions.product_id')
        .select([
          'app.product_versions.id',
          'app.products.nominal_balance',
          'app.products.nominal_currency',
        ])
        .where('app.products.code', '=', '5K')
        .executeTakeFirstOrThrow();
      const order = await db
        .insertInto('app.purchase_orders')
        .values({
          user_id: secondUser,
          product_version_id: productVersion.id,
          idempotency_key: randomUUID(),
          status: 'paid',
          total_amount: '22500.00',
          total_currency: 'XOF',
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      const account = await activateEvaluationAccount(db, {
        purchaseOrderId: order.id,
        userId: secondUser,
        nominalBalance: productVersion.nominal_balance,
        currency: productVersion.nominal_currency,
      });
      await db
        .updateTable('app.trading_accounts')
        .set({ status: 'closed' })
        .where('id', '=', account.id)
        .execute();

      const result = await openPosition(db, {
        accountId: account.id,
        idempotencyKey: randomUUID(),
        symbol: 'EURUSD',
        side: 'buy',
        quantity: '0.10',
        market: EURUSD_MARKET,
        marketBySymbol: ALL_MARKETS,
        now: NOW,
      });
      expect(result.order.status).toBe('rejected');
      expect(result.order.rejectionCode).toBe('account_not_active');

      await db.deleteFrom('app.trade_orders').where('account_id', '=', account.id).execute();
      await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', account.id).execute();
      await db
        .deleteFrom('app.trading_ledger_entries')
        .where('account_id', '=', account.id)
        .execute();
      await db
        .deleteFrom('app.account_state_transitions')
        .where('account_id', '=', account.id)
        .execute();
      await db.deleteFrom('app.trading_accounts').where('id', '=', account.id).execute();
      await db.deleteFrom('app.payment_events').where('purchase_order_id', '=', order.id).execute();
      await db.deleteFrom('app.purchase_orders').where('id', '=', order.id).execute();
    } finally {
      await deleteTestUser(secondUser);
    }
  }, 20000);

  it('partial close reduces open_quantity, records realized PnL, and leaves the position open', async () => {
    const open = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'XAUUSD',
      side: 'buy',
      quantity: '0.10',
      market: { bid: '2000.00', ask: '2000.30', timestamp: FRESH_TICK, sequence: '4' },
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });
    const positionId = open.position?.id as string;

    const close = await closePosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId,
      mode: 'partial',
      quantity: '0.04',
      market: { bid: '2010.00', ask: '2010.30', timestamp: FRESH_TICK, sequence: '5' },
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });

    expect(close.order.status).toBe('filled');
    expect(close.position?.status).toBe('open');
    expect(close.position?.openQuantity).toBe('0.0600');
    expect(Number(close.fill?.realizedPnl)).toBeGreaterThan(0); // price went up, buy position, closing part of it profits
  }, 15000);

  it('full close zeroes open_quantity and closes the position', async () => {
    const open = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'NAS100',
      side: 'sell',
      quantity: '1',
      market: { bid: '18000.0', ask: '18002.0', timestamp: FRESH_TICK, sequence: '6' },
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });
    const positionId = open.position?.id as string;

    const close = await closePosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId,
      mode: 'full',
      market: { bid: '17990.0', ask: '17992.0', timestamp: FRESH_TICK, sequence: '7' },
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });

    expect(close.position?.status).toBe('closed');
    expect(close.position?.openQuantity).toBe('0.0000');

    const row = await db
      .selectFrom('app.positions')
      .select(['status', 'closed_at'])
      .where('id', '=', positionId)
      .executeTakeFirstOrThrow();
    expect(row.status).toBe('closed');
    expect(row.closed_at).not.toBeNull();
  }, 15000);

  it('Prompt 07B §4 — marks a profitable close held under 60s as short-duration and excludes it from eligibleRealizedPnl', async () => {
    const projectionBefore = await loadAccountBalanceProjection(db, accountId);
    const openedAt = NOW;
    const closedAt = new Date(NOW.getTime() + 30_000); // 30s later — under the 60s threshold
    const open = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'XAUUSD',
      side: 'buy',
      // Deliberately tiny (minimum lot) — the shared test account already
      // has 0.06 XAUUSD lots open from an earlier test (xauusd_lots limit
      // is 0.10 for a 10K account) and each of these three tests fully
      // closes its own position, so 0.01 never risks the exposure ceiling.
      quantity: '0.01',
      market: { bid: '2000.00', ask: '2000.30', timestamp: openedAt.toISOString(), sequence: '30' },
      marketBySymbol: ALL_MARKETS,
      now: openedAt,
    });
    const positionId = open.position?.id as string;

    const close = await closePosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId,
      mode: 'full',
      market: { bid: '2010.00', ask: '2010.30', timestamp: closedAt.toISOString(), sequence: '31' },
      marketBySymbol: ALL_MARKETS,
      now: closedAt,
    });

    expect(Number(close.fill?.realizedPnl)).toBeGreaterThan(0);
    expect(close.fill?.durationMs).toBe('30000');
    expect(close.fill?.openingFillId).toBe(open.fill?.id);
    expect(close.fill?.isShortDurationProfit).toBe(true);
    expect(close.fill?.eligibilityReason).toBe('short_duration_profit');
    expect(close.fill?.eligibleRealizedPnl).toBe('0.00');
    expect(close.fill?.ineligibleShortDurationProfit).toBe(close.fill?.netRealizedPnl);

    const projectionAfter = await loadAccountBalanceProjection(db, accountId);
    expect(
      new Decimal(projectionAfter.accountBalance).minus(projectionBefore.accountBalance).toFixed(2),
    ).toBe(close.fill?.netRealizedPnl);
    expect(
      new Decimal(projectionAfter.programEligibleBalance)
        .minus(projectionBefore.programEligibleBalance)
        .toFixed(2),
    ).toBe('0.00');
  }, 30000);

  it('Prompt 07B §4 — marks a profitable close held at least 60s as fully eligible', async () => {
    const openedAt = NOW;
    const closedAt = new Date(NOW.getTime() + 61_000); // 61s later — over the 60s threshold
    const open = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'XAUUSD',
      side: 'buy',
      quantity: '0.01',
      market: { bid: '2000.00', ask: '2000.30', timestamp: openedAt.toISOString(), sequence: '32' },
      marketBySymbol: ALL_MARKETS,
      now: openedAt,
    });
    const positionId = open.position?.id as string;

    const close = await closePosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId,
      mode: 'full',
      market: { bid: '2010.00', ask: '2010.30', timestamp: closedAt.toISOString(), sequence: '33' },
      marketBySymbol: ALL_MARKETS,
      now: closedAt,
    });

    expect(Number(close.fill?.realizedPnl)).toBeGreaterThan(0);
    expect(close.fill?.durationMs).toBe('61000');
    expect(close.fill?.isShortDurationProfit).toBe(false);
    expect(close.fill?.eligibilityReason).toBe('eligible');
    expect(close.fill?.eligibleRealizedPnl).toBe(close.fill?.netRealizedPnl);
    expect(close.fill?.ineligibleShortDurationProfit).toBe('0.00');
  }, 30000);

  it('Prompt 07B §4 — counts a loss in full as eligible even when held under 60s', async () => {
    const openedAt = NOW;
    const closedAt = new Date(NOW.getTime() + 5_000); // 5s later
    const open = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'XAUUSD',
      side: 'buy',
      quantity: '0.01',
      market: { bid: '2000.00', ask: '2000.30', timestamp: openedAt.toISOString(), sequence: '34' },
      marketBySymbol: ALL_MARKETS,
      now: openedAt,
    });
    const positionId = open.position?.id as string;

    const close = await closePosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId,
      mode: 'full',
      market: { bid: '1990.00', ask: '1990.30', timestamp: closedAt.toISOString(), sequence: '35' },
      marketBySymbol: ALL_MARKETS,
      now: closedAt,
    });

    expect(Number(close.fill?.realizedPnl)).toBeLessThan(0);
    expect(close.fill?.isShortDurationProfit).toBe(false);
    expect(close.fill?.eligibilityReason).toBe('loss_counted');
    expect(close.fill?.eligibleRealizedPnl).toBe(close.fill?.netRealizedPnl);
    expect(Number(close.fill?.netRealizedPnl)).toBeLessThan(Number(close.fill?.realizedPnl));
    expect(close.fill?.ineligibleShortDurationProfit).toBe('0.00');
  }, 30000);

  it('Prompt 07B §4 — classifies a gross profit turned negative by commissions as a counted loss', async () => {
    const openedAt = NOW;
    const closedAt = new Date(NOW.getTime() + 5_000);
    const open = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.01',
      market: {
        bid: '1.08450',
        ask: '1.08460',
        timestamp: openedAt.toISOString(),
        sequence: '36',
      },
      marketBySymbol: ALL_MARKETS,
      now: openedAt,
    });
    const close = await closePosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId: open.position?.id as string,
      mode: 'full',
      market: {
        bid: '1.08470',
        ask: '1.08480',
        timestamp: closedAt.toISOString(),
        sequence: '37',
      },
      marketBySymbol: ALL_MARKETS,
      now: closedAt,
    });

    expect(Number(close.fill?.realizedPnl)).toBeGreaterThan(0);
    expect(Number(close.fill?.netRealizedPnl)).toBeLessThan(0);
    expect(close.fill?.isShortDurationProfit).toBe(false);
    expect(close.fill?.eligibilityReason).toBe('loss_counted');
    expect(close.fill?.eligibleRealizedPnl).toBe(close.fill?.netRealizedPnl);
    expect(close.fill?.ineligibleShortDurationProfit).toBe('0.00');
  }, 30000);

  it('rejects closing a position that does not belong to the account', async () => {
    const result = await closePosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId: randomUUID(),
      mode: 'full',
      market: EURUSD_MARKET,
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });
    expect(result.order.status).toBe('rejected');
    expect(result.order.rejectionCode).toBe('position_not_found');
  }, 15000);

  it('modifies stop_loss without touching quantity or realized PnL', async () => {
    const open = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'USDJPY',
      side: 'buy',
      quantity: '0.10',
      market: { bid: '150.100', ask: '150.120', timestamp: FRESH_TICK, sequence: '8' },
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });
    const positionId = open.position?.id as string;

    const modified = await modifyPositionRisk(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId,
      field: 'stop_loss',
      value: '149.500',
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });

    expect(modified.order.status).toBe('filled');
    expect(modified.position?.stopLoss).toBe('149.50000');
    expect(modified.position?.openQuantity).toBe(open.position?.openQuantity);
  }, 15000);

  it('stays at exactly one position under 5-way concurrent opens with the same idempotency key', async () => {
    const idempotencyKey = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        openPosition(db, {
          accountId,
          idempotencyKey,
          symbol: 'EURUSD',
          side: 'buy',
          quantity: '0.05',
          market: EURUSD_MARKET,
          marketBySymbol: ALL_MARKETS,
          now: NOW,
        }),
      ),
    );
    const uniquePositionIds = new Set(results.map((r) => r.position?.id));
    expect(uniquePositionIds.size).toBe(1);
  }, 20000);

  it('closeAllPositions closes every remaining open position on the account', async () => {
    await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'GBPUSD',
      side: 'buy',
      quantity: '0.10',
      market: { bid: '1.26000', ask: '1.26020', timestamp: FRESH_TICK, sequence: '9' },
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });

    const stillOpen = await db
      .selectFrom('app.positions')
      .select('symbol')
      .where('account_id', '=', accountId)
      .where('status', '=', 'open')
      .execute();
    expect(stillOpen.length).toBeGreaterThan(0);

    const marketBySymbol = {
      EURUSD: EURUSD_MARKET,
      GBPUSD: { bid: '1.26000', ask: '1.26020', timestamp: FRESH_TICK, sequence: '10' },
      USDJPY: { bid: '150.100', ask: '150.120', timestamp: FRESH_TICK, sequence: '11' },
      XAUUSD: { bid: '2010.00', ask: '2010.30', timestamp: FRESH_TICK, sequence: '12' },
      NAS100: { bid: '17990.0', ask: '17992.0', timestamp: FRESH_TICK, sequence: '13' },
    };

    const idempotencyKeyPrefix = `close-all-${randomUUID()}`;
    const first = await closeAllPositions(db, {
      accountId,
      idempotencyKeyPrefix,
      marketBySymbol,
      now: NOW,
    });

    const retry = await closeAllPositions(db, {
      accountId,
      idempotencyKeyPrefix,
      marketBySymbol,
      now: NOW,
    });

    expect(first.length).toBeGreaterThan(0);
    expect(retry.map((result) => result.order.orderId)).toEqual(
      first.map((result) => result.order.orderId),
    );
    expect(retry.every((result) => result.order.alreadyExisted)).toBe(true);

    const remainingOpen = await db
      .selectFrom('app.positions')
      .select('id')
      .where('account_id', '=', accountId)
      .where('status', '=', 'open')
      .execute();
    expect(remainingOpen).toHaveLength(0);
  }, 60000);

  it('keeps closing later positions in a Close All batch after an earlier one in the loop is rejected', async () => {
    // opened_at strictly increasing (not both `NOW`) so closeAllPositions'
    // `ORDER BY opened_at ASC` deterministically processes XAUUSD before
    // NAS100 — XAUUSD's close is rejected (stale price) first, then
    // NAS100's must still succeed. That ordering exercises exactly the
    // chain a rejection's account-version bump has to thread through
    // (closePositionLocked's reject path returning nextAccount) — get it
    // wrong and NAS100's optimistic-concurrency UPDATE throws because it's
    // still holding the pre-rejection version number.
    await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'XAUUSD',
      side: 'buy',
      quantity: '0.10',
      market: { bid: '2000.00', ask: '2000.30', timestamp: FRESH_TICK, sequence: '20' },
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });
    await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'NAS100',
      side: 'buy',
      quantity: '1.0',
      market: { bid: '18000.0', ask: '18002.0', timestamp: FRESH_TICK, sequence: '21' },
      marketBySymbol: ALL_MARKETS,
      now: new Date(NOW.getTime() + 1000),
    });

    const staleTick = new Date(NOW.getTime() - 60_000).toISOString();
    const results = await closeAllPositions(db, {
      accountId,
      idempotencyKeyPrefix: `close-all-mixed-${randomUUID()}`,
      marketBySymbol: {
        ...ALL_MARKETS,
        XAUUSD: { bid: '2010.00', ask: '2010.30', timestamp: staleTick, sequence: '22' },
        NAS100: { bid: '17990.0', ask: '17992.0', timestamp: FRESH_TICK, sequence: '23' },
      },
      now: NOW,
    });

    expect(results).toHaveLength(2);
    expect(results[0]?.order.status).toBe('rejected');
    expect(results[0]?.order.rejectionCode).toBe('stale_market_data');
    expect(results[1]?.order.status).toBe('filled');
    expect(results[1]?.position?.symbol).toBe('NAS100');
    expect(results[1]?.position?.status).toBe('closed');

    const stillOpenXauusd = await db
      .selectFrom('app.positions')
      .select('id')
      .where('account_id', '=', accountId)
      .where('symbol', '=', 'XAUUSD')
      .where('status', '=', 'open')
      .execute();
    expect(stillOpenXauusd).toHaveLength(1);
  }, 60000);

  it('Prompt 07B — countShortDurationProfitClosures counts only short-duration profit closes in the trailing 24h', async () => {
    const openedAt = NOW;
    const shortCloseAt = new Date(NOW.getTime() + 10_000);

    const before = await countShortDurationProfitClosures(db, accountId, shortCloseAt);

    const open = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.10',
      market: { bid: '1.08450', ask: '1.08460', timestamp: openedAt.toISOString(), sequence: '40' },
      marketBySymbol: ALL_MARKETS,
      now: openedAt,
    });
    await closePosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId: open.position?.id as string,
      mode: 'full',
      market: {
        bid: '1.09000',
        ask: '1.09010',
        timestamp: shortCloseAt.toISOString(),
        sequence: '41',
      },
      marketBySymbol: ALL_MARKETS,
      now: shortCloseAt,
    });

    const after = await countShortDurationProfitClosures(db, accountId, shortCloseAt);
    expect(after).toBe(before + 1);

    // A query point 25h after this close must not count it (outside the rolling 24h window).
    const wellAfter = await countShortDurationProfitClosures(
      db,
      accountId,
      new Date(shortCloseAt.getTime() + 25 * 60 * 60 * 1000),
    );
    expect(wellAfter).toBe(0);
  }, 20000);

  it('Prompt 07B / TRD-035 — rejects only new entries after six short-duration profits and records the rejection', async () => {
    const lockedAccountId = await createActiveAccount();
    const positionId = randomUUID();
    await db
      .insertInto('app.positions')
      .values({
        id: positionId,
        account_id: lockedAccountId,
        symbol: 'EURUSD',
        side: 'buy',
        opening_quantity: '0.01',
        open_quantity: '0',
        average_open_price: '1.08460',
        realized_pnl: '6.00',
        status: 'closed',
        account_sequence: '0',
        opened_at: new Date(NOW.getTime() - 60_000),
        closed_at: NOW,
      })
      .execute();

    const openingOrderId = randomUUID();
    const openingFillId = randomUUID();
    await db
      .insertInto('app.trade_orders')
      .values({
        id: openingOrderId,
        account_id: lockedAccountId,
        idempotency_key: `short-duration-opening-${randomUUID()}`,
        order_type: 'market_open',
        symbol: 'EURUSD',
        side: 'buy',
        position_id: positionId,
        filled_quantity: '0.01',
        status: 'filled',
        account_sequence: '0',
        received_at: new Date(NOW.getTime() - 60_000),
        accepted_at: new Date(NOW.getTime() - 60_000),
        completed_at: new Date(NOW.getTime() - 60_000),
      })
      .execute();
    await db
      .insertInto('app.fills')
      .values({
        id: openingFillId,
        order_id: openingOrderId,
        account_id: lockedAccountId,
        position_id: positionId,
        symbol: 'EURUSD',
        side: 'buy',
        fill_type: 'open',
        quantity: '0.01',
        price: '1.08460',
        spread_points: '10',
        slippage_points: '2',
        commission: '0',
        realized_pnl: '0',
        market_sequence: '0',
        account_sequence: '0',
        occurred_at: new Date(NOW.getTime() - 60_000),
        opening_fill_id: null,
      })
      .execute();

    const orderIds = Array.from({ length: 6 }, () => randomUUID());
    await db
      .insertInto('app.trade_orders')
      .values(
        orderIds.map((id, index) => ({
          id,
          account_id: lockedAccountId,
          idempotency_key: `short-duration-fixture-${index}-${randomUUID()}`,
          order_type: 'full_close' as const,
          symbol: 'EURUSD' as const,
          side: 'buy' as const,
          position_id: positionId,
          filled_quantity: '0.01',
          status: 'filled' as const,
          account_sequence: '0',
          received_at: new Date(NOW.getTime() - index * 1_000),
          accepted_at: new Date(NOW.getTime() - index * 1_000),
          completed_at: new Date(NOW.getTime() - index * 1_000),
        })),
      )
      .execute();
    await db
      .insertInto('app.fills')
      .values(
        orderIds.map((orderId, index) => ({
          order_id: orderId,
          account_id: lockedAccountId,
          position_id: positionId,
          symbol: 'EURUSD' as const,
          side: 'buy' as const,
          fill_type: 'close' as const,
          quantity: '0.01',
          price: '1.08500',
          spread_points: '10',
          slippage_points: '2',
          commission: '0',
          realized_pnl: '1.00',
          market_sequence: String(index + 1),
          account_sequence: '0',
          occurred_at: new Date(NOW.getTime() - index * 1_000),
          opening_fill_id: openingFillId,
          duration_ms: '10000',
          is_short_duration_profit: true,
          eligible_realized_pnl: '0',
          ineligible_short_duration_profit: '1.00',
          allocated_open_commission: '0',
          net_realized_pnl: '1.00',
          eligibility_reason: 'short_duration_profit' as const,
        })),
      )
      .execute();

    const result = await openPosition(db, {
      accountId: lockedAccountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.01',
      market: EURUSD_MARKET,
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });

    expect(result.order.status).toBe('rejected');
    expect(result.order.rejectionCode).toBe('short_duration_entry_locked');
    const persisted = await db
      .selectFrom('app.trade_orders')
      .select(['status', 'rejection_code'])
      .where('id', '=', result.order.orderId)
      .executeTakeFirstOrThrow();
    expect(persisted).toEqual({
      status: 'rejected',
      rejection_code: 'short_duration_entry_locked',
    });
  }, 30000);
});
