import { describe, expect, it } from 'vitest';
import {
  HistoricalProviderError,
  derivedTimeframes,
  isRetryableProviderErrorKind,
  normalizeProviderBars,
  pageCoverageEnd,
  type HistoricalBar,
} from '../src/historical-market-data-provider';

const DAY = 86_400;

function bar(overrides: Partial<HistoricalBar> & { startTime: number }): HistoricalBar {
  return {
    open: '1.10000',
    high: '1.10500',
    low: '1.09500',
    close: '1.10200',
    volume: null,
    ...overrides,
  };
}

describe('normalizeProviderBars', () => {
  it('sorts ascending and keeps canonical bars', () => {
    const { bars, rejected } = normalizeProviderBars(
      [bar({ startTime: 2 * DAY }), bar({ startTime: 0 }), bar({ startTime: DAY })],
      '1D',
    );
    expect(rejected).toEqual([]);
    expect(bars.map((entry) => entry.startTime)).toEqual([0, DAY, 2 * DAY]);
  });

  it('rejects a bar whose start is not aligned to the timeframe', () => {
    const { bars, rejected } = normalizeProviderBars([bar({ startTime: DAY + 60 })], '1D');
    expect(bars).toEqual([]);
    expect(rejected[0]?.reason).toBe('start_time_misaligned_for_1D');
  });

  it('rejects a high below the open instead of repairing it', () => {
    const { bars, rejected } = normalizeProviderBars(
      [bar({ startTime: 0, high: '1.09600' })],
      '1D',
    );
    expect(bars).toEqual([]);
    expect(rejected[0]?.reason).toBe('ohlc_high_below_open_or_close');
  });

  it('rejects a high below the low', () => {
    const { rejected } = normalizeProviderBars(
      [bar({ startTime: 0, open: '1.09200', close: '1.09300', high: '1.09000', low: '1.09500' })],
      '1D',
    );
    expect(rejected[0]?.reason).toBe('ohlc_high_below_low');
  });

  it('rejects a low above the open', () => {
    const { rejected } = normalizeProviderBars([bar({ startTime: 0, low: '1.10100' })], '1D');
    expect(rejected[0]?.reason).toBe('ohlc_low_above_open_or_close');
  });

  it('rejects a non-positive price', () => {
    const { rejected } = normalizeProviderBars([bar({ startTime: 0, low: '0' })], '1D');
    expect(rejected[0]?.reason).toBe('low_not_a_positive_decimal_string');
  });

  it('collapses an identical duplicate bucket without complaint', () => {
    const { bars, rejected } = normalizeProviderBars(
      [bar({ startTime: 0 }), bar({ startTime: 0 })],
      '1D',
    );
    expect(bars).toHaveLength(1);
    expect(rejected).toEqual([]);
  });

  it('reports a duplicate bucket carrying different OHLC', () => {
    const { bars, rejected } = normalizeProviderBars(
      [bar({ startTime: 0 }), bar({ startTime: 0, close: '1.10300' })],
      '1D',
    );
    expect(bars).toHaveLength(1);
    expect(rejected[0]?.reason).toBe('duplicate_bucket_with_conflicting_ohlc');
  });

  it('enforces the exclusive before cursor', () => {
    const { bars, rejected } = normalizeProviderBars(
      [bar({ startTime: 0 }), bar({ startTime: DAY })],
      '1D',
      { before: DAY },
    );
    expect(bars.map((entry) => entry.startTime)).toEqual([0]);
    expect(rejected[0]?.reason).toBe('start_time_at_or_after_exclusive_before_cursor');
  });

  it('enforces the inclusive after bound', () => {
    const { bars, rejected } = normalizeProviderBars(
      [bar({ startTime: 0 }), bar({ startTime: DAY })],
      '1D',
      { after: DAY },
    );
    expect(bars.map((entry) => entry.startTime)).toEqual([DAY]);
    expect(rejected[0]?.reason).toBe('start_time_before_inclusive_after_bound');
  });

  it('rejects a NaN start time rather than dropping it silently', () => {
    const { rejected } = normalizeProviderBars([bar({ startTime: Number.NaN })], '1D');
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.startTime).toBeNull();
  });

  it('rejects volume whose semantics are unknown', () => {
    const { rejected } = normalizeProviderBars(
      [bar({ startTime: 0, volume: { value: '10', semantics: 'guessed' as 'tick' } })],
      '1D',
    );
    expect(rejected[0]?.reason).toBe('volume_semantics_unknown');
  });

  it('accepts a calendar month bar aligned to the first of the month', () => {
    const january = Date.UTC(2026, 0, 1) / 1000;
    const { bars, rejected } = normalizeProviderBars([bar({ startTime: january })], '1M');
    expect(rejected).toEqual([]);
    expect(bars).toHaveLength(1);
  });

  it('rejects a 30-day "month" that is not a calendar month start', () => {
    const notAMonthStart = Date.UTC(2026, 0, 31) / 1000;
    const { rejected } = normalizeProviderBars([bar({ startTime: notAMonthStart })], '1M');
    expect(rejected[0]?.reason).toBe('start_time_misaligned_for_1M');
  });

  it('accepts an ISO week starting on a Monday and rejects other days', () => {
    const monday = Date.UTC(2026, 7, 17) / 1000;
    expect(normalizeProviderBars([bar({ startTime: monday })], '1W').bars).toHaveLength(1);
    expect(normalizeProviderBars([bar({ startTime: monday + DAY })], '1W').rejected).toHaveLength(
      1,
    );
  });
});

describe('provider error classification', () => {
  it('retries only genuinely transient kinds', () => {
    expect(isRetryableProviderErrorKind('rate_limited')).toBe(true);
    expect(isRetryableProviderErrorKind('timeout')).toBe(true);
    expect(isRetryableProviderErrorKind('transport')).toBe(true);
    expect(isRetryableProviderErrorKind('authentication')).toBe(false);
    expect(isRetryableProviderErrorKind('unsupported_symbol')).toBe(false);
    expect(isRetryableProviderErrorKind('malformed_response')).toBe(false);
  });

  it('carries a provider Retry-After through to the caller', () => {
    const error = new HistoricalProviderError('rate_limited', 'slow down', { retryAfterMs: 4000 });
    expect(error.retryable).toBe(true);
    expect(error.retryAfterMs).toBe(4000);
  });
});

describe('derivedTimeframes', () => {
  it('names every canonical interval a provider does not serve natively', () => {
    expect(derivedTimeframes(['1m', '5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M'])).toEqual([
      '3m',
    ]);
  });
});

describe('pageCoverageEnd', () => {
  it('reports the exclusive end of the newest bar', () => {
    expect(
      pageCoverageEnd({ timeframe: '1D', bars: [bar({ startTime: 0 }), bar({ startTime: DAY })] }),
    ).toBe(2 * DAY);
  });

  it('is null for an empty page', () => {
    expect(pageCoverageEnd({ timeframe: '1D', bars: [] })).toBeNull();
  });
});
