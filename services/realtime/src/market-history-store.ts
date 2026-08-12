import { randomUUID } from 'node:crypto';
import {
  CANDLE_TIMEFRAMES,
  bucketStartSeconds,
  createCandleAggregator,
  midPrice,
  timeframeSeconds,
  type CandleAggregator,
  type CandleTimeframe,
  type MarketCandle,
  type MarketHistoryPort,
  type MarketHistoryQuery,
  type MarketHistoryWindow,
  type MarketTick,
  type TradableSymbol,
} from '@wariba/contracts';

/**
 * W3 §6-§19 — the observed-memory market history store.
 *
 * One instance per realtime process. **Not** one per WebSocket client, per
 * trader or per account: a market price is market data, not account-private
 * data, so aggregating it once and serving it to everyone is both correct and
 * the only way the observation count stays 1 per accepted tick (§4). What is
 * still per-account is *authorization* — which symbols a given connection may
 * ask for — and that is enforced at the transport, not here.
 *
 * The store observes; it never generates. There is no timer finalization, no
 * previous-close filler, no interpolation and no simulator replay (§14/§51).
 * An interval in which no accepted tick arrived produces no candle, and the
 * chart shows that gap honestly.
 *
 * Its limitation is stated rather than hidden: depth is bounded by this
 * process's uptime and by retention below, and nothing here survives a restart
 * (§13/§59).
 */

/** W3 §15 / W5 §11 — retention per (symbol, timeframe) key.
 *
 * Sized from the read side rather than picked round: 5× `INITIAL_HISTORY_CANDLE_LIMIT`
 * (400), so a trader can page left five full pages at any timeframe and W5's
 * indicators have warm-up headroom, while a single request's ceiling
 * (`MAX_HISTORY_CANDLE_LIMIT` = 1000) can never drain a whole window.
 *
 * **W5 recalculation.** Adding 15s and 3m takes the key count from 15 to 25, so
 * the number is re-derived rather than inherited: 5 symbols × 5 timeframes = 25
 * keys × 2000 = **50,000 stored candles**. Each entry is one wrapper object, one
 * candle object, four short decimal strings and three numbers ≈ 250-300 B in
 * V8, so **≈ 15 MB** worst case (was ≈ 9 MB at three timeframes), reached only
 * after hours of uptime on a process that already holds the whole tick fan-out.
 * That is still clearly safe on a small realtime box, so retention is kept at
 * 2000 rather than reduced — the alternative (cutting to 1200 to hold the old
 * 9 MB) would cost the pan-left depth W5 §17 exists to deliver, for ~6 MB.
 *
 * What that retention actually spans at the mock provider's 1 tick/s:
 * 5s ≈ 2.8 h, 15s ≈ 8.3 h, 30s ≈ 16.7 h, 1m ≈ 33 h, 3m ≈ 100 h of observation.
 */
export const SERVER_HISTORY_RETENTION_PER_SYMBOL_TIMEFRAME = 2000;

/**
 * W3 §9 — internal metadata wrapping a canonical candle.
 *
 * The sequence bounds are deliberately **not** fields on `MarketCandle`: the
 * public candle is the display contract and adding transport bookkeeping to it
 * would push a server concern into every consumer. Only the store needs to know
 * which accepted ticks a bar represents.
 */
interface StoredFinalizedCandle {
  candle: MarketCandle;
  firstSequence: number;
  lastSequence: number;
}

interface TimeframeState {
  aggregator: CandleAggregator;
  /**
   * Ascending by `startTime`, bounded by retention.
   *
   * This one buffer is mutated in place, which is the deliberate exception to
   * the repository's immutability default: it is a private, encapsulated,
   * bounded cache whose whole job is to absorb writes, and copying a
   * 2000-element array on every candle close would be churn for no safety.
   * The invariant that matters is upheld strictly — nothing internal is ever
   * handed out. `getCandles` returns fresh arrays, and the candle objects
   * themselves are never mutated (the aggregator always creates new ones).
   */
  finalized: StoredFinalizedCandle[];
  /** Accepted sequence bounds of the aggregator's in-progress bucket. */
  currentFirstSequence: number | null;
  currentLastSequence: number | null;
}

