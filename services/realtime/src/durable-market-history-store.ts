import {
  CANDLE_TIMEFRAMES,
  bucketEndSeconds,
  type CandleTimeframe,
  type MarketHistoryPort,
  type MarketHistoryQuery,
  type MarketHistoryWindow,
  type MarketTick,
  type TradableSymbol,
} from '@wariba/contracts';
import {
  loadCurrentMarketBars,
  loadMarketBarPage,
  registerMarketDataSource,
  upsertMarketBars,
  type Db,
  type MarketDataSourceRecord,
  type PersistedMarketBar,
} from '@wariba/database';
import type { MarketDataSourceIdentity } from '@wariba/adapters';
import Decimal from 'decimal.js';
import {
  MemoryMarketHistoryStore,
  type MarketHistoryObserver,
  type ObservedMarketBarUpdate,
} from './market-history-store';

interface DurableHistoryLogger {
  info(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
}

export interface DurableMarketHistoryStoreOptions {
  db: Db;
  source: MarketDataSourceIdentity;
  pricePrecision: Record<TradableSymbol, number>;
  logger: DurableHistoryLogger;
  flushIntervalMs?: number;
  onFlush?: (result: { bars: number; durationMs: number; ok: boolean }) => void;
}

function persistenceKey(
  bar: Pick<PersistedMarketBar, 'symbol' | 'interval' | 'startTime'>,
): string {
  return `${bar.symbol}:${bar.interval}:${bar.startTime}`;
}

function isTimeframe(value: string): value is CandleTimeframe {
  return (CANDLE_TIMEFRAMES as readonly string[]).includes(value);
}

/**
 * WX2 durable display-history service. Tick admission stays synchronous in the
 * memory aggregator; PostgreSQL writes are coalesced and flushed off that path.
 */
export class DurableMarketHistoryStore implements MarketHistoryPort, MarketHistoryObserver {
  readonly sourceEpoch: string;

  private readonly memory: MemoryMarketHistoryStore;
  private readonly pending = new Map<string, PersistedMarketBar>();
  private readonly db: Db;
  private readonly source: MarketDataSourceIdentity;
  private readonly pricePrecision: Record<TradableSymbol, number>;
  private readonly logger: DurableHistoryLogger;
  private readonly flushIntervalMs: number;
  private readonly onFlush: DurableMarketHistoryStoreOptions['onFlush'];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private activeFlush: Promise<void> | null = null;

  constructor(options: DurableMarketHistoryStoreOptions) {
    this.db = options.db;
    this.source = options.source;
    this.pricePrecision = options.pricePrecision;
    this.sourceEpoch = options.source.id;
    this.logger = options.logger;
    this.flushIntervalMs = options.flushIntervalMs ?? 1000;
    this.onFlush = options.onFlush;
    this.memory = new MemoryMarketHistoryStore({
      pricePrecision: options.pricePrecision,
      sourceEpoch: options.source.id,
      timeframes: CANDLE_TIMEFRAMES,
      onBarUpdate: (bar) => this.enqueue(bar),
    });
  }

  async initialize(): Promise<void> {
    const record: MarketDataSourceRecord = {
      id: this.source.id,
      provider: this.source.provider,
      environment: this.source.environment,
      mode: this.source.mode,
      version: this.source.version,
      capabilities: {
        ...this.source.capabilities,
        nativeIntervals: [...this.source.capabilities.nativeIntervals],
      },
    };
    await registerMarketDataSource(this.db, record);
    const current = await loadCurrentMarketBars(this.db, this.source.id);
    for (const bar of current) {
      if (!isTimeframe(bar.interval)) continue;
      const normalized = this.normalizePrices(bar);
      this.memory.seedCurrentBar({
        symbol: normalized.symbol as TradableSymbol,
        timeframe: bar.interval,
        candle: {
          startTime: normalized.startTime,
          open: normalized.open,
          high: normalized.high,
          low: normalized.low,
          close: normalized.close,
        },
        isFinal: false,
        firstObservedSequence: normalized.firstObservedSequence,
        observedThroughSequence: normalized.observedThroughSequence,
        observedAt: normalized.observedAt,
      });
    }
    this.logger.info('realtime.market_history_initialized', {
      sourceId: this.source.id,
      provider: this.source.provider,
      mode: this.source.mode,
      restoredCurrentBars: current.length,
      nativeHistory: this.source.capabilities.historicalBars,
      volume: this.source.capabilities.volume,
      depth: this.source.capabilities.depth,
    });
  }

  observeAcceptedTick(tick: MarketTick): void {
    this.memory.observeAcceptedTick(tick);
  }

