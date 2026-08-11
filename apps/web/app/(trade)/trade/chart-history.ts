'use client';

import {
  INITIAL_HISTORY_CANDLE_LIMIT,
  createCandleAggregator,
  mergeFinalizedCandles,
  midPrice,
  replayAfterSequence,
  validateHistoryWindow,
  type CandleTimeframe,
  type MarketCandle,
  type MarketHistoryErrorMessage,
  type MarketHistoryRequest,
  type MarketHistoryResult,
  type MarketTick,
  type TradableSymbol,
} from '@wariba/contracts';

/**
 * The chart's history state machine — W3 §30-§40, §45-§51.
 *
 * Deliberately imperative, React-free and chart-local. It lives below
 * TradeClient and owns no React state: the workstation shell, nav rail, status
 * bar, account switcher, dock chrome and Market Navigator chrome must not
 * re-render because a candle arrived (W2 render ownership, W3 §76), so a tick
 * reaching this controller reaches no component at all. The only thing React
 * subscribes to here is a coarse status snapshot that changes a handful of times
 * per symbol — never per tick.
 *
 * Nothing in this file can execute a trade. Historical candles never enter a
 * trigger path; the controller writes to a chart series and to nothing else
 * (§57/§58).
 */

export type ChartHistoryStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

/**
 * W3 §33 — how many accepted ticks may queue while a hydration is in flight.
 *
 * Hydration is a memory read plus one round trip, so a healthy one buffers one
 * or two ticks at the mock feed's 1 tick/s. 500 is therefore unreachable in
 * normal operation and cheap to hold (~100 KB); reaching it means the response
 * is never coming, which is a hydration failure rather than a slow hydration.
 * Ticks are never silently dropped to stay under it — the hydration fails
 * loudly instead.
 */
export const CLIENT_HISTORY_HYDRATION_TICK_BUFFER_MAX = 500;

/** How many times a merge conflict may force a controlled rehydrate before giving up (§66). */
const MAX_CONFLICT_REHYDRATES = 1;

export interface ChartHistoryTransport {
  request(request: MarketHistoryRequest): void;
  onResult(listener: (result: MarketHistoryResult) => void): () => void;
  onError(listener: (error: MarketHistoryErrorMessage) => void): () => void;
  /** A genuinely new socket opened — the server may have observed ticks through the gap (§48). */
  onSocketOpen(listener: () => void): () => void;
}

/**
 * The renderer boundary. Canonical candles are decimal strings all the way to
 * here; converting to `number` is the adapter's job, not this controller's
 * (W3 §43).
 */
export interface ChartHistorySeriesSink {
  /** Hydration only — one whole-series write, never per tick (§42). */
  setData(candles: readonly MarketCandle[]): void;
  /** Live continuation — one bar (§42). */
  update(candle: MarketCandle): void;
  /** Once per symbol/timeframe hydration, never per tick (§44). */
  fitContent(): void;
}

export interface ChartHistorySnapshot {
  status: ChartHistoryStatus;
  /** Non-null once a response has been accepted — the memory generation on show. */
  sourceEpoch: string | null;
  /** Only set when `status === 'error'`; for logs and tests, not for the trader. */
  errorReason: string | null;
}

export interface ChartHistoryTickSource {
  subscribeTickEvents(symbol: TradableSymbol, listener: (tick: MarketTick) => void): () => void;
}

export interface ChartHistoryController {
  /** (Re)start hydration for one symbol/timeframe. Creates a new generation. */
  start(params: {
    symbol: TradableSymbol;
    timeframe: CandleTimeframe;
    pricePrecision: number;
  }): void;
  /** Detach from ticks and the transport, and forget the series. */
  stop(): void;
  snapshot(): ChartHistorySnapshot;
  subscribe(listener: () => void): () => void;
  /** Inspection seam for tests and the renderer adapter. */
  series(): { finalized: readonly MarketCandle[]; current: MarketCandle | null };
  dispose(): void;
}

export interface CreateChartHistoryControllerOptions {
  transport: ChartHistoryTransport;
  ticks: ChartHistoryTickSource;
  sink: ChartHistorySeriesSink;
  /** Injectable so tests get deterministic request ids. */
  newRequestId?: () => string;
  limit?: number;
  bufferMax?: number;
}

interface Hydration {
  generation: number;
  requestId: string;
  symbol: TradableSymbol;
  timeframe: CandleTimeframe;
  pricePrecision: number;
  /** Accepted ticks observed since this hydration began, in delivery order (§33). */
  buffer: MarketTick[];
}

const IDLE: ChartHistorySnapshot = { status: 'idle', sourceEpoch: null, errorReason: null };

