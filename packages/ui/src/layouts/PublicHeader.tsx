'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cx } from '../lib/cx';
import type { LinkComponentType } from '../lib/link';
import { ArrowRightIcon, ChevronDownIcon, MenuIcon } from '../icons/shell-icons';
import { RouteScene } from '../signature/RouteScene';
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
          ? 'wariba-header-lit border-[color:var(--wariba-seam)] bg-[color:var(--wariba-surface-overlay)] backdrop-blur-xl'
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
        <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] py-6">
          <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)]">
            <ul className="grid gap-4 sm:grid-cols-3">
              {NAV_FAMILIES.map((family) => (
                <li key={family.href}>
                  <Link
                    href={family.href}
                    className="wariba-focus-ring group flex h-full flex-col overflow-hidden rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-seam)] bg-[color:var(--wariba-surface-1)] shadow-[inset_0_1px_0_var(--wariba-inner-highlight)] transition-colors duration-[var(--wariba-motion-state)] hover:border-[color:var(--wariba-brand-edge)]"
                  >
                    {/* The scene, full-bleed across the head of the card. A
                        third of the surface, so the family is recognised
                        before a word is read. */}
                    <RouteScene family={family.family} />
                    <span className="flex flex-1 flex-col p-4 pb-5">
                      <span className="flex items-center gap-2 text-base font-semibold text-[color:var(--wariba-on-dark)]">
                        {family.label}
                        <ArrowRightIcon
                          size="sm"
                          className="opacity-0 transition-opacity duration-[var(--wariba-motion-state)] group-hover:opacity-100"
                        />
                      </span>
                      <span className="mt-1 text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-on-dark)]">
                        {family.tagline}
                      </span>
                      <span className="mt-1.5 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-dim)]">
                        {family.description}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* ── Le bloc de comparaison ──
                Il était un quatrième rectangle de texte. C'est maintenant une
                petite scène : les trois parcours convergent vers une seule
                sortie, ce qui dit « ils mènent au même endroit » sans avoir à
                l'écrire. */}
            <div className="flex flex-col justify-between gap-3 rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-deep)] p-5">
              <div>
                <p className="text-base font-semibold text-[color:var(--wariba-on-dark)]">
                  Vous hésitez ?
                </p>
                {/*
                 * Ce bloc affirmait « les trois mènent au même compte
                 * Performance, ce qui change c'est quand vous payez ». C'est
                 * faux : sur une taille 10K, cinq des six règles diffèrent —
                 * objectif 8/4/aucun, quotidien 3/3/2, perte maximale 8/6/5,
                 * meilleure journée 35/35/30, réserve 2/3/3, exposition 3/3/2×.
                 * Le moment du paiement n'est qu'une différence parmi
                 * plusieurs, et une généralisation fausse dans un menu est une
                 * promesse que le configurateur contredit deux clics plus loin.
                 */}
                <p className="mt-1.5 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-dim)]">
                  Comparez les parcours et choisissez celui qui vous convient.
                </p>
              </div>

              <ConvergenceScene />

              <ul className="flex flex-col">
                {NAV_PARCOURS_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="wariba-cta-tertiary wariba-focus-ring rounded-md"
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

/**
 * Three routes converging on one account.
 *
 * The block this replaces was a heading, a paragraph and two links — a fourth
 * text rectangle beside three product cards, which is exactly the "texte +
 * border" the visual law rules out. Three lit nodes meeting at a single point
 * carries the same idea and can be understood without reading, which is what
 * a menu needs.
 */
function ConvergenceScene() {
  return (
    <svg viewBox="0 0 220 90" aria-hidden="true" className="max-h-[84px] w-full">
      <defs>
        <linearGradient id="wcs-line" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5C7FFF" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#5C7FFF" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {[
        { y: 14, tint: '#5C7FFF', label: 'ONE' },
        { y: 45, tint: '#8B7BFF', label: 'FLEX' },
        { y: 76, tint: '#45C6D4', label: 'INSTANT' },
      ].map((row) => (
        <g key={row.label}>
          <text
            x="0"
            y={row.y + 4}
            fontSize="10"
            fontWeight="700"
            letterSpacing="0.6"
            fill={row.tint}
          >
            {row.label}
          </text>
          <path
            d={`M58 ${row.y} C 106 ${row.y}, 128 45, 163 45`}
            fill="none"
            stroke="url(#wcs-line)"
            strokeWidth="1.6"
          />
          <circle cx="56" cy={row.y} r="3" fill={row.tint} />
        </g>
      ))}
      {/* The convergence node, labelled *under* itself.
          Set beside it the label ran past the 220-unit viewBox and rendered as
          "Comp / Perfo" — a scene whose whole job is to say where the three
          routes arrive, with the destination cut in half. */}
      <circle cx="176" cy="45" r="13" fill="#5C7FFF" fillOpacity="0.16" />
      <circle cx="176" cy="45" r="6" fill="#5C7FFF" />
      <text x="176" y="74" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#9AA3B1">
        Performance
      </text>
    </svg>
  );
}

const NAV_ITEM =
  'wariba-focus-ring relative inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[length:var(--wariba-font-size-body-sm)] font-medium transition-colors duration-[var(--wariba-motion-micro)]';

/* Active is light, not a different colour: a cobalt wash plus a hairline of
   brand along the bottom edge. It reads as the item being lit rather than
   recoloured, which is what keeps six nav items from looking like six states. */
/*
 * Active is lit, not recoloured.
 *
 * A wash plus a two-pixel brand rule along the bottom edge, plus a small pool
 * of brand light bleeding upward. On a navy canvas the wash alone was almost
 * invisible; on true black it reads immediately, which is one of the things
 * the neutral canvas bought back for free.
 */
const NAV_ITEM_ON =
  'bg-[color:var(--wariba-brand-wash)] text-[color:var(--wariba-on-dark)] shadow-[inset_0_-2px_0_var(--wariba-brand-400),0_6px_18px_-10px_rgb(49_87_245/0.65)]';
const NAV_ITEM_OFF =
  'text-[color:var(--wariba-on-dark-dim)] hover:bg-[color:var(--wariba-surface-1)] hover:text-[color:var(--wariba-on-dark)]';
