import type { MarketOperationsState } from '@wariba/database';

/**
 * Prompt 09 — assembles the Market Operations view from the sources that
 * actually know each fact, and refuses to invent the rest.
 *
 * There are two authoritative sources and one gap:
 *
 * 1. Persisted state (`app.realtime_leadership`, `app.operations_incidents`)
 *    — durable and always readable. Leadership, and the feed/HA alerts the
 *    leader itself wrote, including the symbol lists in their evidence.
 * 2. The realtime service's own `/health`, the report certified in Appendix
 *    08-A. Process, database and feed reachability, standby readiness,
 *    takeover duration and the tick counters live only in that process, so
 *    this is the one place they can be read from. It is a live probe: when
 *    it cannot be reached, the fields it owns are *unavailable*, not
 *    healthy.
 * 3. Last-valid-tick age has no authoritative source at all — see
 *    LAST_TICK_AGE_UNAVAILABLE_REASON.
 *
 * The distinction this module exists to enforce: **the absence of an alert
 * is not evidence of health.** "No open MARKET_FEED_STALE incident" means
 * exactly that; it does not mean the feed is fresh, because the alert
 * monitor only runs on the leader and only every interval. So a healthy
 * reading is reported only when a live source says so, and otherwise the
 * operator is told the truth: unknown.
 */
export interface RealtimeMetricsReport {
  connectedClients: number;
  reconnects: number;
  acceptedTicks: number;
  duplicateTicks: number;
  outOfOrderTicks: number;
  nonOpenTicks: number;
}

export interface RealtimeHealthReport {
  status: 'ok' | 'degraded';
  process_alive: boolean;
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
  operational_metrics: RealtimeMetricsReport;
}

/** A datum either has an authoritative reading, or an honest reason it does not. */
export type Observed<T> = { available: true; value: T } | { available: false; reason: string };

export function observed<T>(value: T): Observed<T> {
  return { available: true, value };
}

export function unavailable<T>(reason: string): Observed<T> {
  return { available: false, reason };
}

export const PROBE_UNAVAILABLE_REASON =
  'Le service realtime n’a pas répondu — état non persisté, donc inconnu.';

export const LAST_TICK_AGE_UNAVAILABLE_REASON =
  'Aucune source autoritative : l’âge du dernier tick valide n’est ni persisté ni exposé par /health.';

export interface MarketOpsView {
  leadership: {
    leaderInstanceId: string | null;
    fencingEpoch: string;
    leaseIsCurrent: boolean;
    leaseExpiresAt: Date;
    acquiredAt: Date | null;
    renewedAt: Date | null;
    previousLeaderInstanceId: string | null;
    takeoverCount: number;
    /** Process-local on the leader; only /health knows it. */
    lastTakeoverDurationMs: Observed<number | null>;
  };
  ha: {
    standbyReady: Observed<boolean>;
    safeToAcceptTradingTraffic: Observed<boolean>;
    /** Persisted, therefore always readable. */
    openLeadershipAlerts: readonly OperationalAlertView[];
  };
  feed: {
    connected: Observed<boolean>;
    marketReachable: Observed<boolean>;
    staleSymbols: readonly string[];
    outageSymbols: readonly string[];
    lastValidTickAge: Observed<number>;
    acceptedTicks: Observed<number>;
    rejectedTicks: Observed<number>;
    rejectedBreakdown: Observed<{ duplicate: number; outOfOrder: number; notOpen: number }>;
    openFeedAlerts: readonly OperationalAlertView[];
  };
  process: {
    reachable: boolean;
    instanceId: Observed<string>;
    alive: Observed<boolean>;
    database: Observed<'ok' | 'unreachable'>;
    overallStatus: Observed<'ok' | 'degraded'>;
    connectedClients: Observed<number>;
    reconnects: Observed<number>;
  };
}

export interface OperationalAlertView {
  incidentCode: string;
  severity: string;
  openedAt: Date;
  /** Structured where the evidence carries it, so no operator reads raw JSON. */
  symbols: readonly string[];
  detail: string;
}

const FEED_ALERT_CODES = new Set(['MARKET_FEED_STALE', 'MARKET_FEED_OUTAGE']);
const LEADERSHIP_ALERT_CODES = new Set(['LEADER_LOST', 'LEADER_TAKEOVER_SLOW', 'NO_STANDBY_READY']);

