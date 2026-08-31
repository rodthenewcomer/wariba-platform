import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';
import {
  evaluateAccountRisk,
  V2_POLICY_PARAMETERS,
  type DailySnapshotInput,
  type EvaluateAccountRiskParams,
  type RiskPolicyParameters,
} from '../src/index';

/**
 * Phase 3.4.3 §4/§70/§71/§82 — the regression gate.
 *
 * The V1 fixtures below are the exact `parameters_json` seeded on
 * `app.policy_versions` for WARIBA_ONE v1.1.1 and WARIBA_PERFORMANCE v1.1.0.
 * They are copied rather than loaded so this file fails if V1 behaviour
 * moves, whether or not a database is available — the point is to pin the
 * *engine's output*, not just the policy row (§70).
 */
const V1_ONE: RiskPolicyParameters = {
  profit_target_rate: '0.10',
  daily_loss_rate: '0.03',
  maximum_loss_rate: '0.10',
  best_day_max_ratio: '0.50',
};

const V1_PERFORMANCE: RiskPolicyParameters = {
  daily_loss_rate: '0.03',
  maximum_loss_rate: '0.10',
  best_day_max_ratio: '0.50',
};

const NOMINAL = '10000.00';

function day(overrides: Partial<DailySnapshotInput> & { tradingDay: string }): DailySnapshotInput {
  return {
    status: 'finalized',
    dailyReference: NOMINAL,
    maximumLossFloorBefore: '9000.00',
    eodBalance: NOMINAL,
    maximumLossFloorAfter: '9000.00',
    realizedNetProfitForDay: '0.00',
    ...overrides,
  };
}

function evaluate(params: {
  policy: RiskPolicyParameters;
  balance: string;
  snapshots: readonly DailySnapshotInput[];
  unrealized?: string;
  status?: EvaluateAccountRiskParams['account']['status'];
  programEligibleBalance?: string;
  riskAdjustedBalance?: string;
  openPositionCount?: number;
  nominalBalance?: string;
}) {
  return evaluateAccountRisk({
    clock: { now: () => new Date('2026-08-27T12:00:00.000Z') },
    account: {
      id: 'account-under-test',
      status: params.status ?? 'active',
      nominalBalance: params.nominalBalance ?? NOMINAL,
    },
    policy: params.policy,
    currentBalance: params.balance,
    ...(params.programEligibleBalance
      ? { currentProgramEligibleBalance: params.programEligibleBalance }
      : {}),
    ...(params.riskAdjustedBalance
      ? { currentRiskAdjustedBalance: params.riskAdjustedBalance }
      : {}),
    currentUnrealizedPnl: params.unrealized ?? '0.00',
    openPositionCount: params.openPositionCount ?? 0,
    pendingOrderCount: 0,
    dailySnapshots: params.snapshots,
  });
}

