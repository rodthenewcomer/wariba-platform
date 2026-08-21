import { z } from 'zod';
import { hostname } from 'node:os';
import {
  baseEnvironmentSchema,
  loadConfig,
  assertNotSandboxInProduction,
  assertLocalDataPlane,
  REMOTE_DATA_PLANE_OVERRIDE,
} from '@wariba/config';

const realtimeEnvSchema = baseEnvironmentSchema.extend({
  REALTIME_PORT: z.coerce.number().int().positive().default(4001),
  INSTANCE_ID: z.string().min(1),
  LEADER_LEASE_DURATION_MS: z.coerce.number().int().min(1000).default(4000),
  LEADER_RENEW_INTERVAL_MS: z.coerce.number().int().min(250).default(1000),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  // Prompt 07B — mock/replay never touch the network; fcs requires a real
  // FCS_API_KEY (FcsMarketDataProvider fails fast at construction otherwise).
  MARKET_DATA_PROVIDER: z.enum(['mock', 'replay', 'fcs']).default('mock'),
  // Safety override: forces replay behavior regardless of MARKET_DATA_PROVIDER
  // — e.g. a MARKET_DATA_PROVIDER=fcs config can be staged/reviewed without
  // ever risking a live connection until this is explicitly turned off.
  MARKET_DATA_REPLAY_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  MARKET_DATA_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  FCS_API_KEY: z.string().default(''),
  FCS_WS_PRIMARY_URL: z.string().default(''),
  FCS_WS_SECONDARY_URL: z.string().default(''),
  FCS_REST_BASE_URL: z.string().default(''),
  // JSON map of internal WARIBA symbol -> provider ticker, e.g. {"EURUSD":"EUR/USD"}.
  FCS_SYMBOL_MAP: z.string().default(''),
  // WX3 — the historical bar archive. Independent of MARKET_DATA_PROVIDER on
  // purpose: WX3 changes where candles come from, not where ticks come from,
  // and moving both at once would make the historical/realtime seam
  // unmeasurable. 'none' keeps the WX2 behaviour exactly.
  MARKET_HISTORY_PROVIDER: z.enum(['none', 'twelve-data', 'oanda']).default('none'),
  TWELVE_DATA_API_KEY: z.string().default(''),
  TWELVE_DATA_BASE_URL: z.string().default('https://api.twelvedata.com'),
  // `EURUSD=EUR/USD,GBPUSD=GBP/USD`. Only symbols the active plan genuinely
  // covers; an unmapped symbol is reported unsupported, never substituted.
  TWELVE_DATA_SYMBOL_MAP: z.string().default(''),
  OANDA_API_TOKEN: z.string().default(''),
  OANDA_BASE_URL: z.string().default('https://api-fxpractice.oanda.com'),
  OANDA_ENVIRONMENT: z.enum(['practice', 'live']).default('practice'),
  // `EURUSD=EUR_USD,XAUUSD=XAU_USD,NAS100=NAS100_USD`.
  OANDA_SYMBOL_MAP: z.string().default(''),
  // Provider requests permitted per window. The default is sized for a Twelve
  // Data Basic key (8 credits/minute) with headroom for the realtime process's
  // other traffic.
  MARKET_HISTORY_RATE_LIMIT: z.coerce.number().int().positive().default(6),
  MARKET_HISTORY_RATE_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  // WX3 §12 — whether live ticks may be appended to provider history.
  // 'verified' compares the live mid against the newest provider close and
  // refuses when they describe different markets, which is what stops a
  // sandbox walk being drawn onto a genuine series.
  MARKET_HISTORY_CUTOVER: z.enum(['never', 'verified', 'always']).default('verified'),
  MARKET_HISTORY_CUTOVER_TOLERANCE_BPS: z.coerce.number().int().positive().default(50),
  // DATA-001/002: fixed default so a fresh checkout reproduces the same
  // sandbox price sequence — override per-environment if ever needed.
  SANDBOX_MARKET_SEED: z.coerce.number().int().default(20260804),
  MARKET_TICK_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  // Prompt 07 — how often subscribed accounts with open positions get a
  // fresh live-priced equity/risk push (see websocket.ts's risk preview
  // loop). Configurable mainly so e2e tests don't have to wait 4s per case.
  ACCOUNT_RISK_PREVIEW_INTERVAL_MS: z.coerce.number().int().positive().default(4000),
  OPERATIONAL_ALERT_INTERVAL_MS: z.coerce.number().int().positive().default(30000),
  LEADER_TAKEOVER_TARGET_MS: z.coerce.number().int().positive().default(10000),
});

export type RealtimeConfig = z.infer<typeof realtimeEnvSchema>;

let cached: RealtimeConfig | undefined;

export function loadRealtimeConfig(
  source: Record<string, string | undefined> = process.env,
): RealtimeConfig {
  if (cached) return cached;

  // Validated into a local first — see loadWebConfig: caching before the
  // guards run would let the second call return a configuration the first
  // call had rejected.
  const config = loadConfig(realtimeEnvSchema, {
    ...source,
    INSTANCE_ID: source.INSTANCE_ID ?? `${hostname()}:${process.pid}`,
  });
  if (config.LEADER_RENEW_INTERVAL_MS >= config.LEADER_LEASE_DURATION_MS) {
    throw new Error('LEADER_RENEW_INTERVAL_MS must be lower than LEADER_LEASE_DURATION_MS.');
  }
  // The realtime service holds the market-mutation leadership lease —
  // running it against a remote project from a laptop would put a second
  // leader on someone else's data plane.
  assertLocalDataPlane({
    environment: config.APP_ENV,
    endpoints: { DATABASE_URL: config.DATABASE_URL, SUPABASE_URL: config.SUPABASE_URL },
    override: source[REMOTE_DATA_PLANE_OVERRIDE],
  });
  assertNotSandboxInProduction({
    environment: config.APP_ENV,
    providerName: 'MARKET_DATA_PROVIDER',
    providerValue: config.MARKET_DATA_PROVIDER,
  });

  cached = config;
  return cached;
}
