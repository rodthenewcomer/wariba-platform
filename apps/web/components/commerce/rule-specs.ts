import type { CanonicalOfferReadModel } from '@wariba/application';
import { formatMultiple, formatNominal, formatRate, formatRateAsSimulatedAmount } from './offer-ui';

export type DisplayMode = 'percent' | 'amount';

/**
 * A specification line, resolved.
 *
 * `tone` carries meaning, not decoration: the accent marks the figure that
 * defines the product (the target, or the entry rule for INSTANT), red marks
 * the one that ends an account. Everything else stays neutral, because six
 * coloured pills in a column is a palette, not a language.
 *
 * `convertible` marks the handful of rows that are a percentage *of the
 * nominal account size* — those are the only ones the percent/amount
 * toggle may legally re-render as a simulated-unit amount. `payoutSplitSchedule`
 * is a percentage of realised *profit*, not of the nominal, so it is never
 * convertible — showing it as a nominal-derived amount would be a real
 * factual error, not a display preference.
 */
export interface Spec {
  key: string;
  label: string;
  value: string;
  tone?: 'accent' | 'emerald' | 'amber';
  /** A list rather than a figure — allowed to wrap on a narrow screen. */
  wrap?: true;
  convertible?: true;
}

/**
 * Splits the resolved rule set into two layers rather than one flat list.
 *
 * PRIMARY is what determines the initial commercial decision — the account
 * definition and, for Evaluation-entry families, the pass/fail limits.
 * PERFORMANCE is what applies once trading on Performance — buffer,
 * exposure, days required, payout split. For INSTANT there is no
 * Evaluation layer to prioritise over Performance, but the two-group shape
 * stays the same for every family: one shared rendering path, no
 * family-specific branching beyond what `entryPhase`/`evaluationRules`
 * already carry.
 */
export function buildSpecs(
  offer: CanonicalOfferReadModel,
  displayMode: DisplayMode,
): { primary: Spec[]; performance: Spec[] } {
  const evaluation = offer.evaluationRules;
  const performance = offer.performanceRules;
  const nominal = offer.nominalBalance;

  const rate = (value: string): string =>
    displayMode === 'amount' ? formatRateAsSimulatedAmount(value, nominal) : formatRate(value);

  const primary: Spec[] = [
    { key: 'nominal', label: 'Compte simulé', value: formatNominal(nominal) },
    {
      key: 'entry',
      label: 'Départ',
      value: offer.entryPhase === 'evaluation' ? 'Évaluation' : 'Performance directe',
      /* INSTANT's defining fact is that it starts in Performance, so that is
         the line that carries the accent for it. ONE and FLEX spend their
         accent on the target instead. */
      ...(offer.entryPhase === 'performance' ? { tone: 'accent' as const } : {}),
    },
    ...(evaluation
      ? [
          {
            key: 'target',
            label: 'Objectif de performance',
            value: rate(evaluation.profitTargetRate),
            tone: 'accent' as const,
            convertible: true as const,
          },
        ]
      : []),
    {
      key: 'daily',
      label: 'Limite quotidienne',
      value: rate(evaluation?.dailyLossRate ?? performance.dailyLossRate),
      convertible: true,
    },
    {
      key: 'maxloss',
      label: 'Perte maximale',
      value: rate(evaluation?.maximumLossRate ?? performance.maximumLossRate),
      convertible: true,
    },
    {
      key: 'bestday',
      label: 'Meilleure journée',
      value: rate(evaluation?.bestDayMaximumRate ?? performance.bestDayMaximumRate),
      convertible: true,
    },
  ];

  const performanceSpecs: Spec[] = [
    {
      key: 'reserve',
      label: 'Réserve de sécurité',
      value: rate(performance.permanentBufferRate),
      convertible: true,
    },
    {
      key: 'exposure',
      label: 'Exposition totale',
      value: formatMultiple(performance.grossExposureMaximumMultiple),
    },
    {
      key: 'days',
      label: 'Journées Performance',
      value: `${performance.performanceDaysRequired}`,
    },
    {
      key: 'split',
      label: 'Part conservée',
      value: performance.payoutSplitSchedule.map((share) => formatRate(share)).join(' · '),
      tone: 'emerald',
      wrap: true,
    },
  ];

  return { primary, performance: performanceSpecs };
}
