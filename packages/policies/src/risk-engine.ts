import Decimal from 'decimal.js';
import {
  computeBestDayRatio,
  computeDailyLossFloor,
  computeDailyLossUsed,
  computeProfitTargetRequired,
  isBestDayCompliant,
  isDailyLossSoftLockTriggered,
  isMaximumLossBreached,
  isProfitTargetReached,
  type EvaluationAccountStatus,
} from '@wariba/domain';

/**
 * The subset of policy parameters this pure risk engine actually reads —
 * narrower than EvaluationOnePolicyParameters so a WARIBA_PERFORMANCE
 * policy (Prompt 08) can satisfy it too, structurally, without inventing a
 * second copy of this function. `profit_target_rate` is optional/nullable:
 * WARIBA_ONE always sets it (a profit target is the whole point of an
 * Evaluation); WARIBA_PERFORMANCE never does, since a Performance account
 * has no "pass" concept — it cycles via Performance Days and payouts
 * instead (see packages/database/src/performance.ts). Its absence is what
 * disables the pass_pending transition below, not a separate "program"
 * flag — one less thing that could drift out of sync with the policy row
 * actually loaded.
 */
export interface RiskPolicyParameters {
  daily_loss_rate: string;
  maximum_loss_rate: string;
  best_day_max_ratio: string;
  profit_target_rate?: string | null;
}

export type RiskRuleCode =
  | 'RISK_DAILY_LOSS_LOCK'
  | 'RISK_MAXIMUM_LOSS_BREACH'
  | 'RISK_CONSISTENCY_NON_COMPLIANT'
  | 'RISK_TARGET_NOT_REALIZED'
  | 'RISK_OPEN_POSITIONS_BLOCK_TRANSITION'
  | 'RISK_PENDING_ORDERS_BLOCK_TRANSITION';

export interface RiskViolation {
  ruleCode: 'RISK_DAILY_LOSS_LOCK' | 'RISK_MAXIMUM_LOSS_BREACH';
  severity: 'warning' | 'critical';
  consequence: 'soft_lock' | 'hard_breach';
  thresholdValue: string;
  observedValue: string;
}

export interface DailySnapshotInput {
  tradingDay: string;
  status: 'open' | 'finalized';
  dailyReference: string;
  maximumLossFloorBefore: string;
  eodBalance: string | null;
  maximumLossFloorAfter: string | null;
  realizedNetProfitForDay: string | null;
  /** Prompt 07B projection fields. Optional only for legacy policy/test fixtures. */
  programSodBalance?: string;
  programEodBalance?: string | null;
  highestProgramEodBalanceAfter?: string | null;
  eligibleRealizedNetProfitForDay?: string | null;
}

export interface EvaluateAccountRiskParams {
  clock: { now(): Date };
  account: {
    id: string;
    status: EvaluationAccountStatus;
    nominalBalance: string;
  };
  policy: RiskPolicyParameters;
  currentBalance: string;
  /** Actual balance less cumulative short-duration profit that is not program-eligible. */
  currentProgramEligibleBalance?: string;
  currentUnrealizedPnl: string;
  openPositionCount: number;
  pendingOrderCount: number;
  /** Ordered ascending by tradingDay; the last entry is "today". Must be non-empty. */
  dailySnapshots: readonly DailySnapshotInput[];
}

