import {
  HistoricalProviderError,
  type HistoricalBar,
  type HistoricalMarketDataProvider,
  type HistoricalProviderErrorKind,
} from '@wariba/adapters';
import {
  bucketEndSeconds,
  classifyBarSession,
  historyProvenanceFor,
  type CandleTimeframe,
  type TradableSymbol,
} from '@wariba/contracts';
import {
  loadMarketBarBounds,
  loadMarketBarCoverage,
  saveMarketBarCoverage,
  upsertProviderMarketBars,
  withMarketHistoryBackfillLock,
  type Db,
  type ProviderMarketBar,
} from '@wariba/database';
import Decimal from 'decimal.js';
import { DERIVATION_SOURCE, deriveBars, sourceBarsNeeded } from './market-history-aggregation';
import {
  MAX_PROVIDER_PAGE_BARS,
  MAX_PROVIDER_REQUESTS_PER_BACKFILL,
  initialDepthFor,
  PAGINATION_HISTORY_DEPTH_BARS,
} from './market-history-depth';
import {
  createRateLimiter,
  withProviderRetry,
  type RateLimiter,
} from './market-history-rate-limiter';

/**
 * WX3 — the historical backfill orchestrator.
 *
 * One responsibility: make the durable cache contain enough genuine bars to
 * answer a chart request, and never more work than that requires. Everything
 * it does is a consequence of one rule — the provider is asked only for ranges
 * WariX genuinely does not have, and is never asked twice for the same answer.
 *
 * It writes provider bars under the *provider's* source identity, never under
 * the realtime feed's. That is what makes "history from vendor A, ticks from
 * vendor B" a visible seam with an explicit cutover contract instead of a
 * silent splice (WX3 §11/§12).
 */

interface BackfillLogger {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
}

export interface BackfillMetrics {
  cacheHit(): void;
  cacheMiss(): void;
  providerRequest(): void;
  providerPage(bars: number): void;
  providerRateLimited(): void;
  backfillCompleted(durationMs: number, bars: number): void;
  backfillFailed(kind: HistoricalProviderErrorKind): void;
}

export interface MarketHistoryBackfillOptions {
  db: Db;
  provider: HistoricalMarketDataProvider;
  pricePrecision: Record<TradableSymbol, number>;
  logger: BackfillLogger;
  metrics?: BackfillMetrics;
  /** Provider requests permitted per window. Defaults to a conservative free-tier budget. */
  rateLimit?: { capacity: number; windowMs: number };
  rateLimiter?: RateLimiter;
  maxRequestsPerBackfill?: number;
  now?: () => Date;
}

export interface BackfillRequest {
  symbol: TradableSymbol;
  timeframe: CandleTimeframe;
  /** Exclusive cursor — acquire bars strictly older than this. Omitted = the live edge. */
  before?: number;
  /** How many bars the caller needs. Defaults to the configured depth for the timeframe. */
  targetBars?: number;
}

export type BackfillOutcome =
  | { status: 'cache_sufficient'; barsAvailable: number; providerRequests: 0 }
  | {
      status: 'backfilled';
      barsWritten: number;
      providerRequests: number;
      earliest: number | null;
      providerExhausted: boolean;
      rejectedBars: number;
    }
  | { status: 'coalesced' }
  | { status: 'provider_exhausted'; earliest: number | null }
  | { status: 'unsupported'; reason: string }
  | { status: 'failed'; kind: HistoricalProviderErrorKind; retryable: boolean; message: string };

const DEFAULT_RATE_LIMIT = { capacity: 6, windowMs: 60_000 };

export class MarketHistoryBackfillEngine {
  private readonly db: Db;
  private readonly provider: HistoricalMarketDataProvider;
  private readonly pricePrecision: Record<TradableSymbol, number>;
  private readonly logger: BackfillLogger;
  private readonly metrics: BackfillMetrics | undefined;
  private readonly rateLimiter: RateLimiter;
  private readonly maxRequestsPerBackfill: number;
  private readonly now: () => Date;
  /**
   * In-process coalescing. The advisory lock stops two *processes* duplicating
   * a backfill; this stops two *requests on one process* from queueing behind
   * each other and then discovering the work is already done. Twenty browsers
   * on one node produce one provider conversation.
   */
  private readonly inFlight = new Map<string, Promise<BackfillOutcome>>();

