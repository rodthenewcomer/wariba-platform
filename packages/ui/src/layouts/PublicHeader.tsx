'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cx } from '../lib/cx';
import type { LinkComponentType } from '../lib/link';
import { ArrowRightIcon, ChevronDownIcon, MenuIcon } from '../icons/shell-icons';
import { RouteGlyph } from '../signature/RouteGlyph';
import { NAV_FAMILIES, NAV_PARCOURS_LINKS, NAV_PRIMARY } from './public-nav';
import { PublicMobileMenu } from './PublicMobileMenu';

export interface PublicHeaderProps {
  LinkComponent: LinkComponentType;
  currentPath: string;
}

/**
 * The WARIBA public header — Phase 3.4.5A §20–§22.
 *
 * ## What it has to be
 *
 * The brief is blunt about the failure mode: a header must not look like
 * `logo | links | button` floating on a black line. Every competitor in the
 * benchmark treats the header as a commercial surface, and the difference is
 * not decoration — it is that the product families get a *menu*, not a link.
 *
 * So three things carry it. The bar itself gains depth on scroll rather than
 * being flat-transparent or flat-opaque. The active destination is marked by
 * light, not by a colour change. And `Parcours` opens a real panel where ONE,
 * FLEX and INSTANT each have a glyph, a tagline and a sentence.
 *
 * ## The transparent-at-top decision
 *
 * At scroll 0 the bar has no background and no border, so a hero's ambient
 * cobalt runs behind it and the page starts at the top of the screen rather
 * than 68px down. Past 8px it becomes frosted with a seam. This is the one
 * place in the system where glass is worth its cost: the alternative is either
 * a hard edge across every hero or an opaque band that makes every page start
 * with a horizontal rule.
 *
 * ## Interaction contract
 *
 * The mega-menu opens on click and on hover-with-intent, and closes on
 * Escape, on outside click, on route change and when focus leaves the panel.
 * Hover alone never opens it for keyboard or touch users, and the trigger is a
 * real `button` with `aria-expanded` — a `div` with a mouseenter handler is
 * how a menu becomes unreachable without a pointer.
 */
