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

/** The timeframes the UI actually offers today. W3 adds none (§12/§48). */
export const CANDLE_TIMEFRAMES = ['5s', '30s', '1m'] as const;
export type CandleTimeframe = (typeof CANDLE_TIMEFRAMES)[number];
export const candleTimeframeSchema = z.enum(CANDLE_TIMEFRAMES);

const TIMEFRAME_SECONDS: Record<CandleTimeframe, number> = {
  '5s': 5,
  '30s': 30,
  '1m': 60,
};

export function timeframeSeconds(timeframe: CandleTimeframe): number {
  return TIMEFRAME_SECONDS[timeframe];
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
export function bucketStartSeconds(unixMilliseconds: number, timeframe: CandleTimeframe): number {
  const seconds = Math.floor(unixMilliseconds / 1000);
  const duration = timeframeSeconds(timeframe);
  return Math.floor(seconds / duration) * duration;
}

/** Convenience for an ISO timestamp, which is what `MarketTick` carries. */
export function bucketStartForTimestamp(timestamp: string, timeframe: CandleTimeframe): number {
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
  readonly timeframe: CandleTimeframe;
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

export function createCandleAggregator(timeframe: CandleTimeframe): CandleAggregator {
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
