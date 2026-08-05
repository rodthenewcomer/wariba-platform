import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import { openPosition, closePosition } from '../src/trading';

/**
 * Real RLS integration tests against the live hosted database for Prompt
 * 05's new tables (app.account_daily_snapshots, app.risk_violations).
 * Same technique as trading-rls.integration.test.ts: replicate what
 * PostgREST does internally (SET LOCAL ROLE + request.jwt.claims) inside a
 * rolled-back transaction, since the `app` schema has no PostgREST endpoint.
 *
 * Requires DATABASE_URL in the environment (via .env.local, gitignored).
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

async function asRole<T>(
  db: Db,
  role: 'authenticated' | 'anon',
  userId: string | null,
  fn: (trx: Db) => Promise<T>,
): Promise<T> {
  return db.transaction().execute(async (trx) => {
    await sql`select set_config('role', ${role}, true)`.execute(trx);
    if (userId) {
      const claims = JSON.stringify({ sub: userId, role });
      await sql`select set_config('request.jwt.claims', ${claims}, true)`.execute(trx);
    }
    return fn(trx);
  });
}

describeIfDb('risk tables — row level security (real database)', () => {
  let db: Db;
  let userA: string;
  let userB: string;
  let accountA: string;
  let accountB: string;
  let snapshotIdA: string;
  let violationIdA: string;
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

  const createActiveAccount = async (uid: string): Promise<string> => {
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
        user_id: uid,
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
      userId: uid,
      nominalBalance: productVersion.nominal_balance,
      currency: productVersion.nominal_currency,
    });
    cleanupAccountIds.push(account.id);
    return account.id;
  };

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    userA = await createTestUser(`risk-rls-a-${Date.now()}@wariba-test.invalid`);
    userB = await createTestUser(`risk-rls-b-${Date.now()}@wariba-test.invalid`);
    accountA = await createActiveAccount(userA);
    accountB = await createActiveAccount(userB);

    // Trigger a real soft lock on accountA so both new tables have a genuine row.
    const openMarket = { bid: '1.09995', ask: '1.10000', timestamp: FRESH_TICK, sequence: '1' };
    const open = await openPosition(db, {
      accountId: accountA,
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
      accountId: accountA,
      idempotencyKey: randomUUID(),
      positionId: open.position?.id as string,
      mode: 'full',
      market: closeMarket,
      marketBySymbol: { ...ALL_MARKETS, EURUSD: closeMarket },
      now: NOW,
    });

    const snapshotRow = await db
      .selectFrom('app.account_daily_snapshots')
      .select('id')
      .where('account_id', '=', accountA)
      .executeTakeFirstOrThrow();
    snapshotIdA = snapshotRow.id;

    const violationRow = await db
      .selectFrom('app.risk_violations')
      .select('id')
      .where('account_id', '=', accountA)
      .executeTakeFirstOrThrow();
    violationIdA = violationRow.id;
  }, 30000);

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
    await deleteTestUser(userA);
    await deleteTestUser(userB);
    await db.destroy();
  }, 30000);

  describe('account_daily_snapshots', () => {
    it('the owner can select their own snapshot; another user cannot', async () => {
      const own = await asRole(db, 'authenticated', userA, (trx) =>
        trx
          .selectFrom('app.account_daily_snapshots')
          .select('id')
          .where('id', '=', snapshotIdA)
          .execute(),
      );
      expect(own).toHaveLength(1);

      const other = await asRole(db, 'authenticated', userB, (trx) =>
        trx
          .selectFrom('app.account_daily_snapshots')
          .select('id')
          .where('id', '=', snapshotIdA)
          .execute(),
      );
      expect(other).toHaveLength(0);
    });

    it('an unscoped select as the owner returns only their own account’s rows', async () => {
      const rows = await asRole(db, 'authenticated', userA, (trx) =>
        trx.selectFrom('app.account_daily_snapshots').select(['id', 'account_id']).execute(),
      );
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.account_id === accountA)).toBe(true);
    });

    it('service role (bypasses RLS) can see rows for either account, confirming the filtering above is real', async () => {
      const rows = await db
        .selectFrom('app.account_daily_snapshots')
        .select('account_id')
        .where('account_id', 'in', [accountA, accountB])
        .execute();
      const accountIds = new Set(rows.map((r) => r.account_id));
      expect(accountIds.has(accountA)).toBe(true);
    });

    it('the anon role has no grant at all (permission denied, not just RLS-filtered)', async () => {
      await expect(
        asRole(db, 'anon', null, (trx) =>
          trx
            .selectFrom('app.account_daily_snapshots')
            .select('id')
            .where('id', '=', snapshotIdA)
            .execute(),
        ),
      ).rejects.toThrow(/permission denied/);
    });

    it('the owner cannot INSERT or UPDATE (server-authoritative only, no write grant)', async () => {
      await expect(
        asRole(db, 'authenticated', userA, (trx) =>
          trx
            .updateTable('app.account_daily_snapshots')
            .set({ status: 'finalized' })
            .where('id', '=', snapshotIdA)
            .execute(),
        ),
      ).rejects.toThrow();
    });
  });

  describe('risk_violations', () => {
    it('the owner can select their own violation; another user cannot', async () => {
      const own = await asRole(db, 'authenticated', userA, (trx) =>
        trx.selectFrom('app.risk_violations').select('id').where('id', '=', violationIdA).execute(),
      );
      expect(own).toHaveLength(1);

      const other = await asRole(db, 'authenticated', userB, (trx) =>
        trx.selectFrom('app.risk_violations').select('id').where('id', '=', violationIdA).execute(),
      );
      expect(other).toHaveLength(0);
    });

    it('the violation row carries the expected evidence fields', async () => {
      const rows = await asRole(db, 'authenticated', userA, (trx) =>
        trx
          .selectFrom('app.risk_violations')
          .select(['rule_code', 'severity', 'consequence', 'calculation_version'])
          .where('id', '=', violationIdA)
          .execute(),
      );
      expect(rows[0]).toMatchObject({
        rule_code: 'RISK_DAILY_LOSS_LOCK',
        severity: 'warning',
        consequence: 'soft_lock',
        calculation_version: 'risk-engine-v1',
      });
    });

    it('the anon role has no grant at all (permission denied, not just RLS-filtered)', async () => {
      await expect(
        asRole(db, 'anon', null, (trx) =>
          trx
            .selectFrom('app.risk_violations')
            .select('id')
            .where('id', '=', violationIdA)
            .execute(),
        ),
      ).rejects.toThrow(/permission denied/);
    });

    it('the owner cannot INSERT into risk_violations (server-authoritative only, no write grant)', async () => {
      await expect(
        asRole(db, 'authenticated', userA, (trx) =>
          trx
            .insertInto('app.risk_violations')
            .values({
              account_id: accountA,
              rule_code: 'RISK_DAILY_LOSS_LOCK',
              severity: 'warning',
              consequence: 'soft_lock',
              policy_version_id: randomUUID(),
              trigger_event_type: 'manual_review',
            })
            .execute(),
        ),
      ).rejects.toThrow();
    });
  });
});
