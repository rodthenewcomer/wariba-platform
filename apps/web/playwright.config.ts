import { defineConfig, devices } from '@playwright/test';

/**
 * Requires the dev stack already running on :3000 (web) and :4000
 * (realtime) — same convention as scripts/visual-verify.mjs. No webServer
 * block here on purpose: every other verification this branch was built
 * against managed the stack manually (start, health-check, run, stop), and
 * mixing that with Playwright's own server lifecycle would fight it.
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Generous: real hosted Supabase + pg.Pool round trips for a single order
  // routinely take 10-20s in this environment (confirmed repeatedly across
  // this branch's manual verification), and Close All/reconnection tests
  // stack several such round trips in one test.
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // Real Supabase-hosted DB + a single sandbox market feed shared across
  // every test — concurrent workers would contend for the same pg.Pool
  // (default max 10) this environment already runs close to under load.
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
