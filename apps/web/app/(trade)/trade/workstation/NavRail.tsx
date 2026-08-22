'use client';

import { memo, type ReactNode } from 'react';
import {
  Tooltip,
  WariXAccountsIcon,
  WariXHubIcon,
  WariXMoreIcon,
  WariXPayoutsIcon,
  WariXTradeIcon,
} from '@wariba/ui';

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
  { href: '/trade', label: 'WariX', icon: <WariXTradeIcon size="nav" /> },
  { href: '/hub', label: 'Hub', icon: <WariXHubIcon size="nav" /> },
  { href: '/comptes', label: 'Comptes', icon: <WariXAccountsIcon size="nav" /> },
  { href: '/payouts', label: 'Retraits', icon: <WariXPayoutsIcon size="nav" /> },
];

/**
 * Overflow, kept in its own group below the seam.
 *
 * Grouping is the visual closure's answer to "the rail feels generic": four
 * working destinations and one overflow entry rendered as five identical
 * squares gave the eye nothing to hold. A single seam says which four are the
 * workstation's own surfaces and which one is everything else.
 */
const RAIL_OVERFLOW: RailItem = {
  href: '/plus',
  label: 'Plus',
  icon: <WariXMoreIcon size="nav" />,
};

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
function RailLink({ item, active }: { item: RailItem; active: boolean }) {
  return (
    <Tooltip label={item.label} side="right">
      <a
        href={item.href}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        className={`relative flex h-11 w-11 items-center justify-center rounded-[10px] transition-[background-color,color,box-shadow,transform] duration-[var(--wariba-component-workstation-motion-interaction)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] active:scale-[0.97] ${
          active
            ? [
                'bg-[color:var(--wariba-component-workstation-wash-selected-strong)]',
                'text-[color:var(--wariba-component-workstation-interaction-selected-text)]',
                'ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-selected)]',
                // Flush against the rail's own edge (the item is centred in a
                // 56px rail, so −8px is exactly that edge) and full height, so
                // the selected destination reads before the icon does.
                'before:absolute before:-left-2 before:bottom-0 before:top-0 before:w-[3px] before:rounded-r-full before:bg-[color:var(--wariba-component-workstation-interaction-selected)]',
              ].join(' ')
            : 'text-[color:var(--wariba-component-workstation-text-tertiary)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]'
        }`}
      >
        {item.icon}
      </a>
    </Tooltip>
  );
}

export const NavRail = memo(function NavRail({ currentPath }: NavRailProps) {
  const isActive = (href: string): boolean =>
    currentPath === href || currentPath.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Navigation WariX"
      data-testid="workstation-nav-rail"
      className="flex h-full w-[var(--wariba-component-workstation-rail-width)] shrink-0 flex-col items-center gap-1 border-r border-[color:var(--wariba-component-workstation-border-strong)] bg-[color:var(--wariba-component-workstation-surface-raised-module)] py-2"
    >
      {/* The WARIBA mark, and the only place in the workstation where copper
          fills rather than accents. It is an owner's mark on the instrument:
          copper glyph on a copper wash inside a copper hairline, at the one
          size and position a trader never has to look for. */}
      <span
        aria-hidden="true"
        title="WARIBA WariX"
        className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[color:var(--wariba-component-workstation-wash-identity)] text-[length:var(--wariba-component-workstation-type-module-title)] font-extrabold leading-none tracking-[-0.02em] text-[color:var(--wariba-component-workstation-identity-mark)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-identity-rule)]"
      >
        W
      </span>
      <span className="sr-only">WARIBA WariX</span>

      <span
        aria-hidden="true"
        className="my-1.5 h-px w-6 shrink-0 bg-[color:var(--wariba-component-workstation-border-hairline)]"
      />

      {RAIL_ITEMS.map((item) => (
        <RailLink key={item.href} item={item} active={isActive(item.href)} />
      ))}

      <span
        aria-hidden="true"
        className="my-1.5 h-px w-6 shrink-0 bg-[color:var(--wariba-component-workstation-border-hairline)]"
      />

      <RailLink item={RAIL_OVERFLOW} active={isActive(RAIL_OVERFLOW.href)} />
    </nav>
  );
});
