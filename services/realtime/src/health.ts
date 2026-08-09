import type { Db, TradableSymbol } from '@wariba/database';
import type { MarketDataProvider } from '@wariba/adapters';
import type { LeadershipReadiness } from './leadership';
import type { RealtimeMetricsSnapshot } from './metrics';

export interface HealthReport {
  status: 'ok' | 'degraded';
  service: 'realtime';
  timestamp: string;
  process_alive: true;
  database: 'ok' | 'unreachable';
  market: 'ok' | 'unreachable';
  market_feed_connected: boolean;
  leader: boolean;
  standby_ready: boolean;
  safe_to_accept_trading_traffic: boolean;
  instance_id: string;
  fencing_epoch: string | null;
  takeover_count: number;
  last_takeover_duration_ms: number | null;
  operational_metrics: RealtimeMetricsSnapshot;
}

/**
 * §119: DB and market-adapter checks, added alongside the realtime
 * connection itself in Prompt 04.
 */
export async function checkHealth(
  db: Db,
  market: MarketDataProvider,
  sampleSymbol: TradableSymbol,
  leadership: LeadershipReadiness,
  metrics: RealtimeMetricsSnapshot,
  now: () => Date = () => new Date(),
): Promise<HealthReport> {
  let database: HealthReport['database'] = 'ok';
  try {
    await db.selectFrom('app.symbol_specs').select('id').limit(1).execute();
  } catch {
    database = 'unreachable';
  }

  let marketStatus: HealthReport['market'] = 'ok';
  try {
    market.getSnapshot(sampleSymbol);
  } catch {
    marketStatus = 'unreachable';
  }

  return {
    status: database === 'ok' && marketStatus === 'ok' ? 'ok' : 'degraded',
    service: 'realtime',
    timestamp: now().toISOString(),
    process_alive: true,
    database,
    market: marketStatus,
    market_feed_connected: marketStatus === 'ok',
    leader: leadership.leader,
    standby_ready: leadership.standbyReady && database === 'ok' && marketStatus === 'ok',
    safe_to_accept_trading_traffic: leadership.leader && database === 'ok' && marketStatus === 'ok',
    instance_id: leadership.instanceId,
    fencing_epoch: leadership.fencingEpoch,
    takeover_count: leadership.takeoverCount,
    last_takeover_duration_ms: leadership.lastTakeoverDurationMs,
    operational_metrics: metrics,
  };
}
