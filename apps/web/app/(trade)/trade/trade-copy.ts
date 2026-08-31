import { resolveReasonCodeCopy } from '@wariba/application/presentation';
import type { OrderRejectionDetail } from './execution/execution-contract';

/**
 * Rejection copy for every code the server actually produces — extracted
 * verbatim from TradeClient during the W1 seam split so the session
 * controller, the dock's order history and the dialogs all read one table
 * instead of three copies.
 *
 * UX Architecture §22.10 — every rejection needs a reason, a code, and a
 * possible action, never an ambiguous loss. These are the only rejection
 * codes packages/database/src/trading.ts actually produces (REJECTION const
 * in trading.ts) — no fabricated codes.
 */
export const REJECTION_DETAIL: Record<string, { reason: string; action: string }> = {
  account_not_active: {
    reason:
      'Votre compte n’est plus actif pour trader (blocage temporaire, dépassement de limite, ou statut inactif).',
    action: 'Consultez le Hub pour connaître le statut exact de votre compte.',
  },
  performance_rules_not_acknowledged: {
    reason: 'Vous devez d’abord prendre connaissance des règles de ce compte Performance.',
    action: 'Ouvrez le tableau de bord puis consultez les règles attachées au compte.',
  },
  stale_market_data: {
    reason: 'Le cours de ce symbole n’était plus à jour au moment où votre ordre a été traité.',
    action: 'Réessayez lorsque le flux aura repris.',
  },
  invalid_quantity: {
    reason: 'La taille demandée est en dehors des bornes autorisées pour ce symbole.',
    action: 'Ajustez la quantité selon le pas et les bornes indiqués dans le ticket.',
  },
  unknown_symbol_spec: {
    reason: 'Ce symbole n’est pas configuré pour votre compte.',
    action: 'Contactez le support si le problème persiste.',
  },
  exposure_limit_exceeded: {
    reason: 'Cet ordre dépasserait votre exposition maximale autorisée sur ce groupe de symboles.',
    action: 'Réduisez la taille ou fermez une position existante sur ce groupe.',
  },
  short_duration_entry_locked: {
    reason:
      'Les nouvelles ouvertures sont temporairement suspendues après six clôtures profitables sous 60 secondes sur 24 h.',
    action:
      'Vous pouvez réduire ou fermer vos positions. Le verrou se lève lorsque le compteur glissant sur 24 h repasse sous six ; le signal reste disponible pour revue.',
  },
  position_not_found: {
    reason: 'La position visée n’existe plus.',
    action: 'Rafraîchissez vos positions ouvertes.',
  },
  position_already_closed: {
    reason: 'Cette position est déjà fermée.',
    action: 'Rafraîchissez vos positions ouvertes.',
  },
  market_not_stale: {
    reason:
      'Le cours de ce symbole est à jour — la mise en file n’est utile que si le flux est interrompu.',
    action: 'Utilisez la clôture partielle ou totale immédiate à la place.',
  },
  queue_entry_not_found: {
    reason: 'Cette demande en attente n’existe plus.',
    action: 'Rafraîchissez vos positions ouvertes.',
  },
  queue_entry_already_settled: {
    reason: 'Cette demande a déjà été exécutée ou annulée — elle ne peut plus être annulée.',
    action: 'Consultez l’historique pour voir le résultat.',
  },
  invalid_trigger_price: {
    reason:
      'Ce prix de déclenchement ne correspond pas à un ordre en attente valide par rapport au marché actuel.',
    action: 'Ajustez le prix selon le type d’ordre (Limite ou Stop) et le sens choisi.',
  },
  invalid_price_precision: {
    reason: 'Ce prix ne respecte pas la précision décimale de ce symbole.',
    action: 'Ajustez le prix selon la précision indiquée.',
  },
  pending_order_not_found: {
    reason: 'Cet ordre en attente n’existe plus.',
    action: 'Rafraîchissez vos ordres en attente.',
  },
  pending_order_already_settled: {
    reason: 'Cet ordre en attente a déjà été déclenché, exécuté ou annulé.',
    action: 'Consultez l’historique pour voir le résultat.',
  },
  alert_not_found: {
    reason: 'Cette alerte n’existe plus.',
    action: 'Rafraîchissez vos alertes.',
  },
};

