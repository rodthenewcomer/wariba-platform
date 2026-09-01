'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from '@wariba/ui';
import { useHydratedReducedMotion } from '../motion/useHydratedReducedMotion';
import { trackCommerceEvent } from '../commerce/commerce-analytics';
import { KineticMarketHeadline } from './hero/KineticMarketHeadline';
import { MarketComposition } from './hero/MarketComposition';
import { MARKET_WORDS, MARKET_CYCLE_MS } from './hero/markets';

/**
 * Section 01 — Hero V4.
 *
 * The hero has one job: create desire and orient the visitor toward
 * ONE/FLEX/INSTANT, then hand off to the configurator. It used to also
 * carry the five-fact proof strip inline — moved to its own section
 * (`OffresProofStrip`, replacing the old three-card "Trois portes, un même
 * système") so the hero stays about desire and the strip stays about
 * facts, instead of one section trying to do both jobs at once.
 *
 * `MarketComposition` is positioned across the full section (not confined
 * to a grid column) so it can bleed past the right edge on desktop —
 * `overflow-hidden` here is what makes that bleed safe rather than a
 * horizontal scrollbar.
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
      <div className="relative mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] py-14 lg:flex lg:min-h-[min(80svh,760px)] lg:items-center lg:py-20">
        <div className="relative z-10 max-w-xl">
          <p className="wariba-eyebrow">Trading simulé · ONE · FLEX · INSTANT</p>

          <div className="mt-5">
            <KineticMarketHeadline marketIndex={marketIndex} />
          </div>

          <p className="mt-6 max-w-lg text-[length:var(--wariba-font-size-body-lg)] leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
            Choisissez votre parcours. Gardez vos règles visibles. Tradez dans un environnement
            conçu pour mesurer la discipline, pas pour promettre des gains.
          </p>

          <p className="mt-4 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-on-dark-dim)]">
            Prix en FCFA · Règles visibles avant de commencer · Trading entièrement simulé
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <a
              href="#configurator-title"
              onClick={() =>
                trackCommerceEvent('commerce_offers_primary_cta_clicked', { ctaLocation: 'hero' })
              }
              className="wariba-cta-primary"
            >
              Comparer les offres
              <ArrowRightIcon size="sm" />
            </a>
            <Link
              href="/programme"
              onClick={() =>
                trackCommerceEvent('commerce_offers_secondary_cta_clicked', { ctaLocation: 'hero' })
              }
              className="wariba-cta-secondary"
            >
              Comment ça marche
            </Link>
          </div>
        </div>

        <MarketComposition marketIndex={marketIndex} />
      </div>
    </section>
  );
}
