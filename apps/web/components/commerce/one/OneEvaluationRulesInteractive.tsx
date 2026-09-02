'use client';

import { useState, type CSSProperties } from 'react';
import { RiskCorridor } from '@wariba/ui';
import { Reveal } from '../../motion/Reveal';
import { FAMILY_ACCENT_VARS } from '../offer-ui';

const ONE_ACCENT = FAMILY_ACCENT_VARS.WARIBA_ONE as CSSProperties;

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

interface OneEvaluationRulesInteractiveProps {
  rulesAnchor: string;
  sizeLabel: string;
  rules: FourRuleOptions;
  corridor: CorridorLabels;
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
}: OneEvaluationRulesInteractiveProps) {
  const [selectedId, setSelectedId] = useState<RuleOption['id']>('maximale');
  const selected = rules.find((rule) => rule.id === selectedId) ?? rules[0];

  return (
    <section id={rulesAnchor} style={ONE_ACCENT}>
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

        {/*
         * Deliberately just one line — the full Performance picture
         * (réserve, Performance Days, éligibilité, ce que vous gardez) has
         * its own section right after this one. Explaining it twice was a
         * side effect of building each section independently; this owns
         * only the fact that the ruleset itself changes.
         */}
        <Reveal delay={0.16} className="mt-14 border-t border-[color:var(--commerce-rule)] pt-8">
          <p className="text-sm text-[color:var(--commerce-text-dim)]">
            Après réussite, un nouveau cadre de règles s’applique en Performance.
          </p>
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
          À gauche la limite, à droite l’objectif. La bande ambrée avertit sans clôturer.
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
          Position illustrative entre 0 et {rule.label.toLowerCase()}.
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
        Elle compare vos journées de trading entre elles une fois le compte actif — pas de seuil
        fixe à illustrer avant de commencer.
      </p>
    </div>
  );
}
