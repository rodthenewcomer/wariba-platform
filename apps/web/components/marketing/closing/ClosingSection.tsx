import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowRightIcon } from '@wariba/ui';
import { Reveal } from '../../motion/Reveal';

interface AccountPassport {
  position: 'left' | 'center' | 'right';
  accent: string;
  title: string;
  line1: string;
  line2?: string;
  delay: number;
}

const PASSPORTS: readonly AccountPassport[] = [
  { position: 'left', accent: 'var(--wariba-brand-400)', title: 'ONE', line1: 'Évaluation', line2: 'Paiement unique', delay: 0 },
  { position: 'center', accent: '#B9B2FF', title: 'FLEX', line1: 'Évaluation', line2: 'Paiement en 2 temps', delay: 120 },
  { position: 'right', accent: 'var(--wariba-accent-cyan)', title: 'INSTANT', line1: 'Performance directe', delay: 240 },
] as const;

/**
 * Section 12 — Clôture.
 *
 * Rebuilt from a generic "rounded card + gradient + two buttons" ending
 * into a scene that shows what the visitor is actually choosing between:
 * ONE, FLEX and INSTANT return one last time as three account-passport
 * objects, not another repeat of the full pathway section. The primary CTA
 * routes to `/offres` — the same canonical comparison route the hero and
 * the original Clôture already used — rather than an invented anchor.
 * "Comment ça marche" is gone from here on purpose: by the last section of
 * the homepage, re-explaining how WARIBA works is redundant; checking the
 * rules before deciding is the one objection still worth addressing, so
 * the secondary CTA goes to `/aide/risque-regles`.
 */
export function ClosingSection() {
  return (
    <section
      aria-labelledby="closing-title"
      className="relative isolate overflow-hidden bg-[color:var(--wariba-color-carbon-980)] py-20 lg:flex lg:min-h-[86vh] lg:items-center lg:py-24"
    >
      <div aria-hidden="true" className="closing-glow" />

      <div className="mx-auto w-full max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] text-center">
        <Reveal>
          <p className="wariba-eyebrow justify-center">À vous de choisir</p>
          <h2 id="closing-title" className="wariba-section-title mx-auto mt-5 max-w-[20ch]">
            Votre parcours commence par un choix clair.
          </h2>
          <p className="wariba-lead mx-auto mt-5 max-w-[34rem]">
            Comparez ONE, FLEX et INSTANT, puis consultez les règles avant de décider.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="closing-passports mt-14 lg:mt-16">
          {PASSPORTS.map((passport) => (
            <div
              key={passport.title}
              className="closing-passport-slot"
              data-position={passport.position}
            >
              <div
                className="closing-passport"
                style={
                  {
                    '--closing-accent': passport.accent,
                    '--closing-delay': `${passport.delay}ms`,
                  } as CSSProperties
                }
              >
                <p className="closing-passport-brand">WARIBA</p>
                <p className="closing-passport-title">{passport.title}</p>
                <p className="closing-passport-line">{passport.line1}</p>
                {passport.line2 ? <p className="closing-passport-subline">{passport.line2}</p> : null}
                <span className="closing-passport-edge" aria-hidden="true" />
              </div>
            </div>
          ))}
        </Reveal>

        <Reveal delay={0.32} className="closing-convergence mt-8 lg:mt-10">
          <span className="closing-convergence-line" aria-hidden="true" />
          <span className="closing-convergence-label">Choisissez votre parcours</span>
        </Reveal>

        <Reveal delay={0.4} className="mt-8 flex flex-col items-center gap-4">
          <Link href="/offres" className="closing-cta wariba-cta-primary">
            <span className="closing-cta-frame" aria-hidden="true" />
            Comparer ONE, FLEX et INSTANT
            <span className="closing-cta-arrow inline-flex">
              <ArrowRightIcon size="sm" />
            </span>
          </Link>
          <Link href="/aide/risque-regles" className="wariba-cta-tertiary">
            Consulter les règles
            <ArrowRightIcon size="sm" />
          </Link>
          <p className="mt-1 text-xs text-[color:var(--wariba-on-dark-dim)]">
            Compte simulé · Règles visibles avant de commencer
          </p>
        </Reveal>
      </div>
    </section>
  );
}
