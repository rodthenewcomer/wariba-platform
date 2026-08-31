import { describe, expect, it } from 'vitest';
import {
  programLabel,
  programShortLabel,
  programPhaseLabel,
  type AccountIdentity,
} from '../lib/account-display';

/**
 * Phase 3.4.4 §9/§30/§44 — an account is named by the product it belongs to.
 *
 * The regression this file pins is one the codebase has now had twice, one
 * layer apart. W0 caught `TradeHeaderPanel` hardcoding "WARIBA ONE" and moved
 * the label onto `programType`. That was right for two programs and became
 * wrong at three families, because `programType` encodes the *phase*: a FLEX
 * Evaluation is `WARIBA_FLEX`, but its Performance successor is
 * `WARIBA_PERFORMANCE`, identically to ONE's and INSTANT's.
 *
 * So a FLEX Evaluation trader was shown "WARIBA ONE" on the terminal they
 * trade from, and FLEX and INSTANT Performance accounts lost their family
 * entirely.
 */
function identity(
  productFamily: AccountIdentity['productFamily'],
  programType: AccountIdentity['programType'],
): AccountIdentity {
  return { productFamily, programType };
}

describe('account family labels', () => {
  it('never calls a FLEX evaluation "WARIBA ONE"', () => {
    expect(programLabel(identity('WARIBA_FLEX', 'WARIBA_FLEX'))).toBe('WARIBA FLEX');
    expect(programShortLabel(identity('WARIBA_FLEX', 'WARIBA_FLEX'))).toBe('FLEX');
  });

  it('keeps the family on a Performance account of every product', () => {
    expect(programLabel(identity('WARIBA_ONE', 'WARIBA_PERFORMANCE'))).toBe('WARIBA ONE');
    expect(programLabel(identity('WARIBA_FLEX', 'WARIBA_PERFORMANCE'))).toBe('WARIBA FLEX');
    expect(programLabel(identity('WARIBA_INSTANT', 'WARIBA_PERFORMANCE'))).toBe('WARIBA INSTANT');
  });

  it('gives the three families three distinct labels', () => {
    const labels = (['WARIBA_ONE', 'WARIBA_FLEX', 'WARIBA_INSTANT'] as const).map((family) =>
      programLabel(identity(family, 'WARIBA_PERFORMANCE')),
    );
    expect(new Set(labels).size).toBe(3);
  });

  /**
   * §30 — INSTANT started in Performance and never held an Evaluation. The
   * phase label must say Performance, and nothing in the identity may imply a
   * phase the account skipped.
   */
  it('shows an INSTANT account as Performance, never as a completed evaluation', () => {
    const instant = identity('WARIBA_INSTANT', 'WARIBA_PERFORMANCE');
    expect(programPhaseLabel(instant)).toBe('Performance');
    expect(`${programLabel(instant)} ${programPhaseLabel(instant)}`).not.toMatch(
      /évaluation|réussi|phase 1/i,
    );
  });

  it('still reads Évaluation for an account that is genuinely in one', () => {
    expect(programPhaseLabel(identity('WARIBA_ONE', 'WARIBA_ONE'))).toBe('Évaluation');
    expect(programPhaseLabel(identity('WARIBA_FLEX', 'WARIBA_FLEX'))).toBe('Évaluation');
  });
});

describe('INSTANT provenance (§30/§45)', () => {
  /**
   * An INSTANT account starts in Performance and has no Evaluation parent.
   * `listAccountsForUser` links a parent only through
   * `sourceEvaluationAccountId`, which is null for INSTANT — so the guarantee
   * worth pinning here is the one a card renders from: the identity strings
   * must never carry an evaluation the account never held.
   */
  it('produces an identity with no evaluation language anywhere in it', () => {
    const instant = identity('WARIBA_INSTANT', 'WARIBA_PERFORMANCE');
    const rendered = [
      programLabel(instant),
      programShortLabel(instant),
      programPhaseLabel(instant),
    ].join(' ');
    expect(rendered).not.toMatch(/évaluation|réussi|passed|phase\s*1/i);
    expect(rendered).toContain('INSTANT');
    expect(rendered).toContain('Performance');
  });
});
