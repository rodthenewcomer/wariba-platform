import { describe, expect, it } from 'vitest';
import {
  flexActivationNotice,
  type FlexActivationObligationView,
  type FlexActivationStatus,
} from '../src/flex-activation';

function obligation(
  status: FlexActivationStatus,
  overrides: Partial<FlexActivationObligationView> = {},
): FlexActivationObligationView {
  return {
    status,
    amount: '450.00',
    amountFormatted: '450 USD',
    currency: 'USD',
    dueAt: '2026-09-26T00:00:00.000Z',
    dueAtLabel: '26 septembre 2026',
    paidAt: null,
    fulfilledAt: null,
    requiresTraderAction: status === 'activation_due',
    ...overrides,
  };
}

describe('FLEX activation notice', () => {
  /**
   * §26 — the single sentence this whole surface exists to avoid. The
   * evaluation genuinely passed, so the copy says so; the Performance account
   * does not exist yet, so the copy must not say it is ready.
   */
  it('never says the Performance account is ready while activation is due', () => {
    const notice = flexActivationNotice(obligation('activation_due'));
    expect(notice.title).toBe('Évaluation réussie');
    expect(`${notice.title} ${notice.body}`).not.toMatch(/compte Performance est prêt/i);
    expect(notice.body).toMatch(/dernière étape/i);
  });

  /**
   * §26 — a trader comparing the amount against today's offer page must be
   * told why the two can differ. Without the note the snapshot looks like a
   * mistake.
   */
  it('shows the purchase-time amount and says that is what it is', () => {
    const notice = flexActivationNotice(obligation('activation_due'));
    expect(notice.amountFormatted).toBe('450 USD');
    expect(notice.priceOriginNote).toBe('Prix fixé lors de votre achat');
  });

  /** §27 — the deadline comes from the stored instant, rendered by the server. */
  it('states the deadline from the obligation, not from an offset', () => {
    const notice = flexActivationNotice(obligation('activation_due'));
    expect(notice.deadlineLabel).toContain('26 septembre 2026');
  });

  it('offers exactly one action while activation is due', () => {
    expect(flexActivationNotice(obligation('activation_due')).actionLabel).toBe(
      'Activer mon compte Performance',
    );
  });

  it('stops asking once paid, and reports preparation instead', () => {
    const notice = flexActivationNotice(obligation('paid', { paidAt: '2026-09-01T00:00:00.000Z' }));
    expect(notice.actionLabel).toBeNull();
    expect(notice.body).toMatch(/préparation/i);
  });

  /** §29 — only once the account really exists does the copy say so. */
  it('announces the ready account only when the obligation is fulfilled', () => {
    const notice = flexActivationNotice(obligation('fulfilled'));
    expect(notice.title).toMatch(/compte WARIBA Performance est prêt/i);
    expect(notice.actionLabel).toBe('Ouvrir WariX');
  });

  /**
   * An expired obligation keeps its date. A trader disputing the outcome needs
   * to see the deadline the decision was made against, not just that it passed.
   */
  it('keeps the deadline visible after expiry and offers no false remedy', () => {
    const notice = flexActivationNotice(obligation('expired'));
    expect(notice.deadlineLabel).toContain('26 septembre 2026');
    expect(notice.actionLabel).toBeNull();
    expect(notice.tone).toBe('danger');
  });

  it('asks the trader to act in exactly one of the four states', () => {
    const asking = (['activation_due', 'paid', 'fulfilled', 'expired'] as const).filter(
      (status) => obligation(status).requiresTraderAction,
    );
    expect(asking).toEqual(['activation_due']);
  });
});
