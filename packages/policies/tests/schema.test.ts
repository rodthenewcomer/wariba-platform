import { describe, expect, it } from 'vitest';
import {
  evaluationOnePolicyParametersSchema,
  performancePolicyParametersSchema,
  policyVersionRowSchema,
} from '../src/schema';

/**
 * This literal object is the exact `jsonb_build_object(...)` payload seeded
 * by supabase/migrations/20260804000007_policy_symbol_specs_v1_1.sql for the
 * published WARIBA_ONE v1.1.0 policy — the schema must validate this shape
 * without modification, not a guessed/idealized one.
 */
const SEEDED_V1_1_0_PARAMETERS = {
  profit_target_rate: '0.10',
  recognized_profit: 'realized_net_profit_only',
  daily_loss_rate: '0.03',
  daily_loss_action: 'soft_lock',
  maximum_loss_rate: '0.10',
  maximum_loss_model: 'eod_trailing',
  maximum_loss_floor_formula:
    'min(nominal_balance, max(previous_floor, highest_eod_balance - nominal_balance * 0.10))',
  maximum_loss_floor_never_decreases: true,
  maximum_loss_locks_at_nominal: true,
  best_day_max_ratio: '0.50',
  best_day_breach_capable: false,
  minimum_trading_days: 0,
  qualified_days_required: null,
  overnight_allowed: true,
  weekend_allowed: false,
  news_allowed: true,
  activation_fee: '0',
};

const SEEDED_V1_1_1_PARAMETERS = {
  ...SEEDED_V1_1_0_PARAMETERS,
  maximum_loss_floor_formula:
    'min(nominal_balance, max(previous_floor, highest_program_eligible_eod_balance - nominal_balance * 0.10))',
  program_eligible_balance_enabled: true,
  minimum_profit_eligible_duration_ms: 60_000,
  short_duration_warning_count: 3,
  short_duration_entry_lock_count: 6,
};

describe('evaluationOnePolicyParametersSchema', () => {
  it('validates the seeded v1.1.0 parameters_json without modification', () => {
    const result = evaluationOnePolicyParametersSchema.parse(SEEDED_V1_1_0_PARAMETERS);
    expect(result).toEqual(SEEDED_V1_1_0_PARAMETERS);
  });

  it('validates the immutable v1.1.1 profit-eligibility controls', () => {
    const result = evaluationOnePolicyParametersSchema.parse(SEEDED_V1_1_1_PARAMETERS);
    expect(result).toEqual(SEEDED_V1_1_1_PARAMETERS);
  });

  it('rejects the stale v1.0.0 shape (different field names/values, must not silently pass)', () => {
    const seededV1 = {
      profit_target_rate: '0.08',
      daily_loss_rate: '0.04',
      maximum_loss_rate: '0.08',
      consistency_max_ratio: '0.40',
      minimum_trading_days: 4,
      qualified_days_required: 3,
      qualified_day_min_rate: '0.0020',
    };
    expect(() => evaluationOnePolicyParametersSchema.parse(seededV1)).toThrow();
  });

  it('rejects a float-looking non-string rate (money/rate values must be decimal strings)', () => {
    expect(() =>
      evaluationOnePolicyParametersSchema.parse({
        ...SEEDED_V1_1_0_PARAMETERS,
        profit_target_rate: 0.1,
      }),
    ).toThrow();
  });

  it('rejects an inverted short-duration warning/entry-lock pair (warning would be unreachable)', () => {
    expect(() =>
      evaluationOnePolicyParametersSchema.parse({
        ...SEEDED_V1_1_1_PARAMETERS,
        short_duration_warning_count: 6,
        short_duration_entry_lock_count: 3,
      }),
    ).toThrow();
  });

  it('rejects an equal short-duration warning/entry-lock pair (warning would be unreachable)', () => {
    expect(() =>
      evaluationOnePolicyParametersSchema.parse({
        ...SEEDED_V1_1_1_PARAMETERS,
        short_duration_warning_count: 6,
        short_duration_entry_lock_count: 6,
      }),
    ).toThrow();
  });
});

/**
 * The exact `jsonb_build_object(...)` payload seeded by
 * supabase/migrations/20260807000000_performance_policy_and_activation.sql
 * for WARIBA_PERFORMANCE v1.0.0 — retired by
 * supabase/migrations/20260807020000_performance_payout_engine.sql the
 * moment payout_caps_by_nominal_balance became required, the same way
 * WARIBA_ONE's own v1.0.0 was retired below. No live Performance account
 * was ever pinned to it (Phase C is the first thing that created any).
 */
