'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { AccountToken, ArrowRightIcon, CheckIcon } from '@wariba/ui';
import type { CanonicalOfferReadModel } from '@wariba/application';
import { FAMILY_META, FAMILY_ORDER, formatRate, formatXof, xofParts } from '../commerce/offer-ui';
import { useHydratedReducedMotion } from '../motion/useHydratedReducedMotion';

const FAMILY_TOKEN = {
  WARIBA_ONE: 'one',
  WARIBA_FLEX: 'flex',
  WARIBA_INSTANT: 'instant',
} as const;

/**
 * The homepage's account chooser.
 *
 * ## Why it is not the `/offres` configurator
 *
 * `/offres` is where someone decides; the homepage is where they discover the
 * decision exists. So this one leads with the object — the account plate, large
 * enough to be the section's visual hook — and shows six resolved rules rather
 * than ten. Anyone who wants the full sheet is one click away.
 *
 * ## Selection is local, and the URL is not touched
 *
 * The homepage is not a shareable configuration, so there is nothing to
 * restore: no router call, no server round trip, no `?offre=` on `/`. Choosing
 * a size costs a re-render and nothing else.
 *
 * ## Every figure is server-derived
 *
 * Price, target, daily limit, maximum loss, best day and split all come from
 * the canonical offer. The FLEX total is read, never computed here — a
 * marketing surface that does arithmetic on money is a second source of truth
 * waiting to disagree with the first.
 */
