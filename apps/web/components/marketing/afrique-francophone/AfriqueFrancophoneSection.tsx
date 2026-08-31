import Link from 'next/link';
import { ArrowRightIcon } from '@wariba/ui';
import { Reveal } from '../../motion/Reveal';
import { RegionalMap } from './RegionalMap';
import { RIBBON_COUNTRIES } from './afrique-francophone-data';

const VALUE_RAIL = [
  { label: 'Français d’abord', body: 'Une expérience claire' },
  { label: '6 marchés prioritaires', body: 'Une vision régionale' },
  { label: 'WARIBA', body: 'Une même expérience' },
] as const;

/**
 * Section 09 — Afrique francophone.
 *
 * Rebuilt from a first pass that read as a technical network diagram in a
 * bordered card next to a generic marketing column. The idea now: the
 * region itself — real West African geography, not abstract nodes — *is*
 * the section's atmosphere, and the copy sits close against it rather than
 * in a separate panel. What stays true from the first pass: no claim of a
 * local office, a regulated presence, or a support desk in any of the six
 * markets — the language stays in the register of focus and intention
 * ("marchés prioritaires", "une expérience... pensée en français"). See
 * `afrique-francophone-geo.ts` for what the map's geography does and
 * doesn't claim.
 */
export function AfriqueFrancophoneSection() {
  return (
    <section
      aria-labelledby="afrique-francophone-title"
      className="relative isolate overflow-hidden bg-[color:var(--wariba-color-carbon-980)] py-20 lg:flex lg:min-h-[92vh] lg:items-center lg:py-24"
    >
      <div className="mx-auto w-full max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)]">
        <div className="s09-grid">
          <div className="s09-grid-map">
            <Reveal>
              <RegionalMap />
            </Reveal>
          </div>

          <Reveal delay={0.1} className="s09-grid-header">
            <p className="wariba-eyebrow">Afrique francophone</p>
            <h2
              id="afrique-francophone-title"
              className="wariba-section-title s09-headline mt-5 max-w-[27ch]"
            >
              De Dakar à Cotonou, une même expérience WARIBA.
            </h2>
            <p className="wariba-lead mt-5 max-w-[30rem]">
              Une plateforme pensée en français, avec une expérience moderne et des parcours clairs
              pour les traders d’Afrique de l’Ouest francophone.
            </p>
          </Reveal>

          <Reveal delay={0.16} className="s09-grid-extras">
            <ul className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-3">
              {VALUE_RAIL.map((item) => (
                <li key={item.label}>
                  <p className="flex items-center gap-2 font-mono text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[color:var(--wariba-brand-300)]">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-[color:var(--wariba-color-cobalt-300)]"
                    />
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--wariba-on-dark-muted)]">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>

            <p className="mt-7 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--wariba-on-dark-dim)]">
              {RIBBON_COUNTRIES.join(' · ')}
            </p>

            <Link href="/afrique-francophone" className="s09-cta wariba-cta-secondary mt-8">
              <span className="s09-cta-frame" aria-hidden="true" />
              Découvrir notre vision
              <span className="s09-cta-arrow inline-flex">
                <ArrowRightIcon size="sm" />
              </span>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
