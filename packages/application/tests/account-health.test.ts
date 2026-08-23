import { describe, expect, it } from 'vitest';
import { deriveAccountHealth } from '../src/account-health';

/**
 * The health state is arithmetic on two published thresholds, not a score. It
 * is tested because the one thing it must never do is reassure a trader whose
 * account cannot survive another trade.
 */
const base = {
  dailyLossRemaining: '300.00',
  dailyLossBudget: '300.00',
  maximumLossRemaining: '1000.00',
  maximumLossBudget: '1000.00',
};

describe('deriveAccountHealth', () => {
  it('reads a full budget as excellent', () => {
    expect(deriveAccountHealth(base).state).toBe('excellent');
  });

  it('takes the worse of the two constraints, never the flattering one', () => {
    /*
     * Comfortable maximum loss, no daily room left. A trader in this state
     * cannot trade today; calling it "Bon" because one of two numbers is fine
     * is the reassurance that gets an account breached.
     */
    const view = deriveAccountHealth({
      ...base,
      dailyLossRemaining: '15.00',
      maximumLossRemaining: '1000.00',
    });
    expect(view.state).toBe('critical');
    expect(view.description).toContain('perte quotidienne');
  });

  it('names the constraint that actually bound', () => {
    const view = deriveAccountHealth({
      ...base,
      dailyLossRemaining: '300.00',
      maximumLossRemaining: '250.00',
    });
    expect(view.description).toContain('perte maximale');
  });

  it('lets a live violation outrank every ratio', () => {
    const view = deriveAccountHealth({ ...base, hasViolation: true });
    expect(view.state).toBe('critical');
    expect(view.tone).toBe('danger');
  });

  it('never produces a score out of a hundred or an invented grade', () => {
    const view = deriveAccountHealth(base);
    expect(['excellent', 'good', 'watch', 'critical']).toContain(view.state);
    expect(view.roomPercent).toBeGreaterThanOrEqual(0);
    expect(view.roomPercent).toBeLessThanOrEqual(100);
  });

  it('treats a zero budget as unconstrained rather than dividing by zero', () => {
    const view = deriveAccountHealth({
      dailyLossRemaining: '0',
      dailyLossBudget: '0',
      maximumLossRemaining: '0',
      maximumLossBudget: '0',
    });
    expect(view.roomPercent).toBe(100);
    expect(view.state).toBe('excellent');
  });
});

describe('deriveAccountHealth on a finished account', () => {
  /**
   * The contradiction this prevents was visible in a Phase 2 review capture: a
   * breached account whose daily loss limit had never been touched reported
   * "Excellent — il vous reste 100 %". The limit that ended it was the maximum
   * loss; the daily one was genuinely untouched, and the arithmetic was right.
   * Reassurance on a dead account is the most damaging thing this panel can do.
   */
  it('never reports room on a terminal account, however untouched the budgets', () => {
    const view = deriveAccountHealth({
      dailyLossRemaining: '300.00',
      dailyLossBudget: '300.00',
      maximumLossRemaining: '1000.00',
      maximumLossBudget: '1000.00',
      terminal: true,
    });
    expect(view.state).toBe('critical');
    expect(view.roomPercent).toBe(0);
    expect(view.label).toBe('Terminé');
    expect(view.description).not.toMatch(/il vous reste/i);
  });
});

/**
 * Phase 2.5 §11 — the reading must not congratulate a trader for not having
 * traded. An untouched budget is a statement about an absence of activity, and
 * dressing it as praise primes exactly the confidence a first evaluation
 * punishes.
 */
describe('deriveAccountHealth — untested accounts (§11)', () => {
  it('does not call a fresh account excellent', () => {
    const view = deriveAccountHealth({ ...base, hasMeaningfulActivity: false });
    expect(view.state).toBe('untested');
    expect(view.label).toBe('Risque intact');
    expect(view.label).not.toBe('Excellent');
  });

  it('states the budgets are intact without grading them', () => {
    const view = deriveAccountHealth({ ...base, hasMeaningfulActivity: false });
    expect(view.description).toContain('entiers');
    expect(view.tone).toBe('neutral');
  });

  it('still reports the real room, so a ring is not blank', () => {
    expect(deriveAccountHealth({ ...base, hasMeaningfulActivity: false }).roomPercent).toBe(100);
  });

  it('grades normally once something has happened', () => {
    expect(deriveAccountHealth({ ...base, hasMeaningfulActivity: true }).state).toBe('excellent');
    // The default is the permissive one, so existing callers are unchanged.
    expect(deriveAccountHealth(base).state).toBe('excellent');
  });

  it('does not soften a genuinely consumed budget on a dormant account', () => {
    // "Nothing has happened yet" must not overwrite a real warning: an account
    // can sit dormant having already lost half of today's budget.
    const view = deriveAccountHealth({
      ...base,
      dailyLossRemaining: '60.00',
      hasMeaningfulActivity: false,
    });
    expect(view.state).toBe('watch');
  });

  it('a breach outranks it — an account can be lost on its first trade', () => {
    const view = deriveAccountHealth({
      ...base,
      hasMeaningfulActivity: false,
      terminal: true,
    });
    expect(view.state).toBe('critical');
    expect(view.label).toBe('Terminé');
    expect(view.roomPercent).toBe(0);
  });

  it('a live violation outranks it', () => {
    expect(
      deriveAccountHealth({ ...base, hasMeaningfulActivity: false, hasViolation: true }).state,
    ).toBe('critical');
  });
});
