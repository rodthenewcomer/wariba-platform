'use client';

import Link from 'next/link';
import { ArrowRightIcon, AccountToken } from '@wariba/ui';
import type { CanonicalOfferReadModel } from '@wariba/application';
import { useSelectedOffer } from './useSelectedOffer';
import { checkoutHref, formatXof, FAMILY_META } from '../commerce/offer-ui';
import { trackCommerceEvent } from '../commerce/commerce-analytics';

interface FinalDecisionSectionProps {
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
 * Section 11 — Final Decision. Never resets the visitor's configuration —
 * reads the same live selection every other section reads, via
 * `useSelectedOffer`, and the CTA reflects real commerce state rather than
 * a generic "Commencer maintenant" when checkout isn't actually open.
 */
export function FinalDecisionSection({
  offers,
  fallback,
  sandboxCheckoutAvailable,
}: FinalDecisionSectionProps) {
  const selected = useSelectedOffer(offers, fallback);
  const meta = FAMILY_META[selected.productFamily];
  const isFlex = selected.productFamily === 'WARIBA_FLEX';

  return (
    <section className="commerce-hero commerce-ambient">
      <div className="commerce-shell grid gap-10 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)] lg:items-center lg:py-24">
        <div>
          <p className="commerce-kicker">
            {meta.short} · {selected.sizeCode}
          </p>
          <h2 className="commerce-section-title mt-5 max-w-lg">
            Votre parcours est choisi. Gardez vos règles sous les yeux.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
            {formatXof(selected.upfrontPrice)}
            {isFlex
              ? ` aujourd’hui, puis ${formatXof(selected.activationPrice)} après réussite`
              : ''}
            .
          </p>

          {sandboxCheckoutAvailable ? (
            <Link
              href={checkoutHref(selected)}
              onClick={() =>
                trackCommerceEvent('commerce_checkout_started', {
                  offerId: selected.offerId,
                  source: 'offres_final',
                })
              }
              className="wariba-cta-primary mt-8"
            >
              Continuer avec {meta.short} {selected.sizeCode}
              <ArrowRightIcon size="sm" />
            </Link>
          ) : (
            <div className="mt-8">
              <button type="button" disabled className="wariba-cta-primary opacity-60">
                Bientôt disponible
              </button>
              <p className="mt-3 max-w-md text-xs leading-relaxed text-[color:var(--wariba-on-dark-dim)]">
                Les parcours sont consultables. Le paiement ouvrira plus tard.
              </p>
            </div>
          )}
        </div>

        <div className="hidden justify-self-end lg:block">
          <AccountToken
            sizeCode={selected.sizeCode}
            family={FAMILY_TOKEN[selected.productFamily]}
            width={160}
          />
        </div>
      </div>
    </section>
  );
}
