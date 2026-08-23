import { test as base, expect } from '@playwright/test';
import {
  seedLifecycleFixture,
  deleteLifecycleFixture,
  seedTradeAccount,
  createFixtureDb,
  createFixtureAccount,
  attachFixtureAccountToUser,
  deleteFixtureAccount,
  E2E_TEST_PASSWORD,
  type TradeAccountFixture,
  type E2eFixtureAccount,
  type LifecycleFixture,
  type LifecycleFixtureState,
} from '@wariba/test-utils';

export type TradeAccount = TradeAccountFixture;

export {
  createFixtureDb,
  createFixtureAccount,
  attachFixtureAccountToUser,
  deleteFixtureAccount,
  E2E_TEST_PASSWORD,
  type E2eFixtureAccount,
};

/**
 * One fresh user + one active WARIBA ONE account per test — every WariX E2E
 * scenario here needs a real, isolated account (open positions/orders from
 * one test must never bleed into another's assertions). Cleanup runs in a
 * `finally` block so failed tests do not leave synthetic users behind.
 */
export const test = base.extend<{ tradeAccount: TradeAccount }>({
  // Playwright's fixture API requires this literal `{}` destructuring shape
  // to statically detect which fixtures a given fixture depends on — this
  // one depends on none.
  // eslint-disable-next-line no-empty-pattern
  tradeAccount: async ({}, use) => {
    const account = await seedTradeAccount({
      databaseUrl: process.env.DATABASE_URL as string,
      supabaseUrl: process.env.SUPABASE_URL as string,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    });
    const db = createFixtureDb();
    try {
      await use(account);
    } finally {
      await deleteFixtureAccount(db, account);
      await db.destroy();
    }
  },
});

/**
 * An account posed in a named lifecycle state.
 *
 * Phase 2 §32. The Hub's composition changes by state — evaluation, review and
 * funded are three different pages — so auditing them means being able to put
 * an account into each on demand rather than waiting for a real trader to get
 * there. Teardown runs in a `finally` so a failed assertion never leaves a
 * synthetic user behind.
 */
export function lifecycleEnv() {
  return {
    databaseUrl: process.env.DATABASE_URL as string,
    supabaseUrl: process.env.SUPABASE_URL as string,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  };
}

export async function withLifecycle<T>(
  state: LifecycleFixtureState,
  run: (fixture: LifecycleFixture) => Promise<T>,
): Promise<T> {
  const env = lifecycleEnv();
  const fixture = await seedLifecycleFixture(env, state);
  try {
    return await run(fixture);
  } finally {
    await deleteLifecycleFixture(env, fixture);
  }
}

export type { LifecycleFixture, LifecycleFixtureState };
export { expect };
