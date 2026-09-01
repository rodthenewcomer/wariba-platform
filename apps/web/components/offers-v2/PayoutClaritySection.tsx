'use client';

import Link from 'next/link';
import { ArrowRightIcon, CheckIcon } from '@wariba/ui';
import { trackCommerceEvent } from '../commerce/commerce-analytics';

const STEPS = [
  'Conditions remplies',
  'Vérification si applicable',
  'Demande',
  'Revue',
  'Traitement',
  'Payé',
];

/**
 * Section 08 — Performance / Payout Clarity. "What happens if I succeed?" —
 * canonical status vocabulary (En revue / Approuvé / En traitement / Payé),
 * no invented payout timelines.
 */
export function PayoutClaritySection() {
  return (
    <section className="commerce-band">
      <div className="commerce-shell py-16 lg:py-20">
        <p className="commerce-kicker">Après le succès</p>
        <h2 className="commerce-section-title mt-5 max-w-2xl">
          Ce qui se passe si vous réussissez.
        </h2>

        <div className="mt-9 flex flex-wrap items-center gap-x-2 gap-y-4">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <div className="commerce-panel flex min-h-14 items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold text-[color:var(--wariba-on-dark)]">
                {step === 'Payé' ? (
                  <CheckIcon size="sm" className="text-[color:var(--wariba-accent-emerald)]" />
                ) : null}
                {step}
              </div>
              {index < STEPS.length - 1 ? (
                <ArrowRightIcon
                  size="sm"
                  className="shrink-0 text-[color:var(--wariba-on-dark-dim)]"
                />
              ) : null}
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-xl text-sm leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
          WARIBA Performance reste un environnement simulé. Un payout est un paiement contractuel
          lié au programme et aux règles applicables — pas un rendement généré par l’investissement
          de votre argent.
        </p>

        <Link
          href="/aide/payouts"
          onClick={() => trackCommerceEvent('commerce_payouts_clicked', { ctaLocation: 'payouts' })}
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--wariba-brand-300)] transition-colors hover:text-[color:var(--wariba-brand-200)]"
        >
          Comprendre les payouts
          <ArrowRightIcon size="sm" />
        </Link>
      </div>
    </section>
  );
}
