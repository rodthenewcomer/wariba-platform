'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AccountToken, ArrowRightIcon, CheckIcon } from '@wariba/ui';
import type { CanonicalOfferReadModel } from '@wariba/application';
import { trackCommerceEvent } from './commerce-analytics';
import {
  checkoutHref,
  FAMILY_META,
  FAMILY_ORDER,
  formatMultiple,
  formatNominal,
  formatRate,
  formatXof,
  offerByIdentity,
  xofParts,
} from './offer-ui';

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
 * A specification line, resolved.
 *
 * `tone` carries meaning, not decoration: the accent marks the figure that
 * defines the product (the target, or the entry rule for INSTANT), red marks
 * the one that ends an account. Everything else stays neutral, because six
 * coloured pills in a column is a palette, not a language.
 */
interface Spec {
  key: string;
  label: string;
  value: string;
  tone?: 'accent' | 'emerald' | 'amber';
  /** A list rather than a figure — allowed to wrap on a narrow screen. */
  wrap?: true;
}

function specsFor(offer: CanonicalOfferReadModel): Spec[] {
  const evaluation = offer.evaluationRules;
  const performance = offer.performanceRules;
  return [
    { key: 'nominal', label: 'Compte simulé', value: formatNominal(offer.nominalBalance) },
    {
      key: 'entry',
      label: 'Départ',
      value: offer.entryPhase === 'evaluation' ? 'Évaluation' : 'Performance directe',
      /* INSTANT's defining fact is that it starts in Performance, so that is
         the line that carries the accent for it. ONE and FLEX spend their
         accent on the target instead. */
      ...(offer.entryPhase === 'performance' ? { tone: 'accent' as const } : {}),
    },
    ...(evaluation
      ? [
          {
            key: 'target',
            label: 'Objectif de performance',
            value: formatRate(evaluation.profitTargetRate),
            tone: 'accent' as const,
          },
        ]
      : []),
    {
      key: 'daily',
      label: 'Limite quotidienne',
      value: formatRate(evaluation?.dailyLossRate ?? performance.dailyLossRate),
    },
    {
      key: 'maxloss',
      label: 'Perte maximale',
      value: formatRate(evaluation?.maximumLossRate ?? performance.maximumLossRate),
    },
    {
      key: 'bestday',
      label: 'Meilleure journée',
      value: formatRate(evaluation?.bestDayMaximumRate ?? performance.bestDayMaximumRate),
    },
    {
      key: 'reserve',
      label: 'Réserve de sécurité',
      value: formatRate(performance.permanentBufferRate),
    },
    {
      key: 'exposure',
      label: 'Exposition totale',
      value: formatMultiple(performance.grossExposureMaximumMultiple),
    },
    {
      key: 'days',
      label: 'Journées Performance',
      value: `${performance.performanceDaysRequired}`,
    },
    {
      key: 'split',
      label: 'Part conservée',
      value: performance.payoutSplitSchedule.map((share) => formatRate(share)).join(' · '),
      tone: 'emerald',
      wrap: true,
    },
  ];
}