describe('V1 engine regression — 10 / 3 / 10 / 50 must not move', () => {
  const today = day({ tradingDay: '2026-08-27', status: 'open', eodBalance: null });

  it('still requires a 10% target on the nominal balance', () => {
    const result = evaluate({ policy: V1_ONE, balance: '10999.99', snapshots: [today] });
    expect(result.target.required).toBe('1000.00');
    expect(result.target.reached).toBe(false);
    expect(
      evaluate({ policy: V1_ONE, balance: '11000.00', snapshots: [today] }).target.reached,
    ).toBe(true);
  });

  it('still puts the daily floor 3% of nominal below the reference', () => {
    const result = evaluate({ policy: V1_ONE, balance: '10000.00', snapshots: [today] });
    expect(result.dailyLoss.floor).toBe('9700.00');
  });

  it('still breaches at a 10% maximum-loss floor and not before', () => {
    expect(
      evaluate({ policy: V1_ONE, balance: '9000.01', snapshots: [today] }).maximumLoss.breached,
    ).toBe(false);
    expect(
      evaluate({ policy: V1_ONE, balance: '9000.00', snapshots: [today] }).maximumLoss.breached,
    ).toBe(true);
  });

  it('still accepts a Best Day ratio up to 50%', () => {
    const snapshots = [
      day({ tradingDay: '2026-08-25', realizedNetProfitForDay: '500.00' }),
      day({ tradingDay: '2026-08-26', realizedNetProfitForDay: '500.00' }),
      today,
    ];
    const result = evaluate({ policy: V1_ONE, balance: '11000.00', snapshots });
    expect(result.bestDay.ratio).toBe('0.5000');
    expect(result.bestDay.compliant).toBe(true);
    // 0.5001 would fail — V2's 0.35 must not have leaked into the V1 policy.
    expect(result.eligibility.passEligible).toBe(true);
    expect(result.recommendedStatus).toBe('pass_pending');
  });

  it('keeps reading the plain eligible day figure, ignoring any risk-adjusted column', () => {
    // A V1 policy carries no payout_debit_risk_neutral flag. Even when the
    // projection column is populated, V1 must resolve the same figure it
    // always did.
    const snapshots = [
      day({
        tradingDay: '2026-08-25',
        realizedNetProfitForDay: '400.00',
        eligibleRealizedNetProfitForDay: '400.00',
        riskAdjustedRealizedNetProfitForDay: '900.00',
      }),
      day({
        tradingDay: '2026-08-26',
        realizedNetProfitForDay: '600.00',
        eligibleRealizedNetProfitForDay: '600.00',
        riskAdjustedRealizedNetProfitForDay: '600.00',
      }),
      today,
    ];
    const result = evaluate({ policy: V1_ONE, balance: '11000.00', snapshots });
    expect(result.bestDay.bestDayProfit).toBe('600.00');
    expect(result.bestDay.positiveDaysProfitSum).toBe('1000.00');
  });

  it('never reports a pass for a V1 Performance policy', () => {
    const result = evaluate({ policy: V1_PERFORMANCE, balance: '12000.00', snapshots: [today] });
    expect(result.target.reached).toBe(true);
    expect(result.recommendedStatus).toBe('active');
  });
});

