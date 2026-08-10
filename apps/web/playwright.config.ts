import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000';
const REALTIME_WS_URL = process.env.NEXT_PUBLIC_REALTIME_WS_URL ?? 'ws://127.0.0.1:4001/ws';
const REALTIME_HEALTH_URL = `${REALTIME_WS_URL.replace(/^ws(s?):/, 'http$1:').replace(/\/ws$/, '')}/health`;
const REALTIME_PORT = new URL(REALTIME_WS_URL).port || '4001';
const WEB_SERVER_COMMAND = process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? 'pnpm build && pnpm start';

/**
 * globalSetup creates one real activated WARIBA ONE account, signs in
 * through the actual /login form (not a synthesized cookie), and saves the
 * resulting session for hub.spec.ts to reuse — trade.spec.ts manages its
 * own account per-test via the `tradeAccount` fixture instead and ignores
 * this session. The two webServer entries make CI self-contained: WariX
 * requires both Next.js and the realtime WebSocket process. Each entry is
 * still safe alongside a manually-managed dev stack because
 * reuseExistingServer only starts a missing process.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  // Generous: the isolated Supabase stack + pg.Pool round trips for a single
  // order can take several seconds under CI contention, and Close
  // All/reconnection tests stack several such round trips in one test.
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // One isolated Supabase DB + a single sandbox market feed shared across
  // every test, plus one shared global-setup fixture user — concurrent
  // workers would race/contend. Small suite; serial is the safe default.
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: WEB_SERVER_COMMAND,
      url: BASE_URL,
      env: {
        APP_ENV: 'local',
        NEXT_PUBLIC_REALTIME_WS_URL: REALTIME_WS_URL,
        NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL ?? '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? '',
      },
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'pnpm --filter @wariba/realtime start',
      url: REALTIME_HEALTH_URL,
      env: {
        APP_ENV: 'local',
        REALTIME_PORT,
        MARKET_DATA_PROVIDER: 'mock',
        MARKET_DATA_REPLAY_MODE: 'false',
      },
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
  /*
   * Two projects, partitioned by the @mobile tag so nothing runs twice:
   * `desktop` takes everything except @mobile, `mobile` takes exactly
   * @mobile on a real device profile (touch, mobile user agent, device
   * scale factor) rather than a desktop browser that has merely been
   * resized. Individual specs still narrow the viewport further — notably
   * the 320px minimum-supported-width test — which is the point: the
   * device profile supplies the mobile *platform*, the spec supplies the
   * exact width under test.
   */
  projects: [
    {
      name: 'desktop',
      grepInvert: /@mobile/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      grep: /@mobile/,
      use: { ...devices['Pixel 7'] },
    },
  ],
});