  constructor(options: MarketHistoryBackfillOptions) {
    this.db = options.db;
    this.provider = options.provider;
    this.pricePrecision = options.pricePrecision;
    this.logger = options.logger;
    this.metrics = options.metrics;
    this.rateLimiter =
      options.rateLimiter ?? createRateLimiter(options.rateLimit ?? DEFAULT_RATE_LIMIT);
    this.maxRequestsPerBackfill =
      options.maxRequestsPerBackfill ?? MAX_PROVIDER_REQUESTS_PER_BACKFILL;
    this.now = options.now ?? (() => new Date());
  }

  get sourceId(): string {
    return this.provider.source.id;
  }

  async ensure(request: BackfillRequest): Promise<BackfillOutcome> {
    const key = `${request.symbol}:${request.timeframe}:${request.before ?? 'edge'}`;
    const existing = this.inFlight.get(key);
    if (existing !== undefined) return existing;
    const work = this.run(request).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, work);
    return work;
  }

  private async run(request: BackfillRequest): Promise<BackfillOutcome> {
    const { symbol, timeframe } = request;
    if (!this.provider.supportsSymbol(symbol)) {
      return {
        status: 'unsupported',
        reason: `${symbol} is not covered by ${this.provider.providerName}`,
      };
    }
    const fetchTimeframe = this.provider.supportsTimeframe(timeframe)
      ? timeframe
      : DERIVATION_SOURCE[timeframe];
    if (fetchTimeframe === undefined) {
      return {
        status: 'unsupported',
        reason: `${timeframe} is neither native to ${this.provider.providerName} nor derivable`,
      };
    }

    const targetBars =
      request.targetBars ??
      (request.before === undefined ? initialDepthFor(timeframe) : PAGINATION_HISTORY_DEPTH_BARS);

    const cached = await this.countCachedBars(symbol, timeframe, request.before, targetBars);
    if (cached >= targetBars) {
      this.metrics?.cacheHit();
      this.logger.info('history.cache.hit', {
        sourceId: this.sourceId,
        symbol,
        interval: timeframe,
        bars: cached,
      });
      return { status: 'cache_sufficient', barsAvailable: cached, providerRequests: 0 };
    }
    this.metrics?.cacheMiss();

    const coverage = await loadMarketBarCoverage(this.db, {
      sourceId: this.sourceId,
      symbol,
      interval: timeframe,
    });
    // The provider has already said it has nothing older than what we hold.
    // Asking again costs a credit and cannot produce a different answer.
    if (
      coverage !== null &&
      !coverage.hasMoreOlder &&
      request.before !== undefined &&
      request.before <= coverage.earliestBar
    ) {
      return { status: 'provider_exhausted', earliest: coverage.earliestBar };
    }

    const startedAt = Date.now();
    const result = await withMarketHistoryBackfillLock(
      this.db,
      { sourceId: this.sourceId, symbol, interval: timeframe },
      async (trx) =>
        this.fetchAndPersist({
          symbol,
          timeframe,
          fetchTimeframe,
          targetBars,
          ...(request.before === undefined ? {} : { before: request.before }),
          persist: (bars) => upsertProviderMarketBars(trx, bars),
        }),
    );

    if (result === null) {
      this.logger.info('history.backfill.coalesced', {
        sourceId: this.sourceId,
        symbol,
        interval: timeframe,
      });
      return { status: 'coalesced' };
    }
    if (result.status === 'failed') {
      this.metrics?.backfillFailed(result.kind);
      this.logger.error('history.backfill.failed', {
        sourceId: this.sourceId,
        symbol,
        interval: timeframe,
        kind: result.kind,
        retryable: result.retryable,
      });
      return result;
    }

    await this.refreshCoverage(symbol, timeframe, result.providerExhausted);
    this.metrics?.backfillCompleted(Date.now() - startedAt, result.barsWritten);
    this.logger.info('history.backfill.completed', {
      sourceId: this.sourceId,
      symbol,
      interval: timeframe,
      barsWritten: result.barsWritten,
      providerRequests: result.providerRequests,
      rejectedBars: result.rejectedBars,
      providerExhausted: result.providerExhausted,
      durationMs: Date.now() - startedAt,
    });
    return result;
  }

  /**
   * Walks provider pages backwards until the target is met, the provider runs
   * out, or the request ceiling is reached.
   *
   * The cursor is always the oldest bar actually received, so a provider that
   * returns fewer bars than asked still advances the walk instead of looping
   * on the same window.
   */
  private async fetchAndPersist(params: {
    symbol: TradableSymbol;
    timeframe: CandleTimeframe;
    fetchTimeframe: CandleTimeframe;
    targetBars: number;
    before?: number;
    persist: (bars: readonly ProviderMarketBar[]) => Promise<number>;
  }): Promise<Extract<BackfillOutcome, { status: 'backfilled' | 'failed' }>> {
    const derived = params.fetchTimeframe !== params.timeframe;
    const needed = derived
      ? sourceBarsNeeded(params.timeframe, params.fetchTimeframe, params.targetBars)
      : params.targetBars;

    let cursor = params.before;
    let fetched = 0;
    let providerRequests = 0;
    let barsWritten = 0;
    let rejectedBars = 0;
    let providerExhausted = false;
    const collected: HistoricalBar[] = [];

    while (fetched < needed && providerRequests < this.maxRequestsPerBackfill) {
      const limit = Math.min(needed - fetched, MAX_PROVIDER_PAGE_BARS);
      await this.rateLimiter.acquire();
      let page;
      try {
        page = await withProviderRetry(
          () => {
            this.metrics?.providerRequest();
            this.logger.info('history.provider.request', {
              sourceId: this.sourceId,
              symbol: params.symbol,
              interval: params.fetchTimeframe,
              limit,
              before: cursor ?? null,
            });
            return this.provider.fetchBars({
              symbol: params.symbol,
              timeframe: params.fetchTimeframe,
              limit,
              ...(cursor === undefined ? {} : { before: cursor }),
            });
          },
          {
            maxAttempts: 3,
            baseDelayMs: 1000,
            maxDelayMs: 30_000,
            onRetry: (attempt, error, delayMs) => {
              if (error.kind === 'rate_limited') {
                this.metrics?.providerRateLimited();
                this.rateLimiter.penalize(delayMs);
                this.logger.warn('history.provider.rate_limited', {
                  sourceId: this.sourceId,
                  symbol: params.symbol,
                  interval: params.fetchTimeframe,
                  attempt,
                  delayMs,
                });
              }
            },
          },
        );
      } catch (error: unknown) {
        const kind: HistoricalProviderErrorKind =
          error instanceof HistoricalProviderError ? error.kind : 'provider_error';
        return {
          status: 'failed',
          kind,
          retryable: error instanceof HistoricalProviderError ? error.retryable : false,
          message: error instanceof Error ? error.message : 'unknown provider failure',
        };
      }
      providerRequests += 1;
      this.metrics?.providerPage(page.bars.length);
      rejectedBars += page.rejected.length;
      if (page.rejected.length > 0) {
        this.logger.warn('history.provider.bars_rejected', {
          sourceId: this.sourceId,
          symbol: params.symbol,
          interval: params.fetchTimeframe,
          rejected: page.rejected.length,
          firstReason: page.rejected[0]?.reason ?? null,
        });
      }
      this.logger.info('history.provider.page', {
        sourceId: this.sourceId,
        symbol: params.symbol,
        interval: params.fetchTimeframe,
        bars: page.bars.length,
        hasMoreOlder: page.hasMoreOlder,
      });

      const oldest = page.bars[0];
      if (oldest === undefined) {
        providerExhausted = true;
        break;
      }
      collected.push(...page.bars);
      fetched += page.bars.length;
      cursor = oldest.startTime;
      if (!page.hasMoreOlder) {
        providerExhausted = true;
        break;
      }
    }

    if (collected.length > 0) {
      const storable = derived
        ? this.deriveForStorage(collected, params.fetchTimeframe, params.timeframe)
        : collected;
      barsWritten = await params.persist(
        storable.map((bar) => this.toProviderBar(bar, params.symbol, params.timeframe)),
      );
    }

    return {
      status: 'backfilled',
      barsWritten,
      providerRequests,
      earliest: collected[0]?.startTime ?? null,
      providerExhausted,
      rejectedBars,
    };
  }

  /**
   * Derived bars are only emitted for buckets the fetched window fully covers.
   *
   * The newest fetched source bucket bounds the window, not "now": the most
   * recent target bucket is usually still open, and closing it early would
   * store a partial candle as final.
   */
  private deriveForStorage(
    sourceBars: readonly HistoricalBar[],
    sourceTimeframe: CandleTimeframe,
    targetTimeframe: CandleTimeframe,
  ): HistoricalBar[] {
    const ordered = [...sourceBars].sort((left, right) => left.startTime - right.startTime);
    const oldest = ordered[0];
    const newest = ordered.at(-1);
    if (oldest === undefined || newest === undefined) return [];
    const { bars, skippedIncomplete } = deriveBars(ordered, sourceTimeframe, targetTimeframe, {
      from: oldest.startTime,
      to: bucketEndSeconds(newest.startTime, sourceTimeframe),
    });
    if (skippedIncomplete > 0) {
      this.logger.info('history.derived.incomplete_skipped', {
        sourceId: this.sourceId,
        sourceTimeframe,
        targetTimeframe,
        skipped: skippedIncomplete,
      });
    }
    return bars;
  }

  private toProviderBar(
    bar: HistoricalBar,
    symbol: TradableSymbol,
    timeframe: CandleTimeframe,
  ): ProviderMarketBar {
    const precision = this.pricePrecision[symbol];
    const round = (value: string): string =>
      precision === undefined ? value : new Decimal(value).toFixed(precision);
    return {
      sourceId: this.sourceId,
      symbol,
      interval: timeframe,
      startTime: bar.startTime,
      open: round(bar.open),
      high: round(bar.high),
      low: round(bar.low),
      close: round(bar.close),
      origin: this.provider.supportsTimeframe(timeframe) ? 'provider_history' : 'derived',
      volume: bar.volume?.value ?? null,
      volumeSemantics: bar.volume?.semantics ?? null,
      // WX3.1 — classified at write time, from the canonical session calendar
      // and instrument table. Provenance is recorded once, where the bar enters
      // the system, rather than recomputed by every reader.
      sessionState: classifyBarSession(bar.startTime, timeframe),
      historyProvenance: historyProvenanceFor(symbol, bar.startTime),
      fetchedAt: this.now().toISOString(),
    };
  }

  private async countCachedBars(
    symbol: TradableSymbol,
    timeframe: CandleTimeframe,
    before: number | undefined,
    limit: number,
  ): Promise<number> {
    let selection = this.db
      .selectFrom('app.market_bars')
      .select((expression) => expression.fn.countAll().as('bars'))
      .where('source_id', '=', this.sourceId)
      .where('symbol', '=', symbol)
      .where('interval', '=', timeframe)
      .where('is_final', '=', true);
    if (before !== undefined) {
      selection = selection.where('open_time', '<', new Date(before * 1000));
    }
    const row = await selection.executeTakeFirst();
    return Math.min(Number(row?.bars ?? 0), limit);
  }

  private async refreshCoverage(
    symbol: TradableSymbol,
    timeframe: CandleTimeframe,
    providerExhausted: boolean,
  ): Promise<void> {
    const bounds = await loadMarketBarBounds(this.db, {
      sourceId: this.sourceId,
      symbol,
      interval: timeframe,
    });
    if (bounds === null) return;
    await saveMarketBarCoverage(this.db, {
      sourceId: this.sourceId,
      symbol,
      interval: timeframe,
      earliestBar: bounds.earliest,
      latestBar: bounds.latest,
      hasMoreOlder: !providerExhausted,
    });
  }
}
