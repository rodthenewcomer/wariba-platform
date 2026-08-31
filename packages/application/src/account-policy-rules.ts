import Decimal from 'decimal.js';
import type {
  EvaluationOnePolicyParameters,
  PerformancePolicyParameters,
  ProductFamily,
  AccountPhase,
} from '@wariba/policies';

/**
 * Phase 3.4.4 §5/§6 — the rules attached to one account, rendered from that
 * account's own pinned policy.
 *
 * ## The invariant this file exists for
 *
 * ```text
 * ACCOUNT → ATTACHED POLICY VERSION → THIS PROJECTION → every surface
 * ```
 *
 * Not `product === 'ONE' ? 8 : 6`. A V1 ONE account and a V2 ONE account are
 * open in the same session, under the same product name, with different
 * numbers — 10/3/10/50 against 8/3/8/35 — and both are correct. Any surface
 * that reads the product name and supplies the figure itself will be wrong for
 * one of them, silently, on the trader's own risk display.
 *
 * So nothing here takes a family, a phase or a version as a source of
 * *values*. They select which rows exist; every number comes from the
 * parameters the account is pinned to.
 *
 * ## Why the strings are built here
 *
 * `displayValue` is formatted server-side for the same reason the figure is
 * read server-side: a percentage assembled in three components is a percentage
 * that can disagree with itself in three places. The client renders what it is
 * given.
 */
export type AccountRuleKey =
  | 'profit_target'
  | 'daily_loss'
  | 'maximum_loss'
  | 'best_day'
  | 'performance_days'
  | 'safety_reserve'
  | 'payout_split'
  | 'payout_cycles'
  | 'gross_exposure'
  | 'margin_cap'
  | 'leverage'
  | 'short_profit_duration'
  | 'news'
  | 'holding';

export interface AccountRuleItem {
  key: AccountRuleKey;
  /** §4 trader vocabulary. Never "DLL", "MLL", "buffer floor" or "gross notional". */
  label: string;
  displayValue: string;
  /** The same rule as an absolute amount for this account, where one exists. */
  amountFormatted: string | null;
  explanation: string;
}

/** §4 — the words the product uses, in one place. */
export const ACCOUNT_RULE_LABEL: Readonly<Record<AccountRuleKey, string>> = {
  profit_target: 'Objectif',
  daily_loss: 'Limite quotidienne',
  maximum_loss: 'Perte maximale',
  best_day: 'Règle de la meilleure journée',
  performance_days: 'Journées Performance',
  safety_reserve: 'Réserve de sécurité',
  payout_split: 'Votre part',
  payout_cycles: 'Passage en WARIBA Review',
  gross_exposure: 'Exposition maximale',
  margin_cap: 'Marge maximale',
  leverage: 'Effet de levier',
  short_profit_duration: 'Profit éligible',
  news: 'Annonces économiques',
  holding: 'Conservation des positions',
};

export const PRODUCT_FAMILY_LABEL: Readonly<Record<ProductFamily, string>> = {
  WARIBA_ONE: 'WARIBA ONE',
  WARIBA_FLEX: 'WARIBA FLEX',
  WARIBA_INSTANT: 'WARIBA INSTANT',
};

export const ACCOUNT_PHASE_LABEL: Readonly<Record<AccountPhase, string>> = {
  evaluation: 'Évaluation',
  performance: 'Performance',
};

export function formatRate(rate: string | null | undefined): string | null {
  if (rate === null || rate === undefined) return null;
  const value = new Decimal(rate).times(100).toDecimalPlaces(2).toNumber();
  return `${value.toLocaleString('fr-FR')} %`;
}

export function formatMoney(amount: string, currency: string): string {
  return `${new Decimal(amount).toDecimalPlaces(2).toNumber().toLocaleString('fr-FR')} ${currency}`;
}

/** `nominal × rate`, at the account's own nominal. Never a rounded product-tier constant. */
function amountOf(nominalBalance: string, rate: string, currency: string): string {
  return formatMoney(new Decimal(nominalBalance).times(rate).toFixed(2), currency);
}

function formatMultiple(multiple: string): string {
  return `${new Decimal(multiple).toDecimalPlaces(2).toNumber().toLocaleString('fr-FR')} ×`;
}

/**
 * The V2 fields, read defensively.
 *
 * A V1 policy simply does not carry them, and that is a legitimate state, not
 * a missing value to warn about — an account pinned to V1 has no exposure cap
 * because none was ever part of its contract. Reading them off a widened type
 * keeps V1 and V2 on one code path without a family test.
 */
interface V2Fields {
  gross_exposure_max_multiple?: string;
  candidate_margin_cap_rate?: string;
  leverage_by_asset_group?: Record<string, number>;
  minimum_profit_eligible_duration_ms?: number;
  news_policy?: string;
  overnight_allowed?: boolean;
  weekend_allowed?: boolean;
  payout_split_schedule?: readonly string[];
}

const ASSET_GROUP_LABEL: Readonly<Record<string, string>> = {
  FX: 'Forex',
  METALS: 'Métaux',
  INDICES: 'Indices',
  ENERGY: 'Énergie',
};

export interface ProjectAccountRulesParams {
  parameters: EvaluationOnePolicyParameters | PerformancePolicyParameters;
  phase: AccountPhase;
  nominalBalance: string;
  currency: string;
}

/**
 * Every rule this account actually lives under, in reading order.
 *
 * A row is present when the pinned policy carries the parameter behind it, and
 * absent otherwise. That is why a V1 account's rules list is shorter than a
 * V2 account's rather than showing "Non publié" against four caps that never
 * applied to it: an empty row for a rule that does not exist reads as a gap in
 * the platform, when it is a fact about the contract.
 */
