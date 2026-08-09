import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';
import {
  computeApprovedGrossBase,
  computeEligibleExcess,
  computeMaxGrossBaseFromCap,
  computeProfitEligibility,
  computeRequestedGrossBase,
  computeTraderNetCash,
  computeWaribaShare,
} from '../src/index';

const SCENARIOS = 5_000;

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function cents(random: () => number, maximum: number): string {
  return new Decimal(Math.floor(random() * maximum * 100)).dividedBy(100).toFixed(2);
}

describe('financial invariants — deterministic generated sequences', () => {
  it('preserves payout accounting, caps, requests, and permanent buffer across 5,000 seeds', () => {
    for (let seed = 1; seed <= SCENARIOS; seed += 1) {
      const random = seeded(seed);
      const splitRate = random() < 0.8 ? '0.85' : '0.90';
      const bufferFloor = cents(random, 150_000);
      const realizedBalance = new Decimal(bufferFloor).plus(cents(random, 20_000)).toFixed(2);
      const eligibleExcess = computeEligibleExcess({ realizedBalance, bufferFloor });
      const requestedNetTraderCash = cents(random, 5_000);
      const requestedGrossBase = computeRequestedGrossBase({
        requestedNetTraderCash,
        splitRate,
      });
      const cap = cents(random, 3_000);
      const maxGrossBaseFromCap = computeMaxGrossBaseFromCap({ cap, splitRate });
      const approvedGrossBase = computeApprovedGrossBase({
        eligibleExcess,
        requestedGrossBase,
        maxGrossBaseFromCap,
      });
      const traderNetCash = computeTraderNetCash({ approvedGrossBase, splitRate });
      const waribaShare = computeWaribaShare({ approvedGrossBase, traderNetCash });
      const postDebitBalance = new Decimal(realizedBalance).minus(approvedGrossBase);

      try {
        expect(new Decimal(approvedGrossBase).isNegative()).toBe(false);
        expect(new Decimal(approvedGrossBase).lessThanOrEqualTo(eligibleExcess)).toBe(true);
        expect(new Decimal(approvedGrossBase).lessThanOrEqualTo(requestedGrossBase)).toBe(true);
        expect(new Decimal(approvedGrossBase).lessThanOrEqualTo(maxGrossBaseFromCap)).toBe(true);
        expect(new Decimal(traderNetCash).lessThanOrEqualTo(cap)).toBe(true);
        expect(new Decimal(traderNetCash).plus(waribaShare).toFixed(2)).toBe(approvedGrossBase);
        expect(postDebitBalance.greaterThanOrEqualTo(bufferFloor)).toBe(true);
      } catch (error) {
        throw new Error(`Generated payout invariant failed at seed ${seed}.`, { cause: error });
      }
    }
  });

  it('preserves the exact 60-second eligibility boundary and counts every net loss', () => {
    for (let seed = 1; seed <= SCENARIOS; seed += 1) {
      const random = seeded(seed * 17);
      const durationMs = Math.floor(random() * 120_002);
      const grossPnl = new Decimal(cents(random, 2_000)).minus(1_000);
      const allocatedFees = cents(random, 20);
      const netPnl = grossPnl.minus(allocatedFees).toDecimalPlaces(2);
      const openedAt = new Date('2026-01-01T00:00:00.000Z');
      const result = computeProfitEligibility({
        openedAt,
        closedAt: new Date(openedAt.getTime() + durationMs),
        realizedPnl: grossPnl.toFixed(2),
        allocatedFees,
      });

      try {
        expect(result.netRealizedPnl).toBe(netPnl.toFixed(2));
        if (netPnl.greaterThan(0) && durationMs < 60_000) {
          expect(result.eligibleRealizedPnl).toBe('0.00');
          expect(result.ineligibleShortDurationProfit).toBe(netPnl.toFixed(2));
        } else {
          expect(result.eligibleRealizedPnl).toBe(netPnl.toFixed(2));
          expect(result.ineligibleShortDurationProfit).toBe('0.00');
        }
      } catch (error) {
        throw new Error(`Generated duration invariant failed at seed ${seed}.`, { cause: error });
      }
    }
  });
});
