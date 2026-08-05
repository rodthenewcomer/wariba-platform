import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { evaluationOnePolicyParametersSchema } from '../src/schema';

/**
 * Prompt 05 "PARITY CHECK" — compares Rulebook constants (ONE-019..ONE-024,
 * docs/00-decisions/DECISION_LOG.md), the machine RULESET v1.1 JSON, and the
 * schema this package validates against the seeded policy_versions row.
 * Reads the JSON file at runtime (not a static TS import) so this test isn't
 * constrained by the package's tsconfig `rootDir`.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../');

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

const ruleset = readJson('docs/02-program/WARIBA_RULESET_v1.1.json') as {
  programs: {
    WARIBA_ONE: {
      profit_target: { rate: string; recognized_profit: string };
      daily_loss_limit: { rate: string; action_at_threshold: string };
      maximum_loss: {
        rate: string;
        model: string;
        next_floor_formula: string;
        floor_never_decreases: boolean;
        locks_at_nominal_balance: boolean;
      };
      consistency: { maximum_ratio: string; breach_capable: boolean };
      minimum_trading_days: number;
      qualified_days: null;
      holding_rules: { overnight_allowed: boolean; weekend_allowed: boolean };
      news_rules: { high_impact_news_trading_allowed: boolean };
    };
  };
  shared_calculation_rules: {
    maximum_loss: { static: boolean; trailing: boolean };
    consistency: { formula: string };
  };
};

const oneProgram = ruleset.programs.WARIBA_ONE;

// ONE-019..ONE-024 (docs/00-decisions/DECISION_LOG.md) — hand-copied literals.
// If a rule ever changes, update this block AND the decision log together;
// this test exists precisely so the two can't silently drift apart.
const DECISION_LOG_VALUES = {
  profit_target_rate: '0.10', // ONE-019
  daily_loss_rate: '0.03', // ONE-020
  maximum_loss_rate: '0.10', // ONE-021
  best_day_max_ratio: '0.50', // ONE-022
  minimum_trading_days: 0, // ONE-023
  qualified_days_required: null as null, // ONE-024
};

describe('parity — DECISION_LOG ↔ RULESET v1.1 program block', () => {
  it('WARIBA_ONE program numbers match the locked decisions', () => {
    expect(oneProgram.profit_target.rate).toBe(DECISION_LOG_VALUES.profit_target_rate);
    expect(oneProgram.daily_loss_limit.rate).toBe(DECISION_LOG_VALUES.daily_loss_rate);
    expect(oneProgram.maximum_loss.rate).toBe(DECISION_LOG_VALUES.maximum_loss_rate);
    expect(oneProgram.maximum_loss.model).toBe('eod_trailing');
    expect(oneProgram.consistency.maximum_ratio).toBe(DECISION_LOG_VALUES.best_day_max_ratio);
    expect(oneProgram.minimum_trading_days).toBe(DECISION_LOG_VALUES.minimum_trading_days);
    expect(oneProgram.qualified_days).toBeNull();
  });
});

describe('parity — shared calculation rules match the active v1.1 model', () => {
  it('uses EOD trailing Maximum Loss in both the shared and program blocks', () => {
    expect(ruleset.shared_calculation_rules.maximum_loss.static).toBe(false);
    expect(ruleset.shared_calculation_rules.maximum_loss.trailing).toBe(true);
  });

  it('uses only positive program-eligible profits in the Best Day denominator', () => {
    expect(ruleset.shared_calculation_rules.consistency.formula).toContain(
      'total_positive_program_eligible_net_profit_in_scope',
    );
  });
});

describe('parity — the schema validates a policy built from the RULESET v1.1 program block', () => {
  it('accepts the WARIBA_ONE program block reshaped into parameters_json form', () => {
    const parameters = evaluationOnePolicyParametersSchema.parse({
      profit_target_rate: oneProgram.profit_target.rate,
      recognized_profit: oneProgram.profit_target.recognized_profit,
      daily_loss_rate: oneProgram.daily_loss_limit.rate,
      daily_loss_action: oneProgram.daily_loss_limit.action_at_threshold,
      maximum_loss_rate: oneProgram.maximum_loss.rate,
      maximum_loss_model: oneProgram.maximum_loss.model,
      maximum_loss_floor_formula: oneProgram.maximum_loss.next_floor_formula,
      maximum_loss_floor_never_decreases: oneProgram.maximum_loss.floor_never_decreases,
      maximum_loss_locks_at_nominal: oneProgram.maximum_loss.locks_at_nominal_balance,
      best_day_max_ratio: oneProgram.consistency.maximum_ratio,
      best_day_breach_capable: oneProgram.consistency.breach_capable,
      minimum_trading_days: oneProgram.minimum_trading_days,
      qualified_days_required: oneProgram.qualified_days,
      overnight_allowed: oneProgram.holding_rules.overnight_allowed,
      weekend_allowed: oneProgram.holding_rules.weekend_allowed,
      news_allowed: oneProgram.news_rules.high_impact_news_trading_allowed,
      activation_fee: '0',
    });
    expect(parameters.profit_target_rate).toBe('0.10');
    expect(parameters.maximum_loss_model).toBe('eod_trailing');
  });
});