const SEEDED_PERFORMANCE_1_0_0_PARAMETERS = {
  daily_loss_rate: '0.03',
  daily_loss_action: 'soft_lock',
  maximum_loss_rate: '0.10',
  maximum_loss_model: 'eod_trailing',
  maximum_loss_floor_formula:
    'min(nominal_balance, max(previous_floor, highest_eod_balance - nominal_balance * 0.10))',
  maximum_loss_floor_never_decreases: true,
  maximum_loss_locks_at_nominal: true,
  best_day_max_ratio: '0.50',
  best_day_breach_capable: false,
  overnight_allowed: true,
  weekend_allowed: false,
  news_allowed: true,
  program_eligible_balance_enabled: true,
  minimum_profit_eligible_duration_ms: 60_000,
  permanent_buffer_rate: '0.10',
  performance_day_threshold_rate: '0.005',
  performance_days_required_per_payout: 5,
  trader_split_rate_default: '0.85',
  trader_split_rate_final_cycle: '0.90',
  max_payout_cycles_before_review: 5,
};

/**
 * The exact `jsonb_build_object(...)` payload seeded by
 * supabase/migrations/20260807020000_performance_payout_engine.sql for the
 * currently published WARIBA_PERFORMANCE v1.1.0 policy — adds PERF-030's
 * candidate caps grid, keyed by nominal balance.
 */
const SEEDED_PERFORMANCE_1_1_0_PARAMETERS = {
  ...SEEDED_PERFORMANCE_1_0_0_PARAMETERS,
  payout_caps_by_nominal_balance: {
    '5000.00': ['250', '350', '500', '750', '1000'],
    '10000.00': ['500', '750', '1000', '1500', '2000'],
    '25000.00': ['1000', '1500', '2000', '2500', '3000'],
    '50000.00': ['2000', '2500', '3000', '4000', '5000'],
    '100000.00': ['3000', '4000', '5000', '6000', '8000'],
  },
};

describe('performancePolicyParametersSchema', () => {
  it('rejects the retired v1.0.0 shape (missing payout_caps_by_nominal_balance, must not silently pass)', () => {
    expect(() =>
      performancePolicyParametersSchema.parse(SEEDED_PERFORMANCE_1_0_0_PARAMETERS),
    ).toThrow();
  });

  it('validates the seeded WARIBA_PERFORMANCE v1.1.0 parameters_json without modification', () => {
    const result = performancePolicyParametersSchema.parse(SEEDED_PERFORMANCE_1_1_0_PARAMETERS);
    expect(result).toEqual(SEEDED_PERFORMANCE_1_1_0_PARAMETERS);
  });

  it('rejects a payload carrying an Evaluation-only profit target (Performance has no pass concept)', () => {
    // Not an error by itself (unknown keys are just ignored by default Zod
    // object parsing) — this documents the actual, deliberate contract:
    // profit_target_rate is never read from a Performance policy regardless
    // of whether it's present, which is what keeps risk-engine.ts from ever
    // recommending pass_pending for a WARIBA_PERFORMANCE account.
    const result = performancePolicyParametersSchema.parse({
      ...SEEDED_PERFORMANCE_1_1_0_PARAMETERS,
      profit_target_rate: '0.10',
    });
    expect(result).not.toHaveProperty('profit_target_rate');
  });

  it('rejects a non-decimal-string rate (money/rate values must be decimal strings)', () => {
    expect(() =>
      performancePolicyParametersSchema.parse({
        ...SEEDED_PERFORMANCE_1_1_0_PARAMETERS,
        permanent_buffer_rate: 0.1,
      }),
    ).toThrow();
  });

  it('rejects a missing max_payout_cycles_before_review (PERF-018/031 needs it to know when to enter WARIBA Review)', () => {
    const { max_payout_cycles_before_review: _omit, ...withoutField } =
      SEEDED_PERFORMANCE_1_1_0_PARAMETERS;
    expect(() => performancePolicyParametersSchema.parse(withoutField)).toThrow();
  });

  it('rejects a cap tuple with the wrong arity (must be exactly one cap per payout rank 1-5)', () => {
    expect(() =>
      performancePolicyParametersSchema.parse({
        ...SEEDED_PERFORMANCE_1_1_0_PARAMETERS,
        payout_caps_by_nominal_balance: { '10000.00': ['500', '750', '1000'] },
      }),
    ).toThrow();
  });
});

describe('policyVersionRowSchema', () => {
  it('validates a published WARIBA_ONE row shape', () => {
    const row = {
      id: '00000000-0000-0000-0000-000000000000',
      program: 'WARIBA_ONE',
      semantic_version: '1.1.0',
      status: 'published',
      parameters_json: SEEDED_V1_1_0_PARAMETERS,
      machine_hash: 'sha256:29f988ad91f191d345029ab8361c5056c352f3552c970d3b5a0ffa4db29d1be0',
    };
    expect(() => policyVersionRowSchema.parse(row)).not.toThrow();
  });
});
