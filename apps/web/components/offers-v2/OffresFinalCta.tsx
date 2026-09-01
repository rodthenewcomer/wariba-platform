'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRightIcon, AccountToken } from '@wariba/ui';
import type { CanonicalOfferReadModel } from '@wariba/application';
import { useSelectedOffer } from './useSelectedOffer';
import {
  checkoutHref,
  FAMILY_ACCENT_VARS,
  FAMILY_META,
  formatXof,
} from '../commerce/offer-ui';
import { trackCommerceEvent } from '../commerce/commerce-analytics';
import { useHydratedReducedMotion } from '../motion/useHydratedReducedMotion';

interface OffresFinalCtaProps {
  offers: readonly CanonicalOfferReadModel[];
  fallback: CanonicalOfferReadModel;
  sandboxCheckoutAvailable: boolean;
}

const FAMILY_TOKEN = {
  WARIBA_ONE: 'one',
  WARIBA_FLEX: 'flex',
  WARIBA_INSTANT: 'instant',
} as const;

/**
 * The final buying moment — the FAQ's own resume point. It reads the same
 * `useSelectedOffer` state the configurator and the sticky dock already
 * read, never a second notion of "what's selected"; there is no empty
 * "nothing chosen yet" state to build here for the same reason there is
 * no such state in either of those — `OfferConfigurator` announces a real
 * offer (from `?offre=` or its own ONE·10K default) on mount, before a
 * visitor has clicked anything, so by the time this section can render
 * there is always a concrete family and size to show. Building a second
 * branch for a state this event bus never actually produces would be
 * exactly the kind of code the brief that drove this asked not to add.
 */
export function OffresFinalCta({ offers, fallback, sandboxCheckoutAvailable }: OffresFinalCtaProps) {
  const selected = useSelectedOffer(offers, fallback);
  const meta = FAMILY_META[selected.productFamily];
  const isFlex = selected.productFamily === 'WARIBA_FLEX';
  const reduced = useHydratedReducedMotion();

  return (
    <section
      className="commerce-band"
      style={{
        ...FAMILY_ACCENT_VARS[selected.productFamily],
        transition: reduced ? undefined : 'color 200ms ease, border-color 200ms ease',
      }}
    >
      <div className="commerce-shell py-16 lg:py-20">
        <div className="commerce-panel flex flex-col gap-8 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selected.offerId}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: reduced ? 1 : 0 }}
              transition={{ duration: reduced ? 0 : 0.2, ease: [0.2, 0, 0, 1] }}
              className="flex min-w-0 flex-1 items-center gap-5"
            >
              <div className="hidden shrink-0 sm:block">
                <AccountToken
                  sizeCode={selected.sizeCode}
                  family={FAMILY_TOKEN[selected.productFamily]}
                  width={72}
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
                  Votre choix
                </p>
                <p className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[color:var(--wariba-on-dark)]">
                  {meta.short} · {selected.sizeCode}
                </p>

                {isFlex ? (
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="text-sm text-[color:var(--wariba-on-dark-muted)]">
                      Aujourd’hui{' '}
                      <strong className="font-mono font-bold text-[color:var(--wariba-accent-emerald)]">
                        {formatXof(selected.upfrontPrice)}
                      </strong>
                    </span>
                    <span className="text-sm text-[color:var(--wariba-on-dark-muted)]">
                      Activation après réussite{' '}
                      <strong className="font-mono font-bold text-[color:var(--wariba-accent-emerald)]">
                        {formatXof(selected.activationPrice)}
                      </strong>
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 font-mono text-lg font-bold tabular-nums text-[color:var(--wariba-accent-emerald)]">
                    {formatXof(selected.upfrontPrice)}
                  </p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {sandboxCheckoutAvailable ? (
            <Link
              href={checkoutHref(selected)}
              onClick={() =>
                trackCommerceEvent('commerce_checkout_started', {
                  offerId: selected.offerId,
                  source: 'offres_faq_final',
                  ctaLocation: 'faq_final',
                })
              }
              className="commerce-primary-action group relative w-full shrink-0 overflow-hidden active:scale-[0.985] lg:w-auto"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
              />
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={selected.offerId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  className="relative inline-flex items-center justify-center gap-1.5"
                >
                  Continuer avec {meta.short} {selected.sizeCode}
                  <ArrowRightIcon
                    size="sm"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </motion.span>
              </AnimatePresence>
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="commerce-primary-action w-full shrink-0 lg:w-auto"
            >
              Bientôt disponible
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