export function PublicHeader({ LinkComponent: Link, currentPath }: PublicHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [parcoursOpen, setParcoursOpen] = useState(false);
  const parcoursId = useId();
  const shellRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const hoverIntent = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Both surfaces close on navigation: without this, the panel covers the page
     it just took you to. */
  useEffect(() => {
    setParcoursOpen(false);
    setMenuOpen(false);
  }, [currentPath]);

  useEffect(() => {
    if (!parcoursOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setParcoursOpen(false);
      triggerRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) setParcoursOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [parcoursOpen]);

  const clearIntent = useCallback(() => {
    if (hoverIntent.current === null) return;
    window.clearTimeout(hoverIntent.current);
    hoverIntent.current = null;
  }, []);

  /* 120ms of intent before opening, 180ms of grace before closing: without the
     first, the panel flickers as the pointer crosses `Parcours` on its way to
     `WariX`; without the second, the diagonal from the trigger to the first
     card closes it mid-travel. */
  const openWithIntent = useCallback(() => {
    clearIntent();
    hoverIntent.current = window.setTimeout(() => setParcoursOpen(true), 120);
  }, [clearIntent]);

  const closeWithGrace = useCallback(() => {
    clearIntent();
    hoverIntent.current = window.setTimeout(() => setParcoursOpen(false), 180);
  }, [clearIntent]);

  useEffect(() => clearIntent, [clearIntent]);

  const isCurrent = (href: string) => currentPath === href || currentPath.startsWith(`${href}/`);
  const parcoursActive =
    currentPath.startsWith('/challenges') || currentPath.startsWith('/offres') || parcoursOpen;

  return (
    <header
      data-scrolled={scrolled ? 'true' : 'false'}
      className={cx(
        'sticky top-0 z-[var(--wariba-z-sticky)] border-b transition-colors',
        'duration-[var(--wariba-motion-state)]',
        scrolled || parcoursOpen
          ? 'border-[color:var(--wariba-seam)] bg-[color:var(--wariba-surface-overlay)] backdrop-blur-xl'
          : 'border-transparent bg-transparent',
      )}
    >
      <div
        ref={shellRef}
        onPointerLeave={closeWithGrace}
        className="mx-auto flex h-[var(--wariba-shell-header-height)] max-w-[var(--wariba-shell-max)] items-center justify-between gap-4 px-[var(--wariba-shell-gutter)]"
      >
        <Link
          href="/"
          className="wariba-focus-ring rounded-md text-[length:var(--wariba-font-size-heading-md)] font-bold tracking-[-0.03em] text-[color:var(--wariba-on-dark)]"
        >
          WARIBA
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          <button
            ref={triggerRef}
            type="button"
            aria-expanded={parcoursOpen}
            aria-controls={parcoursId}
            aria-haspopup="true"
            onClick={() => {
              clearIntent();
              setParcoursOpen((open) => !open);
            }}
            onPointerEnter={openWithIntent}
            className={cx(NAV_ITEM, parcoursActive ? NAV_ITEM_ON : NAV_ITEM_OFF)}
          >
            Parcours
            <ChevronDownIcon
              size="sm"
              className={cx(
                'transition-transform duration-[var(--wariba-motion-state)]',
                parcoursOpen && 'rotate-180',
              )}
            />
          </button>

          {/* The close-on-hover intent lives on the group, not on each link:
              `LinkComponentType` is a deliberately narrow contract (href,
              className, aria-current, prefetch) and widening it for one
              header's pointer behaviour would push that surface onto every
              consumer of the design system. */}
          <div className="flex items-center gap-1" onPointerEnter={closeWithGrace}>
            {NAV_PRIMARY.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isCurrent(item.href) ? 'page' : undefined}
                className={cx(NAV_ITEM, isCurrent(item.href) ? NAV_ITEM_ON : NAV_ITEM_OFF)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="wariba-focus-ring hidden rounded-md px-2 py-2 text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-on-dark-dim)] transition-colors hover:text-[color:var(--wariba-on-dark)] sm:inline-block"
          >
            Connexion
          </Link>
          <Link href="/inscription" className="wariba-cta-primary hidden h-11 sm:inline-flex">
            Commencer
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="wariba-mobile-menu"
            className="wariba-focus-ring flex size-11 items-center justify-center rounded-full border border-[color:var(--wariba-seam-strong)] text-[color:var(--wariba-on-dark)] lg:hidden"
          >
            <span className="sr-only">Ouvrir le menu</span>
            <MenuIcon size="sm" />
          </button>
        </div>
      </div>

      {/* ── Méga-menu Parcours ── */}
      <div
        id={parcoursId}
        hidden={!parcoursOpen}
        onPointerEnter={clearIntent}
        onPointerLeave={closeWithGrace}
        className="wariba-megamenu hidden border-t border-[color:var(--wariba-seam)] lg:block"
      >
        <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] py-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
            <ul className="grid gap-3 sm:grid-cols-3">
              {NAV_FAMILIES.map((family) => (
                <li key={family.href}>
                  <Link
                    href={family.href}
                    className="wariba-focus-ring group flex h-full flex-col rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-seam)] bg-[color:var(--wariba-surface-1)] p-4 shadow-[inset_0_1px_0_var(--wariba-inner-highlight)] transition-colors duration-[var(--wariba-motion-state)] hover:border-[color:var(--wariba-brand-edge)] hover:bg-[color:var(--wariba-surface-2)]"
                  >
                    <RouteGlyph family={family.family} />
                    <span className="mt-4 flex items-center gap-2 text-base font-semibold text-[color:var(--wariba-on-dark)]">
                      {family.label}
                      <ArrowRightIcon
                        size="sm"
                        className="opacity-0 transition-opacity duration-[var(--wariba-motion-state)] group-hover:opacity-100"
                      />
                    </span>
                    <span className="mt-0.5 text-[length:var(--wariba-font-size-label-md)] font-medium text-[color:var(--wariba-brand-300)]">
                      {family.tagline}
                    </span>
                    <span className="mt-2 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-dim)]">
                      {family.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="flex flex-col justify-between gap-6 rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-deep)] p-5">
              <div>
                <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
                  Pas encore décidé ?
                </p>
                <p className="mt-3 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
                  Les trois parcours partagent les mêmes règles de risque. Ce qui change, c’est
                  quand vous payez et si vous passez par une évaluation.
                </p>
              </div>
              <ul className="flex flex-col gap-2">
                {NAV_PARCOURS_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="wariba-focus-ring inline-flex min-h-11 items-center gap-2 rounded-md text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-brand-300)] transition-colors hover:text-[color:var(--wariba-brand-400)]"
                    >
                      {link.label}
                      <ArrowRightIcon size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <PublicMobileMenu
        LinkComponent={Link}
        currentPath={currentPath}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </header>
  );
}

const NAV_ITEM =
  'wariba-focus-ring relative inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[length:var(--wariba-font-size-body-sm)] font-medium transition-colors duration-[var(--wariba-motion-micro)]';

/* Active is light, not a different colour: a cobalt wash plus a hairline of
   brand along the bottom edge. It reads as the item being lit rather than
   recoloured, which is what keeps six nav items from looking like six states. */
const NAV_ITEM_ON =
  'bg-[color:var(--wariba-brand-wash)] text-[color:var(--wariba-on-dark)] shadow-[inset_0_-1px_0_var(--wariba-brand-400)]';
const NAV_ITEM_OFF =
  'text-[color:var(--wariba-on-dark-dim)] hover:bg-[color:var(--wariba-surface-1)] hover:text-[color:var(--wariba-on-dark)]';
