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

/**
 * The three product families, in the order they are meant to be considered.
 *
 * ## La règle de langue, appliquée ici
 *
 * La première version disait « Un paiement, une preuve », « Entrez léger,
 * payez après » et « Performance immédiate ». Trois problèmes, un par ligne.
 *
 * « Un paiement, une preuve » n'explique rien : c'est une formule, pas une
 * information. « Entrez léger » n'est pas du français que quelqu'un prononce.
 * Et « Performance immédiate » se lit comme une promesse de résultat — alors
 * que « Performance » désigne ici une phase du produit, pas un rendement.
 *
 * La correction de FLEX a demandé un second tour. « Commencez avec moins » est
 * naturel mais ambigu : moins de capital ? un compte plus petit ? moins de
 * risque ? La proposition est financière et rien d'autre — le premier paiement
 * est plus faible — donc la phrase le dit : « Payez moins au départ. »
 *
 * Le test appliqué à chaque ligne : est-ce qu'un trader francophone dirait
 * réellement cette phrase, est-ce qu'il comprend en moins de trois secondes, et
 * est-ce que c'est exact pour ce produit-là ? Sinon on réécrit.
 */
export const NAV_FAMILIES: readonly FamilyLink[] = [
  {
    family: 'one',
    href: '/challenges/one',
    label: 'ONE',
    tagline: 'Une évaluation. Une seule étape.',
    description: 'Réussissez l’objectif, puis passez sur Performance.',
  },
  {
    family: 'flex',
    href: '/challenges/flex',
    label: 'FLEX',
    tagline: 'Payez moins au départ.',
    description: 'Le reste seulement si vous réussissez.',
  },
  {
    family: 'instant',
    href: '/challenges/instant',
    label: 'INSTANT',
    tagline: 'Pas d’évaluation.',
    description: 'Commencez directement sur Performance.',
  },
];

/**
 * Secondary destinations inside the `Parcours` menu.
 *
 * « Comparer les 15 offres » est sorti : le nombre de références au catalogue
 * n'est pas une proposition de valeur. Personne ne se lève en voulant une
 * entreprise qui a quinze SKU.
 */
export const NAV_PARCOURS_LINKS: readonly NavLink[] = [
  { href: '/offres', label: 'Comparer les parcours' },
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
 * Five now, not the four the shell originally shipped with. That count was
 * deliberate at the time — WARIBA had no public company route, and the
 * phase forbade inventing an "about" or "team" page to fill a `Société`
 * column. `/contact` and `/afrique-francophone` are real routes now, so the
 * column can exist honestly. It still holds only those two: still no
 * invented "équipe", "carrières" or "presse" page behind it.
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
    title: 'Société',
    links: [
      { href: '/afrique-francophone', label: 'Afrique francophone' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Cadre légal',
    links: [
      { href: '/legal', label: 'Centre légal' },
      { href: '/legal/mentions-legales', label: 'Mentions légales' },
      { href: '/legal/conditions-utilisation', label: 'Conditions d’utilisation' },
      { href: '/legal/confidentialite', label: 'Confidentialité' },
      { href: '/legal/risques', label: 'Risques et simulation' },
    ],
  },
];
