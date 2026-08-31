import { describe, expect, it } from 'vitest';
import type { EvaluationOnePolicyParameters, LoadedPolicy } from '@wariba/policies';
import type { RiskEngineResult } from '@wariba/database';
import { projectAccountRiskView } from '../src/risk-view';
import type { AccountRiskEngineInputs } from '../src/risk-engine-inputs';

const policyParameters: EvaluationOnePolicyParameters = {
  profit_target_rate: '0.08',
  recognized_profit: 'realized_net_profit_only',
  daily_loss_rate: '0.04',
  daily_loss_action: 'soft_lock',
  maximum_loss_rate: '0.08',
  maximum_loss_model: 'eod_trailing',
  maximum_loss_floor_formula: 'nominal_balance - nominal_balance * maximum_loss_rate',
  maximum_loss_floor_never_decreases: true,
  maximum_loss_locks_at_nominal: true,
  best_day_max_ratio: '0.40',
  best_day_breach_capable: false,
  minimum_trading_days: 4,
  qualified_days_required: null,
  overnight_allowed: true,
  weekend_allowed: true,
  news_allowed: true,
  activation_fee: '0.00',
};

const policy: LoadedPolicy = {
  id: 'policy-1',
  program: 'WARIBA_ONE',
  productFamily: 'WARIBA_ONE',
  accountPhase: 'evaluation',
  semanticVersion: '1.1.1',
  parameters: policyParameters,
  machineHash: 'hash',
  storedMachineHash: 'hash',
  hashVerified: true,
};

function buildInputs(dailyLoss: RiskEngineResult['dailyLoss']): AccountRiskEngineInputs {
  const result: RiskEngineResult = {
    currentEquity: '9880.00',
    programEligibleBalance: '9880.00',
    programEligibleEquity: '9880.00',
    riskAdjustedBalance: '9880.00',
    riskAdjustedEquity: '9880.00',
    realizedNetProfit: '0.00',
    dailyLoss,
    maximumLoss: { floor: '9200.00', remaining: '680.00', breached: false },
    bestDay: { ratio: null, compliant: true, bestDayProfit: '0.00', positiveDaysProfitSum: '0.00' },
    target: { required: '800.00', current: '0.00', reached: false },
    eligibility: { passEligible: false, blockingReasons: [] },
    recommendedStatus: 'active',
    violations: [],
  };
  return {
    accountId: 'acc-1',
    accountStatus: 'active',
    nominalBalance: '10000.00',
    activatedAt: new Date('2026-08-01T00:00:00.000Z'),
    policy,
    currentBalance: '9880.00',
    programEligibleBalance: '9880.00',
    openPositionCount: 0,
    result,
  };
}

describe('projectAccountRiskView — dailyLossRemainingFormatted', () => {
  it('computes remaining daily-loss budget as (reference - floor) - used, not floor - used', () => {
    // reference=10000, floor=9700 (400 * 0.04 * 25? kept simple: reference - drawdown), used=120
    // budget = reference - floor = 300; remaining = budget - used = 180
    const view = projectAccountRiskView(
      buildInputs({
        reference: '10000.00',
        floor: '9700.00',
        used: '120.00',
        softLockTriggered: false,
      }),
    );

    // Correct: (10000 - 9700) - 120 = 180 -> "180 USD"
    // The prior bug computed floor - used = 9700 - 120 = 9580, a ~53x overstatement.
    expect(view.dailyLossRemainingFormatted).toBe('180 USD');
  });

  it('never goes negative once the daily-loss budget is fully used', () => {
    const view = projectAccountRiskView(
      buildInputs({
        reference: '10000.00',
        floor: '9700.00',
        used: '500.00',
        softLockTriggered: true,
      }),
    );

    expect(view.dailyLossRemainingFormatted).toBe('0 USD');
  });
});

/**
 * Phase 2.5 §12 — the risk bars are driven by these ratios, and §12 requires
 * they come from authoritative raw values rather than a parse of a display
 * string. The numbers are therefore projected once, here, and asserted.
 */
describe('projectAccountRiskView — room ratios (§12)', () => {
  const untouched = buildInputs({
    reference: '10000.00',
    floor: '9700.00',
    used: '0.00',
    softLockTriggered: false,
  });

  it('reports a full daily budget as 100 %', () => {
    expect(projectAccountRiskView(untouched).room.dailyRemainingPercent).toBe(100);
  });

  it('reports a half-consumed daily budget as 50 %', () => {
    const view = projectAccountRiskView(
      buildInputs({
        reference: '10000.00',
        floor: '9700.00',
        used: '150.00',
        softLockTriggered: false,
      }),
    );
    // budget = 10000 - 9700 = 300; remaining = 150; 150/300 = 50 %.
    expect(view.room.dailyRemainingPercent).toBe(50);
  });

  it('clamps a fully consumed budget to 0 rather than going negative', () => {
    const view = projectAccountRiskView(
      buildInputs({
        reference: '10000.00',
        floor: '9700.00',
        used: '450.00',
        softLockTriggered: true,
      }),
    );
    expect(view.room.dailyRemainingPercent).toBe(0);
  });

  it('names the binding constraint — the one that stops the trader first', () => {
    // maximumLoss.remaining is 680 of a 800 budget (85 %); daily is 300/300.
    expect(projectAccountRiskView(untouched).room.binding).toBe('maximum');
  });

  it('agrees with the formatted figures it sits beside', () => {
    const view = projectAccountRiskView(untouched);
    // A bar reading 100 % beside a label reading "0 USD restant" is the exact
    // disagreement projecting the ratio once is meant to prevent.
    expect(view.amounts.dailyLossRemaining).toBe('300.00');
    expect(view.room.dailyRemainingPercent).toBe(100);
  });
});

/**
 * Phase 2.5 §13 — a countdown is only permitted because the boundary is real.
 */
describe('projectAccountRiskView — nextResetAt (§13)', () => {
  const inputs = buildInputs({
    reference: '10000.00',
    floor: '9700.00',
    used: '0.00',
    softLockTriggered: false,
  });

  it('exposes the next UTC midnight as a machine-readable instant', () => {
    const view = projectAccountRiskView(inputs, new Date('2026-08-23T14:31:58.000Z'));
    expect(view.nextResetAt).toBe('2026-08-24T00:00:00.000Z');
  });

  it('keeps the human label consistent with the instant', () => {
    const view = projectAccountRiskView(inputs, new Date('2026-08-23T14:31:58.000Z'));
    expect(view.nextResetLabel).toBe('00:00 UTC');
    expect(new Date(view.nextResetAt).getUTCHours()).toBe(0);
  });

  it('is a pure function of the instant it is given', () => {
    const a = projectAccountRiskView(inputs, new Date('2026-08-23T10:00:00.000Z'));
    const b = projectAccountRiskView(inputs, new Date('2026-08-23T10:00:00.000Z'));
    expect(a.nextResetAt).toBe(b.nextResetAt);
  });
});
