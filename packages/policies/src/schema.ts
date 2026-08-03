import { z } from 'zod';

/**
 * Policy schemas — Prompt 05 "POLICY PIPELINE" step 1 (Zod schema for the
 * machine JSON already seeded on `app.policy_versions.parameters_json` by
 * supabase/migrations/20260804000007_policy_symbol_specs_v1_1.sql).
 *
 * This schema validates the EXISTING seeded v1.1.0 row — it does not invent
 * a new shape. Field names/values are pinned to decisions ONE-019..ONE-024
 * (docs/00-decisions/DECISION_LOG.md) and Program Rulebook v1.1.
 */

/** Financial values are always decimal strings on the wire — never a JS float (Constitution money rule). */
const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'must be a decimal string, never a float');

export const evaluationOnePolicyParametersSchema = z.object({
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
});

export type EvaluationOnePolicyParameters = z.infer<typeof evaluationOnePolicyParametersSchema>;

export const policyVersionRowSchema = z.object({
  id: z.string(),
  program: z.enum(['WARIBA_ONE', 'WARIBA_PERFORMANCE']),
  semantic_version: z.string(),
  status: z.enum(['draft', 'reviewed', 'approved', 'published', 'retired']),
  parameters_json: z.unknown(),
  machine_hash: z.string().nullable(),
});

export type PolicyVersionRow = z.infer<typeof policyVersionRowSchema>;
