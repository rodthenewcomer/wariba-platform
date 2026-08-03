import { describe, expect, it } from 'vitest';
import { evaluationOnePolicyParametersSchema, policyVersionRowSchema } from '../src/schema';

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

describe('evaluationOnePolicyParametersSchema', () => {
  it('validates the seeded v1.1.0 parameters_json without modification', () => {
    const result = evaluationOnePolicyParametersSchema.parse(SEEDED_V1_1_0_PARAMETERS);
    expect(result).toEqual(SEEDED_V1_1_0_PARAMETERS);
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