export function HomeConfigurator({ offers }: { offers: readonly CanonicalOfferReadModel[] }) {
  const reduced = useHydratedReducedMotion();
  const [family, setFamily] = useState<CanonicalOfferReadModel['productFamily']>('WARIBA_ONE');
  const [sizeCode, setSizeCode] = useState('25K');

  const familyOffers = useMemo(
    () => offers.filter((offer) => offer.productFamily === family),
    [offers, family],
  );
  const selected =
    familyOffers.find((offer) => offer.sizeCode === sizeCode) ?? familyOffers[0] ?? offers[0];

  if (!selected) return null;

  const meta = FAMILY_META[selected.productFamily];
  const isFlex = selected.productFamily === 'WARIBA_FLEX';
  const evaluation = selected.evaluationRules;
  const performance = selected.performanceRules;

  const rows: Array<[string, string, boolean?]> = [
    evaluation
      ? ['Objectif', formatRate(evaluation.profitTargetRate), true]
      : ['Départ', 'Performance directe', true],
    ['Limite quotidienne', formatRate(evaluation?.dailyLossRate ?? performance.dailyLossRate)],
    ['Perte maximale', formatRate(evaluation?.maximumLossRate ?? performance.maximumLossRate)],
    [
      'Meilleure journée',
      formatRate(evaluation?.bestDayMaximumRate ?? performance.bestDayMaximumRate),
    ],
    ['Réserve de sécurité', formatRate(performance.permanentBufferRate)],
    ['Journées Performance', `${performance.performanceDaysRequired}`],
  ];

  const roving = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
    length: number,
    apply: (next: number) => void,
  ) => {
    const map: Record<string, number> = {
      ArrowRight: (index + 1) % length,
      ArrowDown: (index + 1) % length,
      ArrowLeft: (index - 1 + length) % length,
      ArrowUp: (index - 1 + length) % length,
      Home: 0,
      End: length - 1,
    };
    const next = map[event.key];
    if (next === undefined) return;
    event.preventDefault();
    apply(next);
    const radios =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    radios?.[next]?.focus();
  };

  return (
    <div
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center"
      data-testid="home-configurator"
      data-offer-id={selected.offerId}
    >
      {/* ── L'objet ── */}
      <div className="relative flex min-w-0 items-center justify-center rounded-[var(--wariba-radius-2xl)] border border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-deep)] p-6 shadow-[inset_0_1px_0_var(--wariba-inner-highlight)] sm:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[var(--wariba-radius-2xl)]"
          style={{
            background:
              'radial-gradient(60% 55% at 50% 46%, color-mix(in srgb, var(--wariba-brand-600) 26%, transparent), transparent 70%)',
          }}
        />
        {/* Le cadre ne bouge pas ; seule la plaque change. */}
        <div className="relative aspect-[254/190] w-full max-w-[254px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${selected.productFamily}-${selected.sizeCode}`}
              initial={reduced ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: reduced ? 1 : 0 }}
              transition={{ duration: reduced ? 0 : 0.22, ease: [0.2, 0, 0, 1] }}
              className="absolute inset-0"
            >
              <AccountToken
                sizeCode={selected.sizeCode}
                family={FAMILY_TOKEN[selected.productFamily]}
                className="h-full w-full"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Le choix ── */}
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Parcours">
          {FAMILY_ORDER.map((option, index) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={option === family}
              tabIndex={option === family ? 0 : -1}
              onClick={() => setFamily(option)}
              onKeyDown={(event) =>
                roving(event, index, FAMILY_ORDER.length, (next) => setFamily(FAMILY_ORDER[next]!))
              }
              className="commerce-size min-w-0 flex-1 px-2 sm:px-4"
              data-active={option === family ? 'true' : 'false'}
            >
              {FAMILY_META[option].short}
            </button>
          ))}
        </div>

        <div
          className="mt-3 grid grid-cols-5 gap-2"
          role="radiogroup"
          aria-label="Taille du compte"
        >
          {familyOffers.map((offer, index) => (
            <button
              key={offer.offerId}
              type="button"
              role="radio"
              aria-checked={offer.sizeCode === selected.sizeCode}
              tabIndex={offer.sizeCode === selected.sizeCode ? 0 : -1}
              onClick={() => setSizeCode(offer.sizeCode)}
              onKeyDown={(event) =>
                roving(event, index, familyOffers.length, (next) =>
                  setSizeCode(familyOffers[next]!.sizeCode),
                )
              }
              className="commerce-size"
              data-active={offer.sizeCode === selected.sizeCode ? 'true' : 'false'}
            >
              {offer.sizeCode}
            </button>
          ))}
        </div>

        <dl className="mt-7">
          {rows.map(([label, value, accent]) => (
            <div key={label} className="commerce-spec-row">
              <dt className="commerce-spec-label">{label}</dt>
              <dd>
                <span className="commerce-spec-value" data-tone={accent ? 'accent' : undefined}>
                  {value}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        {/* ── Le prix ── */}
        <div className="mt-7 rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-seam)] bg-[color:var(--wariba-surface-1)] p-5">
          <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
            {isFlex ? 'À régler aujourd’hui' : 'Paiement unique'}
          </p>
          <p className="wariba-figure mt-1.5 text-4xl font-bold tracking-[-0.03em] text-[color:var(--wariba-on-dark)]">
            {xofParts(selected.upfrontPrice).value}{' '}
            <span className="text-xl font-semibold text-[color:var(--wariba-on-dark-dim)]">
              {xofParts(selected.upfrontPrice).currency}
            </span>
          </p>

          {/* FLEX ne cache jamais son second montant ni son total. */}
          {isFlex ? (
            <dl className="mt-4 space-y-2 border-t border-[color:var(--wariba-seam)] pt-4 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[color:var(--wariba-on-dark-dim)]">Après réussite</dt>
                <dd className="wariba-figure font-semibold text-[color:var(--wariba-on-dark-muted)]">
                  {formatXof(selected.activationPrice)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[color:var(--wariba-on-dark-dim)]">Total si vous réussissez</dt>
                <dd className="wariba-figure font-bold text-[color:var(--wariba-on-dark)]">
                  {formatXof(selected.totalPriceIfSuccess)}
                </dd>
              </div>
              <p className="flex items-start gap-2 pt-1 text-xs leading-relaxed text-[color:var(--wariba-on-dark-dim)]">
                <CheckIcon
                  size="sm"
                  className="mt-0.5 shrink-0 text-[color:var(--wariba-accent-emerald)]"
                />
                Si vous ne réussissez pas, l’activation n’est jamais prélevée.
              </p>
            </dl>
          ) : null}

          <Link href={meta.path} className="wariba-cta-primary mt-5 w-full">
            Découvrir {meta.short}
            <ArrowRightIcon size="sm" />
          </Link>
        </div>
      </div>
    </div>
  );
}
