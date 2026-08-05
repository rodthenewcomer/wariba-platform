import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import { openPosition } from '../src/trading';

/**
 * Real RLS integration tests against the live hosted database.
 *
 * app.positions/app.trade_orders/app.fills are never queried through
 * PostgREST (the `app` schema isn't in supabase/config.toml's exposed
 * `api.schemas` — only `public`/`graphql_public` are), so there is no HTTP
 * endpoint to exercise RLS through. Instead this replicates exactly what
 * PostgREST does internally for every request: within a transaction,
 * `SET LOCAL ROLE` to the Postgres role for the simulated caller and set
 * `request.jwt.claims` so `auth.uid()` (which reads that GUC) resolves the
 * same way it would for a real authenticated request — then roll back so
 * nothing written here is ever committed.
 *
 * Requires DATABASE_URL in the environment (via .env.local, gitignored).
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

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

describeIfDb('trading tables — row level security (real database)', () => {
  let db: Db;
  let userA: string;
  let userB: string;
  let accountA: string;
  let accountB: string;
  let positionA: string;
  let orderA: string;
  let fillA: string;
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
    userA = await createTestUser(`rls-test-a-${Date.now()}@wariba-test.invalid`);
    userB = await createTestUser(`rls-test-b-${Date.now()}@wariba-test.invalid`);
    accountA = await createActiveAccount(userA);
    accountB = await createActiveAccount(userB);

    const opened = await openPosition(db, {
      accountId: accountA,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.10',
      market: {
        bid: '1.08450',
        ask: '1.08460',
        timestamp: new Date().toISOString(),
        sequence: '1',
      },
      marketBySymbol: {
        EURUSD: {
          bid: '1.08450',
          ask: '1.08460',
          timestamp: new Date().toISOString(),
          sequence: '1',
        },
        GBPUSD: {
          bid: '1.26000',
          ask: '1.26020',
          timestamp: new Date().toISOString(),
          sequence: '1',
        },
        USDJPY: {
          bid: '150.100',
          ask: '150.120',
          timestamp: new Date().toISOString(),
          sequence: '1',
        },
        XAUUSD: {
          bid: '2000.00',
          ask: '2000.30',
          timestamp: new Date().toISOString(),
          sequence: '1',
        },
        NAS100: {
          bid: '18000.0',
          ask: '18002.0',
          timestamp: new Date().toISOString(),
          sequence: '1',
        },
      },
      now: new Date(),
    });
    positionA = opened.position?.id as string;
    orderA = opened.order.orderId;
    const fillRow = await db
      .selectFrom('app.fills')
      .select('id')
      .where('position_id', '=', positionA)
      .executeTakeFirstOrThrow();
    fillA = fillRow.id;
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
    await deleteTestUser(userA);
    await deleteTestUser(userB);
    await db.destroy();
  }, 30000);

  describe('positions', () => {
    it('the owner can select their own position', async () => {
      const rows = await asRole(db, 'authenticated', userA, (trx) =>
        trx.selectFrom('app.positions').select('id').where('id', '=', positionA).execute(),
      );
      expect(rows).toHaveLength(1);
    });

    it('a different authenticated user cannot select someone else’s position', async () => {
      const rows = await asRole(db, 'authenticated', userB, (trx) =>
        trx.selectFrom('app.positions').select('id').where('id', '=', positionA).execute(),
      );
      expect(rows).toHaveLength(0);
    });

    it('the anon role has no grant at all on positions (permission denied, not just RLS-filtered)', async () => {
      await expect(
        asRole(db, 'anon', null, (trx) =>
          trx.selectFrom('app.positions').select('id').where('id', '=', positionA).execute(),
        ),
      ).rejects.toThrow(/permission denied/);
    });

    it('an unscoped select as the owner returns only their own rows, not other accounts’', async () => {
      const rows = await asRole(db, 'authenticated', userA, (trx) =>
        trx.selectFrom('app.positions').select(['id', 'account_id']).execute(),
      );
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.account_id === accountA)).toBe(true);
    });

    it('service role (bypasses RLS) can see both accounts’ rows, confirming the filtering above is real', async () => {
      const rows = await db
        .selectFrom('app.positions')
        .select('account_id')
        .where('account_id', 'in', [accountA, accountB])
        .execute();
      const accountIds = new Set(rows.map((r) => r.account_id));
      expect(accountIds.has(accountA)).toBe(true);
    });

    it('the owner cannot INSERT into positions (server-authoritative only, no write grant)', async () => {
      await expect(
        asRole(db, 'authenticated', userA, (trx) =>
          trx
            .insertInto('app.positions')
            .values({
              account_id: accountA,
              symbol: 'EURUSD',
              side: 'buy',
              opening_quantity: '0.10',
              open_quantity: '0.10',
              average_open_price: '1.08000',
              account_sequence: '1',
            })
            .execute(),
        ),
      ).rejects.toThrow();
    });

    it('the owner cannot UPDATE their own position (server-authoritative only, no write grant)', async () => {
      await expect(
        asRole(db, 'authenticated', userA, (trx) =>
          trx
            .updateTable('app.positions')
            .set({ stop_loss: '1.00000' })
            .where('id', '=', positionA)
            .execute(),
        ),
      ).rejects.toThrow();
    });
  });

  describe('trade_orders', () => {
    it('the owner can select their own order; another user cannot', async () => {
      const own = await asRole(db, 'authenticated', userA, (trx) =>
        trx.selectFrom('app.trade_orders').select('id').where('id', '=', orderA).execute(),
      );
      expect(own).toHaveLength(1);

      const other = await asRole(db, 'authenticated', userB, (trx) =>
        trx.selectFrom('app.trade_orders').select('id').where('id', '=', orderA).execute(),
      );
      expect(other).toHaveLength(0);
    });

    it('the anon role has no grant at all on trade_orders (permission denied, not just RLS-filtered)', async () => {
      await expect(
        asRole(db, 'anon', null, (trx) =>
          trx.selectFrom('app.trade_orders').select('id').where('id', '=', orderA).execute(),
        ),
      ).rejects.toThrow(/permission denied/);
    });
  });

  describe('fills', () => {
    it('the owner can select their own fill; another user cannot', async () => {
      const own = await asRole(db, 'authenticated', userA, (trx) =>
        trx.selectFrom('app.fills').select('id').where('id', '=', fillA).execute(),
      );
      expect(own).toHaveLength(1);

      const other = await asRole(db, 'authenticated', userB, (trx) =>
        trx.selectFrom('app.fills').select('id').where('id', '=', fillA).execute(),
      );
      expect(other).toHaveLength(0);
    });

    it('the anon role has no grant at all on fills (permission denied, not just RLS-filtered)', async () => {
      await expect(
        asRole(db, 'anon', null, (trx) =>
          trx.selectFrom('app.fills').select('id').where('id', '=', fillA).execute(),
        ),
      ).rejects.toThrow(/permission denied/);
    });
  });
});
