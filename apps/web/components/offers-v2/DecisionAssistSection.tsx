'use client';

import { CheckIcon } from '@wariba/ui';
import { trackCommerceEvent } from '../commerce/commerce-analytics';
import { requestOfferSelection } from '../commerce/offer-selection-events';

type Family = 'WARIBA_ONE' | 'WARIBA_FLEX' | 'WARIBA_INSTANT';

const OPTIONS: readonly { family: Family; short: string; sentence: string }[] = [
  {
    family: 'WARIBA_ONE',
    short: 'ONE',
    sentence: 'Je préfère payer une fois et passer par l’évaluation.',
  },
  {
    family: 'WARIBA_FLEX',
    short: 'FLEX',
    sentence:
      'Je préfère réduire mon coût de départ et payer l’activation seulement après réussite.',
  },
  {
    family: 'WARIBA_INSTANT',
    short: 'INSTANT',
    sentence: 'Je préfère éviter l’évaluation et accéder directement à Performance.',
  },
];

interface DecisionAssistSectionProps {
  referenceOfferIdByFamily: Record<Family, string>;
}

/** Section 09 — direct self-selection, not a quiz. No fake "match score". */
export function DecisionAssistSection({ referenceOfferIdByFamily }: DecisionAssistSectionProps) {
  const choose = (family: Family) => {
    const offerId = referenceOfferIdByFamily[family];
    requestOfferSelection(offerId);
    trackCommerceEvent('commerce_offer_cta_clicked', { offerId, ctaLocation: 'decision_assist' });
    document
      .getElementById('configurator-title')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="py-16 lg:py-20">
      <div className="commerce-shell">
        <p className="commerce-kicker">Encore indécis ?</p>
        <h2 className="commerce-section-title mt-5 max-w-2xl">Encore entre deux parcours ?</h2>

        <div className="mt-8 grid gap-3 lg:grid-cols-3">
          {OPTIONS.map((option) => (
            <button
              key={option.family}
              type="button"
              onClick={() => choose(option.family)}
              className="commerce-choice min-h-32 text-left"
            >
              <span className="commerce-choice-index">{option.short}</span>
              <span className="mt-3 block text-sm leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
                {option.sentence}
              </span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--wariba-brand-300)]">
                <CheckIcon size="sm" />
                C’est {option.short} pour moi
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
