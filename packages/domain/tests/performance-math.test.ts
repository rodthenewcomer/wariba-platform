import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';
import {
  computePayoutBufferFloor,
  computeEligibleExcess,
  computeBufferBuildProgress,
  isPayoutBufferReached,
  computePerformanceDayThreshold,
  isPerformanceDayQualified,
  resolveTraderSplitRate,
  computeMaxGrossBaseFromCap,
  computeRequestedGrossBase,
  computeApprovedGrossBase,
  computeTraderNetCash,
  computeWaribaShare,
} from '../src/performance-math';

// Rates below are PERF-023..026 (docs/00-decisions/DECISION_LOG.md), pinned
// to the published WARIBA_PERFORMANCE policy_versions v1.0.0 row.
const PERMANENT_BUFFER_RATE = '0.10';
const PERFORMANCE_DAY_THRESHOLD_RATE = '0.005';

describe('computePayoutBufferFloor — PERF-023', () => {
  it('10K account floors at 11,000 (10% permanent buffer)', () => {
    expect(
      computePayoutBufferFloor({
        nominalBalance: '10000',
        permanentBufferRate: PERMANENT_BUFFER_RATE,
      }),
    ).toBe('11000.00');
  });

  it('matches the Program Rulebook v1.1 §8 table for every candidate size', () => {
    const sizes: Array<[string, string]> = [
      ['5000', '5500.00'],
      ['10000', '11000.00'],
      ['25000', '27500.00'],
      ['50000', '55000.00'],
      ['100000', '110000.00'],
    ];
    for (const [nominalBalance, expectedFloor] of sizes) {
      expect(
        computePayoutBufferFloor({ nominalBalance, permanentBufferRate: PERMANENT_BUFFER_RATE }),
      ).toBe(expectedFloor);
    }
  });
});

describe('computeEligibleExcess / isPayoutBufferReached — PERF-024', () => {
  it('is zero exactly at the buffer floor, and reached is true (not withdrawable, but not below floor)', () => {
    expect(computeEligibleExcess({ realizedBalance: '11000', bufferFloor: '11000.00' })).toBe(
      '0.00',
    );
    expect(isPayoutBufferReached({ realizedBalance: '11000', bufferFloor: '11000.00' })).toBe(true);
  });

  it('never goes negative below the floor', () => {
    expect(computeEligibleExcess({ realizedBalance: '10500', bufferFloor: '11000.00' })).toBe(
      '0.00',
    );
    expect(isPayoutBufferReached({ realizedBalance: '10500', bufferFloor: '11000.00' })).toBe(
      false,
    );
  });

  it('is exactly the amount above the floor', () => {
    expect(computeEligibleExcess({ realizedBalance: '11500.50', bufferFloor: '11000.00' })).toBe(
      '500.50',
    );
  });
});

describe('computePerformanceDayThreshold / isPerformanceDayQualified — PERF-025/026', () => {
  it('matches the Program Rulebook v1.1 §7.1 table for every candidate size', () => {
    const sizes: Array<[string, string]> = [
      ['5000', '25.00'],
      ['10000', '50.00'],
      ['25000', '125.00'],
      ['50000', '250.00'],
      ['100000', '500.00'],
    ];
    for (const [nominalBalance, expectedThreshold] of sizes) {
      expect(
        computePerformanceDayThreshold({
          nominalBalance,
          performanceDayThresholdRate: PERFORMANCE_DAY_THRESHOLD_RATE,
        }),
      ).toBe(expectedThreshold);
    }
  });

  it('qualifies a day at exactly the threshold', () => {
    expect(
      isPerformanceDayQualified({
        eligibleRealizedNetProfitForDay: '50.00',
        performanceDayThreshold: '50.00',
      }),
    ).toBe(true);
  });

  it('does not qualify a day one cent under the threshold', () => {
    expect(
      isPerformanceDayQualified({
        eligibleRealizedNetProfitForDay: '49.99',
        performanceDayThreshold: '50.00',
      }),
    ).toBe(false);
  });

  it('does not qualify a negative (loss) day', () => {
    expect(
      isPerformanceDayQualified({
        eligibleRealizedNetProfitForDay: '-10.00',
        performanceDayThreshold: '50.00',
      }),
    ).toBe(false);
  });
});

