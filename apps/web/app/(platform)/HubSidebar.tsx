'use client';

import Link from 'next/link';
import { HubIcon } from '../../components/hub/icons';
import { productCopy } from '../../lib/product-copy';
import type { HubIdentity } from '../../lib/hub-identity';
import { HubUserMenu } from './HubUserMenu';
import { activeDestination, HUB_GROUPS, type Destination } from './hub-destinations';

/**
 * The desktop sidebar.
 *
 * ## What changed and why
 *
 * Three flat rows became nine grouped ones, because the Hub finally has nine
 * places worth going. Grouping is what keeps that from being a wall: a trader
 * scans four headings, not nine equal rows.
 *
 * The active state now carries three signals at once — a filled glyph, an
 * elevated surface and a cobalt edge — rather than a background tint alone.
 * One of the three survives greyscale, one survives colour-blindness, and the
 * filled silhouette survives both, which is the point.
 *
 * "Ajouter un compte" is rendered as an action, not a row. It is the only
 * commercial moment in the navigation and the only entry that changes what the
 * trader owns rather than what they are looking at; giving it the same
 * treatment as "Journal" buried the one thing the business needs findable.
 *
 * Collapsed, labels are clipped rather than unmounted so the row never reflows
 * mid-animation, and every row carries a native tooltip so a 72px rail stays
 * navigable without memorising six glyphs.
 */

const nav = productCopy.hub.nav;

