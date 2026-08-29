import type { RouteGlyphFamily } from '../signature/RouteGlyph';

/**
 * The public navigation architecture — Phase 3.4.5A §20, §24.
 *
 * One declaration, consumed by the desktop header, the mobile drawer and the
 * footer, so the three can never disagree about what WARIBA offers.
 *
 * ## Every href here resolves today
 *
 * The phase brief suggests `Règles` and `Payouts` as top-level destinations,
 * and also forbids dead links. There is no public `/regles` or `/payouts` —
 * both exist only behind authentication (`/comptes/[id]/regles`,
 * `/(platform)/payouts`). The public answer to both questions is the Help
 * Centre, which has a category for each and reads its figures from the
 * published policy. So the labels stay and point at `/aide/risque-regles` and
 * `/aide/payouts` rather than at a 404 or an invented stub.
 */

export interface NavLink {
  href: string;
  label: string;
  /** Shown in the drawer and the mega-menu; omitted in the compact header row. */
  description?: string;
}

export interface FamilyLink extends NavLink {
  family: RouteGlyphFamily;
  /** Four words at most: this sits under a 40px glyph, not in a paragraph. */
  tagline: string;
}

/** The three product families, in the order they are meant to be considered. */
export const NAV_FAMILIES: readonly FamilyLink[] = [
  {
    family: 'one',
    href: '/challenges/one',
    label: 'ONE',
    tagline: 'Un paiement, une preuve',
    description: 'Une évaluation exigeante, puis le compte Performance. Aucun frais d’activation.',
  },
  {
    family: 'flex',
    href: '/challenges/flex',
    label: 'FLEX',
    tagline: 'Entrez léger, payez après',
    description:
      'Une entrée réduite. Le montant d’activation est figé à l’achat et dû seulement si vous réussissez.',
  },
  {
    family: 'instant',
    href: '/challenges/instant',
    label: 'INSTANT',
    tagline: 'Performance immédiate',
    description:
      'Aucune évaluation. Vous commencez en Performance, avec des limites plus resserrées.',
  },
];

/** Secondary destinations inside the `Parcours` menu. */
export const NAV_PARCOURS_LINKS: readonly NavLink[] = [
  { href: '/offres', label: 'Comparer les 15 offres' },
  { href: '/programme', label: 'Comment ça marche' },
];

/** The header row, left to right, after `Parcours`. */
export const NAV_PRIMARY: readonly NavLink[] = [
  { href: '/warix', label: 'WariX' },
  { href: '/programme', label: 'Comment ça marche' },
  { href: '/aide/risque-regles', label: 'Règles' },
  { href: '/aide/payouts', label: 'Payouts' },
  { href: '/aide', label: 'Aide' },
];

export interface FooterColumn {
  title: string;
  links: readonly NavLink[];
}

/**
 * The footer's columns.
 *
 * Four, not five. The brief proposes a `Société` column; WARIBA has no public
 * company routes today and the phase forbids inventing offices, team or about
 * pages to fill one. Four honest columns read as mature; five with one made up
 * reads as a template.
 */
export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    title: 'Parcours',
    links: [
      { href: '/challenges/one', label: 'ONE' },
      { href: '/challenges/flex', label: 'FLEX' },
      { href: '/challenges/instant', label: 'INSTANT' },
      { href: '/offres', label: 'Comparer les offres' },
    ],
  },
  {
    title: 'Comprendre WARIBA',
    links: [
      { href: '/programme', label: 'Comment ça marche' },
      { href: '/aide/risque-regles', label: 'Règles et risque' },
      { href: '/aide/payouts', label: 'Payouts' },
      { href: '/warix', label: 'WariX' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/aide', label: 'Centre d’aide' },
      { href: '/support', label: 'Nous contacter' },
    ],
  },
  {
    title: 'Cadre légal',
    links: [
      { href: '/legal/conditions', label: 'Conditions d’utilisation' },
      { href: '/legal/confidentialite', label: 'Confidentialité' },
      { href: '/legal/risques', label: 'Risques et simulation' },
    ],
  },
];
