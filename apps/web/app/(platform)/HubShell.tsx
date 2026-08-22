'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  WariXAccountsIcon,
  WariXHubIcon,
  WariXMoreIcon,
  WariXPayoutsIcon,
  WariXTradeIcon,
} from '@wariba/ui';
import { productCopy } from '../../lib/product-copy';
import { signOutAction } from '../(auth)/actions';

/**
 * The WARIBA Trader Hub shell.
 *
 * The Hub is not WariX and must not feel like it. The workstation is dense
 * because a trader is working inside it; the Hub is where they arrive, check
 * where they stand and decide what to do next, so it is calmer, more spacious
 * and structured around navigation rather than around a chart.
 *
 * What this deliberately does not do is invent destinations. Performance,
 * Facturation and Support have no routes yet, so they are absent — a
 * navigation item that leads nowhere, or a disabled "bientôt disponible" row,
 * is a promise the product has not kept, sitting permanently in the one
 * surface a trader reads every session.
 */

const EXPANDED_WIDTH = 232;
const COLLAPSED_WIDTH = 68;
const COLLAPSE_STORAGE_KEY = 'wariba.hub.sidebar.collapsed';

interface Destination {
  href: string;
  label: string;
  icon: ReactNode;
}

/** Only routes that genuinely render. */
const DESTINATIONS: Destination[] = [
  { href: '/hub', label: productCopy.hub.nav.dashboard, icon: <WariXHubIcon size="nav" /> },
  { href: '/comptes', label: productCopy.hub.nav.accounts, icon: <WariXAccountsIcon size="nav" /> },
  { href: '/trade', label: productCopy.hub.nav.trade, icon: <WariXTradeIcon size="nav" /> },
  { href: '/payouts', label: productCopy.hub.nav.payouts, icon: <WariXPayoutsIcon size="nav" /> },
];

