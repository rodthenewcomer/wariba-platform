import { z } from 'zod';
import type { TradableSymbol } from './channels';
import { symbolSchema } from './market';
import {
  candleTimeframeSchema,
  bucketEndSeconds,
  isCandleStartAligned,
  marketCandleSchema,
  type CandleTimeframe,
  type MarketCandle,
} from './market-candles';

/**
 * Market history contract — W3 §20-§25.
 *
 * This is a **display read model**. Nothing in this file participates in
 * execution: a historical candle crossing a pending order's trigger, a stop
 * loss, a take profit or an alert threshold causes nothing (W3 §57/§58). Only
 * accepted realtime ticks reach the trigger engines, and they arrive on their
 * own path in `services/realtime/src/websocket.ts`.
 *
 * The port and the DTO live in `contracts` rather than in `adapters` (which is
 * where Phase A's plan sketch put them) for two reasons. The response crosses
 * the WebSocket, so it is a wire contract like every other message here; and
 * the candle semantics it is defined in terms of — bucket alignment, mid basis,
 * the one aggregator — already live next door in `market-candles.ts`. Putting
 * the port in `adapters` would have meant a new `adapters → contracts` package
 * edge for a source that is not an external adapter at all: W3's history is the
 * realtime process's own observation of its own accepted-tick stream.
 */

/**
 * W3 §21 — the source names itself honestly. There is no provider history, no
 * exchange history and no FCS history in this system; `FcsMarketDataProvider`
 * is a quote WebSocket with no candle endpoint (Phase A §1.C). What exists is
 * a bounded cache of candles the realtime process aggregated from accepted
 * ticks it observed itself, so that is what the wire says.
 */
export const historySourceSchema = z.enum([
  'observed_memory_cache',
  'observed_postgres_cache',
  // WX3 — genuine provider bars served from the durable cache. Named
  // separately from the observed caches because it is a different claim: these
  // candles describe the market, not this process's view of its own tick feed.
  'provider_postgres_cache',
]);
export type HistorySource = z.infer<typeof historySourceSchema>;

/**
 * The only basis W3 has. It must equal the live chart's basis or the series is
 * not homogeneous (W3 §25) — both come from `midPrice()` in `market-candles.ts`,
 * so they agree by construction rather than by convention.
 */
export const historyPriceBasisSchema = z.literal('mid');
export type HistoryPriceBasis = z.infer<typeof historyPriceBasisSchema>;

export const marketHistorySourceIdentitySchema = z.object({
  id: z.string().min(1).max(200),
  provider: z.string().min(1).max(80),
  environment: z.string().min(1).max(80),
  mode: z.enum(['sandbox', 'replay', 'live']),
  version: z.string().min(1).max(160),
});
export type MarketHistorySourceIdentity = z.infer<typeof marketHistorySourceIdentitySchema>;

export const marketHistoryCapabilitiesSchema = z.object({
  realtimeQuotes: z.boolean(),
  bidAsk: z.boolean(),
  historicalBars: z.boolean(),
  nativeIntervals: z.array(z.string().min(1)).max(64),
  pagination: z.enum(['none', 'cursor', 'time_range']),
  volume: z.boolean(),
  depth: z.boolean(),
});
export type MarketHistoryCapabilities = z.infer<typeof marketHistoryCapabilitiesSchema>;

export const marketHistoryQualitySchema = z.object({
  /** Holes that are genuinely missing data — expected market closures excluded. */
  gapsDetected: z.number().int().nonnegative(),
  continuity: z.enum(['observed', 'gapped']),
  /**
   * WX3 §25/§26 — a weekend is not a data problem. Counting closures
   * separately is what keeps `gapsDetected` meaning something a trader should
   * care about instead of firing every Saturday.
   */
  sessionGaps: z.number().int().nonnegative().optional(),
  recoverableGaps: z.number().int().nonnegative().optional(),
  unrecoverableGaps: z.number().int().nonnegative().optional(),
  /** How the bars in this window were obtained. */
  historyOrigin: z.enum(['observed', 'provider_history', 'derived', 'mixed']).optional(),
});
export type MarketHistoryQuality = z.infer<typeof marketHistoryQualitySchema>;

