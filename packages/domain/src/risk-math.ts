import Decimal from 'decimal.js';

/**
 * Pure WARIBA ONE risk calculations — Decimal.js only, decimal strings in and
 * out, never float (Engineering Constitution money rule). No DB/IO/policy
 * dependency: packages/policies composes these against a parsed policy
 * object, packages/database's risk.ts calls that while holding the account
 * row lock, but this math doesn't know about any of that.
 *
 * Formulas and thresholds are pinned to Program Rulebook v1.1 / decisions
 * ONE-019..ONE-022 (docs/00-decisions/DECISION_LOG.md), not the stale v1.0
 * numbers still printed in the Prompt Pack's Prompt 05 body text.
 */

/** ONE-020: max(balance_at_reset, equity_at_reset) — the DLL reference basis for the current UTC day. */
export function computeDailyReference(params: {
  balanceAtReset: string;
  equityAtReset: string;
}): string {
  return Decimal.max(params.balanceAtReset, params.equityAtReset).toFixed(2);
}

/** ONE-020: daily_reference - nominal_balance * daily_loss_rate. */
export function computeDailyLossFloor(params: {
  dailyReference: string;
  nominalBalance: string;
  dailyLossRate: string;
}): string {
  const drawdownAmount = new Decimal(params.nominalBalance).times(params.dailyLossRate);
  return new Decimal(params.dailyReference).minus(drawdownAmount).toFixed(2);
}

/** ONE-020: how much of today's daily-loss budget has been used, never negative. */
export function computeDailyLossUsed(params: {
  dailyReference: string;
  currentAdjustedEquity: string;
}): string {
  const used = new Decimal(params.dailyReference).minus(params.currentAdjustedEquity);
  return Decimal.max(0, used).toFixed(2);
}

/** ONE-020: soft lock (never a hard breach by itself) once equity is at or below the daily floor. */
export function isDailyLossSoftLockTriggered(params: {
  currentAdjustedEquity: string;
  dailyLossFloor: string;
}): boolean {
  return new Decimal(params.currentAdjustedEquity).lessThanOrEqualTo(params.dailyLossFloor);
}

/**
 * Prompt 07 — RiskRibbon/Guardian "DLL restante". The engine's own
 * RiskEngineResult only carries reference/floor/used (softLockTriggered is
 * the actual gate — this is purely a display figure), so the DTO boundary
 * (services/realtime/src/snapshot.ts) derives it here rather than in the
 * engine itself. Equivalent to (currentAdjustedEquity - floor), just
 * expressed from the fields already on the DTO; never negative.
 */
export function computeDailyLossRemaining(params: {
  reference: string;
  floor: string;
  used: string;
}): string {
  const budget = new Decimal(params.reference).minus(params.floor);
  return Decimal.max(0, budget.minus(params.used)).toFixed(2);
}

/**
 * Prompt 07 — how much of today's daily-loss budget is used, as a 0..1+
 * ratio. Purely informative (an "early soft-lock warning" per
 * buildAccountSnapshot's own doc comment) — softLockTriggered/1.0 is the
 * real threshold, this just lets the UI show attention/near-limit tiers
 * before that point.
 */
export function computeDailyLossUsedRatio(params: {
  reference: string;
  floor: string;
  used: string;
}): string {
  const budget = new Decimal(params.reference).minus(params.floor);
  if (budget.lessThanOrEqualTo(0)) return '0.0000';
  return new Decimal(params.used).dividedBy(budget).toFixed(4);
}

/** ONE-021: the EOD-trailing floor on day zero, before any day has finalized. */
export function computeInitialMaximumLossFloor(params: {
  nominalBalance: string;
  maximumLossRate: string;
}): string {
  const drawdownAmount = new Decimal(params.nominalBalance).times(params.maximumLossRate);
  return new Decimal(params.nominalBalance).minus(drawdownAmount).toFixed(2);
}

/**
 * ONE-021: min(nominal_balance, max(previous_floor, highest_eod_balance - nominal_balance * rate)).
 * Only ever called once a UTC day has finalized — the floor never decreases and never exceeds
 * the nominal balance.
 */
export function computeNextMaximumLossFloor(params: {
  previousFloor: string;
  highestEodBalance: string;
  nominalBalance: string;
  maximumLossRate: string;
}): string {
  const drawdownAmount = new Decimal(params.nominalBalance).times(params.maximumLossRate);
  const candidateFloor = new Decimal(params.highestEodBalance).minus(drawdownAmount);
  const ratchetedFloor = Decimal.max(params.previousFloor, candidateFloor);
  return Decimal.min(params.nominalBalance, ratchetedFloor).toFixed(2);
}

/** ONE-021: terminal hard breach once equity is at or below the current Maximum Loss floor. */
export function isMaximumLossBreached(params: {
  currentEquity: string;
  maximumLossFloor: string;
}): boolean {
  return new Decimal(params.currentEquity).lessThanOrEqualTo(params.maximumLossFloor);
}

/**
 * ONE-022 (Best Day Rule): best profitable finalized day / sum of ONLY the positive days —
 * not total realized profit (that was the superseded v1.0 "consistency" denominator).
 * Returns null when there are no positive days yet (ratio is undefined, not zero).
 */
export function computeBestDayRatio(params: {
  bestProfitableFinalizedDayProfit: string;
  sumOfPositiveDayProfits: string;
}): string | null {
  const denominator = new Decimal(params.sumOfPositiveDayProfits);
  if (denominator.lessThanOrEqualTo(0)) {
    return null;
  }
  return new Decimal(params.bestProfitableFinalizedDayProfit).dividedBy(denominator).toFixed(4);
}

/** ONE-022: eligibility-only — a non-compliant ratio blocks PASS, it never breaches the account. */
export function isBestDayCompliant(params: {
  bestDayRatio: string | null;
  maxRatio: string;
}): boolean {
  if (params.bestDayRatio === null) {
    return false;
  }
  return new Decimal(params.bestDayRatio).lessThanOrEqualTo(params.maxRatio);
}

/** ONE-019: nominal_balance * profit_target_rate. */
export function computeProfitTargetRequired(params: {
  nominalBalance: string;
  profitTargetRate: string;
}): string {
  return new Decimal(params.nominalBalance).times(params.profitTargetRate).toFixed(2);
}

/** ONE-019: realized net profit only — unrealized PnL never counts toward the target. */
export function isProfitTargetReached(params: {
  realizedNetProfit: string;
  requiredProfit: string;
}): boolean {
  return new Decimal(params.realizedNetProfit).greaterThanOrEqualTo(params.requiredProfit);
}
