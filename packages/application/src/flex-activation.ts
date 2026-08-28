import type { Db } from '@wariba/database';
import { formatMoney } from './account-policy-rules';

/**
 * Phase 3.4.4 §26-§29 — the step between a passed FLEX Evaluation and a
 * Performance account that does not exist yet.
 *
 * ## Why the amount is a snapshot
 *
 * `app.flex_activation_obligations.amount_snapshot` is the figure WARIBA
 * quoted when the trader bought, frozen on the row at that moment. The
 * catalogue price is a moving number for a product still being priced; the
 * obligation is a promise already made. Reading the catalogue here would mean
 * a trader who bought in August being asked for September's price, which is
 * the single thing this row exists to prevent — so the origin is stated on the
 * surface rather than left as an assumption a reader has to trust.
 *
 * ## Why the deadline is a stored instant
 *
 * §27 — `due_at` is written by the server when the obligation is created. A
 * client adding thirty days to a pass date would produce a deadline that drifts
 * with the reader's clock and disagrees with the one the expiry job enforces.
 */
export type FlexActivationStatus = 'activation_due' | 'paid' | 'fulfilled' | 'expired';

export interface FlexActivationObligationView {
  status: FlexActivationStatus;
  amount: string;
  amountFormatted: string;
  currency: string;
  dueAt: string;
  dueAtLabel: string;
  paidAt: string | null;
  fulfilledAt: string | null;
  /** True only while the trader is the one who must act. */
  requiresTraderAction: boolean;
}

function dueLabel(dueAt: Date): string {
  return dueAt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * The obligation for an evaluation account, or null when there is none.
 *
 * Keyed on the *evaluation* account id, which is the column the row carries.
 * A Performance account therefore resolves its own obligation through its
 * parent rather than finding nothing — the two sides of the handoff must not
 * disagree about whether an activation happened.
 */
export async function loadFlexActivationObligation(
  db: Db,
  evaluationAccountId: string | null,
): Promise<FlexActivationObligationView | null> {
  if (!evaluationAccountId) return null;
  const row = await db
    .selectFrom('app.flex_activation_obligations')
    .select(['status', 'amount_snapshot', 'currency_snapshot', 'due_at', 'paid_at', 'fulfilled_at'])
    .where('evaluation_account_id', '=', evaluationAccountId)
    .orderBy('created_at', 'desc')
    .executeTakeFirst();
  if (!row) return null;

  return {
    status: row.status,
    amount: row.amount_snapshot,
    amountFormatted: formatMoney(row.amount_snapshot, row.currency_snapshot),
    currency: row.currency_snapshot,
    dueAt: row.due_at.toISOString(),
    dueAtLabel: dueLabel(row.due_at),
    paidAt: row.paid_at?.toISOString() ?? null,
    fulfilledAt: row.fulfilled_at?.toISOString() ?? null,
    requiresTraderAction: row.status === 'activation_due',
  };
}

export interface FlexActivationNotice {
  status: FlexActivationStatus;
  title: string;
  body: string;
  /** The snapshot amount. Absent once the obligation is settled. */
  amountFormatted: string | null;
  /** §26 — why this figure and not the one on the offer page today. */
  priceOriginNote: string | null;
  /** §27 — the server's own deadline, never client arithmetic. */
  deadlineLabel: string | null;
  actionLabel: string | null;
  tone: 'attention' | 'progress' | 'success' | 'danger';
}

/**
 * The obligation as something a trader reads.
 *
 * `activation_due` is the only state that asks anything of them, and it is the
 * one §26 is strictest about: the evaluation is genuinely passed, so the copy
 * says so — but it must not say the Performance account is ready, because it
 * does not exist yet. "Dernière étape" is the honest description of a pass
 * with one obligation outstanding.
 */
export function flexActivationNotice(
  obligation: FlexActivationObligationView,
): FlexActivationNotice {
  switch (obligation.status) {
    case 'activation_due':
      return {
        status: obligation.status,
        title: 'Évaluation réussie',
        body: 'Dernière étape : activez votre compte Performance.',
        amountFormatted: obligation.amountFormatted,
        priceOriginNote: 'Prix fixé lors de votre achat',
        deadlineLabel: `Activation disponible jusqu’au ${obligation.dueAtLabel}`,
        actionLabel: 'Activer mon compte Performance',
        tone: 'attention',
      };
    case 'paid':
      return {
        status: obligation.status,
        title: 'Activation confirmée',
        body: 'Votre compte Performance est en cours de préparation.',
        amountFormatted: obligation.amountFormatted,
        priceOriginNote: null,
        deadlineLabel: null,
        actionLabel: null,
        tone: 'progress',
      };
    case 'fulfilled':
      return {
        status: obligation.status,
        title: 'Votre compte WARIBA Performance est prêt',
        body: 'Vos règles Performance sont attachées à ce compte.',
        amountFormatted: null,
        priceOriginNote: null,
        deadlineLabel: null,
        actionLabel: 'Ouvrir WariX',
        tone: 'success',
      };
    case 'expired':
      return {
        status: obligation.status,
        title: 'Délai d’activation dépassé',
        body: 'La période d’activation de ce compte Performance est terminée.',
        amountFormatted: null,
        priceOriginNote: null,
        // Stated even once expired: a trader disputing the outcome needs to
        // see the date the decision was made against.
        deadlineLabel: `Échéance : ${obligation.dueAtLabel}`,
        actionLabel: null,
        tone: 'danger',
      };
  }
}
