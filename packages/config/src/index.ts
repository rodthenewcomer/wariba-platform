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
 * Sandbox providers must fail-fast if ever selected in production.
 * System Architecture §112: "if provider is sandbox → refuse startup".
 */
export function assertNotSandboxInProduction({
  environment,
  providerName,
  providerValue,
}: SandboxAssertionInput): void {
  if (environment === 'production' && /sandbox/i.test(providerValue)) {
    throw new ConfigValidationError([
      `${providerName}="${providerValue}" is a sandbox provider and cannot run in production.`,
    ]);
  }
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
