import { HistoricalProviderError } from '@wariba/adapters';

/**
 * WX3 — provider request pacing and retry policy.
 *
 * A historical backfill is the one code path in WariX that can issue hundreds
 * of outbound requests from a single user action, against an account whose
 * daily budget is measured in hundreds of credits. Pacing therefore belongs in
 * the engine, not in each adapter: one place to reason about, one place to
 * tune, and no adapter able to opt out of it.
 */

export interface RateLimiterOptions {
  /** Requests permitted per rolling window. */
  capacity: number;
  windowMs: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface RateLimiter {
  acquire(): Promise<void>;
  /** Honour a provider's explicit back-pressure signal for every caller, not just the one that got the 429. */
  penalize(retryAfterMs: number): void;
  readonly pending: number;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  });

/**
 * A rolling-window limiter rather than a token bucket.
 *
 * Twelve Data's Basic limit is "8 credits per minute", which is a window, not a
 * refill rate; a token bucket smooths bursts the provider actually permits and
 * still allows a burst the provider does not. Recording timestamps and
 * counting is both simpler and closer to what the vendor measures.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const recent: number[] = [];
  let penaltyUntil = 0;
  let waiting = 0;

  async function acquire(): Promise<void> {
    waiting += 1;
    try {
      for (;;) {
        const currentTime = now();
        while (recent.length > 0 && (recent[0] ?? 0) <= currentTime - options.windowMs) {
          recent.shift();
        }
        if (penaltyUntil > currentTime) {
          await sleep(penaltyUntil - currentTime);
          continue;
        }
        if (recent.length < options.capacity) {
          recent.push(currentTime);
          return;
        }
        const oldest = recent[0] ?? currentTime;
        await sleep(Math.max(1, oldest + options.windowMs - currentTime));
      }
    } finally {
      waiting -= 1;
    }
  }

  return {
    acquire,
    penalize(retryAfterMs: number): void {
      penaltyUntil = Math.max(penaltyUntil, now() + Math.max(0, retryAfterMs));
    },
    get pending(): number {
      return waiting;
    },
  };
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (attempt: number, error: HistoricalProviderError, delayMs: number) => void;
}

/**
 * Retries only what `HistoricalProviderError` classifies as retryable.
 *
 * Full jitter, not fixed backoff: without it, twenty coalesced backfills that
 * hit the same 429 retry in lockstep and reproduce the burst that caused it.
 * A provider-supplied `Retry-After` always wins over the computed delay —
 * guessing shorter than the vendor asked is how a key gets suspended.
 */
export async function withProviderRetry<T>(
  work: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;
  let attempt = 0;
  for (;;) {
    try {
      return await work();
    } catch (error: unknown) {
      attempt += 1;
      if (!(error instanceof HistoricalProviderError) || !error.retryable) throw error;
      if (attempt >= options.maxAttempts) throw error;
      const exponential = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** (attempt - 1));
      const delayMs = error.retryAfterMs ?? Math.round(exponential * random());
      options.onRetry?.(attempt, error, delayMs);
      await sleep(delayMs);
    }
  }
}
