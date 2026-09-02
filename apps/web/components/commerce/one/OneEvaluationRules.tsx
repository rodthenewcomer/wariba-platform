import type { CanonicalOfferReadModel } from '@wariba/application';
import { buildHelpPolicyFacts } from '@wariba/application';
import { getDb } from '../../../lib/db';
import { formatRate, formatRateAsSimulatedAmount, formatSimulatedAmount } from '../offer-ui';
import { OneEvaluationRulesInteractive, type FourRuleOptions } from './OneEvaluationRulesInteractive';

interface OneEvaluationRulesProps {
  reference: CanonicalOfferReadModel;
  rulesAnchor: string;
}

/**
 * WARIBA ONE's own rules section — replaces the shared "Scène de règle" for
 * ONE only (FLEX/INSTANT keep it). Two corrections this exists to fix:
 *
 * 1. The explanations are read from `buildHelpPolicyFacts`, the Help
 *    Center's own source of truth, instead of being retyped here — the file
 *    that defines it names exactly this failure mode: the same 8% typed into
 *    an article, a FAQ entry and a React component is three places to
 *    disagree the day the policy changes.
 * 2. Evaluation and Performance numbers are rendered as two separate groups.
 *    The old shared layout put "Meilleure journée", "Réserve de sécurité",
 *    "Journées Performance" and "Part finale" in one grid — a prospect could
 *    read that as four things required to pass the Evaluation, when three of
 *    them only apply once ONE is already complete.
 */
export async function OneEvaluationRules({ reference, rulesAnchor }: OneEvaluationRulesProps) {
  const evaluation = reference.evaluationRules;
  if (!evaluation) throw new Error('WARIBA ONE offer is missing evaluation rules.');

  const facts = (await buildHelpPolicyFacts(getDb())).facts;
  const currency = reference.nominalCurrency;

  const rules: FourRuleOptions = [
    {
      id: 'objectif',
      label: 'Objectif',
      figure: formatRate(evaluation.profitTargetRate),
      amountLabel: formatRateAsSimulatedAmount(evaluation.profitTargetRate, reference.nominalBalance),
      explanation: facts.profitTargetRate.explanation,
    },
    {
      id: 'quotidienne',
      label: 'Limite quotidienne',
      figure: formatRate(evaluation.dailyLossRate),
      amountLabel: formatSimulatedAmount(evaluation.dailyLossAmount, currency),
      explanation: facts.dailyLossRate.explanation,
    },
    {
      id: 'maximale',
      label: 'Perte maximale',
      figure: formatRate(evaluation.maximumLossRate),
      amountLabel: formatSimulatedAmount(evaluation.maximumLossAmount, currency),
      explanation: facts.maximumLossRate.explanation,
    },
    {
      id: 'meilleureJournee',
      label: 'Meilleure journée',
      figure: formatRate(evaluation.bestDayMaximumRate),
      explanation: facts.bestDayMaxRatio.explanation,
    },
  ];

  /*
   * Profit target has no canonical amount field of its own, so the target
   * edge is the one figure here derived rather than read straight off the
   * offer — `formatRateAsSimulatedAmount` uses the exact `nominal × rate`
   * formula `canonical-offers.ts` already uses server-side to derive
   * `maximumLossAmount`/`dailyLossAmount` from their own rates. Best Day is
   * different in kind, not just missing a field: it's a ratio over realised
   * trading days, so no rate × nominal reconstructs it, which is why it gets
   * no amount below at all.
   */
  const corridor = {
    floorLabel: `−${formatSimulatedAmount(evaluation.maximumLossAmount, currency)}`,
    targetLabel: `+${formatRateAsSimulatedAmount(evaluation.profitTargetRate, reference.nominalBalance)}`,
  };

  /*
   * `payoutSplitSchedule` progresses cycle over cycle (80/80/85/85/90 for
   * ONE 10K, per the payout ladder already rendered lower on this page) —
   * showing only the last cycle's share as "Part conservée" implied the
   * trader keeps 90% from the very first payout. The range states both
   * ends without inventing a single blended number.
   */
  const schedule = reference.performanceRules.payoutSplitSchedule;
  const firstShare = schedule[0];
  const lastShare = schedule.at(-1);
  const performancePreview = {
    reserve: formatRate(reference.performanceRules.permanentBufferRate),
    performanceDays: `${reference.performanceRules.performanceDaysRequired} par cycle`,
    shareRange:
      firstShare !== undefined && lastShare !== undefined && firstShare !== lastShare
        ? `${formatRate(firstShare)} → ${formatRate(lastShare)}`
        : formatRate(lastShare ?? '0'),
  };

  return (
    <OneEvaluationRulesInteractive
      rulesAnchor={rulesAnchor}
      sizeLabel={reference.sizeCode}
      rules={rules}
      corridor={corridor}
      performance={performancePreview}
    />
  );
}