describe('V2 policy matrix — the three families execute different rules on one engine', () => {
  const today = day({ tradingDay: '2026-08-27', status: 'open', eodBalance: null });

  it('applies ONE V2 8 / 3 / 8 / 35', () => {
    const policy = V2_POLICY_PARAMETERS.oneEvaluation;
    const result = evaluate({ policy, balance: '10800.00', snapshots: [today] });
    expect(result.target.required).toBe('800.00');
    expect(result.target.reached).toBe(true);
    expect(result.dailyLoss.floor).toBe('9700.00');
    expect(evaluate({ policy, balance: '9200.00', snapshots: [today] }).maximumLoss.breached).toBe(
      false,
    );
  });

  it('applies FLEX V2 4 / 3 / 6 / 35', () => {
    const policy = V2_POLICY_PARAMETERS.flexEvaluation;
    const result = evaluate({
      policy,
      balance: '10400.00',
      snapshots: [
        day({
          tradingDay: '2026-08-27',
          status: 'open',
          eodBalance: null,
          maximumLossFloorBefore: '9400.00',
        }),
      ],
    });
    expect(result.target.required).toBe('400.00');
    expect(result.target.reached).toBe(true);
    expect(result.maximumLoss.floor).toBe('9400.00');
  });

  it('applies INSTANT V2 2 / 5 / 30 with no target at all', () => {
    const policy = V2_POLICY_PARAMETERS.instantPerformance;
    const result = evaluate({
      policy,
      balance: '10000.00',
      snapshots: [
        day({
          tradingDay: '2026-08-27',
          status: 'open',
          eodBalance: null,
          maximumLossFloorBefore: '9500.00',
        }),
      ],
    });
    expect(result.dailyLoss.floor).toBe('9800.00');
    expect(result.maximumLoss.floor).toBe('9500.00');
    expect(result.recommendedStatus).toBe('active');
  });

  it('separates the ONE 35% and INSTANT 30% Best Day limits', () => {
    // Three positive days summing to 1 000, best day 340 -> ratio 0.34:
    // inside ONE/FLEX's 0.35, outside INSTANT's 0.30.
    const snapshots = [
      day({ tradingDay: '2026-08-24', realizedNetProfitForDay: '320.00' }),
      day({ tradingDay: '2026-08-25', realizedNetProfitForDay: '340.00' }),
      day({ tradingDay: '2026-08-26', realizedNetProfitForDay: '340.00' }),
      today,
    ];
    const one = evaluate({
      policy: V2_POLICY_PARAMETERS.oneEvaluation,
      balance: '11000.00',
      snapshots,
    });
    expect(one.bestDay.ratio).toBe('0.3400');
    expect(one.bestDay.compliant).toBe(true);
    expect(
      evaluate({
        policy: V2_POLICY_PARAMETERS.instantPerformance,
        balance: '11000.00',
        snapshots,
      }).bestDay.compliant,
    ).toBe(false);
  });

  it('rejects a ratio one ten-thousandth above the ONE limit', () => {
    // 3 500.10 / 10 000 = 0.35001 -> 0.3500 at four decimals is not enough
    // to fail, so the fixture crosses the limit by a full step: 0.3501.
    const snapshots = [
      day({ tradingDay: '2026-08-24', realizedNetProfitForDay: '3501.00' }),
      day({ tradingDay: '2026-08-25', realizedNetProfitForDay: '3250.00' }),
      day({ tradingDay: '2026-08-26', realizedNetProfitForDay: '3249.00' }),
      today,
    ];
    const result = evaluate({
      policy: V2_POLICY_PARAMETERS.oneEvaluation,
      balance: '20000.00',
      snapshots,
    });
    expect(result.bestDay.ratio).toBe('0.3501');
    expect(result.bestDay.compliant).toBe(false);
  });
});

describe('exact thresholds — §10', () => {
  const cases: readonly { label: string; policy: RiskPolicyParameters; floor: string }[] = [
    { label: 'V1 ONE', policy: V1_ONE, floor: '9000.00' },
    { label: 'ONE V2', policy: V2_POLICY_PARAMETERS.oneEvaluation, floor: '9200.00' },
    { label: 'FLEX V2', policy: V2_POLICY_PARAMETERS.flexEvaluation, floor: '9400.00' },
    { label: 'INSTANT V2', policy: V2_POLICY_PARAMETERS.instantPerformance, floor: '9500.00' },
  ];

  for (const { label, policy, floor } of cases) {
    it(`${label}: breaches at the floor and one minor unit below, never one above`, () => {
      const snapshots = [
        day({
          tradingDay: '2026-08-27',
          status: 'open',
          eodBalance: null,
          maximumLossFloorBefore: floor,
        }),
      ];
      const above = evaluate({ policy, balance: (Number(floor) + 0.01).toFixed(2), snapshots });
      const at = evaluate({ policy, balance: floor, snapshots });
      const below = evaluate({ policy, balance: (Number(floor) - 0.01).toFixed(2), snapshots });
      expect(above.maximumLoss.breached).toBe(false);
      expect(at.maximumLoss.breached).toBe(true);
      expect(below.maximumLoss.breached).toBe(true);
      expect(at.recommendedStatus).toBe('breached');
    });
  }

  it('soft-locks at the daily floor and one minor unit below, never one above', () => {
    const snapshots = [
      day({
        tradingDay: '2026-08-27',
        status: 'open',
        eodBalance: null,
        dailyReference: '10000.00',
      }),
    ];
    const policy = V2_POLICY_PARAMETERS.oneEvaluation;
    expect(evaluate({ policy, balance: '9700.01', snapshots }).dailyLoss.softLockTriggered).toBe(
      false,
    );
    expect(evaluate({ policy, balance: '9700.00', snapshots }).dailyLoss.softLockTriggered).toBe(
      true,
    );
    expect(evaluate({ policy, balance: '9699.99', snapshots }).dailyLoss.softLockTriggered).toBe(
      true,
    );
  });
});

