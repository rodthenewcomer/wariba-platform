import { describe, expect, it } from 'vitest';
import {
  deriveAccountLifecycle,
  deriveAccountLifecycleState,
  journeyStepIndex,
} from '../src/account-lifecycle';

/**
 * The lifecycle is the vocabulary every Hub surface renders from, so a wrong
 * mapping here is wrong everywhere at once — and two of these distinctions are
 * ones a trader can lose an evaluation over.
 */
describe('account lifecycle', () => {
  it('separates "target reached, session open" from "session closed, under review"', () => {
    /*
     * The distinction §16 exists for. Both are `pass_pending` in the database.
     * Told the same thing in both, a trader cannot know whether the rules can
     * still break their evaluation in the next twenty minutes.
     */
    const stillTrading = deriveAccountLifecycle({
      accountStatus: 'pass_pending',
      programType: 'WARIBA_ONE',
      currentSessionFinalized: false,
    });
    expect(stillTrading.state).toBe('objective_reached');
    expect(stillTrading.tradable).toBe(true);
    expect(stillTrading.description).toContain('jusqu’à la clôture');

    const closed = deriveAccountLifecycle({
      accountStatus: 'pass_pending',
      programType: 'WARIBA_ONE',
      currentSessionFinalized: true,
    });
    expect(closed.state).toBe('under_review');
    expect(closed.tradable).toBe(false);
    expect(closed.awaitingPlatform).toBe(true);
  });

  it('reads a pending Performance account as funding being prepared, not as an unpaid order', () => {
    const view = deriveAccountLifecycle({
      accountStatus: 'pending_activation',
      programType: 'WARIBA_PERFORMANCE',
    });
    expect(view.state).toBe('funded_preparing');
    // Nothing was bought, so the payment sentence would be nonsense here.
    expect(view.description).not.toContain('paiement');
  });

  it('splits an active evaluation on the risk warning zone', () => {
    expect(
      deriveAccountLifecycleState({
        accountStatus: 'active',
        programType: 'WARIBA_ONE',
        inAttentionZone: false,
      }),
    ).toBe('evaluation_active');
    expect(
      deriveAccountLifecycleState({
        accountStatus: 'active',
        programType: 'WARIBA_ONE',
        inAttentionZone: true,
      }),
    ).toBe('evaluation_attention');
  });

  it('never marks a terminal or unknown state tradable', () => {
    for (const status of ['breached', 'closed', 'passed', 'une_valeur_inconnue']) {
      expect(
        deriveAccountLifecycle({ accountStatus: status, programType: 'WARIBA_ONE' }).tradable,
      ).toBe(false);
    }
  });

  it('falls back to a read-only state rather than a tradable one', () => {
    // A status this map has never seen is a schema change nobody propagated.
    // Failing toward "closed" cannot put a trader on a live account by mistake.
    const view = deriveAccountLifecycle({
      accountStatus: 'nouveau_statut',
      programType: 'WARIBA_ONE',
    });
    expect(view.state).toBe('closed');
    expect(view.terminal).toBe(true);
  });

  it('keeps a breach off the progress track entirely', () => {
    // "Step 2 of 5" is a lie about a finished account.
    expect(journeyStepIndex('breached')).toBeNull();
    expect(journeyStepIndex('closed')).toBeNull();
    expect(journeyStepIndex('evaluation_active')).toBe(0);
    expect(journeyStepIndex('objective_reached')).toBe(1);
    expect(journeyStepIndex('under_review')).toBe(2);
    expect(journeyStepIndex('funded_active')).toBe(4);
  });

  it('gives every state a sentence that is not the label again', () => {
    for (const status of [
      'pending_activation',
      'active',
      'soft_locked',
      'pass_pending',
      'passed',
      'breached',
      'inactive',
      'closed',
    ]) {
      const view = deriveAccountLifecycle({ accountStatus: status, programType: 'WARIBA_ONE' });
      expect(view.description.length).toBeGreaterThan(view.label.length);
      expect(view.description).not.toBe(view.label);
    }
  });
});
