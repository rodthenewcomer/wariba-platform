'use client';

import {
  DEFAULT_CANDLE_TIMEFRAME,
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

/**
 * W5 §18 — how close to the oldest loaded bar a pan must get before the next
 * older page is requested.
 *
 * Expressed in *bars remaining to the left of the viewport*, not pixels and not
 * scroll events: the same number behaves identically at every zoom level and on
 * every screen, which a pixel threshold does not. 50 is roughly one screen of
 * lead at a typical zoom, so the page lands before the trader reaches the edge
 * rather than after they have stared at empty space.
 */
export const HISTORY_BACKFILL_TRIGGER_BARS = 50;

/**
 * W5 §17 — how many older candles one backfill page asks for.
 *
 * Same as the initial hydration limit so a page-left is one screenful of the
 * same size the chart opened with, and well under `MAX_HISTORY_CANDLE_LIMIT`.
 */
export const HISTORY_BACKFILL_PAGE_LIMIT = INITIAL_HISTORY_CANDLE_LIMIT;

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
  /**
   * W5 §21 — an older page landed: rewrite the series **and hold the viewport**.
   *
   * Separate from `setData` precisely because the renderer must do something
   * extra here and must *not* do the obvious thing. Calling `fitContent()` after
   * a prepend would yank a trader who deliberately panned back three hours to
   * the live edge, and re-zoom the whole window; instead the renderer shifts its
   * logical range by `prependedCount` so the bar under the cursor stays under
   * the cursor. One write, whatever the page size (§75).
   */
  prepend(candles: readonly MarketCandle[], prependedCount: number): void;
}

