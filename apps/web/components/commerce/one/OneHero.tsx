import Link from 'next/link';
import { ArrowRightIcon } from '@wariba/ui';
import { Reveal } from '../../motion/Reveal';
import { DrawPath } from '../../motion/DrawPath';

interface OneHeroProps {
  configuratorAnchor: string;
  rulesAnchor: string;
}

const FACTS = ['1 évaluation', 'Paiement unique', '0 frais d’activation', 'Performance après réussite'];

/**
 * WARIBA ONE's own hero — the commercial front door above the shared
 * `ProductJourneyPage` scenes (steps, rule scene, payout ladder,
 * configurator), which stay untouched for every family including ONE.
 *
 * Centered copy, both CTAs together underneath, and a single-arc route
 * illustration below — the ForTraders reference's language for "how many
 * steps", not a product render. One hump on the curve because ONE has one
 * evaluation phase; the shape itself is the argument, not a label.
 */
export function OneHero({ configuratorAnchor, rulesAnchor }: OneHeroProps) {
  return (
    <section className="commerce-hero commerce-ambient">
      <div className="commerce-shell pb-20 pt-16 lg:pb-28 lg:pt-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="commerce-kicker justify-center">WARIBA ONE · ÉVALUATION</p>
          <h1 className="commerce-display mx-auto mt-6">
            Une évaluation.
            <span className="block">Un seul paiement.</span>
          </h1>
          <p className="commerce-lead mx-auto mt-6">
            Choisissez votre taille, respectez l’objectif et les limites applicables, puis
            progressez vers WARIBA Performance si les conditions sont remplies. Aucun frais
            d’activation après réussite.
          </p>
          <p className="mt-4 text-sm text-[color:var(--commerce-text-dim)]">
            Trading simulé · Paiement unique · Prix en FCFA
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href={`#${configuratorAnchor}`} className="commerce-primary-action">
              Choisir ONE
              <ArrowRightIcon size="sm" />
            </Link>
            <Link href={`#${rulesAnchor}`} className="commerce-secondary-action">
              Voir les règles
            </Link>
          </div>
        </div>

        <Reveal delay={0.1} className="mt-14 lg:mt-16">
          <ul className="mx-auto flex max-w-2xl flex-wrap justify-center gap-x-8 gap-y-3 border-t border-[color:var(--commerce-rule)] pt-6">
            {FACTS.map((fact, index) => (
              <li
                key={fact}
                className={
                  index > 0
                    ? 'border-l border-[color:var(--commerce-rule)] pl-8 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--commerce-text-dim)]'
                    : 'text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--commerce-text-dim)]'
                }
              >
                {fact}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.18} className="mt-16 lg:mt-20">
          <OneStepPath />
        </Reveal>
      </div>
    </section>
  );
}

/**
 * One curve, one peak. A 2-step competitor's version of this diagram would
 * draw a second hump — WARIBA ONE never needs to, since there is only ever
 * one evaluation to clear before Performance.
 */
function OneStepPath() {
  return (
    <div className="relative mx-auto max-w-3xl">
      <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full rounded-full border border-[color:var(--commerce-accent-edge)] bg-[color:var(--commerce-accent-wash)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--commerce-accent-text)]">
        1 étape
      </span>

      <svg viewBox="0 0 900 190" preserveAspectRatio="none" className="h-[140px] w-full sm:h-[170px]" aria-hidden="true">
        <DrawPath
          d="M40 150 C 210 150, 250 40, 450 40 S 690 150, 860 150"
          stroke="var(--commerce-accent)"
          strokeWidth={2.5}
          length={1100}
          duration={1.15}
        />
        <circle cx="40" cy="150" r="6" fill="var(--commerce-text-dim)" />
        <circle cx="450" cy="40" r="7" fill="var(--commerce-accent)" />
        <circle cx="860" cy="150" r="6" fill="var(--commerce-text-dim)" />
      </svg>

      <div className="mt-2 flex items-start justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--commerce-text-dim)]">
        <span className="max-w-[8rem] text-left">Paiement unique</span>
        <span className="max-w-[8rem] text-center text-[color:var(--commerce-text)]">Évaluation</span>
        <span className="max-w-[8rem] text-right">Performance</span>
      </div>
    </div>
  );
}
