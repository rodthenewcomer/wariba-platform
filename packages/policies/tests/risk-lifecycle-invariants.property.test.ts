import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';
import {
  evaluateAccountRisk,
  V2_POLICY_PARAMETERS,
  type DailySnapshotInput,
  type RiskPolicyParameters,
} from '../src/index';

/**
 * Phase 3.4.3 §69 — the risk/lifecycle invariants, over deterministic
 * generated sequences rather than hand-picked fixtures. Same generator
 * conventions as packages/domain/tests/financial-invariants.property.test.ts:
 * an LCG seeded by the loop index, so a failure names the exact seed that
 * reproduces it.
 */

const SCENARIOS = 4_000;

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

const V1_ONE: RiskPolicyParameters = {
  profit_target_rate: '0.10',
  daily_loss_rate: '0.03',
  maximum_loss_rate: '0.10',
  best_day_max_ratio: '0.50',
};

const POLICIES: readonly { label: string; policy: RiskPolicyParameters }[] = [
  { label: 'V1_ONE', policy: V1_ONE },
  { label: 'ONE_V2', policy: V2_POLICY_PARAMETERS.oneEvaluation },
  { label: 'FLEX_V2', policy: V2_POLICY_PARAMETERS.flexEvaluation },
  { label: 'ONE_PERF_V2', policy: V2_POLICY_PARAMETERS.onePerformance },
  { label: 'INSTANT_V2', policy: V2_POLICY_PARAMETERS.instantPerformance },
];

const NOMINALS = ['5000.00', '10000.00', '25000.00', '50000.00', '100000.00'] as const;

interface GeneratedCase {
  policy: RiskPolicyParameters;
  label: string;
  nominalBalance: string;
  accountBalance: string;
  programEligibleBalance: string;
  riskAdjustedBalance: string;
  unrealized: string;
  snapshots: DailySnapshotInput[];
  payoutDebit: string;
}

function generate(seed: number): GeneratedCase {
  const random = seeded(seed);
  const entry = POLICIES[Math.floor(random() * POLICIES.length)] as (typeof POLICIES)[number];
  const nominalBalance = NOMINALS[Math.floor(random() * NOMINALS.length)] as string;
  const nominal = new Decimal(nominalBalance);

  // Ineligible short-duration profit only ever *removes* profit, never adds
  // any; an authorized payout debit only ever removes balance.
  const shortDurationProfit = cents(random, Number(nominal.times('0.02')));
  const payoutDebit = random() < 0.35 ? cents(random, Number(nominal.times('0.05'))) : '0.00';
  const tradingResult = new Decimal(cents(random, Number(nominal.times('0.25')))).minus(
    nominal.times('0.12'),
  );

  const accountBalance = nominal.plus(tradingResult).minus(payoutDebit);
  const programEligibleBalance = accountBalance.minus(shortDurationProfit);
  const riskAdjustedBalance = programEligibleBalance.plus(payoutDebit);
  const unrealized = new Decimal(cents(random, Number(nominal.times('0.06')))).minus(
    nominal.times('0.03'),
  );

  const dayCount = 1 + Math.floor(random() * 5);
  const snapshots: DailySnapshotInput[] = [];
  for (let index = 0; index < dayCount; index += 1) {
    const dayProfit = new Decimal(cents(random, Number(nominal.times('0.08')))).minus(
      nominal.times('0.03'),
    );
    const dayPayout = index === dayCount - 2 ? new Decimal(payoutDebit) : new Decimal(0);
    snapshots.push({
      tradingDay: `2026-08-${String(10 + index).padStart(2, '0')}`,
      status: 'finalized',
      dailyReference: nominalBalance,
      maximumLossFloorBefore: nominal
        .times(new Decimal(1).minus(entry.policy.maximum_loss_rate))
        .toFixed(2),
      eodBalance: nominal.plus(dayProfit).toFixed(2),
      maximumLossFloorAfter: nominal
        .times(new Decimal(1).minus(entry.policy.maximum_loss_rate))
        .toFixed(2),
      realizedNetProfitForDay: dayProfit.toFixed(2),
      eligibleRealizedNetProfitForDay: dayProfit.minus(dayPayout).toFixed(2),
      riskAdjustedRealizedNetProfitForDay: dayProfit.toFixed(2),
    });
  }
  snapshots.push({
    tradingDay: '2026-08-27',
    status: 'open',
    dailyReference: nominalBalance,
    maximumLossFloorBefore: nominal
      .times(new Decimal(1).minus(entry.policy.maximum_loss_rate))
      .toFixed(2),
    eodBalance: null,
    maximumLossFloorAfter: null,
    realizedNetProfitForDay: null,
  });

  return {
    policy: entry.policy,
    label: entry.label,
    nominalBalance,
    accountBalance: accountBalance.toFixed(2),
    programEligibleBalance: programEligibleBalance.toFixed(2),
    riskAdjustedBalance: riskAdjustedBalance.toFixed(2),
    unrealized: unrealized.toFixed(2),
    snapshots,
    payoutDebit,
  };
}

