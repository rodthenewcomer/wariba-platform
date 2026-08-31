'use client';

import { useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { AccountToken, ArrowRightIcon, CheckIcon } from '@wariba/ui';
import type { CanonicalOfferReadModel } from '@wariba/application';
import {
  checkoutHref,
  FAMILY_META,
  FAMILY_ORDER,
  formatMultiple,
  formatRate,
  formatXof,
  xofParts,
} from '../commerce/offer-ui';
import { useHydratedReducedMotion } from '../motion/useHydratedReducedMotion';

const FAMILY_TOKEN = {
  WARIBA_ONE: 'one',
  WARIBA_FLEX: 'flex',
  WARIBA_INSTANT: 'instant',
} as const;

const FAMILY_STYLE = {
  WARIBA_ONE: {
    accent: 'var(--wariba-brand-400)',
    wash: 'var(--wariba-brand-wash)',
    edge: 'var(--wariba-brand-edge)',
  },
  WARIBA_FLEX: {
    accent: 'var(--wariba-color-violet-400)',
    wash: 'color-mix(in srgb, var(--wariba-color-violet-500) 18%, transparent)',
    edge: 'color-mix(in srgb, var(--wariba-color-violet-400) 52%, transparent)',
  },
  WARIBA_INSTANT: {
    accent: 'var(--wariba-accent-cyan)',
    wash: 'color-mix(in srgb, var(--wariba-accent-cyan) 12%, transparent)',
    edge: 'color-mix(in srgb, var(--wariba-accent-cyan) 38%, transparent)',
  },
} as const;

/** Local account configurator; all prices and rules are read from V2 offer models. */
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
  const evaluation = selected.evaluationRules;
  const isFlex = selected.productFamily === 'WARIBA_FLEX';
  const isInstant = selected.productFamily === 'WARIBA_INSTANT';
  const theme = FAMILY_STYLE[selected.productFamily];
  const headingPrice = xofParts(selected.upfrontPrice);
  const ctaIsPurchase = selected.purchaseEnabled;
  const coreState = isInstant ? 'Performance directe' : isFlex ? 'Paiement scindé' : 'Évaluation';
  const facts = isFlex
    ? [
        ['Objectif', formatRate(evaluation?.profitTargetRate ?? '0')],
        ['Perte maximale', formatRate(evaluation?.maximumLossRate ?? '0')],
      ]
    : isInstant
      ? [
          ['Perte maximale', formatRate(selected.performanceRules.maximumLossRate)],
          ['Limite quotidienne', formatRate(selected.performanceRules.dailyLossRate)],
          ['Exposition', formatMultiple(selected.performanceRules.grossExposureMaximumMultiple)],
          ['Départ', 'Performance directe'],
        ]
      : [
          ['Objectif', formatRate(evaluation?.profitTargetRate ?? '0')],
          ['Perte maximale', formatRate(evaluation?.maximumLossRate ?? '0')],
          ['Limite quotidienne', formatRate(evaluation?.dailyLossRate ?? '0')],
          ['Activation', formatXof(selected.activationPrice)],
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
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [next]?.focus();
  };

  return (
    <section
      aria-label="Configurateur de compte WARIBA"
      className="overflow-hidden rounded-[var(--wariba-radius-2xl)] border border-[color:var(--wariba-seam-strong)] bg-[color:var(--wariba-canvas-deep)] shadow-[inset_0_1px_0_var(--wariba-inner-highlight)]"
      data-testid="home-configurator"
      data-offer-id={selected.offerId}
      style={
        {
          '--config-accent': theme.accent,
          '--config-wash': theme.wash,
          '--config-edge': theme.edge,
        } as CSSProperties
      }
    >
      <div className="border-b border-[color:var(--wariba-seam)] p-3 sm:p-5">
        <div
          className="relative grid grid-cols-3 rounded-[16px] border border-[color:var(--wariba-seam)] bg-[color:var(--wariba-surface-1)] p-1.5"
          role="radiogroup"
          aria-label="Parcours"
        >
          {FAMILY_ORDER.map((option, index) => {
            const active = option === family;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setFamily(option)}
                onKeyDown={(event) =>
                  roving(event, index, FAMILY_ORDER.length, (next) =>
                    setFamily(FAMILY_ORDER[next]!),
                  )
                }
                className="wariba-focus-ring relative z-10 flex min-h-14 flex-col items-center justify-center rounded-[11px] px-2 text-xs font-bold tracking-[0.08em] text-[color:var(--wariba-on-dark-dim)] transition-colors duration-[var(--wariba-motion-state)] sm:min-h-[4.25rem] sm:text-sm"
              >
                {active ? (
                  <motion.span
                    layoutId="config-family-indicator"
                    className="absolute inset-0 -z-10 rounded-[10px] border border-[color:var(--config-edge)] bg-[color:var(--config-wash)]"
                    transition={{ duration: reduced ? 0 : 0.2, ease: [0.2, 0, 0, 1] }}
                  />
                ) : null}
                <span className={active ? 'text-[color:var(--config-accent)]' : undefined}>
                  {FAMILY_META[option].short}
                </span>
                <span className="mt-0.5 hidden text-[9px] font-medium normal-case tracking-normal text-[color:var(--wariba-on-dark-dim)] lg:block">
                  {option === 'WARIBA_ONE'
                    ? 'Une évaluation'
                    : option === 'WARIBA_FLEX'
                      ? 'Payez en deux temps'
                      : 'Accès direct'}
                </span>
              </button>
            );
          })}
        </div>
        <div
          className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-2"
          role="radiogroup"
          aria-label="Taille du compte"
        >
          {familyOffers.map((offer, index) => {
            const active = offer.sizeCode === selected.sizeCode;
            return (
              <button
                key={offer.offerId}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setSizeCode(offer.sizeCode)}
                onKeyDown={(event) =>
                  roving(event, index, familyOffers.length, (next) =>
                    setSizeCode(familyOffers[next]!.sizeCode),
                  )
                }
                className="wariba-focus-ring min-h-12 rounded-[11px] border px-1 font-mono text-xs font-bold transition-[border-color,background-color,color,box-shadow] duration-[var(--wariba-motion-state)] sm:min-h-14 sm:text-sm"
                style={
                  active
                    ? {
                        borderColor: 'var(--config-edge)',
                        backgroundColor: 'var(--config-wash)',
                        color: 'var(--config-accent)',
                        boxShadow:
                          'inset 0 0 0 1px var(--config-edge), 0 10px 24px -16px var(--config-accent)',
                      }
                    : { borderColor: 'var(--wariba-seam)', color: 'var(--wariba-on-dark-dim)' }
                }
              >
                {offer.sizeCode}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden border-b border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-base)] px-6 py-10 lg:min-h-[490px] lg:border-b-0 lg:border-r lg:px-12">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(58%_56%_at_50%_52%,var(--config-wash),transparent_72%)]"
          />
          <div className="relative w-full max-w-[390px]">
            <div className="mb-8 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--wariba-on-dark-muted)]">
              <span>WARIBA {meta.short}</span>
              <span className="text-[color:var(--config-accent)]">Compte simulé</span>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${selected.productFamily}-${selected.sizeCode}`}
                initial={reduced ? false : { opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduced ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 1.02, y: -5 }}
                transition={{ duration: reduced ? 0 : 0.22, ease: [0.2, 0, 0, 1] }}
              >
                <AccountToken
                  sizeCode={selected.sizeCode}
                  family={FAMILY_TOKEN[selected.productFamily]}
                  className="h-auto w-full drop-shadow-[0_24px_42px_rgb(0_0_0_/_0.38)]"
                />
              </motion.div>
            </AnimatePresence>
            <div className="mt-8 flex items-center justify-between border-t border-[color:var(--wariba-seam)] pt-5">
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[color:var(--wariba-on-dark-dim)]">
                Statut de départ
              </span>
              <span className="text-sm font-bold text-[color:var(--config-accent)]">
                {coreState}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-11">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--wariba-on-dark-dim)]">
                Votre formule
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-[color:var(--wariba-on-dark)] sm:text-3xl">
                {meta.short} · {selected.sizeCode}
              </h3>
            </div>
            <span className="mt-1 rounded-full border border-[color:var(--config-edge)] bg-[color:var(--config-wash)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.13em] text-[color:var(--config-accent)]">
              Simulé
            </span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selected.offerId}
              initial={reduced ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: -5 }}
              transition={{ duration: reduced ? 0 : 0.18, ease: [0.2, 0, 0, 1] }}
            >
              {isFlex ? (
                <FlexFormula
                  upfront={headingPrice}
                  activation={formatXof(selected.activationPrice)}
                  total={formatXof(selected.totalPriceIfSuccess)}
                />
              ) : (
                <div className="mt-8 border-b border-[color:var(--wariba-seam)] pb-7">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--wariba-on-dark-dim)]">
                    {isInstant ? 'Prix aujourd’hui' : 'Paiement aujourd’hui'}
                  </p>
                  <p className="wariba-figure mt-2 text-[clamp(2.55rem,5vw,4rem)] font-bold leading-none tracking-[-0.055em] text-[color:var(--wariba-on-dark)]">
                    {headingPrice.value}{' '}
                    <span className="text-[0.37em] font-semibold tracking-[-0.02em] text-[color:var(--wariba-on-dark-dim)]">
                      {headingPrice.currency}
                    </span>
                  </p>
                  {isInstant ? (
                    <p className="mt-3 text-sm font-semibold text-[color:var(--config-accent)]">
                      Pas d’évaluation.
                    </p>
                  ) : null}
                </div>
              )}
              <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5">
                {facts.map(([label, value]) => (
                  <div key={label} className="border-t border-[color:var(--wariba-seam)] pt-3">
                    <dt className="text-[10px] font-bold uppercase tracking-[0.13em] text-[color:var(--wariba-on-dark-dim)]">
                      {label}
                    </dt>
                    <dd className="wariba-figure mt-1.5 text-base font-bold tracking-[-0.02em] text-[color:var(--wariba-on-dark)] sm:text-lg">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          </AnimatePresence>
          <Link
            href={ctaIsPurchase ? checkoutHref(selected) : meta.path}
            className="wariba-cta-primary mt-9 w-full"
          >
            {ctaIsPurchase
              ? `Choisir ${meta.short} ${selected.sizeCode}`
              : `Voir ${meta.short} ${selected.sizeCode}`}
            <ArrowRightIcon size="sm" />
          </Link>
          {!ctaIsPurchase ? (
            <p className="mt-3 text-center text-xs text-[color:var(--wariba-on-dark-dim)]">
              Achats actuellement indisponibles.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FlexFormula({
  upfront,
  activation,
  total,
}: {
  upfront: { value: string; currency: string };
  activation: string;
  total: string;
}) {
  return (
    <div className="mt-8 border-b border-[color:var(--wariba-seam)] pb-7">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--wariba-on-dark-dim)]">
            Aujourd’hui
          </p>
          <p className="wariba-figure mt-2 text-[clamp(2.15rem,4.2vw,3.3rem)] font-bold leading-none tracking-[-0.055em] text-[color:var(--wariba-on-dark)]">
            {upfront.value}{' '}
            <span className="text-[0.37em] font-semibold text-[color:var(--wariba-on-dark-dim)]">
              {upfront.currency}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--wariba-on-dark-dim)]">
            Après réussite
          </p>
          <p className="wariba-figure mt-2 text-[clamp(1.35rem,2.5vw,2rem)] font-bold leading-none text-[color:var(--config-accent)]">
            {activation}
          </p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <span className="size-2 rounded-full bg-[color:var(--config-accent)]" aria-hidden="true" />
        <span
          className="h-px bg-[linear-gradient(90deg,var(--config-accent),color-mix(in_srgb,var(--config-accent)_18%,transparent))]"
          aria-hidden="true"
        />
        <span
          className="size-2 rounded-full border-2 border-[color:var(--config-accent)]"
          aria-hidden="true"
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-4 text-xs text-[color:var(--wariba-on-dark-dim)]">
        <span>Vous commencez</span>
        <span className="flex items-center gap-1.5 font-semibold text-[color:var(--config-accent)]">
          <CheckIcon size="sm" /> Évaluation réussie
        </span>
        <span className="text-right">Activation</span>
      </div>
      <p className="mt-4 text-xs text-[color:var(--wariba-on-dark-dim)]">
        Total si vous réussissez :{' '}
        <span className="wariba-figure font-bold text-[color:var(--wariba-on-dark-muted)]">
          {total}
        </span>
      </p>
    </div>
  );
}