/**
 * W3 §16 — what a chart asks for on first hydration.
 *
 * 400 finalized candles fills the 1440×900 viewport several times over at
 * every W3 timeframe, leaves headroom for the indicator warm-up W5 will want,
 * and is ~35 KB of JSON. The browser never requests "everything".
 */
export const INITIAL_HISTORY_CANDLE_LIMIT = 400;

/**
 * Hard server-side ceiling on one request. 2.5× the initial limit, and
 * deliberately *half* of the server's retention (see
 * `SERVER_HISTORY_RETENTION_PER_SYMBOL_TIMEFRAME` in services/realtime), so no
 * single request can drain a whole retained window and every left-page is a
 * bounded ~88 KB read.
 */
export const MAX_HISTORY_CANDLE_LIMIT = 1000;

/**
 * W3 §27 — the request carries no provider URL, no provider parameters, no
 * date SQL and no source name. The server alone decides what implements
 * history; the client only says which symbol, which timeframe, how many, and
 * (for pagination) where to stop going back.
 *
 * `before` is an **exclusive** candle-start cursor in epoch seconds: return the
 * newest retained finalized candles whose `startTime` is strictly less than it.
 * Omitted means "the live edge", which is the only request that carries a
 * current-candle seed (§17).
 */
export const marketHistoryRequestSchema = z.object({
  requestId: z.string().min(1).max(64),
  symbol: symbolSchema,
  timeframe: candleTimeframeSchema,
  limit: z.number().int().min(1).max(MAX_HISTORY_CANDLE_LIMIT),
  before: z.number().int().nonnegative().optional(),
});
export type MarketHistoryRequest = z.infer<typeof marketHistoryRequestSchema>;

/**
 * The loosely-typed outer frame the client message union accepts.
 *
 * Deliberately weaker than `marketHistoryRequestSchema`: a request that fails
 * strict validation must still be answerable *with its requestId*, or the
 * browser's history controller cannot fail the generation that is waiting and
 * would sit in `loading` forever. So the union only insists on a usable
 * `requestId`, and the handler does the real validation and replies with a
 * correlated `market_history_error` (§34/§55).
 */
export const marketHistoryRequestFrameSchema = z.object({
  requestId: z.string().min(1).max(64),
  symbol: z.string(),
  timeframe: z.string(),
  limit: z.number(),
  before: z.number().nullish(),
});
export type MarketHistoryRequestFrame = z.infer<typeof marketHistoryRequestFrameSchema>;

/**
 * Every field is present on the wire, `null` rather than absent when it has no
 * value — `JSON.stringify` drops `undefined`, so an optional field and a
 * missing field are indistinguishable to the receiver. A stable shape is what
 * lets the client validate exactly instead of defensively.
 */
export const realtimeContinuationSchema = z.enum([
  'attached',
  'refused_source_mismatch',
  'refused_price_divergence',
  'refused_by_config',
]);
export type RealtimeContinuation = z.infer<typeof realtimeContinuationSchema>;

