import Decimal from 'decimal.js';
import type { Db } from '@wariba/database';

/**
 * The rule values the Help Center is allowed to state, read from the policy
 * the risk engine actually enforces.
 *
 * ## Why this exists
 *
 * The content master's §11.3 names the failure directly: `3 %` typed into an
 * article, a second article, a React component and a FAQ entry is four places
 * to update and four chances to disagree the day the published policy changes.
 * `buildOfferCatalog` already refused that for the offer page; this is the same
 * refusal for help content.
 *
 * ## Absent is `null`, never a default
 *
 * A parameter the published policy does not carry resolves to `null` and
 * renders as « non publié ». Substituting a plausible figure would be the
 * worst outcome available here: a help article stating a limit no engine
 * enforces is a promise WARIBA has not made, read by someone deciding whether
 * to place a trade.
 *
 * ## Two programs, two policies
 *
 * WARIBA ONE and WARIBA Performance carry different parameters and version
 * independently. Both are read; each fact declares which one it comes from, so
 * an article about the permanent buffer cannot accidentally quote an
 * evaluation number.
 */

export type HelpFactKey =
  | 'profitTargetRate'
  | 'dailyLossRate'
  | 'maximumLossRate'
  | 'bestDayMaxRatio'
  | 'minimumTradingDays'
  | 'activationFee'
  | 'shortDurationSeconds'
  | 'permanentBufferRate'
  | 'performanceDayThresholdRate'
  | 'performanceDaysRequired'
  | 'traderSplitDefault'
  | 'traderSplitFinalCycle'
  | 'maxPayoutCyclesBeforeReview'
  | 'overnightAllowed'
  | 'weekendAllowed'
  | 'newsAllowed'
  | 'evaluationPolicyVersion'
  | 'performancePolicyVersion';

export interface HelpFact {
  key: HelpFactKey;
  /** The label a rule table shows in its first column. */
  label: string;
  /** Formatted for display, or `null` when the published policy omits it. */
  value: string | null;
  /** One line of plain French — what the value means, not what it is. */
  explanation: string;
  /** Which published policy the value came from. */
  program: 'WARIBA_ONE' | 'WARIBA_PERFORMANCE';
}

export interface HelpPolicyFacts {
  /** False when no published policy could be read at all. */
  available: boolean;
  evaluationPolicyVersion: string | null;
  performancePolicyVersion: string | null;
  facts: Readonly<Record<HelpFactKey, HelpFact>>;
}

interface PolicyParameters {
  profit_target_rate?: string | null;
  daily_loss_rate?: string;
  maximum_loss_rate?: string;
  best_day_max_ratio?: string;
  minimum_trading_days?: number | null;
  activation_fee?: string;
  minimum_profit_eligible_duration_ms?: number | null;
  permanent_buffer_rate?: string;
  performance_day_threshold_rate?: string;
  performance_days_required_per_payout?: number;
  trader_split_rate_default?: string;
  trader_split_rate_final_cycle?: string;
  max_payout_cycles_before_review?: number;
  overnight_allowed?: boolean;
  weekend_allowed?: boolean;
  news_allowed?: boolean;
}

function percent(rate: string | undefined | null): string | null {
  if (!rate) return null;
  const parsed = new Decimal(rate).times(100).toDecimalPlaces(2).toNumber();
  return `${parsed.toLocaleString('fr-FR')} %`;
}

function seconds(ms: number | undefined | null): string | null {
  if (ms === undefined || ms === null) return null;
  const value = ms / 1000;
  return value === 1 ? '1 seconde' : `${value.toLocaleString('fr-FR')} secondes`;
}

function count(value: number | undefined | null, singular: string, plural: string): string | null {
  if (value === undefined || value === null) return null;
  if (value === 0) return 'Aucun';
  return `${value} ${value === 1 ? singular : plural}`;
}

/**
 * A boolean permission, said as a permission rather than as `true`.
 *
 * `undefined` stays `null`: "the policy does not say" and "the policy says no"
 * are different answers, and collapsing them would let an article state a
 * prohibition the policy never expressed.
 */