describe('payout debit neutrality inside the risk engine — §17/§37/§38', () => {
  const today = day({ tradingDay: '2026-08-27', status: 'open', eodBalance: null });

  it('keeps a payout day in the Best Day denominator under a V2 policy', () => {
    // The trader earned 500 on 26 August and a 900 payout was debited the
    // same day. Read from the eligible column that day looks like -400 and
    // silently leaves the positive-day set; read payout-neutral it is the
    // 500 the trader actually earned.
    const snapshots = [
      day({
        tradingDay: '2026-08-25',
        realizedNetProfitForDay: '500.00',
        eligibleRealizedNetProfitForDay: '500.00',
        riskAdjustedRealizedNetProfitForDay: '500.00',
      }),
      day({
        tradingDay: '2026-08-26',
        realizedNetProfitForDay: '-400.00',
        eligibleRealizedNetProfitForDay: '-400.00',
        riskAdjustedRealizedNetProfitForDay: '500.00',
      }),
      today,
    ];
    const v2 = evaluate({
      policy: V2_POLICY_PARAMETERS.onePerformance,
      balance: '10600.00',
      snapshots,
    });
    expect(v2.bestDay.positiveDaysProfitSum).toBe('1000.00');
    expect(v2.bestDay.ratio).toBe('0.5000');

    const v1 = evaluate({ policy: V1_PERFORMANCE, balance: '10600.00', snapshots });
    expect(v1.bestDay.positiveDaysProfitSum).toBe('500.00');
    expect(v1.bestDay.ratio).toBe('1.0000');
  });

  it('never lets an authorized payout debit alone cross a floor', () => {
    // Balance 10 600 after a 900 payout debit; the risk-adjusted projection
    // adds it back, so the floor is measured against 11 500.
    const snapshots = [
      day({
        tradingDay: '2026-08-27',
        status: 'open',
        eodBalance: null,
        dailyReference: '11500.00',
        maximumLossFloorBefore: '10600.00',
      }),
    ];
    const result = evaluate({
      policy: V2_POLICY_PARAMETERS.onePerformance,
      balance: '10600.00',
      programEligibleBalance: '10600.00',
      riskAdjustedBalance: '11500.00',
      snapshots,
    });
    expect(result.maximumLoss.breached).toBe(false);
    expect(result.dailyLoss.softLockTriggered).toBe(false);
  });

  it('still breaches on a real trading loss taken after that payout', () => {
    // Same payout, then a 950 market loss: risk-adjusted equity 10 550 is
    // below the 10 600 floor, so the trading loss breaches on its own.
    const snapshots = [
      day({
        tradingDay: '2026-08-27',
        status: 'open',
        eodBalance: null,
        dailyReference: '11500.00',
        maximumLossFloorBefore: '10600.00',
      }),
    ];
    const result = evaluate({
      policy: V2_POLICY_PARAMETERS.onePerformance,
      balance: '9650.00',
      programEligibleBalance: '9650.00',
      riskAdjustedBalance: '10550.00',
      snapshots,
    });
    expect(result.maximumLoss.breached).toBe(true);
    expect(result.recommendedStatus).toBe('breached');
  });
});

