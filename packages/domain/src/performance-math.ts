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

export interface BufferBuildProgress {
  /** The buffer the policy asks this account to build: floor - nominal. */
  requiredAmount: string;
  /** How much of it exists today, clamped to [0, requiredAmount]. */
  builtAmount: string;
  remainingAmount: string;
  /** 0-100. `100` when the policy asks for no buffer at all. */
  percent: number;
}

/**
 * PERF-023/024 — how far an account is through *building* its permanent
 * buffer, measured from the nominal balance rather than from zero.
 *
 * The distinction is the whole point. `realizedBalance / bufferFloor` is a
 * ratio between two numbers that both start large, so a Performance account
 * that has never placed a trade reads 10 000 / 11 000 = 91 % — a number that
 * looks like it is nearly through something when nothing has happened. The
 * buffer a trader has actually built is the profit above nominal, and on a new
 * account that is zero.
 *
 * Excess above the floor is not more buffer; it is eligible cash
 * (`computeEligibleExcess`), so this clamps at 100 % rather than running on.
 */
export function computeBufferBuildProgress(params: {
  realizedBalance: string;
  nominalBalance: string;
  bufferFloor: string;
}): BufferBuildProgress {
  const required = Decimal.max(0, new Decimal(params.bufferFloor).minus(params.nominalBalance));
  const built = Decimal.min(
    required,
    Decimal.max(0, new Decimal(params.realizedBalance).minus(params.nominalBalance)),
  );
  return {
    requiredAmount: required.toFixed(2),
    builtAmount: built.toFixed(2),
    remainingAmount: required.minus(built).toFixed(2),
    // A policy that asks for no buffer has nothing left to build, which is
    // complete — not 0/0 rendered as "0 %" on a condition that already holds.
    percent: required.isZero()
      ? 100
      : Math.min(100, Math.max(0, Math.round(built.dividedBy(required).times(100).toNumber()))),
  };
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

/** PERF-027/028: the final cycle (max_payout_cycles_before_review) uses the richer split; every earlier cycle uses the default. */
export function resolveTraderSplitRate(params: {
  cycleNumber: number;
  maxPayoutCyclesBeforeReview: number;
  defaultSplitRate: string;
  finalCycleSplitRate: string;
  splitSchedule?: readonly [string, string, string, string, string];
}): string {
  const scheduled = params.splitSchedule?.[params.cycleNumber - 1];
  if (scheduled !== undefined) return scheduled;
  return params.cycleNumber >= params.maxPayoutCyclesBeforeReview
    ? params.finalCycleSplitRate
    : params.defaultSplitRate;
}

/** The net cap converted to its gross-base equivalent at this cycle's split — the "cap" the trader actually feels is net cash, but the account debit is gross. */
export function computeMaxGrossBaseFromCap(params: { cap: string; splitRate: string }): string {
  return new Decimal(params.cap).dividedBy(params.splitRate).toFixed(2);
}

/** What the trader's requested net cash implies as a gross base, before it's clamped by excess/cap. */
export function computeRequestedGrossBase(params: {
  requestedNetTraderCash: string;
  splitRate: string;
}): string {
  return new Decimal(params.requestedNetTraderCash).dividedBy(params.splitRate).toFixed(2);
}

/** PERF-024/029/030: the three-way min that is the entire payout formula — buffer excess, the trader's own request, and the cap. No universal 50% haircut (PERF-029). */
export function computeApprovedGrossBase(params: {
  eligibleExcess: string;
  requestedGrossBase: string;
  maxGrossBaseFromCap: string;
}): string {
  return Decimal.min(
    params.eligibleExcess,
    params.requestedGrossBase,
    params.maxGrossBaseFromCap,
  ).toFixed(2);
}

/** PERF-027/028: the trader's actual cash from the approved (possibly clamped-down) gross base — never the originally requested amount. */
export function computeTraderNetCash(params: {
  approvedGrossBase: string;
  splitRate: string;
}): string {
  return new Decimal(params.approvedGrossBase).times(params.splitRate).toFixed(2);
}

/**
 * approvedGrossBase - traderNetCash, deliberately not approvedGrossBase *
 * (1 - splitRate) — an independent multiplication can round to a different
 * last cent than the subtraction, which would let traderNetCash +
 * waribaShare silently drift away from approvedGrossBase by a cent. The
 * ledger must reconcile exactly, not approximately.
 */
export function computeWaribaShare(params: {
  approvedGrossBase: string;
  traderNetCash: string;
}): string {
  return new Decimal(params.approvedGrossBase).minus(params.traderNetCash).toFixed(2);
}