function permission(value: boolean | undefined, yes: string, no: string): string | null {
  if (value === undefined) return null;
  return value ? yes : no;
}

async function loadPublished(
  db: Db,
  program: 'WARIBA_ONE' | 'WARIBA_PERFORMANCE',
): Promise<{ version: string; parameters: PolicyParameters } | null> {
  const row = await db
    .selectFrom('app.policy_versions')
    .select(['semantic_version', 'parameters_json'])
    .where('program', '=', program)
    .where('status', '=', 'published')
    // Newest in force wins, exactly as buildOfferCatalog resolves it — two
    // published versions of one program is a real state in this database.
    .orderBy('effective_from', 'desc')
    .executeTakeFirst();
  if (!row) return null;
  return {
    version: row.semantic_version,
    parameters: (row.parameters_json ?? {}) as PolicyParameters,
  };
}

export async function buildHelpPolicyFacts(db: Db): Promise<HelpPolicyFacts> {
  const [evaluation, performance] = await Promise.all([
    loadPublished(db, 'WARIBA_ONE'),
    loadPublished(db, 'WARIBA_PERFORMANCE'),
  ]);

  const one = evaluation?.parameters ?? {};
  const perf = performance?.parameters ?? {};

  const facts: Record<HelpFactKey, HelpFact> = {
    profitTargetRate: {
      key: 'profitTargetRate',
      label: 'Objectif de profit',
      value: percent(one.profit_target_rate),
      explanation: 'Profit net réalisé à atteindre. Le PnL latent ne compte jamais.',
      program: 'WARIBA_ONE',
    },
    dailyLossRate: {
      key: 'dailyLossRate',
      label: 'Perte quotidienne',
      value: percent(one.daily_loss_rate),
      explanation:
        'Atteinte, elle met le compte en blocage temporaire. Le compte n’est pas terminé.',
      program: 'WARIBA_ONE',
    },
    maximumLossRate: {
      key: 'maximumLossRate',
      label: 'Perte maximale',
      value: percent(one.maximum_loss_rate),
      explanation:
        'Plancher glissant, recalculé après chaque journée finalisée. L’atteindre termine le compte.',
      program: 'WARIBA_ONE',
    },
    bestDayMaxRatio: {
      key: 'bestDayMaxRatio',
      label: 'Règle du Meilleur Jour',
      value: percent(one.best_day_max_ratio),
      explanation:
        'Part maximale du profit total qu’une seule journée peut représenter. Jamais un breach.',
      program: 'WARIBA_ONE',
    },
    minimumTradingDays: {
      key: 'minimumTradingDays',
      label: 'Jours de trading minimum',
      value: count(one.minimum_trading_days, 'jour', 'jours'),
      explanation: 'Nombre de journées exigées avant de pouvoir valider l’évaluation.',
      program: 'WARIBA_ONE',
    },
    activationFee: {
      key: 'activationFee',
      label: 'Frais d’activation',
      value:
        one.activation_fee === undefined
          ? null
          : new Decimal(one.activation_fee).isZero()
            ? 'Aucun'
            : one.activation_fee,
      explanation:
        'Montant dû après une réussite validée, avant l’ouverture du compte Performance.',
      program: 'WARIBA_ONE',
    },
    shortDurationSeconds: {
      key: 'shortDurationSeconds',
      label: 'Durée minimale d’un profit éligible',
      value: seconds(one.minimum_profit_eligible_duration_ms),
      explanation:
        'En dessous de cette durée, un profit peut contribuer pour zéro au programme. Les pertes restent comptées.',
      program: 'WARIBA_ONE',
    },
    permanentBufferRate: {
      key: 'permanentBufferRate',
      label: 'Buffer permanent',
      value: percent(perf.permanent_buffer_rate),
      explanation:
        'Construit une fois, jamais retirable. Seul l’excédent au-dessus peut devenir éligible.',
      program: 'WARIBA_PERFORMANCE',
    },
    performanceDayThresholdRate: {
      key: 'performanceDayThresholdRate',
      label: 'Seuil d’une Performance Day',
      value: percent(perf.performance_day_threshold_rate),
      explanation: 'Profit net réalisé qu’une journée doit atteindre pour compter dans le cycle.',
      program: 'WARIBA_PERFORMANCE',
    },
    performanceDaysRequired: {
      key: 'performanceDaysRequired',
      label: 'Performance Days par payout',
      value: count(perf.performance_days_required_per_payout, 'journée', 'journées'),
      explanation:
        'Nouvelles journées exigées par cycle. Une journée déjà consommée ne se réutilise pas.',
      program: 'WARIBA_PERFORMANCE',
    },
    traderSplitDefault: {
      key: 'traderSplitDefault',
      label: 'Part trader (payouts 1 à 4)',
      value: percent(perf.trader_split_rate_default),
      explanation: 'Part du payout revenant au trader sur les cycles ordinaires.',
      program: 'WARIBA_PERFORMANCE',
    },
    traderSplitFinalCycle: {
      key: 'traderSplitFinalCycle',
      label: 'Part trader (dernier payout)',
      value: percent(perf.trader_split_rate_final_cycle),
      explanation: 'Part du payout revenant au trader sur le dernier cycle avant Review.',
      program: 'WARIBA_PERFORMANCE',
    },
    maxPayoutCyclesBeforeReview: {
      key: 'maxPayoutCyclesBeforeReview',
      label: 'Cycles avant WARIBA Review',
      value: count(perf.max_payout_cycles_before_review, 'cycle', 'cycles'),
      explanation: 'Nombre de payouts payés après lequel le dossier Review s’ouvre.',
      program: 'WARIBA_PERFORMANCE',
    },
    overnightAllowed: {
      key: 'overnightAllowed',
      label: 'Position pendant la nuit',
      value: permission(one.overnight_allowed, 'Autorisée', 'Interdite'),
      explanation:
        'Autorisée ne veut pas dire sans risque : les limites continuent de s’appliquer.',
      program: 'WARIBA_ONE',
    },
    weekendAllowed: {
      key: 'weekendAllowed',
      label: 'Position pendant le week-end',
      value: permission(one.weekend_allowed, 'Autorisée', 'Interdite'),
      explanation: 'L’heure de coupure exacte dépend de l’instrument et est publiée avec lui.',
      program: 'WARIBA_ONE',
    },
    newsAllowed: {
      key: 'newsAllowed',
      label: 'Trading pendant les annonces',
      value: permission(one.news_allowed, 'Autorisé', 'Interdit'),
      explanation: 'Les autres règles continuent de s’appliquer et le slippage peut augmenter.',
      program: 'WARIBA_ONE',
    },
    evaluationPolicyVersion: {
      key: 'evaluationPolicyVersion',
      label: 'Policy WARIBA ONE',
      value: evaluation ? `${evaluation.version}` : null,
      explanation: 'Version publiée dont ces valeurs proviennent.',
      program: 'WARIBA_ONE',
    },
    performancePolicyVersion: {
      key: 'performancePolicyVersion',
      label: 'Policy WARIBA Performance',
      value: performance ? `${performance.version}` : null,
      explanation: 'Version publiée dont ces valeurs proviennent.',
      program: 'WARIBA_PERFORMANCE',
    },
  };

  return {
    available: evaluation !== null || performance !== null,
    evaluationPolicyVersion: evaluation?.version ?? null,
    performancePolicyVersion: performance?.version ?? null,
    facts,
  };
}

/** What a fact renders as when the published policy does not carry it. */
export const HELP_FACT_UNPUBLISHED = 'non publié';

/**
 * Resolves `{{fact:key}}` tokens in article prose.
 *
 * A token naming a key that does not exist is left verbatim rather than
 * silently blanked: a visible `{{fact:typo}}` on the page is a bug someone
 * fixes, whereas an empty gap in a sentence about a risk limit is a bug nobody
 * notices.
 */
export function resolveHelpFacts(text: string, facts: HelpPolicyFacts): string {
  return text.replace(/\{\{fact:([A-Za-z]+)\}\}/g, (match, key: string) => {
    const fact = facts.facts[key as HelpFactKey];
    if (!fact) return match;
    return fact.value ?? HELP_FACT_UNPUBLISHED;
  });
}
