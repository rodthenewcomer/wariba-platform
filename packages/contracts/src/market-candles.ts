import Decimal from 'decimal.js';
import { z } from 'zod';

/**
 * Canonical candle semantics — W3 §7/§8/§9.
 *
 * There is exactly one bucket function, one mid-price function and one
 * aggregator in the repository, and every consumer uses them: the browser's
 * live chart, the realtime process's observed-history store, and every test
 * that asserts a boundary. Three separate implementations of "which candle
 * does this tick belong to" is how a history series and a live series quietly
 * stop describing the same market.
 *
 * This module is deliberately pure: no provider, no transport, no React, no
 * renderer. It lives in `contracts` because that is the one layer both the
 * realtime service and the web app already depend on, and because bucket and
 * price basis *are* contract semantics — they define what a candle means.
 *
 * Nothing here participates in execution. Candles are display data (W3 §42).
 */

/**
 * WX2 professional timeframe family. Sub-minute quote buckets from W3/W5 are
 * intentionally not UI intervals anymore; WX2 starts at one minute and gains
 * the durable depth required for day/week/month charts.
 *
 * Ordered shortest-first because that is the order the toolbar reads in, and
 * every consumer — the server's aggregator loop, the toolbar, the preference
 * parser, the tests — iterates *this* array rather than repeating the list.
 * Adding an interval is therefore a one-line change here plus its canonical
 * boundary rule below, which is the whole point of the shared type (W5 §9).
 * Tick charts (1000T/5000T) remain excluded: the feed publishes quote updates,
 * not exchange trade events, and equating the two would fabricate a market
 * semantic (W5 §8, `TICK_CHARTS_READY = false`).
 */
export const CANDLE_TIMEFRAMES = [
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '1h',
  '4h',
  '1D',
  '1W',
  '1M',
] as const;
export type CandleTimeframe = (typeof CANDLE_TIMEFRAMES)[number];
export const INTERNAL_CANDLE_TIMEFRAMES = ['5s', '15s', '30s'] as const;
export type InternalCandleTimeframe = (typeof INTERNAL_CANDLE_TIMEFRAMES)[number];
export const SUPPORTED_CANDLE_TIMEFRAMES = [
  ...INTERNAL_CANDLE_TIMEFRAMES,
  ...CANDLE_TIMEFRAMES,
] as const;
export type SupportedCandleTimeframe = (typeof SUPPORTED_CANDLE_TIMEFRAMES)[number];
export const candleTimeframeSchema = z.enum(CANDLE_TIMEFRAMES);

/**
 * W5 §15 — the shipped default, stated rather than positional.
 *
 * It was `CANDLE_TIMEFRAMES[0]` in W4, which happened to be `5s`. Naming it
 * means inserting an interval at the front of the list can no longer silently
 * change what every trader sees on open.
 */
export const DEFAULT_CANDLE_TIMEFRAME: CandleTimeframe = '5m';

const TIMEFRAME_SECONDS: Record<SupportedCandleTimeframe, number> = {
  '5s': 5,
  '15s': 15,
  '30s': 30,
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1D': 86400,
  '1W': 604800,
  // Nominal duration for UI coverage/indicator gap heuristics only. Calendar
  // bucketing and historyThrough use bucketEndSeconds(), never this value.
  '1M': 30 * 86400,
};

export function timeframeSeconds(timeframe: SupportedCandleTimeframe): number {
  return TIMEFRAME_SECONDS[timeframe];
}

/** Narrows unvalidated input (a stored preference, a query string) to a supported interval. */
export function isCandleTimeframe(value: unknown): value is CandleTimeframe {
  return typeof value === 'string' && (CANDLE_TIMEFRAMES as readonly string[]).includes(value);
}

/**
 * The bucket a UTC instant belongs to, as epoch **seconds**.
 *
 * `floor(unixSeconds / D) * D` — epoch-aligned, therefore UTC-aligned with no
 * local-timezone behaviour, and **left-inclusive**: an observation exactly at
 * a boundary opens the new candle rather than closing the previous one. This
 * is the semantics W0/W3 Phase A measured in the shipped chart, preserved
 * verbatim so history and live agree.
 *
 * Sub-second input is floored away before bucketing. That is honest about the
 * feed: market ticks carry second-resolution timestamps today, so pretending
 * to bucket at millisecond precision would imply a precision the source does
 * not have.
 */
export function bucketStartSeconds(
  unixMilliseconds: number,
  timeframe: SupportedCandleTimeframe,
): number {
  const seconds = Math.floor(unixMilliseconds / 1000);
  if (timeframe === '1D') {
    const date = new Date(seconds * 1000);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000;
  }
  if (timeframe === '1W') {
    const date = new Date(seconds * 1000);
    const dayStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000;
    const isoDay = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
    return dayStart - (isoDay - 1) * 86400;
  }
  if (timeframe === '1M') {
    const date = new Date(seconds * 1000);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / 1000;
  }
  const duration = timeframeSeconds(timeframe);
  return Math.floor(seconds / duration) * duration;
}