/** Pulls the `symbols` array out of alert evidence without trusting its shape. */
function alertSymbols(evidence: unknown): readonly string[] {
  if (typeof evidence !== 'object' || evidence === null) return [];
  const symbols = (evidence as { symbols?: unknown }).symbols;
  if (!Array.isArray(symbols)) return [];
  return symbols.filter((symbol): symbol is string => typeof symbol === 'string');
}

function alertDetail(evidence: unknown): string {
  if (evidence === null || evidence === undefined) return '';
  if (typeof evidence === 'string') return evidence;
  const record = evidence as Record<string, unknown>;
  return Object.entries(record)
    .filter(([key]) => key !== 'symbols')
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(' · ');
}

function toAlertView(alert: MarketOperationsState['openAlerts'][number]): OperationalAlertView {
  return {
    incidentCode: alert.incidentCode,
    severity: alert.severity,
    openedAt: alert.openedAt,
    symbols: alertSymbols(alert.evidence),
    detail: alertDetail(alert.evidence),
  };
}

export function buildMarketOpsView(params: {
  state: MarketOperationsState;
  /** Null when the realtime service could not be reached. */
  health: RealtimeHealthReport | null;
}): MarketOpsView {
  const { state, health } = params;
  const reachable = health !== null;
  const probe = <T>(value: T): Observed<T> =>
    reachable ? observed(value) : unavailable<T>(PROBE_UNAVAILABLE_REASON);

  const feedAlerts = state.openAlerts.filter((alert) => FEED_ALERT_CODES.has(alert.incidentCode));
  const leadershipAlerts = state.openAlerts.filter((alert) =>
    LEADERSHIP_ALERT_CODES.has(alert.incidentCode),
  );

  // Symbol lists come from persisted alert evidence, so they remain
  // authoritative even when the live probe fails.
  const staleSymbols = feedAlerts
    .filter((alert) => alert.incidentCode === 'MARKET_FEED_STALE')
    .flatMap((alert) => alertSymbols(alert.evidence));
  const outageSymbols = feedAlerts
    .filter((alert) => alert.incidentCode === 'MARKET_FEED_OUTAGE')
    .flatMap((alert) => alertSymbols(alert.evidence));

  const metrics = health?.operational_metrics;
  const rejected = metrics
    ? metrics.duplicateTicks + metrics.outOfOrderTicks + metrics.nonOpenTicks
    : 0;

  return {
    leadership: {
      leaderInstanceId: state.leadership.leaderInstanceId,
      fencingEpoch: state.leadership.fencingEpoch,
      leaseIsCurrent: state.leadership.leaseIsCurrent,
      leaseExpiresAt: state.leadership.leaseExpiresAt,
      acquiredAt: state.leadership.acquiredAt,
      renewedAt: state.leadership.renewedAt,
      previousLeaderInstanceId: state.leadership.previousLeaderInstanceId,
      takeoverCount: state.leadership.takeoverCount,
      lastTakeoverDurationMs: probe(health?.last_takeover_duration_ms ?? null),
    },
    ha: {
      // Never inferred from the absence of a NO_STANDBY_READY alert: that
      // alert is written by the leader on an interval, so its absence is
      // not a statement about the standby.
      standbyReady: probe(health?.standby_ready ?? false),
      safeToAcceptTradingTraffic: probe(health?.safe_to_accept_trading_traffic ?? false),
      openLeadershipAlerts: leadershipAlerts.map(toAlertView),
    },
    feed: {
      connected: probe(health?.market_feed_connected ?? false),
      marketReachable: probe(health?.market === 'ok'),
      staleSymbols,
      outageSymbols,
      // No source at all — stated as such rather than guessed from tick counts.
      lastValidTickAge: unavailable<number>(LAST_TICK_AGE_UNAVAILABLE_REASON),
      acceptedTicks: probe(metrics?.acceptedTicks ?? 0),
      rejectedTicks: probe(rejected),
      rejectedBreakdown: probe({
        duplicate: metrics?.duplicateTicks ?? 0,
        outOfOrder: metrics?.outOfOrderTicks ?? 0,
        notOpen: metrics?.nonOpenTicks ?? 0,
      }),
      openFeedAlerts: feedAlerts.map(toAlertView),
    },
    process: {
      reachable,
      instanceId: probe(health?.instance_id ?? ''),
      alive: probe(health?.process_alive ?? false),
      database: probe(health?.database ?? 'unreachable'),
      overallStatus: probe(health?.status ?? 'degraded'),
      connectedClients: probe(metrics?.connectedClients ?? 0),
      reconnects: probe(metrics?.reconnects ?? 0),
    },
  };
}
