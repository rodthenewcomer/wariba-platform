import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.APP_BASE_URL ?? 'http://localhost:3000';
const realtimeWsUrl = process.env.NEXT_PUBLIC_REALTIME_WS_URL ?? 'ws://127.0.0.1:4001/ws';
const realtimeHealthUrl = `${realtimeWsUrl.replace(/^ws(s?):/, 'http$1:').replace(/\/ws$/, '')}/health`;

/**
 * WARIBA Product OS Phase 1 and 1.1 — auth, Hub shell and system states.
 *
 * A separate config from the main suite because these tests exist to produce
 * review evidence at real viewports as much as to assert behaviour, and they
 * need the two viewport projects below rather than the shared device matrix.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /wariba-product-os-phase1.*\.spec\.ts/,
  timeout: 420_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? 'pnpm build && pnpm start',
      url: baseURL,
      reuseExistingServer: true,
      timeout: 300_000,
    },
    {
      command: 'pnpm --filter @wariba/realtime start',
      url: realtimeHealthUrl,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
  projects: [
    {
      name: 'desktop',
      grepInvert: /@mobile/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      grep: /@mobile/,
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
});
