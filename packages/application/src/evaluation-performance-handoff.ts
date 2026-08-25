import Decimal from 'decimal.js';
import { computePayoutBufferFloor, computePerformanceDayThreshold } from '@wariba/domain';
import { loadPerformanceRulesAcknowledgement, loadPolicyById, type Db } from '@wariba/database';
import type { EvaluationOnePolicyParameters, PerformancePolicyParameters } from '@wariba/policies';
import { accountStatusLabel } from './account-status-labels';

export type EvaluationPerformanceHandoffStage =
  | 'objective_reached'
  | 'finalizing'
  | 'evaluation_passed'
  | 'performance_provisioning'
  | 'rules_onboarding'
  | 'performance_ready';

export type HandoffRuleKey =
  | 'profit_target'
  | 'daily_loss'
  | 'maximum_loss'
  | 'best_day'
  | 'minimum_days'
  | 'performance_days'
  | 'performance_day_threshold'
  | 'buffer'
  | 'payout_split'
  | 'review_cycles';

export interface RuleComparisonItem {
  key: HandoffRuleKey;
  label: string;
  evaluation: { applicable: boolean; displayValue: string | null };
  performance: { applicable: boolean; displayValue: string | null };
  changed: boolean;
}

export interface PerformanceRuleItem {
  key: string;
  label: string;
  displayValue: string;
  explanation: string;
}

export interface PayoutPathStep {
  key: string;
  label: string;
}

export interface HandoffTimelineItem {
  key: string;
  label: string;
  occurredAt: string;
  timestampLabel: string;
}

export interface EvaluationToPerformanceHandoffDTO {
  stage: EvaluationPerformanceHandoffStage;
  evaluationAccount: {
    id: string;
    publicId: string;
    nominalAmount: string;
    currency: string;
    statusLabel: string;
    policyVersionId: string;
    policyVersion: string;
    passedAt: string | null;
  };
  performanceAccount: {
    id: string;
    publicId: string;
    nominalAmount: string;
    currency: string;
    statusLabel: string;
    policyVersionId: string;
    policyVersion: string;
    createdAt: string;
    tradable: boolean;
  } | null;
  handoff: {
    objectiveReachedAt: string | null;
    dailyFinalizedAt: string | null;
    passedAt: string | null;
    performanceCreatedAt: string | null;
    rulesAcknowledgedAt: string | null;
  };
  ruleComparison: readonly RuleComparisonItem[];
  performanceRules: readonly PerformanceRuleItem[];
  payoutPath: readonly PayoutPathStep[];
  buffer: {
    rateFormatted: string;
    amountFormatted: string;
    floorFormatted: string;
  } | null;
  performanceDay: {
    requiredFormatted: string;
    thresholdFormatted: string;
  } | null;
  rulesAcknowledged: boolean;
  timeline: readonly HandoffTimelineItem[];
}

export class EvaluationPerformanceHandoffError extends Error {
  override readonly name = 'EvaluationPerformanceHandoffError';
}

function percent(rate: string | null | undefined): string | null {
  if (!rate) return null;
  const value = new Decimal(rate).times(100).toDecimalPlaces(2).toNumber();
  return `${value.toLocaleString('fr-FR')} %`;
}

function money(amount: string, currency: string): string {
  return `${new Decimal(amount).toDecimalPlaces(2).toNumber().toLocaleString('fr-FR')} ${currency}`;
}

function days(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value === 0) return 'Aucun';
  return `${value} ${value === 1 ? 'journée' : 'journées'}`;
}

function payouts(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return `${value} ${value === 1 ? 'payout' : 'payouts'}`;
}

function timestamp(date: Date): string {
  return date.toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  });
}

function side(applicable: boolean, value: string | null) {
  return { applicable, displayValue: applicable ? (value ?? 'Non publié') : null };
}

