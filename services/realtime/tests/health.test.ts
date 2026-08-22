import { describe, expect, it } from 'vitest';
import type { Db } from '@wariba/database';
import type { MarketDataProvider } from '@wariba/adapters';
import { checkHealth } from '../src/health';
import type { LeadershipReadiness } from '../src/leadership';
import type { RealtimeMetricsSnapshot } from '../src/metrics';

const LEADER: LeadershipReadiness = {
  instanceId: 'realtime-a',
  role: 'leader',
  leader: true,
  standbyReady: false,
  safeToAcceptTradingTraffic: true,
  fencingEpoch: '7',
  leaseExpiresAt: '2026-08-04T00:00:04.000Z',
  takeoverCount: 1,
  lastTakeoverDurationMs: 1200,
};

const METRICS: RealtimeMetricsSnapshot = {
  connectedClients: 0,
  connectionsTotal: 0,
  reconnects: 0,
  acceptedTicks: 0,
  duplicateTicks: 0,
  outOfOrderTicks: 0,
  nonOpenTicks: 0,
  commandsReceived: 0,
  commandsRejected: 0,
  fills: 0,
  pendingTriggers: 0,
  pendingTriggerFailures: 0,
  protectionTriggers: 0,
  alertNotifications: 0,
  queuedReductions: 0,
  historyReads: 0,
  historyReadFailures: 0,
  historyBarsReturned: 0,
  historyCacheHits: 0,
  historyCacheMisses: 0,
  historyGapsDetected: 0,
  historyFlushBars: 0,
  historyFlushFailures: 0,
  historyLatencyMs: { p50: 0, p95: 0, p99: 0 },
  commandLatencyMs: { p50: 0, p95: 0, p99: 0 },
};

function fakeDb(execute: () => Promise<unknown[]>): Db {
  return {
    selectFrom: () => ({
      select: () => ({
        limit: () => ({ execute }),
      }),
    }),
  } as unknown as Db;
}

function fakeMarket(getSnapshot: () => unknown): MarketDataProvider {
  return { getSnapshot } as unknown as MarketDataProvider;
}

describe('realtime checkHealth', () => {
  it('reports ok when the DB and market are both reachable', async () => {
    const db = fakeDb(async () => []);
    const market = fakeMarket(() => ({ symbol: 'EURUSD' }));

    const report = await checkHealth(
      db,
      market,
      'EURUSD',
      LEADER,
      METRICS,
      () => new Date('2026-08-04T00:00:00.000Z'),
    );

    expect(report).toEqual({
      status: 'ok',
      service: 'realtime',
      timestamp: '2026-08-04T00:00:00.000Z',
      process_alive: true,
      database: 'ok',
      market: 'ok',
      market_feed_connected: true,
      leader: true,
      standby_ready: false,
      safe_to_accept_trading_traffic: true,
      instance_id: 'realtime-a',
      fencing_epoch: '7',
      takeover_count: 1,
      last_takeover_duration_ms: 1200,
      operational_metrics: METRICS,
    });
  });

  it('reports degraded when the database query throws', async () => {
    const db = fakeDb(async () => {
      throw new Error('connection refused');
    });
    const market = fakeMarket(() => ({ symbol: 'EURUSD' }));

    const report = await checkHealth(db, market, 'EURUSD', LEADER, METRICS);

    expect(report.status).toBe('degraded');
    expect(report.database).toBe('unreachable');
    expect(report.market).toBe('ok');
  });

  it('reports degraded when the market simulator has no snapshot for the symbol', async () => {
    const db = fakeDb(async () => []);
    const market = fakeMarket(() => {
      throw new Error('Unknown symbol');
    });

    const report = await checkHealth(db, market, 'EURUSD', LEADER, METRICS);

    expect(report.status).toBe('degraded');
    expect(report.market).toBe('unreachable');
  });
});
