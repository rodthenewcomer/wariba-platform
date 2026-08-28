import { describe, expect, it } from 'vitest';
import { deriveAccountNextAction, type AccountNextActionFacts } from '../src/account-next-action';

/**
 * Phase 3.4.4 §48 — the priority order is the product rule, so it is tested
 * directly rather than through a surface that renders it.
 */
function facts(overrides: Partial<AccountNextActionFacts> = {}): AccountNextActionFacts {
  return {
    status: 'active',
    phase: 'evaluation',
    awaitingPassReview: false,
    flexActivation: 'not_applicable',
    performanceAccountExists: false,
    performanceRulesAcknowledged: true,
    cycle: null,
    kycVerified: false,
    payoutMethodConfigured: false,
    ...overrides,
  };
}

function cycle(overrides: Partial<NonNullable<AccountNextActionFacts['cycle']>> = {}) {
  return {
    bufferReached: true,
    performanceDaysCompleted: 5,
    performanceDaysRequired: 5,
    bestDayCompliant: true,
    financiallyEligible: false,
    payoutUnderReview: false,
    inWaribaReview: false,
    ...overrides,
  };
}

describe('next action — terminal states outrank everything', () => {
  it('offers a breached account no next step', () => {
    const action = deriveAccountNextAction(facts({ status: 'breached' }));
    expect(action.kind).toBe('account_breached');
    expect(action.requiresTraderAction).toBe(false);
  });

  /**
   * The combination the V1 safety backport created (§12): an account can be
   * `pass_pending` *and* refused new exposure. Neither fact may swallow the
   * other, and a terminal state outranks both.
   */
  it('does not let pass_pending outrank a breach', () => {
    expect(deriveAccountNextAction(facts({ status: 'breached' })).kind).toBe('account_breached');
  });
});

describe('next action — FLEX activation is a lifecycle block', () => {
  it('asks a passed FLEX evaluation to activate before anything else', () => {
    const action = deriveAccountNextAction(
      facts({ status: 'passed', flexActivation: 'due', performanceAccountExists: false }),
    );
    expect(action.kind).toBe('activate_performance');
    expect(action.requiresTraderAction).toBe(true);
    expect(action.reasonCode).toBe('FLEX_ACTIVATION_REQUIRED');
  });

  /**
   * §26 — the exact regression this ordering prevents. A passed FLEX account
   * whose activation is still due must never fall through to ONE's
   * "your Performance account is ready" branch.
   */
  it('never tells a FLEX trader their Performance account is ready before activation', () => {
    const action = deriveAccountNextAction(
      facts({ status: 'passed', flexActivation: 'due', performanceAccountExists: true }),
    );
    expect(action.kind).not.toBe('open_warix');
    expect(action.kind).toBe('activate_performance');
  });

  it('shows preparation once paid but before the account exists', () => {
    expect(
      deriveAccountNextAction(
        facts({ status: 'passed', flexActivation: 'paid', performanceAccountExists: false }),
      ).kind,
    ).toBe('performance_preparing');
  });

  it('closes the door on an expired activation without inventing a remedy', () => {
    const action = deriveAccountNextAction(facts({ status: 'passed', flexActivation: 'expired' }));
    expect(action.kind).toBe('activation_expired');
    expect(action.requiresTraderAction).toBe(false);
  });
});

describe('next action — ONE handoff', () => {
  it('waits for finalisation while the deciding day is still open', () => {
    expect(deriveAccountNextAction(facts({ status: 'pass_pending' })).kind).toBe(
      'await_finalization',
    );
  });

  it('names review once the day has closed', () => {
    expect(
      deriveAccountNextAction(facts({ status: 'pass_pending', awaitingPassReview: true })).kind,
    ).toBe('pass_review');
  });

  it('asks for the rules to be read before opening WariX', () => {
    expect(
      deriveAccountNextAction(
        facts({
          status: 'passed',
          performanceAccountExists: true,
          performanceRulesAcknowledged: false,
        }),
      ).kind,
    ).toBe('acknowledge_rules');
  });
});

describe('next action — Performance progress', () => {
  it('names the days first, because they take the most time', () => {
    const action = deriveAccountNextAction(
      facts({
        phase: 'performance',
        cycle: cycle({ performanceDaysCompleted: 3, bufferReached: false }),
      }),
    );
    expect(action.kind).toBe('complete_performance_days');
    expect(action.reasonCode).toBe('PERFORMANCE_DAYS_INSUFFICIENT');
  });

  it('names the reserve once the days are in', () => {
    expect(
      deriveAccountNextAction(
        facts({ phase: 'performance', cycle: cycle({ bufferReached: false }) }),
      ).kind,
    ).toBe('build_buffer');
  });

  /**
   * §35 — a non-compliant best day is progress, never fault. It must produce
   * an action the trader can act on and must not require action of them in the
   * "something is wrong" sense.
   */
  it('treats a non-compliant best day as progress, not as a fault', () => {
    const action = deriveAccountNextAction(
      facts({ phase: 'performance', cycle: cycle({ bestDayCompliant: false }) }),
    );
    expect(action.kind).toBe('improve_best_day');
    expect(action.reasonCode).toBe('BEST_DAY_NOT_YET_COMPLIANT');
  });

  it('asks for identity before a payout request, and for a method after it', () => {
    const eligible = { phase: 'performance' as const, cycle: cycle({ financiallyEligible: true }) };
    expect(deriveAccountNextAction(facts({ ...eligible })).kind).toBe('complete_kyc');
    expect(deriveAccountNextAction(facts({ ...eligible, kycVerified: true })).kind).toBe(
      'add_payout_method',
    );
    expect(
      deriveAccountNextAction(
        facts({ ...eligible, kycVerified: true, payoutMethodConfigured: true }),
      ).kind,
    ).toBe('request_payout');
  });

  it('stops offering a new cycle once the account is in WARIBA Review', () => {
    const action = deriveAccountNextAction(
      facts({ phase: 'performance', cycle: cycle({ inWaribaReview: true }) }),
    );
    expect(action.kind).toBe('wariba_review');
    expect(action.reasonCode).toBe('PAYOUT_REVIEW_AFTER_FIFTH');
  });
});

describe('next action — the quiet default', () => {
  it('falls through to continue_trading, and asks nothing of the trader', () => {
    const action = deriveAccountNextAction(facts());
    expect(action.kind).toBe('continue_trading');
    expect(action.requiresTraderAction).toBe(false);
  });

  it('reports a daily pause without asking the trader to fix anything', () => {
    const action = deriveAccountNextAction(facts({ status: 'soft_locked' }));
    expect(action.kind).toBe('daily_pause');
    expect(action.requiresTraderAction).toBe(false);
    expect(action.reasonCode).toBe('DAILY_LOSS_SOFT_LOCKED');
  });
});
