import {
  MINIMUM_PROFIT_ELIGIBLE_DURATION_MS,
  SHORT_DURATION_ENTRY_LOCK_THRESHOLD,
  SHORT_DURATION_WARNING_THRESHOLD,
} from '@wariba/domain';

export interface ProfitEligibilityPolicyControl {
  enabled: boolean;
  minimumDurationMs: number;
  warningCount: number;
  entryLockCount: number;
}

/**
 * The subset of policy parameters this reads — narrower than
 * EvaluationOnePolicyParameters so a PerformancePolicyParameters row (which
 * has none of these fields yet — Prompt 08 Phase C wires up the equivalent
 * exclusion for Performance Days) satisfies this structurally too and
 * simply resolves to `enabled: false`, same as a pre-07B WARIBA_ONE row.
 */
export interface ProfitEligibilitySourceParameters {
  program_eligible_balance_enabled?: boolean | undefined;
  minimum_profit_eligible_duration_ms?: number | undefined;
  short_duration_warning_count?: number | undefined;
  short_duration_entry_lock_count?: number | undefined;
}

/**
 * Resolves Prompt 07B controls from the account's pinned policy. v1.1.0 and
 * earlier omit these fields and therefore retain their accepted behavior.
 * Falls back to @wariba/domain's own named constants (not re-literaled
 * values) so a future change to the canonical threshold can't silently
 * diverge from what a policy row that omits the field actually gets.
 */
export function resolveProfitEligibilityPolicy(
  parameters: ProfitEligibilitySourceParameters,
): ProfitEligibilityPolicyControl {
  const enabled = parameters.program_eligible_balance_enabled === true;
  return {
    enabled,
    minimumDurationMs: enabled
      ? (parameters.minimum_profit_eligible_duration_ms ?? MINIMUM_PROFIT_ELIGIBLE_DURATION_MS)
      : 0,
    warningCount: enabled
      ? (parameters.short_duration_warning_count ?? SHORT_DURATION_WARNING_THRESHOLD)
      : Number.MAX_SAFE_INTEGER,
    entryLockCount: enabled
      ? (parameters.short_duration_entry_lock_count ?? SHORT_DURATION_ENTRY_LOCK_THRESHOLD)
      : Number.MAX_SAFE_INTEGER,
  };
}