function comparison(
  one: EvaluationOnePolicyParameters,
  performance: PerformancePolicyParameters,
): RuleComparisonItem[] {
  const rows: RuleComparisonItem[] = [
    {
      key: 'profit_target',
      label: 'Objectif de profit',
      evaluation: side(true, percent(one.profit_target_rate)),
      performance: side(false, null),
      changed: true,
    },
    {
      key: 'daily_loss',
      label: 'Perte quotidienne',
      evaluation: side(true, percent(one.daily_loss_rate)),
      performance: side(true, percent(performance.daily_loss_rate)),
      changed: one.daily_loss_rate !== performance.daily_loss_rate,
    },
    {
      key: 'maximum_loss',
      label: 'Perte maximale',
      evaluation: side(true, percent(one.maximum_loss_rate)),
      performance: side(true, percent(performance.maximum_loss_rate)),
      changed: one.maximum_loss_rate !== performance.maximum_loss_rate,
    },
    {
      key: 'best_day',
      label: 'Règle du Meilleur Jour',
      evaluation: side(true, percent(one.best_day_max_ratio)),
      performance: side(true, percent(performance.best_day_max_ratio)),
      changed: one.best_day_max_ratio !== performance.best_day_max_ratio,
    },
    {
      key: 'minimum_days',
      label: 'Jours minimums',
      evaluation: side(true, days(one.minimum_trading_days)),
      performance: side(false, null),
      changed: true,
    },
    {
      key: 'performance_days',
      label: 'Journées Performance par demande',
      evaluation: side(false, null),
      performance: side(true, days(performance.performance_days_required_per_payout)),
      changed: true,
    },
    {
      key: 'performance_day_threshold',
      label: 'Seuil d’une journée Performance',
      evaluation: side(false, null),
      performance: side(true, percent(performance.performance_day_threshold_rate)),
      changed: true,
    },
    {
      key: 'buffer',
      label: 'Buffer permanent',
      evaluation: side(false, null),
      performance: side(true, percent(performance.permanent_buffer_rate)),
      changed: true,
    },
    {
      key: 'payout_split',
      label: 'Votre part des gains',
      evaluation: side(false, null),
      performance: side(
        true,
        `${percent(performance.trader_split_rate_default) ?? 'Non publié'} → ${percent(performance.trader_split_rate_final_cycle) ?? 'Non publié'}`,
      ),
      changed: true,
    },
    {
      key: 'review_cycles',
      label: 'Passage vers WARIBA Review',
      evaluation: side(false, null),
      performance: side(true, payouts(performance.max_payout_cycles_before_review)),
      changed: true,
    },
  ];
  return rows;
}

function performanceRules(
  policy: PerformancePolicyParameters,
  nominalAmount: string,
  currency: string,
): PerformanceRuleItem[] {
  const threshold = computePerformanceDayThreshold({
    nominalBalance: nominalAmount,
    performanceDayThresholdRate: policy.performance_day_threshold_rate,
  });
  return [
    {
      key: 'daily_loss',
      label: 'Perte quotidienne',
      displayValue: percent(policy.daily_loss_rate) ?? 'Non publié',
      explanation: 'Atteinte, elle suspend les nouvelles positions jusqu’au prochain reset.',
    },
    {
      key: 'maximum_loss',
      label: 'Perte maximale',
      displayValue: percent(policy.maximum_loss_rate) ?? 'Non publié',
      explanation: 'Le plancher de protection reste calculé par WARIBA à partir de votre compte.',
    },
    {
      key: 'best_day',
      label: 'Règle du Meilleur Jour',
      displayValue: percent(policy.best_day_max_ratio) ?? 'Non publié',
      explanation:
        'Elle mesure la concentration des gains sur le cycle et ne termine pas le compte.',
    },
    {
      key: 'performance_days',
      label: 'Journées Performance',
      displayValue: days(policy.performance_days_required_per_payout) ?? 'Non publié',
      explanation: `Chaque journée comptée doit atteindre ${money(threshold, currency)} de profit net réalisé.`,
    },
    {
      key: 'buffer',
      label: 'Buffer permanent',
      displayValue: percent(policy.permanent_buffer_rate) ?? 'Non publié',
      explanation: 'Il reste dans le compte. Seul l’excédent autorisé au-dessus peut être demandé.',
    },
    {
      key: 'split',
      label: 'Votre part',
      displayValue: `${percent(policy.trader_split_rate_default) ?? 'Non publié'} → ${percent(policy.trader_split_rate_final_cycle) ?? 'Non publié'}`,
      explanation: 'La part applicable dépend du rang de votre cycle.',
    },
  ];
}

