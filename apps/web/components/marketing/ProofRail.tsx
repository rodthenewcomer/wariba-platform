'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ArrowRightIcon } from '@wariba/ui';

const ACCOUNT_SIZES = ['5K', '10K', '25K', '50K', '100K'] as const;
const DAY_UNITS = Array.from({ length: 14 }, (_, index) => index + 1);

/** Homepage section 02 — the five claims a visitor can inspect before comparing accounts. */
export function ProofRail() {
  const daysCardRef = useRef<HTMLElement>(null);
  const [hasRevealedDays, setHasRevealedDays] = useState(false);

  useEffect(() => {
    const target = daysCardRef.current;
    if (!target || hasRevealedDays) return;
    let revealTimer: number | undefined;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        observer.disconnect();
        revealTimer = window.setTimeout(() => setHasRevealedDays(true), 180);
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    observer.observe(target);
    return () => {
      observer.disconnect();
      if (revealTimer !== undefined) window.clearTimeout(revealTimer);
    };
  }, [hasRevealedDays]);

  return (
    <section className="proof-rail" aria-labelledby="proof-rail-title" data-testid="proof-rail">
      <header className="proof-rail-heading">
        <p className="wariba-eyebrow">Pourquoi WARIBA</p>
        <h2 id="proof-rail-title" className="wariba-section-title mt-4">
          Moins à payer.
          <span>Moins à attendre.</span>
        </h2>
      </header>

      <div className="proof-rail-grid">
        <article className="proof-card proof-card-price">
          <p className="proof-card-kicker">Premier paiement FLEX</p>
          <p className="proof-price">
            <span>Commencez dès</span>
            <strong>9 900</strong>
            <em>FCFA</em>
          </p>
          <p className="proof-card-copy">Un premier paiement aujourd’hui. Le reste seulement après réussite.</p>
          <div className="proof-price-signature" aria-hidden="true">
            <span>W</span>
            <i />
            <i />
          </div>
        </article>

        <article ref={daysCardRef} className="proof-card proof-card-days">
          <p className="proof-card-kicker">Votre prochain versement</p>
          <h3 className="proof-days-title">
            <strong>5 journées validées.</strong>
            <span>Pas 14.</span>
          </h3>
          <div
            className={`proof-days-visual${hasRevealedDays ? ' is-revealed' : ''}`}
            aria-label="Cinq unités actives parmi quatorze unités de référence"
          >
            {DAY_UNITS.map((day) => (
              <span key={day} className={day <= 5 ? 'is-active' : undefined}>
                {day <= 5 ? day : null}
              </span>
            ))}
          </div>
          <p className="proof-card-note">
            Une journée Performance compte pour votre éligibilité au versement.
          </p>
        </article>

        <article className="proof-card proof-card-rails">
          <p className="proof-card-kicker">Versements locaux</p>
          <div className="proof-payment-route" aria-hidden="true">
            <span>WARIBA</span>
            <i />
            <small>VERSEMENT</small>
          </div>
          <div className="proof-payment-brands">
            <Image src="/brands/payments/wave.png" alt="Wave" width={800} height={450} />
            <Image src="/brands/payments/orange-money.png" alt="Orange Money" width={2958} height={1347} />
          </div>
          <h3>Versements sur Wave et Orange Money</h3>
          <p className="proof-card-note">Selon votre pays.</p>
        </article>

        <article className="proof-card proof-card-sizes">
          <p className="proof-card-kicker">Votre échelle</p>
          <div className="proof-size-stack" aria-label="Tailles de compte de 5K à 100K">
            {ACCOUNT_SIZES.map((size, index) => (
              <span key={size} style={{ '--proof-size-index': index } as CSSProperties}>
                {size}
              </span>
            ))}
          </div>
          <h3>Jusqu’à 100K</h3>
          <p className="proof-card-note">Choisissez la taille qui correspond à votre trading.</p>
        </article>

        <article className="proof-card proof-card-rules">
          <p className="proof-card-kicker">Votre cadre</p>
          <div className="proof-policy-link" aria-hidden="true">
            <span>ONE · 25K</span>
            <i />
            <strong>RÈGLES FIXÉES</strong>
            <b>⌁</b>
          </div>
          <h3>Vos règles restent fixées dès le départ.</h3>
          <p className="proof-card-note">Attachées à votre compte, pas à une promesse.</p>
        </article>
      </div>

      <div className="proof-rail-action">
        <Link href="/offres" className="wariba-cta-primary">
          Comparer les comptes
          <ArrowRightIcon size="sm" />
        </Link>
      </div>
    </section>
  );
}
