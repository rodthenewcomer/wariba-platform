import {
  bucketEndSeconds,
  type MarketHistoryPort,
  type MarketHistoryQuery,
  type MarketHistoryWindow,
  type MarketTick,
  classifyGaps,
  type RealtimeContinuation,
  type TradableSymbol,
} from '@wariba/contracts';
import {
  loadMarketBarCoverage,
  loadMarketBarPage,
  registerMarketDataSource,
  type Db,
  type MarketDataSourceRecord,
} from '@wariba/database';
import type { MarketDataSourceIdentity } from '@wariba/adapters';
import Decimal from 'decimal.js';
import type { DurableMarketHistoryStore } from './durable-market-history-store';
import type { MarketHistoryBackfillEngine } from './market-history-backfill';
import { initialDepthFor, PAGINATION_HISTORY_DEPTH_BARS } from './market-history-depth';
import { decideRealtimeContinuation, type CutoverMode } from './market-history-cutover';

/**
 * WX3 — the history port a chart actually reads when a historical provider is
 * configured.
 *
 * It composes rather than replaces. `DurableMarketHistoryStore` keeps doing
 * exactly what WX2 built it to do — observe accepted ticks, aggregate them,
 * coalesce writes — and this store decides which of the two sources answers a
 * given request, acquires provider depth when the cache is shallow, and owns
 * the one decision WX2 never had to make: whether live ticks may legitimately
 * be appended to a series of somebody else's candles.
 *
 * The answer to that last question is frequently "no", and saying so is the
 * point. A real EURUSD daily history ending in a sandbox random walk is a
 * beautiful lie; a real EURUSD daily history that simply stops at the last
 * genuine bar is the truth.
 */

interface ProviderHistoryLogger {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
}

export interface ProviderMarketHistoryStoreOptions {
  db: Db;
  observed: DurableMarketHistoryStore;
  backfill: MarketHistoryBackfillEngine;
  providerSource: MarketDataSourceIdentity;
  realtimeSource: MarketDataSourceIdentity;
  pricePrecision: Record<TradableSymbol, number>;
  logger: ProviderHistoryLogger;
  cutover?: { mode: CutoverMode; toleranceBps: number };
}

/**
 * How far a live mid may sit from the newest provider close before continuation
 * is refused, in basis points.
 *
 * 50 bps is roughly five big figures on EURUSD — far wider than any legitimate
 * gap between two vendors quoting the same pair seconds apart, and far tighter
 * than the distance between a real quote and a synthetic one. The check is
 * meant to catch "these are different markets", not to arbitrate spreads.
 */
const DEFAULT_CUTOVER_TOLERANCE_BPS = 50;

export class ProviderMarketHistoryStore implements MarketHistoryPort {
  readonly sourceEpoch: string;

  private readonly db: Db;
  private readonly observed: DurableMarketHistoryStore;
  private readonly backfill: MarketHistoryBackfillEngine;
  private readonly providerSource: MarketDataSourceIdentity;
  private readonly realtimeSource: MarketDataSourceIdentity;
  private readonly pricePrecision: Record<TradableSymbol, number>;
  private readonly logger: ProviderHistoryLogger;
  private readonly cutoverMode: CutoverMode;
  private readonly toleranceBps: number;

  constructor(options: ProviderMarketHistoryStoreOptions) {
    this.db = options.db;
    this.observed = options.observed;
    this.backfill = options.backfill;
    this.providerSource = options.providerSource;
    this.realtimeSource = options.realtimeSource;
    this.pricePrecision = options.pricePrecision;
    this.logger = options.logger;
    this.cutoverMode = options.cutover?.mode ?? 'verified';
    this.toleranceBps = options.cutover?.toleranceBps ?? DEFAULT_CUTOVER_TOLERANCE_BPS;
    this.sourceEpoch = options.providerSource.id;
  }

