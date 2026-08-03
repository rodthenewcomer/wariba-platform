import { z } from 'zod';
import { baseEnvironmentSchema, loadConfig, assertNotSandboxInProduction } from '@wariba/config';

const realtimeEnvSchema = baseEnvironmentSchema.extend({
  REALTIME_PORT: z.coerce.number().int().positive().default(4001),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  MARKET_DATA_PROVIDER: z.string().min(1).default('sandbox'),
  // DATA-001/002: fixed default so a fresh checkout reproduces the same
  // sandbox price sequence — override per-environment if ever needed.
  SANDBOX_MARKET_SEED: z.coerce.number().int().default(20260804),
  MARKET_TICK_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
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