export async function buildEvaluationToPerformanceHandoff(
  db: Db,
  params:
    | { userId: string; accountId: string; accountPublicId?: never }
    | { userId: string; accountPublicId: string; accountId?: never },
): Promise<EvaluationToPerformanceHandoffDTO | null> {
  let accountQuery = db
    .selectFrom('app.trading_accounts')
    .selectAll()
    .where('user_id', '=', params.userId);
  accountQuery =
    'accountId' in params
      ? accountQuery.where('id', '=', params.accountId)
      : accountQuery.where('public_id', '=', params.accountPublicId);
  const selected = await accountQuery.executeTakeFirst();
  if (!selected) return null;

  const evaluation =
    selected.program_type === 'WARIBA_ONE'
      ? selected
      : selected.source_evaluation_account_id
        ? await db
            .selectFrom('app.trading_accounts')
            .selectAll()
            .where('id', '=', selected.source_evaluation_account_id)
            .where('user_id', '=', params.userId)
            .executeTakeFirst()
        : null;
  if (!evaluation) {
    throw new EvaluationPerformanceHandoffError(
      'Le compte Performance ne possède pas d’évaluation d’origine accessible.',
    );
  }

  const performance =
    selected.program_type === 'WARIBA_PERFORMANCE'
      ? selected
      : await db
          .selectFrom('app.trading_accounts')
          .selectAll()
          .where('source_evaluation_account_id', '=', evaluation.id)
          .where('user_id', '=', params.userId)
          .executeTakeFirst();

  const [objectiveTransition, passTransition, latestFinalized, evaluationPolicy] =
    await Promise.all([
      db
        .selectFrom('app.account_state_transitions')
        .select('occurred_at')
        .where('account_id', '=', evaluation.id)
        .where('to_status', '=', 'pass_pending')
        .orderBy('occurred_at', 'desc')
        .executeTakeFirst(),
      db
        .selectFrom('app.account_state_transitions')
        .select('occurred_at')
        .where('account_id', '=', evaluation.id)
        .where('to_status', '=', 'passed')
        .orderBy('occurred_at', 'desc')
        .executeTakeFirst(),
      db
        .selectFrom('app.account_daily_snapshots')
        .select('finalized_at')
        .where('account_id', '=', evaluation.id)
        .where('status', '=', 'finalized')
        .orderBy('finalized_at', 'desc')
        .executeTakeFirst(),
      loadPolicyById(db, evaluation.policy_version_id),
    ]);

  if (evaluationPolicy.program !== 'WARIBA_ONE') {
    throw new EvaluationPerformanceHandoffError(
      'La version des règles de l’évaluation ne correspond pas au programme.',
    );
  }

  const performancePolicy = performance
    ? await loadPolicyById(db, performance.policy_version_id)
    : null;
  if (performancePolicy && performancePolicy.program !== 'WARIBA_PERFORMANCE') {
    throw new EvaluationPerformanceHandoffError(
      'La version des règles Performance ne correspond pas au programme.',
    );
  }

  const acknowledgement = performance
    ? await loadPerformanceRulesAcknowledgement(db, {
        userId: params.userId,
        accountId: performance.id,
      })
    : null;
  if (
    acknowledgement &&
    performance &&
    acknowledgement.policyVersionId !== performance.policy_version_id
  ) {
    throw new EvaluationPerformanceHandoffError(
      'La preuve de lecture ne correspond pas à la version des règles du compte.',
    );
  }

  const objectiveAt = objectiveTransition?.occurred_at ?? null;
  const finalizedAt = latestFinalized?.finalized_at ?? null;
  const passedAt = passTransition?.occurred_at ?? null;
  const isFinalizing =
    evaluation.status === 'pass_pending' &&
    objectiveAt !== null &&
    finalizedAt !== null &&
    finalizedAt.getTime() >= objectiveAt.getTime();

  let stage: EvaluationPerformanceHandoffStage;
  if (evaluation.status === 'pass_pending') {
    stage = isFinalizing ? 'finalizing' : 'objective_reached';
  } else if (evaluation.status === 'passed' && !performance) {
    stage = 'performance_provisioning';
  } else if (evaluation.status === 'passed' && performance && !acknowledgement) {
    stage = 'rules_onboarding';
  } else if (performance && acknowledgement) {
    stage = 'performance_ready';
  } else {
    stage = 'evaluation_passed';
  }

  const one = evaluationPolicy.parameters as EvaluationOnePolicyParameters;
  const perf = performancePolicy?.parameters as PerformancePolicyParameters | undefined;
  const ruleComparison = perf ? comparison(one, perf) : [];
  const rules = perf
    ? performanceRules(
        perf,
        performance?.nominal_balance ?? evaluation.nominal_balance,
        evaluation.currency,
      )
    : [];
  const bufferFloor =
    perf && performance
      ? computePayoutBufferFloor({
          nominalBalance: performance.nominal_balance,
          permanentBufferRate: perf.permanent_buffer_rate,
        })
      : null;
  const bufferAmount =
    perf && performance
      ? new Decimal(performance.nominal_balance).times(perf.permanent_buffer_rate).toFixed(2)
      : null;
  const performanceThreshold =
    perf && performance
      ? computePerformanceDayThreshold({
          nominalBalance: performance.nominal_balance,
          performanceDayThresholdRate: perf.performance_day_threshold_rate,
        })
      : null;

  const timelineSource: { key: string; label: string; date: Date | null }[] = [
    { key: 'objective', label: 'Objectif atteint', date: objectiveAt },
    { key: 'finalized', label: 'Journée clôturée', date: finalizedAt },
    { key: 'passed', label: 'Évaluation réussie', date: passedAt },
    { key: 'performance', label: 'Compte Performance créé', date: performance?.created_at ?? null },
    {
      key: 'acknowledged',
      label: 'Règles Performance consultées',
      date: acknowledgement?.acknowledgedAt ?? null,
    },
  ];

  return {
    stage,
    evaluationAccount: {
      id: evaluation.id,
      publicId: evaluation.public_id,
      nominalAmount: evaluation.nominal_balance,
      currency: evaluation.currency,
      statusLabel:
        stage === 'objective_reached'
          ? 'Objectif atteint'
          : stage === 'finalizing'
            ? 'Vérification en cours'
            : evaluation.status === 'passed'
              ? 'Évaluation réussie'
              : accountStatusLabel(evaluation.status),
      policyVersionId: evaluation.policy_version_id,
      policyVersion: evaluationPolicy.semanticVersion,
      passedAt: passedAt?.toISOString() ?? null,
    },
    performanceAccount:
      performance && performancePolicy
        ? {
            id: performance.id,
            publicId: performance.public_id,
            nominalAmount: performance.nominal_balance,
            currency: performance.currency,
            statusLabel: accountStatusLabel(performance.status),
            policyVersionId: performance.policy_version_id,
            policyVersion: performancePolicy.semanticVersion,
            createdAt: performance.created_at.toISOString(),
            tradable: performance.status === 'active',
          }
        : null,
    handoff: {
      objectiveReachedAt: objectiveAt?.toISOString() ?? null,
      dailyFinalizedAt: finalizedAt?.toISOString() ?? null,
      passedAt: passedAt?.toISOString() ?? null,
      performanceCreatedAt: performance?.created_at.toISOString() ?? null,
      rulesAcknowledgedAt: acknowledgement?.acknowledgedAt.toISOString() ?? null,
    },
    ruleComparison,
    performanceRules: rules,
    payoutPath: perf
      ? [
          { key: 'created', label: 'Compte Performance créé' },
          { key: 'trade', label: 'Trader en respectant les règles' },
          ...(perf.performance_days_required_per_payout > 0
            ? [{ key: 'days', label: 'Remplir les journées Performance du cycle' }]
            : []),
          ...(new Decimal(perf.best_day_max_ratio).isPositive()
            ? [{ key: 'best_day', label: 'Respecter la règle du Meilleur Jour' }]
            : []),
          ...(new Decimal(perf.permanent_buffer_rate).isPositive()
            ? [{ key: 'buffer', label: 'Construire le buffer permanent' }]
            : []),
          { key: 'eligible', label: 'Rendre une demande disponible' },
          { key: 'request', label: 'Envoyer la demande de payout' },
          { key: 'review', label: 'Passer par WARIBA Review' },
          { key: 'approved', label: 'Recevoir la décision' },
        ]
      : [],
    buffer:
      perf && performance && bufferAmount && bufferFloor
        ? {
            rateFormatted: percent(perf.permanent_buffer_rate) ?? 'Non publié',
            amountFormatted: money(bufferAmount, performance.currency),
            floorFormatted: money(bufferFloor, performance.currency),
          }
        : null,
    performanceDay:
      perf && performance && performanceThreshold
        ? {
            requiredFormatted: days(perf.performance_days_required_per_payout) ?? 'Non publié',
            thresholdFormatted: money(performanceThreshold, performance.currency),
          }
        : null,
    rulesAcknowledged: acknowledgement !== null,
    timeline: timelineSource
      .filter((item): item is { key: string; label: string; date: Date } => item.date !== null)
      .map((item) => ({
        key: item.key,
        label: item.label,
        occurredAt: item.date.toISOString(),
        timestampLabel: timestamp(item.date),
      }))
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)),
  };
}
