'use client';

import { Reveal } from '../../motion/Reveal';
import { ProductOSMockup } from './ProductOSMockup';
import { useSurfaceRotation } from './useSurfaceRotation';

/**
 * Section 07 — what WARIBA gives a trader after the trade closes.
 *
 * WariX (Section 06) is where you trade. This is where you understand what
 * happened: the account's current state, the performance behind it, and the
 * trade-by-trade record underneath both. One product shell, three connected
 * surfaces, self-demonstrating until a visitor takes it over.
 */
export function Section07Intelligence() {
  const { sectionRef, surface, selectSurface, markInteracted, reduced } = useSurfaceRotation();

  return (
    <section
      ref={sectionRef}
      aria-labelledby="section07-title"
      className="relative isolate overflow-hidden bg-[color:var(--wariba-color-carbon-980)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--wariba-brand-700)_20%,transparent),transparent_54%)]"
      />

      <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] py-16 lg:py-20">
        <Reveal>
          <p className="wariba-eyebrow">Journal · Analytics · Trader Hub</p>
          <h2 id="section07-title" className="wariba-section-title mt-5 max-w-[18ch]">
            Votre trading ne s’arrête
            <br />
            pas au graphique.
          </h2>
          <p className="wariba-lead mt-5 max-w-[38rem]">
            Journalisez vos trades, analysez vos performances et gardez votre progression sous les
            yeux.
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-7 lg:mt-9">
          <figure className="m-0" aria-label="Démonstration du produit WARIBA">
            <ProductOSMockup
              surface={surface}
              selectSurface={selectSurface}
              markInteracted={markInteracted}
              reduced={reduced}
            />
            <figcaption className="mt-4 font-mono text-[0.6rem] font-medium tracking-[0.12em] text-[color:var(--wariba-on-dark-dim)]">
              APERÇU D’INTERFACE · DONNÉES SIMULÉES
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
