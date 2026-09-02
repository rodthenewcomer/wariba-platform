'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import type { CanonicalOfferReadModel } from '@wariba/application';
import { AccountToken, ArrowRightIcon } from '@wariba/ui';
import { useHydratedReducedMotion } from '../../motion/useHydratedReducedMotion';
import { Reveal } from '../../motion/Reveal';
import { onOfferSelected } from '../offer-selection-events';
import { checkoutHref, FAMILY_ACCENT_VARS, formatXof, offerByIdentity } from '../offer-ui';

const ONE_ACCENT = FAMILY_ACCENT_VARS.WARIBA_ONE as CSSProperties;

interface OneFinalCloseProps {
  offers: readonly CanonicalOfferReadModel[];
  sandboxCheckoutAvailable: boolean;
}

function preferredOneOffer(
  offers: readonly CanonicalOfferReadModel[],
  requested: string | null,
): CanonicalOfferReadModel {
  const oneOffers = offers.filter((offer) => offer.productFamily === 'WARIBA_ONE');
  const byId = requested ? offerByIdentity(oneOffers, requested) : undefined;
  return byId ?? oneOffers.find((offer) => offer.sizeCode === '10K') ?? oneOffers[0]!;
}

/**
 * The page's last block — no new content, one clear action. The selected
 * offer is read from the exact same channel `OfferConfigurator` broadcasts
 * on (`offer-selection-events.ts`, built for precisely this: "the read side
 * for the sticky dock, the final CTA"), not a second piece of state. Only
 * WARIBA_ONE selections move this section — switching to FLEX/INSTANT
 * inside the configurator above doesn't repaint a section whose copy is
 * entirely about ONE.
 */
