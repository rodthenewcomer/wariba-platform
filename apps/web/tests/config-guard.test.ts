import { beforeEach, describe, expect, it, vi } from 'vitest';
import { REMOTE_DATA_PLANE_OVERRIDE } from '@wariba/config';

/**
 * P09-DEV-SAFETY-001 — `pnpm dev` must not reach a remote Supabase project.
 *
 * Next.js auto-loads `.env.local`, so a checkout whose env file points at the
 * hosted project turns every local click-through into a write against real
 * WARIBA state. `getDb()` resolves through `loadWebConfig()`, which makes
 * this the single chokepoint for every database access the web app makes.
 *
 * The module caches, so each case re-imports it fresh.
 */
const LOCAL_ENV = {
  APP_ENV: 'local',
  APP_BASE_URL: 'http://127.0.0.1:3000',
  DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  PAYMENT_PROVIDER: 'sandbox',
  SANDBOX_WEBHOOK_SECRET: 'secret',
  NEXT_PUBLIC_REALTIME_WS_URL: 'ws://127.0.0.1:4001/ws',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
} as const;

const REMOTE_DB =
  'postgresql://postgres.abcdefgh:hunter2@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';

async function load(source: Record<string, string | undefined>) {
  vi.resetModules();
  const { loadWebConfig } = await import('../lib/config');
  return loadWebConfig(source);
}

/**
 * `vi.resetModules()` gives each case a fresh module graph, so the
 * ConfigValidationError thrown inside is a different class identity than one
 * imported at the top of this file. Matched on the guard's own wording
 * instead — which also asserts the message stays actionable.
 */
const REFUSAL = /refuses to start against a remote data plane/;

describe('loadWebConfig — local data plane guard', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('accepts a fully local development environment', async () => {
    await expect(load({ ...LOCAL_ENV })).resolves.toMatchObject({ APP_ENV: 'local' });
  });

  it('refuses a hosted database in local development', async () => {
    await expect(load({ ...LOCAL_ENV, DATABASE_URL: REMOTE_DB })).rejects.toThrow(REFUSAL);
  });

  it('refuses a hosted Supabase API in local development', async () => {
    await expect(
      load({ ...LOCAL_ENV, SUPABASE_URL: 'https://abcdefgh.supabase.co' }),
    ).rejects.toThrow(REFUSAL);
  });

  it('never puts the connection string in the error', async () => {
    let message = '';
    try {
      await load({ ...LOCAL_ENV, DATABASE_URL: REMOTE_DB });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('DATABASE_URL');
    expect(message).not.toContain('hunter2');
  });

  it('lets the explicit override through', async () => {
    await expect(
      load({
        ...LOCAL_ENV,
        DATABASE_URL: REMOTE_DB,
        [REMOTE_DATA_PLANE_OVERRIDE]: 'true',
      }),
    ).resolves.toMatchObject({ APP_ENV: 'local' });
  });

  it('does not cache a configuration its guards rejected', async () => {
    vi.resetModules();
    const { loadWebConfig } = await import('../lib/config');
    const remote = { ...LOCAL_ENV, DATABASE_URL: REMOTE_DB };
    expect(() => loadWebConfig(remote)).toThrow(REFUSAL);
    // The second call is every request after the first. If the rejected
    // config had been cached, this would return it happily.
    expect(() => loadWebConfig(remote)).toThrow(REFUSAL);
  });

  it('does not block a deployed environment, which is meant to be remote', async () => {
    await expect(
      load({
        ...LOCAL_ENV,
        APP_ENV: 'staging',
        DATABASE_URL: REMOTE_DB,
        SUPABASE_URL: 'https://abcdefgh.supabase.co',
        NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefgh.supabase.co',
      }),
    ).resolves.toMatchObject({ APP_ENV: 'staging' });
  });
});
