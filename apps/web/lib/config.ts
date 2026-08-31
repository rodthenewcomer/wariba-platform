import { z } from 'zod';
import {
  baseEnvironmentSchema,
  loadConfig,
  assertNotSandboxInProduction,
  assertLocalDataPlane,
  REMOTE_DATA_PLANE_OVERRIDE,
} from '@wariba/config';

const webEnvSchema = baseEnvironmentSchema.extend({
  WEB_PORT: z.coerce.number().int().positive().default(3000),
  APP_BASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  PAYMENT_PROVIDER: z.string().min(1),
  PAYOUT_PROVIDER: z.enum(['mock', 'manual']).default('manual'),
  SANDBOX_WEBHOOK_SECRET: z.string().min(1),
  // Read by client components as literal `process.env.NEXT_PUBLIC_...`
  // references (Next.js only inlines NEXT_PUBLIC_ vars into the browser
  // bundle for statically-analyzable literal references, never through a
  // config object) — validated here too so the server still fails fast if
  // one is missing. The anon key is designed to be public (RLS enforces
  // the real boundary) — this is not a secret duplicated unsafely.
  NEXT_PUBLIC_REALTIME_WS_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type WebConfig = z.infer<typeof webEnvSchema>;

/** Explicit local test capability. It never alters persisted public gates. */
export function isLocalSandboxCommerce(config: WebConfig): boolean {
  return config.APP_ENV === 'local' && config.PAYMENT_PROVIDER === 'sandbox';
}

let cached: WebConfig | undefined;

/**
 * Fail-fast at first use, not at import time — importing this module in a
 * test file shouldn't require a full production-shaped environment.
 * Cached after first successful load so repeated calls within one process
 * don't re-validate on every request.
 */
export function loadWebConfig(source: Record<string, string | undefined> = process.env): WebConfig {
  if (cached) return cached;

  // Validated into a local first: assigning `cached` before the guards run
  // would mean a rejected configuration was still cached, and the *second*
  // call — every request after the first — would sail through with exactly
  // the configuration the guards had refused.
  const config = loadConfig(webEnvSchema, source);
  // getDb() resolves through here, so no web request can reach a remote
  // database in local development without the explicit override.
  assertLocalDataPlane({
    environment: config.APP_ENV,
    endpoints: {
      DATABASE_URL: config.DATABASE_URL,
      SUPABASE_URL: config.SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: config.NEXT_PUBLIC_SUPABASE_URL,
    },
    override: source[REMOTE_DATA_PLANE_OVERRIDE],
  });
  assertNotSandboxInProduction({
    environment: config.APP_ENV,
    providerName: 'PAYMENT_PROVIDER',
    providerValue: config.PAYMENT_PROVIDER,
  });
  assertNotSandboxInProduction({
    environment: config.APP_ENV,
    providerName: 'PAYOUT_PROVIDER',
    providerValue: config.PAYOUT_PROVIDER,
  });

  cached = config;
  return cached;
}
