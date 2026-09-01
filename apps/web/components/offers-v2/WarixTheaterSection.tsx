'use client';

import Link from 'next/link';
import { ArrowRightIcon } from '@wariba/ui';
import { WariXProductTeaser } from '../marketing/WariXProductTeaser';
import { trackCommerceEvent } from '../commerce/commerce-analytics';

/**
 * Section 05 — Product Theater. The one section whose job is desire, not
 * decision. Reuses `WariXProductTeaser` — an existing composed product
 * photograph of the real WariX interface, already labelled "Aperçu
 * d'interface · Données simulées" — rather than inventing a new mockup.
 */
export function WarixTheaterSection() {
  return (
    <section className="relative isolate overflow-hidden border-y border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-elevated)] py-16 lg:py-24">
      <div className="mx-auto grid max-w-[var(--wariba-shell-max)] gap-12 px-[var(--wariba-shell-gutter)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <div>
          <p className="commerce-kicker">Le terminal</p>
          <h2 className="commerce-section-title mt-5">
            Votre parcours commence ici.
            <br />
            Votre trading continue dans WariX.
          </h2>
          <p className="mt-5 max-w-md text-[length:var(--wariba-font-size-body-lg)] leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
            Analysez le marché, passez vos ordres et gardez vos limites visibles dans
            l’environnement de trading WARIBA.
          </p>
          <Link
            href="/warix"
            onClick={() =>
              trackCommerceEvent('commerce_warix_clicked', { ctaLocation: 'warix_theater' })
            }
            className="wariba-cta-secondary mt-8"
          >
            Découvrir WariX
            <ArrowRightIcon size="sm" />
          </Link>
        </div>
        <WariXProductTeaser />
      </div>
    </section>
  );
}
