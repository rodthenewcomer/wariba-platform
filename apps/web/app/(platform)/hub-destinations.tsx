import { productCopy } from '../../lib/product-copy';
import type { HubIconRole } from '../../components/hub/icons';

/**
 * The Trader Hub's information architecture.
 *
 * ## Groups, not a list
 *
 * Three destinations in a flat column is a menu. Nine is a wall, unless they
 * are grouped by what a trader came to do — which is what the groups below
 * encode: run the accounts, study the record, handle the money, manage the
 * relationship. A trader looking for "where do I see my trades" scans four
 * headings rather than nine equal rows.
 *
 * ## The asymmetry with WariX, restated
 *
 * WariX is a separate product shell (UX-HUB-001). It is not in this list. It
 * is opened contextually from the account that can be traded, and it keeps a
 * phone tab because a phone has no room for a contextual action.
 *
 * ## What is deliberately absent
 *
 * **Récompenses / Réussites.** There is no achievements table, no criteria and
 * no award anywhere in the platform. A trophy in the sidebar leading to a page
 * that lists nothing — or worse, to fabricated milestones — is exactly the
 * kind of manufactured progress this product has refused everywhere else. It
 * returns when there is something to award.
 *
 * **Notifications.** Same reason, unchanged since Phase 1: no notification
 * centre exists, and a bell wearing a count nobody generated is the first fake
 * thing in a product that has none.
 */

export interface Destination {
  href: string;
  label: string;
  icon: HubIconRole;
  /**
   * A destination that is really an action. Rendered as a call to action
   * rather than as a row — buying an account is not "somewhere you go".
   */
  emphasis?: 'cta';
}

export interface DestinationGroup {
  /** `null` for the first group, which needs no heading above the brand. */
  title: string | null;
  destinations: readonly Destination[];
}

const nav = productCopy.hub.nav;

export const HUB_GROUPS: readonly DestinationGroup[] = [
  {
    title: null,
    destinations: [
      { href: '/hub', label: nav.dashboard, icon: 'dashboard' },
      { href: '/comptes', label: nav.accounts, icon: 'accounts' },
      { href: '/comptes/nouveau', label: nav.addAccount, icon: 'addAccount', emphasis: 'cta' },
    ],
  },
  {
    title: nav.groupInsights,
    destinations: [
      { href: '/performance', label: nav.performance, icon: 'performance' },
      { href: '/journal', label: nav.journal, icon: 'journal' },
    ],
  },
  {
    title: nav.groupMoney,
    destinations: [
      { href: '/payouts', label: nav.payouts, icon: 'payouts' },
      { href: '/facturation', label: nav.billing, icon: 'billing' },
    ],
  },
  {
    title: nav.groupAccount,
    destinations: [
      { href: '/support', label: nav.support, icon: 'support' },
      { href: '/parametres', label: nav.settings, icon: 'settings' },
    ],
  },
];

/** Flattened, for active-state and title resolution. */
export const HUB_DESTINATIONS: readonly Destination[] = HUB_GROUPS.flatMap(
  (group) => group.destinations,
);

/**
 * The phone tab bar. Five items, fixed.
 *
 * More than five and the labels stop being words at 320px. WariX earns a slot
 * here for the reason given above; everything else lives behind "Plus".
 */
export const MOBILE_DESTINATIONS: readonly Destination[] = [
  { href: '/hub', label: nav.dashboardShort, icon: 'dashboard' },
  { href: '/comptes', label: nav.accounts, icon: 'accounts' },
  { href: '/trade', label: nav.trade, icon: 'warix' },
  { href: '/payouts', label: nav.payouts, icon: 'payouts' },
  { href: '/plus', label: nav.more, icon: 'more' },
];

/** What the "Plus" sheet holds — everything the tab bar could not fit. */
export const MOBILE_OVERFLOW: readonly DestinationGroup[] = [
  {
    title: null,
    destinations: [
      { href: '/comptes/nouveau', label: nav.addAccount, icon: 'addAccount', emphasis: 'cta' },
    ],
  },
  {
    title: nav.groupInsights,
    destinations: [
      { href: '/performance', label: nav.performance, icon: 'performance' },
      { href: '/journal', label: nav.journal, icon: 'journal' },
    ],
  },
  {
    title: nav.groupMoney,
    destinations: [{ href: '/facturation', label: nav.billing, icon: 'billing' }],
  },
  {
    title: nav.groupAccount,
    destinations: [
      { href: '/support', label: nav.support, icon: 'support' },
      { href: '/parametres', label: nav.settings, icon: 'settings' },
    ],
  },
];

/**
 * Segment match, not string prefix.
 *
 * `startsWith('/hub')` would also light up `/hubris`; comparing whole segments
 * keeps `/comptes` and `/comptes/xyz` together without matching a neighbour
 * that merely shares an opening.
 */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The active destination for a path.
 *
 * Longest match wins, so `/comptes/nouveau` selects itself rather than
 * `/comptes` — a nested route lighting up its parent is how a trader ends up
 * unsure which page they are on.
 */
export function activeDestination(pathname: string): Destination | null {
  return (
    [...HUB_DESTINATIONS, ...MOBILE_DESTINATIONS]
      .filter((destination) => isActive(pathname, destination.href))
      .sort((a, b) => b.href.length - a.href.length)[0] ?? null
  );
}

const EXTRA_TITLES: Record<string, string> = {
  '/trade': nav.trade,
  '/plus': nav.more,
  '/verification-identite': nav.identityVerification,
};

export function titleFor(pathname: string): string {
  const match = activeDestination(pathname);
  if (match) return match.label;
  for (const [href, label] of Object.entries(EXTRA_TITLES)) {
    if (isActive(pathname, href)) return label;
  }
  return nav.dashboard;
}