/** The write side of the history boundary — see W3 §4/§5. */
export interface MarketHistoryObserver {
  /**
   * Called **exactly once per accepted market tick**, from the single canonical
   * acceptance point. Synchronous, allocation-light, and never on a per-client
   * path.
   */
  observeAcceptedTick(tick: MarketTick): void;
}

export interface MemoryMarketHistoryStoreOptions {
  /** Price precision per symbol, so mid is rounded the way the symbol is quoted. */
  pricePrecision: Record<TradableSymbol, number>;
  retentionPerKey?: number;
  /** Test seam only (W3 §59): production always gets a fresh random epoch. */
  sourceEpoch?: string;
}

function key(symbol: TradableSymbol, timeframe: CandleTimeframe): string {
  return `${symbol}:${timeframe}`;
}

export class MemoryMarketHistoryStore implements MarketHistoryPort, MarketHistoryObserver {
  /**
   * W3 §11 — one opaque process-lifetime identifier, generated when the store
   * is constructed. A restart or a second realtime node produces a different
   * value, which is exactly what stops a browser from splicing two unrelated
   * process memories into one continuous series (§12/§35).
   *
   * Opaque on purpose: a UUID leaks no hostname, instance id, port or any other
   * infrastructure detail to the browser.
   */
  readonly sourceEpoch: string;

  private readonly states = new Map<string, TimeframeState>();
  private readonly pricePrecision: Record<TradableSymbol, number>;
  private readonly retentionPerKey: number;
  /** Observations skipped because they predate the open bucket — see `observeAcceptedTick`. */
  private staleObservations = 0;

  constructor(options: MemoryMarketHistoryStoreOptions) {
    this.pricePrecision = options.pricePrecision;
    this.retentionPerKey = options.retentionPerKey ?? SERVER_HISTORY_RETENTION_PER_SYMBOL_TIMEFRAME;
    this.sourceEpoch = options.sourceEpoch ?? randomUUID();
  }

  /**
   * W3 §8 / W5 §10 — one accepted tick, one mid, one aggregator per interval.
   *
   * The loop iterates `CANDLE_TIMEFRAMES`, so W5's two new intervals are
   * observed by construction rather than by a second code path: still exactly
   * **one** observation per accepted tick (W3-D2), now fanned into five
   * aggregators instead of three. There is no per-client aggregation and no
   * reconstruction of the new intervals from past data the process never
   * observed (W5 §12).
   *
   * There is no raw tick tape: keeping every tick would be unbounded storage
   * for data nothing reads. And there is no OHLC arithmetic here — the bucket
   * function, the mid basis and the aggregator all come from
   * `@wariba/contracts/market-candles`, the same ones the browser's live chart
   * uses, so a history bar and a live bar cannot drift apart (§8/§41).
   */
  observeAcceptedTick(tick: MarketTick): void {
    const precision = this.pricePrecision[tick.symbol];
    if (precision === undefined) return;
    const price = midPrice(tick.bid, tick.ask, precision);
    const timestampMs = new Date(tick.timestamp).getTime();
    if (!Number.isFinite(timestampMs)) return;

    for (const timeframe of CANDLE_TIMEFRAMES) {
      this.applyToTimeframe(tick, timeframe, timestampMs, price);
    }
  }