  private normalizePrices(bar: PersistedMarketBar): PersistedMarketBar {
    const precision = this.pricePrecision[bar.symbol as TradableSymbol];
    if (precision === undefined) return bar;
    return {
      ...bar,
      open: new Decimal(bar.open).toFixed(precision),
      high: new Decimal(bar.high).toFixed(precision),
      low: new Decimal(bar.low).toFixed(precision),
      close: new Decimal(bar.close).toFixed(precision),
    };
  }

  private enqueue(bar: ObservedMarketBarUpdate): void {
    if (!isTimeframe(bar.timeframe)) return;
    const persisted: PersistedMarketBar = {
      sourceId: this.source.id,
      symbol: bar.symbol,
      interval: bar.timeframe,
      startTime: bar.candle.startTime,
      open: bar.candle.open,
      high: bar.candle.high,
      low: bar.candle.low,
      close: bar.candle.close,
      isFinal: bar.isFinal,
      firstObservedSequence: bar.firstObservedSequence,
      observedThroughSequence: bar.observedThroughSequence,
      observedAt: bar.observedAt,
    };
    this.pending.set(persistenceKey(persisted), persisted);
    if (this.flushTimer === null) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        void this.flush();
      }, this.flushIntervalMs);
      this.flushTimer.unref?.();
    }
  }

  async flush(): Promise<void> {
    // Wait for the writer that owns the current batch, then re-check the queue.
    // This matters during shutdown: bars can have been coalesced while the
    // previous SQL transaction was still in flight, and clearing the timer must
    // not strand that second batch in memory.
    if (this.activeFlush) await this.activeFlush;
    if (this.pending.size === 0) return;
    const batch = [...this.pending.values()];
    this.pending.clear();
    const startedAt = Date.now();
    this.activeFlush = upsertMarketBars(this.db, batch)
      .then(() => {
        this.onFlush?.({ bars: batch.length, durationMs: Date.now() - startedAt, ok: true });
      })
      .catch((error: unknown) => {
        for (const bar of batch) {
          const id = persistenceKey(bar);
          const newer = this.pending.get(id);
          if (
            !newer ||
            (newer.observedThroughSequence ?? -1) < (bar.observedThroughSequence ?? -1)
          ) {
            this.pending.set(id, bar);
          }
        }
        this.onFlush?.({ bars: batch.length, durationMs: Date.now() - startedAt, ok: false });
        this.logger.error('realtime.market_history_flush_failed', {
          sourceId: this.source.id,
          bars: batch.length,
          errorCode: error instanceof Error ? error.message : 'unknown_error',
        });
      })
      .finally(() => {
        this.activeFlush = null;
      });
    return this.activeFlush;
  }

  async close(): Promise<void> {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
    if (this.activeFlush) await this.activeFlush;
  }

  async getCandles(query: MarketHistoryQuery): Promise<MarketHistoryWindow> {
    await this.flush();
    const page = await loadMarketBarPage(this.db, {
      sourceId: this.source.id,
      symbol: query.symbol,
      interval: query.timeframe,
      limit: query.limit,
      ...(query.before === undefined ? {} : { before: query.before }),
    });
    const live = query.before === undefined ? await this.memory.getCandles(query) : null;
    const newest = page.bars.at(-1) ?? null;
    const oldest = page.bars[0] ?? null;
    let gapsDetected = 0;
    for (let index = 1; index < page.bars.length; index += 1) {
      const previous = page.bars[index - 1];
      const next = page.bars[index];
      if (
        previous &&
        next &&
        bucketEndSeconds(previous.startTime, query.timeframe) < next.startTime
      ) {
        gapsDetected += 1;
      }
    }
    return {
      source: 'observed_postgres_cache',
      sourceEpoch: this.source.id,
      priceBasis: 'mid',
      candles: page.bars.map((rawBar) => {
        const bar = this.normalizePrices(rawBar);
        return {
          startTime: bar.startTime,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        };
      }),
      currentCandle: live?.currentCandle ?? null,
      finalizedObservedThroughSequence: newest?.observedThroughSequence ?? null,
      currentCandleObservedThroughSequence: live?.currentCandleObservedThroughSequence ?? null,
      historyThrough: newest === null ? null : bucketEndSeconds(newest.startTime, query.timeframe),
      hasMore: page.hasMore,
      nextCursor: oldest?.startTime ?? null,
      sourceIdentity: {
        id: this.source.id,
        provider: this.source.provider,
        environment: this.source.environment,
        mode: this.source.mode,
        version: this.source.version,
      },
      capabilities: {
        ...this.source.capabilities,
        nativeIntervals: [...this.source.capabilities.nativeIntervals],
      },
      quality: { gapsDetected, continuity: gapsDetected === 0 ? 'observed' : 'gapped' },
    };
  }
}
