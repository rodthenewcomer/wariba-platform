'use client';

import Link from 'next/link';
import { useState } from 'react';
import { HubIcon } from '../../components/hub/icons';
import { BottomSheet } from '../../components/hub/BottomSheet';
import { isActive, MOBILE_DESTINATIONS, MOBILE_OVERFLOW } from './hub-destinations';
import { signOutAction } from '../(auth)/actions';
import { productCopy } from '../../lib/product-copy';

/**
 * The phone tab bar.
 *
 * Five items, fixed to the bottom, above the home indicator. The numbers are
 * not arbitrary: 70px of bar plus the safe-area inset gives each item a 44px
 * touch target with a 25px glyph and an 11px label that is still a word rather
 * than an ellipsis.
 *
 * The active state is carried three ways — a filled glyph, a cobalt rule and a
 * heavier label — because a phone is used in sunlight, at arm's length, by
 * people whose colour vision is not a given.
 *
 * What keeps this from covering the page is not here but in the shell: `main`
 * reserves exactly this height as bottom padding.
 */
export function HubMobileNav({ pathname }: { pathname: string }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <nav
        // Only one of the two navs is in the accessibility tree at a time: the
        // other is `display: none` at this breakpoint, which removes it.
        aria-label="Principal"
        data-testid="hub-mobile-nav"
        style={{ height: 'calc(var(--hub-mobile-nav-height) + env(safe-area-inset-bottom))' }}
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[color:var(--warix-border-subtle)] bg-[color:color-mix(in_srgb,var(--warix-panel)_94%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-[12px] md:hidden"
      >
        {MOBILE_DESTINATIONS.map((destination) => {
          const overflow = destination.href === '/plus';
          const active = overflow ? sheetOpen : isActive(pathname, destination.href);

          const inner = (
            <>
              <span
                aria-hidden="true"
                className={`absolute inset-x-3 top-0 h-[2px] rounded-b-full ${
                  active ? 'bg-[color:var(--wariba-accent-indigo)]' : 'bg-transparent'
                }`}
              />
              <span className="flex items-center justify-center">
                <HubIcon role={destination.icon} active={active} size={25} />
              </span>
              <span
                className={`max-w-full truncate text-[11px] leading-none ${
                  active ? 'font-semibold' : 'font-medium'
                }`}
              >
                {destination.label}
              </span>
            </>
          );

          const className = `relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 px-0.5 transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] motion-reduce:transition-none ${
            active
              ? 'text-[color:var(--wariba-text-primary)]'
              : 'text-[color:var(--wariba-text-tertiary)]'
          }`;

          /*
           * "Plus" opens a sheet rather than navigating. A tab that leaves the
           * page to show a list of links costs the trader their place; a sheet
           * hands the list over and gives it straight back.
           *
           * `/plus` still exists as a route, so a direct visit or a session with
           * no JavaScript reaches the same destinations.
           */
          return overflow ? (
            <button
              key={destination.href}
              type="button"
              aria-expanded={sheetOpen}
              aria-haspopup="dialog"
              data-testid="hub-mobile-more"
              onClick={() => setSheetOpen(true)}
              className={className}
            >
              {inner}
            </button>
          ) : (
            <Link
              key={destination.href}
              href={destination.href}
              aria-current={active ? 'page' : undefined}
              data-active={active ? 'true' : 'false'}
              className={className}
            >
              {inner}
            </Link>
          );
        })}
      </nav>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Plus">
        <div className="flex flex-col gap-5">
          {MOBILE_OVERFLOW.map((group, index) => (
            <div key={group.title ?? `group-${index}`} className="flex flex-col gap-1.5">
              {group.title ? (
                <p className="px-1 text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-text-tertiary)]">
                  {group.title}
                </p>
              ) : null}
              {group.destinations.map((destination) => (
                <Link
                  key={destination.href}
                  href={destination.href}
                  onClick={() => setSheetOpen(false)}
                  className={[
                    'flex min-h-[52px] items-center gap-3 rounded-[10px] border px-3.5',
                    'transition-colors duration-[var(--wariba-component-workstation-motion-interaction)]',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2',
                    'focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none',
                    destination.emphasis === 'cta'
                      ? 'border-[color:var(--wariba-accent-indigo-edge)] bg-[color:var(--wariba-accent-indigo-wash)] text-[color:var(--wariba-text-primary)]'
                      : 'border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface-raised)] text-[color:var(--wariba-text-primary)]',
                  ].join(' ')}
                >
                  <span
                    aria-hidden="true"
                    className={
                      destination.emphasis === 'cta'
                        ? 'text-[color:var(--wariba-accent-indigo)]'
                        : 'text-[color:var(--wariba-text-secondary)]'
                    }
                  >
                    <HubIcon
                      role={destination.icon}
                      size={24}
                      active={destination.emphasis === 'cta'}
                    />
                  </span>
                  <span className="flex-1 text-[length:var(--wariba-font-size-label-md)] font-semibold">
                    {destination.label}
                  </span>
                  <span aria-hidden="true" className="text-[color:var(--wariba-text-tertiary)]">
                    <HubIcon role="chevron" size={16} />
                  </span>
                </Link>
              ))}
            </div>
          ))}

          <form action={signOutAction}>
            <button
              type="submit"
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[10px] border border-[color:var(--warix-border-strong)] bg-[color:var(--warix-surface-raised)] text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]"
            >
              <HubIcon role="signOut" size={18} />
              {productCopy.hub.user.signOut}
            </button>
          </form>
        </div>
      </BottomSheet>
    </>
  );
}
