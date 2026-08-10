import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ConfigValidationError,
  REMOTE_DATA_PLANE_OVERRIDE,
  assertLocalDataPlane,
  assertNotSandboxInProduction,
  baseEnvironmentSchema,
  loadConfig,
} from '../src/index';

describe('loadConfig', () => {
  it('returns parsed config when the source is valid', () => {
    const config = loadConfig(baseEnvironmentSchema, { APP_ENV: 'local', LOG_LEVEL: 'debug' });
    expect(config).toEqual({ APP_ENV: 'local', LOG_LEVEL: 'debug' });
  });

  it('applies defaults for optional fields', () => {
    const config = loadConfig(baseEnvironmentSchema, { APP_ENV: 'local' });
    expect(config.LOG_LEVEL).toBe('info');
  });

  it('throws ConfigValidationError with readable issues on invalid input', () => {
    expect(() => loadConfig(baseEnvironmentSchema, { APP_ENV: 'not-an-env' })).toThrow(
      ConfigValidationError,
    );
  });

  it('never silently substitutes a default for a required-but-invalid field', () => {
    const schema = z.object({ PORT: z.coerce.number().int().positive() });
    expect(() => loadConfig(schema, { PORT: 'not-a-number' })).toThrow(ConfigValidationError);
  });
});

describe('assertNotSandboxInProduction', () => {
  it('does not throw for sandbox providers outside production', () => {
    expect(() =>
      assertNotSandboxInProduction({
        environment: 'local',
        providerName: 'PAYMENT_PROVIDER',
        providerValue: 'sandbox-psp',
      }),
    ).not.toThrow();
  });

  it('does not throw for real providers in production', () => {
    expect(() =>
      assertNotSandboxInProduction({
        environment: 'production',
        providerName: 'PAYMENT_PROVIDER',
        providerValue: 'real-psp',
      }),
    ).not.toThrow();
  });

  it('throws (fail-fast) for a sandbox provider detected in production', () => {
    expect(() =>
      assertNotSandboxInProduction({
        environment: 'production',
        providerName: 'MARKET_DATA_PROVIDER',
        providerValue: 'sandbox-market-data',
      }),
    ).toThrow(ConfigValidationError);
  });

  it('throws (fail-fast) for a mock market-data provider detected in production', () => {
    expect(() =>
      assertNotSandboxInProduction({
        environment: 'production',
        providerName: 'MARKET_DATA_PROVIDER',
        providerValue: 'mock',
      }),
    ).toThrow(ConfigValidationError);
  });

  it('throws (fail-fast) for a replay market-data provider detected in production', () => {
    expect(() =>
      assertNotSandboxInProduction({
        environment: 'production',
        providerName: 'MARKET_DATA_PROVIDER',
        providerValue: 'replay',
      }),
    ).toThrow(ConfigValidationError);
  });

  it('throws (fail-fast) for a manual payout provider detected in production', () => {
    expect(() =>
      assertNotSandboxInProduction({
        environment: 'production',
        providerName: 'PAYOUT_PROVIDER',
        providerValue: 'manual',
      }),
    ).toThrow(ConfigValidationError);
  });

  it('does not throw for the real fcs provider in production', () => {
    expect(() =>
      assertNotSandboxInProduction({
        environment: 'production',
        providerName: 'MARKET_DATA_PROVIDER',
        providerValue: 'fcs',
      }),
    ).not.toThrow();
  });

  it.each(['psp_sandbox', 'payment_sandbox_v2', 'SANDBOX_PSP', 'mock_market_data', 'replay_feed'])(
    'throws (fail-fast) for the underscore-adjacent non-production provider value %s',
    (providerValue) => {
      expect(() =>
        assertNotSandboxInProduction({
          environment: 'production',
          providerName: 'PAYMENT_PROVIDER',
          providerValue,
        }),
      ).toThrow(ConfigValidationError);
    },
  );
});

