'use client';

import { memo, type ReactNode } from 'react';
import { AccountsIcon, HubIcon, MoreIcon, PayoutsIcon, TradeIcon } from '@wariba/ui';

interface RailItem {
  href: string;
  label: string;
  icon: ReactNode;
}

/**
 * Only routes that already exist and are already the trader's own
 * (`apps/web/app/(platform)/layout.tsx` owns the same four, plus Plus).
 *
 * W1 §10 is explicit that the W0 diagram's "Performance / Risk / Settings"
 * must not become placeholder routes: there is no `/performance`, no `/risk`
 * and no `/settings` in this application, so the rail does not pretend
 * otherwise. Control/admin destinations are deliberately absent — the rail
 * is the trader's, and `(control)` has its own shell.
 */
const RAIL_ITEMS: readonly RailItem[] = [
  { href: '/trade', label: 'Trade', icon: <TradeIcon size="sm" /> },
  { href: '/hub', label: 'Hub', icon: <HubIcon size="sm" /> },
  { href: '/comptes', label: 'Comptes', icon: <AccountsIcon size="sm" /> },
  { href: '/payouts', label: 'Payouts', icon: <PayoutsIcon size="sm" /> },
  { href: '/plus', label: 'Plus', icon: <MoreIcon size="sm" /> },
];

export interface NavRailProps {
  /** Pathname of the surface currently rendered — `/trade` inside WariX. */
  currentPath: string;
}

/**
 * The 56 px workstation rail (W1 §10). Icons only, never a 240 px SaaS
 * sidebar: at this width the label lives in the accessible name and the
 * native tooltip, so nothing is announced as an unlabelled icon button.
 *
 * Tab order is document order and every item is a real anchor, so keyboard
 * navigation, middle-click and open-in-new-tab all behave the way the
 * browser already does — no key handling of our own to get wrong.
 */
export const NavRail = memo(function NavRail({ currentPath }: NavRailProps) {
  return (
    <nav
      aria-label="Navigation WariX"
      data-testid="workstation-nav-rail"
      className="flex h-full w-[var(--wariba-component-workstation-rail-width)] shrink-0 flex-col items-center gap-1 border-r border-[color:var(--wariba-component-workstation-seam)] bg-[color:var(--wariba-component-workstation-surface-raised)] py-2"
    >
      <span
        aria-hidden="true"
        title="WARIBA WariX"
        className="mb-2 flex h-8 w-8 items-center justify-center rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-theme-action)] text-[length:var(--wariba-font-size-label-sm)] font-bold text-[color:var(--wariba-color-white)]"
      >
        W
      </span>
      <span className="sr-only">WARIBA WariX</span>

      {RAIL_ITEMS.map((item) => {
        const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
        return (
          <a
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            className={`flex h-10 w-10 items-center justify-center rounded-[var(--wariba-radius-sm)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] ${
              active
                ? 'bg-[color:var(--wariba-surface-selected)] text-[color:var(--wariba-theme-action)]'
                : 'text-[color:var(--wariba-text-secondary)] hover:bg-[color:var(--wariba-surface-selected)] hover:text-[color:var(--wariba-theme-text)]'
            }`}
          >
            {item.icon}
          </a>
        );
      })}
    </nav>
  );
});
