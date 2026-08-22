import { describe, expect, it } from 'vitest';
import type { MarketCandle } from '../src/market-candles';
import {
  classifyGaps,
  isWithinWeekendClosure,
  reconnectRepairRange,
} from '../src/market-history-gaps';

const HOUR = 3600;
const DAY = 86_400;

/** 2026-08-21 is a Friday; asserted rather than assumed. */
const FRIDAY = Date.UTC(2026, 7, 21) / 1000;

function candle(startTime: number): MarketCandle {
  return { startTime, open: '1.1', high: '1.2', low: '1.0', close: '1.15' };
}

describe('isWithinWeekendClosure', () => {
  it('agrees that the anchor day is a Friday', () => {
    expect(new Date(FRIDAY * 1000).getUTCDay()).toBe(5);
  });

  it('treats Friday evening through Sunday evening as closed', () => {
    expect(isWithinWeekendClosure(FRIDAY + 12 * HOUR)).toBe(false);
    expect(isWithinWeekendClosure(FRIDAY + 22 * HOUR)).toBe(true);
    expect(isWithinWeekendClosure(FRIDAY + DAY + 12 * HOUR)).toBe(true);
    expect(isWithinWeekendClosure(FRIDAY + 2 * DAY + 12 * HOUR)).toBe(true);
    expect(isWithinWeekendClosure(FRIDAY + 2 * DAY + 21 * HOUR)).toBe(false);
  });
});

describe('classifyGaps', () => {
  it('does not report a weekend as missing data', () => {
    const fridayLastHour = FRIDAY + 20 * HOUR;
    // Sunday 21:00 UTC — 17:00 New York, which is the actual reopen in August.
    // The previous fixed-UTC approximation put it an hour later and would have
    // hidden a genuine hour of missing Sunday-evening data.
    const sundayReopen = FRIDAY + 2 * DAY + 21 * HOUR;
    const summary = classifyGaps([candle(fridayLastHour), candle(sundayReopen)], {
      timeframe: '1h',
      providerCanRepair: true,
    });
    expect(summary.expectedSession).toBe(1);
    expect(summary.unexpected).toBe(0);
  });

  it('reports a weekday hole as recoverable when a provider can repair it', () => {
    const monday = FRIDAY + 3 * DAY;
    const summary = classifyGaps([candle(monday + HOUR), candle(monday + 5 * HOUR)], {
      timeframe: '1h',
      providerCanRepair: true,
    });
    expect(summary.recoverable).toBe(1);
    expect(summary.unexpected).toBe(1);
  });

  it('reports a weekday hole as unrecoverable with no historical provider', () => {
    const monday = FRIDAY + 3 * DAY;
    const summary = classifyGaps([candle(monday + HOUR), candle(monday + 5 * HOUR)], {
      timeframe: '1h',
      providerCanRepair: false,
    });
    expect(summary.unrecoverable).toBe(1);
  });

  it('reports a hole older than the archive as a provider data gap', () => {
    const monday = FRIDAY + 3 * DAY;
    const summary = classifyGaps([candle(monday + HOUR), candle(monday + 5 * HOUR)], {
      timeframe: '1h',
      providerCanRepair: true,
      providerEarliest: monday + 6 * HOUR,
    });
    expect(summary.providerData).toBe(1);
  });

  it('never explains a missing week away as a session closure', () => {
    const monday = Date.UTC(2026, 7, 17) / 1000;
    const summary = classifyGaps([candle(monday), candle(monday + 3 * 7 * DAY)], {
      timeframe: '1W',
      providerCanRepair: true,
    });
    expect(summary.expectedSession).toBe(0);
    expect(summary.recoverable).toBe(1);
  });

  it('finds no gap in a contiguous series', () => {
    const monday = FRIDAY + 3 * DAY;
    const summary = classifyGaps(
      [candle(monday), candle(monday + HOUR), candle(monday + 2 * HOUR)],
      { timeframe: '1h', providerCanRepair: true },
    );
    expect(summary.gaps).toEqual([]);
    expect(summary.unexpected).toBe(0);
  });
});

describe('reconnectRepairRange', () => {
  it('asks only for the span since the last durable bar', () => {
    const range = reconnectRepairRange(FRIDAY, FRIDAY + 3 * HOUR, '1h');
    expect(range).toEqual({ from: FRIDAY + HOUR, to: FRIDAY + 3 * HOUR });
  });

  it('bounds a long outage instead of backfilling a month on the hot path', () => {
    const now = FRIDAY + 40 * DAY;
    const range = reconnectRepairRange(FRIDAY, now, '1h');
    expect(range?.from).toBe(now - 7 * DAY);
  });

  it('returns null when the cache is already current', () => {
    expect(reconnectRepairRange(FRIDAY, FRIDAY + 10, '1h')).toBeNull();
    expect(reconnectRepairRange(null, FRIDAY, '1h')).toBeNull();
  });
});

describe('daily gap classification', () => {
  /**
   * The regression this exists for: an hourly probe over a Friday→Monday hole
   * sees the Sunday 22:00 reopen and calls the whole weekend missing data. On a
   * real EURUSD daily archive that mislabelled 349 weekends as gaps.
   */
  it('does not report a Friday-to-Monday weekend as missing daily data', () => {
    const friday = Date.UTC(2026, 7, 21) / 1000;
    const monday = Date.UTC(2026, 7, 24) / 1000;
    const summary = classifyGaps([candle(friday), candle(monday)], {
      timeframe: '1D',
      providerCanRepair: true,
    });
    expect(summary.expectedSession).toBe(1);
    expect(summary.unexpected).toBe(0);
  });

  it('does not report a Saturday-to-Monday hole as missing daily data', () => {
    const saturday = Date.UTC(2026, 7, 22) / 1000;
    const monday = Date.UTC(2026, 7, 24) / 1000;
    const summary = classifyGaps([candle(saturday), candle(monday)], {
      timeframe: '1D',
      providerCanRepair: true,
    });
    expect(summary.expectedSession).toBe(1);
  });

  it('still reports a missing midweek day as a genuine gap', () => {
    const tuesday = Date.UTC(2026, 7, 18) / 1000;
    const thursday = Date.UTC(2026, 7, 20) / 1000;
    const summary = classifyGaps([candle(tuesday), candle(thursday)], {
      timeframe: '1D',
      providerCanRepair: true,
    });
    expect(summary.expectedSession).toBe(0);
    expect(summary.recoverable).toBe(1);
  });
});