export interface RiskEngineResult {
  currentEquity: string;
  programEligibleBalance: string;
  programEligibleEquity: string;
  realizedNetProfit: string;
  dailyLoss: { reference: string; floor: string; used: string; softLockTriggered: boolean };
  maximumLoss: { floor: string; remaining: string; breached: boolean };
  bestDay: {
    ratio: string | null;
    compliant: boolean;
    /** Absolute figures behind the ratio — "0.00" once a positive day exists. */
    bestDayProfit: string;
    positiveDaysProfitSum: string;
  };
  /** Meaningless for WARIBA_PERFORMANCE (policy.profit_target_rate absent) — always reports reached: true. */
  target: { required: string; current: string; reached: boolean };
  /** eligibility.passEligible never drives a transition for WARIBA_PERFORMANCE — see recommendedStatus. */
  eligibility: { passEligible: boolean; blockingReasons: readonly RiskRuleCode[] };
  /**
   * Never 'pass_pending' or 'passed' when policy.profit_target_rate is
   * absent (WARIBA_PERFORMANCE) — those states only exist for an
   * Evaluation's one-time pass. A Performance account only ever cycles
   * among active/soft_locked/breached here; its cycle/payout eligibility
   * is a separate concern (packages/database/src/performance.ts), not a
   * trading_accounts.status transition.
   *
   * Never 'passed' for WARIBA_ONE either — this pure function stops at
   * 'pass_pending' by design, leaving the pass_pending -> passed transition
   * to the orchestration layer (packages/database/src/risk.ts), which is
   * the extension point for a
   * future manual-review gate ("no_blocking_review" is hardcoded true here;
   * no review workflow exists yet).
   */
  recommendedStatus: EvaluationAccountStatus;
  violations: readonly RiskViolation[];
}

/**
 * Prompt 05 risk engine — pure function over (account, policy, ledger-derived
 * state, clock). No DB/IO. Formulas are ONE-019..ONE-022
 * (docs/00-decisions/DECISION_LOG.md); rule codes are
 * docs/02-program/WARIBA_RULESET_v1.1.json `reason_codes`.
 */
