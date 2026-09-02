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
      <div className="commerce-shell pb-14 pt-10 sm:pb-20 sm:pt-16 lg:pb-28 lg:pt-24">
        {/* `max-w-3xl`, not the usual `max-w-2xl`: at this font size "Un seul
            paiement." alone measures ~740px, so a narrower column was the
            actual reason it broke into two lines — `commerce-display`'s own
            15ch cap was never the bottleneck. `commerce-lead` still caps
            itself at 62ch regardless, so the paragraph doesn't widen with it. */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="commerce-kicker justify-center">WARIBA ONE · ÉVALUATION</p>
          <h1 className="commerce-display mx-auto mt-5 sm:mt-6">
            Une évaluation.
            <span className="block">Un seul paiement.</span>
          </h1>
          <p className="commerce-lead mx-auto mt-4 sm:mt-6">
            Choisissez votre taille, respectez l’objectif et les limites applicables, puis
            progressez vers WARIBA Performance si les conditions sont remplies. Aucun frais
            d’activation après réussite.
          </p>
          <p className="mt-3 text-sm text-[color:var(--commerce-text-dim)] sm:mt-4">
            Trading simulé · Paiement unique · Prix en FCFA
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3 sm:mt-9" style={ONE_ACCENT}>
            <Link href={`#${configuratorAnchor}`} className="commerce-primary-action">
              Choisir ONE
              <ArrowRightIcon size="sm" />
            </Link>
            <Link href={`#${rulesAnchor}`} className="commerce-secondary-action">
              Voir les règles
            </Link>
          </div>
        </div>

        {/* Mobile trims ~20% of this hero's height versus the original
            spacing here — same content, tighter rhythm, so proof of product
            (How It Works) arrives sooner on a small screen. */}
        <Reveal delay={0.1} className="mt-9 sm:mt-14 lg:mt-16">
          <ul className="mx-auto flex max-w-2xl flex-wrap justify-center gap-x-8 gap-y-2 border-t border-[color:var(--commerce-rule)] pt-5 sm:gap-y-3 sm:pt-6">
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

        <Reveal delay={0.18} className="mt-8 sm:mt-12 lg:mt-14">
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
 *
 * Two variants, not one squashed via CSS: an earlier version compressed
 * mobile height by stretching this same curve non-uniformly, which read as
 * steeper on mobile than on desktop and ovalled the circular nodes. This
 * draws a genuinely flatter hump for mobile — same shape, less amplitude —
 * so nothing distorts at either size.
 */
const ONE_STEP_CURVE = {
  mobile: { d: 'M40 120 C 210 120, 250 78, 450 78 S 690 120, 860 120', viewBox: '0 20 900 130', peakY: 78, nodeY: 120 },
  desktop: {
    d: 'M40 150 C 210 150, 250 40, 450 40 S 690 150, 860 150',
    viewBox: '0 -20 900 210',
    peakY: 40,
    nodeY: 150,
  },
} as const;

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
        <span aria-hidden="true" className="h-3 w-px bg-[color:var(--wariba-accent-copper-edge)] sm:h-5" />
      </div>

      <div className="sm:hidden">
        <OneStepArc {...ONE_STEP_CURVE.mobile} id="mobile" glowRadius={40} />
      </div>
      <div className="hidden sm:block">
        <OneStepArc {...ONE_STEP_CURVE.desktop} id="desktop" glowRadius={55} />
      </div>

      <div className="mt-2 flex items-start justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--commerce-text-dim)]">
        <span className="max-w-[8rem] text-left">Paiement unique</span>
        <span className="max-w-[8rem] text-center text-[color:var(--commerce-text)]">Évaluation</span>
        <span className="max-w-[8rem] text-right">Performance</span>
      </div>
    </div>
  );
}

/**
 * `preserveAspectRatio` stays at its default (uniform scaling) — the curve
 * must scale evenly across the width it's given, or the hump reads as a
 * different steepness than it was drawn at. The aspect ratio is set via
 * inline style rather than a Tailwind `aspect-[...]` class because it's
 * computed from `viewBox` here, not a static string Tailwind's scanner
 * could pick up.
 */
function OneStepArc({
  id,
  d,
  viewBox,
  peakY,
  nodeY,
  glowRadius,
}: {
  id: string;
  d: string;
  viewBox: string;
  peakY: number;
  nodeY: number;
  glowRadius: number;
}) {
  const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
  const glowId = `one-step-peak-glow-${id}`;

  return (
    <div className="w-full" style={{ aspectRatio: `${vbWidth} / ${vbHeight}` }}>
      <svg viewBox={viewBox} className="h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--wariba-accent-copper)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--wariba-accent-copper)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* The one step, illuminated — a soft halo, not a second geometry. */}
        <circle cx="450" cy={peakY} r={glowRadius} fill={`url(#${glowId})`} />

        {/* A blurred duplicate under the crisp line, for depth without a filter chain. */}
        <path
          d={d}
          fill="none"
          stroke="var(--commerce-accent)"
          strokeWidth={10}
          strokeLinecap="round"
          opacity={0.16}
          style={{ filter: 'blur(6px)' }}
        />

        <DrawPath d={d} stroke="var(--commerce-accent)" strokeWidth={2.5} length={1100} duration={1.15} />

        <circle cx="40" cy={nodeY} r="6" fill="var(--commerce-text-dim)" />
        <circle cx="450" cy={peakY} r="7" fill="var(--wariba-accent-copper)" />
        <circle cx="860" cy={nodeY} r="6" fill="var(--commerce-text-dim)" />
      </svg>
    </div>
  );
}