describe('resolveTraderSplitRate — PERF-027/028', () => {
  it('uses the explicit V2 payout-rank schedule when present', () => {
    expect(
      resolveTraderSplitRate({
        cycleNumber: 3,
        maxPayoutCyclesBeforeReview: 5,
        defaultSplitRate: '0.80',
        finalCycleSplitRate: '0.90',
        splitSchedule: ['0.80', '0.80', '0.85', '0.85', '0.90'],
      }),
    ).toBe('0.85');
  });

  it('uses the default split for cycles 1 through 4', () => {
    for (const cycleNumber of [1, 2, 3, 4]) {
      expect(
        resolveTraderSplitRate({
          cycleNumber,
          maxPayoutCyclesBeforeReview: 5,
          defaultSplitRate: '0.85',
          finalCycleSplitRate: '0.90',
        }),
      ).toBe('0.85');
    }
  });

  it('uses the richer final-cycle split at exactly the max cycle', () => {
    expect(
      resolveTraderSplitRate({
        cycleNumber: 5,
        maxPayoutCyclesBeforeReview: 5,
        defaultSplitRate: '0.85',
        finalCycleSplitRate: '0.90',
      }),
    ).toBe('0.90');
  });
});

describe('the payout formula — PERF-024/027/028/029/030', () => {
  it('is excess-limited when the buffer excess is the smallest of the three', () => {
    const splitRate = resolveTraderSplitRate({
      cycleNumber: 1,
      maxPayoutCyclesBeforeReview: 5,
      defaultSplitRate: '0.85',
      finalCycleSplitRate: '0.90',
    });
    const maxGrossBaseFromCap = computeMaxGrossBaseFromCap({ cap: '500', splitRate });
    const requestedGrossBase = computeRequestedGrossBase({
      requestedNetTraderCash: '1000',
      splitRate,
    });
    const approvedGrossBase = computeApprovedGrossBase({
      eligibleExcess: '200.00', // smaller than both the cap-derived and request-derived bases
      requestedGrossBase,
      maxGrossBaseFromCap,
    });
    expect(approvedGrossBase).toBe('200.00');
    const traderNetCash = computeTraderNetCash({ approvedGrossBase, splitRate });
    const waribaShare = computeWaribaShare({ approvedGrossBase, traderNetCash });
    // Reconciliation invariant — must always hold exactly, to the cent.
    expect(new Decimal(traderNetCash).plus(waribaShare).toFixed(2)).toBe(approvedGrossBase);
  });

  it('is cap-limited when the trader requests more than the 10K/cycle-1 cap allows, even with ample excess', () => {
    const splitRate = resolveTraderSplitRate({
      cycleNumber: 1,
      maxPayoutCyclesBeforeReview: 5,
      defaultSplitRate: '0.85',
      finalCycleSplitRate: '0.90',
    });
    // 10K cycle #1 cap per the Program Rulebook v1.1 §10 table.
    const maxGrossBaseFromCap = computeMaxGrossBaseFromCap({ cap: '500', splitRate });
    expect(maxGrossBaseFromCap).toBe('588.24');
    const requestedGrossBase = computeRequestedGrossBase({
      requestedNetTraderCash: '1000',
      splitRate,
    });
    const approvedGrossBase = computeApprovedGrossBase({
      eligibleExcess: '5000.00', // far more than enough
      requestedGrossBase,
      maxGrossBaseFromCap,
    });
    expect(approvedGrossBase).toBe('588.24');
    const traderNetCash = computeTraderNetCash({ approvedGrossBase, splitRate });
    // Capped at (approximately) the 500 USD net cap, not the 1000 requested.
    expect(traderNetCash).toBe('500.00');
    expect(new Decimal(traderNetCash).lessThanOrEqualTo('500.01')).toBe(true);
  });

  it('is request-limited when the trader asks for less than either the excess or the cap allow', () => {
    const splitRate = resolveTraderSplitRate({
      cycleNumber: 1,
      maxPayoutCyclesBeforeReview: 5,
      defaultSplitRate: '0.85',
      finalCycleSplitRate: '0.90',
    });
    const maxGrossBaseFromCap = computeMaxGrossBaseFromCap({ cap: '1000', splitRate });
    const requestedGrossBase = computeRequestedGrossBase({
      requestedNetTraderCash: '100',
      splitRate,
    });
    const approvedGrossBase = computeApprovedGrossBase({
      eligibleExcess: '5000.00',
      requestedGrossBase,
      maxGrossBaseFromCap,
    });
    expect(approvedGrossBase).toBe(requestedGrossBase);
    const traderNetCash = computeTraderNetCash({ approvedGrossBase, splitRate });
    expect(traderNetCash).toBe('100.00');
  });

  it('at payout #5, the richer 90% split applies instead of 85%, for the same gross base', () => {
    const cycle1Split = resolveTraderSplitRate({
      cycleNumber: 1,
      maxPayoutCyclesBeforeReview: 5,
      defaultSplitRate: '0.85',
      finalCycleSplitRate: '0.90',
    });
    const cycle5Split = resolveTraderSplitRate({
      cycleNumber: 5,
      maxPayoutCyclesBeforeReview: 5,
      defaultSplitRate: '0.85',
      finalCycleSplitRate: '0.90',
    });
    expect(computeTraderNetCash({ approvedGrossBase: '1000.00', splitRate: cycle1Split })).toBe(
      '850.00',
    );
    expect(computeTraderNetCash({ approvedGrossBase: '1000.00', splitRate: cycle5Split })).toBe(
      '900.00',
    );
  });

  it('property: trader cash never exceeds the approved gross base, across a spread of splits and amounts', () => {
    const cases: Array<[string, string]> = [
      ['0.85', '333.33'],
      ['0.90', '999.99'],
      ['0.85', '1.00'],
      ['0.90', '0.01'],
    ];
    for (const [splitRate, approvedGrossBase] of cases) {
      const traderNetCash = computeTraderNetCash({ approvedGrossBase, splitRate });
      expect(new Decimal(traderNetCash).lessThanOrEqualTo(approvedGrossBase)).toBe(true);
      expect(new Decimal(traderNetCash).greaterThanOrEqualTo(0)).toBe(true);
    }
  });
});