describe('assertLocalDataPlane', () => {
  /**
   * Fixture endpoints carry no userinfo.
   *
   * The guard reads only the hostname, so a username:password component
   * would add nothing to these tests while putting a credential-shaped
   * string in the repository for a secret scanner to flag — which is
   * exactly the noise that makes a real finding easy to miss. `.invalid`
   * is reserved by RFC 2606 and can never resolve.
   */
  const LOCAL_DB = 'postgresql://127.0.0.1:54322/postgres';
  const LOCAL_API = 'http://127.0.0.1:54321';
  const REMOTE_DB = 'postgresql://db.example.invalid:6543/postgres';
  const REMOTE_HOST = 'db.example.invalid';
  const REMOTE_API = 'https://api.example.invalid';

  it('allows a local stack in local development', () => {
    expect(() =>
      assertLocalDataPlane({
        environment: 'local',
        endpoints: { DATABASE_URL: LOCAL_DB, SUPABASE_URL: LOCAL_API },
      }),
    ).not.toThrow();
  });

  it.each(['localhost', '127.0.0.1', '0.0.0.0'])('treats %s as local', (host) => {
    expect(() =>
      assertLocalDataPlane({
        environment: 'local',
        endpoints: { SUPABASE_URL: `http://${host}:54321` },
      }),
    ).not.toThrow();
  });

  it('refuses a remote data plane in local development', () => {
    expect(() =>
      assertLocalDataPlane({
        environment: 'local',
        endpoints: { DATABASE_URL: REMOTE_DB, SUPABASE_URL: REMOTE_API },
      }),
    ).toThrow(ConfigValidationError);
  });

  it('reports the variable and the hostname, and nothing else from the URI', () => {
    let message = '';
    try {
      assertLocalDataPlane({ environment: 'local', endpoints: { DATABASE_URL: REMOTE_DB } });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('DATABASE_URL');
    expect(message).toContain(REMOTE_HOST);
    // The hostname alone, never the connection string. A real DSN carries a
    // password in its userinfo, so a guard that echoed the URI would leak
    // the credential into every log line — worse than the mistake it
    // prevents. Asserting the port and path are absent proves only the
    // hostname survives, which is what keeps userinfo out too.
    expect(message).not.toContain(REMOTE_DB);
    expect(message).not.toContain(':6543');
    expect(message).not.toContain('/postgres');
  });

  it('refuses an endpoint it cannot parse rather than assuming it is local', () => {
    expect(() =>
      assertLocalDataPlane({ environment: 'local', endpoints: { DATABASE_URL: 'not-a-url' } }),
    ).toThrow(ConfigValidationError);
  });

  it('ignores endpoints that are absent or blank', () => {
    expect(() =>
      assertLocalDataPlane({
        environment: 'local',
        endpoints: { DATABASE_URL: LOCAL_DB, SUPABASE_URL: undefined, OTHER: '   ' },
      }),
    ).not.toThrow();
  });

  it('lets the explicit override through, and only the exact value', () => {
    const remote = { environment: 'local' as const, endpoints: { DATABASE_URL: REMOTE_DB } };
    expect(() => assertLocalDataPlane({ ...remote, override: 'true' })).not.toThrow();
    // Anything merely truthy keeps the guard on — the override must be typed
    // out deliberately, never half-remembered.
    for (const value of ['1', 'yes', 'TRUE', 'true ', '']) {
      expect(() => assertLocalDataPlane({ ...remote, override: value })).toThrow(
        ConfigValidationError,
      );
    }
  });

  it.each(['preview', 'staging', 'production'] as const)(
    'never blocks a deployed %s environment, which is meant to be remote',
    (environment) => {
      expect(() =>
        assertLocalDataPlane({
          environment,
          endpoints: { DATABASE_URL: REMOTE_DB, SUPABASE_URL: REMOTE_API },
        }),
      ).not.toThrow();
    },
  );

  it('exports the override name so callers cannot drift from it', () => {
    expect(REMOTE_DATA_PLANE_OVERRIDE).toBe('WARIBA_ALLOW_REMOTE_DATA_PLANE');
  });
});
