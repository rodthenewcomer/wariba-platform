'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useHydratedReducedMotion } from '../motion/useHydratedReducedMotion';
import { AccountToken, CheckIcon } from '@wariba/ui';
import type { CanonicalOfferReadModel } from '@wariba/application';
import { trackCommerceEvent } from './commerce-analytics';
import { announceOfferSelected, onOfferSelectionRequested } from './offer-selection-events';
import {
  checkoutHref,
  FAMILY_ACCENT_VARS,
  FAMILY_META,
  FAMILY_ORDER,
  formatXof,
  offerByIdentity,
} from './offer-ui';
import { buildSpecs, type DisplayMode } from './rule-specs';
import { ViewToolbar, type ViewMode } from './ViewToolbar';
import { RuleSurface } from './RuleSurface';
import { CompareMatrix } from './CompareMatrix';
import { DecisionCard } from './DecisionCard';

interface OfferConfiguratorProps {
  offers: readonly CanonicalOfferReadModel[];
  sandboxCheckoutAvailable: boolean;
  initialFamily?: CanonicalOfferReadModel['productFamily'];
  compact?: boolean;
}

const FAMILY_TOKEN = {
  WARIBA_ONE: 'one',
  WARIBA_FLEX: 'flex',
  WARIBA_INSTANT: 'instant',
} as const;

function preferredOffer(
  offers: readonly CanonicalOfferReadModel[],
  requested: string | null,
  initialFamily: CanonicalOfferReadModel['productFamily'],
): CanonicalOfferReadModel {
  return (
    offerByIdentity(offers, requested) ??
    offers.find((offer) => offer.productFamily === initialFamily && offer.sizeCode === '10K') ??
    offers[0]!
  );
}

/**
 * The offer configurator — the Decision Engine, V2.
 *
 * ## What changed from V1
 *
 * V1 resolved one flat rule list per selection. This version splits it into
 * two layers — Evaluation-relevant rules always visible, Performance rules
 * (buffer, exposure, days, payout split) behind one collapsible control
 * (`RuleSurface`) — and adds a toolbar (`ViewToolbar`) for two independent
 * *display* preferences that never touch canonical data: percent vs. a
 * nominal-derived amount (`rule-specs.ts`'s `buildSpecs`), and a single
 * selected offer vs. a five-size comparison of the active family
 * (`CompareMatrix`). The canonical selection engine below — `useState` +
 * `history.replaceState`, the roving-radio family/size groups, the
 * `v2-offer-configurator`/`data-offer-id`/`data-hydrated` test contract —
 * is unchanged; `tests/e2e/commerce-v2.spec.ts` exercises it directly.
 *
 * ## The plate
 *
 * The account object cross-fades while the frame around it holds still —
 * the same law the whole product runs on, applied to a radio group: the
 * container never moves, the thing inside it does.
 *
 * ## Mobile
 *
 * The rail becomes a fixed pay bar carrying the amount and the action, with
 * the resolved rules stacked above it. For FLEX the bar carries *both*
 * amounts — the one thing that page is never allowed to hide.
 */
