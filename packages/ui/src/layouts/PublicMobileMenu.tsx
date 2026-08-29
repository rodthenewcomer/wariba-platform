'use client';

import { useEffect, useRef } from 'react';
import { cx } from '../lib/cx';
import type { LinkComponentType } from '../lib/link';
import { ArrowRightIcon, ChevronRightIcon, CloseIcon } from '../icons/shell-icons';
import { RouteGlyph } from '../signature/RouteGlyph';
import { NAV_FAMILIES, NAV_PRIMARY } from './public-nav';

export interface PublicMobileMenuProps {
  LinkComponent: LinkComponentType;
  currentPath: string;
  open: boolean;
  onClose: () => void;
}

/**
 * The mobile navigation, as a scene — Phase 3.4.5A §23.
 *
 * ## Why this is not a dropdown
 *
 * What it replaces was a 256px `<details>` popover with 11px rows, and it was
 * the single most unfinished thing about WARIBA on a phone. Every reference in
 * the benchmark gives mobile navigation a full surface, because on mobile the
 * menu *is* the site's front door — more people will see this panel than will
 * see any hero.
 *
 * So it is full-screen, it carries the cobalt ambient field, and the three
 * families get the same glyph-and-tagline cards the desktop mega-menu uses.
 * The remaining destinations are 56px rows with a chevron. The primary action
 * sits at the bottom, in the thumb's reach, not at the top where it is
 * furthest from the hand.
 *
 * ## Focus
 *
 * A drawer that traps nothing is a drawer that hands the keyboard to the page
 * behind it. Focus moves to the close button on open, cycles inside the panel,
 * and returns to the trigger on close. The background is `inert`-equivalent by
 * virtue of the panel being fixed and full-screen with a scroll lock, and the
 * overlay button is labelled rather than being a bare `div` with a click
 * handler.
 */
export function PublicMobileMenu({
  LinkComponent: Link,
  currentPath,
  open,
  onClose,
}: PublicMobileMenuProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      restoreTo.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const isCurrent = (href: string) => currentPath === href || currentPath.startsWith(`${href}/`);

  return (
    <div className="fixed inset-0 z-[calc(var(--wariba-z-sticky)+10)] lg:hidden">
      {/*
       * The scrim is a pointer affordance, not a second close control.
       *
       * Labelled as "Fermer le menu" it became a duplicate of the real close
       * button, so the drawer announced two identically-named controls and a
       * screen-reader user had no way to tell which was which. It is hidden
       * from the accessibility tree and taken out of the tab order instead:
       * clicking outside still closes, and the accessible paths — Escape and
       * the labelled X — are unambiguous.
       */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-[color:rgb(0_0_0/0.65)] backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation WARIBA"
        id="wariba-mobile-menu"
        className="wariba-ambient-field wariba-drawer absolute inset-0 flex flex-col overflow-hidden bg-[color:var(--wariba-canvas-base)]"
      >
        <div className="flex h-[var(--wariba-shell-header-height)] shrink-0 items-center justify-between px-[var(--wariba-shell-gutter)]">
          <span className="text-[length:var(--wariba-font-size-heading-md)] font-bold tracking-[-0.03em] text-[color:var(--wariba-on-dark)]">
            WARIBA
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="wariba-focus-ring flex size-11 items-center justify-center rounded-full border border-[color:var(--wariba-seam-strong)] text-[color:var(--wariba-on-dark)]"
          >
            <span className="sr-only">Fermer le menu</span>
            <CloseIcon size="sm" />
          </button>
        </div>
        {/*
         * `min-h-0` is load-bearing.
         *
         * A flex item defaults to `min-height: auto`, so this column refuses to
         * shrink below its content and pushes the footer out of the panel
         * instead of scrolling. Without it the three-part drawer silently
         * degrades back into one long overflowing page.
         */}
        <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-[var(--wariba-shell-gutter)] pt-2 pb-6">
          <section aria-label="Parcours">
            <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
              Parcours
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {NAV_FAMILIES.map((family, index) => (
                <li
                  key={family.href}
                  style={{ ['--wariba-reveal-delay' as string]: `${index * 50}ms` }}
                  data-reveal=""
                >
                  <Link
                    href={family.href}
                    className="wariba-focus-ring flex items-center gap-4 rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-seam)] bg-[color:var(--wariba-surface-1)] p-4 shadow-[inset_0_1px_0_var(--wariba-inner-highlight)]"
                  >
                    <RouteGlyph family={family.family} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-semibold text-[color:var(--wariba-on-dark)]">
                        {family.label}
                      </span>
                      <span className="block text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-brand-300)]">
                        {family.tagline}
                      </span>
                    </span>
                    <ChevronRightIcon
                      size="sm"
                      className="text-[color:var(--wariba-on-dark-dim)]"
                    />
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/offres"
              className="wariba-focus-ring mt-4 inline-flex min-h-11 items-center gap-2 rounded-md text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-brand-300)]"
            >
              Comparer les 15 offres
              <ArrowRightIcon size="sm" />
            </Link>
          </section>

          <nav aria-label="Navigation mobile">
            <ul className="flex flex-col">
              {NAV_PRIMARY.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isCurrent(item.href) ? 'page' : undefined}
                    className={cx(
                      'wariba-focus-ring flex min-h-[56px] items-center justify-between gap-3 border-b border-[color:var(--wariba-seam)] text-lg font-medium',
                      isCurrent(item.href)
                        ? 'text-[color:var(--wariba-on-dark)]'
                        : 'text-[color:var(--wariba-on-dark-muted)]',
                    )}
                  >
                    {item.label}
                    <ChevronRightIcon
                      size="sm"
                      className="text-[color:var(--wariba-on-dark-dim)]"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        {/*
         * The actions are a fixed footer, not a sticky child.
         *
         * `position: sticky` was tried first and does nothing here: a sticky
         * element only travels inside its own parent's box, and that parent was
         * exactly as tall as its content, so there was no room to stick.
         * `Commencer` measured 27px below an 844px viewport and 375px below a
         * 320px one — the single action this panel exists to offer, off-screen.
         *
         * A three-part column — fixed header, scrolling middle, fixed footer —
         * is the shape that holds. Only the middle scrolls, so the CTA stays in
         * the thumb's reach at every scroll position and every height.
         */}
        <div className="shrink-0 border-t border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-base)] px-[var(--wariba-shell-gutter)] pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-3">
            <Link href="/inscription" className="wariba-cta-primary w-full">
              Commencer
            </Link>
            <Link href="/login" className="wariba-cta-secondary w-full">
              Connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
