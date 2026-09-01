'use client';

import { useState } from 'react';
import { ArrowRightIcon } from '@wariba/ui';
import { trackCommerceEvent } from '../commerce/commerce-analytics';
import { requestOfferSelection } from '../commerce/offer-selection-events';

type Family = 'WARIBA_ONE' | 'WARIBA_FLEX' | 'WARIBA_INSTANT';

const TABS: readonly { family: Family; label: string }[] = [
  { family: 'WARIBA_ONE', label: 'ONE' },
  { family: 'WARIBA_FLEX', label: 'FLEX' },
  { family: 'WARIBA_INSTANT', label: 'INSTANT' },
];

const STEPS: Record<Family, readonly string[]> = {
  WARIBA_ONE: ['Paiement', 'Évaluation', 'Validation', 'Performance'],
  WARIBA_FLEX: ['Premier paiement', 'Évaluation', 'Réussite', 'Activation', 'Performance'],
  WARIBA_INSTANT: ['Accès', 'Performance'],
};

interface LifecycleCompareProps {
  referenceOfferIdByFamily: Record<Family, string>;
}

/**
 * Section 04 — "What changes." Same platform, three different paths there.
 * Family switching here is local UI state — exploring FLEX's steps doesn't
 * change what's selected in the Decision Engine — the "resume selection" CTA
 * is the one action that requests a real selection on it.
 */
export function LifecycleCompare({ referenceOfferIdByFamily }: LifecycleCompareProps) {
  const [family, setFamily] = useState<Family>('WARIBA_ONE');
  const steps = STEPS[family];

  const resume = () => {
    const offerId = referenceOfferIdByFamily[family];
    requestOfferSelection(offerId);
    trackCommerceEvent('commerce_offer_cta_clicked', { offerId, ctaLocation: 'lifecycle' });
    document
      .getElementById('configurator-title')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="py-16 lg:py-20">
      <div className="commerce-shell">
        <p className="commerce-kicker">Même plateforme</p>
        <h2 className="commerce-section-title mt-5 max-w-2xl">
          Même plateforme. Trois façons d’y arriver.
        </h2>

        <div className="mt-8 inline-flex gap-1 rounded-full border border-[color:var(--commerce-rule)] p-1">
          {TABS.map((tab) => (
            <button
              key={tab.family}
              type="button"
              onClick={() => setFamily(tab.family)}
              aria-pressed={family === tab.family}
              className={
                family === tab.family
                  ? 'rounded-full bg-[color:var(--wariba-brand-500)] px-4 py-2 text-sm font-semibold text-white'
                  : 'rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--wariba-on-dark-muted)] transition-colors hover:text-[color:var(--wariba-on-dark)]'
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-4 lg:flex-nowrap">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <div className="commerce-panel flex min-h-14 items-center whitespace-nowrap px-4 py-3 text-sm font-semibold text-[color:var(--wariba-on-dark)]">
                {step}
              </div>
              {index < steps.length - 1 ? (
                <ArrowRightIcon
                  size="sm"
                  className="shrink-0 text-[color:var(--wariba-on-dark-dim)]"
                />
              ) : null}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={resume}
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--wariba-brand-300)] transition-colors hover:text-[color:var(--wariba-brand-200)]"
        >
          Continuer avec {TABS.find((t) => t.family === family)!.label}
          <ArrowRightIcon size="sm" />
        </button>
      </div>
    </section>
  );
}
