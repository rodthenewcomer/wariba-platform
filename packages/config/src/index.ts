import { z, type ZodTypeAny } from 'zod';

/**
 * Fail-fast configuration loading.
 * WARIBA Engineering Constitution §54 — configuration validée au démarrage ;
 * l'application refuse de démarrer si la configuration critique est invalide.
 * §20.5 / System Architecture §112 — un provider sandbox détecté en production doit
 * provoquer un refus de démarrage (voir assertNotSandboxInProduction).
 */

export class ConfigValidationError extends Error {
  constructor(
    public readonly issues: string[],
    message = 'Configuration invalide au démarrage.',
  ) {
    super(`${message}\n${issues.map((i) => `  - ${i}`).join('\n')}`);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Parses `source` (defaults to process.env) against `schema`.
 * Throws ConfigValidationError — callers must let this crash the process at boot,
 * never swallow it and fall back to a guessed value.
 */
export function loadConfig<Schema extends ZodTypeAny>(
  schema: Schema,
  source: Record<string, string | undefined> = process.env,
): z.infer<Schema> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    throw new ConfigValidationError(issues);
  }
  return result.data;
}

export type Environment = 'local' | 'preview' | 'staging' | 'production';

const environmentSchema = z.enum(['local', 'preview', 'staging', 'production']);

export interface SandboxAssertionInput {
  environment: Environment;
  providerName: string;
  providerValue: string;
}

/**
 * Non-live provider values that must never run in production. Matched as
 * whole tokens (not substrings) so a real provider name that merely contains
 * one of these as a fragment doesn't false-positive.
 * "mock" and "replay" cover the market-data providers added for Prompt 07B —
 * MARKET_DATA_PROVIDER=mock/replay are exactly as unsafe in production as
 * the legacy "sandbox" value (SEC-006).
 */
const NON_PRODUCTION_PROVIDER_TOKENS = new Set(['sandbox', 'mock', 'replay', 'manual']);

/**
 * Splits on any non-alphanumeric run rather than relying on regex `\b`:
 * `\b` treats `_` as a word character, so `/\bsandbox\b/` fails to match
 * "psp_sandbox" or "SANDBOX_PSP" — exactly the snake_case provider-name
 * shapes this check exists to catch.
 */
function containsNonProductionProviderToken(value: string): boolean {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .some((token) => NON_PRODUCTION_PROVIDER_TOKENS.has(token));
}

/**
 * Sandbox/mock/replay providers must fail-fast if ever selected in production.
 * System Architecture §112: "if provider is sandbox → refuse startup".
 */
export function assertNotSandboxInProduction({
  environment,
  providerName,
  providerValue,
}: SandboxAssertionInput): void {
  if (environment === 'production' && containsNonProductionProviderToken(providerValue)) {
    throw new ConfigValidationError([
      `${providerName}="${providerValue}" is a non-production provider and cannot run in production.`,
    ]);
  }
}

/**
 * P09-DEV-SAFETY-001 — the override that lets a local process talk to a
 * remote data plane.
 *
 * Named as a whole sentence and prefixed, because the failure it unlocks is
 * writing to someone's real Supabase project from a laptop. It must be typed
 * out deliberately, never inherited from a stray shell export that happened
 * to look plausible, and never inferred from anything else in the
 * environment.
 */
export const REMOTE_DATA_PLANE_OVERRIDE = 'WARIBA_ALLOW_REMOTE_DATA_PLANE';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0']);

/**
 * Whether an endpoint URL/DSN provably addresses this machine.
 *
 * Unparseable values return false: "we could not prove this is local" and
 * "this is remote" get the same answer, because only one of those is safe to
 * guess at.
 */
export function isLocalEndpoint(value: string): boolean {
  try {
    return LOCAL_HOSTNAMES.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

/** Hostname only — a DSN carries the database password. */
function describeEndpoint(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return 'an unparseable endpoint';
  }
}

export interface LocalDataPlaneAssertionInput {
  environment: Environment;
  /** Endpoint URLs/DSNs keyed by the variable that supplied them. */
  endpoints: Record<string, string | undefined>;
  /**
   * The raw override value, passed in by the caller rather than read from
   * the ambient environment here — a guard that reads its own escape hatch
   * is one import away from being disabled by accident.
   */
  override?: string | undefined;
}

/**
 * P09-DEV-SAFETY-001 — local development refuses a remote data plane.
 *
 * A checkout whose `.env.local` points at the hosted project turns every
 * ordinary `pnpm dev`, seed script and manual click-through into a write
 * against real WARIBA state. The test-gate runner already refuses this for
 * test gates; this extends the same posture to the application processes
 * themselves, so safe-local is the default rather than something each
 * developer has to remember.
 *
 * Only `APP_ENV=local` is guarded. preview, staging and production are
 * *supposed* to reach a remote data plane, so deployment is never blocked by
 * this — and CI, which runs APP_ENV=local against a 127.0.0.1 stack, passes
 * untouched.
 *
 * No value is logged: the message names the variable and the hostname, never
 * the DSN.
 */
export function assertLocalDataPlane({
  environment,
  endpoints,
  override,
}: LocalDataPlaneAssertionInput): void {
  if (environment !== 'local') return;
  // Exactly the string, so an accidental `WARIBA_ALLOW_REMOTE_DATA_PLANE=0`
  // or `=false` keeps the guard on rather than merely being truthy.
  if (override === 'true') return;

  const remote = Object.entries(endpoints)
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .filter(([, value]) => !isLocalEndpoint(value as string))
    .map(([name, value]) => `${name} points at ${describeEndpoint(value as string)}`);
  if (remote.length === 0) return;

  throw new ConfigValidationError(
    remote,
    `APP_ENV=local refuses to start against a remote data plane. ` +
      `Point these at the local Supabase stack, or set ${REMOTE_DATA_PLANE_OVERRIDE}=true ` +
      `to accept writing to a remote project on purpose.`,
  );
}

/**
 * Deliberately NOT named NODE_ENV: Next.js (and Node tooling generally) owns
 * that variable and forces it to 'development' under `next dev` and
 * 'production' under any build/start — never 'local'/'preview'/'staging',
 * and it cannot be overridden via .env files. Carrying WARIBA's own 4-way
 * deploy-target concept through NODE_ENV would make `next dev` fail
 * validation every time, and would make staging/preview silently misreport
 * as 'production' once deployed — dangerous for assertNotSandboxInProduction.
 */
export const baseEnvironmentSchema = z.object({
  APP_ENV: environmentSchema,
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});