export function projectAccountRules(params: ProjectAccountRulesParams): AccountRuleItem[] {
  const { parameters, phase, nominalBalance, currency } = params;
  const v2 = parameters as unknown as V2Fields;
  const evaluation = parameters as Partial<EvaluationOnePolicyParameters>;
  const performance = parameters as Partial<PerformancePolicyParameters>;
  const rules: AccountRuleItem[] = [];

  const push = (
    key: AccountRuleKey,
    displayValue: string,
    explanation: string,
    amountFormatted: string | null = null,
  ) => {
    rules.push({ key, label: ACCOUNT_RULE_LABEL[key], displayValue, amountFormatted, explanation });
  };

  if (phase === 'evaluation' && evaluation.profit_target_rate) {
    push(
      'profit_target',
      formatRate(evaluation.profit_target_rate) ?? '',
      'Le profit net réalisé à atteindre pour valider votre évaluation.',
      amountOf(nominalBalance, evaluation.profit_target_rate, currency),
    );
  }

  push(
    'daily_loss',
    formatRate(parameters.daily_loss_rate) ?? '',
    'Atteinte, elle met le trading en pause jusqu’au prochain reset. Votre compte reste ouvert.',
    amountOf(nominalBalance, parameters.daily_loss_rate, currency),
  );

  push(
    'maximum_loss',
    formatRate(parameters.maximum_loss_rate) ?? '',
    'Le plancher de protection de votre compte. Il ne redescend jamais.',
    amountOf(nominalBalance, parameters.maximum_loss_rate, currency),
  );

  push(
    'best_day',
    formatRate(parameters.best_day_max_ratio) ?? '',
    'La part maximale de vos gains qu’une seule journée peut représenter. Elle ne termine jamais votre compte.',
  );

  if (phase === 'performance' && performance.performance_days_required_per_payout) {
    const threshold = performance.performance_day_threshold_rate;
    push(
      'performance_days',
      `${performance.performance_days_required_per_payout}`,
      threshold
        ? `Une journée compte lorsqu’elle atteint ${amountOf(nominalBalance, threshold, currency)} de profit éligible.`
        : 'Le nombre de journées à valider pour ouvrir une demande de paiement.',
      threshold ? amountOf(nominalBalance, threshold, currency) : null,
    );
  }

  if (phase === 'performance' && performance.permanent_buffer_rate) {
    push(
      'safety_reserve',
      formatRate(performance.permanent_buffer_rate) ?? '',
      'Elle reste dans votre compte. Seul l’excédent au-dessus peut être demandé.',
      amountOf(nominalBalance, performance.permanent_buffer_rate, currency),
    );
  }

  if (phase === 'performance' && performance.trader_split_rate_default) {
    const schedule = v2.payout_split_schedule;
    push(
      'payout_split',
      schedule && schedule.length > 0
        ? `${formatRate(schedule[0])} → ${formatRate(schedule[schedule.length - 1])}`
        : `${formatRate(performance.trader_split_rate_default)} → ${formatRate(performance.trader_split_rate_final_cycle)}`,
      'Votre part augmente avec le rang de votre cycle.',
    );
  }

  if (phase === 'performance' && performance.max_payout_cycles_before_review) {
    push(
      'payout_cycles',
      `${performance.max_payout_cycles_before_review} cycles`,
      'Après ces cycles, votre historique passe en revue pour la suite.',
    );
  }

  // ---- V2 only. Absent on a V1 policy because they were never part of it.
  if (v2.gross_exposure_max_multiple) {
    push(
      'gross_exposure',
      formatMultiple(v2.gross_exposure_max_multiple),
      'WARIBA limite la taille totale de vos positions. Les positions opposées utilisent elles aussi de l’exposition.',
      amountOf(nominalBalance, v2.gross_exposure_max_multiple, currency),
    );
  }

  if (v2.candidate_margin_cap_rate) {
    push(
      'margin_cap',
      formatRate(v2.candidate_margin_cap_rate) ?? '',
      'La part maximale de votre compte que vos positions ouvertes peuvent immobiliser.',
    );
  }

  if (v2.leverage_by_asset_group) {
    const entries = Object.entries(v2.leverage_by_asset_group);
    push(
      'leverage',
      entries
        .map(([group, value]) => `${ASSET_GROUP_LABEL[group] ?? group} 1:${value}`)
        .join(' · '),
      'L’effet de levier dépend de la famille d’instruments.',
    );
  }

  if (v2.minimum_profit_eligible_duration_ms && v2.minimum_profit_eligible_duration_ms > 0) {
    const seconds = Math.round(v2.minimum_profit_eligible_duration_ms / 1000);
    push(
      'short_profit_duration',
      `${seconds} secondes`,
      'Un trade gagnant clôturé plus tôt garde son gain dans votre P&L, mais ne compte pas dans votre progression WARIBA.',
    );
  }

  if (v2.news_policy) {
    push(
      'news',
      v2.news_policy === 'evaluation_unrestricted'
        ? 'Aucune restriction'
        : 'Réduction et clôture uniquement',
      v2.news_policy === 'evaluation_unrestricted'
        ? 'Aucune restriction liée aux annonces sur cette phase.'
        : 'Pendant une annonce à fort impact, vous pouvez réduire ou fermer vos positions.',
    );
  }

  if (v2.overnight_allowed !== undefined || v2.weekend_allowed !== undefined) {
    const overnight = v2.overnight_allowed !== false;
    const weekend = v2.weekend_allowed !== false;
    push(
      'holding',
      overnight && weekend
        ? 'Nuit et week-end autorisés'
        : overnight
          ? 'Nuit autorisée'
          : 'Clôture avant la nuit',
      'La conservation de vos positions en dehors des heures de marché.',
    );
  }

  return rules;
}