export const marketHistoryResultSchema = z.object({
  requestId: z.string().min(1),
  symbol: symbolSchema,
  timeframe: candleTimeframeSchema,
  source: historySourceSchema,
  /**
   * W3 §11 — an opaque process-lifetime id for the memory generation that
   * produced this window. A restart or a second realtime node yields a
   * different value, which is what stops the browser from splicing two
   * unrelated process memories into one series (§12/§35).
   */
  sourceEpoch: z.string().min(1),
  /** WX2 stable non-secret source identity. Optional only for W3 wire compatibility. */
  sourceIdentity: marketHistorySourceIdentitySchema.optional(),
  capabilities: marketHistoryCapabilitiesSchema.optional(),
  quality: marketHistoryQualitySchema.optional(),
  priceBasis: historyPriceBasisSchema,
  /** Finalized candles only, ascending by `startTime` (W3 §14/§22). */
  candles: z.array(marketCandleSchema).max(MAX_HISTORY_CANDLE_LIMIT),
  /**
   * W3 §17 — the in-progress bucket as the server has observed it so far, so a
   * browser that opened mid-bucket does not lose the bucket's true open, or the
   * high and low that happened before it mounted. Never part of `candles`;
   * `HISTORICAL_CANDLES_FINALIZED_ONLY` stays true. Only ever present on a
   * live-edge request (`before` omitted).
   */
  currentCandle: marketCandleSchema.nullable(),
  /**
   * Last accepted tick sequence represented by the newest candle in `candles`.
   * Scoped to `(sourceEpoch, symbol)` — never compare it across epochs (§12).
   */
  finalizedObservedThroughSequence: z.number().int().nonnegative().nullable(),
  /** Last accepted tick sequence represented by `currentCandle`. Same scope. */
  currentCandleObservedThroughSequence: z.number().int().nonnegative().nullable(),
  /**
   * W3 §23 — temporal metadata, **not** the cutover mechanism. It is the
   * exclusive upper time boundary of the returned finalized window in epoch
   * seconds: `newestFinalized.startTime + timeframeSeconds`, i.e. the instant
   * the next bucket begins. It does **not** claim the history is continuous up
   * to that point: W3 permits genuine gaps, because an interval with no
   * accepted tick produces no candle rather than a flat one (§14/§51).
   *
   * The exact live-replay mechanism is the sequence watermark above.
   */
  historyThrough: z.number().int().nonnegative().nullable(),
  /**
   * True when older finalized candles remain **in this process's bounded
   * memory** (W3 §25). It is not a claim about the market: once the oldest
   * retained candle is reached this is `false` even though the market plainly
   * existed before the process started.
   */
  hasMore: z.boolean(),
  /** Exclusive `before` cursor for the next older page — the oldest returned candle's `startTime`. */
  nextCursor: z.number().int().nonnegative().nullable(),
  /**
   * WX3 §12 — the explicit historical/realtime cutover decision.
   *
   * When history and live ticks come from different vendors they are two
   * different claims about the same market, and appending one to the other is
   * only honest if they agree. The server decides and says so; the client
   * appends live candles only when this reads `attached`. A refusal is not an
   * error — the chart shows genuine history and simply stops there, which is
   * the truthful outcome and the one WX2 already has status grammar for.
   */
  realtimeContinuation: realtimeContinuationSchema.optional(),
});
export type MarketHistoryResult = z.infer<typeof marketHistoryResultSchema>;

export const marketHistoryErrorCodeSchema = z.enum([
  'invalid_request',
  'unknown_symbol',
  'unsupported_timeframe',
  'rate_limited',
  'unavailable',
]);
export type MarketHistoryErrorCode = z.infer<typeof marketHistoryErrorCodeSchema>;

/**
 * A correlated failure. Carries `requestId` precisely so the browser can fail
 * the one generation that was waiting and show a chart-local error, while the
 * realtime feed and every execution control carry on untouched (W3 §55/§56).
 */
export const marketHistoryErrorMessageSchema = z.object({
  requestId: z.string().min(1),
  code: marketHistoryErrorCodeSchema,
  message: z.string().min(1),
});
export type MarketHistoryErrorMessage = z.infer<typeof marketHistoryErrorMessageSchema>;

/**
 * W3 §20 — the canonical history read abstraction.
 *
 * Deliberately *not* folded into `MarketDataProvider`: doing that would make
 * every quote provider in `adapters` appear to offer historical data, which
 * none of them do. This is a separate, read-only capability with one W3
 * implementation (the realtime process's observed-memory store).
 *
 * `Promise`-returning even though the only implementation answers from memory
 * synchronously — a durable or provider-backed implementation would be async,
 * and the callers are already async message handlers, so nothing is paid for
 * it now and no signature has to break later.
 *
 * Read-only by construction: there is no write method here. Execution code
 * must never reach for this to get a price, a trigger or a recovery decision
 * (W3 §58) — history is display truth, not execution truth.
 */
