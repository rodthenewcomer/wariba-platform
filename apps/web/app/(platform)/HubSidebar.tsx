'use client';

import Link from 'next/link';
import { productCopy } from '../../lib/product-copy';
import { DESKTOP_DESTINATIONS, isActive, type Destination } from './hub-destinations';

/**
 * The desktop sidebar.
 *
 * Two widths, both fixed: 232px expanded, 68px collapsed. The collapsed rail
 * is a real rail — 68px is enough for a 28px glyph inside a 44px target with
 * breathing room, and not enough to tempt anyone into squeezing a truncated
 * label beside it.
 *
 * Labels are clipped rather than unmounted when it collapses, so the row does
 * not reflow and the icon never jumps out from under the cursor mid-animation.
 */

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

export function CollapseButton({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-controls="hub-sidebar"
      aria-label={collapsed ? productCopy.hub.nav.expand : productCopy.hub.nav.collapse}
      data-testid="hub-sidebar-toggle"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--warix-radius-card)] text-[color:var(--wariba-text-secondary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--warix-surface-hover)] hover:text-[color:var(--wariba-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none"
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

export function HubSidebar({
  pathname,
  collapsed,
  hydrated,
  onToggle,
}: {
  pathname: string;
  collapsed: boolean;
  hydrated: boolean;
  onToggle: () => void;
}) {
  return (
    <nav
      // The id the collapse button's `aria-controls` points at. Without it the
      // reference dangles, which axe reports as a critical violation — and a
      // screen-reader user is told the button controls something that does not
      // exist.
      id="hub-sidebar"
      // "Principal" rather than "Navigation principale": the element is
      // already a nav landmark, so the longer name makes a screen reader
      // announce "navigation, Navigation principale".
      aria-label="Principal"
      data-testid="hub-sidebar"
      data-collapsed={collapsed ? 'true' : 'false'}
      style={{
        width: collapsed ? 'var(--hub-sidebar-collapsed)' : 'var(--hub-sidebar-expanded)',
      }}
      className={`hidden shrink-0 flex-col border-r border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-panel)] px-3 py-4 md:flex ${
        hydrated
          ? 'transition-[width] duration-[var(--wariba-component-workstation-motion-panel)] ease-[var(--wariba-component-workstation-ease-surface)] motion-reduce:transition-none'
          : ''
      }`}
    >
      <div className={`mb-6 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
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
        {collapsed ? null : <CollapseButton collapsed={collapsed} onToggle={onToggle} />}
      </div>

      <div className="flex flex-col gap-1">
        {DESKTOP_DESTINATIONS.map((destination) => (
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
       * structure exists now; the control arrives with the commerce phase that
       * owns it.
       */}
      <div className="mt-auto flex flex-col gap-3">
        <div aria-hidden="true" className="h-px bg-[color:var(--warix-border-subtle)]" />
        {collapsed ? <CollapseButton collapsed={collapsed} onToggle={onToggle} /> : null}
      </div>
    </nav>
  );
}
