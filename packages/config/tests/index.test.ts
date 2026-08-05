import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ConfigValidationError,
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
