import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { getStaffRole } from '../src/staff';

/**
 * Prompt 7 Appendix 07-B, gate 4 — real RLS integration tests for
 * app.staff_members against the live database, same simulated-PostgREST-
 * request technique as trading-rls.integration.test.ts (see that file's
 * doc comment for why: app.staff_members isn't reachable via PostgREST
 * either, only via a direct Postgres connection).
 *
 * Requires DATABASE_URL/SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY in the
 * environment (via .env.local, gitignored).
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

describeIfDb('app.staff_members — row level security and role resolution (real database)', () => {
  let db: Db;
  let supportUser: string;
  let financeUser: string;
  let traderUser: string;
  const cleanupUserIds: string[] = [];
  const cleanupStaffIds: string[] = [];

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
    cleanupUserIds.push(body.id);
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
    supportUser = await createTestUser(`staff-rls-support-${Date.now()}@wariba-test.invalid`);
    financeUser = await createTestUser(`staff-rls-finance-${Date.now()}@wariba-test.invalid`);
    traderUser = await createTestUser(`staff-rls-trader-${Date.now()}@wariba-test.invalid`);

    const supportRow = await db
      .insertInto('app.staff_members')
      .values({ user_id: supportUser, role: 'support' })
      .returning('id')
      .executeTakeFirstOrThrow();
    cleanupStaffIds.push(supportRow.id);
    const financeRow = await db
      .insertInto('app.staff_members')
      .values({ user_id: financeUser, role: 'finance' })
      .returning('id')
      .executeTakeFirstOrThrow();
    cleanupStaffIds.push(financeRow.id);
    // traderUser deliberately gets no app.staff_members row.
  }, 30000);

  afterAll(async () => {
    for (const id of cleanupStaffIds) {
      await db.deleteFrom('app.staff_members').where('id', '=', id).execute();
    }
    for (const id of cleanupUserIds) {
      await deleteTestUser(id);
    }
  }, 30000);

  it('a staff member can read their own role via RLS', async () => {
    const rows = await asRole(db, 'authenticated', supportUser, (trx) =>
      trx
        .selectFrom('app.staff_members')
        .select(['role'])
        .where('user_id', '=', supportUser)
        .execute(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.role).toBe('support');
  });

  it('a staff member cannot read another staff member’s role via RLS', async () => {
    const rows = await asRole(db, 'authenticated', supportUser, (trx) =>
      trx
        .selectFrom('app.staff_members')
        .select(['role'])
        .where('user_id', '=', financeUser)
        .execute(),
    );
    expect(rows).toHaveLength(0);
  });

  it('a regular trader with no staff row reads back nothing for themselves — not an error, just empty', async () => {
    const rows = await asRole(db, 'authenticated', traderUser, (trx) =>
      trx
        .selectFrom('app.staff_members')
        .select(['role'])
        .where('user_id', '=', traderUser)
        .execute(),
    );
    expect(rows).toHaveLength(0);
  });

  it('an authenticated user cannot self-grant a staff role — no insert/update/delete privilege exists for that role', async () => {
    await expect(
      asRole(db, 'authenticated', traderUser, (trx) =>
        trx
          .insertInto('app.staff_members')
          .values({ user_id: traderUser, role: 'super_admin' })
          .execute(),
      ),
    ).rejects.toThrow();
  });

  it('an anonymous request sees nothing', async () => {
    const rows = await asRole(db, 'anon', null, (trx) =>
      trx.selectFrom('app.staff_members').select(['role']).execute(),
    );
    expect(rows).toHaveLength(0);
  });

  describe('getStaffRole', () => {
    it('resolves the seeded role for a real staff member', async () => {
      expect(await getStaffRole(db, supportUser)).toBe('support');
      expect(await getStaffRole(db, financeUser)).toBe('finance');
    });

    it('resolves null for a regular trader — the expected, non-error case', async () => {
      expect(await getStaffRole(db, traderUser)).toBeNull();
    });

    it('resolves null for a user id that does not exist at all', async () => {
      expect(await getStaffRole(db, randomUUID())).toBeNull();
    });
  });
});