export function OfferConfigurator({
  offers,
  sandboxCheckoutAvailable,
  initialFamily = 'WARIBA_ONE',
  compact = false,
}: OfferConfiguratorProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reduced = useHydratedReducedMotion();

  /*
   * Selection is client state, and the URL follows it.
   *
   * It used to be the other way round: every click called `router.replace`
   * and the component re-derived itself from `useSearchParams`. That is a
   * server round trip to change a radio button — this page is `force-dynamic`,
   * so each size click refetched the whole route — and in a production build
   * it did not even work: the RSC request fired, the navigation never
   * committed, and the selection silently stayed where it was. Fine in dev,
   * broken in `next start`, which is the build the evidence is taken from.
   *
   * The component already holds all fifteen offers. It needs the server for
   * nothing here. So selection is `useState`, and the address bar is updated
   * with `history.replaceState` — no navigation, no refetch, and the link
   * stays exactly as shareable as before because the server still reads
   * `?offre=` on first load.
   */
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('offre'));
  const selected = preferredOffer(offers, selectedId, initialFamily);
  const familyMeta = FAMILY_META[selected.productFamily];
  const familyOffers = useMemo(
    () => offers.filter((offer) => offer.productFamily === selected.productFamily),
    [offers, selected.productFamily],
  );

  /*
   * The matrix — every size, every rule, the active column boxed — is the
   * landing state, not a second click away. `selected` stays available for
   * a focused single-account read (and is what the mobile pay bar's
   * copy assumes), but a visitor arrives on the same full comparison a
   * FundedNext-style pricing table opens on.
   */
  const [viewMode, setViewMode] = useState<ViewMode>('compare');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('percent');
  const [performanceExpanded, setPerformanceExpanded] = useState(false);

  const { primary, performance } = useMemo(
    () => buildSpecs(selected, displayMode),
    [selected, displayMode],
  );
  const allSpecs = useMemo(() => [...primary, ...performance], [primary, performance]);

  /*
   * Which pills just changed.
   *
   * Held in a ref rather than derived from props, because the comparison has
   * to be against the *previously rendered* offer, and a ref is the only thing
   * that survives the render that replaces it. First paint flashes nothing —
   * a page that lights up on arrival is claiming a change that did not happen.
   */
  const previousSpecs = useRef<Map<string, string> | null>(null);
  const [flashed, setFlashed] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const current = new Map(allSpecs.map((spec) => [spec.key, spec.value]));
    const previous = previousSpecs.current;
    previousSpecs.current = current;
    if (!previous || reduced) return;

    const changed = new Set<string>();
    current.forEach((value, key) => {
      if (previous.get(key) !== value) changed.add(key);
    });
    if (changed.size === 0) return;
    setFlashed(changed);
    const timer = window.setTimeout(() => setFlashed(new Set()), 460);
    return () => window.clearTimeout(timer);
  }, [allSpecs, reduced]);

  /*
   * A hydration signal, for tests and for nothing else.
   *
   * Every control here is server-rendered and therefore *enabled* before React
   * has attached a single handler. Playwright's auto-wait is satisfied by an
   * enabled button, so a click that lands in that window is swallowed in
   * silence and the assertion that follows fails for a reason the trace cannot
   * show. The keyboard contract test failed exactly this way on a cold compile.
   *
   * The attribute is inert — no styling, no behaviour, invisible to assistive
   * technology — and it lets a test wait for the thing it actually depends on
   * instead of a timeout it has to guess.
   */
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  /*
   * Whether the visitor has scrolled past this whole section, watched from
   * inside it — the mirror of `StickyConversionDock`'s own observer on the
   * same `#configurator-end` sentinel. `.commerce-compare-dock` below is
   * `position: fixed`, so without this it would stay visible in Compare
   * mode no matter how far down the page the visitor scrolls, including
   * alongside `StickyConversionDock` once that dock's own trigger fires —
   * two bottom-fixed CTAs at once. Gating this section's own dock on "still
   * inside the section" makes the two mutually exclusive by construction
   * rather than by tuning two independent thresholds to agree.
   */
  const configuratorEndRef = useRef<HTMLDivElement>(null);
  const [scrolledPastConfigurator, setScrolledPastConfigurator] = useState(false);
  useEffect(() => {
    const target = configuratorEndRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setScrolledPastConfigurator(entry.boundingClientRect.top < 0 && !entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const attribution = {
    utmSource: searchParams.get('utm_source')?.slice(0, 80),
    utmCampaign: searchParams.get('utm_campaign')?.slice(0, 80),
  };

  useEffect(() => {
    trackCommerceEvent('commerce_catalog_viewed', {
      offerId: selected.offerId,
      source: pathname,
      ...(attribution.utmSource && { utmSource: attribution.utmSource }),
      ...(attribution.utmCampaign && { utmCampaign: attribution.utmCampaign }),
    });
    announceOfferSelected(selected.offerId);
  }, [pathname, selected.offerId]);

  /*
   * Other page sections (fast-path rail, decision-assist) may request a
   * selection on this engine's behalf — routed through the same
   * `selectOffer` as a direct click, so URL sync, analytics and the
   * spec-flash animation stay in this one place. See
   * `offer-selection-events.ts` for why this is an event, not lifted state.
   */
  useEffect(
    () =>
      onOfferSelectionRequested((offerId) => {
        const target = offerByIdentity(offers, offerId);
        if (target) selectOffer(target, 'family');
      }),
    [offers, selected.offerId],
  );

  const selectOffer = (offer: CanonicalOfferReadModel, event: 'family' | 'size') => {
    /*
     * Selecting what is already selected does nothing.
     *
     * Not a micro-optimisation — a correctness fix. `router.replace` to the
     * current URL still starts a navigation, and a keystroke arriving while
     * that one is in flight has its own `replace` discarded: the roving-radio
     * contract failed exactly here, because the test clicks the already-active
     * family before pressing an arrow. A redundant selection is also not an
     * analytics event; nothing was selected.
     */
    if (offer.offerId === selected.offerId) return;

    setSelectedId(offer.offerId);

    /* The address bar catches up without a navigation, so the selection is
       still restorable and still shareable — UTM parameters included. */
    const next = new URLSearchParams(window.location.search);
    next.set('offre', offer.offerId);
    window.history.replaceState(null, '', `${pathname}?${next.toString()}`);
    trackCommerceEvent(event === 'family' ? 'commerce_family_selected' : 'commerce_size_selected', {
      offerId: offer.offerId,
      source: pathname,
      ...(attribution.utmSource && { utmSource: attribution.utmSource }),
      ...(attribution.utmCampaign && { utmCampaign: attribution.utmCampaign }),
    });
  };

  const handleDisplayModeChange = (mode: DisplayMode) => {
    if (mode === displayMode) return;
    setDisplayMode(mode);
    trackCommerceEvent('commerce_display_mode_changed', { offerId: selected.offerId, mode });
  };

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === viewMode) return;
    setViewMode(mode);
    trackCommerceEvent('commerce_view_mode_changed', { offerId: selected.offerId, mode });
  };

  const handleTogglePerformance = () => {
    const next = !performanceExpanded;
    setPerformanceExpanded(next);
    trackCommerceEvent(
      next ? 'commerce_performance_rules_expanded' : 'commerce_performance_rules_collapsed',
      { offerId: selected.offerId },
    );
  };

  const moveRadioSelection = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
    choices: readonly CanonicalOfferReadModel[],
    selectionKind: 'family' | 'size',
  ) => {
    let nextIndex: number | undefined;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % choices.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + choices.length) % choices.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = choices.length - 1;
        break;
      default:
        return;
    }

    const nextOffer = choices[nextIndex];
    if (!nextOffer) return;
    event.preventDefault();
    selectOffer(nextOffer, selectionKind);
    const radios =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    radios?.[nextIndex]?.focus();
  };

  const familyChoices = FAMILY_ORDER.map(
    (family) =>
      offers.find(
        (offer) => offer.productFamily === family && offer.sizeCode === selected.sizeCode,
      ) ?? offers.find((offer) => offer.productFamily === family)!,
  );

  return (
    <section
      aria-labelledby="configurator-title"
      className={compact ? 'py-14 sm:py-16' : 'py-20 lg:py-28'}
      data-testid="v2-offer-configurator"
      data-offer-id={selected.offerId}
      data-hydrated={hydrated ? 'true' : 'false'}
      /*
       * Every commerce surface below reads its colour from `--commerce-
       * accent*`, not a hardcoded value — see `FAMILY_ACCENT_VARS`'s own
       * comment. Overriding those six custom properties here re-colours the
       * family tabs, size chips, the accent-toned spec pill, the primary
       * CTA and the compare matrix's selected column together, in the same
       * copper/cobalt/cyan language the hero's three monoliths already use,
       * with a transition so the switch reads as a colour change rather
       * than a flicker.
       */
      style={{
        ...FAMILY_ACCENT_VARS[selected.productFamily],
        transition: reduced ? undefined : 'color 200ms ease, border-color 200ms ease',
      }}
    >
      <div className="commerce-shell">
        <div className="max-w-3xl">
          <p className="commerce-kicker">Votre configuration</p>
          <h2 id="configurator-title" className="commerce-section-title mt-5 scroll-mt-24">
            Configurez votre compte. Le prix et les règles suivent.
          </h2>
          <p className="commerce-lead mt-5">
            Passez de ONE à FLEX ou INSTANT, comparez les tailles et affichez vos limites en
            pourcentage ou en montant.
          </p>
        </div>

        {/* ── Parcours ── */}
        <div className="mt-10 grid gap-3 lg:grid-cols-3" role="radiogroup" aria-label="Parcours">
          {FAMILY_ORDER.map((family, index) => {
            const meta = FAMILY_META[family];
            const familyOffer = familyChoices[index]!;
            const active = family === selected.productFamily;
            return (
              <button
                key={family}
                type="button"
                role="radio"
                aria-label={`${meta.short} — ${meta.tabHeadline}`}
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => selectOffer(familyOffer, 'family')}
                onKeyDown={(event) => moveRadioSelection(event, index, familyChoices, 'family')}
                className="commerce-choice min-h-24 text-left"
                data-active={active ? 'true' : 'false'}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="commerce-choice-index">{meta.short}</span>
                  {active ? (
                    <span
                      className="flex size-5 items-center justify-center rounded-full text-white"
                      style={{ background: 'var(--commerce-accent)' }}
                    >
                      <CheckIcon size="sm" className="size-3" />
                    </span>
                  ) : null}
                </span>
                <span className="mt-2.5 block text-base font-semibold text-[color:var(--wariba-color-ink-50)]">
                  {meta.tabHeadline}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-[color:var(--wariba-color-ink-300)]">
                  {meta.tabLifecycle}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Taille ──
             Compare mode's own column headers are the size selector — a
             second row of pills here would just be the same radiogroup
             rendered twice. Only the focused single-account view needs it. */}
        {viewMode === 'selected' ? (
          <div className="mt-8">
            <p className="text-sm font-semibold text-[color:var(--wariba-color-ink-200)]">
              Taille du compte simulé
            </p>
            {/* Size + price in one object, not a bare filter pill — see
                `.commerce-size-tile`'s own comment in globals.css. */}
            <div className="mt-3 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Taille">
              {familyOffers.map((offer, index) => {
                const active = offer.offerId === selected.offerId;
                return (
                  <button
                    key={offer.offerId}
                    type="button"
                    role="radio"
                    aria-label={`Taille ${offer.sizeCode}, ${formatXof(offer.upfrontPrice)}${offer.productFamily === 'WARIBA_FLEX' ? ' aujourd’hui' : ''}`}
                    aria-checked={active}
                    tabIndex={active ? 0 : -1}
                    onClick={() => selectOffer(offer, 'size')}
                    onKeyDown={(event) => moveRadioSelection(event, index, familyOffers, 'size')}
                    className="commerce-size-tile"
                    data-active={active ? 'true' : 'false'}
                  >
                    <span className="commerce-size-tile-label">{offer.sizeCode}</span>
                    <span className="commerce-size-tile-price">{formatXof(offer.upfrontPrice)}</span>
                    {offer.productFamily === 'WARIBA_FLEX' ? (
                      <span className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[color:var(--wariba-color-ink-300)]">
                        aujourd’hui
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* ── Barre d'outils ── */}
        <div className="mt-8">
          <ViewToolbar
            displayMode={displayMode}
            onDisplayModeChange={handleDisplayModeChange}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />
        </div>

        {/* ── Résumé ──
             Selected keeps the two-column grid (rules + sticky Decision
             Card) — that architecture is accepted, unchanged. Compare drops
             the Decision Card entirely: a comparison table competing with a
             sidebar for width is a worse comparison table, and the matrix's
             own per-column CTAs plus the compare dock below now carry that
             job instead. */}
        {viewMode === 'selected' ? (
          <div className="commerce-summary mt-6">
            <div className="commerce-summary-main">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="min-w-0">
                  <p className="commerce-choice-index">
                    WARIBA {familyMeta.short} · {selected.sizeCode}
                  </p>
                  <h3 className="mt-3 max-w-lg text-2xl font-semibold tracking-[-0.03em] text-[color:var(--wariba-color-ink-50)] sm:text-3xl">
                    {familyMeta.title}
                  </h3>
                </div>

                {/* The frame is fixed; only the plate inside it changes. */}
                <div className="relative h-[105px] w-[140px] shrink-0">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`${selected.productFamily}-${selected.sizeCode}`}
                      initial={reduced ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: reduced ? 1 : 0 }}
                      transition={{ duration: reduced ? 0 : 0.18, ease: [0.2, 0, 0, 1] }}
                      className="absolute inset-0"
                    >
                      <AccountToken
                        sizeCode={selected.sizeCode}
                        family={FAMILY_TOKEN[selected.productFamily]}
                        width={140}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-8">
                <RuleSurface
                  offer={selected}
                  primary={primary}
                  performance={performance}
                  flashed={flashed}
                  performanceExpanded={performanceExpanded}
                  onTogglePerformance={handleTogglePerformance}
                  reduced={reduced}
                />
              </div>

              <p className="mt-6 text-xs leading-relaxed text-[color:var(--wariba-color-ink-300)]">
                Règles version {selected.policySemanticVersion} · fixées le jour de l’achat, elles ne
                changent plus.
              </p>
            </div>

            <DecisionCard
              selected={selected}
              familyMeta={familyMeta}
              sandboxCheckoutAvailable={sandboxCheckoutAvailable}
              pathname={pathname}
            />
          </div>
        ) : (
          <div className="commerce-panel mt-6 p-6 pb-24 lg:p-8 lg:pb-28">
            <p className="commerce-choice-index">WARIBA {familyMeta.short}</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--wariba-color-ink-50)] sm:text-3xl">
              Comparez les cinq tailles.
            </h3>
            <div className="mt-8">
              <CompareMatrix
                familyOffers={familyOffers}
                familyShort={familyMeta.short}
                displayMode={displayMode}
                selectedOfferId={selected.offerId}
                onSelectSize={(offer) => selectOffer(offer, 'size')}
                performanceExpanded={performanceExpanded}
                onTogglePerformance={handleTogglePerformance}
                reduced={reduced}
                sandboxCheckoutAvailable={sandboxCheckoutAvailable}
                pathname={pathname}
              />
            </div>
          </div>
        )}
      </div>

      {/*
       * The page-level `StickyConversionDock` (further down `/offres`)
       * shows once the Decision Engine has scrolled past — it used to watch
       * the section's own `<h2>`, which broke the moment Compare mode's
       * full-width matrix made the section taller than one screen: the
       * title left the viewport while the visitor was still inside the
       * section, in the middle of this section's own `.commerce-compare-
       * dock`, and both bottom-fixed docks showed at once. This sentinel is
       * the section's true end in normal document flow (the two docks
       * above are `position: fixed` and do not affect it), so "past" now
       * means past all of it, in either view mode.
       */}
      <div id="configurator-end" ref={configuratorEndRef} aria-hidden="true" />

      {/* ── Barre d'achat mobile ──
           Covers 0–1023px in both view modes. */}
      <div className="commerce-mobile-paybar" data-testid="commerce-paybar">
        <DockCta
          selected={selected}
          familyMeta={familyMeta}
          sandboxCheckoutAvailable={sandboxCheckoutAvailable}
          pathname={pathname}
          ctaLocation="sticky_dock"
        />
      </div>

      {/* ── Dock de comparaison desktop ──
           Compare mode's own replacement for the Decision Card it drops —
           1024px and up only; the mobile bar above already covers every
           narrower width in both modes. See `.commerce-compare-dock`'s own
           comment in globals.css. Gated on still being inside the section so
           it and `StickyConversionDock` further down the page never show at
           once — see `scrolledPastConfigurator`'s own comment. */}
      {viewMode === 'compare' && !scrolledPastConfigurator ? (
        <div className="commerce-compare-dock" data-testid="commerce-compare-dock">
          <DockCta
            selected={selected}
            familyMeta={familyMeta}
            sandboxCheckoutAvailable={sandboxCheckoutAvailable}
            pathname={pathname}
            ctaLocation="sticky_dock"
          />
        </div>
      ) : null}
    </section>
  );
}

/** Shared by the mobile pay bar (always mounted, 0–1023px) and the desktop
    compare dock (1024px+, compare mode only) — one place for the current
    selection's price/CTA so the two never drift. */
function DockCta({
  selected,
  familyMeta,
  sandboxCheckoutAvailable,
  pathname,
  ctaLocation,
}: {
  selected: CanonicalOfferReadModel;
  familyMeta: (typeof FAMILY_META)[keyof typeof FAMILY_META];
  sandboxCheckoutAvailable: boolean;
  pathname: string;
  ctaLocation: string;
}) {
  return (
    <>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--wariba-color-ink-300)]">
          {familyMeta.short} · {selected.sizeCode}
          {selected.productFamily === 'WARIBA_FLEX' ? ' · aujourd’hui' : ''}
        </p>
        <p className="truncate font-mono text-lg font-bold tabular-nums text-[color:var(--wariba-accent-emerald)]">
          {formatXof(selected.upfrontPrice)}
        </p>
        {selected.productFamily === 'WARIBA_FLEX' ? (
          <p className="truncate font-mono text-[11px] tabular-nums text-[color:var(--wariba-accent-emerald)]">
            puis {formatXof(selected.activationPrice)} après réussite
          </p>
        ) : null}
      </div>
      {sandboxCheckoutAvailable ? (
        <Link
          href={checkoutHref(selected)}
          onClick={() =>
            trackCommerceEvent('commerce_checkout_started', {
              offerId: selected.offerId,
              source: pathname,
              ctaLocation,
            })
          }
          className="commerce-primary-action shrink-0"
        >
          Continuer
        </Link>
      ) : (
        <button type="button" disabled className="commerce-primary-action shrink-0">
          Bientôt
        </button>
      )}
    </>
  );
}
