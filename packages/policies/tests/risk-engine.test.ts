import { describe, expect, it } from 'vitest';
import { evaluateAccountRisk, type DailySnapshotInput } from '../src/risk-engine';
import type { EvaluationOnePolicyParameters } from '../src/schema';

const POLICY: EvaluationOnePolicyParameters = {
  profit_target_rate: '0.10',
  recognized_profit: 'realized_net_profit_only',
  daily_loss_rate: '0.03',
  daily_loss_action: 'soft_lock',
  maximum_loss_rate: '0.10',
  maximum_loss_model: 'eod_trailing',
  maximum_loss_floor_formula:
    'min(nominal_balance, max(previous_floor, highest_eod_balance - nominal_balance * 0.10))',
  maximum_loss_floor_never_decreases: true,
  maximum_loss_locks_at_nominal: true,
  best_day_max_ratio: '0.50',
  best_day_breach_capable: false,
  minimum_trading_days: 0,
  qualified_days_required: null,
  overnight_allowed: true,
  weekend_allowed: false,
  news_allowed: true,
  activation_fee: '0',
};

const CLOCK = { now: () => new Date('2026-08-10T12:00:00.000Z') };

function todaySnapshot(overrides: Partial<DailySnapshotInput> = {}): DailySnapshotInput {
  return {
    tradingDay: '2026-08-10',
    status: 'open',
    dailyReference: '10000',
    maximumLossFloorBefore: '9000',
    eodBalance: null,
    maximumLossFloorAfter: null,
    realizedNetProfitForDay: null,
    ...overrides,
  };
}

describe('TV-ONE-001 — 10K target reached with Best Day exactly at the limit', () => {
  it('is target-reached, Best-Day-compliant, and pass-eligible', () => {
    const result = evaluateAccountRisk({
      clock: CLOCK,
      account: { id: 'acc-1', status: 'active', nominalBalance: '10000' },
      policy: POLICY,
      currentBalance: '11000', // realized net profit = 1000
      currentUnrealizedPnl: '0',
      openPositionCount: 0,
      pendingOrderCount: 0,
      dailySnapshots: [
        {
          tradingDay: '2026-08-08',
          status: 'finalized',
          dailyReference: '10000',
          maximumLossFloorBefore: '9000',
          eodBalance: '10500',
          maximumLossFloorAfter: '9000',
          realizedNetProfitForDay: '500',
        },
        {
          tradingDay: '2026-08-09',
          status: 'finalized',
          dailyReference: '10500',
          maximumLossFloorBefore: '9000',
          eodBalance: '11000',
          maximumLossFloorAfter: '9000',
          realizedNetProfitForDay: '500',
        },
        todaySnapshot({ dailyReference: '11000' }),
      ],
    });

    expect(result.target.required).toBe('1000.00');
    expect(result.target.reached).toBe(true);
    expect(result.bestDay.ratio).toBe('0.5000');
    expect(result.bestDay.compliant).toBe(true);
    expect(result.eligibility.passEligible).toBe(true);
    expect(result.eligibility.blockingReasons).toEqual([]);
    expect(result.recommendedStatus).toBe('pass_pending');
  });
});

describe('TV-ONE-002 — 10K daily loss exact threshold', () => {
  it('soft-locks without hard-breaching', () => {
    const result = evaluateAccountRisk({
      clock: CLOCK,
      account: { id: 'acc-2', status: 'active', nominalBalance: '10000' },
      policy: POLICY,
      currentBalance: '9700',
      currentUnrealizedPnl: '0',
      openPositionCount: 0,
      pendingOrderCount: 0,
      dailySnapshots: [todaySnapshot({ dailyReference: '10000', maximumLossFloorBefore: '9000' })],
    });

    expect(result.dailyLoss.used).toBe('300.00');
    expect(result.dailyLoss.softLockTriggered).toBe(true);
    expect(result.maximumLoss.breached).toBe(false);
    expect(result.recommendedStatus).toBe('soft_locked');
  });
});

describe('TV-ONE-003 — 10K equity exactly at the Maximum Loss floor', () => {
  it('hard-breaches, overriding any other state', () => {
    const result = evaluateAccountRisk({
      clock: CLOCK,
      account: { id: 'acc-3', status: 'soft_locked', nominalBalance: '10000' },
      policy: POLICY,
      currentBalance: '9000',
      currentUnrealizedPnl: '0',
      openPositionCount: 0,
      pendingOrderCount: 0,
      dailySnapshots: [todaySnapshot({ dailyReference: '9000', maximumLossFloorBefore: '9000' })],
    });

    expect(result.maximumLoss.breached).toBe(true);
    expect(result.recommendedStatus).toBe('breached');
    expect(result.violations).toEqual([
      {
        ruleCode: 'RISK_MAXIMUM_LOSS_BREACH',
        severity: 'critical',
        consequence: 'hard_breach',
        thresholdValue: '9000',
        observedValue: '9000.00',
      },
    ]);
  });
});