/** Exclusive end of one canonical bucket, including calendar-aware intervals. */
export function bucketEndSeconds(startTime: number, timeframe: SupportedCandleTimeframe): number {
  if (timeframe === '1M') {
    const date = new Date(startTime * 1000);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) / 1000;
  }
  return startTime + timeframeSeconds(timeframe);
}

export function isCandleStartAligned(
  startTime: number,
  timeframe: SupportedCandleTimeframe,
): boolean {
  return bucketStartSeconds(startTime * 1000, timeframe) === startTime;
}

/** Convenience for an ISO timestamp, which is what `MarketTick` carries. */
export function bucketStartForTimestamp(
  timestamp: string,
  timeframe: SupportedCandleTimeframe,
): number {
  return bucketStartSeconds(new Date(timestamp).getTime(), timeframe);
}

/**
 * The chart's price basis: mid, computed with Decimal and rounded to the
 * symbol's own precision.
 *
 * Phase A found the shipped chart computing `(Number(bid) + Number(ask)) / 2`
 * in binary floating point, which is what produced values like
 * `1.0843699999999998`. Canonical calculation is decimal; the string it
 * returns is the transport and storage representation. Conversion to `number`
 * happens only at the Lightweight Charts boundary (W3 §26).
 *
 * This is presentation basis only — it never touches execution pricing, which
 * keeps using bid/ask through the domain's own helpers.
 */
export function midPrice(bid: string, ask: string, pricePrecision: number): string {
  return new Decimal(bid).plus(new Decimal(ask)).dividedBy(2).toFixed(pricePrecision);
}

export const marketCandleSchema = z.object({
  /** Bucket start, epoch seconds, UTC. */
  startTime: z.number().int().nonnegative(),
  open: z.string(),
  high: z.string(),
  low: z.string(),
  close: z.string(),
});
export type MarketCandle = z.infer<typeof marketCandleSchema>;

/** One observation entering the aggregator. */
export interface CandleObservation {
  /** Bucket-relevant instant, epoch milliseconds. */
  timestampMs: number;
  /** Canonical mid, decimal string. */
  price: string;
}

/**
 * Applies one observation to a candle series and reports what changed.
 *
 * `finalized` is non-null exactly when this observation proved the stream has
 * entered a later bucket — the only event that finalizes a candle. A candle is
 * never closed by a timer or by wall-clock passing a boundary (W3 §10),
 * because "no tick in an interval" legitimately means "no candle", not "a flat
 * candle".
 */
export interface CandleUpdate {
  current: MarketCandle;
  finalized: MarketCandle | null;
  /** True when this observation opened a bucket that did not exist before. */
  openedNewBucket: boolean;
}

/**
 * The one candle aggregator (W3 §7).
 *
 * It is a plain object, not a hook and not a class hierarchy, so the realtime
 * process and the browser can both drive it from their own accepted-tick
 * paths. It holds only the current bucket: finalized candles are handed out
 * as they close, and whoever owns retention decides what to keep.
 */
export interface CandleAggregator {
  readonly timeframe: SupportedCandleTimeframe;
  /** Undefined until the first observation. */
  current(): MarketCandle | null;
  observe(observation: CandleObservation): CandleUpdate;
  reset(): void;
  /**
   * W3 §17/§38 — adopt an authoritative snapshot of the in-progress bucket.
   *
   * Added for history hydration: the server may already have observed part of
   * the current bucket before a browser mounted or reloaded, and that bucket's
   * true open — plus any high or low that happened pre-mount — cannot be
   * recovered from the first post-mount tick. Seeding lets the next observation
   * *extend* that bucket instead of restarting it.
   *
   * Finalizes nothing and returns nothing: it replaces the open bucket, so the
   * caller must only seed a bucket that is genuinely current. A later
   * observation in a later bucket will finalize the seeded candle normally.
   */
  seed(candle: MarketCandle): void;
}

export function createCandleAggregator(timeframe: SupportedCandleTimeframe): CandleAggregator {
  let current: MarketCandle | null = null;

  return {
    timeframe,
    current: () => current,
    reset() {
      current = null;
    },
    seed(candle) {
      current = candle;
    },
    observe({ timestampMs, price }) {
      const startTime = bucketStartSeconds(timestampMs, timeframe);

      if (current === null || startTime > current.startTime) {
        const finalized = current !== null && startTime > current.startTime ? current : null;
        current = { startTime, open: price, high: price, low: price, close: price };
        return { current, finalized, openedNewBucket: true };
      }

      // An observation older than the open bucket is not applied. The accepted
      // stream is already ordered by MarketTickGate, so this is a guard
      // against a caller feeding history into the live aggregator, not a
      // second ordering policy (W3 §17).
      if (startTime < current.startTime) {
        return { current, finalized: null, openedNewBucket: false };
      }

      // Same bucket: high and low must see *this* observation, which is the
      // whole point of driving the aggregator from the event stream rather
      // than from a React render (W3 §5).
      const value = new Decimal(price);
      current = {
        startTime: current.startTime,
        open: current.open,
        high: value.greaterThan(new Decimal(current.high)) ? price : current.high,
        low: value.lessThan(new Decimal(current.low)) ? price : current.low,
        close: price,
      };
      return { current, finalized: null, openedNewBucket: false };
    },
  };
}