/*
 * Phase 3.3.2 A1 — buffer build progress.
 *
 * The defect this replaces divided the realized balance by the buffer floor
 * (10 000 / 11 000 = 91 %) and showed the result as payout progress. A brand
 * new Performance account has built none of its buffer, so the only truthful
 * number it can show is zero.
 */
describe('computeBufferBuildProgress', () => {
  const fresh = {
    realizedBalance: '10000.00',
    nominalBalance: '10000.00',
    bufferFloor: '11000.00',
  };

  it('reports zero on an account that has not traded', () => {
    expect(computeBufferBuildProgress(fresh)).toEqual({
      requiredAmount: '1000.00',
      builtAmount: '0.00',
      remainingAmount: '1000.00',
      percent: 0,
    });
  });

  it('never reports the balance/floor ratio as progress', () => {
    expect(computeBufferBuildProgress(fresh).percent).not.toBe(91);
  });

  it('measures progress from the nominal balance, not from zero', () => {
    expect(computeBufferBuildProgress({ ...fresh, realizedBalance: '10250.00' })).toEqual({
      requiredAmount: '1000.00',
      builtAmount: '250.00',
      remainingAmount: '750.00',
      percent: 25,
    });
  });

  it('clamps a drawdown below nominal to zero rather than a negative bar', () => {
    expect(computeBufferBuildProgress({ ...fresh, realizedBalance: '9400.00' })).toEqual({
      requiredAmount: '1000.00',
      builtAmount: '0.00',
      remainingAmount: '1000.00',
      percent: 0,
    });
  });

  it('clamps at the floor — excess above it is eligible cash, not more buffer', () => {
    expect(computeBufferBuildProgress({ ...fresh, realizedBalance: '12500.00' })).toEqual({
      requiredAmount: '1000.00',
      builtAmount: '1000.00',
      remainingAmount: '0.00',
      percent: 100,
    });
  });

  it('treats a policy with no permanent buffer as already satisfied', () => {
    expect(
      computeBufferBuildProgress({
        realizedBalance: '10000.00',
        nominalBalance: '10000.00',
        bufferFloor: '10000.00',
      }),
    ).toEqual({
      requiredAmount: '0.00',
      builtAmount: '0.00',
      remainingAmount: '0.00',
      percent: 100,
    });
  });
});
