import { describe, expect, it } from 'vitest';
import type { MarketOperationsState } from '@wariba/database';
import {
  buildMarketOpsView,
  LAST_TICK_AGE_UNAVAILABLE_REASON,
  PROBE_UNAVAILABLE_REASON,
  type RealtimeHealthReport,
} from '../src/control-market-ops-view';

const NOW = new Date('2026-08-10T12:00:00.000Z');

function state(overrides: Partial<MarketOperationsState> = {}): MarketOperationsState {
  return {
    leadership: {
      serviceName: 'market-trigger-writer',
      leaderInstanceId: 'realtime-a',
      fencingEpoch: '7',
      leaseExpiresAt: new Date(NOW.getTime() + 4000),
      leaseIsCurrent: true,
      acquiredAt: new Date(NOW.getTime() - 60_000),
      renewedAt: NOW,
      previousLeaderInstanceId: null,
      takeoverCount: 1,
      databaseNow: NOW,
      ...overrides.leadership,
    },
    openAlerts: overrides.openAlerts ?? [],
  };
}

function health(overrides: Partial<RealtimeHealthReport> = {}): RealtimeHealthReport {
  return {
    status: 'ok',
    process_alive: true,
    database: 'ok',
    market: 'ok',
    market_feed_connected: true,
    leader: true,
    standby_ready: true,
    safe_to_accept_trading_traffic: true,
    instance_id: 'realtime-a',
    fencing_epoch: '7',
    takeover_count: 1,
    last_takeover_duration_ms: 3893,
    operational_metrics: {
      connectedClients: 4,
      reconnects: 2,
      acceptedTicks: 100,
      duplicateTicks: 3,
      outOfOrderTicks: 2,
      nonOpenTicks: 1,
    },
    ...overrides,
  };
}