export interface ChartHistorySnapshot {
  status: ChartHistoryStatus;
  /** Non-null once a response has been accepted — the memory generation on show. */
  sourceEpoch: string | null;
  /** Only set when `status === 'error'`; for logs and tests, not for the trader. */
  errorReason: string | null;
  /**
   * W5 §23 — whether an older page still exists **in this process's memory**.
   *
   * Not a claim about the market. `false` means the oldest retained candle is on
   * screen, which is why the UI copy is "début de l'historique disponible" and
   * never "all market history loaded".
   */
  hasMoreOlder: boolean;
  /** True while an older page is in flight — the chart may say so, quietly. */
  backfilling: boolean;
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
  /**
   * W5 §18/§19 — the pan-left trigger.
   *
   * Called with the number of loaded bars still to the left of the viewport
   * (lightweight-charts' leftmost visible logical index). Requests at most one
   * older page and is safe to call on every visible-range event: it is the
   * single place the threshold, the in-flight guard and `hasMore` are checked,
   * so a trader dragging left produces one request, not one per frame.
   */
  maybeRequestOlder(barsToLeftEdge: number): void;
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
  /** Older-page size; defaults to `HISTORY_BACKFILL_PAGE_LIMIT`. */
  backfillLimit?: number;
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

/**
 * W5 §19 — the one older-page request that may be in flight.
 *
 * Keyed by generation as well as request id: a page requested for the 1m chart
 * must not land on the 3m chart the trader switched to while it was in transit,
 * and the generation is what W3 already uses to express exactly that.
 */
interface Backfill {
  generation: number;
  requestId: string;
  symbol: TradableSymbol;
  timeframe: CandleTimeframe;
  /** The epoch the page was requested against — see `onOlderPage` (§22). */
  sourceEpoch: string;
  before: number;
}

const IDLE: ChartHistorySnapshot = {
  status: 'idle',
  sourceEpoch: null,
  errorReason: null,
  hasMoreOlder: false,
  backfilling: false,
};

export function createChartHistoryController(
  options: CreateChartHistoryControllerOptions,
): ChartHistoryController {
  const { transport, ticks, sink } = options;
  const newRequestId = options.newRequestId ?? (() => crypto.randomUUID());
  const limit = options.limit ?? INITIAL_HISTORY_CANDLE_LIMIT;
  const backfillLimit = options.backfillLimit ?? HISTORY_BACKFILL_PAGE_LIMIT;
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

  let aggregator = createCandleAggregator(DEFAULT_CANDLE_TIMEFRAME);
  let finalized: MarketCandle[] = [];
  let hydratedEpoch: string | null = null;
  let conflictRehydrates = 0;

  /** W5 §19/§23 — pagination state, reset with the series it describes. */
  let backfill: Backfill | null = null;
  let hasMoreOlder = false;
  let oldestCursor: number | null = null;

  function emit(next: ChartHistorySnapshot): void {
    if (
      next.status === snapshot.status &&
      next.sourceEpoch === snapshot.sourceEpoch &&
      next.errorReason === snapshot.errorReason &&
      next.hasMoreOlder === snapshot.hasMoreOlder &&
      next.backfilling === snapshot.backfilling
    ) {
      // Identity-stable when nothing changed: this snapshot is read through
      // useSyncExternalStore, so a new object every tick would re-render the
      // chart for no reason (§76).
      return;
    }
    snapshot = next;
    for (const listener of listeners) listener();
  }

  /** Every status transition, with the pagination state read from one place. */
  function publish(status: ChartHistoryStatus, errorReason: string | null = null): void {
    emit({
      status,
      sourceEpoch: hydratedEpoch,
      errorReason,
      hasMoreOlder,
      backfilling: backfill !== null,
    });
  }

  function identityKey(): string {
    return identity === null ? '' : `${identity.symbol}:${identity.timeframe}`;
  }

  function resetSeries(): void {
    finalized = [];
    aggregator.reset();
    hydratedEpoch = null;
    // An in-flight older page describes a series that no longer exists. Dropping
    // the handle is what makes its late response unmatched, hence ignored (§22).
    backfill = null;
    hasMoreOlder = false;
    oldestCursor = null;
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

    publish('loading');

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
        publish('ready');
      }
    }
    sink.update(update.current);
  }

  function failHydration(reason: string): void {
    hydration = null;
    publish('error', reason);
  }

  /**
   * W5 §18/§19 — request the next older page, at most one at a time.
   *
   * Every precondition is checked here and nowhere else, so the call site can be
   * a raw visible-range event handler firing dozens of times a second during a
   * drag and still produce exactly one request per page (§96). There is no
   * timer and no polling: a page is fetched because the trader panned, or not
   * at all.
   */
  function maybeRequestOlder(barsToLeftEdge: number): void {
    if (identity === null) return;
    // Hydration owns the series until it lands; paginating underneath it would
    // race the very merge that establishes what "oldest" means.
    if (hydration !== null) return;
    if (backfill !== null) return;
    if (!hasMoreOlder || oldestCursor === null || hydratedEpoch === null) return;
    if (!Number.isFinite(barsToLeftEdge) || barsToLeftEdge > HISTORY_BACKFILL_TRIGGER_BARS) return;

    const requestId = newRequestId();
    backfill = {
      generation,
      requestId,
      symbol: identity.symbol,
      timeframe: identity.timeframe,
      sourceEpoch: hydratedEpoch,
      before: oldestCursor,
    };
    publish(snapshot.status);
    transport.request({
      requestId,
      symbol: identity.symbol,
      timeframe: identity.timeframe,
      limit: backfillLimit,
      before: oldestCursor,
    });
  }

  /**
   * W5 §20/§21/§22 — merge one older page and hold the viewport.
   *
   * Three ways a response is dropped rather than merged, all silent: it belongs
   * to a superseded generation, it belongs to a different symbol/timeframe, or
   * it was produced by a *different memory generation* than the series on
   * screen. The last one is the W3 §35 rule applied to pagination — a page from
   * the process that died is not older history for the process that replaced
   * it, and splicing it in would present one process's observations as another's.
   */
  function onOlderPage(result: MarketHistoryResult, request: Backfill): void {
    backfill = null;

    if (request.generation !== generation) return;
    if (identity === null) return;
    if (result.symbol !== identity.symbol || result.timeframe !== identity.timeframe) return;
    if (result.sourceEpoch !== hydratedEpoch || result.sourceEpoch !== request.sourceEpoch) return;

    const validation = validateHistoryWindow(result, { limit: backfillLimit });
    if (!validation.ok) {
      // A malformed older page is not worth failing the whole chart over: what
      // is on screen is still valid observed history. Pagination stops instead,
      // which is the honest outcome — the trader keeps their series and simply
      // cannot go further back.
      hasMoreOlder = false;
      publish(snapshot.status);
      return;
    }

    const previousOldest = finalized[0]?.startTime ?? null;
    const merge = mergeFinalizedCandles(finalized, result.candles);
    if (merge.status === 'conflict') {
      // Same bucket, different OHLC, same epoch (checked above) — an integrity
      // fault. W3 §66's answer is a controlled rehydrate, and it applies
      // unchanged here; the existing counter bounds it.
      if (conflictRehydrates >= MAX_CONFLICT_REHYDRATES) {
        failHydration(`conflicting candle at ${merge.startTime}`);
        return;
      }
      conflictRehydrates += 1;
      resetSeries();
      sink.setData([]);
      beginHydration(identity);
      return;
    }

    finalized = merge.candles;
    hasMoreOlder = result.hasMore;
    oldestCursor = result.nextCursor ?? oldestCursor;

    // Exactly the count the renderer must shift its logical range by: candles
    // that landed *before* everything already on screen. Duplicates the merge
    // deduplicated do not move anything and are not counted (§21/§95).
    const prependedCount =
      previousOldest === null
        ? finalized.length
        : finalized.findIndex((candle) => candle.startTime === previousOldest);

    const currentCandle = aggregator.current();
    sink.prepend(
      currentCandle === null ? finalized : [...finalized, currentCandle],
      Math.max(0, prependedCount),
    );
    publish(finalized.length === 0 ? 'empty' : 'ready');
  }

  function onResult(result: MarketHistoryResult): void {
    // W5 §19 — an older page is answered on the same channel as a hydration, so
    // it is routed by its own request id before the hydration branch runs.
    if (backfill !== null && result.requestId === backfill.requestId) {
      onOlderPage(result, backfill);
      return;
    }

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
    // W5 §17 — the pagination contract W3 defined, now actually consumed. The
    // cursor is the oldest candle *the series holds*, not the oldest this
    // response carried, so a reconnect that merged older local candles back in
    // still pages from the true left edge.
    hasMoreOlder = result.hasMore;
    oldestCursor = finalized[0]?.startTime ?? result.nextCursor;

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

    publish(finalized.length === 0 ? 'empty' : 'ready');
  }

  function onError(error: MarketHistoryErrorMessage): void {
    // W5 §19 — a failed older page must not fail the chart. The series on screen
    // is untouched and still correct; pagination simply stops for this window,
    // and the next pan re-arms it only if the server said there is more.
    if (backfill !== null && error.requestId === backfill.requestId) {
      backfill = null;
      publish(snapshot.status);
      return;
    }
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
    maybeRequestOlder,
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
