import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import { createPendingOrder } from '../src/pending-orders';
import { createPriceAlert } from '../src/price-alerts';
import { evaluateAlertsAsLeader } from './market-trigger-fixture';

/**
 * Prompt 7 Appendix 07-D — real RLS integration tests for
 * app.pending_orders/app.price_alerts/app.alert_notifications, against the
 * live hosted database. Same replay-what-PostgREST-does-internally
 * technique as trading-rls.integration.test.ts (SET LOCAL ROLE +
 * request.jwt.claims inside a rolled-back transaction) — see that file's
 * own doc comment for why. Requires DATABASE_URL in the environment (via
 * .env.local, gitignored).
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

const NOW = new Date();
const FRESH_MARKET = {
  bid: '1.08450',
  ask: '1.08460',
  timestamp: NOW.toISOString(),
  sequence: '1',
};

describeIfDb('pending orders / price alerts — row level security (real database)', () => {
  let db: Db;
  let userA: string;
  let userB: string;
  let accountA: string;
  let pendingOrderA: string;
  let alertA: string;
  let notificationA: string;
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
    userA = await createTestUser(`pending-alerts-rls-a-${Date.now()}@wariba-test.invalid`);
    userB = await createTestUser(`pending-alerts-rls-b-${Date.now()}@wariba-test.invalid`);
    accountA = await createActiveAccount(userA);

    const pendingResult = await createPendingOrder(db, {
      accountId: accountA,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      orderType: 'buy_limit',
      quantity: '0.50',
      triggerPrice: '1.08400',
      market: FRESH_MARKET,
      now: NOW,
    });
    pendingOrderA = pendingResult.order!.id;

    const alertResult = await createPriceAlert(db, {
      userId: userA,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      direction: 'cross_above',
      thresholdPrice: '1.20000',
      recurrence: 'once',
      now: NOW,
    });
    alertA = alertResult.alert!.id;

    await evaluateAlertsAsLeader(db, {
      symbol: 'EURUSD',
      tick: { bid: '1.19000', ask: '1.19010' },
      now: NOW,
    });
    const fired = await evaluateAlertsAsLeader(db, {
      symbol: 'EURUSD',
      tick: { bid: '1.21000', ask: '1.21010' },
      now: new Date(NOW.getTime() + 1_000),
    });
    notificationA = fired.find((n) => n.alertId === alertA)!.id;
  }, 30000);

  afterAll(async () => {
    await db.deleteFrom('app.alert_notifications').where('user_id', 'in', [userA, userB]).execute();
    await db.deleteFrom('app.price_alerts').where('user_id', 'in', [userA, userB]).execute();
    for (const id of cleanupAccountIds) {
      await db.deleteFrom('app.pending_orders').where('account_id', '=', id).execute();
      await db.deleteFrom('app.trading_ledger_entries').where('account_id', '=', id).execute();
      await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', id).execute();
      // risk_violations references both account_state_transitions and
      // account_daily_snapshots — must be deleted before either (same
      // ordering as trading-rls.integration.test.ts).
      await db.deleteFrom('app.risk_violations').where('account_id', '=', id).execute();
      await db.deleteFrom('app.account_daily_snapshots').where('account_id', '=', id).execute();
      await db.deleteFrom('app.account_state_transitions').where('account_id', '=', id).execute();
      await db.deleteFrom('app.trading_accounts').where('id', '=', id).execute();
    }
    const purchaseOrders = await db
      .selectFrom('app.purchase_orders')
      .select('id')
      .where('user_id', 'in', [userA, userB])
      .execute();
    for (const po of purchaseOrders) {
      await db.deleteFrom('app.payment_events').where('purchase_order_id', '=', po.id).execute();
      await db.deleteFrom('app.purchase_orders').where('id', '=', po.id).execute();
    }
    await deleteTestUser(userA);
    await deleteTestUser(userB);
    await db.destroy();
  }, 30000);

  describe('pending_orders', () => {
    it('RLS enabled with no policy at all denies even the owner under the authenticated role', async () => {
      await expect(
        asRole(db, 'authenticated', userA, (trx) =>
          trx
            .selectFrom('app.pending_orders')
            .select('id')
            .where('id', '=', pendingOrderA)
            .execute(),
        ),
      ).rejects.toThrow(/permission denied/);
    });

    it('the anon role has no grant at all either', async () => {
      await expect(
        asRole(db, 'anon', null, (trx) =>
          trx
            .selectFrom('app.pending_orders')
            .select('id')
            .where('id', '=', pendingOrderA)
            .execute(),
        ),
      ).rejects.toThrow(/permission denied/);
    });

    it('service role (bypasses RLS) can see it, confirming this is a real row, not a setup failure', async () => {
      const rows = await db
        .selectFrom('app.pending_orders')
        .select('id')
        .where('id', '=', pendingOrderA)
        .execute();
      expect(rows).toHaveLength(1);
    });
  });

  describe('price_alerts', () => {
    it('the owner can select their own alert; another user cannot', async () => {
      const own = await asRole(db, 'authenticated', userA, (trx) =>
        trx.selectFrom('app.price_alerts').select('id').where('id', '=', alertA).execute(),
      );
      expect(own).toHaveLength(1);

      const other = await asRole(db, 'authenticated', userB, (trx) =>
        trx.selectFrom('app.price_alerts').select('id').where('id', '=', alertA).execute(),
      );
      expect(other).toHaveLength(0);
    });

    it('the anon role has no grant at all on price_alerts', async () => {
      await expect(
        asRole(db, 'anon', null, (trx) =>
          trx.selectFrom('app.price_alerts').select('id').where('id', '=', alertA).execute(),
        ),
      ).rejects.toThrow(/permission denied/);
    });

    it('the owner cannot INSERT into price_alerts directly (server-authoritative only, no write grant)', async () => {
      await expect(
        asRole(db, 'authenticated', userA, (trx) =>
          trx
            .insertInto('app.price_alerts')
            .values({
              user_id: userA,
              symbol: 'EURUSD',
              direction: 'cross_above',
              threshold_price: '1.50000',
              recurrence: 'once',
              idempotency_key: randomUUID(),
            })
            .execute(),
        ),
      ).rejects.toThrow();
    });

    it('the owner cannot UPDATE their own alert directly (server-authoritative only, no write grant)', async () => {
      await expect(
        asRole(db, 'authenticated', userA, (trx) =>
          trx
            .updateTable('app.price_alerts')
            .set({ enabled: false })
            .where('id', '=', alertA)
            .execute(),
        ),
      ).rejects.toThrow();
    });
  });

  describe('alert_notifications', () => {
    it('the owner can select their own notification; another user cannot', async () => {
      const own = await asRole(db, 'authenticated', userA, (trx) =>
        trx
          .selectFrom('app.alert_notifications')
          .select('id')
          .where('id', '=', notificationA)
          .execute(),
      );
      expect(own).toHaveLength(1);

      const other = await asRole(db, 'authenticated', userB, (trx) =>
        trx
          .selectFrom('app.alert_notifications')
          .select('id')
          .where('id', '=', notificationA)
          .execute(),
      );
      expect(other).toHaveLength(0);
    });

    it('the anon role has no grant at all on alert_notifications', async () => {
      await expect(
        asRole(db, 'anon', null, (trx) =>
          trx
            .selectFrom('app.alert_notifications')
            .select('id')
            .where('id', '=', notificationA)
            .execute(),
        ),
      ).rejects.toThrow(/permission denied/);
    });
  });
});