  /** Registers the provider source so backfilled bars satisfy the foreign key. */
  async initialize(): Promise<void> {
    const record: MarketDataSourceRecord = {
      id: this.providerSource.id,
      provider: this.providerSource.provider,
      environment: this.providerSource.environment,
      mode: this.providerSource.mode,
      version: this.providerSource.version,
      capabilities: {
        ...this.providerSource.capabilities,
        nativeIntervals: [...this.providerSource.capabilities.nativeIntervals],
      },
    };
    await registerMarketDataSource(this.db, record);
    await this.observed.initialize();
    this.logger.info('history.provider_source_registered', {
      sourceId: this.providerSource.id,
      provider: this.providerSource.provider,
      environment: this.providerSource.environment,
      realtimeSourceId: this.realtimeSource.id,
      cutoverMode: this.cutoverMode,
    });
  }

  observeAcceptedTick(tick: MarketTick): void {
    this.observed.observeAcceptedTick(tick);
  }

  async flush(): Promise<void> {
    await this.observed.flush();
  }

  async close(): Promise<void> {
    await this.observed.close();
  }

  async getCandles(query: MarketHistoryQuery): Promise<MarketHistoryWindow> {
    const outcome = await this.backfill.ensure({
      symbol: query.symbol,
      timeframe: query.timeframe,
      targetBars:
        query.before === undefined
          ? initialDepthFor(query.timeframe)
          : PAGINATION_HISTORY_DEPTH_BARS,
      ...(query.before === undefined ? {} : { before: query.before }),
    });

    // A symbol or interval the provider genuinely does not carry falls back to
    // the observed cache rather than returning an empty chart. That is a source
    // *choice*, not a splice: the window that comes back names the observed
    // source, so the client partitions it under a different generation and
    // never merges the two series.
    if (outcome.status === 'unsupported') {
      this.logger.info('history.provider.symbol_unsupported', {
        sourceId: this.providerSource.id,
        symbol: query.symbol,
        interval: query.timeframe,
        reason: outcome.reason,
      });
      return this.observed.getCandles(query);
    }

    // WX3.1 — the default visible series is regular-session bars of the
    // instrument's own history. Out-of-session quotes and pre-existence
    // reconstructions stay in the cache with their provenance; they are simply
    // not what a trader is shown when they open a chart.
    const page = await loadMarketBarPage(this.db, {
      sourceId: this.providerSource.id,
      symbol: query.symbol,
      interval: query.timeframe,
      limit: query.limit,
      visibleOnly: true,
      ...(query.before === undefined ? {} : { before: query.before }),
    });

    if (page.bars.length === 0 && outcome.status === 'failed') {
      // No cache and no provider. WX2's honest empty window is still the right
      // answer — the chart shows its existing unavailable state and the
      // realtime feed and every execution control carry on untouched.
      this.logger.warn('history.provider.unavailable_no_cache', {
        sourceId: this.providerSource.id,
        symbol: query.symbol,
        interval: query.timeframe,
        kind: outcome.kind,
      });
    }

    const candles = page.bars.map((bar) => {
      const precision = this.pricePrecision[bar.symbol as TradableSymbol];
      const round = (value: string): string =>
        precision === undefined ? value : new Decimal(value).toFixed(precision);
      return {
        startTime: bar.startTime,
        open: round(bar.open),
        high: round(bar.high),
        low: round(bar.low),
        close: round(bar.close),
      };
    });

    const coverage = await loadMarketBarCoverage(this.db, {
      sourceId: this.providerSource.id,
      symbol: query.symbol,
      interval: query.timeframe,
    });
    const quality = classifyGaps(candles, {
      timeframe: query.timeframe,
      providerCanRepair: this.providerSource.capabilities.historicalBars,
      ...(coverage === null ? {} : { providerEarliest: coverage.earliestBar }),
    });

    // Newest row the archive holds, used for the cutover price comparison.
    const newest = candles.at(-1) ?? null;
    const oldest = candles[0] ?? null;
    const live = query.before === undefined ? await this.observed.getCandles(query) : null;
    const continuation = this.decideContinuation(
      newest?.close ?? null,
      live?.currentCandle?.close ?? null,
    );
    const attached = continuation === 'attached';

    /**
     * WX3.1 §2 — the seam carries no duplicate bucket.
     *
     * A provider archive includes the bucket that is still forming: ask for
     * monthly EURUSD in August and the newest row is August, partial. The live
     * aggregator owns that same bucket. Serving both puts two candles at one
     * timestamp, which the client correctly refuses as an integrity fault —
     * the chart showed "Historique indisponible" on `1M` until this existed.
     *
     * The in-progress bucket belongs to the live series, so the provider's
     * partial row is withheld from the finalized window rather than the live
     * candle being dropped. Nothing is deleted: the row stays cached and
     * becomes authoritative again the moment the bucket closes.
     */
    const liveBucketStart = attached ? (live?.currentCandle?.startTime ?? null) : null;
    const finalizedCandles =
      liveBucketStart === null
        ? candles
        : candles.filter((candle) => candle.startTime < liveBucketStart);
    const newestFinalized = finalizedCandles.at(-1) ?? null;

    return {
      source: 'provider_postgres_cache',
      sourceEpoch: this.providerSource.id,
      priceBasis: 'mid',
      candles: finalizedCandles,
      currentCandle: attached ? (live?.currentCandle ?? null) : null,
      finalizedObservedThroughSequence: null,
      currentCandleObservedThroughSequence: attached
        ? (live?.currentCandleObservedThroughSequence ?? null)
        : null,
      // The end of the window actually served, not of the row withheld at the
      // seam. The client validates these two agree and refuses the hydration
      // when they do not — which is how the mismatch was caught.
      historyThrough:
        newestFinalized === null
          ? null
          : bucketEndSeconds(newestFinalized.startTime, query.timeframe),
      // Older bars exist when this page is not the end of the cache, or when
      // the provider has not yet said it is out of archive.
      hasMore: page.hasMore || (coverage?.hasMoreOlder ?? false),
      nextCursor: oldest?.startTime ?? null,
      sourceIdentity: {
        id: this.providerSource.id,
        provider: this.providerSource.provider,
        environment: this.providerSource.environment,
        mode: this.providerSource.mode,
        version: this.providerSource.version,
      },
      capabilities: {
        ...this.providerSource.capabilities,
        nativeIntervals: [...this.providerSource.capabilities.nativeIntervals],
      },
      quality: {
        gapsDetected: quality.unexpected,
        continuity: quality.unexpected === 0 ? 'observed' : 'gapped',
        sessionGaps: quality.expectedSession,
        recoverableGaps: quality.recoverable,
        unrecoverableGaps: quality.unrecoverable,
        historyOrigin: this.providerSource.capabilities.nativeIntervals.includes(query.timeframe)
          ? 'provider_history'
          : 'derived',
      },
      realtimeContinuation: continuation,
    };
  }

  /**
   * The cutover decision (WX3 §12), delegated to the rule module so it can be
   * tested without a database and so there is exactly one implementation.
   */
  private decideContinuation(
    providerClose: string | null,
    liveClose: string | null,
  ): RealtimeContinuation {
    const decision = decideRealtimeContinuation({
      mode: this.cutoverMode,
      toleranceBps: this.toleranceBps,
      historyProvider: this.providerSource.provider,
      realtimeProvider: this.realtimeSource.provider,
      providerClose,
      liveClose,
    });
    if (decision.continuation === 'refused_price_divergence') {
      this.logger.warn('history.cutover.refused_price_divergence', {
        historySourceId: this.providerSource.id,
        realtimeSourceId: this.realtimeSource.id,
        divergenceBps: decision.divergenceBps,
        toleranceBps: this.toleranceBps,
      });
    }
    if (decision.continuation === 'attached' && decision.divergenceBps !== null) {
      this.logger.info('history.cutover.attached', {
        historySourceId: this.providerSource.id,
        realtimeSourceId: this.realtimeSource.id,
        divergenceBps: decision.divergenceBps,
        toleranceBps: this.toleranceBps,
      });
    }
    return decision.continuation;
  }
}
