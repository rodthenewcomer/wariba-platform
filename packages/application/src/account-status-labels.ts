/**
 * The eight account statuses, in the product's language.
 *
 * ## Why this moved into the application layer
 *
 * `app.trading_accounts.status` is a database enum. Its values are English
 * snake_case identifiers, and they had a French label in `apps/web` — but only
 * where somebody had remembered to apply one. The recent-activity feed had
 * not, so a trader's dashboard read:
 *
 * ```text
 * payment_confirmed
 * pending_activation → active
 * ```
 *
 * That is the schema talking directly to a person. It is not a translation
 * gap so much as a layering one: whichever surface renders an account state
 * should not have to know that the storage vocabulary and the product
 * vocabulary are different, and every surface that re-derives the mapping is
 * one more place they can disagree.
 *
 * So the labels live beside the read models that emit them, and the web app
 * reads them from here rather than keeping its own copy.
 */

export const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  pending_activation: 'Activation en attente',
  active: 'Actif',
  soft_locked: 'Blocage temporaire',
  pass_pending: 'Passage en attente',
  inactive: 'Inactif',
  passed: 'Objectif validé',
  breached: 'Limite maximale dépassée',
  closed: 'Compte terminé',
};

/**
 * Falls back to the raw value rather than to a guess.
 *
 * A status this map has not seen is a schema change nobody propagated. Showing
 * the identifier is ugly and unmistakable, which is the point — inventing a
 * plausible French label for an unknown state would hide the omission behind
 * something that reads as finished.
 */
export function accountStatusLabel(status: string): string {
  return ACCOUNT_STATUS_LABEL[status] ?? status;
}
