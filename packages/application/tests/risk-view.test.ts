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
