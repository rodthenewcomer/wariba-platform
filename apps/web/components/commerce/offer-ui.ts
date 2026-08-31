import type { CanonicalOfferReadModel } from '@wariba/application';

export const FAMILY_ORDER = ['WARIBA_ONE', 'WARIBA_FLEX', 'WARIBA_INSTANT'] as const;

export const FAMILY_META = {
  WARIBA_ONE: {
    short: 'ONE',
    eyebrow: 'Construire la preuve',
    title: 'Une évaluation exigeante, un paiement unique.',
    description:
      'Atteignez l’objectif avec une discipline mesurable, puis passez en Performance sans frais d’activation.',
    path: '/challenges/one',
    accent: 'cobalt',
  },
  WARIBA_FLEX: {
    short: 'FLEX',
    eyebrow: 'Réduire le coût d’entrée',
    title: 'Commencez plus léger. Activez seulement après réussite.',
    description:
      'Un premier paiement pour l’évaluation, puis un montant d’activation figé dès l’achat et dû uniquement si vous réussissez.',
    path: '/challenges/flex',
    accent: 'copper',
  },
  WARIBA_INSTANT: {
    short: 'INSTANT',
    eyebrow: 'Entrer directement en Performance',
    title: 'Pas d’évaluation. Les règles Performance commencent tout de suite.',
    description:
      'Un accès direct au compte Performance simulé, avec des limites de risque plus resserrées.',
    path: '/challenges/instant',
    accent: 'ink',
  },
} as const;

export function formatXof(amount: string): string {
  return `${Number(amount).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA`;
}

/**
 * The same amount, split so a headline price can render the currency a size
 * down and a shade dimmer.
 *
 * At 36px the suffix competes with the figure for the same attention, and the
 * figure is the thing being compared between two offers. Splitting it is the
 * cheapest way to keep the number the loudest part of the panel.
 */
export function xofParts(amount: string): { value: string; currency: string } {
  return {
    value: Number(amount).toLocaleString('fr-FR', { maximumFractionDigits: 0 }),
    currency: 'FCFA',
  };
}

export function formatNominal(amount: string): string {
  return `${Number(amount).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} USD`;
}

export function formatRate(value: string): string {
  return `${Number(value).toLocaleString('fr-FR', { style: 'percent', maximumFractionDigits: 2 })}`;
}

export function formatMultiple(value: string): string {
  return `${Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}×`;
}

export function checkoutHref(offer: CanonicalOfferReadModel): string {
  return `/checkout?offer=${encodeURIComponent(offer.offerId)}`;
}

export function offerByIdentity(
  offers: readonly CanonicalOfferReadModel[],
  identity: string | null | undefined,
): CanonicalOfferReadModel | undefined {
  return offers.find((offer) => offer.offerId === identity);
}
