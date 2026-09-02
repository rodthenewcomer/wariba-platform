import type { CanonicalOfferReadModel } from '@wariba/application';

export const FAMILY_ORDER = ['WARIBA_ONE', 'WARIBA_FLEX', 'WARIBA_INSTANT'] as const;

export const FAMILY_META = {
  WARIBA_ONE: {
    short: 'ONE',
    eyebrow: 'Construire la preuve',
    /* The tab card's own headline + one-line lifecycle — distinct from
       `eyebrow`/`description` below, which the fuller single-account
       narrative (the `title`/`description` pair) still uses. Scanning three
       tabs should cost a glance, not a paragraph each. */
    tabHeadline: 'Paiement unique',
    tabLifecycle: 'Évaluation → Performance',
    title: 'Une évaluation exigeante, un paiement unique.',
    description:
      'Atteignez l’objectif avec une discipline mesurable, puis passez en Performance sans frais d’activation.',
    path: '/challenges/one',
    accent: 'copper',
  },
  WARIBA_FLEX: {
    short: 'FLEX',
    eyebrow: 'Réduire le coût d’entrée',
    tabHeadline: 'Payez moins au départ',
    tabLifecycle: 'Activation seulement après réussite',
    title: 'Commencez plus léger. Activez seulement après réussite.',
    description:
      'Un premier paiement pour l’évaluation, puis un montant d’activation figé dès l’achat et dû uniquement si vous réussissez.',
    path: '/challenges/flex',
    accent: 'cobalt',
  },
  WARIBA_INSTANT: {
    short: 'INSTANT',
    eyebrow: 'Entrer directement en Performance',
    tabHeadline: 'Sans évaluation',
    tabLifecycle: 'Performance directement',
    title: 'Pas d’évaluation. Les règles Performance commencent tout de suite.',
    description:
      'Un accès direct au compte Performance simulé, avec des limites de risque plus resserrées.',
    path: '/challenges/instant',
    accent: 'cyan',
  },
} as const;

/**
 * Per-family accent, expressed as overrides for the `--commerce-accent*`
 * custom properties every commerce surface already reads from (the family
 * tabs, size chips, the accent-toned spec pill, the primary CTA, the
 * compare matrix's selected column). Because those consumers ask a CSS
 * custom property for their colour rather than hardcoding one, applying
 * this object as inline style on one ancestor re-colours the whole
 * Decision Engine for the active family — the same copper/cobalt/cyan
 * language the hero's three monoliths already carry — with no per-component
 * branching. FLEX keeps WARIBA's own brand cobalt, since it is the default
 * commerce accent everywhere else on the site; ONE and INSTANT borrow the
 * hero's copper and cyan.
 */
export const FAMILY_ACCENT_VARS: Record<
  keyof typeof FAMILY_META,
  Record<string, string>
> = {
  WARIBA_ONE: {
    '--commerce-accent': 'var(--wariba-accent-copper)',
    '--commerce-accent-hover': 'color-mix(in srgb, var(--wariba-accent-copper) 85%, white)',
    '--commerce-accent-text': 'color-mix(in srgb, var(--wariba-accent-copper) 88%, white)',
    '--commerce-accent-wash': 'var(--wariba-accent-copper-wash)',
    '--commerce-accent-edge': 'var(--wariba-accent-copper-edge)',
    '--commerce-accent-glow':
      '0 18px 48px -18px color-mix(in srgb, var(--wariba-accent-copper) 55%, transparent)',
  },
  WARIBA_FLEX: {
    '--commerce-accent': 'var(--wariba-brand-500)',
    '--commerce-accent-hover': 'var(--wariba-brand-400)',
    '--commerce-accent-text': 'var(--wariba-brand-300)',
    '--commerce-accent-wash': 'var(--wariba-brand-wash)',
    '--commerce-accent-edge': 'var(--wariba-brand-edge)',
    '--commerce-accent-glow': 'var(--wariba-glow-primary)',
  },
  WARIBA_INSTANT: {
    '--commerce-accent': 'var(--wariba-accent-cyan)',
    '--commerce-accent-hover': 'color-mix(in srgb, var(--wariba-accent-cyan) 85%, white)',
    '--commerce-accent-text': 'color-mix(in srgb, var(--wariba-accent-cyan) 88%, white)',
    '--commerce-accent-wash': 'var(--wariba-accent-cyan-wash)',
    '--commerce-accent-edge': 'var(--wariba-accent-cyan-edge)',
    '--commerce-accent-glow':
      '0 18px 48px -18px color-mix(in srgb, var(--wariba-accent-cyan) 55%, transparent)',
  },
};

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

/**
 * A pre-computed nominal-currency amount (e.g. `evaluationRules.maximumLossAmount`),
 * labelled with the offer's own `nominalCurrency` rather than hardcoded — never `formatXof`,
 * which stamps "FCFA" on a figure denominated in the account's simulated currency. FCFA/XOF
 * is reserved for `upfrontPrice`/`activationPrice`/`totalPriceIfSuccess`, the real commercial
 * payment; a risk-rule amount is a unit of the simulated nominal, never money paid or owed.
 */
export function formatSimulatedAmount(amount: string, currency: string): string {
  return `${Number(amount).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${currency} simulés`;
}

export function formatRate(value: string): string {
  return `${Number(value).toLocaleString('fr-FR', { style: 'percent', maximumFractionDigits: 2 })}`;
}

/**
 * A risk-rule rate, expressed as a simulated-unit amount of the nominal
 * account size — the same `nominal × rate` the canonical read model itself
 * derives its own policy amounts with (`policyAmount` in
 * `canonical-offers.ts`). This is presentation only: the percent/amount
 * toggle changes how a rule is *displayed*, never the rule itself, and
 * never a payout-split percentage (that is a share of realised profit, not
 * of the nominal — see `rule-specs.ts`'s `convertible` flag).
 */
export function formatRateAsSimulatedAmount(rate: string, nominalBalance: string): string {
  const amount = Number(rate) * Number(nominalBalance);
  return `${amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} USD simulés`;
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
