'use client';

import Link from 'next/link';
import { isActive, MOBILE_DESTINATIONS } from './hub-destinations';

/**
 * The phone tab bar.
 *
 * Five items, fixed to the bottom, above the home indicator. The numbers are
 * not arbitrary: 70px of bar plus the safe-area inset gives each item a 44px
 * touch target with a 25px glyph and an 11px label that is still a word rather
 * than an ellipsis. Anything shorter and the label loses to the glyph;
 * anything taller and a fixed bar starts eating the screen it sits on.
 *
 * The active state is carried three ways — a filled cobalt rule, a brighter
 * glyph, a heavier label — because a phone is used in sunlight, at arm's
 * length, by people whose colour vision is not a given.
 *
 * What keeps this from covering the page is not here but in the shell: `main`
 * reserves exactly this height as bottom padding. A fixed bar that overlaps
 * content is the most common way a mobile layout quietly loses its last row.
 */
export function HubMobileNav({ pathname }: { pathname: string }) {
  return (
    <nav
      // Only one of the two navs is in the accessibility tree at a time: the
      // other is `display: none` at this breakpoint, which removes it.
      aria-label="Principal"
      data-testid="hub-mobile-nav"
      style={{ height: 'calc(var(--hub-mobile-nav-height) + env(safe-area-inset-bottom))' }}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-panel)] pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.8)] md:hidden"
    >
      {MOBILE_DESTINATIONS.map((destination) => {
        const active = isActive(pathname, destination.href);
        return (
          <Link
            key={destination.href}
            href={destination.href}
            aria-current={active ? 'page' : undefined}
            data-active={active ? 'true' : 'false'}
            className={`relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 px-0.5 transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] motion-reduce:transition-none ${
              active
                ? 'text-[color:var(--wariba-text-primary)]'
                : 'text-[color:var(--wariba-text-tertiary)]'
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute inset-x-3 top-0 h-[2px] rounded-b-full ${
                active ? 'bg-[color:var(--warix-accent-cobalt)]' : 'bg-transparent'
              }`}
            />
            <span className="flex items-center justify-center">{destination.icon}</span>
            <span
              className={`max-w-full truncate text-[11px] leading-none ${
                active ? 'font-semibold' : 'font-medium'
              }`}
            >
              {destination.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
