import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';

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

describeIfDb('identity and commerce tables — row level security (real database)', () => {
  let db: Db;
  let userA: string;
  let userB: string;
  let orderA: string;
  let orderB: string;

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
    userA = await createTestUser(`commerce-rls-a-${Date.now()}@wariba-test.invalid`);
    userB = await createTestUser(`commerce-rls-b-${Date.now()}@wariba-test.invalid`);

    await db
      .insertInto('app.user_profiles')
      .values([
        { user_id: userA, first_name: 'A', last_name: 'Test', country: 'CI', language: 'fr' },
        { user_id: userB, first_name: 'B', last_name: 'Test', country: 'CI', language: 'fr' },
      ])
      .execute();
    await db
      .insertInto('app.user_consents')
      .values([
        {
          user_id: userA,
          consent_type: 'simulated_account_disclosure',
          policy_version_id: 'rls-test',
          locale: 'fr',
        },
        {
          user_id: userB,
          consent_type: 'simulated_account_disclosure',
          policy_version_id: 'rls-test',
          locale: 'fr',
        },
      ])
      .execute();

    const productVersion = await db
      .selectFrom('app.product_versions')
      .innerJoin('app.products', 'app.products.id', 'app.product_versions.product_id')
      .select('app.product_versions.id')
      .where('app.products.code', '=', '5K')
      .where('app.product_versions.retired_at', 'is', null)
      .executeTakeFirstOrThrow();
    const orders = await db
      .insertInto('app.purchase_orders')
      .values([
        {
          user_id: userA,
          product_version_id: productVersion.id,
          idempotency_key: randomUUID(),
          status: 'pending_payment',
          total_amount: '22500.00',
          total_currency: 'XOF',
        },
        {
          user_id: userB,
          product_version_id: productVersion.id,
          idempotency_key: randomUUID(),
          status: 'pending_payment',
          total_amount: '22500.00',
          total_currency: 'XOF',
        },
      ])
      .returning(['id', 'user_id'])
      .execute();
    orderA = orders.find((order) => order.user_id === userA)?.id ?? '';
    orderB = orders.find((order) => order.user_id === userB)?.id ?? '';
    await db
      .insertInto('app.payment_attempts')
      .values({
        purchase_order_id: orderA,
        amount: '22500.00',
        currency: 'XOF',
        provider_reference: `rls_${orderA}`,
      })
      .execute();
    await db
      .insertInto('app.receipts')
      .values({ purchase_order_id: orderA, amount: '22500.00', currency: 'XOF' })
      .execute();
  }, 30000);

  afterAll(async () => {
    await db.deleteFrom('app.receipts').where('purchase_order_id', '=', orderA).execute();
    await db.deleteFrom('app.payment_attempts').where('purchase_order_id', '=', orderA).execute();
    await db.deleteFrom('app.purchase_orders').where('id', 'in', [orderA, orderB]).execute();
    await db.deleteFrom('app.user_consents').where('user_id', 'in', [userA, userB]).execute();
    await db.deleteFrom('app.user_profiles').where('user_id', 'in', [userA, userB]).execute();
    await deleteTestUser(userA);
    await deleteTestUser(userB);
    await db.destroy();
  }, 30000);

  it('lets owners read only their own profile and consent', async () => {
    const profiles = await asRole(db, 'authenticated', userA, (trx) =>
      trx.selectFrom('app.user_profiles').select('user_id').execute(),
    );
    const consents = await asRole(db, 'authenticated', userA, (trx) =>
      trx.selectFrom('app.user_consents').select('user_id').execute(),
    );
    expect(profiles.map((row) => row.user_id)).toEqual([userA]);
    expect(consents.every((row) => row.user_id === userA)).toBe(true);
  });

  it('isolates purchase orders, payment attempts and receipts by owner', async () => {
    const ownOrders = await asRole(db, 'authenticated', userA, (trx) =>
      trx.selectFrom('app.purchase_orders').select('id').execute(),
    );
    const otherOrder = await asRole(db, 'authenticated', userB, (trx) =>
      trx.selectFrom('app.purchase_orders').select('id').where('id', '=', orderA).execute(),
    );
    const attempts = await asRole(db, 'authenticated', userA, (trx) =>
      trx.selectFrom('app.payment_attempts').select('purchase_order_id').execute(),
    );
    const receipts = await asRole(db, 'authenticated', userA, (trx) =>
      trx.selectFrom('app.receipts').select('purchase_order_id').execute(),
    );
    expect(ownOrders.every((row) => row.id !== orderB)).toBe(true);
    expect(otherOrder).toHaveLength(0);
    expect(attempts.map((row) => row.purchase_order_id)).toContain(orderA);
    expect(receipts.map((row) => row.purchase_order_id)).toContain(orderA);
  });

  it('denies browser writes to server-authoritative purchase orders', async () => {
    await expect(
      asRole(db, 'authenticated', userA, (trx) =>
        trx
          .insertInto('app.purchase_orders')
          .values({
            user_id: userA,
            product_version_id: randomUUID(),
            idempotency_key: randomUUID(),
            status: 'pending_payment',
            total_amount: '1.00',
            total_currency: 'XOF',
          })
          .execute(),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('denies anonymous access while the service role can inspect both users', async () => {
    await expect(
      asRole(db, 'anon', null, (trx) =>
        trx.selectFrom('app.purchase_orders').select('id').execute(),
      ),
    ).rejects.toThrow(/permission denied/);

    const serviceRows = await db
      .selectFrom('app.purchase_orders')
      .select('user_id')
      .where('id', 'in', [orderA, orderB])
      .execute();
    expect(new Set(serviceRows.map((row) => row.user_id))).toEqual(new Set([userA, userB]));
  });
});
