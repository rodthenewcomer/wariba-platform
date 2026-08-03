import { z } from 'zod';
import { baseEnvironmentSchema, loadConfig, assertNotSandboxInProduction } from '@wariba/config';

const webEnvSchema = baseEnvironmentSchema.extend({
  WEB_PORT: z.coerce.number().int().positive().default(3000),
  APP_BASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  PAYMENT_PROVIDER: z.string().min(1),
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

let cached: WebConfig | undefined;

/**
 * Fail-fast at first use, not at import time — importing this module in a
 * test file shouldn't require a full production-shaped environment.
 * Cached after first successful load so repeated calls within one process
 * don't re-validate on every request.
 */
export function loadWebConfig(source: Record<string, string | undefined> = process.env): WebConfig {
  if (!cached) {
    cached = loadConfig(webEnvSchema, source);
    assertNotSandboxInProduction({
      environment: cached.APP_ENV,
      providerName: 'PAYMENT_PROVIDER',
      providerValue: cached.PAYMENT_PROVIDER,
    });
  }
  return cached;
}
