import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import { loadControlUserDetail, searchControlUsers } from '../src/control-users';

/**
 * Prompt 09 — the Users explorer against the real database.
 *
 * Search and paging are proven here rather than in a unit test because the
 * whole point of this surface is that the *database* narrows the result: a
 * page that quietly returned every user and filtered in the browser would
 * pass a mocked test and leak the roster in production.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('Control users explorer — real database', () => {
  let db: Db;
  const marker = randomUUID().slice(0, 8);
  const created: { userId: string; accountId: string; purchaseOrderId: string }[] = [];

  const createUser = async (label: string, firstName: string): Promise<string> => {
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `ctrl-${marker}-${label}@wariba-test.invalid`,
        password: randomUUID(),
        email_confirm: true,
      }),
    });
    const userId = ((await response.json()) as { id: string }).id;
    await db
      .insertInto('app.user_profiles')
      .values({
        user_id: userId,
        first_name: firstName,
        last_name: `Explorer${marker}`,
        country: 'CI',
        language: 'fr',
      })
      .execute();

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
    created.push({ userId, accountId: account.id, purchaseOrderId: order.id });
    return userId;
  };

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    await createUser('alpha', `Alpha${marker}`);
    await createUser('bravo', `Bravo${marker}`);
    await createUser('charlie', `Charlie${marker}`);
  }, 90000);

  afterAll(async () => {
    for (const { userId, accountId, purchaseOrderId } of created) {
      await db
        .deleteFrom('app.trading_ledger_entries')
        .where('account_id', '=', accountId)
        .execute();
      await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', accountId).execute();
      await db
        .deleteFrom('app.account_state_transitions')
        .where('account_id', '=', accountId)
        .execute();
      await db
        .deleteFrom('app.account_daily_snapshots')
        .where('account_id', '=', accountId)
        .execute();
      await db.deleteFrom('app.trading_accounts').where('id', '=', accountId).execute();
      await db.deleteFrom('app.purchase_orders').where('id', '=', purchaseOrderId).execute();
      await db.deleteFrom('app.user_profiles').where('user_id', '=', userId).execute();
      await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
    }
    await db.destroy();
  }, 90000);

  it('finds a user by email fragment', async () => {
    const result = await searchControlUsers(db, { query: `ctrl-${marker}-bravo` });
    expect(result.total).toBe(1);
    expect(result.users[0]?.email).toContain(`ctrl-${marker}-bravo`);
  });

  it('finds a user by name', async () => {
    const result = await searchControlUsers(db, { query: `Charlie${marker}` });
    expect(result.total).toBe(1);
    expect(result.users[0]?.firstName).toBe(`Charlie${marker}`);
  });

  it('finds a user by their account’s public identifier', async () => {
    const account = await db
      .selectFrom('app.trading_accounts')
      .select('public_id')
      .where('id', '=', created[0]?.accountId as string)
      .executeTakeFirstOrThrow();
    const result = await searchControlUsers(db, { query: account.public_id });
    expect(result.total).toBe(1);
    expect(result.users[0]?.userId).toBe(created[0]?.userId);
  });

  it('rolls up each user’s accounts in the same query', async () => {
    const result = await searchControlUsers(db, { query: `Explorer${marker}` });
    expect(result.total).toBe(3);
    for (const user of result.users) {
      expect(user.accountCount).toBe(1);
      expect(user.accountStatuses.length).toBeGreaterThan(0);
      expect(user.integrityHolds).toBe(0);
    }
  });

  it('narrows in the database — a non-matching search returns nothing at all', async () => {
    const result = await searchControlUsers(db, { query: `no-such-user-${randomUUID()}` });
    expect(result.total).toBe(0);
    expect(result.users).toHaveLength(0);
  });

  it('treats wildcard characters as literal text, not as a pattern', async () => {
    // A bare `%` in the search box must not match every user on the platform.
    const result = await searchControlUsers(db, { query: '%' });
    expect(result.total).toBe(0);
  });

  it('pages without losing or repeating a user, and reports the full total', async () => {
    const first = await searchControlUsers(db, {
      query: `Explorer${marker}`,
      page: 1,
      pageSize: 2,
    });
    const second = await searchControlUsers(db, {
      query: `Explorer${marker}`,
      page: 2,
      pageSize: 2,
    });
    expect([first.total, second.total]).toEqual([3, 3]);
    expect([first.users.length, second.users.length]).toEqual([2, 1]);
    const ids = [...first.users, ...second.users].map((user) => user.userId);
    expect(new Set(ids).size).toBe(3);
  });

  it('caps an oversized page size instead of returning every user', async () => {
    const result = await searchControlUsers(db, { pageSize: 10_000 });
    expect(result.pageSize).toBeLessThanOrEqual(100);
  });

  it('loads a user’s detail with their accounts and lifecycle', async () => {
    const target = created[0] as (typeof created)[number];
    const detail = await loadControlUserDetail(db, target.userId);
    expect(detail).not.toBeNull();
    expect(detail?.userId).toBe(target.userId);
    expect(detail?.accounts.map((account) => account.id)).toContain(target.accountId);
    // Activation records a transition, so there is real lifecycle evidence.
    expect(detail?.lifecycle.length).toBeGreaterThan(0);
    expect(detail?.payoutRequestCount).toBe(0);
    expect(detail?.openReviewCases).toBe(0);
  });

  it('returns null for an unknown user rather than throwing', async () => {
    expect(await loadControlUserDetail(db, randomUUID())).toBeNull();
  });
});