export function createChartHistoryController(
  options: CreateChartHistoryControllerOptions,
): ChartHistoryController {
  const { transport, ticks, sink } = options;
  const newRequestId = options.newRequestId ?? (() => crypto.randomUUID());
  const limit = options.limit ?? INITIAL_HISTORY_CANDLE_LIMIT;
  const bufferMax = options.bufferMax ?? CLIENT_HISTORY_HYDRATION_TICK_BUFFER_MAX;

  const listeners = new Set<() => void>();
  let snapshot: ChartHistorySnapshot = IDLE;

  /** Monotonic; every request and every tick subscription is stamped with it (§31). */
  let generation = 0;
  /** Identity currently being displayed, so a repeat `start` can be told from a switch. */
  let identity: {
    symbol: TradableSymbol;
    timeframe: CandleTimeframe;
    pricePrecision: number;
  } | null = null;
  let fittedIdentity: string | null = null;

  /** The in-flight hydration, or null once a response has been applied. */
  let hydration: Hydration | null = null;
  let detachTicks: (() => void) | null = null;

  let aggregator = createCandleAggregator('1m');
  let finalized: MarketCandle[] = [];
  let hydratedEpoch: string | null = null;
  let conflictRehydrates = 0;

  function emit(next: ChartHistorySnapshot): void {
    if (
      next.status === snapshot.status &&
      next.sourceEpoch === snapshot.sourceEpoch &&
      next.errorReason === snapshot.errorReason
    ) {
      // Identity-stable when nothing changed: this snapshot is read through
      // useSyncExternalStore, so a new object every tick would re-render the
      // chart for no reason (§76).
      return;
    }
    snapshot = next;
    for (const listener of listeners) listener();
  }

  function identityKey(): string {
    return identity === null ? '' : `${identity.symbol}:${identity.timeframe}`;
  }

  function resetSeries(): void {
    finalized = [];
    aggregator.reset();
    hydratedEpoch = null;
  }

  /**
   * W3 §32 — the required order, and the reason for it.
   *
   * The tick listener is attached and the buffer opened *before* the request is
   * sent. Any other order has a window in which an accepted tick arrives, is
   * not represented by the response either (it happened after the server built
   * the window), and is therefore lost from the candle forever. Buffer-first
   * plus a sequence watermark is what makes the stitch lossless rather than
   * probable.
   */
  function beginHydration(params: {
    symbol: TradableSymbol;
    timeframe: CandleTimeframe;
    pricePrecision: number;
  }): void {
    generation += 1;
    const current: Hydration = {
      generation,
      requestId: newRequestId(),
      symbol: params.symbol,
      timeframe: params.timeframe,
      pricePrecision: params.pricePrecision,
      buffer: [],
    };
    hydration = current;

    detachTicks?.();
    detachTicks = ticks.subscribeTickEvents(params.symbol, (tick) => {
      onTick(current.generation, tick);
    });

    emit({ status: 'loading', sourceEpoch: hydratedEpoch, errorReason: null });

    transport.request({
      requestId: current.requestId,
      symbol: params.symbol,
      timeframe: params.timeframe,
      limit,
    });
  }

  function onTick(tickGeneration: number, tick: MarketTick): void {
    // A listener from a superseded generation cannot touch anything: it is
    // detached synchronously on switch, but this makes the guarantee explicit
    // rather than dependent on unsubscribe timing.
    if (tickGeneration !== generation || identity === null) return;
    if (tick.symbol !== identity.symbol) return;

    if (hydration !== null) {
      if (hydration.buffer.length >= bufferMax) {
        // W3 §33 — never silently discard an accepted tick to stay under the
        // bound. A hydration that has not landed in 500 ticks is not slow, it
        // is broken, and the chart says so.
        failHydration(`hydration tick buffer exceeded ${bufferMax}`);
        return;
      }
      hydration.buffer.push(tick);
      return;
    }

    applyTick(tick, identity.pricePrecision);
  }

  /** The one live path: canonical aggregation, then one incremental renderer write. */
  function applyTick(tick: MarketTick, pricePrecision: number): void {
    const price = midPrice(tick.bid, tick.ask, pricePrecision);
    const timestampMs = new Date(tick.timestamp).getTime();
    if (!Number.isFinite(timestampMs)) return;

    const update = aggregator.observe({ timestampMs, price });
    if (update.finalized !== null) {
      finalized = [...finalized, update.finalized];
      sink.update(update.finalized);
      if (snapshot.status === 'empty') {
        // Locally observed history is still observed history: once a bucket has
        // genuinely closed there is history to show, so stop saying there is none.
        emit({ status: 'ready', sourceEpoch: hydratedEpoch, errorReason: null });
      }
    }
    sink.update(update.current);
  }

  function failHydration(reason: string): void {
    hydration = null;
    emit({ status: 'error', sourceEpoch: hydratedEpoch, errorReason: reason });
  }

  function onResult(result: MarketHistoryResult): void {
    const current = hydration;
    // W3 §34/§45/§46/§65 — an obsolete generation's response is dropped in
    // silence: no setData, no error, no viewport move, no buffer clear, no
    // mutation of the active chart's state. Showing its error would be as wrong
    // as showing its data.
    if (current === null) return;
    if (result.requestId !== current.requestId) return;
    if (result.symbol !== current.symbol || result.timeframe !== current.timeframe) return;

    const validation = validateHistoryWindow(result, { limit });
    if (!validation.ok) {
      failHydration(validation.reason);
      return;
    }

    // W3 §35/§50 — a different memory generation is not a continuation of the
    // one on screen. Nothing is spliced across epochs and no continuity is
    // fabricated: the old process-memory-derived series is discarded, the new
    // source's truth is installed, and whatever temporal gap that leaves stays
    // visible.
    const epochChanged = hydratedEpoch !== null && hydratedEpoch !== result.sourceEpoch;
    if (epochChanged) resetSeries();

    // W3 §36/§49 — same epoch: the server may hold finalized candles this
    // browser missed while disconnected, so they are merged deterministically
    // rather than replacing what is already correct.
    const merge = mergeFinalizedCandles(epochChanged ? [] : finalized, result.candles);
    if (merge.status === 'conflict') {
      // W3 §66 — same bucket, different OHLC, one observed source. That is an
      // integrity fault, not something to reconcile by last-write-wins.
      if (conflictRehydrates >= MAX_CONFLICT_REHYDRATES) {
        failHydration(`conflicting candle at ${merge.startTime}`);
        return;
      }
      conflictRehydrates += 1;
      resetSeries();
      hydration = null;
      if (identity !== null) beginHydration(identity);
      return;
    }

    finalized = merge.candles;
    hydratedEpoch = result.sourceEpoch;

    // W3 §17/§38 — install the authoritative current bucket so the next tick
    // extends it. Without this the bar's true open, and any pre-mount high or
    // low, would be lost until the bucket rolled over.
    aggregator.reset();
    if (result.currentCandle !== null) aggregator.seed(result.currentCandle);

    sink.setData(result.currentCandle === null ? finalized : [...finalized, result.currentCandle]);

    const key = identityKey();
    if (fittedIdentity !== key) {
      // §44 — once per symbol/timeframe, so live ticks never yank a trader back
      // to the latest candle after a manual pan or zoom.
      sink.fitContent();
      fittedIdentity = key;
    }

    // W3 §37 — the exact cutover. Only ticks the server's snapshot did not
    // already represent are replayed, which is why same-second ticks are safe:
    // the boundary is a sequence, not a timestamp.
    const watermark = replayAfterSequence(result);
    const replay = current.buffer.filter((tick) => watermark === null || tick.sequence > watermark);
    hydration = null;
    conflictRehydrates = 0;

    for (const tick of replay) applyTick(tick, current.pricePrecision);

    emit({
      status: finalized.length === 0 ? 'empty' : 'ready',
      sourceEpoch: hydratedEpoch,
      errorReason: null,
    });
  }

  function onError(error: MarketHistoryErrorMessage): void {
    if (hydration === null || error.requestId !== hydration.requestId) return;
    failHydration(error.code);
  }

  function onSocketOpen(): void {
    // W3 §48 — the browser's own candles do not cover a disconnect: the server
    // kept observing. Rehydrate and reconcile rather than assume.
    if (identity === null) return;
    beginHydration(identity);
  }

  const offResult = transport.onResult(onResult);
  const offError = transport.onError(onError);
  const offSocketOpen = transport.onSocketOpen(onSocketOpen);

  return {
    start(params) {
      const changed =
        identity === null ||
        identity.symbol !== params.symbol ||
        identity.timeframe !== params.timeframe;
      identity = params;
      if (changed) {
        // W3 §45/§46 — a switch starts over rather than showing a mix of two
        // instruments' or two intervals' bars. The renderer is cleared here, so
        // a late response for the previous identity has nothing to land on.
        aggregator = createCandleAggregator(params.timeframe);
        resetSeries();
        conflictRehydrates = 0;
        sink.setData([]);
      }
      beginHydration(params);
    },
    stop() {
      detachTicks?.();
      detachTicks = null;
      hydration = null;
      identity = null;
      fittedIdentity = null;
      resetSeries();
      emit(IDLE);
    },
    snapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    series: () => ({ finalized, current: aggregator.current() }),
    dispose() {
      detachTicks?.();
      detachTicks = null;
      offResult();
      offError();
      offSocketOpen();
      listeners.clear();
    },
  };
}
