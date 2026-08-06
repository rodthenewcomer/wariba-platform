import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import { openPosition, closePosition } from '../src/trading';
import {
  queuePositionReduction,
  cancelQueuedReduction,
  executeQueuedReductions,
  loadQueuedReductionsForAccount,
} from '../src/position-reduction-queue';

/**
 * Prompt 7 Appendix 07-C §12 — real integration tests for the stale/outage
 * position-reduction queue, against the live hosted database. Requires
 * DATABASE_URL in the environment (via .env.local, gitignored).
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

const NOW = new Date();
const FRESH_TICK = NOW.toISOString();
const STALE_TICK = new Date(NOW.getTime() - 60_000).toISOString();
const FRESH_MARKET = { bid: '1.08450', ask: '1.08460', timestamp: FRESH_TICK, sequence: '1' };
const STALE_MARKET = { bid: '1.08450', ask: '1.08460', timestamp: STALE_TICK, sequence: '1' };
const ALL_MARKETS_FRESH = {
  EURUSD: FRESH_MARKET,
  GBPUSD: { bid: '1.26000', ask: '1.26020', timestamp: FRESH_TICK, sequence: '900' },
  USDJPY: { bid: '150.100', ask: '150.120', timestamp: FRESH_TICK, sequence: '900' },
  XAUUSD: { bid: '2000.00', ask: '2000.30', timestamp: FRESH_TICK, sequence: '900' },
  NAS100: { bid: '18000.0', ask: '18002.0', timestamp: FRESH_TICK, sequence: '900' },
};

describeIfDb('position-reduction-queue — real database', () => {
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

  const openTestPosition = async (quantity = '1.00'): Promise<string> => {
    const result = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity,
      market: FRESH_MARKET,
      marketBySymbol: ALL_MARKETS_FRESH,
      now: NOW,
    });
    if (!result.position) throw new Error('test setup: position did not open');
    return result.position.id;
  };

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    userId = await createTestUser(`reduction-queue-test-${Date.now()}@wariba-test.invalid`);
  }, 60000);

  beforeEach(async () => {
    accountId = await createActiveAccount();
  }, 30000);

  afterAll(async () => {
    for (const id of cleanupAccountIds) {
      const positions = await db
        .selectFrom('app.positions')
        .select('id')
        .where('account_id', '=', id)
        .execute();
      await db.deleteFrom('app.position_reduction_queue').where('account_id', '=', id).execute();
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
    await deleteTestUser(userId);
    await db.destroy();
  }, 60000);

  it('rejects queuing a reduction when the market is not stale — the immediate command should be used instead', async () => {
    const positionId = await openTestPosition();
    const result = await queuePositionReduction(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId,
      mode: 'full',
      market: FRESH_MARKET,
      now: NOW,
    });
    expect(result.status).toBe('rejected');
    expect(result.rejectionCode).toBe('market_not_stale');
  });

  it('queues a partial reduction while the market is stale, without touching the position yet', async () => {
    const positionId = await openTestPosition('1.00');
    const result = await queuePositionReduction(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId,
      mode: 'partial',
      quantity: '0.40',
      market: STALE_MARKET,
      now: NOW,
    });
    expect(result.status).toBe('queued');
    expect(result.queueEntry?.status).toBe('queued');
    expect(result.queueEntry?.requestedQuantity).toBe('0.4000');

    const position = await db
      .selectFrom('app.positions')
      .select('open_quantity')
      .where('id', '=', positionId)
      .executeTakeFirstOrThrow();
    expect(position.open_quantity).toBe('1.0000');
  });

  it('rejects an invalid partial quantity even while stale', async () => {
    const positionId = await openTestPosition('1.00');
    const result = await queuePositionReduction(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId,
      mode: 'partial',
      quantity: '1.00', // >= open quantity — must be a full_close, not partial
      market: STALE_MARKET,
      now: NOW,
    });
    expect(result.status).toBe('rejected');
    expect(result.rejectionCode).toBe('invalid_quantity');
  });

  it('is idempotent — replaying the same idempotency key returns the same queue entry, not a duplicate', async () => {
    const positionId = await openTestPosition('1.00');
    const idempotencyKey = randomUUID();
    const first = await queuePositionReduction(db, {
      accountId,
      idempotencyKey,
      positionId,
      mode: 'full',
      market: STALE_MARKET,
      now: NOW,
    });
    const second = await queuePositionReduction(db, {
      accountId,
      idempotencyKey,
      positionId,
      mode: 'full',
      market: STALE_MARKET,
      now: NOW,
    });
    expect(second.queueEntry?.id).toBe(first.queueEntry?.id);

    const queued = await loadQueuedReductionsForAccount(db, accountId);
    expect(queued.filter((q) => q.positionId === positionId)).toHaveLength(1);
  });

  it('cancels a queued reduction that has not executed yet', async () => {
    const positionId = await openTestPosition('1.00');
    const queued = await queuePositionReduction(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId,
      mode: 'full',
      market: STALE_MARKET,
      now: NOW,
    });
    const cancelled = await cancelQueuedReduction(db, {
      accountId,
      queueId: queued.queueEntry!.id,
      now: NOW,
    });
    expect(cancelled.status).toBe('cancelled');

    const remaining = await loadQueuedReductionsForAccount(db, accountId);
    expect(remaining.filter((q) => q.positionId === positionId)).toHaveLength(0);
  });

  it('rejects cancelling an already-settled queue entry', async () => {
    const positionId = await openTestPosition('1.00');
    const queued = await queuePositionReduction(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId,
      mode: 'full',
      market: STALE_MARKET,
      now: NOW,
    });
    const firstCancel = await cancelQueuedReduction(db, {
      accountId,
      queueId: queued.queueEntry!.id,
      now: NOW,
    });
    expect(firstCancel.status).toBe('cancelled');

    const secondCancel = await cancelQueuedReduction(db, {
      accountId,
      queueId: queued.queueEntry!.id,
      now: NOW,
    });
    expect(secondCancel.status).toBe('rejected');
    expect(secondCancel.rejectionCode).toBe('queue_entry_already_settled');
  });

  it('executes a queued partial reduction against the first fresh tick, exactly once', async () => {
    const positionId = await openTestPosition('1.00');
    await queuePositionReduction(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId,
      mode: 'partial',
      quantity: '0.40',
      market: STALE_MARKET,
      now: NOW,
    });

    const later = new Date(NOW.getTime() + 1_000);
    const firstRun = await executeQueuedReductions(db, {
      symbol: 'EURUSD',
      market: { ...FRESH_MARKET, timestamp: later.toISOString(), sequence: '2' },
      marketBySymbol: ALL_MARKETS_FRESH,
      now: later,
    });
    expect(firstRun).toHaveLength(1);
    expect(firstRun[0]?.commandResult.order.status).toBe('filled');
    expect(firstRun[0]?.queueEntry.status).toBe('executed');

    const position = await db
      .selectFrom('app.positions')
      .select('open_quantity')
      .where('id', '=', positionId)
      .executeTakeFirstOrThrow();
    expect(position.open_quantity).toBe('0.6000');

    // A second tick must find nothing left queued for this symbol — never
    // a duplicate execution of the same reduction.
    const secondRun = await executeQueuedReductions(db, {
      symbol: 'EURUSD',
      market: {
        ...FRESH_MARKET,
        timestamp: new Date(later.getTime() + 1_000).toISOString(),
        sequence: '3',
      },
      marketBySymbol: ALL_MARKETS_FRESH,
      now: new Date(later.getTime() + 1_000),
    });
    expect(secondRun).toHaveLength(0);
  });

  it('marks a queued reduction as failed (not stuck) if it becomes invalid before execution', async () => {
    const positionId = await openTestPosition('1.00');
    await queuePositionReduction(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId,
      mode: 'partial',
      quantity: '0.70',
      market: STALE_MARKET,
      now: NOW,
    });

    // An immediate close reduces the position to 0.20 before the market
    // recovers — the queued 0.70 reduction is no longer a valid partial
    // quantity against the new, smaller open quantity.
    const immediateClose = await closePosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId,
      mode: 'partial',
      quantity: '0.80',
      market: FRESH_MARKET,
      marketBySymbol: ALL_MARKETS_FRESH,
      now: NOW,
    });
    expect(immediateClose.order.status).toBe('filled');

    const later = new Date(NOW.getTime() + 1_000);
    const executed = await executeQueuedReductions(db, {
      symbol: 'EURUSD',
      market: { ...FRESH_MARKET, timestamp: later.toISOString(), sequence: '4' },
      marketBySymbol: ALL_MARKETS_FRESH,
      now: later,
    });
    expect(executed).toHaveLength(1);
    expect(executed[0]?.queueEntry.status).toBe('failed');
    expect(executed[0]?.commandResult.order.status).toBe('rejected');

    const remaining = await loadQueuedReductionsForAccount(db, accountId);
    expect(remaining.filter((q) => q.positionId === positionId)).toHaveLength(0);
  });
});
