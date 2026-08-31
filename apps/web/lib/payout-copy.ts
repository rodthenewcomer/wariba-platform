/**
 * The same codes the payout engine's own REJECTION const produces
 * (`PayoutRejectionCode`, `packages/database/src/payouts.ts`) — not imported
 * from that package directly, since `apps/web` never depends on the database
 * package (only `@wariba/application`, which has no client-facing
 * payout-result mapper).
 *
 * Moved out of the `(trade)` route group in W2: the Payout Center now lives on
 * `/payouts`, and both it and WariX must read one table rather than each
 * keeping a copy that can drift.
 */
export const PAYOUT_REJECTION_DETAIL: Record<string, string> = {
  account_not_active: 'Votre compte n’est plus actif.',
  no_active_cycle: 'Aucun cycle actif — le dossier WARIBA Review est ouvert.',
  buffer_not_reached: 'La réserve de sécurité n’est pas encore constituée.',
  performance_days_incomplete: 'Il manque des journées Performance sur ce cycle.',
  consistency_non_compliant:
    'La meilleure journée dépasse la limite de ce compte — répartissez le profit sur d’autres journées.',
  open_position_blocks_payout: 'Une position est ouverte — fermez-la avant de demander un payout.',
  pending_order_blocks_payout:
    'Un ordre en attente est actif — annulez-le avant de demander un payout.',
  kyc_not_verified: 'Vérification d’identité sandbox non complétée.',
  payout_method_not_configured: 'Aucune méthode de payout sandbox configurée.',
  invalid_requested_amount: 'Le montant demandé doit être positif.',
  no_cap_for_account_size: 'Aucun plafond de payout n’est publié pour cette taille de compte.',
};

export const UNKNOWN_PAYOUT_REJECTION_DETAIL = 'Le serveur a refusé cette demande de payout.';

export function payoutRejectionDetailFor(code: string | null | undefined): string {
  return PAYOUT_REJECTION_DETAIL[code ?? ''] ?? UNKNOWN_PAYOUT_REJECTION_DETAIL;
}
