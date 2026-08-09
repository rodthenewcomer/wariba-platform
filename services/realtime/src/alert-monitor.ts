import {
  evaluateReserveStatus,
  loadDatabaseAlertSignals,
  reconcileOperationalAlerts,
  type Db,
} from '@wariba/database';
import type { MarketDataProvider, TradableSymbol } from '@wariba/adapters';
import type { Logger } from '@wariba/observability';
import type { RealtimeLeadershipCoordinator } from './leadership';

/**
 * Appendix 08-A — runs the operational alert evaluation on a timer.
 *
 * Only the leader evaluates. Two nodes both writing the same platform-wide
 * incident would race on the partial unique index and log spurious
 * conflicts; more importantly, "is there a standby ready" is a question
 * only the leader is in a position to answer. A standby that later takes
 * over starts evaluating as part of taking over, so no alert is lost —
 * at worst it is delayed by one interval.
 */
export interface AlertMonitorParams {
  db: Db;
  market: MarketDataProvider;
  symbols: readonly TradableSymbol[];
  leadership: RealtimeLeadershipCoordinator;
  intervalMs: number;
  takeoverTargetMs: number;
  /**
   * MarketStatus models 'open' | 'stale' | 'closed' — there is no per-symbol
   * 'outage' value, and inventing one here would be reporting a condition
   * the feed never actually tells us about. The one outage this service can
   * observe honestly is the whole feed being down, which is exactly what a
   * disabled/stopped provider is.
   */
  marketDataEnabled: boolean;
  logger: Logger;
}

export class OperationalAlertMonitor {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly params: AlertMonitorParams) {}

  start(): void {
    this.timer = setInterval(() => void this.evaluateOnce(), this.params.intervalMs);
    // Do not block startup on the first evaluation.
    void this.evaluateOnce();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Exposed for tests and for an operator-triggered evaluation. */
  async evaluateOnce(): Promise<void> {
    if (this.running) return;
    const readiness = this.params.leadership.readiness();
    if (!readiness.leader) return;
    this.running = true;
    try {
      const staleSymbols: string[] = [];
      const outageSymbols: string[] = this.params.marketDataEnabled ? [] : [...this.params.symbols];
      if (this.params.marketDataEnabled) {
        for (const symbol of this.params.symbols) {
          if (this.params.market.getSnapshot(symbol).marketStatus === 'stale') {
            staleSymbols.push(symbol);
          }
        }
      }

      const [databaseSignals, reserve] = await Promise.all([
        loadDatabaseAlertSignals(this.params.db),
        evaluateReserveStatus(this.params.db),
      ]);

      const result = await reconcileOperationalAlerts(this.params.db, {
        signals: {
          ...databaseSignals,
          leaderInstanceId: readiness.instanceId,
          standbyReady: readiness.standbyReady,
          lastTakeoverDurationMs: readiness.lastTakeoverDurationMs,
          takeoverTargetMs: this.params.takeoverTargetMs,
          staleSymbols,
          outageSymbols,
          reserveCoverageRatio: reserve.coverageRatio,
          // Finalization failures surface as accounts overdue for a daily
          // boundary; the worker owns retry, this only reports the backlog.
          failedDailyFinalizationCount: 0,
        },
        now: new Date(),
      });

      for (const code of result.opened) {
        this.params.logger.warn('realtime.operational_alert_opened', { code });
      }
      for (const code of result.resolved) {
        this.params.logger.info('realtime.operational_alert_resolved', { code });
      }
    } catch (error) {
      // An alert evaluation that throws must not take the tick loop with
      // it — the platform is already degraded if we got here.
      this.params.logger.error('realtime.operational_alert_evaluation_failed', {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.running = false;
    }
  }
}
