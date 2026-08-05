import Decimal from 'decimal.js';

/**
 * Prompt 07B §4 — the 60-second minimum profit-eligible duration rule.
 *
 * Duration is measured strictly from the authoritative SERVER execution
 * timestamp of the opening fill to the authoritative server execution
 * timestamp of the closing fill — never a browser clock, never an
 * order-submission timestamp. Callers must pass server `occurred_at`
 * values (see packages/database's app.positions.opened_at / the closing
 * fill's params.now), never client-supplied times.
 *
 * WARIBA's position model is hedging, not netted (TRD-020, LOCKED): every
 * position has exactly one opening fill and one opening timestamp, reduced
 * over time by zero or more partial/full closes, each with its own closing
 * fill timestamp. That means eligibility per closed portion is a duration
 * check against the position's single opening timestamp — true FIFO
 * lot-matching across multiple entries (relevant for netted position
 * models) is not needed here and would not change the result.
 *
 * Boundary: >=60000ms is eligible, <60000ms is not. Exactly 60000ms is
 * eligible ("at minimum 60 seconds").
 */
export const MINIMUM_PROFIT_ELIGIBLE_DURATION_MS = 60_000;

export interface ProfitEligibilityInput {
  /** Authoritative server timestamp of the position's opening fill. */
  openedAt: Date;
  /** Authoritative server timestamp of this closing fill. */
  closedAt: Date;
  /** This closing fill's realized PnL (decimal string, may be negative/zero/positive). */
  realizedPnl: string;
  /** Closing commission plus the deterministic share of opening commission allocated to this closed portion. */
  allocatedFees?: string;
  /** Pinned policy threshold. Zero disables the duration exclusion for legacy policies. */
  minimumEligibleDurationMs?: number;
}

export interface ProfitEligibilityResult {
  durationMs: number;
  /** Realized PnL after every fee allocated to this closed portion. */
  netRealizedPnl: string;
  /** True only for a positive-PnL close held under the 60-second threshold. */
  isShortDurationProfit: boolean;
  /**
   * Counts toward program_eligible_balance (evaluation target, buffer,
   * Performance Days, Best Day, payout, EOD trailing floor). Any
   * non-positive net realized PnL always counts here in full, regardless of
   * duration — only short-duration POSITIVE profit is ever excluded.
   */
  eligibleRealizedPnl: string;
  /**
   * The excluded portion — always visible to the trader (never hidden),
   * just not counted toward program_eligible_balance. Zero whenever
   * isShortDurationProfit is false.
   */
  ineligibleShortDurationProfit: string;
  eligibilityReason: 'eligible' | 'short_duration_profit' | 'loss_counted' | 'breakeven';
}

/**
 * Prompt 07B — rolling 24h short-duration monitoring. Never an automatic
 * permanent breach: 3 positive closures under 60s in the trailing 24h is an
 * educational warning + a logged risk signal (no consequence to trading);
 * 6 is a temporary entry lock (closing/reducing existing positions must
 * stay allowed) plus the account being flagged for manual risk review.
 * `count24h` is the number of is_short_duration_profit=true close fills
 * for the account in the trailing 24 hours (see the partial index on
 * app.fills added alongside this rule).
 */
export const SHORT_DURATION_WARNING_THRESHOLD = 3;
export const SHORT_DURATION_ENTRY_LOCK_THRESHOLD = 6;

export type ShortDurationMonitoringStatus = 'normal' | 'warning' | 'entry_locked';

export interface ShortDurationMonitoringResult {
  status: ShortDurationMonitoringStatus;
  count24h: number;
  /** True exactly when status just crossed into 'warning' or 'entry_locked' this evaluation — the caller decides whether/how to log a signal. */
  shouldLogSignal: boolean;
}

export function evaluateShortDurationMonitoring(
  count24h: number,
  thresholds: {
    warning: number;
    entryLock: number;
  } = {
    warning: SHORT_DURATION_WARNING_THRESHOLD,
    entryLock: SHORT_DURATION_ENTRY_LOCK_THRESHOLD,
  },
): ShortDurationMonitoringResult {
  if (count24h >= thresholds.entryLock) {
    return {
      status: 'entry_locked',
      count24h,
      shouldLogSignal: count24h === thresholds.entryLock,
    };
  }
  if (count24h >= thresholds.warning) {
    return {
      status: 'warning',
      count24h,
      shouldLogSignal: count24h === thresholds.warning,
    };
  }
  return { status: 'normal', count24h, shouldLogSignal: false };
}

export function computeProfitEligibility(input: ProfitEligibilityInput): ProfitEligibilityResult {
  // Clamped to zero rather than allowed to go negative: a closedAt before
  // openedAt can only mean a clock/ordering bug upstream, never a real
  // trade. Failing safe here means "treat as the shortest possible
  // duration" (never eligible if positive) instead of crashing the whole
  // close transaction on the DB's duration_ms >= 0 check constraint.
  const durationMs = Math.max(0, input.closedAt.getTime() - input.openedAt.getTime());
  const minimumEligibleDurationMs =
    input.minimumEligibleDurationMs ?? MINIMUM_PROFIT_ELIGIBLE_DURATION_MS;
  const pnl = new Decimal(input.realizedPnl).minus(input.allocatedFees ?? '0').toDecimalPlaces(2);
  const isShortDurationProfit = pnl.greaterThan(0) && durationMs < minimumEligibleDurationMs;

  if (isShortDurationProfit) {
    return {
      durationMs,
      netRealizedPnl: pnl.toFixed(2),
      isShortDurationProfit: true,
      eligibleRealizedPnl: '0.00',
      ineligibleShortDurationProfit: pnl.toFixed(2),
      eligibilityReason: 'short_duration_profit',
    };
  }
  const eligibilityReason = pnl.greaterThan(0)
    ? 'eligible'
    : pnl.lessThan(0)
      ? 'loss_counted'
      : 'breakeven';
  return {
    durationMs,
    netRealizedPnl: pnl.toFixed(2),
    isShortDurationProfit: false,
    eligibleRealizedPnl: pnl.toFixed(2),
    ineligibleShortDurationProfit: '0.00',
    eligibilityReason,
  };
}