describe('Market Operations view', () => {
  it('reports an active leader from persisted state alone', () => {
    const view = buildMarketOpsView({ state: state(), health: null });
    // Leadership is durable, so it stays exact even with no live probe.
    expect(view.leadership.leaderInstanceId).toBe('realtime-a');
    expect(view.leadership.fencingEpoch).toBe('7');
    expect(view.leadership.leaseIsCurrent).toBe(true);
    expect(view.leadership.takeoverCount).toBe(1);
  });

  it('reports an expired lease as no current leader', () => {
    const view = buildMarketOpsView({
      state: state({
        leadership: {
          ...state().leadership,
          leaderInstanceId: null,
          leaseIsCurrent: false,
          leaseExpiresAt: new Date(0),
        },
      }),
      health: null,
    });
    expect(view.leadership.leaseIsCurrent).toBe(false);
    expect(view.leadership.leaderInstanceId).toBeNull();
  });

  it('reports standby readiness from the live probe', () => {
    const ready = buildMarketOpsView({ state: state(), health: health() });
    expect(ready.ha.standbyReady).toEqual({ available: true, value: true });

    const notReady = buildMarketOpsView({
      state: state(),
      health: health({ standby_ready: false }),
    });
    expect(notReady.ha.standbyReady).toEqual({ available: true, value: false });
  });

  it('never fabricates telemetry when the realtime service is unreachable', () => {
    const view = buildMarketOpsView({ state: state(), health: null });

    // This is the whole point: an unreachable process yields "unknown",
    // never a default that reads as healthy.
    expect(view.process.reachable).toBe(false);
    for (const observation of [
      view.ha.standbyReady,
      view.ha.safeToAcceptTradingTraffic,
      view.feed.connected,
      view.feed.marketReachable,
      view.feed.acceptedTicks,
      view.feed.rejectedTicks,
      view.process.alive,
      view.process.database,
      view.process.overallStatus,
      view.process.reconnects,
      view.leadership.lastTakeoverDurationMs,
    ]) {
      expect(observation.available).toBe(false);
      if (!observation.available) expect(observation.reason).toBe(PROBE_UNAVAILABLE_REASON);
    }
  });

  it('does not turn an empty alert list into a healthy feed', () => {
    // No open MARKET_FEED_STALE incident means exactly that. The alert
    // monitor runs only on the leader and only on an interval, so its
    // silence is not a measurement of the feed.
    const view = buildMarketOpsView({ state: state({ openAlerts: [] }), health: null });
    expect(view.feed.staleSymbols).toEqual([]);
    expect(view.feed.outageSymbols).toEqual([]);
    expect(view.feed.connected.available).toBe(false);
    expect(view.ha.standbyReady.available).toBe(false);
  });

  it('surfaces stale symbols as structured data, not raw JSON', () => {
    const view = buildMarketOpsView({
      state: state({
        openAlerts: [
          {
            incidentCode: 'MARKET_FEED_STALE',
            severity: 'warning',
            evidence: { symbols: ['EURUSD', 'GBPUSD'] },
            openedAt: NOW,
          },
        ],
      }),
      health: health(),
    });
    expect(view.feed.staleSymbols).toEqual(['EURUSD', 'GBPUSD']);
    expect(view.feed.openFeedAlerts[0]?.symbols).toEqual(['EURUSD', 'GBPUSD']);
  });

  it('surfaces outage symbols separately from stale ones', () => {
    const view = buildMarketOpsView({
      state: state({
        openAlerts: [
          {
            incidentCode: 'MARKET_FEED_OUTAGE',
            severity: 'critical',
            evidence: { symbols: ['XAUUSD'] },
            openedAt: NOW,
          },
          {
            incidentCode: 'MARKET_FEED_STALE',
            severity: 'warning',
            evidence: { symbols: ['EURUSD'] },
            openedAt: NOW,
          },
        ],
      }),
      health: health(),
    });
    expect(view.feed.outageSymbols).toEqual(['XAUUSD']);
    expect(view.feed.staleSymbols).toEqual(['EURUSD']);
  });

  it('keeps persisted alert evidence readable even without a live probe', () => {
    const view = buildMarketOpsView({
      state: state({
        openAlerts: [
          {
            incidentCode: 'NO_STANDBY_READY',
            severity: 'warning',
            evidence: { leaderInstanceId: 'realtime-a' },
            openedAt: NOW,
          },
        ],
      }),
      health: null,
    });
    expect(view.ha.openLeadershipAlerts).toHaveLength(1);
    expect(view.ha.openLeadershipAlerts[0]?.detail).toContain('realtime-a');
    // …but readiness itself is still unknown, not "false because alerted".
    expect(view.ha.standbyReady.available).toBe(false);
  });

  it('states plainly that last-valid-tick age has no authoritative source', () => {
    for (const probe of [null, health()]) {
      const view = buildMarketOpsView({ state: state(), health: probe });
      expect(view.feed.lastValidTickAge.available).toBe(false);
      if (!view.feed.lastValidTickAge.available) {
        expect(view.feed.lastValidTickAge.reason).toBe(LAST_TICK_AGE_UNAVAILABLE_REASON);
      }
    }
  });

  it('totals rejected ticks from their three real causes', () => {
    const view = buildMarketOpsView({ state: state(), health: health() });
    expect(view.feed.rejectedTicks).toEqual({ available: true, value: 6 });
    expect(view.feed.rejectedBreakdown).toEqual({
      available: true,
      value: { duplicate: 3, outOfOrder: 2, notOpen: 1 },
    });
    expect(view.feed.acceptedTicks).toEqual({ available: true, value: 100 });
  });

  it('tolerates malformed alert evidence without inventing symbols', () => {
    const view = buildMarketOpsView({
      state: state({
        openAlerts: [
          {
            incidentCode: 'MARKET_FEED_STALE',
            severity: 'warning',
            evidence: { symbols: 'EURUSD' },
            openedAt: NOW,
          },
        ],
      }),
      health: health(),
    });
    // A non-array `symbols` yields nothing rather than a fabricated entry.
    expect(view.feed.staleSymbols).toEqual([]);
  });

  it('carries no credential-shaped field anywhere in the view', () => {
    const view = buildMarketOpsView({ state: state(), health: health() });
    const serialised = JSON.stringify(view);
    for (const secret of ['SERVICE_ROLE', 'apikey', 'Authorization', 'eyJhbGciOi', 'password']) {
      expect(serialised).not.toContain(secret);
    }
  });
});
