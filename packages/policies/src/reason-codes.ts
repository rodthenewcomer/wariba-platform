/**
 * Phase 3.4.3 §55 — the single canonical reason-code registry for every
 * risk/lifecycle/payout refusal the server produces.
 *
 * The rule this file exists to enforce is "no synonym codes": before adding
 * one, check whether an existing code already means the same thing. Several
 * subsystems shipped their own vocabularies before V2 (risk-engine's
 * `RISK_*` rule codes, payouts.ts's snake_case rejection codes,
 * trading.ts's `REJECTION` map, trading-permissions.ts's permission codes).
 * Those stay where they are — they are persisted in evidence rows and
 * renaming them would rewrite history — but each is mapped here exactly
 * once, so a caller that needs "the" code for a condition has one place to
 * look and the Canonical Policy Contract V2 §10 inventory has one place to
 * be checked against.
 */

export const RISK_REASON_CODES = {
  DAILY_LOSS_SOFT_LOCKED: 'DAILY_LOSS_SOFT_LOCKED',
  DAILY_RESET_COMPLETED: 'DAILY_RESET_COMPLETED',
  MAXIMUM_LOSS_BREACHED: 'MAXIMUM_LOSS_BREACHED',
  ACCOUNT_SOFT_LOCKED: 'ACCOUNT_SOFT_LOCKED',
  ACCOUNT_BREACHED: 'ACCOUNT_BREACHED',
  BEST_DAY_NOT_YET_COMPLIANT: 'BEST_DAY_NOT_YET_COMPLIANT',
  PROFIT_SHORT_DURATION_INELIGIBLE: 'PROFIT_SHORT_DURATION_INELIGIBLE',
  TARGET_NOT_REACHED: 'TARGET_NOT_REACHED',
} as const;

export const EXPOSURE_REASON_CODES = {
  MARGIN_CAP_NOT_CALIBRATED: 'MARGIN_CAP_NOT_CALIBRATED',
  MARGIN_CAP_EXCEEDED: 'MARGIN_CAP_EXCEEDED',
  GROSS_EXPOSURE_EXCEEDED: 'GROSS_EXPOSURE_EXCEEDED',
  EXPOSURE_CONVERSION_UNAVAILABLE: 'EXPOSURE_CONVERSION_UNAVAILABLE',
  NEWS_EXPOSURE_INCREASE_BLOCKED: 'NEWS_EXPOSURE_INCREASE_BLOCKED',
  MARKET_CLOSURE_EXPOSURE_INCREASE_BLOCKED: 'MARKET_CLOSURE_EXPOSURE_INCREASE_BLOCKED',
  NEWS_CALENDAR_SOURCE_UNAVAILABLE: 'NEWS_CALENDAR_SOURCE_UNAVAILABLE',
  MARKET_SESSION_SOURCE_UNAVAILABLE: 'MARKET_SESSION_SOURCE_UNAVAILABLE',
} as const;

export const PAYOUT_REASON_CODES = {
  PAYOUT_BUFFER_NOT_REACHED: 'PAYOUT_BUFFER_NOT_REACHED',
  PERFORMANCE_DAYS_INSUFFICIENT: 'PERFORMANCE_DAYS_INSUFFICIENT',
  PAYOUT_CAP_APPLIED: 'PAYOUT_CAP_APPLIED',
  PAYOUT_REVIEW_AFTER_FIFTH: 'PAYOUT_REVIEW_AFTER_FIFTH',
  PAYOUT_DEBIT_RISK_NEUTRAL: 'PAYOUT_DEBIT_RISK_NEUTRAL',
  KYC_REQUIRED: 'KYC_REQUIRED',
  KYC_NOT_VERIFIED: 'KYC_NOT_VERIFIED',
  PAYOUT_RAIL_UNAVAILABLE_FOR_COUNTRY: 'PAYOUT_RAIL_UNAVAILABLE_FOR_COUNTRY',
} as const;

export const LIFECYCLE_REASON_CODES = {
  FLEX_ACTIVATION_REQUIRED: 'FLEX_ACTIVATION_REQUIRED',
  FLEX_ACTIVATION_EXPIRED: 'FLEX_ACTIVATION_EXPIRED',
  PAID_ACQUISITION_CELL_GATED: 'PAID_ACQUISITION_CELL_GATED',
  ACTIVATION_QUOTA_REACHED: 'ACTIVATION_QUOTA_REACHED',
  RESERVE_GATE_CLOSED: 'RESERVE_GATE_CLOSED',
} as const;