describe('rule priority — §60', () => {
  it('never reports a breach and a pass together', () => {
    const snapshots = [
      day({ tradingDay: '2026-08-25', realizedNetProfitForDay: '500.00' }),
      day({ tradingDay: '2026-08-26', realizedNetProfitForDay: '500.00' }),
      day({
        tradingDay: '2026-08-27',
        status: 'open',
        eodBalance: null,
        maximumLossFloorBefore: '11000.00',
      }),
    ];
    // Target reached and Best Day compliant, but equity is at the floor.
    const result = evaluate({
      policy: V2_POLICY_PARAMETERS.oneEvaluation,
      balance: '11000.00',
      snapshots,
    });
    expect(result.maximumLoss.breached).toBe(true);
    expect(result.eligibility.passEligible).toBe(false);
    expect(result.recommendedStatus).toBe('breached');
  });

  it('a Best Day violation blocks the pass without ever breaching', () => {
    const snapshots = [
      day({ tradingDay: '2026-08-25', realizedNetProfitForDay: '50.00' }),
      day({ tradingDay: '2026-08-26', realizedNetProfitForDay: '950.00' }),
      day({ tradingDay: '2026-08-27', status: 'open', eodBalance: null }),
    ];
    const result = evaluate({
      policy: V2_POLICY_PARAMETERS.oneEvaluation,
      balance: '11000.00',
      snapshots,
    });
    expect(result.bestDay.compliant).toBe(false);
    expect(result.eligibility.blockingReasons).toContain('RISK_CONSISTENCY_NON_COMPLIANT');
    expect(result.maximumLoss.breached).toBe(false);
    expect(result.recommendedStatus).toBe('active');
  });
});

