import { test as base, expect } from '@playwright/test';
import {
  seedTradeAccount,
  createFixtureDb,
  createFixtureAccount,
  attachFixtureAccountToUser,
  deleteFixtureAccount,
  E2E_TEST_PASSWORD,
  type TradeAccountFixture,
  type E2eFixtureAccount,
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

export { expect };
