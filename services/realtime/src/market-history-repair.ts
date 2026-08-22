import {
  isWithinWeeklyClosure,
  reconnectRepairRange,
  timeframeSeconds,
  type CandleTimeframe,
  type TradableSymbol,
} from '@wariba/contracts';
import { loadMarketBarCoverage, type Db } from '@wariba/database';
import type { MarketHistoryBackfillEngine } from './market-history-backfill';

/**
 * WX3.1 §3 — recoverable history repair after a break in continuity.
 *
 * WX3 computed the repair range and then never called it, which meant a service
 * that had been down for an hour came back with an hour-shaped hole in its
 * chart and no mechanism to close it. This is the caller.
 *
 * It repairs by asking the ordinary backfill engine for the newest bars, not by
 * inventing a special path. That is deliberate: the engine already validates
 * canonically, classifies session and provenance, upserts idempotently under a
 * lock and coalesces concurrent callers, so repair inherits every one of those
 * properties instead of reimplementing them slightly differently. A repair that
 * finds nothing missing costs one cache count and no provider traffic.
 *
 * Nothing here can fabricate a bar. If the provider has no data for the gap —
 * because the gap was a weekend, or because the archive does not reach — the
 * hole stays, and the gap classifier goes on describing it honestly.
 */

interface RepairLogger {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
}

export type RepairTrigger = 'service_start' | 'feed_reconnect';

export interface MarketHistoryRepairOptions {
  db: Db;
  backfill: MarketHistoryBackfillEngine;
  symbols: readonly TradableSymbol[];
  logger: RepairLogger;
  /**
   * Which intervals are repaired. Intraday only by default: a daily or weekly
   * bucket that was open during the outage is refetched by ordinary cold-start
   * depth on the next chart request anyway, and asking for all ten timeframes
   * per symbol would spend a free-tier daily budget on a restart.
   */
  timeframes?: readonly CandleTimeframe[];
  /** Bars requested per repaired series, over and above the measured gap. */
  headroomBars?: number;
  now?: () => number;
}

export interface RepairOutcome {
  trigger: RepairTrigger;
  repaired: number;
  skippedNoGap: number;
  skippedUnsupported: number;
  failed: number;
  durationMs: number;
}

const DEFAULT_REPAIR_TIMEFRAMES: readonly CandleTimeframe[] = ['1m', '5m', '15m', '1h'];

/**
 * A small margin on top of the measured gap.
 *
 * The last durable bar may itself have been mid-formation when the process
 * died, so refetching a few extra buckets lets the provider's finalized version
 * replace a partial one. Idempotent upsert makes the overlap free.
 */
const DEFAULT_HEADROOM_BARS = 5;

/** Never turn one restart into a thousand-bar backfill on the hot path. */
const MAX_REPAIR_BARS_PER_SERIES = 400;

export class MarketHistoryRepairService {
  private readonly db: Db;
  private readonly backfill: MarketHistoryBackfillEngine;
  private readonly symbols: readonly TradableSymbol[];
  private readonly timeframes: readonly CandleTimeframe[];
  private readonly headroomBars: number;
  private readonly logger: RepairLogger;
  private readonly now: () => number;
  /**
   * One repair pass at a time. A flapping connection can emit reconnect events
   * faster than a pass completes, and without this each one would queue another
   * full sweep behind it.
   */
  private inFlight: Promise<RepairOutcome> | null = null;

  constructor(options: MarketHistoryRepairOptions) {
    this.db = options.db;
    this.backfill = options.backfill;
    this.symbols = options.symbols;
    this.timeframes = options.timeframes ?? DEFAULT_REPAIR_TIMEFRAMES;
    this.headroomBars = options.headroomBars ?? DEFAULT_HEADROOM_BARS;
    this.logger = options.logger;
    this.now = options.now ?? (() => Math.floor(Date.now() / 1000));
  }