function evaluateGenerated(generated: GeneratedCase) {
  return evaluateAccountRisk({
    clock: { now: () => new Date('2026-08-27T12:00:00.000Z') },
    account: {
      id: `generated-${generated.label}`,
      status: 'active',
      nominalBalance: generated.nominalBalance,
    },
    policy: generated.policy,
    currentBalance: generated.accountBalance,
    currentProgramEligibleBalance: generated.programEligibleBalance,
    currentRiskAdjustedBalance: generated.riskAdjustedBalance,
    currentUnrealizedPnl: generated.unrealized,
    openPositionCount: 0,
    pendingOrderCount: 0,
    dailySnapshots: generated.snapshots,
  });
}

describe('risk and lifecycle invariants — deterministic generated sequences', () => {
  it('holds the core risk invariants across 4,000 seeds', () => {
    for (let seed = 1; seed <= SCENARIOS; seed += 1) {
      const generated = generate(seed);
      const result = evaluateGenerated(generated);
      try {
        // A soft lock is never terminal on its own.
        if (result.dailyLoss.softLockTriggered && !result.maximumLoss.breached) {
          expect(result.recommendedStatus).not.toBe('breached');
        }
        // A Maximum Loss breach is terminal and outranks everything.
        if (result.maximumLoss.breached) {
          expect(result.recommendedStatus).toBe('breached');
          expect(result.eligibility.passEligible).toBe(false);
        }
        // Breach and pass can never both be true.
        expect(result.maximumLoss.breached && result.eligibility.passEligible).toBe(false);
        // A Best Day violation blocks the pass and never breaches.
        if (!result.bestDay.compliant) {
          expect(result.eligibility.passEligible).toBe(false);
        }
        // The engine never invents a Performance pass.
        if (generated.policy.profit_target_rate == null) {
          expect(['active', 'soft_locked', 'breached']).toContain(result.recommendedStatus);
        }
        // Eligible profit never exceeds the account's own realized economics:
        // short-duration exclusions only ever remove profit. Compared
        // like-for-like (balance to balance, equity to equity) — the same
        // unrealized figure is added to both, so mixing the two would only
        // measure the sign of the open position.
        expect(
          new Decimal(result.programEligibleBalance).lessThanOrEqualTo(generated.accountBalance),
        ).toBe(true);
        expect(
          new Decimal(result.programEligibleEquity).lessThanOrEqualTo(result.currentEquity),
        ).toBe(true);
        // Best Day figures are internally consistent.
        expect(
          new Decimal(result.bestDay.bestDayProfit).lessThanOrEqualTo(
            result.bestDay.positiveDaysProfitSum,
          ),
        ).toBe(true);
        // The daily-loss budget used is never negative.
        expect(new Decimal(result.dailyLoss.used).isNegative()).toBe(false);
      } catch (error) {
        throw new Error(
          `Risk invariant failed at seed ${seed} (${generated.label}, nominal ${generated.nominalBalance}).`,
          { cause: error },
        );
      }
    }
  });

  it('never lets an authorized payout debit alone cross a floor, across 4,000 seeds', () => {
    for (let seed = 1; seed <= SCENARIOS; seed += 1) {
      const generated = generate(seed);
      if (new Decimal(generated.payoutDebit).isZero()) continue;
      const withPayout = evaluateGenerated(generated);
      // The same account with the payout never taken: identical trading
      // history, balance higher by exactly the debit.
      const withoutPayout = evaluateGenerated({
        ...generated,
        payoutDebit: '0.00',
        accountBalance: new Decimal(generated.accountBalance)
          .plus(generated.payoutDebit)
          .toFixed(2),
        programEligibleBalance: new Decimal(generated.programEligibleBalance)
          .plus(generated.payoutDebit)
          .toFixed(2),
        riskAdjustedBalance: generated.riskAdjustedBalance,
      });
      try {
        // Risk-adjusted equity is identical either way, so both the daily
        // and maximum-loss verdicts must be identical too.
        expect(withPayout.riskAdjustedEquity).toBe(withoutPayout.riskAdjustedEquity);
        expect(withPayout.maximumLoss.breached).toBe(withoutPayout.maximumLoss.breached);
        expect(withPayout.dailyLoss.softLockTriggered).toBe(
          withoutPayout.dailyLoss.softLockTriggered,
        );
      } catch (error) {
        throw new Error(`Payout neutrality failed at seed ${seed} (${generated.label}).`, {
          cause: error,
        });
      }
    }
  });

  it('still breaches on a real trading loss of the same size, across 4,000 seeds', () => {
    for (let seed = 1; seed <= SCENARIOS; seed += 1) {
      const generated = generate(seed);
      if (new Decimal(generated.payoutDebit).lessThanOrEqualTo(0)) continue;
      // Replace the authorized debit with a market loss of exactly the same
      // amount: the risk-adjusted projection no longer adds it back.
      const asTradingLoss = evaluateGenerated({
        ...generated,
        riskAdjustedBalance: new Decimal(generated.riskAdjustedBalance)
          .minus(generated.payoutDebit)
          .toFixed(2),
      });
      const asPayout = evaluateGenerated(generated);
      try {
        expect(
          new Decimal(asTradingLoss.riskAdjustedEquity).lessThanOrEqualTo(
            asPayout.riskAdjustedEquity,
          ),
        ).toBe(true);
        if (asPayout.maximumLoss.breached) {
          // A loss strictly larger than a neutral debit can only breach at
          // least as often, never less.
          expect(asTradingLoss.maximumLoss.breached).toBe(true);
        }
      } catch (error) {
        throw new Error(`Trading-loss counterfactual failed at seed ${seed}.`, { cause: error });
      }
    }
  });

  it('produces byte-identical V1 results whether or not the V2 projection columns exist', () => {
    for (let seed = 1; seed <= SCENARIOS; seed += 1) {
      const generated = { ...generate(seed), policy: V1_ONE, label: 'V1_ONE' };
      const withProjection = evaluateGenerated(generated);
      const withoutProjection = evaluateGenerated({
        ...generated,
        snapshots: generated.snapshots.map((day) => {
          const { riskAdjustedRealizedNetProfitForDay: _dropped, ...rest } = day;
          return rest;
        }),
      });
      try {
        expect(withoutProjection.bestDay).toStrictEqual(withProjection.bestDay);
        expect(withoutProjection.target).toStrictEqual(withProjection.target);
        expect(withoutProjection.recommendedStatus).toBe(withProjection.recommendedStatus);
      } catch (error) {
        throw new Error(`V1 projection-independence failed at seed ${seed}.`, { cause: error });
      }
    }
  });
});
