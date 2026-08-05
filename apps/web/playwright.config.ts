import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000';

/**
 * globalSetup creates one real activated WARIBA ONE account, signs in
 * through the actual /login form (not a synthesized cookie), and saves the
 * resulting session for hub.spec.ts to reuse — trade.spec.ts manages its
 * own account per-test via the `tradeAccount` fixture instead and ignores
 * this session. reuseExistingServer means webServer is safe alongside a
 * manually-managed dev stack (the convention scripts/visual-verify.mjs and
 * most of this branch's manual verification used): it only starts its own
 * `pnpm dev` if nothing is already listening at BASE_URL.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  // Generous: real hosted Supabase + pg.Pool round trips for a single order
  // routinely take 10-20s in this environment, and Close All/reconnection
  // tests stack several such round trips in one test.
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // Real Supabase-hosted DB + a single sandbox market feed shared across
  // every test, plus one shared global-setup fixture user — concurrent
  // workers would race/contend. Small suite; serial is the safe default.
  workers: 1,
  retries: 0,
  reporter: 'list',
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60000,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
