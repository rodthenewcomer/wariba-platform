import { randomUUID } from 'node:crypto';
import { createDbClient, type Db, type StaffRole } from '@wariba/database';

/**
 * E2E fixture helpers for Prompt 7 Appendix 07-B's /control authorization
 * tests — same reasoning as trade-account-fixture.ts / hub-account-fixture.ts
 * for why this lives in @wariba/test-utils rather than apps/web (AGENTS.md
 * §7.1).
 */
export const STAFF_E2E_TEST_PASSWORD = `Staff-e2e-${randomUUID().slice(0, 12)}!`;

export interface StaffFixtureUser {
  userId: string;
  email: string;
  /** null for a plain trader — no app.staff_members row at all. */
  role: StaffRole | null;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name} for E2E fixtures.`);
  return value;
}

export function createFixtureDb(): Db {
  return createDbClient(requireEnv('DATABASE_URL'));
}

async function createTestUser(email: string): Promise<string> {
  const res = await fetch(`${requireEnv('SUPABASE_URL')}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      Authorization: `Bearer ${requireEnv('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password: STAFF_E2E_TEST_PASSWORD, email_confirm: true }),
  });
  const body = (await res.json()) as { id: string };
  return body.id;
}

export async function deleteStaffFixtureUser(fixture: StaffFixtureUser): Promise<void> {
  await fetch(`${requireEnv('SUPABASE_URL')}/auth/v1/admin/users/${fixture.userId}`, {
    method: 'DELETE',
    headers: {
      apikey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      Authorization: `Bearer ${requireEnv('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
  });
}

/** A fresh user with an app.staff_members row for `role`. */
export async function seedStaffUser(db: Db, role: StaffRole): Promise<StaffFixtureUser> {
  const email = `e2e-staff-${role}-${Date.now()}-${randomUUID().slice(0, 8)}@wariba-test.invalid`;
  const userId = await createTestUser(email);
  await db.insertInto('app.staff_members').values({ user_id: userId, role }).execute();
  return { userId, email, role };
}

/** A fresh user with no app.staff_members row — a plain trader. */
export async function seedTraderUser(): Promise<StaffFixtureUser> {
  const email = `e2e-trader-${Date.now()}-${randomUUID().slice(0, 8)}@wariba-test.invalid`;
  const userId = await createTestUser(email);
  return { userId, email, role: null };
}
