import { describe, expect, it } from 'vitest';
import {
  computePayoutBufferFloor,
  computeEligibleExcess,
  isPayoutBufferReached,
  computePerformanceDayThreshold,
  isPerformanceDayQualified,
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