export interface MarketHistoryPort {
  /** Opaque, stable for this port instance's lifetime (W3 §11). */
  readonly sourceEpoch: string;
  getCandles(query: MarketHistoryQuery): Promise<MarketHistoryWindow>;
}

export interface MarketHistoryQuery {
  symbol: TradableSymbol;
  timeframe: CandleTimeframe;
  limit: number;
  /** Exclusive candle-start cursor, epoch seconds. Omitted = live edge. */
  before?: number;
}

/** What a port returns — the wire result minus the request-correlation fields. */
export interface MarketHistoryWindow {
  source: HistorySource;
  sourceEpoch: string;
  priceBasis: HistoryPriceBasis;
  candles: MarketCandle[];
  currentCandle: MarketCandle | null;
  finalizedObservedThroughSequence: number | null;
  currentCandleObservedThroughSequence: number | null;
  historyThrough: number | null;
  hasMore: boolean;
  nextCursor: number | null;
  sourceIdentity?: MarketHistorySourceIdentity;
  capabilities?: MarketHistoryCapabilities;
  quality?: MarketHistoryQuality;
  realtimeContinuation?: RealtimeContinuation;
}

/**
 * W3 §18 — the one watermark that drives cutover.
 *
 * The current-candle seed already represents everything the finalized window
 * represents plus more, so when it is present it *is* the boundary. Only
 * buffered accepted ticks with `sequence > replayAfterSequence` get replayed:
 * that is what makes the stitch exact instead of a guess about which
 * same-second ticks the server had already folded in (§10/§47).
 *
 * `null` means "the server represented nothing" — replay the whole buffer.
 */
export function replayAfterSequence(result: {
  currentCandle: MarketCandle | null;
  currentCandleObservedThroughSequence: number | null;
  finalizedObservedThroughSequence: number | null;
}): number | null {
  if (result.currentCandle !== null && result.currentCandleObservedThroughSequence !== null) {
    return result.currentCandleObservedThroughSequence;
  }
  return result.finalizedObservedThroughSequence;
}

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

export type HistoryValidation = { ok: true } | { ok: false; reason: string };

function invalid(reason: string): HistoryValidation {
  return { ok: false, reason };
}

function validateCandleShape(
  candle: MarketCandle,
  timeframe: CandleTimeframe,
  label: string,
): HistoryValidation {
  if (!isCandleStartAligned(candle.startTime, timeframe)) {
    return invalid(`${label} startTime ${candle.startTime} is not aligned to ${timeframe}`);
  }
  for (const [field, value] of [
    ['open', candle.open],
    ['high', candle.high],
    ['low', candle.low],
    ['close', candle.close],
  ] as const) {
    if (!DECIMAL_PATTERN.test(value)) {
      return invalid(`${label} ${field} "${value}" is not a decimal string`);
    }
  }
  // Compared as numbers, not Decimals, on purpose: this is a boundary
  // *rejection* check on already-validated decimal strings, and a candle whose
  // OHLC relationships are broken is broken by orders of magnitude more than
  // any float epsilon. Canonical arithmetic stays in market-candles.ts.
  const open = Number(candle.open);
  const high = Number(candle.high);
  const low = Number(candle.low);
  const close = Number(candle.close);
  if (high < low) return invalid(`${label} high ${high} < low ${low}`);
  if (high < open) return invalid(`${label} high ${high} < open ${open}`);
  if (high < close) return invalid(`${label} high ${high} < close ${close}`);
  if (low > open) return invalid(`${label} low ${low} > open ${open}`);
  if (low > close) return invalid(`${label} low ${low} > close ${close}`);
  return { ok: true };
}

/**
 * W3 §67 — validate, never repair.
 *
 * A malformed history window is a defect somewhere upstream, and silently
 * patching it would turn that defect into a chart the trader is entitled to
 * believe. So every failure here rejects the whole response and the chart says
 * so (§55), while the live feed and execution carry on.
 *
 * Identity (`requestId`, symbol, timeframe, generation) is checked by the
 * caller before this runs — that is race protection, not payload validity, and
 * an obsolete generation's response must be dropped silently rather than
 * reported as an error (§34).
 */