export const CANONICAL_REASON_CODES = {
  ...RISK_REASON_CODES,
  ...EXPOSURE_REASON_CODES,
  ...PAYOUT_REASON_CODES,
  ...LIFECYCLE_REASON_CODES,
} as const;

export type CanonicalReasonCode =
  (typeof CANONICAL_REASON_CODES)[keyof typeof CANONICAL_REASON_CODES];

/**
 * Persisted legacy vocabularies mapped onto the canonical registry. Read
 * direction only: evidence rows keep the code they were written with, and
 * a reader resolves it here rather than every surface inventing its own
 * translation.
 */
export const LEGACY_REASON_CODE_ALIASES: Readonly<Record<string, CanonicalReasonCode>> = {
  // packages/policies/src/risk-engine.ts — persisted in app.risk_violations.
  RISK_DAILY_LOSS_LOCK: RISK_REASON_CODES.DAILY_LOSS_SOFT_LOCKED,
  RISK_MAXIMUM_LOSS_BREACH: RISK_REASON_CODES.MAXIMUM_LOSS_BREACHED,
  RISK_CONSISTENCY_NON_COMPLIANT: RISK_REASON_CODES.BEST_DAY_NOT_YET_COMPLIANT,
  RISK_TARGET_NOT_REALIZED: RISK_REASON_CODES.TARGET_NOT_REACHED,
  // packages/database/src/payouts.ts — persisted in app.payout_requests.rejection_code.
  buffer_not_reached: PAYOUT_REASON_CODES.PAYOUT_BUFFER_NOT_REACHED,
  performance_days_incomplete: PAYOUT_REASON_CODES.PERFORMANCE_DAYS_INSUFFICIENT,
  consistency_non_compliant: RISK_REASON_CODES.BEST_DAY_NOT_YET_COMPLIANT,
  kyc_not_verified: PAYOUT_REASON_CODES.KYC_NOT_VERIFIED,
  payout_method_not_configured: PAYOUT_REASON_CODES.PAYOUT_RAIL_UNAVAILABLE_FOR_COUNTRY,
  account_not_active: RISK_REASON_CODES.ACCOUNT_SOFT_LOCKED,
  // packages/database/src/trading.ts + exposure-gate.ts — persisted in app.trade_orders.
  exposure_limit_exceeded: EXPOSURE_REASON_CODES.GROSS_EXPOSURE_EXCEEDED,
  short_duration_entry_locked: RISK_REASON_CODES.PROFIT_SHORT_DURATION_INELIGIBLE,
  // packages/domain/src/trading-permissions.ts — returned pre-trade, not persisted.
  NEWS_EXPOSURE_INCREASE_BLOCKED: EXPOSURE_REASON_CODES.NEWS_EXPOSURE_INCREASE_BLOCKED,
  MARKET_CLOSURE_EXPOSURE_INCREASE_BLOCKED:
    EXPOSURE_REASON_CODES.MARKET_CLOSURE_EXPOSURE_INCREASE_BLOCKED,
  NEWS_CALENDAR_SOURCE_UNAVAILABLE: EXPOSURE_REASON_CODES.NEWS_CALENDAR_SOURCE_UNAVAILABLE,
  MARKET_SESSION_SOURCE_UNAVAILABLE: EXPOSURE_REASON_CODES.MARKET_SESSION_SOURCE_UNAVAILABLE,
  // packages/domain/src/margin-exposure.ts.
  MARGIN_CALIBRATION_REQUIRED: EXPOSURE_REASON_CODES.MARGIN_CAP_NOT_CALIBRATED,
  MARGIN_CAP_EXCEEDED: EXPOSURE_REASON_CODES.MARGIN_CAP_EXCEEDED,
  EXPOSURE_CONVERSION_UNAVAILABLE: EXPOSURE_REASON_CODES.EXPOSURE_CONVERSION_UNAVAILABLE,
};

/** Resolves any persisted or runtime code to its canonical form; returns null for an unknown code rather than inventing one. */
export function resolveCanonicalReasonCode(code: string): CanonicalReasonCode | null {
  if (code in CANONICAL_REASON_CODES) {
    return CANONICAL_REASON_CODES[code as keyof typeof CANONICAL_REASON_CODES];
  }
  return LEGACY_REASON_CODE_ALIASES[code] ?? null;
}