/**
 * The offer configurator — 3.4.5R §22.2.
 *
 * ## What changed
 *
 * The old version showed three specs and a price. You picked a product, then
 * went somewhere else to find out what its rules were — which is precisely
 * backwards, because the rules *are* the product.
 *
 * This one resolves the full rule set as you choose, in a rail that stays with
 * you (references 29, 48). Ten lines, each one a label and a pill, updating on
 * every click. A value that changed since the last selection flashes its role
 * colour for 420ms and then settles — so a trader comparing 25K to 50K can see
 * *which* numbers moved without diffing two screens from memory.
 *
 * ## The plate
 *
 * The account object cross-fades while the frame around it holds still. That
 * is the same law the whole product runs on, applied to a radio group: the
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
  const reduced = useReducedMotion();

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
  const specs = useMemo(() => specsFor(selected), [selected]);

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
    const current = new Map(specs.map((spec) => [spec.key, spec.value]));
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
  }, [specs, reduced]);

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
  }, [pathname, selected.offerId]);

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

  const isFlex = selected.productFamily === 'WARIBA_FLEX';

  return (
    <section
      aria-labelledby="configurator-title"
      className={compact ? 'py-14 sm:py-16' : 'py-20 lg:py-28'}
      data-testid="v2-offer-configurator"
      data-offer-id={selected.offerId}
      data-hydrated={hydrated ? 'true' : 'false'}
    >
      <div className="commerce-shell">
        <div className="max-w-3xl">
          <p className="commerce-kicker">Configurez votre parcours</p>
          <h2 id="configurator-title" className="commerce-section-title mt-5">
            Choisissez. Les règles se résolvent devant vous.
          </h2>
          <p className="commerce-lead mt-5">
            Les prix et les limites affichés viennent de la version exacte que votre compte
            conservera. Rien n’est recalculé côté navigateur.
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
                aria-label={`${meta.short} — ${meta.eyebrow}`}
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => selectOffer(familyOffer, 'family')}
                onKeyDown={(event) => moveRadioSelection(event, index, familyChoices, 'family')}
                className="commerce-choice min-h-32 text-left"
                data-active={active ? 'true' : 'false'}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="commerce-choice-index">{meta.short}</span>
                  {active ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-[color:var(--wariba-brand-500)] text-white">
                      <CheckIcon size="sm" className="size-3" />
                    </span>
                  ) : null}
                </span>
                <span className="mt-3 block text-base font-semibold text-[color:var(--wariba-color-ink-50)]">
                  {meta.eyebrow}
                </span>
                <span className="mt-1.5 block text-sm leading-relaxed text-[color:var(--wariba-color-ink-300)]">
                  {meta.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Taille ── */}
        <div className="mt-8">
          <p className="text-sm font-semibold text-[color:var(--wariba-color-ink-200)]">
            Taille du compte simulé
          </p>
          <div className="mt-3 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Taille">
            {familyOffers.map((offer, index) => (
              <button
                key={offer.offerId}
                type="button"
                role="radio"
                aria-label={`Taille ${offer.sizeCode}`}
                aria-checked={offer.offerId === selected.offerId}
                tabIndex={offer.offerId === selected.offerId ? 0 : -1}
                onClick={() => selectOffer(offer, 'size')}
                onKeyDown={(event) => moveRadioSelection(event, index, familyOffers, 'size')}
                className="commerce-size"
                data-active={offer.offerId === selected.offerId ? 'true' : 'false'}
              >
                {offer.sizeCode}
              </button>
            ))}
          </div>
        </div>

        {/* ── Résumé ── */}
        <div className="commerce-summary mt-8">
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

            <dl className="mt-8" data-testid="resolved-rules">
              {specs.map((spec) => (
                <div key={spec.key} className="commerce-spec-row">
                  <dt className="commerce-spec-label">{spec.label}</dt>
                  <dd>
                    <span
                      className="commerce-spec-value"
                      data-tone={spec.tone}
                      data-wrap={spec.wrap ? 'true' : undefined}
                      data-flash={flashed.has(spec.key) ? 'true' : undefined}
                    >
                      {spec.value}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 text-xs leading-relaxed text-[color:var(--wariba-color-ink-300)]">
              Version de règles {selected.policySemanticVersion} · attachée au compte au moment de
              l’achat et immuable ensuite.
            </p>
          </div>

          <aside className="commerce-price-panel" aria-label="Résumé du prix">
            <div className="lg:sticky lg:top-24">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-color-ink-300)]">
                {isFlex ? 'À régler aujourd’hui' : 'Paiement unique'}
              </p>
              <p className="mt-2 font-mono text-4xl font-bold tabular-nums tracking-[-0.03em] text-[color:var(--wariba-color-ink-50)]">
                {xofParts(selected.upfrontPrice).value}{' '}
                <span className="text-xl font-semibold text-[color:var(--wariba-color-ink-300)]">
                  {xofParts(selected.upfrontPrice).currency}
                </span>
              </p>

              {isFlex ? (
                <div className="mt-6 space-y-3 border-t border-[color:var(--commerce-rule)] pt-5 text-sm">
                  <PriceLine
                    label="À l’activation, après réussite"
                    value={formatXof(selected.activationPrice)}
                  />
                  <PriceLine
                    label="Total si vous réussissez"
                    value={formatXof(selected.totalPriceIfSuccess)}
                    strong
                  />
                  <p className="rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-accent-emerald-edge)] bg-[color:var(--wariba-accent-emerald-wash)] p-3 text-xs leading-relaxed text-[color:var(--wariba-color-ink-100)]">
                    Le montant d’activation est figé aujourd’hui. Si vous ne réussissez pas
                    l’évaluation, il n’est jamais prélevé.
                  </p>
                </div>
              ) : null}

              {sandboxCheckoutAvailable ? (
                <Link
                  href={checkoutHref(selected)}
                  onClick={() =>
                    trackCommerceEvent('commerce_checkout_started', {
                      offerId: selected.offerId,
                      source: pathname,
                    })
                  }
                  className="commerce-primary-action mt-7 w-full"
                >
                  Choisir {familyMeta.short} {selected.sizeCode}
                </Link>
              ) : (
                <div className="mt-7">
                  <button type="button" disabled className="commerce-primary-action w-full">
                    Achats bientôt disponibles
                  </button>
                  <p className="mt-3 text-xs leading-relaxed text-[color:var(--wariba-color-ink-300)]">
                    Le catalogue est public. Le paiement reste fermé jusqu’à validation des
                    capacités de lancement.
                  </p>
                </div>
              )}

              <Link
                href={familyMeta.path}
                className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[color:var(--wariba-color-cobalt-300)] transition-colors hover:text-[color:var(--wariba-color-cobalt-400)]"
              >
                Comprendre ce parcours
                <ArrowRightIcon size="sm" />
              </Link>

              {/* What the fee actually buys. Only things that exist today —
                  the phase forbids filling a panel with promises. */}
              <ul className="mt-6 space-y-2.5 border-t border-[color:var(--commerce-rule)] pt-5">
                {INCLUDED.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-[color:var(--wariba-color-ink-300)]"
                  >
                    <CheckIcon
                      size="sm"
                      className="mt-0.5 shrink-0 text-[color:var(--wariba-accent-emerald)]"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Barre d'achat mobile ── */}
      <div className="commerce-mobile-paybar" data-testid="commerce-paybar">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--wariba-color-ink-300)]">
            {familyMeta.short} · {selected.sizeCode}
            {isFlex ? ' · aujourd’hui' : ''}
          </p>
          <p className="truncate font-mono text-lg font-bold tabular-nums text-[color:var(--wariba-color-ink-50)]">
            {formatXof(selected.upfrontPrice)}
          </p>
          {isFlex ? (
            <p className="truncate font-mono text-[11px] tabular-nums text-[color:var(--wariba-color-ink-300)]">
              puis {formatXof(selected.activationPrice)} après réussite
            </p>
          ) : null}
        </div>
        {sandboxCheckoutAvailable ? (
          <Link href={checkoutHref(selected)} className="commerce-primary-action shrink-0">
            Choisir
          </Link>
        ) : (
          <button type="button" disabled className="commerce-primary-action shrink-0">
            Bientôt
          </button>
        )}
      </div>
    </section>
  );
}

const INCLUDED = [
  'Accès complet au poste de travail WariX',
  'Journal de trading et suivi de performance',
  'Règles figées à l’achat, consultables à tout moment',
  'Centre d’aide et support',
] as const;

function PriceLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[color:var(--wariba-color-ink-300)]">{label}</span>
      <strong
        className={
          strong
            ? 'font-mono text-base font-bold tabular-nums text-[color:var(--wariba-color-ink-50)]'
            : 'font-mono font-semibold tabular-nums text-[color:var(--wariba-color-ink-100)]'
        }
      >
        {value}
      </strong>
    </div>
  );
}
