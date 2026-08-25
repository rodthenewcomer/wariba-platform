import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createDbClient,
  activateEvaluationAccount,
  openPosition,
  closePosition,
  type Db,
} from '@wariba/database';
import { createLogger } from '@wariba/observability';
import { runDailyFinalizationJob } from '../src/jobs/daily-finalization';

/**
 * Real integration test against the live hosted database for the worker's
 * daily-finalization job orchestration (not re-testing finalize/evaluate
 * themselves — those have their own thorough coverage in
 * packages/database/tests/{risk,daily-finalization}.integration.test.ts).
 * This confirms the job correctly finds a due account, drives it through a
 * real finalize + risk re-evaluation, and reports it as processed.
 *
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

describeIfDb('runDailyFinalizationJob — real database', () => {
  let db: Db;
  let userId: string;
  let accountId: string;
  const logLines: string[] = [];
  const logger = createLogger({
    service: 'worker-test',
    minLevel: 'info',
    write: (line) => logLines.push(line),
  });

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

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    userId = await createTestUser(`worker-dailyfin-${Date.now()}@wariba-test.invalid`);

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
    accountId = account.id;
  }, 30000);

  afterAll(async () => {
    const positions = await db
      .selectFrom('app.positions')
      .select('id')
      .where('account_id', '=', accountId)
      .execute();
    for (const p of positions) {
      await db.deleteFrom('app.fills').where('position_id', '=', p.id).execute();
    }
    await db.deleteFrom('app.trade_orders').where('account_id', '=', accountId).execute();
    await db.deleteFrom('app.positions').where('account_id', '=', accountId).execute();
    await db.deleteFrom('app.trading_ledger_entries').where('account_id', '=', accountId).execute();
    for (const p of positions) {
      await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', p.id).execute();
    }
    await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', accountId).execute();
    await db.deleteFrom('app.risk_violations').where('account_id', '=', accountId).execute();
    await db
      .deleteFrom('app.account_daily_snapshots')
      .where('account_id', '=', accountId)
      .execute();
    await db
      .deleteFrom('app.account_state_transitions')
      .where('account_id', '=', accountId)
      .execute();
    const account = await db
      .selectFrom('app.trading_accounts')
      .select('source_purchase_order_id')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    await db.deleteFrom('app.trading_accounts').where('id', '=', accountId).execute();
    await db
      .deleteFrom('app.payment_events')
      .where('purchase_order_id', '=', account.source_purchase_order_id)
      .execute();
    await db
      .deleteFrom('app.purchase_orders')
      .where('id', '=', account.source_purchase_order_id)
      .execute();
    await deleteTestUser(userId);
    await db.destroy();
  }, 60000);

  it('finalizes a due account, resets its soft lock, and reports it as processed', async () => {
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

    const softLocked = await db
      .selectFrom('app.trading_accounts')
      .select('status')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    expect(softLocked.status).toBe('soft_locked');

    const result = await runDailyFinalizationJob(db, { now: () => dayTwo, logger });

    expect(result.dueAccountCount).toBeGreaterThan(0);
    expect(result.processedAccountIds).toContain(accountId);
    expect(result.failedAccountIds).not.toContain(accountId);

    const lifecycleLogs = logLines
      .map((line) => JSON.parse(line) as { event: string; accountId?: string })
      .filter((record) => record.accountId === accountId)
      .map((record) => record.event);
    expect(lifecycleLogs).toContain('evaluation_daily_finalization_started');
    expect(lifecycleLogs).toContain('evaluation_daily_finalization_completed');

    const afterJob = await db
      .selectFrom('app.trading_accounts')
      .select('status')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    expect(afterJob.status).toBe('active');
  }, 30000);
});
