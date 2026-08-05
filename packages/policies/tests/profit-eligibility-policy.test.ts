import { describe, expect, it } from 'vitest';
import { resolveProfitEligibilityPolicy } from '../src/profit-eligibility-policy';
import type { EvaluationOnePolicyParameters } from '../src/schema';

const LEGACY: EvaluationOnePolicyParameters = {
  profit_target_rate: '0.10',
  recognized_profit: 'realized_net_profit_only',
  daily_loss_rate: '0.03',
  daily_loss_action: 'soft_lock',
  maximum_loss_rate: '0.10',
  maximum_loss_model: 'eod_trailing',
  maximum_loss_floor_formula: 'legacy',
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

describe('resolveProfitEligibilityPolicy', () => {
  it('keeps pre-v1.1.1 pinned policies non-retroactive', () => {
    expect(resolveProfitEligibilityPolicy(LEGACY)).toEqual({
      enabled: false,
      minimumDurationMs: 0,
      warningCount: Number.MAX_SAFE_INTEGER,
      entryLockCount: Number.MAX_SAFE_INTEGER,
    });
  });

  it('resolves the published v1.1.1 controls', () => {
    expect(
      resolveProfitEligibilityPolicy({
        ...LEGACY,
        program_eligible_balance_enabled: true,
        minimum_profit_eligible_duration_ms: 60_000,
        short_duration_warning_count: 3,
        short_duration_entry_lock_count: 6,
      }),
    ).toEqual({ enabled: true, minimumDurationMs: 60_000, warningCount: 3, entryLockCount: 6 });
  });
});
