import type { ReactNode } from 'react';
import {
  WariXAccountsIcon,
  WariXHubIcon,
  WariXMoreIcon,
  WariXPayoutsIcon,
  WariXTradeIcon,
} from '@wariba/ui';
import { productCopy } from '../../lib/product-copy';

/**
 * Where the Hub can take a trader — and, on desktop, where it deliberately
 * cannot.
 *
 * ## The asymmetry is the decision
 *
 * WariX is a separate product shell, not a page of this one. Listing it beside
 * Tableau de bord and Comptes said the opposite: that opening a trading
 * terminal is a navigation of the same kind as looking at a list of accounts.
 * It is not — it is a context switch into another application, and it belongs
 * to whichever account is selected.
 *
 * So on desktop it leaves the sidebar and becomes a contextual action on the
 * account that can open it. On a phone there is no room for a contextual
 * action anywhere except the tab bar, and a trader reaching for the terminal
 * on their phone should not have to remember which account screen holds the
 * button — so the tab stays. Two shapes for two input models, on purpose.
 *
 * ## What is absent and why
 *
 * Performance, Facturation and Support have no routes. They are named in the
 * eventual navigation and they are not rendered: an item that leads nowhere,
 * or a greyed "bientôt disponible" row, is a promise the product has not kept
 * sitting permanently in the one surface a trader reads every session.
 */

export interface Destination {
  href: string;
  label: string;
  icon: ReactNode;
}

/**
 * Desktop primary navigation. Places, not actions.
 *
 * The eventual set is Tableau de bord · Comptes · Performance · Payouts ·
 * Facturation · Support. Three of those exist today.
 */
export const DESKTOP_DESTINATIONS: readonly Destination[] = [
  { href: '/hub', label: productCopy.hub.nav.dashboard, icon: <WariXHubIcon size="nav" /> },
  { href: '/comptes', label: productCopy.hub.nav.accounts, icon: <WariXAccountsIcon size="nav" /> },
  { href: '/payouts', label: productCopy.hub.nav.payouts, icon: <WariXPayoutsIcon size="nav" /> },
];

/** Phone tab bar. Five fixed items, WariX among them — see the note above. */
export const MOBILE_DESTINATIONS: readonly Destination[] = [
  { href: '/hub', label: productCopy.hub.nav.dashboardShort, icon: <WariXHubIcon size="tab" /> },
  { href: '/comptes', label: productCopy.hub.nav.accounts, icon: <WariXAccountsIcon size="tab" /> },
  { href: '/trade', label: productCopy.hub.nav.trade, icon: <WariXTradeIcon size="tab" /> },
  { href: '/payouts', label: productCopy.hub.nav.payouts, icon: <WariXPayoutsIcon size="tab" /> },
  { href: '/plus', label: productCopy.hub.nav.more, icon: <WariXMoreIcon size="tab" /> },
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

/** Every place the shell can be, for resolving the header title. */
const TITLED_ROUTES: readonly Destination[] = [
  ...DESKTOP_DESTINATIONS,
  { href: '/trade', label: productCopy.hub.nav.trade, icon: null },
  { href: '/plus', label: productCopy.hub.nav.more, icon: null },
];

/**
 * The header title for the current route.
 *
 * Read from the full route table rather than the desktop navigation, so a
 * destination that is reachable but not listed — `/trade`, `/plus` — still
 * names itself instead of inheriting "Tableau de bord".
 */
export function titleFor(pathname: string): string {
  const match = TITLED_ROUTES.find((destination) => isActive(pathname, destination.href));
  return match?.label ?? productCopy.hub.nav.dashboard;
}
