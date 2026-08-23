import { describe, expect, it } from 'vitest';
import { isBalanceHistoryMeaningful, type BalancePoint } from '../src/hub-view';

/**
 * The rule that keeps an empty chart off the dashboard.
 *
 * Worth a test rather than a code comment because the failure it prevents is
 * silent: a flat auto-scaled line looks like a working chart, so nobody
 * reviewing a screenshot notices it is drawing noise. The regression would
 * ship.
 */
const points = (...balances: number[]): BalancePoint[] =>
  balances.map((balance, index) => ({
    time: `2026-08-${String(index + 1).padStart(2, '0')}`,
    balance,
  }));

describe('isBalanceHistoryMeaningful', () => {
  it('refuses a freshly activated account with one open session', () => {
    expect(isBalanceHistoryMeaningful(points(10_000), 0)).toBe(false);
  });

  it('refuses a single closed session', () => {
    expect(isBalanceHistoryMeaningful(points(10_000, 10_120), 1)).toBe(false);
  });

  it('refuses a series that never leaves its opening balance', () => {
    // Every point identical: whatever the axis renders is auto-scaling noise.
    expect(isBalanceHistoryMeaningful(points(10_000, 10_000, 10_000), 3)).toBe(false);
  });

  it('accepts two closed sessions that actually moved', () => {
    expect(isBalanceHistoryMeaningful(points(10_000, 10_240), 2)).toBe(true);
  });

  it('accepts a longer history including a losing stretch', () => {
    expect(isBalanceHistoryMeaningful(points(10_000, 9_820, 9_950, 10_310), 4)).toBe(true);
  });

  it('refuses an empty history however many sessions are claimed', () => {
    expect(isBalanceHistoryMeaningful([], 5)).toBe(false);
  });
});