export function evaluateAccountRisk(params: EvaluateAccountRiskParams): RiskEngineResult {
  const { account, policy, currentBalance, currentUnrealizedPnl, dailySnapshots } = params;

  if (dailySnapshots.length === 0) {
    throw new Error(
      `evaluateAccountRisk: account ${account.id} has no daily snapshot — a snapshot must exist ` +
        'before risk can be evaluated (finalizeDailyBoundaryForAccount creates the first one).',
    );
  }

  const today = dailySnapshots[dailySnapshots.length - 1] as DailySnapshotInput;
  const currentEquity = new Decimal(currentBalance).plus(currentUnrealizedPnl).toFixed(2);
  const programEligibleBalance = params.currentProgramEligibleBalance ?? currentBalance;
  const programEligibleEquity = new Decimal(programEligibleBalance)
    .plus(currentUnrealizedPnl)
    .toFixed(2);
  const realizedNetProfit = new Decimal(programEligibleBalance)
    .minus(account.nominalBalance)
    .toFixed(2);

  const dailyLossFloor = computeDailyLossFloor({
    dailyReference: today.dailyReference,
    nominalBalance: account.nominalBalance,
    dailyLossRate: policy.daily_loss_rate,
  });
  const dailyLossUsed = computeDailyLossUsed({
    dailyReference: today.dailyReference,
    currentAdjustedEquity: programEligibleEquity,
  });
  const softLockTriggered = isDailyLossSoftLockTriggered({
    currentAdjustedEquity: programEligibleEquity,
    dailyLossFloor,
  });

  const maximumLossFloor = today.maximumLossFloorBefore;
  const maximumLossBreached = isMaximumLossBreached({
    currentEquity: programEligibleEquity,
    maximumLossFloor,
  });
  const maximumLossRemaining = Decimal.max(
    0,
    new Decimal(programEligibleEquity).minus(maximumLossFloor),
  ).toFixed(2);

  // Best Day Rule (ONE-022): only finalized days count — an in-progress "today"
  // has no final realized-profit-for-day figure yet and must never be counted.
  const finalizedPositiveDays = dailySnapshots.filter(
    (day) =>
      day.status === 'finalized' &&
      (day.eligibleRealizedNetProfitForDay ?? day.realizedNetProfitForDay) !== null &&
      new Decimal(
        day.eligibleRealizedNetProfitForDay ?? (day.realizedNetProfitForDay as string),
      ).greaterThan(0),
  );
  const sumOfPositiveDayProfits = finalizedPositiveDays
    .reduce(
      (sum, day) =>
        sum.plus(day.eligibleRealizedNetProfitForDay ?? (day.realizedNetProfitForDay as string)),
      new Decimal(0),
    )
    .toFixed(2);
  const bestProfitableFinalizedDayProfit = finalizedPositiveDays
    .reduce(
      (max, day) =>
        Decimal.max(
          max,
          day.eligibleRealizedNetProfitForDay ?? (day.realizedNetProfitForDay as string),
        ),
      new Decimal(0),
    )
    .toFixed(2);
  const bestDayRatio = computeBestDayRatio({
    bestProfitableFinalizedDayProfit,
    sumOfPositiveDayProfits,
  });
  const bestDayCompliant = isBestDayCompliant({
    bestDayRatio,
    maxRatio: policy.best_day_max_ratio,
  });

  // WARIBA_PERFORMANCE policies carry no profit_target_rate — there is no
  // "pass" concept to reach, so the target is reported as vacuously met
  // rather than as a permanently-unreachable blocker.
  const requiredProfit =
    policy.profit_target_rate != null
      ? computeProfitTargetRequired({
          nominalBalance: account.nominalBalance,
          profitTargetRate: policy.profit_target_rate,
        })
      : '0.00';
  const targetReached =
    policy.profit_target_rate != null
      ? isProfitTargetReached({ realizedNetProfit, requiredProfit })
      : true;

  const blockingReasons: RiskRuleCode[] = [];
  if (policy.profit_target_rate != null && !targetReached) {
    blockingReasons.push('RISK_TARGET_NOT_REALIZED');
  }
  if (!bestDayCompliant) blockingReasons.push('RISK_CONSISTENCY_NON_COMPLIANT');
  if (params.openPositionCount > 0) blockingReasons.push('RISK_OPEN_POSITIONS_BLOCK_TRANSITION');
  if (params.pendingOrderCount > 0) blockingReasons.push('RISK_PENDING_ORDERS_BLOCK_TRANSITION');
  // no_blocking_review: hardcoded — no manual review workflow exists yet.
  const passEligible = !maximumLossBreached && blockingReasons.length === 0;

  const violations: RiskViolation[] = [];
  if (maximumLossBreached) {
    violations.push({
      ruleCode: 'RISK_MAXIMUM_LOSS_BREACH',
      severity: 'critical',
      consequence: 'hard_breach',
      thresholdValue: maximumLossFloor,
      observedValue: programEligibleEquity,
    });
  } else if (softLockTriggered) {
    violations.push({
      ruleCode: 'RISK_DAILY_LOSS_LOCK',
      severity: 'warning',
      consequence: 'soft_lock',
      thresholdValue: dailyLossFloor,
      observedValue: programEligibleEquity,
    });
  }

  let recommendedStatus: EvaluationAccountStatus = account.status;
  if (maximumLossBreached) {
    recommendedStatus = 'breached';
  } else if (
    policy.profit_target_rate != null &&
    passEligible &&
    (account.status === 'active' || account.status === 'soft_locked')
  ) {
    recommendedStatus = 'pass_pending';
  } else if (softLockTriggered && account.status === 'active') {
    recommendedStatus = 'soft_locked';
  } else if (!softLockTriggered && account.status === 'soft_locked') {
    recommendedStatus = 'active';
  }

  return {
    currentEquity,
    programEligibleBalance,
    programEligibleEquity,
    realizedNetProfit,
    dailyLoss: {
      reference: today.dailyReference,
      floor: dailyLossFloor,
      used: dailyLossUsed,
      softLockTriggered,
    },
    maximumLoss: {
      floor: maximumLossFloor,
      remaining: maximumLossRemaining,
      breached: maximumLossBreached,
    },
    bestDay: {
      ratio: bestDayRatio,
      compliant: bestDayCompliant,
      bestDayProfit: bestProfitableFinalizedDayProfit,
      positiveDaysProfitSum: sumOfPositiveDayProfits,
    },
    target: { required: requiredProfit, current: realizedNetProfit, reached: targetReached },
    eligibility: { passEligible, blockingReasons },
    recommendedStatus,
    violations,
  };
}
