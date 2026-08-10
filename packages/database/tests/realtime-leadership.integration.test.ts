import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { activateEvaluationAccount } from '../src/activation';
import { createDbClient, type Db } from '../src/client';
import {
  acquireOrRenewRealtimeLeadership,
  expireRealtimeLeadership,
  StaleLeadershipError,
} from '../src/realtime-leadership';
import { openPosition, openPositionInTransaction } from '../src/trading';

const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('PostgreSQL realtime leadership fencing', () => {
  let db: Db;
  let userId: string;
  let accountId: string;
  let purchaseOrderId: string;

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    await db
      .updateTable('app.realtime_leadership')
      .set({
        leader_instance_id: null,
        fencing_epoch: '0',
        lease_expires_at: new Date(0),
        acquired_at: null,
        renewed_at: null,
        previous_leader_instance_id: null,
        takeover_count: 0,
      })
      .where('service_name', '=', 'market-trigger-writer')
      .execute();

    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `leadership-${Date.now()}@wariba-test.invalid`,
        password: randomUUID(),
        email_confirm: true,
      }),
    });
    userId = ((await response.json()) as { id: string }).id;
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
    purchaseOrderId = (
      await db
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
        .executeTakeFirstOrThrow()
    ).id;
    accountId = (
      await activateEvaluationAccount(db, {
        purchaseOrderId,
        userId,
        nominalBalance: productVersion.nominal_balance,
        currency: productVersion.nominal_currency,
      })
    ).id;
  }, 30000);

  afterAll(async () => {
    const positions = await db
      .selectFrom('app.positions')
      .select('id')
      .where('account_id', '=', accountId)
      .execute();
    for (const position of positions) {
      await db.deleteFrom('app.fills').where('position_id', '=', position.id).execute();
    }
    await db.deleteFrom('app.trade_orders').where('account_id', '=', accountId).execute();
    await db.deleteFrom('app.positions').where('account_id', '=', accountId).execute();
    await db.deleteFrom('app.trading_ledger_entries').where('account_id', '=', accountId).execute();
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
    await db.deleteFrom('app.trading_accounts').where('id', '=', accountId).execute();
    await db.deleteFrom('app.purchase_orders').where('id', '=', purchaseOrderId).execute();
    await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    await db.destroy();
  }, 30000);

  /**
   * Regression: the lease column was originally seeded with '-infinity',
   * which node-postgres does not decode into a Date, so the very first
   * election on a freshly migrated database threw
   * `lease_expires_at.getTime is not a function` — the realtime service
   * could not take leadership at all on a new deployment. Every test run
   * but a genuinely clean one masked it, because the row had already been
   * overwritten with a real timestamp.
   */
  it('elects a leader from an un-decodable lease sentinel instead of crashing', async () => {
    await sql`update app.realtime_leadership
              set leader_instance_id = null,
                  acquired_at = null,
                  renewed_at = null,
                  lease_expires_at = '-infinity'
              where service_name = 'market-trigger-writer'`.execute(db);

    const elected = await acquireOrRenewRealtimeLeadership(db, {
      instanceId: 'sentinel-node',
      leaseDurationMs: 4000,
    });
    expect(elected.role).toBe('leader');
    if (elected.role !== 'leader') throw new Error('sentinel-node was not elected');
    expect(elected.token.leaseExpiresAt.getTime()).toBeGreaterThan(Date.now() - 60_000);

    await expireRealtimeLeadership(db, elected.token);
  }, 30000);

  it('elects one writer, increments epoch on takeover, and fences the former leader', async () => {
    const nodeA = await acquireOrRenewRealtimeLeadership(db, {
      instanceId: 'node-a',
      leaseDurationMs: 4000,
    });
    expect(nodeA.role).toBe('leader');
    if (nodeA.role !== 'leader') throw new Error('node-a was not elected');

    const nodeBStandby = await acquireOrRenewRealtimeLeadership(db, {
      instanceId: 'node-b',
      leaseDurationMs: 4000,
    });
    expect(nodeBStandby.role).toBe('standby');

    const nodeARenewed = await acquireOrRenewRealtimeLeadership(db, {
      instanceId: 'node-a',
      leaseDurationMs: 4000,
    });
    expect(nodeARenewed.role).toBe('leader');
    expect(nodeARenewed.state.fencingEpoch).toBe(nodeA.state.fencingEpoch);

    await expireRealtimeLeadership(db, nodeA.token);
    const nodeB = await acquireOrRenewRealtimeLeadership(db, {
      instanceId: 'node-b',
      leaseDurationMs: 4000,
    });
    expect(nodeB.role).toBe('leader');
    if (nodeB.role !== 'leader') throw new Error('node-b did not take over');
    expect(BigInt(nodeB.token.fencingEpoch)).toBe(BigInt(nodeA.token.fencingEpoch) + 1n);

    const now = new Date();
    const market = {
      bid: '1.08450',
      ask: '1.08460',
      timestamp: now.toISOString(),
      sequence: '100',
    };
    const markets = {
      EURUSD: market,
      GBPUSD: { bid: '1.26000', ask: '1.26020', timestamp: now.toISOString(), sequence: '100' },
      USDJPY: { bid: '150.100', ask: '150.120', timestamp: now.toISOString(), sequence: '100' },
      XAUUSD: { bid: '2000.00', ask: '2000.30', timestamp: now.toISOString(), sequence: '100' },
      NAS100: { bid: '18000.0', ask: '18002.0', timestamp: now.toISOString(), sequence: '100' },
    };

    // The market-trigger path is the fenced one: it goes through the
    // in-transaction core carrying an explicit `market_trigger` execution
    // context. node-a's token is one epoch behind after node-b's takeover.
    await expect(
      db.transaction().execute((trx) =>
        openPositionInTransaction(trx, {
          accountId,
          idempotencyKey: randomUUID(),
          symbol: 'EURUSD',
          side: 'buy',
          quantity: '0.10',
          market,
          marketBySymbol: markets,
          now,
          execution: { source: 'market_trigger', fencingToken: nodeA.token },
        }),
      ),
    ).rejects.toBeInstanceOf(StaleLeadershipError);
    expect(
      await db
        .selectFrom('app.positions')
        .select('id')
        .where('account_id', '=', accountId)
        .execute(),
    ).toHaveLength(0);

    const accepted = await db.transaction().execute((trx) =>
      openPositionInTransaction(trx, {
        accountId,
        idempotencyKey: randomUUID(),
        symbol: 'EURUSD',
        side: 'buy',
        quantity: '0.10',
        market,
        marketBySymbol: markets,
        now,
        execution: { source: 'market_trigger', fencingToken: nodeB.token },
      }),
    );
    expect(accepted.order.status).toBe('filled');

    // A trader command is not leader-owned and must keep working on any
    // node, including while node-a's stale token exists.
    const traderCommand = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.10',
      market,
      marketBySymbol: markets,
      now,
    });
    expect(traderCommand.order.status).toBe('filled');
  }, 30000);
});
