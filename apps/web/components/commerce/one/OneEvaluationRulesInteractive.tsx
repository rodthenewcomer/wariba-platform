'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, RiskCorridor } from '@wariba/ui';
import { Reveal } from '../../motion/Reveal';

export interface RuleOption {
  id: 'objectif' | 'quotidienne' | 'maximale' | 'meilleureJournee';
  label: string;
  figure: string;
  /** Omitted for Meilleure journée — it has no fixed nominal amount to show. */
  amountLabel?: string;
  explanation: string;
}

/** Always exactly the four Evaluation rules — a fixed tuple so `rules[0]` never needs a guard. */
export type FourRuleOptions = readonly [RuleOption, RuleOption, RuleOption, RuleOption];

interface CorridorLabels {
  floorLabel: string;
  targetLabel: string;
}

interface PerformancePreview {
  reserve: string;
  performanceDays: string;
  shareRange: string;
}

interface OneEvaluationRulesInteractiveProps {
  rulesAnchor: string;
  sizeLabel: string;
  rules: FourRuleOptions;
  corridor: CorridorLabels;
  performance: PerformancePreview;
}

/**
 * The educational rule selector — not a configurator. Each rule gets its own
 * visual model on the right; the Maximum Loss corridor used to render
 * regardless of which tab was selected, which told two different stories at
 * once when e.g. "Meilleure journée" was active. It has no fixed position
 * between a floor and a target at all — see `RuleVisual` below — so it gets
 * an honest explanation instead of a borrowed bar.
 */
export function OneEvaluationRulesInteractive({
  rulesAnchor,
  sizeLabel,
  rules,
  corridor,
  performance,
}: OneEvaluationRulesInteractiveProps) {
  const [selectedId, setSelectedId] = useState<RuleOption['id']>('maximale');
  const selected = rules.find((rule) => rule.id === selectedId) ?? rules[0];

  return (
    <section id={rulesAnchor}>
      <div className="commerce-shell py-20 lg:py-24">
        <Reveal>
          <p className="commerce-kicker">Règles de l’Évaluation</p>
          <h2 className="commerce-section-title mt-5">Vos limites, avant votre premier trade.</h2>
          <p className="commerce-lead mt-4 max-w-2xl">
            Objectif, limite quotidienne, perte maximale et Meilleure journée : les règles
            applicables sont visibles avant de commencer.
          </p>
        </Reveal>

        <Reveal delay={0.06}>
          <div
            role="tablist"
            aria-label="Choisir une règle de l’Évaluation"
            className="mt-8 flex flex-wrap gap-2"
          >
            {rules.map((rule) => (
              <button
                key={rule.id}
                type="button"
                role="tab"
                aria-selected={rule.id === selected.id}
                onClick={() => setSelectedId(rule.id)}
                className={
                  rule.id === selected.id
                    ? 'rounded-full border border-[color:var(--commerce-accent-edge)] bg-[color:var(--commerce-accent-wash)] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[color:var(--commerce-accent-text)]'
                    : 'rounded-full border border-[color:var(--commerce-rule)] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[color:var(--commerce-text-dim)] transition hover:border-[color:var(--commerce-rule-strong)] hover:text-[color:var(--commerce-text)]'
                }
              >
                {rule.label}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="commerce-panel mt-6 grid gap-8 border border-[color:var(--commerce-accent-edge)] p-6 sm:p-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--commerce-accent-text)]">
                {selected.label}
              </p>
              <p className="commerce-rule-figure mt-3 text-[color:var(--commerce-text)]">
                {selected.figure}
              </p>
              {selected.amountLabel ? (
                <p className="mt-1 font-mono text-sm text-[color:var(--commerce-text-dim)]">
                  {selected.amountLabel}
                </p>
              ) : null}
              <p className="mt-4 max-w-md text-sm leading-relaxed text-[color:var(--commerce-text-dim)]">
                {selected.explanation}
              </p>
            </div>

            <RuleVisual rule={selected} sizeLabel={sizeLabel} corridor={corridor} />
          </div>
        </Reveal>

        <Reveal delay={0.16} className="mt-14">
          <div className="border-t border-[color:var(--commerce-rule)] pt-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--commerce-text-dim)]">
              Après réussite
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-[color:var(--commerce-text)]">
              Les règles changent en Performance.
            </h3>
            <dl className="mt-6 grid gap-px overflow-hidden rounded-[var(--wariba-radius-2xl)] border border-[color:var(--commerce-rule)] bg-[color:var(--commerce-rule)] sm:grid-cols-3">
              {[
                ['Réserve de sécurité', performance.reserve],
                ['Journées Performance', performance.performanceDays],
                ['Part conservée', performance.shareRange],
              ].map(([label, value]) => (
                <div key={label} className="commerce-stat">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <Link href="/programme" className="commerce-secondary-action mt-6">
              Comprendre Performance
              <ArrowRightIcon size="sm" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function RuleVisual({
  rule,
  sizeLabel,
  corridor,
}: {
  rule: RuleOption;
  sizeLabel: string;
  corridor: CorridorLabels;
}) {
  if (rule.id === 'maximale') {
    return (
      <div>
        <p className="text-sm font-semibold text-[color:var(--commerce-text)]">
          Votre corridor, taille {sizeLabel}
        </p>
        <p className="mt-1 text-sm text-[color:var(--commerce-text-dim)]">
          À gauche la limite qui met fin au compte, à droite l’objectif. La bande ambrée est la
          Limite quotidienne : elle avertit, elle ne clôt pas.
        </p>
        <RiskCorridor
          className="mt-6"
          floorLabel={corridor.floorLabel}
          targetLabel={corridor.targetLabel}
          floorCaption="Perte maximale"
          targetCaption="Objectif"
          positionPercent={34}
          dailyBandPercent={26}
          currentLabel="Exemple de règle — pas un compte réel"
        />
      </div>
    );
  }

  if (rule.id === 'objectif' || rule.id === 'quotidienne') {
    const tone = rule.id === 'quotidienne' ? 'var(--wariba-accent-amber)' : 'var(--commerce-accent)';
    const examplePercent = rule.id === 'quotidienne' ? 40 : 62;
    return (
      <div>
        <p className="text-sm font-semibold text-[color:var(--commerce-text)]">
          {rule.label}, taille {sizeLabel}
        </p>
        <p className="mt-1 text-sm text-[color:var(--commerce-text-dim)]">
          Une position illustrative entre 0 et {rule.label.toLowerCase()} — pas un compte réel.
        </p>
        <div className="mt-6">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-mono text-[color:var(--commerce-text-dim)]">0</span>
            <span className="font-mono font-semibold text-[color:var(--commerce-text)]">
              {rule.amountLabel}
            </span>
          </div>
          <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--wariba-track)]">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${examplePercent}%`, background: tone }}
            />
          </div>
          <p className="mt-2 text-xs text-[color:var(--commerce-text-dim)]">
            Exemple de position — pas un compte réel
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-semibold text-[color:var(--commerce-text)]">
        Pas de position fixe à montrer ici
      </p>
      <p className="mt-1 text-sm text-[color:var(--commerce-text-dim)]">
        La Meilleure journée compare vos journées de trading entre elles une fois le compte actif
        — elle n’a pas de seuil unique entre un plancher et un objectif comme les trois autres
        règles, donc pas de barre illustrative avant de commencer à trader.
      </p>
    </div>
  );
}
