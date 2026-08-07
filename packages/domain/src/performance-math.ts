import Decimal from 'decimal.js';

/**
 * Pure WARIBA Performance calculations — Prompt 08 Phase C. Same
 * conventions as risk-math.ts (Decimal.js only, decimal strings in and out,
 * no DB/IO/policy dependency). Formulas are PERF-023..026
 * (docs/00-decisions/DECISION_LOG.md) / Program Rulebook v1.1 §8, not the
 * stale threshold-based v1.0 numbers still printed in the Prompt Pack's
 * original Prompt 08 body text.
 */

/** PERF-023: nominal_balance * (1 + permanent_buffer_rate) — e.g. 10% buffer on a 10K account floors at 11,000. */
export function computePayoutBufferFloor(params: {
  nominalBalance: string;
  permanentBufferRate: string;
}): string {
  const floor = new Decimal(params.nominalBalance).times(
    new Decimal(1).plus(params.permanentBufferRate),
  );
  return floor.toFixed(2);
}

/** PERF-024: max(0, realized_balance - buffer_floor) — only the excess above the permanent, non-withdrawable buffer is ever eligible. */
export function computeEligibleExcess(params: {
  realizedBalance: string;
  bufferFloor: string;
}): string {
  const excess = new Decimal(params.realizedBalance).minus(params.bufferFloor);
  return Decimal.max(0, excess).toFixed(2);
}

/** PERF-024: eligibility-only — never withdrawable below the floor, distinct from a Maximum Loss breach. */
export function isPayoutBufferReached(params: {
  realizedBalance: string;
  bufferFloor: string;
}): boolean {
  return new Decimal(params.realizedBalance).greaterThanOrEqualTo(params.bufferFloor);
}

/** PERF-026: nominal_balance * performance_day_threshold_rate — e.g. 0.50% on a 10K account is 50 USD/day. */
export function computePerformanceDayThreshold(params: {
  nominalBalance: string;
  performanceDayThresholdRate: string;
}): string {
  return new Decimal(params.nominalBalance).times(params.performanceDayThresholdRate).toFixed(2);
}

/**
 * PERF-025/026: a single finalized day's eligible realized net profit
 * against the per-day threshold. Callers are responsible for only passing
 * finalized days scoped to the current, unpaid cycle — this function has no
 * notion of "cycle" or "already consumed" (see performance.ts's cycle-date
 * partitioning for why a day's own row never needs a consumed flag).
 */
export function isPerformanceDayQualified(params: {
  eligibleRealizedNetProfitForDay: string;
  performanceDayThreshold: string;
}): boolean {
  return new Decimal(params.eligibleRealizedNetProfitForDay).greaterThanOrEqualTo(
    params.performanceDayThreshold,
  );
}