  private applyToTimeframe(
    tick: MarketTick,
    timeframe: CandleTimeframe,
    timestampMs: number,
    price: string,
  ): void {
    const state = this.stateFor(tick.symbol, timeframe);
    const bucket = bucketStartSeconds(timestampMs, timeframe);
    const open = state.aggregator.current();

    // The accepted stream is already ordered per symbol by MarketTickGate
    // (equal sequence → duplicate, lower sequence or older timestamp →
    // out_of_order, neither is broadcast). So this branch should be
    // unreachable; it is counted rather than silently folded in, because an
    // observation older than the open bucket would corrupt the sequence
    // bookkeeping below and must not be attributed to the current bar.
    if (open !== null && bucket < open.startTime) {
      this.staleObservations += 1;
      return;
    }

    const update = state.aggregator.observe({ timestampMs, price });

    if (update.finalized !== null) {
      // The bar that just closed is exactly the window the previous sequence
      // bounds described; this tick belongs to the bucket that replaced it.
      state.finalized.push({
        candle: update.finalized,
        firstSequence: state.currentFirstSequence ?? tick.sequence,
        lastSequence: state.currentLastSequence ?? tick.sequence,
      });
      if (state.finalized.length > this.retentionPerKey) {
        state.finalized.splice(0, state.finalized.length - this.retentionPerKey);
      }
      state.currentFirstSequence = tick.sequence;
      state.currentLastSequence = tick.sequence;
      return;
    }

    if (update.openedNewBucket) {
      state.currentFirstSequence = tick.sequence;
      state.currentLastSequence = tick.sequence;
      return;
    }

    state.currentLastSequence = tick.sequence;
  }

  private stateFor(symbol: TradableSymbol, timeframe: CandleTimeframe): TimeframeState {
    const id = key(symbol, timeframe);
    const existing = this.states.get(id);
    if (existing) return existing;
    const created: TimeframeState = {
      aggregator: createCandleAggregator(timeframe),
      finalized: [],
      currentFirstSequence: null,
      currentLastSequence: null,
    };
    this.states.set(id, created);
    return created;
  }

  /**
   * W3 §20/§24 — the read side.
   *
   * `candles` is finalized-only, always. The in-progress bucket travels
   * separately as `currentCandle` (§17) so the browser can restore the current
   * bar's true open/high/low without the historical array ever containing a bar
   * that is still moving.
   *
   * Pagination reaches only what this process still retains (§25): when the
   * oldest retained candle is returned, `hasMore` is false even though the
   * market existed before the process did. That is the honest answer.
   */
  getCandles(query: MarketHistoryQuery): Promise<MarketHistoryWindow> {
    return Promise.resolve(this.readWindow(query));
  }

  private readWindow(query: MarketHistoryQuery): MarketHistoryWindow {
    const state = this.states.get(key(query.symbol, query.timeframe));
    const isLiveEdge = query.before === undefined;

    if (!state) {
      return {
        source: 'observed_memory_cache',
        sourceEpoch: this.sourceEpoch,
        priceBasis: 'mid',
        candles: [],
        currentCandle: null,
        finalizedObservedThroughSequence: null,
        currentCandleObservedThroughSequence: null,
        historyThrough: null,
        hasMore: false,
        nextCursor: null,
      };
    }

    const before = query.before;
    const pool =
      before === undefined
        ? state.finalized
        : state.finalized.filter((entry) => entry.candle.startTime < before);
    const page = pool.slice(Math.max(0, pool.length - query.limit));
    const newest = page.at(-1) ?? null;
    const oldest = page[0] ?? null;

    // A current-candle seed belongs only to the live edge. An older page is
    // pure finalized history: attaching a moving bucket to it would be
    // meaningless, and its watermark must never be mistaken for a live
    // replay boundary (§18/§24).
    const currentCandle = isLiveEdge ? state.aggregator.current() : null;

    return {
      source: 'observed_memory_cache',
      sourceEpoch: this.sourceEpoch,
      priceBasis: 'mid',
      candles: page.map((entry) => entry.candle),
      currentCandle,
      finalizedObservedThroughSequence: newest?.lastSequence ?? null,
      currentCandleObservedThroughSequence:
        currentCandle === null ? null : state.currentLastSequence,
      historyThrough:
        newest === null ? null : newest.candle.startTime + timeframeSeconds(query.timeframe),
      hasMore: pool.length > page.length,
      nextCursor: oldest?.candle.startTime ?? null,
    };
  }

  /** Operational visibility only — retained candle count per key, and stale-observation count. */
  stats(): { keys: number; storedCandles: number; staleObservations: number } {
    let storedCandles = 0;
    for (const state of this.states.values()) storedCandles += state.finalized.length;
    return { keys: this.states.size, storedCandles, staleObservations: this.staleObservations };
  }
}
