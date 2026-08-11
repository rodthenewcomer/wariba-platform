import type { OrderRejectionDetail } from './OrderTicket';

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
  stale_market_data: {
    reason:
      'Le prix pour ce symbole n’était plus à jour au moment où le serveur a traité votre ordre.',
    action: 'Réessayez une fois le prix rafraîchi.',
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
      'Le prix de ce symbole est à jour — la mise en file n’est utile que si le prix est obsolète.',
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
  reason: 'Le serveur a refusé cet ordre.',
  action: 'Réessayez, ou contactez le support si le problème persiste.',
};

export function rejectionDetailFor(code: string | null | undefined): {
  reason: string;
  action: string;
} {
  return REJECTION_DETAIL[code ?? ''] ?? UNKNOWN_REJECTION_DETAIL;
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
