import { z } from 'zod';

/**
 * Policy schemas — Prompt 05 "POLICY PIPELINE" step 1 (Zod schema for the
 * machine JSON already seeded on `app.policy_versions.parameters_json` by
 * supabase/migrations/20260804000007_policy_symbol_specs_v1_1.sql).
 *
 * Optional Prompt 07B fields preserve compatibility with accounts pinned to
 * v1.1.0. They are present only from v1.1.1 onward; absence means the
 * short-duration eligibility control is disabled for that pinned account.
 */

/** Financial values are always decimal strings on the wire — never a JS float (Constitution money rule). */
const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'must be a decimal string, never a float');

export const evaluationOnePolicyParametersSchema = z
  .object({
    profit_target_rate: decimalString,
    recognized_profit: z.literal('realized_net_profit_only'),
    daily_loss_rate: decimalString,
    daily_loss_action: z.literal('soft_lock'),
    maximum_loss_rate: decimalString,
    maximum_loss_model: z.literal('eod_trailing'),
    maximum_loss_floor_formula: z.string(),
    maximum_loss_floor_never_decreases: z.literal(true),
    maximum_loss_locks_at_nominal: z.literal(true),
    best_day_max_ratio: decimalString,
    best_day_breach_capable: z.literal(false),
    minimum_trading_days: z.number().int().nonnegative(),
    qualified_days_required: z.null(),
    overnight_allowed: z.boolean(),
    weekend_allowed: z.boolean(),
    news_allowed: z.boolean(),
    activation_fee: decimalString,
    program_eligible_balance_enabled: z.boolean().optional(),
    minimum_profit_eligible_duration_ms: z.number().int().nonnegative().optional(),
    short_duration_warning_count: z.number().int().positive().optional(),
    short_duration_entry_lock_count: z.number().int().positive().optional(),
  })
  .refine(
    (params) =>
      params.short_duration_warning_count === undefined ||
      params.short_duration_entry_lock_count === undefined ||
      params.short_duration_warning_count < params.short_duration_entry_lock_count,
    {
      message:
        'short_duration_warning_count must be strictly less than short_duration_entry_lock_count — ' +
        'evaluateShortDurationMonitoring checks entry-lock before warning, so an inverted or equal ' +
        'pair would make the warning stage unreachable and jump straight to a lock with no prior notice.',
      path: ['short_duration_warning_count'],
    },
  );

export type EvaluationOnePolicyParameters = z.infer<typeof evaluationOnePolicyParametersSchema>;

/**
 * Prompt 08 — WARIBA_PERFORMANCE policy parameters. Deliberately a
 * different shape from EvaluationOnePolicyParameters, not a variant with
 * optional fields: a Performance account has no profit target or pass
 * concept (PERF-032..035 — same daily-loss/max-loss/best-day model as
 * Evaluation, everything else replaced by the buffer/Performance
 * Days/payout cycle machinery in packages/database/src/performance.ts).
 * Omitting profit_target_rate entirely (rather than setting it to some
 * unreachable placeholder) is what keeps risk-engine.ts from ever
 * recommending pass_pending for these accounts — see RiskPolicyParameters'
 * own doc comment.
 */
export const performancePolicyParametersSchema = z.object({
  daily_loss_rate: decimalString,
  daily_loss_action: z.literal('soft_lock'),
  maximum_loss_rate: decimalString,
  maximum_loss_model: z.literal('eod_trailing'),
  maximum_loss_floor_formula: z.string(),
  maximum_loss_floor_never_decreases: z.literal(true),
  maximum_loss_locks_at_nominal: z.literal(true),
  best_day_max_ratio: decimalString,
  best_day_breach_capable: z.literal(false),
  overnight_allowed: z.boolean(),
  weekend_allowed: z.boolean(),
  news_allowed: z.boolean(),
  /** Prompt 08 §10 — same short-duration exclusion as Prompt 07B's WARIBA_ONE control, applied to Performance Days instead of the profit target. */
  program_eligible_balance_enabled: z.boolean().optional(),
  minimum_profit_eligible_duration_ms: z.number().int().nonnegative().optional(),
  short_duration_warning_count: z.number().int().positive().optional(),
  short_duration_entry_lock_count: z.number().int().positive().optional(),
  /** PERF-023/024 — permanent, non-withdrawable, built once. */
  permanent_buffer_rate: decimalString,
  /** PERF-025/026 — 0.50% of nominal per day, five new days required per payout. */
  performance_day_threshold_rate: decimalString,
  performance_days_required_per_payout: z.number().int().positive(),
  /** PERF-027 — applies to payout cycles 1 through max_payout_cycles_before_review - 1. */
  trader_split_rate_default: decimalString,
  /** PERF-028 — applies to the final payout cycle (max_payout_cycles_before_review). */
  trader_split_rate_final_cycle: decimalString,
  /** PERF-018/031 — cycle after which the account enters WARIBA Review instead of a new cycle. */
  max_payout_cycles_before_review: z.number().int().positive(),
  /**
   * PERF-030, `CANDIDATE` — net-to-trader cap per payout rank, keyed by
   * nominal balance (as a decimal string matching trading_accounts.
   * nominal_balance, e.g. "10000.00"). CAP-010: must not be increased
   * before real beta data exists — a new policy version, not a code
   * change, is how this ever moves.
   */
  payout_caps_by_nominal_balance: z.record(
    z.string(),
    z.tuple([decimalString, decimalString, decimalString, decimalString, decimalString]),
  ),
});
export type PerformancePolicyParameters = z.infer<typeof performancePolicyParametersSchema>;

export const policyVersionRowSchema = z.object({
  id: z.string(),
  program: z.enum(['WARIBA_ONE', 'WARIBA_PERFORMANCE']),
  semantic_version: z.string(),
  status: z.enum(['draft', 'reviewed', 'approved', 'published', 'retired']),
  parameters_json: z.unknown(),
  machine_hash: z.string().nullable(),
});

export type PolicyVersionRow = z.infer<typeof policyVersionRowSchema>;