function DestinationRow({
  destination,
  collapsed,
  active,
}: {
  destination: Destination;
  collapsed: boolean;
  active: boolean;
}) {
  const cta = destination.emphasis === 'cta';

  return (
    <Link
      href={destination.href}
      // `aria-current` rather than a visual-only cue: colour alone is not a
      // state a screen reader or a colour-blind trader can perceive.
      aria-current={active ? 'page' : undefined}
      title={collapsed ? destination.label : undefined}
      data-active={active ? 'true' : 'false'}
      data-cta={cta ? 'true' : 'false'}
      data-testid={`hub-nav-${destination.href.replaceAll('/', '-').slice(1)}`}
      className={[
        'group relative flex min-h-[44px] items-center gap-3 rounded-[10px] px-3',
        'transition-[background-color,color,box-shadow,border-color]',
        'duration-[var(--wariba-component-workstation-motion-standard)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2',
        'focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none',
        collapsed ? 'justify-center px-0' : '',
        cta
          ? // The commercial action. An indigo field with its own edge, so it
            // reads as a control among destinations rather than as a selected
            // destination — which is why it is a wash and not the solid button
            // fill the primary CTA uses elsewhere.
            'border border-[color:var(--wariba-accent-indigo-edge)] bg-[color:var(--wariba-accent-indigo-wash)] text-[color:var(--wariba-text-primary)] hover:bg-[color:color-mix(in_srgb,var(--wariba-accent-indigo)_20%,transparent)]'
          : active
            ? 'bg-[color:var(--warix-surface-selected)] text-[color:var(--wariba-text-primary)] shadow-[inset_0_1px_0_0_var(--warix-highlight-inner-strong)]'
            : 'text-[color:var(--wariba-text-secondary)] hover:bg-[color:var(--warix-surface-hover)] hover:text-[color:var(--wariba-text-primary)]',
      ].join(' ')}
    >
      {/* The accent edge on the active row. Survives greyscale. */}
      {cta ? null : (
        <span
          aria-hidden="true"
          className={`absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full transition-opacity duration-[var(--wariba-component-workstation-motion-standard)] motion-reduce:transition-none ${
            active ? 'bg-[color:var(--wariba-accent-indigo)] opacity-100' : 'opacity-0'
          }`}
        />
      )}

      <span
        className={`flex shrink-0 items-center justify-center ${
          cta ? 'text-[color:var(--wariba-accent-indigo)]' : ''
        }`}
      >
        <HubIcon role={destination.icon} active={active || cta} size={26} />
      </span>

      <span
        className={`min-w-0 overflow-hidden whitespace-nowrap text-[length:var(--wariba-font-size-label-md)] transition-[opacity,max-width] duration-[var(--wariba-component-workstation-motion-standard)] motion-reduce:transition-none ${
          active || cta ? 'font-semibold' : 'font-medium'
        } ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[11rem] opacity-100'}`}
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
      aria-label={collapsed ? nav.expand : nav.collapse}
      data-testid="hub-sidebar-toggle"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[color:var(--wariba-text-secondary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--warix-surface-hover)] hover:text-[color:var(--wariba-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none"
    >
      <svg
        aria-hidden="true"
        fill="none"
        height="20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.25"
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
  identity,
}: {
  pathname: string;
  collapsed: boolean;
  hydrated: boolean;
  onToggle: () => void;
  identity: HubIdentity;
}) {
  /*
   * One row is active, not every row whose href is a prefix of the path.
   *
   * `/comptes/nouveau` starts with `/comptes`, so a per-row prefix test lit
   * both "Comptes" and "Ajouter un compte" at once and left the trader unsure
   * which page they were on. The longest match wins, resolved once.
   */
  const currentHref = activeDestination(pathname)?.href ?? null;

  return (
    <nav
      // The id the collapse button's `aria-controls` points at. Without it the
      // reference dangles, which axe reports as a critical violation.
      id="hub-sidebar"
      aria-label="Principal"
      data-testid="hub-sidebar"
      data-collapsed={collapsed ? 'true' : 'false'}
      style={{
        width: collapsed ? 'var(--hub-sidebar-collapsed)' : 'var(--hub-sidebar-expanded)',
      }}
      /*
       * `min-w-0` and `overflow-hidden` are load-bearing, not tidiness.
       *
       * A flex item's `min-width` defaults to `auto`, which resolves to its
       * min-content width and silently overrides an explicit `width`. Without
       * these the collapsed rail measured 148px instead of 72px — the widest
       * nowrap label inside it was setting the floor, and the collapse
       * reclaimed almost nothing.
       */
      className={`hidden min-w-0 shrink-0 flex-col overflow-hidden border-r border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-panel)] px-3 py-4 md:flex ${
        hydrated
          ? 'transition-[width] duration-[var(--wariba-component-workstation-motion-panel)] ease-[var(--wariba-component-workstation-ease-surface)] motion-reduce:transition-none'
          : ''
      }`}
    >
      <div className={`mb-5 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <Link
          href="/hub"
          className="flex items-center gap-2.5 rounded-[6px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[color:var(--wariba-component-workstation-wash-identity)] text-[length:var(--wariba-font-size-label-lg)] font-extrabold leading-none text-[color:var(--wariba-accent-copper)] ring-1 ring-inset ring-[color:var(--wariba-accent-copper-edge)]"
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

      {/* The navigation scrolls; the identity block below does not. On a short
          laptop window that keeps the way out reachable without scrolling. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {HUB_GROUPS.map((group, index) => (
          <div key={group.title ?? `group-${index}`} className="flex flex-col gap-1">
            {group.title ? (
              collapsed ? (
                // Collapsed, a heading has nowhere to go, so the grouping is
                // carried by a rule instead of disappearing entirely.
                <div
                  aria-hidden="true"
                  className="mx-3 mb-1 h-px bg-[color:var(--warix-border-subtle)]"
                />
              ) : (
                <p className="truncate px-3 pb-1 pt-1 text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-text-tertiary)]">
                  {group.title}
                </p>
              )
            ) : null}
            {group.destinations.map((destination) => (
              <DestinationRow
                key={destination.href}
                destination={destination}
                collapsed={collapsed}
                active={destination.href === currentHref}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div aria-hidden="true" className="h-px bg-[color:var(--warix-border-subtle)]" />
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <HubUserMenu identity={identity} compact />
            <CollapseButton collapsed={collapsed} onToggle={onToggle} />
          </div>
        ) : (
          <HubUserMenu identity={identity} />
        )}
      </div>
    </nav>
  );
}
