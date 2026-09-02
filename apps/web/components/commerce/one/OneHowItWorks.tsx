import type { CSSProperties } from 'react';
import { Reveal } from '../../motion/Reveal';
import { DrawPath } from '../../motion/DrawPath';
import { FAMILY_ACCENT_VARS } from '../offer-ui';

/**
 * Unlike the hero's pathway — where the line is a generic system shape and
 * only the "Évaluation" node is ONE's own state — every node here IS the
 * concrete ONE lifecycle, not shared chrome. The whole section gets ONE's
 * copper rather than a partial split.
 */
const ONE_ACCENT = FAMILY_ACCENT_VARS.WARIBA_ONE as CSSProperties;

interface Step {
  index: string;
  title: string;
  body: string;
}

/**
 * The real WARIBA ONE lifecycle, not a generic four-step template.
 *
 * "Progressez par cycles" used to fill step 04 — that is what happens
 * *inside* Performance, after ONE is already complete, not something a
 * visitor needs to understand before buying. Step 04 now stops exactly
 * where ONE's own job ends: the Performance account gets created.
 */
const ONE_STEPS: readonly Step[] = [
  {
    index: '01',
    title: 'Choisissez votre taille',
    body: 'Paiement unique.',
  },
  {
    index: '02',
    title: 'Tradez l’Évaluation',
    body: 'Dans WariX, selon les règles ONE.',
  },
  {
    index: '03',
    title: 'Remplissez les conditions',
    body: 'Objectif atteint, règles respectées.',
  },
  {
    index: '04',
    title: 'Passez en Performance',
    body: 'Après finalisation, sans activation.',
  },
];

/** x-centre of each of the 4 grid columns, in the line's own 0–1200 viewBox. */
const NODE_X = [150, 450, 750, 1050] as const;

export function OneHowItWorks() {
  return (
    <section className="commerce-band" style={ONE_ACCENT}>
      <div className="commerce-shell py-20 lg:py-24">
        <Reveal>
          <p className="commerce-kicker">WARIBA ONE · Comment ça marche</p>
          <h2 className="commerce-section-title mt-5">
            De ONE à Performance.
            <span className="block">En quatre étapes.</span>
          </h2>
        </Reveal>

        {/* Desktop: the line is the object — a continuous path with a node
            per step, not four identical cards. */}
        <div className="relative mt-16 hidden lg:block">
          <svg
            viewBox="0 0 1200 8"
            preserveAspectRatio="none"
            className="absolute left-0 top-6 h-2 w-full overflow-visible"
            aria-hidden="true"
          >
            <DrawPath
              d="M40 4 H 1160"
              stroke="var(--commerce-rule-strong)"
              strokeWidth={2}
              length={1200}
              duration={1.1}
            />
            <defs>
              <radialGradient id="one-step-node-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--commerce-accent)" stopOpacity="0.45" />
                <stop offset="100%" stopColor="var(--commerce-accent)" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/*
             * Static, not sequentially animated: an SMIL `<animate>` here
             * would ignore `prefers-reduced-motion` entirely (unlike
             * `DrawPath`'s CSS-driven line, which already respects it), and
             * a decorative node marker isn't worth that accessibility gap.
             */}
            {NODE_X.map((x) => (
              <g key={x}>
                <circle cx={x} cy={4} r={18} fill="url(#one-step-node-glow)" />
                <circle cx={x} cy={4} r={5} fill="var(--commerce-accent)" />
              </g>
            ))}
          </svg>

          <ol className="relative grid gap-5 pt-14 lg:grid-cols-4">
            {ONE_STEPS.map((step, position) => (
              <Reveal as="li" key={step.index} delay={0.1 + position * 0.08}>
                <span className="font-mono text-xs font-bold text-[color:var(--commerce-accent-text)]">
                  {step.index}
                </span>
                <h3 className="mt-3 text-base font-semibold uppercase tracking-[0.04em] text-[color:var(--commerce-text)]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--commerce-text-dim)]">
                  {step.body}
                </p>
              </Reveal>
            ))}
          </ol>
        </div>

        {/* Mobile: a vertical progression, not four squeezed columns. */}
        <ol className="relative mt-12 space-y-8 lg:hidden">
          <span
            aria-hidden="true"
            className="absolute bottom-2 left-[7px] top-2 w-px bg-[color:var(--commerce-rule-strong)]"
          />
          {ONE_STEPS.map((step, position) => (
            <Reveal as="li" key={step.index} delay={0.08 + position * 0.08} className="relative pl-8">
              <span
                aria-hidden="true"
                className="absolute left-0 top-1 size-[15px] rounded-full border-2 border-[color:var(--commerce-canvas)] bg-[color:var(--commerce-accent)]"
              />
              <span className="font-mono text-xs font-bold text-[color:var(--commerce-accent-text)]">
                {step.index}
              </span>
              <h3 className="mt-1 text-base font-semibold text-[color:var(--commerce-text)]">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--commerce-text-dim)]">
                {step.body}
              </p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
