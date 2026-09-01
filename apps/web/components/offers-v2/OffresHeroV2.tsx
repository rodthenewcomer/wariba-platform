'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from '@wariba/ui';
import { useHydratedReducedMotion } from '../motion/useHydratedReducedMotion';
import { trackCommerceEvent } from '../commerce/commerce-analytics';
import { KineticMarketHeadline } from './hero/KineticMarketHeadline';
import { MonolithTheater } from './hero/MonolithTheater';
import { MARKET_WORDS, MARKET_CYCLE_MS } from './hero/markets';

const MICRO_PROOF = [
  { label: '3 parcours', detail: 'ONE · FLEX · INSTANT' },
  { label: '5 tailles', detail: '5K → 100K' },
  { label: 'Prix en FCFA', detail: 'Décision claire' },
  { label: 'Règles visibles', detail: 'Avant de commencer' },
  { label: 'WariX', detail: 'Plateforme WARIBA' },
];

/**
 * Section 01 — Hero V3.1.
 *
 * `MonolithTheater` is positioned across the full section (not confined to
 * a grid column) so the product objects can overlap toward the text and
 * bleed past the right edge on desktop — the "giant dead gap" the previous
 * pass left down the centre. `overflow-hidden` here is what makes that
 * bleed safe rather than a horizontal scrollbar.
 */
export function OffresHeroV2() {
  const reduced = useHydratedReducedMotion();
  const [marketIndex, setMarketIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => {
      setMarketIndex((index) => (index + 1) % MARKET_WORDS.length);
    }, MARKET_CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [reduced]);

  return (
    <section className="relative isolate overflow-hidden bg-[color:var(--wariba-canvas-deep)]">
      <div className="relative mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] py-14 lg:min-h-[min(86svh,820px)] lg:py-20">
        <div className="relative z-10 max-w-xl">
          <p className="wariba-eyebrow">Trading simulé · ONE · FLEX · INSTANT</p>

          <div className="mt-5">
            <KineticMarketHeadline marketIndex={marketIndex} />
          </div>

          <p className="mt-6 max-w-lg text-[length:var(--wariba-font-size-body-lg)] leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
            ONE, FLEX ou INSTANT&nbsp;: choisissez votre parcours, votre taille et voyez exactement
            ce qui vous attend avant de commencer.
          </p>

          <p className="mt-4 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-on-dark-dim)]">
            Prix en FCFA · Règles visibles · Trading entièrement simulé
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <a
              href="#configurator-title"
              onClick={() =>
                trackCommerceEvent('commerce_offers_primary_cta_clicked', { ctaLocation: 'hero' })
              }
              className="wariba-cta-primary"
            >
              Choisir mon parcours
              <ArrowRightIcon size="sm" />
            </a>
            <Link
              href="/aide/risque-regles"
              onClick={() => trackCommerceEvent('commerce_rules_clicked', { ctaLocation: 'hero' })}
              className="wariba-cta-secondary"
            >
              Voir les règles
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
            {MICRO_PROOF.map((fact) => (
              <div key={fact.label}>
                <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.08em] text-[color:var(--wariba-on-dark)]">
                  {fact.label}
                </p>
                <p className="mt-0.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-on-dark-dim)]">
                  {fact.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        <MonolithTheater marketIndex={marketIndex} />
      </div>
    </section>
  );
}