export function OneFinalClose({ offers, sandboxCheckoutAvailable }: OneFinalCloseProps) {
  const searchParams = useSearchParams();
  const reduced = useHydratedReducedMotion();
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('offre'));
  const selected = preferredOneOffer(offers, selectedId);
  const noActivationFee = Number(selected.activationPrice) === 0;

  useEffect(
    () =>
      onOfferSelected((offerId) => {
        const target = offers.find(
          (offer) => offer.offerId === offerId && offer.productFamily === 'WARIBA_ONE',
        );
        if (target) setSelectedId(offerId);
      }),
    [offers],
  );

  const facts = [
    ['1 Évaluation', 'Une seule phase'],
    ['Paiement unique', 'Aucun frais d’activation'],
    ['Performance', 'Après réussite'],
    ['Trading simulé', 'Pas de capital réel'],
  ] as const;

  const ctaBlock = (
    <>
      {sandboxCheckoutAvailable ? (
        <Link href={checkoutHref(selected)} className="commerce-primary-action">
          Continuer avec ONE {selected.sizeCode}
          <ArrowRightIcon size="sm" />
        </Link>
      ) : (
        <button type="button" disabled className="commerce-primary-action">
          Bientôt disponible
        </button>
      )}
      <p className="mt-4 text-sm text-[color:var(--commerce-text-dim)]">
        Trading simulé · Prix en FCFA · Règles visibles avant de continuer
      </p>
    </>
  );

  return (
    <section className="commerce-hero relative overflow-hidden" style={ONE_ACCENT}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_36rem_at_78%_18%,color-mix(in_srgb,var(--wariba-accent-copper)_14%,transparent),transparent_62%)]"
      />
      <div className="commerce-shell py-24 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-20">
          <div>
            <Reveal>
              <p className="commerce-kicker">Prêt pour ONE ?</p>
              <h2 className="commerce-display mt-6">
                Votre parcours ONE
                <span className="block">commence ici.</span>
              </h2>
              {/* Everything this could repeat — paiement unique, Évaluation,
                  pas d'activation — has already had its own section. This
                  closes instead of re-explaining: it names the three things
                  the visitor now knows and hands them the one decision left. */}
              <p className="commerce-lead mt-6 max-w-md">
                Vous connaissez le prix. Vous connaissez les règles.
                <span className="block">Il reste à choisir.</span>
              </p>
            </Reveal>

            {/* Desktop only: side by side with the offer card, the price is
                already visible at a glance, so the CTA can sit here. Mobile
                gets its own copy after the offer object instead — see below,
                the price must be readable before the action that follows it. */}
            <Reveal delay={0.08} className="mt-9 hidden lg:block">
              {ctaBlock}
            </Reveal>
          </div>

          <Reveal delay={0.12}>
            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 rounded-[var(--wariba-radius-2xl)] bg-[radial-gradient(circle_at_50%_20%,color-mix(in_srgb,var(--wariba-accent-copper)_26%,transparent),transparent_70%)] blur-2xl"
              />
              <div className="relative overflow-hidden rounded-[var(--wariba-radius-2xl)] border border-[color:var(--commerce-rule)] bg-[color:var(--commerce-panel)] p-7 shadow-[inset_0_1px_0_var(--commerce-rim-strong)] sm:p-9">
                {/* The certificate edge — a hairline of the family's own
                    accent rather than a neutral border, so the object reads
                    as WARIBA ONE's specifically, not a generic dark card. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--commerce-accent),transparent)]"
                />

                <div className="flex items-center gap-4">
                  <AccountToken sizeCode={selected.sizeCode} family="one" width={72} />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--commerce-text)]">
                      WARIBA ONE
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--commerce-accent-text)]">
                      Évaluation
                    </p>
                  </div>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={selected.offerId}
                    initial={reduced ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: reduced ? 1 : 0 }}
                    transition={{ duration: reduced ? 0 : 0.2, ease: [0.2, 0, 0, 1] }}
                  >
                    <div className="mt-8 flex items-end justify-between gap-4">
                      <div>
                        <p className="font-mono text-2xl font-bold text-[color:var(--commerce-text)]">
                          {selected.sizeCode}
                        </p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--commerce-text-dim)]">
                          Compte simulé
                        </p>
                      </div>
                    </div>

                    <div className="relative mt-6 pt-6">
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,var(--commerce-rule-strong),transparent)]"
                      />
                      <p className="font-mono text-4xl font-bold tracking-[-0.01em] text-[color:var(--commerce-text)]">
                        {formatXof(selected.upfrontPrice)}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--commerce-text-dim)]">
                        Paiement unique
                      </p>
                    </div>

                    <div className="relative mt-6 pt-6">
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,var(--commerce-rule-strong),transparent)]"
                      />
                      <div className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="size-[7px] rounded-full bg-[color:var(--commerce-accent)]"
                        />
                        <span className="h-px w-6 bg-[color:var(--commerce-rule-strong)]" />
                        <span
                          aria-hidden="true"
                          className="size-[7px] rounded-full border border-[color:var(--commerce-rule-strong)]"
                        />
                        <p className="text-sm font-semibold text-[color:var(--commerce-text)]">
                          Évaluation
                          <span className="mx-1.5 text-[color:var(--commerce-text-dim)]">→</span>
                          Performance
                        </p>
                      </div>
                      {noActivationFee ? (
                        <p className="mt-3 text-xs text-[color:var(--commerce-text-dim)]">
                          Aucun frais d’activation après réussite
                        </p>
                      ) : null}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.16} className="lg:hidden">
            {ctaBlock}
          </Reveal>
        </div>

        <Reveal delay={0.2} className="mt-16 border-t border-[color:var(--commerce-rule)] pt-8">
          <ul className="flex flex-wrap gap-x-10 gap-y-6">
            {facts.map((fact, index) => (
              <li
                key={fact[0]}
                className={
                  index > 0
                    ? 'border-l border-[color:var(--commerce-rule-strong)] pl-10'
                    : undefined
                }
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--commerce-accent-text)]">
                  {fact[0]}
                </p>
                <p className="mt-1 text-sm text-[color:var(--commerce-text-dim)]">{fact[1]}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
