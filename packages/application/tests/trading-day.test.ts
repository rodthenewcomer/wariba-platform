import { describe, expect, it } from 'vitest';
import { millisecondsUntilReset, nextResetAt, tradingDayOf } from '../src/trading-day';

/**
 * The reset boundary is the one figure on the dashboard a trader can check
 * against their own clock, so it has to agree with the finalisation job rather
 * than merely look plausible.
 */
describe('nextResetAt', () => {
  it('is the next midnight UTC', () => {
    expect(nextResetAt(new Date('2026-08-23T14:31:58.000Z')).toISOString()).toBe(
      '2026-08-24T00:00:00.000Z',
    );
  });

  it('returns the following midnight at exactly midnight, never the current instant', () => {
    // A countdown that returns "now" at 00:00:00 renders frozen at zero for the
    // whole first second of a day that has 24 hours left to run.
    expect(nextResetAt(new Date('2026-08-23T00:00:00.000Z')).toISOString()).toBe(
      '2026-08-24T00:00:00.000Z',
    );
  });

  it('crosses month and year boundaries', () => {
    expect(nextResetAt(new Date('2026-08-31T23:59:59.999Z')).toISOString()).toBe(
      '2026-09-01T00:00:00.000Z',
    );
    expect(nextResetAt(new Date('2026-12-31T12:00:00.000Z')).toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    );
  });

  it('is unaffected by the local timezone of the machine reading it', () => {
    // Two instants inside the same UTC day but on different local calendar days
    // must resolve to the same boundary, or two traders see different resets.
    const morning = nextResetAt(new Date('2026-08-23T01:00:00.000Z'));
    const night = nextResetAt(new Date('2026-08-23T23:00:00.000Z'));
    expect(morning.toISOString()).toBe(night.toISOString());
  });

  it('does not mutate the date it is given', () => {
    const now = new Date('2026-08-23T14:00:00.000Z');
    nextResetAt(now);
    expect(now.toISOString()).toBe('2026-08-23T14:00:00.000Z');
  });
});

describe('tradingDayOf', () => {
  it('is the UTC calendar day, matching account_daily_snapshots.trading_day', () => {
    expect(tradingDayOf(new Date('2026-08-23T23:59:59.999Z'))).toBe('2026-08-23');
    expect(tradingDayOf(new Date('2026-08-24T00:00:00.000Z'))).toBe('2026-08-24');
  });
});

describe('millisecondsUntilReset', () => {
  it('counts down to the boundary', () => {
    expect(millisecondsUntilReset(new Date('2026-08-23T23:59:00.000Z'))).toBe(60_000);
  });

  it('never goes negative', () => {
    expect(millisecondsUntilReset(new Date('2026-08-23T00:00:00.000Z'))).toBeGreaterThan(0);
  });
});
