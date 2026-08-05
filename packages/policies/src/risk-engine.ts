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
import type { EvaluationOnePolicyParameters } from './schema';

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
}

export interface EvaluateAccountRiskParams {
  clock: { now(): Date };
  account: {
    id: string;
    status: EvaluationAccountStatus;
    nominalBalance: string;
  };
  policy: EvaluationOnePolicyParameters;
  currentBalance: string;
  currentUnrealizedPnl: string;
  openPositionCount: number;
  pendingOrderCount: number;
  /** Ordered ascending by tradingDay; the last entry is "today". Must be non-empty. */
  dailySnapshots: readonly DailySnapshotInput[];
}

export interface RiskEngineResult {
  currentEquity: string;
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
  target: { required: string; reached: boolean };
  eligibility: { passEligible: boolean; blockingReasons: readonly RiskRuleCode[] };
  /**
   * Never 'passed' — this pure function stops at 'pass_pending' by design,
   * leaving the pass_pending -> passed transition to the orchestration layer
   * (packages/database/src/risk.ts), which is the extension point for a
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
  const realizedNetProfit = new Decimal(currentBalance).minus(account.nominalBalance).toFixed(2);

  const dailyLossFloor = computeDailyLossFloor({
    dailyReference: today.dailyReference,
    nominalBalance: account.nominalBalance,
    dailyLossRate: policy.daily_loss_rate,
  });
  const dailyLossUsed = computeDailyLossUsed({
    dailyReference: today.dailyReference,
    currentAdjustedEquity: currentEquity,
  });
  const softLockTriggered = isDailyLossSoftLockTriggered({
    currentAdjustedEquity: currentEquity,
    dailyLossFloor,
  });

  const maximumLossFloor = today.maximumLossFloorBefore;
  const maximumLossBreached = isMaximumLossBreached({
    currentEquity,
    maximumLossFloor,
  });
  const maximumLossRemaining = Decimal.max(
    0,
    new Decimal(currentEquity).minus(maximumLossFloor),
  ).toFixed(2);

  // Best Day Rule (ONE-022): only finalized days count — an in-progress "today"
  // has no final realized-profit-for-day figure yet and must never be counted.
  const finalizedPositiveDays = dailySnapshots.filter(
    (day) =>
      day.status === 'finalized' &&
      day.realizedNetProfitForDay !== null &&
      new Decimal(day.realizedNetProfitForDay).greaterThan(0),
  );
  const sumOfPositiveDayProfits = finalizedPositiveDays
    .reduce((sum, day) => sum.plus(day.realizedNetProfitForDay as string), new Decimal(0))
    .toFixed(2);
  const bestProfitableFinalizedDayProfit = finalizedPositiveDays
    .reduce((max, day) => Decimal.max(max, day.realizedNetProfitForDay as string), new Decimal(0))
    .toFixed(2);
  const bestDayRatio = computeBestDayRatio({
    bestProfitableFinalizedDayProfit,
    sumOfPositiveDayProfits,
  });
  const bestDayCompliant = isBestDayCompliant({
    bestDayRatio,
    maxRatio: policy.best_day_max_ratio,
  });

  const requiredProfit = computeProfitTargetRequired({
    nominalBalance: account.nominalBalance,
    profitTargetRate: policy.profit_target_rate,
  });
  const targetReached = isProfitTargetReached({
    realizedNetProfit,
    requiredProfit,
  });

  const blockingReasons: RiskRuleCode[] = [];
  if (!targetReached) blockingReasons.push('RISK_TARGET_NOT_REALIZED');
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
      observedValue: currentEquity,
    });
  } else if (softLockTriggered) {
    violations.push({
      ruleCode: 'RISK_DAILY_LOSS_LOCK',
      severity: 'warning',
      consequence: 'soft_lock',
      thresholdValue: dailyLossFloor,
      observedValue: currentEquity,
    });
  }

  let recommendedStatus: EvaluationAccountStatus = account.status;
  if (maximumLossBreached) {
    recommendedStatus = 'breached';
  } else if (passEligible && (account.status === 'active' || account.status === 'soft_locked')) {
    recommendedStatus = 'pass_pending';
  } else if (softLockTriggered && account.status === 'active') {
    recommendedStatus = 'soft_locked';
  } else if (!softLockTriggered && account.status === 'soft_locked') {
    recommendedStatus = 'active';
  }

  return {
    currentEquity,
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
    target: { required: requiredProfit, reached: targetReached },
    eligibility: { passEligible, blockingReasons },
    recommendedStatus,
    violations,
  };
}