const MOBILE_DESTINATIONS: Destination[] = [
  ...DESTINATIONS,
  { href: '/plus', label: productCopy.hub.nav.more, icon: <WariXMoreIcon size="mobile" /> },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarItem({
  destination,
  collapsed,
  active,
}: {
  destination: Destination;
  collapsed: boolean;
  active: boolean;
}) {
  return (
    <Link
      href={destination.href}
      // `aria-current` rather than a visual-only cue: colour alone is not a
      // state a screen reader or a colour-blind trader can perceive.
      aria-current={active ? 'page' : undefined}
      title={collapsed ? destination.label : undefined}
      data-active={active ? 'true' : 'false'}
      className={`group relative flex h-11 items-center gap-3 rounded-[var(--warix-radius-card)] px-3 transition-[background-color,color,box-shadow] duration-[var(--wariba-component-workstation-motion-standard)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none ${
        active
          ? 'bg-[color:var(--warix-surface-selected)] text-[color:var(--wariba-text-primary)] shadow-[inset_0_1px_0_0_var(--warix-highlight-inner-strong)]'
          : 'text-[color:var(--wariba-text-secondary)] hover:bg-[color:var(--warix-surface-hover)] hover:text-[color:var(--wariba-text-primary)]'
      } ${collapsed ? 'justify-center px-0' : ''}`}
    >
      {/* A left rule on the active row, so state survives greyscale. */}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full transition-opacity duration-[var(--wariba-component-workstation-motion-standard)] motion-reduce:transition-none ${
          active ? 'bg-[color:var(--warix-accent-cobalt)] opacity-100' : 'opacity-0'
        }`}
      />
      <span className="flex shrink-0 items-center justify-center">{destination.icon}</span>
      {/* Clipped rather than unmounted, so collapsing does not reflow the row
          and the icon never shifts under the cursor. */}
      <span
        className={`min-w-0 overflow-hidden whitespace-nowrap text-[length:var(--wariba-font-size-label-md)] transition-[opacity,max-width] duration-[var(--wariba-component-workstation-motion-standard)] motion-reduce:transition-none ${
          active ? 'font-semibold' : 'font-medium'
        } ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[10rem] opacity-100'}`}
      >
        {destination.label}
      </span>
    </Link>
  );
}

function UserMenu({ initials }: { initials: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      // Focus returns to the control that opened the menu, not to the page.
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={productCopy.hub.user.menu}
        data-testid="hub-user-menu-trigger"
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--warix-surface-raised)] text-[length:var(--wariba-font-size-label-md)] font-bold text-[color:var(--wariba-text-primary)] ring-1 ring-inset ring-[color:var(--warix-border-subtle)] transition-colors hover:ring-[color:var(--warix-border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
      >
        {/* Initials, not a generated portrait: a stock face on a financial
            product is a stranger pretending to be the person using it. */}
        <span aria-hidden="true">{initials}</span>
      </button>

      {open ? (
        <div
          role="menu"
          data-testid="hub-user-menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 overflow-hidden rounded-[var(--warix-radius-panel)] border border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface)] p-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]"
        >
          {/*
           * Only the action that genuinely works.
           *
           * Profil and Paramètres have no routes yet. Showing them disabled, or
           * pointing them at a 404, would put two dead entries in the menu a
           * trader opens to sign out.
           */}
          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              data-testid="hub-sign-out"
              className="flex h-10 w-full items-center rounded-[var(--warix-radius-well)] px-3 text-left text-[length:var(--wariba-font-size-label-md)] font-medium text-[color:var(--wariba-text-primary)] transition-colors hover:bg-[color:var(--warix-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
            >
              {productCopy.hub.user.signOut}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function HubShell({ children, initials }: { children: ReactNode; initials: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  /*
   * Restored after mount rather than during render: reading storage while
   * rendering makes the server and client disagree, and the sidebar snaps
   * width on hydration. `hydrated` suppresses the transition for that first
   * paint so a restored collapsed state does not animate open then shut.
   */
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === 'true');
    } catch {
      // Storage can be unavailable (private mode, blocked cookies). The
      // sidebar simply opens expanded; it is a preference, not state.
    }
    setHydrated(true);
  }, []);

  const toggle = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      } catch {
        // Preference is not persisted; the session still works.
      }
      return next;
    });
  };

  return (
    <div
      data-wariba-section="hub"
      data-wariba-theme="hub"
      data-theme="dark"
      className="flex min-h-dvh bg-[color:var(--warix-shell)] text-[color:var(--wariba-text-primary)]"
    >
      <nav
        // The id the collapse button's `aria-controls` points at. Without it
        // the reference dangles, which axe reports as a critical violation —
        // and a screen-reader user is told the button controls something that
        // does not exist.
        id="hub-sidebar"
        // "Principal" rather than "Navigation principale": the element is
        // already a nav landmark, so the longer name makes a screen reader
        // announce "navigation, Navigation principale". It is also the name the
        // shell has always exposed.
        aria-label="Principal"
        data-testid="hub-sidebar"
        data-collapsed={collapsed ? 'true' : 'false'}
        style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
        className={`hidden shrink-0 flex-col border-r border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-panel)] px-3 py-4 md:flex ${
          hydrated
            ? 'transition-[width] duration-[var(--wariba-component-workstation-motion-panel)] ease-[var(--wariba-component-workstation-ease-surface)] motion-reduce:transition-none'
            : ''
        }`}
      >
        <div
          className={`mb-6 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}
        >
          <Link
            href="/hub"
            className="flex items-center gap-2.5 rounded-[6px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[color:var(--wariba-component-workstation-wash-identity)] text-[length:var(--wariba-font-size-label-lg)] font-extrabold leading-none text-[color:var(--wariba-component-workstation-identity-mark)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-identity-rule)]"
            >
              W
            </span>
            <span
              className={`overflow-hidden whitespace-nowrap text-[length:var(--wariba-font-size-label-lg)] font-bold tracking-[-0.01em] transition-[opacity,max-width] duration-[var(--wariba-component-workstation-motion-standard)] motion-reduce:transition-none ${
                collapsed ? 'max-w-0 opacity-0' : 'max-w-[8rem] opacity-100'
              }`}
            >
              WARIBA
            </span>
          </Link>
          {collapsed ? null : <CollapseButton collapsed={collapsed} onToggle={toggle} />}
        </div>

        <div className="flex flex-col gap-1">
          {DESTINATIONS.map((destination) => (
            <SidebarItem
              key={destination.href}
              destination={destination}
              collapsed={collapsed}
              active={isActive(pathname, destination.href)}
            />
          ))}
        </div>

        {/*
         * Reserved slot for "+ Ajouter un compte".
         *
         * It is an action, not a destination, so it sits below the navigation
         * behind a rule rather than among the places a trader can go. The
         * structure exists now; the control arrives with the commerce phase
         * that owns it.
         */}
        <div className="mt-auto flex flex-col gap-3">
          <div aria-hidden="true" className="h-px bg-[color:var(--warix-border-subtle)]" />
          {collapsed ? <CollapseButton collapsed={collapsed} onToggle={toggle} /> : null}
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          data-testid="hub-header"
          className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-panel)] px-4 sm:px-6"
        >
          <h1 className="truncate text-[length:var(--wariba-font-size-label-lg)] font-semibold tracking-[-0.01em]">
            {DESTINATIONS.find((destination) => isActive(pathname, destination.href))?.label ??
              productCopy.hub.nav.dashboard}
          </h1>
          {/* No notification control: the notification centre does not exist
              yet, and a bell that opens nothing — or worse, wears a fabricated
              count — is the first fake thing in a product that has none. */}
          <UserMenu initials={initials} />
        </header>

        {/* `min-w-0` keeps a wide child scrolling inside its own container
            instead of dragging the page sideways at 320px. */}
        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-8">{children}</main>
      </div>

      <nav
        // Only one of the two navs is in the accessibility tree at a time:
        // the other is `display: none` at this breakpoint, which removes it.
        aria-label="Principal"
        data-testid="hub-mobile-nav"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-panel)] pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {MOBILE_DESTINATIONS.map((destination) => {
          const active = isActive(pathname, destination.href);
          return (
            <Link
              key={destination.href}
              href={destination.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[length:var(--wariba-font-size-body-sm)] transition-colors motion-reduce:transition-none ${
                active
                  ? 'text-[color:var(--wariba-text-primary)]'
                  : 'text-[color:var(--wariba-text-tertiary)]'
              }`}
            >
              <span className="flex items-center justify-center">{destination.icon}</span>
              <span className="truncate text-[11px] font-medium leading-none">
                {destination.label}
              </span>
              <span
                aria-hidden="true"
                className={`h-[2px] w-6 rounded-full ${
                  active ? 'bg-[color:var(--warix-accent-cobalt)]' : 'bg-transparent'
                }`}
              />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function CollapseButton({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-controls="hub-sidebar"
      aria-label={collapsed ? productCopy.hub.nav.expand : productCopy.hub.nav.collapse}
      data-testid="hub-sidebar-toggle"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--warix-radius-card)] text-[color:var(--wariba-text-secondary)] transition-colors hover:bg-[color:var(--warix-surface-hover)] hover:text-[color:var(--wariba-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
    >
      <svg
        aria-hidden="true"
        fill="none"
        height="20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="20"
      >
        <path d={collapsed ? 'm9 6 6 6-6 6' : 'm15 6-6 6 6 6'} />
      </svg>
    </button>
  );
}
