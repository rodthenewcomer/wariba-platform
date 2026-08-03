import { describe, expect, it } from 'vitest';
import {
  computeDailyReference,
  computeDailyLossFloor,
  computeDailyLossUsed,
  isDailyLossSoftLockTriggered,
  computeInitialMaximumLossFloor,
  computeNextMaximumLossFloor,
  isMaximumLossBreached,
  computeBestDayRatio,
  isBestDayCompliant,
  computeProfitTargetRequired,
  isProfitTargetReached,
} from '../src/risk-math';

// Rate/threshold constants below are ONE-019..ONE-022 (docs/00-decisions/DECISION_LOG.md),
// pinned to the published policy_versions v1.1.0 row.
const PROFIT_TARGET_RATE = '0.10';
const DAILY_LOSS_RATE = '0.03';
const MAXIMUM_LOSS_RATE = '0.10';
const BEST_DAY_MAX_RATIO = '0.50';

describe('computeDailyReference — ONE-020', () => {
  it('takes the greater of balance and equity at reset', () => {
    expect(computeDailyReference({ balanceAtReset: '10000', equityAtReset: '10200' })).toBe(
      '10200.00',
    );
    expect(computeDailyReference({ balanceAtReset: '10000', equityAtReset: '9800' })).toBe(
      '10000.00',
    );
  });
});

describe('TV-ONE-002 — 10K daily loss exact threshold', () => {
  const dailyReference = '10000';
  const nominalBalance = '10000';

  it('daily loss floor is 9700', () => {
    expect(
      computeDailyLossFloor({ dailyReference, nominalBalance, dailyLossRate: DAILY_LOSS_RATE }),
    ).toBe('9700.00');
  });

  it('daily loss used is exactly 300 at equity 9700', () => {
    expect(computeDailyLossUsed({ dailyReference, currentAdjustedEquity: '9700' })).toBe('300.00');
  });

  it('soft-locks at the exact threshold, without hard-breaching', () => {
    expect(
      isDailyLossSoftLockTriggered({ currentAdjustedEquity: '9700', dailyLossFloor: '9700.00' }),
    ).toBe(true);
  });

  it('does not soft-lock above the floor', () => {
    expect(
      isDailyLossSoftLockTriggered({ currentAdjustedEquity: '9701', dailyLossFloor: '9700.00' }),
    ).toBe(false);
  });
});

describe('TV-ONE-003 — 10K initial maximum loss exact floor', () => {
  it('initial floor is 9000 (10% of nominal)', () => {
    expect(
      computeInitialMaximumLossFloor({
        nominalBalance: '10000',
        maximumLossRate: MAXIMUM_LOSS_RATE,
      }),
    ).toBe('9000.00');
  });

  it('hard-breaches at the exact floor', () => {
    expect(isMaximumLossBreached({ currentEquity: '9000', maximumLossFloor: '9000' })).toBe(true);
  });

  it('does not hard-breach above the floor', () => {
    expect(isMaximumLossBreached({ currentEquity: '9000.01', maximumLossFloor: '9000' })).toBe(
      false,
    );
  });
});

describe('TV-ONE-005 — EOD floor moves after a finalized day and never decreases', () => {
  it('ratchets from 9000 to 9600 on a strong day', () => {
    expect(
      computeNextMaximumLossFloor({
        previousFloor: '9000',
        highestEodBalance: '10600',
        nominalBalance: '10000',
        maximumLossRate: MAXIMUM_LOSS_RATE,
      }),
    ).toBe('9600.00');
  });

  it('property: the floor never decreases, even after a losing day', () => {
    // Highest EOD balance stays at its prior peak even if the account gives back profit —
    // the floor formula only ever ratchets up, it never re-derives from a lower balance.
    expect(
      computeNextMaximumLossFloor({
        previousFloor: '9600',
        highestEodBalance: '10600',
        nominalBalance: '10000',
        maximumLossRate: MAXIMUM_LOSS_RATE,
      }),
    ).toBe('9600.00');
  });

  it('property: the floor never exceeds the nominal balance', () => {
    expect(
      computeNextMaximumLossFloor({
        previousFloor: '9900',
        highestEodBalance: '20000',
        nominalBalance: '10000',
        maximumLossRate: MAXIMUM_LOSS_RATE,
      }),
    ).toBe('10000.00');
  });
});

describe('TV-ONE-001 — 10K target reached with Best Day exactly at the limit', () => {
  it('profit target of 1000 is required and reached at realized profit 1000', () => {
    const required = computeProfitTargetRequired({
      nominalBalance: '10000',
      profitTargetRate: PROFIT_TARGET_RATE,
    });
    expect(required).toBe('1000.00');
    expect(isProfitTargetReached({ realizedNetProfit: '1000', requiredProfit: required })).toBe(
      true,
    );
  });

  it('Best Day ratio is 0.50 and is compliant at exactly the 50% limit', () => {
    const ratio = computeBestDayRatio({
      bestProfitableFinalizedDayProfit: '500',
      sumOfPositiveDayProfits: '1000',
    });
    expect(ratio).toBe('0.5000');
    expect(isBestDayCompliant({ bestDayRatio: ratio, maxRatio: BEST_DAY_MAX_RATIO })).toBe(true);
  });
});

describe('TV-ONE-004 — target exists only after including unrealized profit', () => {
  it('is not reached when only realized profit (900) is counted, even though realized+unrealized = 1000', () => {
    const required = computeProfitTargetRequired({
      nominalBalance: '10000',
      profitTargetRate: PROFIT_TARGET_RATE,
    });
    expect(isProfitTargetReached({ realizedNetProfit: '900', requiredProfit: required })).toBe(
      false,
    );
  });
});

describe('computeBestDayRatio — ONE-022 (Best Day Rule, never a hard breach)', () => {
  it('returns null when there are no positive days yet (undefined ratio, not zero)', () => {
    expect(
      computeBestDayRatio({ bestProfitableFinalizedDayProfit: '0', sumOfPositiveDayProfits: '0' }),
    ).toBeNull();
  });

  it('property: a null ratio is never compliant (blocks pass, but is not itself a breach)', () => {
    expect(isBestDayCompliant({ bestDayRatio: null, maxRatio: BEST_DAY_MAX_RATIO })).toBe(false);
  });

  it('property: a ratio above the limit is non-compliant (blocks pass only)', () => {
    const ratio = computeBestDayRatio({
      bestProfitableFinalizedDayProfit: '700',
      sumOfPositiveDayProfits: '1000',
    });
    expect(ratio).toBe('0.7000');
    expect(isBestDayCompliant({ bestDayRatio: ratio, maxRatio: BEST_DAY_MAX_RATIO })).toBe(false);
  });
});