export function validateHistoryWindow(
  result: Pick<
    MarketHistoryResult,
    'timeframe' | 'candles' | 'currentCandle' | 'historyThrough' | 'nextCursor'
  >,
  expected: { limit: number },
): HistoryValidation {
  const { candles, timeframe } = result;

  if (candles.length > expected.limit) {
    return invalid(`received ${candles.length} candles for a limit of ${expected.limit}`);
  }
  if (candles.length > MAX_HISTORY_CANDLE_LIMIT) {
    return invalid(
      `received ${candles.length} candles, above the ${MAX_HISTORY_CANDLE_LIMIT} ceiling`,
    );
  }

  let previousStart: number | null = null;
  for (const candle of candles) {
    const shape = validateCandleShape(candle, timeframe, `candle ${candle.startTime}`);
    if (!shape.ok) return shape;
    if (previousStart !== null) {
      if (candle.startTime === previousStart) {
        return invalid(`duplicate candle startTime ${candle.startTime}`);
      }
      if (candle.startTime < previousStart) {
        return invalid(
          `candle startTime ${candle.startTime} follows ${previousStart} — not ascending`,
        );
      }
    }
    previousStart = candle.startTime;
  }

  const newestFinalized = previousStart;

  if (result.currentCandle !== null) {
    const shape = validateCandleShape(result.currentCandle, timeframe, 'currentCandle');
    if (!shape.ok) return shape;
    // A current candle at or before the newest finalized bucket would mean the
    // store finalized a bucket it is still aggregating — an integrity fault,
    // not something to reconcile.
    if (newestFinalized !== null && result.currentCandle.startTime <= newestFinalized) {
      return invalid(
        `currentCandle startTime ${result.currentCandle.startTime} is not after the newest finalized candle ${newestFinalized}`,
      );
    }
  }

  if (newestFinalized !== null) {
    const expectedThrough = bucketEndSeconds(newestFinalized, timeframe);
    if (result.historyThrough !== expectedThrough) {
      return invalid(
        `historyThrough ${String(result.historyThrough)} does not match the newest finalized bucket's end ${expectedThrough}`,
      );
    }
    const oldest = candles[0]?.startTime;
    if (result.nextCursor !== null && result.nextCursor !== oldest) {
      return invalid(
        `nextCursor ${String(result.nextCursor)} is not the oldest returned candle ${String(oldest)}`,
      );
    }
  } else if (result.historyThrough !== null) {
    return invalid('historyThrough is set but no finalized candles were returned');
  }

  return { ok: true };
}

/**
 * W3 §66 — deterministic same-epoch merge.
 *
 * Reconnecting onto the same process memory can return finalized candles the
 * browser already has, plus ones it missed while disconnected. Identical
 * repeats dedupe. A *conflict* — same bucket, different OHLC — is not
 * reconciled and not last-write-wins: for an observed-memory source it means
 * the two sides disagree about what the market did, so the caller is told to
 * throw its series away and rehydrate from the source (§66).
 */
export type HistoryMergeResult =
  { status: 'merged'; candles: MarketCandle[] } | { status: 'conflict'; startTime: number };

function sameCandle(a: MarketCandle, b: MarketCandle): boolean {
  return a.open === b.open && a.high === b.high && a.low === b.low && a.close === b.close;
}

export function mergeFinalizedCandles(
  existing: readonly MarketCandle[],
  incoming: readonly MarketCandle[],
): HistoryMergeResult {
  const byStart = new Map<number, MarketCandle>();
  for (const candle of existing) byStart.set(candle.startTime, candle);
  for (const candle of incoming) {
    const previous = byStart.get(candle.startTime);
    if (previous && !sameCandle(previous, candle)) {
      return { status: 'conflict', startTime: candle.startTime };
    }
    byStart.set(candle.startTime, candle);
  }
  return {
    status: 'merged',
    candles: [...byStart.values()].sort((a, b) => a.startTime - b.startTime),
  };
}
