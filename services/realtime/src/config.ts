import { z } from 'zod';
import { baseEnvironmentSchema, loadConfig, assertNotSandboxInProduction } from '@wariba/config';

const realtimeEnvSchema = baseEnvironmentSchema.extend({
  REALTIME_PORT: z.coerce.number().int().positive().default(4001),
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
  // DATA-001/002: fixed default so a fresh checkout reproduces the same
  // sandbox price sequence — override per-environment if ever needed.
  SANDBOX_MARKET_SEED: z.coerce.number().int().default(20260804),
  MARKET_TICK_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  // Prompt 07 — how often subscribed accounts with open positions get a
  // fresh live-priced equity/risk push (see websocket.ts's risk preview
  // loop). Configurable mainly so e2e tests don't have to wait 4s per case.
  ACCOUNT_RISK_PREVIEW_INTERVAL_MS: z.coerce.number().int().positive().default(4000),
});

export type RealtimeConfig = z.infer<typeof realtimeEnvSchema>;

let cached: RealtimeConfig | undefined;

export function loadRealtimeConfig(
  source: Record<string, string | undefined> = process.env,
): RealtimeConfig {
  if (!cached) {
    cached = loadConfig(realtimeEnvSchema, source);
    assertNotSandboxInProduction({
      environment: cached.APP_ENV,
      providerName: 'MARKET_DATA_PROVIDER',
      providerValue: cached.MARKET_DATA_PROVIDER,
    });
  }
  return cached;
}
