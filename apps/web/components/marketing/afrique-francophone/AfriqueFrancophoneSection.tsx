import Link from 'next/link';
import { ArrowRightIcon } from '@wariba/ui';
import { Reveal } from '../../motion/Reveal';
import { RegionalMap } from './RegionalMap';
import { RIBBON_COUNTRIES } from './afrique-francophone-data';

const MICRO_MODULES = [
  {
    title: 'Français d’abord',
    body: 'Une expérience pensée pour être claire et lisible.',
  },
  {
    title: '6 marchés prioritaires',
    body: 'Une vision régionale ciblée, pas un message générique.',
  },
  {
    title: 'Une même expérience WARIBA',
    body: 'Une identité produit moderne, cohérente et ambitieuse.',
  },
] as const;

/**
 * Section 09 — Afrique francophone.
 *
 * Not an "about us, offices and headcount" section — WARIBA has neither to
 * show truthfully. What is true and worth saying: the product is being
 * built with a specific region and language in mind. So the copy stays in
 * the register of focus and intention (marchés prioritaires, une
 * expérience pensée d'abord en français) and never claims a local office, a
 * regulated presence, or a support desk in any of the six markets the map
 * highlights — see `afrique-francophone-data.ts` for what the map itself
 * does and doesn't claim.
 */
export function AfriqueFrancophoneSection() {
  return (
    <section
      aria-labelledby="afrique-francophone-title"
      className="relative isolate overflow-hidden bg-[color:var(--wariba-color-carbon-980)] py-20 lg:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_18%_40%,color-mix(in_srgb,var(--wariba-brand-700)_16%,transparent),transparent_55%)]"
      />

      <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)]">
        <div className="s09-grid">
          <Reveal className="s09-grid-header">
            <p className="wariba-eyebrow">Afrique francophone</p>
            <h2 id="afrique-francophone-title" className="wariba-section-title mt-5 max-w-[16ch]">
              Pensé pour les traders
              <br />
              d’Afrique francophone.
            </h2>
            <p className="wariba-lead mt-5 max-w-[34rem]">
              WARIBA se construit avec une attention particulière pour la Côte d’Ivoire, le Bénin,
              le Togo, le Mali, le Burkina Faso et le Sénégal — avec une expérience claire, moderne
              et pensée d’abord en français.
            </p>
          </Reveal>

          <Reveal delay={0.08} className="s09-grid-map">
            <RegionalMap />
          </Reveal>

          <Reveal delay={0.14} className="s09-grid-extras">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {MICRO_MODULES.map((module) => (
                <div key={module.title} className="wariba-visual-card p-4 sm:p-5" data-variant="quiet">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[color:var(--wariba-brand-300)]">
                    {module.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
                    {module.body}
                  </p>
                </div>
              ))}
            </div>

            <ul className="mt-6 flex flex-wrap gap-2">
              {RIBBON_COUNTRIES.map((country) => (
                <li key={country}>
                  <span className="wariba-visual-card-interactive inline-flex items-center gap-1.5 rounded-full border border-[color:var(--wariba-seam)] bg-[color:var(--wariba-surface-1)] px-3 py-1.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[color:var(--wariba-on-dark-muted)] transition-colors duration-200">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-[color:var(--wariba-brand-400)]" />
                    {country}
                  </span>
                </li>
              ))}
            </ul>

            <Link href="/afrique-francophone" className="wariba-cta-secondary mt-7">
              Découvrir notre vision pour l’Afrique francophone
              <ArrowRightIcon size="sm" />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
