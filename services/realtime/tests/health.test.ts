import { describe, expect, it } from 'vitest';
import type { Db } from '@wariba/database';
import type { SandboxMarketDataProvider } from '@wariba/adapters';
import { checkHealth } from '../src/health';

function fakeDb(execute: () => Promise<unknown[]>): Db {
  return {
    selectFrom: () => ({
      select: () => ({
        limit: () => ({ execute }),
      }),
    }),
  } as unknown as Db;
}

function fakeMarket(getSnapshot: () => unknown): SandboxMarketDataProvider {
  return { getSnapshot } as unknown as SandboxMarketDataProvider;
}

describe('realtime checkHealth', () => {
  it('reports ok when the DB and market are both reachable', async () => {
    const db = fakeDb(async () => []);
    const market = fakeMarket(() => ({ symbol: 'EURUSD' }));

    const report = await checkHealth(
      db,
      market,
      'EURUSD',
      () => new Date('2026-08-04T00:00:00.000Z'),
    );

    expect(report).toEqual({
      status: 'ok',
      service: 'realtime',
      timestamp: '2026-08-04T00:00:00.000Z',
      database: 'ok',
      market: 'ok',
    });
  });

  it('reports degraded when the database query throws', async () => {
    const db = fakeDb(async () => {
      throw new Error('connection refused');
    });
    const market = fakeMarket(() => ({ symbol: 'EURUSD' }));

    const report = await checkHealth(db, market, 'EURUSD');

    expect(report.status).toBe('degraded');
    expect(report.database).toBe('unreachable');
    expect(report.market).toBe('ok');
  });

  it('reports degraded when the market simulator has no snapshot for the symbol', async () => {
    const db = fakeDb(async () => []);
    const market = fakeMarket(() => {
      throw new Error('Unknown symbol');
    });

    const report = await checkHealth(db, market, 'EURUSD');

    expect(report.status).toBe('degraded');
    expect(report.market).toBe('unreachable');
  });
});