export const UNKNOWN_REJECTION_DETAIL = {
  reason: 'Cet ordre a été refusé.',
  action: 'Réessayez, ou contactez le support si le problème persiste.',
};

/**
 * Phase 3.4.4 §15/§68 — the table above, then the canonical registry, then
 * the generic sentence.
 *
 * The V2 pre-trade gate writes its own reason code straight onto the order
 * (`packages/database/src/trading.ts` returns `v2Decision.reasonCode`), so
 * `GROSS_EXPOSURE_EXCEEDED` and `MARGIN_CAP_EXCEEDED` reach this function as
 * codes this file has never had a row for. Before the fallback existed they
 * resolved to "Cet ordre a été refusé." with no reason and no remedy — a
 * trader told only that something went wrong, on the two refusals V2 makes
 * most often.
 *
 * The registry is consulted rather than copied. Adding a row here for each
 * code would work exactly once, and drift the moment the canonical wording
 * changed; `packages/application/src/reason-code-copy.ts` has a test that
 * fails when a code has no words, which a second table here would not.
 *
 * The local table still wins where it exists: those entries are the
 * execution-specific codes (`invalid_quantity`, `stale_market_data`) whose
 * copy is about this ticket, not about the account's policy.
 */
export function rejectionDetailFor(code: string | null | undefined): {
  reason: string;
  action: string;
} {
  const local = REJECTION_DETAIL[code ?? ''];
  if (local) return local;

  const canonical = code ? resolveReasonCodeCopy(code) : null;
  if (canonical) {
    return {
      reason: canonical.body,
      // Every refusal in the registry carries a remedy; the fallback covers
      // the pause/pending severities, which can legitimately have none.
      action: canonical.remedy ?? UNKNOWN_REJECTION_DETAIL.action,
    };
  }

  return UNKNOWN_REJECTION_DETAIL;
}

/** The ticket/dialog-facing shape: the code plus its resolved copy. */
export function rejectionFor(code: string | null): OrderRejectionDetail | null {
  return code ? { code, ...rejectionDetailFor(code) } : null;
}

// Payout rejection copy now lives in `apps/web/lib/payout-copy.ts`: since W2
// the Payout Center is on `/payouts`, outside this route group, and both
// surfaces must read the same table.
export {
  PAYOUT_REJECTION_DETAIL,
  UNKNOWN_PAYOUT_REJECTION_DETAIL,
  payoutRejectionDetailFor,
} from '../../../lib/payout-copy';

/**
 * Chart-local history status copy — W3 §52-§55.
 *
 * Deliberately not a workstation-level banner: history is a property of the
 * chart, not of the connection or the account, and W2 already has the one
 * global banner it needs. Each message says exactly what is true and nothing
 * more.
 *
 * `error` is the one that matters most. A history failure is not a stale
 * market, not a closed market and not a locked account — the tick stream and
 * every execution control are unaffected — so the copy says so rather than
 * letting the trader infer that trading is down.
 */
/**
 * VX1-C §5/§6 — what the chart says while the *link* is still coming up.
 *
 * Before the socket is open the history controller has not started yet, so its
 * own status is `idle` and the plot said nothing at all: an empty chart with no
 * explanation, which is the blank-screen state §5 rules out. This is the one
 * honest sentence for that moment — the feed is being connected, and no data is
 * being claimed.
 */
export const HISTORY_CONNECTING_MESSAGE = 'Connexion au flux…';

export const HISTORY_STATUS_MESSAGE: Record<'loading' | 'empty' | 'error', string> = {
  loading: 'Historique…',
  empty: 'Historique en cours de constitution.',
  error: 'Historique indisponible. Le flux temps réel continue.',
};
