import { describe, expect, it } from 'vitest';
import { V2_POLICY_PARAMETERS } from '@wariba/policies';
import type { EvaluationOnePolicyParameters, PerformancePolicyParameters } from '@wariba/policies';
import {
  ACCOUNT_RULE_LABEL,
  projectAccountRules,
  type AccountRuleItem,
} from '../src/account-policy-rules';

/**
 * Phase 3.4.4 §7/§76 — the coexistence proof.
 *
 * The V1 fixture is the exact `parameters_json` seeded on app.policy_versions
 * for WARIBA_ONE v1.1.0 (supabase/migrations/20260804000007). It is copied
 * rather than loaded, for the same reason the risk engine's own V1 regression
 * copies it: the point is to pin what a trader *sees* for a V1 account, and a
 * test that reads the row cannot fail when the projection starts ignoring it.
 *
 * These two products carry the same name. Everything a surface could use to
 * shortcut to a number — "ONE", "Évaluation", "10 000 USD" — is identical
 * across them, and every figure differs.
 */
const V1_ONE: EvaluationOnePolicyParameters = {
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

const NOMINAL = '10000.00';

/**
 * What `toLocaleString('fr-FR')` actually emits between thousands: U+202F,
 * a narrow no-break space, not U+0020. Named rather than pasted so a reader
 * of this file does not spend ten minutes on two strings that look identical.
 */
const NBSP = '\u202f';

function rules(
  parameters: EvaluationOnePolicyParameters | PerformancePolicyParameters,
  phase: 'evaluation' | 'performance',
  nominalBalance = NOMINAL,
): AccountRuleItem[] {
  return projectAccountRules({ parameters, phase, nominalBalance, currency: 'USD' });
}

function value(items: readonly AccountRuleItem[], key: string): string | undefined {
  return items.find((item) => item.key === key)?.displayValue;
}

function amount(items: readonly AccountRuleItem[], key: string): string | null | undefined {
  return items.find((item) => item.key === key)?.amountFormatted;
}

describe('account rules projection — V1 and V2 in one build', () => {
  it('renders a V1 ONE evaluation as 10 / 3 / 10 / 50', () => {
    const items = rules(V1_ONE, 'evaluation');
    expect(value(items, 'profit_target')).toBe('10 %');
    expect(value(items, 'daily_loss')).toBe('3 %');
    expect(value(items, 'maximum_loss')).toBe('10 %');
    expect(value(items, 'best_day')).toBe('50 %');
  });

  it('renders a V2 ONE evaluation as 8 / 3 / 8 / 35', () => {
    const items = rules(V2_POLICY_PARAMETERS.oneEvaluation, 'evaluation');
    expect(value(items, 'profit_target')).toBe('8 %');
    expect(value(items, 'daily_loss')).toBe('3 %');
    expect(value(items, 'maximum_loss')).toBe('8 %');
    expect(value(items, 'best_day')).toBe('35 %');
  });

  /**
   * The regression this whole file exists to catch. Both projections are
   * produced in the same process, from the same function, at the same nominal
   * — exactly the shape of a trader holding both accounts open in one session.
   */
  it('keeps the two ONE contracts apart when both are projected together', () => {
    const v1 = rules(V1_ONE, 'evaluation');
    const v2 = rules(V2_POLICY_PARAMETERS.oneEvaluation, 'evaluation');
    expect(value(v1, 'maximum_loss')).toBe('10 %');
    expect(value(v2, 'maximum_loss')).toBe('8 %');
    expect(value(v1, 'best_day')).toBe('50 %');
    expect(value(v2, 'best_day')).toBe('35 %');
  });

  it('gives a V1 account no exposure, margin or leverage row — it never had those rules', () => {
    const items = rules(V1_ONE, 'evaluation');
    expect(items.map((item) => item.key)).not.toContain('gross_exposure');
    expect(items.map((item) => item.key)).not.toContain('margin_cap');
    expect(items.map((item) => item.key)).not.toContain('leverage');
  });
});

describe('account rules projection — V2 families', () => {
  it('renders FLEX evaluation at its own 4 % objective and 6 % maximum loss', () => {
    const items = rules(V2_POLICY_PARAMETERS.flexEvaluation, 'evaluation');
    expect(value(items, 'profit_target')).toBe('4 %');
    expect(value(items, 'maximum_loss')).toBe('6 %');
    expect(value(items, 'gross_exposure')).toBe('3 ×');
  });

  it('renders INSTANT Performance at 2 / 5 / 30, a 3 % reserve and a 2× ceiling', () => {
    const items = rules(V2_POLICY_PARAMETERS.instantPerformance, 'performance');
    expect(value(items, 'daily_loss')).toBe('2 %');
    expect(value(items, 'maximum_loss')).toBe('5 %');
    expect(value(items, 'best_day')).toBe('30 %');
    expect(value(items, 'safety_reserve')).toBe('3 %');
    expect(value(items, 'gross_exposure')).toBe('2 ×');
    expect(value(items, 'performance_days')).toBe('5');
  });

  it('keeps ONE Performance at a 2 % reserve where FLEX and INSTANT carry 3 %', () => {
    expect(value(rules(V2_POLICY_PARAMETERS.onePerformance, 'performance'), 'safety_reserve')).toBe(
      '2 %',
    );
    expect(
      value(rules(V2_POLICY_PARAMETERS.flexPerformance, 'performance'), 'safety_reserve'),
    ).toBe('3 %');
    expect(
      value(rules(V2_POLICY_PARAMETERS.instantPerformance, 'performance'), 'safety_reserve'),
    ).toBe('3 %');
  });

  it('separates ONE/FLEX 3× from INSTANT 2×', () => {
    expect(value(rules(V2_POLICY_PARAMETERS.onePerformance, 'performance'), 'gross_exposure')).toBe(
      '3 ×',
    );
    expect(
      value(rules(V2_POLICY_PARAMETERS.instantPerformance, 'performance'), 'gross_exposure'),
    ).toBe('2 ×');
  });

  it('carries the validated margin caps: 20 % Evaluation, 15 % Performance, 10 % INSTANT', () => {
    expect(value(rules(V2_POLICY_PARAMETERS.oneEvaluation, 'evaluation'), 'margin_cap')).toBe(
      '20 %',
    );
    expect(value(rules(V2_POLICY_PARAMETERS.onePerformance, 'performance'), 'margin_cap')).toBe(
      '15 %',
    );
    expect(value(rules(V2_POLICY_PARAMETERS.instantPerformance, 'performance'), 'margin_cap')).toBe(
      '10 %',
    );
  });
});

describe('account rules projection — amounts follow the account, not the tier', () => {
  it('scales every rate to the account nominal', () => {
    const items = rules(V2_POLICY_PARAMETERS.oneEvaluation, 'evaluation', '100000.00');
    expect(amount(items, 'maximum_loss')).toBe(`8${NBSP}000 USD`);
    expect(amount(items, 'daily_loss')).toBe(`3${NBSP}000 USD`);
    // 100 000 × 3.00 — the exposure ceiling is an amount, not just a multiple.
    expect(amount(items, 'gross_exposure')).toBe(`300${NBSP}000 USD`);
  });

  it('states the Performance Day threshold in money at the account size', () => {
    const items = rules(V2_POLICY_PARAMETERS.instantPerformance, 'performance', '25000.00');
    // 0.50 % of 25 000.
    expect(amount(items, 'performance_days')).toBe('125 USD');
  });
});

describe('account rules vocabulary', () => {
  /**
   * §4/§93 — the words a trader reads. "buffer", "gross notional", "DLL" and
   * "MLL" are the platform talking to itself; a rules panel is the one surface
   * where that leak is guaranteed to reach someone who cannot act on it.
   */
  it('never leaks an internal term into a label or an explanation', () => {
    const forbidden = /buffer|gross\s*notional|DLL|MLL|policy gate|eligibility engine|EOD HWM/i;
    const everyPolicy = [
      rules(V1_ONE, 'evaluation'),
      rules(V2_POLICY_PARAMETERS.oneEvaluation, 'evaluation'),
      rules(V2_POLICY_PARAMETERS.flexEvaluation, 'evaluation'),
      rules(V2_POLICY_PARAMETERS.onePerformance, 'performance'),
      rules(V2_POLICY_PARAMETERS.flexPerformance, 'performance'),
      rules(V2_POLICY_PARAMETERS.instantPerformance, 'performance'),
    ].flat();
    for (const item of everyPolicy) {
      expect(item.label, item.key).not.toMatch(forbidden);
      expect(item.explanation, item.key).not.toMatch(forbidden);
    }
  });

  it('uses the §4 vocabulary for the reserve and the exposure ceiling', () => {
    expect(ACCOUNT_RULE_LABEL.safety_reserve).toBe('Réserve de sécurité');
    expect(ACCOUNT_RULE_LABEL.gross_exposure).toBe('Exposition maximale');
    expect(ACCOUNT_RULE_LABEL.daily_loss).toBe('Limite quotidienne');
  });

  it('gives every rule a label and an explanation, whichever policy produced it', () => {
    for (const items of [
      rules(V1_ONE, 'evaluation'),
      rules(V2_POLICY_PARAMETERS.instantPerformance, 'performance'),
    ]) {
      for (const item of items) {
        expect(item.label.length, item.key).toBeGreaterThan(0);
        expect(item.explanation.length, item.key).toBeGreaterThan(0);
        expect(item.displayValue.length, item.key).toBeGreaterThan(0);
      }
    }
  });
});
