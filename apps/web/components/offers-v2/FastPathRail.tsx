'use client';

import { RouteScene } from '@wariba/ui';
import { trackCommerceEvent } from '../commerce/commerce-analytics';
import { requestOfferSelection } from '../commerce/offer-selection-events';

interface FastPathLane {
  family: 'one' | 'flex' | 'instant';
  productFamily: 'WARIBA_ONE' | 'WARIBA_FLEX' | 'WARIBA_INSTANT';
  short: string;
  eyebrow: string;
  description: string;
}

const LANES: readonly FastPathLane[] = [
  {
    family: 'one',
    productFamily: 'WARIBA_ONE',
    short: 'UNE ÉVALUATION · UN PAIEMENT UNIQUE',
    eyebrow: 'ONE',
    description: 'Payez une fois, réussissez l’évaluation, puis progressez vers Performance.',
  },
  {
    family: 'flex',
    productFamily: 'WARIBA_FLEX',
    short: 'UNE ÉVALUATION · DEUX PAIEMENTS',
    eyebrow: 'FLEX',
    description: 'Payez une partie au départ, puis l’activation seulement après réussite.',
  },
  {
    family: 'instant',
    productFamily: 'WARIBA_INSTANT',
    short: 'SANS ÉVALUATION',
    eyebrow: 'INSTANT',
    description: 'Accédez directement à Performance avec les règles applicables au parcours.',
  },
];

interface FastPathRailProps {
  /** offerId of the 10K reference offer for each family — the default the Decision Engine also opens on. */
  referenceOfferIdByFamily: Record<FastPathLane['productFamily'], string>;
}

/**
 * Section 02 — Fast Path Choice.
 *
 * Three editorial lanes, not three SaaS cards. Selecting one requests a
 * selection on the canonical Decision Engine below (via the shared offer-
 * selection event bus — see `offer-selection-events.ts`) rather than
 * inventing a second, parallel notion of "which family is chosen".
 */
export function FastPathRail({ referenceOfferIdByFamily }: FastPathRailProps) {
  const choose = (lane: FastPathLane) => {
    const offerId = referenceOfferIdByFamily[lane.productFamily];
    requestOfferSelection(offerId);
    trackCommerceEvent('commerce_offer_cta_clicked', {
      offerId,
      ctaLocation: 'fast_path',
    });
    document
      .getElementById('configurator-title')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="commerce-band">
      <div className="commerce-shell py-14 lg:py-16">
        <p className="commerce-kicker">Trois portes, un même système</p>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {LANES.map((lane) => (
            <button
              key={lane.family}
              type="button"
              onClick={() => choose(lane)}
              className="commerce-panel group flex flex-col items-start gap-4 p-5 text-left transition-colors hover:border-[color:var(--commerce-rule-strong)]"
            >
              <RouteScene family={lane.family} variant="tile" className="!size-12 shrink-0" />
              <div className="min-w-0">
                <p className="commerce-choice-index">{lane.short}</p>
                <h3 className="mt-2 text-lg font-semibold text-[color:var(--wariba-on-dark)]">
                  {lane.eyebrow}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
                  {lane.description}
                </p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--wariba-brand-300)] transition-colors group-hover:text-[color:var(--wariba-brand-200)]">
                Voir {lane.eyebrow} →
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
