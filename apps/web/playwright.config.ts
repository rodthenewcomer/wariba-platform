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
  /*
   * Runs under `playwright.wx3-history.config.ts`, not here.
   *
   * It asserts deep 1D/1W/1M candles from a vendor archive, which requires
   * `MARKET_HISTORY_PROVIDER` set to a real provider — the opposite of the
   * single coherent sandbox market this suite pins below. The two cannot hold
   * in one process, and the spec was written with its own config for that
   * reason. Excluded here so it is run against the environment it needs
   * rather than failing against one it was never meant to see.
   */
  testIgnore: '**/warix-wx3-history.spec.ts',
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
      // A clean production build of the full Web/BFF module graph can exceed
      // three minutes on the constrained local runner. Keep this bounded but
      // above the measured cold-build time; warm and CI builds return sooner.
      timeout: 360_000,
    },
    {
      command: 'pnpm --filter @wariba/realtime start',
      url: REALTIME_HEALTH_URL,
      env: {
        APP_ENV: 'local',
        REALTIME_PORT,
        MARKET_DATA_PROVIDER: 'mock',
        MARKET_DATA_REPLAY_MODE: 'false',
        /*
         * One market, one source.
         *
         * The realtime feed is pinned to the sandbox mock above, but the
         * history provider was left to fall through to whatever a developer
         * happened to have in `.env.local`. With `MARKET_HISTORY_PROVIDER=
         * twelve-data` set there, the suite ran against a vendor archive at
         * EURUSD ~1.166 while the mock fed ~1.085 — a 700 bps gap against a
         * 50 bps tolerance, so the service refused the cutover and every
         * workstation spec saw "Historique disponible · temps réel
         * indisponible": no live tick, therefore no current-price plate, and
         * a whole family of WariX specs failing on a chart that was working
         * correctly.
         *
         * That refusal is the guard doing its job — it exists so a mock feed
         * is never spliced onto real history. The bug was pairing the two.
         * Pinning history to the same sandbox source makes the canonical
         * suite coherent and independent of anyone's local environment.
         *
         * The vendor-archive path is not lost: `warix-wx3-history.spec.ts`
         * proves it, under `playwright.wx3-history.config.ts`, which exists
         * precisely because that spec "only means anything when a real
         * historical provider is configured".
         */
        MARKET_HISTORY_PROVIDER: 'none',
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