describe('TV-ONE-004 — target exists only after including unrealized profit', () => {
  it('is not target-reached when only realized profit (900) is counted', () => {
    const result = evaluateAccountRisk({
      clock: CLOCK,
      account: { id: 'acc-4', status: 'active', nominalBalance: '10000' },
      policy: POLICY,
      currentBalance: '10900', // realized net profit = 900
      currentUnrealizedPnl: '100',
      openPositionCount: 1,
      pendingOrderCount: 0,
      dailySnapshots: [todaySnapshot({ dailyReference: '10900', maximumLossFloorBefore: '9000' })],
    });

    expect(result.target.reached).toBe(false);
    expect(result.eligibility.passEligible).toBe(false);
    expect(result.eligibility.blockingReasons).toContain('RISK_TARGET_NOT_REALIZED');
    expect(result.recommendedStatus).toBe('active');
  });
});

describe('property: target requires realized profit only, independent of unrealized PnL', () => {
  it('stays target-reached even with a large unrealized loss dragging equity down (a separate, still-live concern)', () => {
    const result = evaluateAccountRisk({
      clock: CLOCK,
      account: { id: 'acc-5', status: 'active', nominalBalance: '10000' },
      policy: POLICY,
      currentBalance: '11000', // realized net profit = 1000, target met
      currentUnrealizedPnl: '-5000', // equity now 6000
      openPositionCount: 1,
      pendingOrderCount: 0,
      dailySnapshots: [
        // Two finalized days splitting the 1000 realized profit so the Best
        // Day Rule is compliant (500/1000 = 0.50) and isolated from what this
        // test is actually checking: target vs. unrealized PnL.
        {
          tradingDay: '2026-08-08',
          status: 'finalized',
          dailyReference: '10000',
          maximumLossFloorBefore: '5000',
          eodBalance: '10500',
          maximumLossFloorAfter: '5000',
          realizedNetProfitForDay: '500',
        },
        {
          tradingDay: '2026-08-09',
          status: 'finalized',
          dailyReference: '10500',
          maximumLossFloorBefore: '5000',
          eodBalance: '11000',
          maximumLossFloorAfter: '5000',
          realizedNetProfitForDay: '500',
        },
        todaySnapshot({ dailyReference: '6000', maximumLossFloorBefore: '5000' }),
      ],
    });

    expect(result.target.reached).toBe(true);
    expect(result.currentEquity).toBe('6000.00');
    expect(result.bestDay.compliant).toBe(true);
    // Still blocked from pass by the open position, not by the target itself.
    expect(result.eligibility.blockingReasons).toEqual(['RISK_OPEN_POSITIONS_BLOCK_TRANSITION']);
  });
});

describe('property: Best Day Rule never triggers a hard breach on its own', () => {
  it('a non-compliant ratio blocks pass but leaves the account active', () => {
    const result = evaluateAccountRisk({
      clock: CLOCK,
      account: { id: 'acc-6', status: 'active', nominalBalance: '10000' },
      policy: POLICY,
      currentBalance: '11000', // target reached
      currentUnrealizedPnl: '0',
      openPositionCount: 0,
      pendingOrderCount: 0,
      dailySnapshots: [
        {
          tradingDay: '2026-08-09',
          status: 'finalized',
          dailyReference: '10000',
          maximumLossFloorBefore: '9000',
          eodBalance: '10900',
          maximumLossFloorAfter: '9000',
          realizedNetProfitForDay: '900', // one dominant day → ratio 900/1000 = 0.90 > 0.50
        },
        {
          tradingDay: '2026-08-08',
          status: 'finalized',
          dailyReference: '10000',
          maximumLossFloorBefore: '9000',
          eodBalance: '10100',
          maximumLossFloorAfter: '9000',
          realizedNetProfitForDay: '100',
        },
        todaySnapshot({ dailyReference: '11000', maximumLossFloorBefore: '9000' }),
      ],
    });

    expect(result.bestDay.ratio).toBe('0.9000');
    expect(result.bestDay.compliant).toBe(false);
    expect(result.eligibility.passEligible).toBe(false);
    expect(result.eligibility.blockingReasons).toEqual(['RISK_CONSISTENCY_NON_COMPLIANT']);
    // Never a breach, never removed from 'active' by the Best Day Rule alone.
    expect(result.maximumLoss.breached).toBe(false);
    expect(result.recommendedStatus).toBe('active');
  });
});

describe('property: no qualified-day-equivalent claims before finalization', () => {
  it("excludes today's open (unfinalized) snapshot from the Best Day sums even if it carries a value", () => {
    const result = evaluateAccountRisk({
      clock: CLOCK,
      account: { id: 'acc-7', status: 'active', nominalBalance: '10000' },
      policy: POLICY,
      currentBalance: '10500',
      currentUnrealizedPnl: '0',
      openPositionCount: 0,
      pendingOrderCount: 0,
      dailySnapshots: [
        {
          tradingDay: '2026-08-09',
          status: 'finalized',
          dailyReference: '10000',
          maximumLossFloorBefore: '9000',
          eodBalance: '10500',
          maximumLossFloorAfter: '9000',
          realizedNetProfitForDay: '500',
        },
        // "today" is still open — even though it already carries a live realized
        // figure of 900, it must not be counted toward the Best Day sums yet.
        todaySnapshot({
          dailyReference: '10500',
          maximumLossFloorBefore: '9000',
          realizedNetProfitForDay: '900',
        }),
      ],
    });

    // If today's 900 were (incorrectly) included: sum=1400, best=900, ratio=0.6429.
    // Excluded correctly: only the one finalized day counts, ratio = 500/500 = 1.
    expect(result.bestDay.ratio).toBe('1.0000');
  });
});