describe('§87 — three accounts, three rulebooks, one engine', () => {
  /**
   * ONE 100K V2, FLEX 50K V2 and INSTANT 25K V2 walked through the same
   * market scenario. Nothing here selects behaviour by product name: the
   * only difference between the three columns is the policy object handed
   * to the same function.
   */
  const ACCOUNTS = [
    {
      label: 'ONE 100K',
      policy: V2_POLICY_PARAMETERS.oneEvaluation,
      nominal: '100000.00',
      expected: {
        targetRequired: '8000.00',
        dailyFloorFromNominal: '97000.00',
        initialMaximumLossFloor: '92000.00',
        bestDayLimit: '0.35',
      },
    },
    {
      label: 'FLEX 50K',
      policy: V2_POLICY_PARAMETERS.flexEvaluation,
      nominal: '50000.00',
      expected: {
        targetRequired: '2000.00',
        dailyFloorFromNominal: '48500.00',
        initialMaximumLossFloor: '47000.00',
        bestDayLimit: '0.35',
      },
    },
    {
      label: 'INSTANT 25K',
      policy: V2_POLICY_PARAMETERS.instantPerformance,
      nominal: '25000.00',
      expected: {
        targetRequired: '0.00',
        dailyFloorFromNominal: '24500.00',
        initialMaximumLossFloor: '23750.00',
        bestDayLimit: '0.30',
      },
    },
  ] as const;

  for (const account of ACCOUNTS) {
    describe(account.label, () => {
      const openToday = (overrides: Partial<DailySnapshotInput> = {}): DailySnapshotInput => ({
        tradingDay: '2026-08-27',
        status: 'open',
        dailyReference: account.nominal,
        maximumLossFloorBefore: account.expected.initialMaximumLossFloor,
        eodBalance: null,
        maximumLossFloorAfter: null,
        realizedNetProfitForDay: null,
        ...overrides,
      });

      it('applies its own daily floor, maximum-loss floor and target', () => {
        const result = evaluate({
          policy: account.policy,
          nominalBalance: account.nominal,
          balance: account.nominal,
          snapshots: [openToday()],
        });
        expect(result.dailyLoss.floor).toBe(account.expected.dailyFloorFromNominal);
        expect(result.maximumLoss.floor).toBe(account.expected.initialMaximumLossFloor);
        expect(result.target.required).toBe(account.expected.targetRequired);
      });

      it('pauses at the daily floor without ever breaching there', () => {
        const result = evaluate({
          policy: account.policy,
          nominalBalance: account.nominal,
          balance: account.expected.dailyFloorFromNominal,
          snapshots: [openToday()],
        });
        expect(result.dailyLoss.softLockTriggered).toBe(true);
        expect(result.maximumLoss.breached).toBe(false);
        expect(result.recommendedStatus).toBe('soft_locked');
      });

      it('terminates at its own maximum-loss floor', () => {
        const result = evaluate({
          policy: account.policy,
          nominalBalance: account.nominal,
          balance: account.expected.initialMaximumLossFloor,
          snapshots: [openToday()],
        });
        expect(result.maximumLoss.breached).toBe(true);
        expect(result.recommendedStatus).toBe('breached');
      });

      it('counts only eligible profit toward the objective', () => {
        // Account balance sits at the target, but a short-duration win of the
        // same size is excluded from the program-eligible projection.
        const balance = new Decimal(account.nominal)
          .plus(account.expected.targetRequired)
          .toFixed(2);
        const result = evaluate({
          policy: account.policy,
          nominalBalance: account.nominal,
          balance,
          programEligibleBalance: account.nominal,
          riskAdjustedBalance: account.nominal,
          snapshots: [openToday()],
        });
        expect(result.currentEquity).toBe(balance);
        expect(result.realizedNetProfit).toBe('0.00');
        if (account.expected.targetRequired === '0.00') {
          // INSTANT has no target at all; there is nothing to withhold.
          expect(result.target.reached).toBe(true);
        } else {
          expect(result.target.reached).toBe(false);
          expect(result.eligibility.blockingReasons).toContain('RISK_TARGET_NOT_REALIZED');
        }
      });

      it('applies its own Best Day limit as a gate, never as a breach', () => {
        // One day at the limit + 0.01 of the positive total, the rest spread.
        const total = new Decimal(1000);
        const overLimit = total.times(account.expected.bestDayLimit).plus(1);
        const remainder = total.minus(overLimit).dividedBy(2);
        const snapshots = [
          day({ tradingDay: '2026-08-24', realizedNetProfitForDay: overLimit.toFixed(2) }),
          day({ tradingDay: '2026-08-25', realizedNetProfitForDay: remainder.toFixed(2) }),
          day({ tradingDay: '2026-08-26', realizedNetProfitForDay: remainder.toFixed(2) }),
          openToday(),
        ];
        const result = evaluate({
          policy: account.policy,
          nominalBalance: account.nominal,
          balance: new Decimal(account.nominal).plus(total).toFixed(2),
          snapshots,
        });
        expect(result.bestDay.compliant).toBe(false);
        expect(result.maximumLoss.breached).toBe(false);
        expect(result.eligibility.passEligible).toBe(false);
        expect(result.recommendedStatus).not.toBe('breached');
      });
    });
  }

  it('gives the three accounts three different verdicts on the same relative loss', () => {
    // Each account loses exactly 5.5% of its nominal on day one.
    const verdicts = ACCOUNTS.map((account) => {
      const loss = new Decimal(account.nominal).times('0.055');
      const result = evaluate({
        policy: account.policy,
        nominalBalance: account.nominal,
        balance: new Decimal(account.nominal).minus(loss).toFixed(2),
        snapshots: [
          {
            tradingDay: '2026-08-27',
            status: 'open',
            dailyReference: account.nominal,
            maximumLossFloorBefore: account.expected.initialMaximumLossFloor,
            eodBalance: null,
            maximumLossFloorAfter: null,
            realizedNetProfitForDay: null,
          },
        ],
      });
      return { label: account.label, status: result.recommendedStatus };
    });
    // ONE 8% and FLEX 6% floors survive 5.5%; INSTANT's 5% floor does not.
    expect(verdicts).toStrictEqual([
      { label: 'ONE 100K', status: 'soft_locked' },
      { label: 'FLEX 50K', status: 'soft_locked' },
      { label: 'INSTANT 25K', status: 'breached' },
    ]);
  });
});
