import type { EvaluationOnePolicyParameters } from './schema';

export interface ProfitEligibilityPolicyControl {
  enabled: boolean;
  minimumDurationMs: number;
  warningCount: number;
  entryLockCount: number;
}

/**
 * Resolves Prompt 07B controls from the account's pinned policy. v1.1.0 and
 * earlier omit these fields and therefore retain their accepted behavior.
 */
export function resolveProfitEligibilityPolicy(
  parameters: EvaluationOnePolicyParameters,
): ProfitEligibilityPolicyControl {
  const enabled = parameters.program_eligible_balance_enabled === true;
  return {
    enabled,
    minimumDurationMs: enabled ? (parameters.minimum_profit_eligible_duration_ms ?? 60_000) : 0,
    warningCount: enabled
      ? (parameters.short_duration_warning_count ?? 3)
      : Number.MAX_SAFE_INTEGER,
    entryLockCount: enabled
      ? (parameters.short_duration_entry_lock_count ?? 6)
      : Number.MAX_SAFE_INTEGER,
  };
}
