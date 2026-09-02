import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from '@wariba/ui';
import { Reveal } from '../../motion/Reveal';
import { DrawPath } from '../../motion/DrawPath';
import { FAMILY_ACCENT_VARS } from '../offer-ui';

/**
 * `--wariba-ambient-cobalt`'s default bloom is anchored at the top-right
 * corner — right, for the shared hero's asymmetric copy-left/ledger-right
 * split. This hero is centered, so the same off-center glow would sit
 * mostly outside the readable column. Recentring it, at the same size and
 * strength, is a scoped override — FLEX and INSTANT keep the original.
 */
const CENTERED_AMBIENT = {
  '--wariba-ambient-cobalt':
    'radial-gradient(42rem 26rem at 50% -12%, color-mix(in srgb, var(--wariba-color-cobalt-600) 22%, transparent), transparent 68%)',
} as CSSProperties;

/**
 * ONE's own copper, scoped to just the CTA row and the pathway's peak node
 * below — not the whole hero. The connecting line stays WARIBA's system
 * blue on purpose: it's infrastructure (the shape of the journey), while
 * the "Évaluation" node and the buttons are ONE's own product state. Before
 * this, the hero used the site's default blue everywhere while the
 * configurator further down already used copper for ONE — two identities
 * on the same page.
 */
const ONE_ACCENT = FAMILY_ACCENT_VARS.WARIBA_ONE as CSSProperties;

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
    <section className="commerce-hero commerce-ambient" style={CENTERED_AMBIENT}>
      <div className="commerce-shell pb-20 pt-16 lg:pb-28 lg:pt-24">
        {/* `max-w-3xl`, not the usual `max-w-2xl`: at this font size "Un seul
            paiement." alone measures ~740px, so a narrower column was the
            actual reason it broke into two lines — `commerce-display`'s own
            15ch cap was never the bottleneck. `commerce-lead` still caps
            itself at 62ch regardless, so the paragraph doesn't widen with it. */}
        <div className="mx-auto max-w-3xl text-center">
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
          <div className="mt-9 flex flex-wrap justify-center gap-3" style={ONE_ACCENT}>
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

        <Reveal delay={0.18} className="mt-12 lg:mt-14">
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
const ONE_STEP_CURVE = 'M40 150 C 210 150, 250 40, 450 40 S 690 150, 860 150';

function OneStepPath() {
  return (
    <div className="mx-auto max-w-3xl">
      {/* The tag and the peak below are ONE's own copper — the one state on
          this curve that belongs to the product, not to WARIBA's system
          blue the line itself keeps. */}
      <div className="flex flex-col items-center">
        <span className="rounded-full border border-[color:var(--wariba-accent-copper-edge)] bg-[color:var(--wariba-accent-copper-wash)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--wariba-accent-copper)]">
          1 étape
        </span>
        <span aria-hidden="true" className="h-5 w-px bg-[color:var(--wariba-accent-copper-edge)]" />
      </div>

      {/*
       * `preserveAspectRatio` deliberately left at its default (uniform
       * scaling) — the curve's own aspect ratio was designed once, at these
       * exact coordinates, and must scale evenly at every width or the hump
       * reads as steeper on mobile than on desktop.
       */}
      <div className="aspect-[900/210] w-full">
        <svg viewBox="0 -20 900 210" className="h-full w-full" aria-hidden="true">
          <defs>
            <radialGradient id="one-step-peak-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--wariba-accent-copper)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--wariba-accent-copper)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* The one step, illuminated — a soft halo, not a second geometry. */}
          <circle cx="450" cy="40" r="55" fill="url(#one-step-peak-glow)" />

          {/* A blurred duplicate under the crisp line, for depth without a filter chain. */}
          <path
            d={ONE_STEP_CURVE}
            fill="none"
            stroke="var(--commerce-accent)"
            strokeWidth={10}
            strokeLinecap="round"
            opacity={0.16}
            style={{ filter: 'blur(6px)' }}
          />

          <DrawPath
            d={ONE_STEP_CURVE}
            stroke="var(--commerce-accent)"
            strokeWidth={2.5}
            length={1100}
            duration={1.15}
          />

          <circle cx="40" cy="150" r="6" fill="var(--commerce-text-dim)" />
          <circle cx="450" cy="40" r="7" fill="var(--wariba-accent-copper)" />
          <circle cx="860" cy="150" r="6" fill="var(--commerce-text-dim)" />
        </svg>
      </div>

      <div className="mt-2 flex items-start justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--commerce-text-dim)]">
        <span className="max-w-[8rem] text-left">Paiement unique</span>
        <span className="max-w-[8rem] text-center text-[color:var(--commerce-text)]">Évaluation</span>
        <span className="max-w-[8rem] text-right">Performance</span>
      </div>
    </div>
  );
}
