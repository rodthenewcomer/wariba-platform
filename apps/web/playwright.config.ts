import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000';

/**
 * Prompt 06 — first Playwright config in this repo. globalSetup creates one
 * real activated WARIBA ONE account, signs in through the actual /login
 * form (not a synthesized cookie), and saves the resulting session for
 * every spec to reuse. globalTeardown deletes the fixture afterward.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  // All specs share one global-setup fixture user — desktop/mobile projects
  // running concurrently would race on it (both attaching their own second
  // account to the same shared user). Small suite; serial is the safe default.
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 30000,
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
