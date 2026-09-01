'use client';

import { motion } from 'motion/react';
import { ChevronDownIcon } from '@wariba/ui';
import type { CanonicalOfferReadModel } from '@wariba/application';
import type { Spec } from './rule-specs';
import { formatXof } from './offer-ui';

interface RuleSurfaceProps {
  offer: CanonicalOfferReadModel;
  primary: readonly Spec[];
  performance: readonly Spec[];
  flashed: ReadonlySet<string>;
  performanceExpanded: boolean;
  onTogglePerformance: () => void;
  reduced: boolean;
}

function SpecRow({ spec, flashed }: { spec: Spec; flashed: ReadonlySet<string> }) {
  return (
    <div className="commerce-spec-row">
      <dt className="commerce-spec-label">{spec.label}</dt>
      <dd>
        <span
          className="commerce-spec-value"
          data-tone={spec.tone}
          data-wrap={spec.wrap ? 'true' : undefined}
          data-flash={flashed.has(spec.key) ? 'true' : undefined}
        >
          {spec.value}
        </span>
      </dd>
    </div>
  );
}

/**
 * The two-layer rule surface — Evaluation-relevant rules always visible,
 * Performance rules (buffer, exposure, days, payout split) collapsed by
 * default behind one control. `resolved-rules` stays on the primary `<dl>`
 * for continuity with any future test that reaches for it by that testid.
 *
 * Between the two layers sits a phase transition, not just more rows: a
 * labelled divider ("what changes after you pass"), and for FLEX — the one
 * family where a second real payment sits between Evaluation and
 * Performance — an explicit Activation block with its own figure, so that
 * step is never demoted to a Decision Card footnote. The expanded
 * Performance panel itself sits on a slightly recessed surface rather than
 * plain background, so opening it reads as moving into another phase of
 * the product, not as unhiding more of the same list.
 */
export function RuleSurface({
  offer,
  primary,
  performance,
  flashed,
  performanceExpanded,
  onTogglePerformance,
  reduced,
}: RuleSurfaceProps) {
  const isFlex = offer.productFamily === 'WARIBA_FLEX';
  const performanceCaption =
    offer.entryPhase === 'evaluation'
      ? 'Ce qui change après validation.'
      : 'Le détail complet du compte Performance.';

  return (
    <div>
      <dl data-testid="resolved-rules">
        {primary.map((spec) => (
          <SpecRow key={spec.key} spec={spec} flashed={flashed} />
        ))}
      </dl>

      {isFlex ? (
        <div
          className="mt-6 rounded-[var(--wariba-radius-lg)] border px-4 py-3.5"
          style={{
            borderColor: 'var(--commerce-accent-edge)',
            background: 'var(--commerce-accent-wash)',
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--commerce-accent-text)' }}
          >
            Activation
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--wariba-color-ink-100)]">
            Payable uniquement après réussite et vérification de l’évaluation, montant figé dès
            l’achat :{' '}
            <strong className="font-mono font-bold text-[color:var(--wariba-accent-emerald)]">
              {formatXof(offer.activationPrice)}
            </strong>
          </p>
        </div>
      ) : null}

      <div className="mt-6 border-t border-[color:var(--commerce-rule)] pt-5">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--wariba-color-ink-200)]">
          Performance
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[color:var(--wariba-color-ink-300)]">
          {performanceCaption}
        </p>

        <button
          type="button"
          onClick={onTogglePerformance}
          aria-expanded={performanceExpanded}
          aria-controls="performance-rules-panel"
          className="wariba-focus-ring mt-3 flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-[color:var(--wariba-brand-300)] transition-colors hover:text-[color:var(--wariba-brand-200)]"
        >
          {performanceExpanded ? 'Masquer les règles Performance' : 'Voir les règles Performance'}
          <ChevronDownIcon
            size="sm"
            className={`transition-transform duration-200 ${performanceExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        <motion.div
          id="performance-rules-panel"
          initial={false}
          animate={{
            height: performanceExpanded ? 'auto' : 0,
            opacity: performanceExpanded ? 1 : 0,
          }}
          transition={{ duration: reduced ? 0 : 0.24, ease: [0.2, 0, 0, 1] }}
          className="overflow-hidden"
        >
          <dl className="mt-4 rounded-[var(--wariba-radius-lg)] bg-[color:var(--commerce-well)] px-4 py-1">
            {performance.map((spec) => (
              <SpecRow key={spec.key} spec={spec} flashed={flashed} />
            ))}
          </dl>
        </motion.div>
      </div>
    </div>
  );
}