  /** Returns the in-flight pass when one is already running, rather than starting a second. */
  async repair(trigger: RepairTrigger): Promise<RepairOutcome> {
    if (this.inFlight !== null) {
      this.logger.info('history.gap.repair_coalesced', { trigger });
      return this.inFlight;
    }
    const pass = this.run(trigger).finally(() => {
      this.inFlight = null;
    });
    this.inFlight = pass;
    return pass;
  }

  private async run(trigger: RepairTrigger): Promise<RepairOutcome> {
    const startedAt = Date.now();
    const outcome: RepairOutcome = {
      trigger,
      repaired: 0,
      skippedNoGap: 0,
      skippedUnsupported: 0,
      failed: 0,
      durationMs: 0,
    };

    for (const symbol of this.symbols) {
      for (const timeframe of this.timeframes) {
        const missing = await this.missingBars(symbol, timeframe);
        if (missing === null) {
          outcome.skippedNoGap += 1;
          continue;
        }
        this.logger.info('history.gap.detected', {
          symbol,
          interval: timeframe,
          missingBars: missing,
          trigger,
        });
        const result = await this.backfill.ensure({
          symbol,
          timeframe,
          targetBars: missing,
        });
        if (result.status === 'backfilled') {
          outcome.repaired += 1;
          this.logger.info('history.gap.repaired', {
            symbol,
            interval: timeframe,
            barsWritten: result.barsWritten,
            providerRequests: result.providerRequests,
            trigger,
          });
          continue;
        }
        if (result.status === 'unsupported') {
          outcome.skippedUnsupported += 1;
          continue;
        }
        if (result.status === 'failed') {
          outcome.failed += 1;
          // A provider failure leaves the cache exactly as it was. The chart
          // keeps serving what it genuinely owns and the hole stays visible.
          this.logger.warn('history.gap.unrecoverable', {
            symbol,
            interval: timeframe,
            kind: result.kind,
            trigger,
          });
          continue;
        }
        outcome.skippedNoGap += 1;
      }
    }

    outcome.durationMs = Date.now() - startedAt;
    this.logger.info('history.gap.repair_pass_completed', { ...outcome });
    return outcome;
  }

  /**
   * How many bars would close the gap, or `null` when there is nothing to close.
   *
   * `reconnectRepairRange` already refuses a range that is entirely in the past
   * of the last durable bar and bounds a long outage. What is left here is
   * turning a span into a bar count, and refusing to act when the span is
   * *entirely* closed market — a Saturday restart must not spend credits
   * repairing the weekend, because the weekend was never missing. A range that
   * merely crosses the weekend is still repaired: the Monday morning inside it
   * genuinely is.
   */
  private async missingBars(
    symbol: TradableSymbol,
    timeframe: CandleTimeframe,
  ): Promise<number | null> {
    const coverage = await loadMarketBarCoverage(this.db, {
      sourceId: this.backfill.sourceId,
      symbol,
      interval: timeframe,
    });
    // Nothing held yet is a cold start, not a gap. The ordinary depth path owns it.
    if (coverage === null) return null;
    const range = reconnectRepairRange(coverage.latestBar, this.now(), timeframe);
    if (range === null) return null;
    if (spansOnlyClosedMarket(range.from, range.to)) return null;

    const span = range.to - range.from;
    const bucket = timeframeSeconds(timeframe);
    if (bucket <= 0) return null;
    const bars = Math.ceil(span / bucket);
    if (bars <= 0) return null;
    return Math.min(bars + this.headroomBars, MAX_REPAIR_BARS_PER_SERIES);
  }
}

/**
 * True when every hour of a range is closed market.
 *
 * A weekend restart measures a gap stretching back to Friday's close. Without
 * this it would ask the provider to repair the weekend, spending credits to be
 * told what WariX already knows: the market was shut, and the hole is an
 * expected session gap rather than missing data. Sampled hourly because the
 * closure boundaries fall on the hour.
 */
function spansOnlyClosedMarket(from: number, to: number): boolean {
  if (to <= from) return false;
  for (let instant = from; instant < to; instant += 3600) {
    if (!isWithinWeeklyClosure(instant)) return false;
  }
  return isWithinWeeklyClosure(Math.max(from, to - 1));
}
