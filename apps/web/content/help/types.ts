import { z } from 'zod';
import { HELP_P0_VISUAL_IDS } from '@wariba/ui';

/**
 * The Help Center's content contract.
 *
 * ## Why structured blocks rather than markdown
 *
 * §10 of the content master asks for things a markdown string cannot express:
 * a formula rendered as a formula, a worked example distinguishable from a
 * rule, and — the one that actually forces the decision — a table that becomes
 * a stack of key/value cards below 390px rather than scrolling sideways. A
 * renderer can only do that if it knows a table is a table.
 *
 * The second reason is verification. With blocks, a test can assert "no
 * published article states a policy percentage as prose" by walking the tree.
 * Against a markdown blob it would be grepping for `%`.
 *
 * ## Policy-bound facts
 *
 * §11.3 is explicit: `3 %` must not exist in five React components. Articles
 * therefore never write a live rule value. They either interpolate
 * `{{fact:dailyLossRate}}`, which resolves from the published policy at render
 * time, or they use a `ruleTable` block, which reads the same source. A worked
 * example may carry numbers — it is labelled as an example and says so — but a
 * *rule* is always read from the policy that the risk engine enforces.
 */

export const HELP_CATEGORY_IDS = [
  'commencer',
  'wariba-one',
  'risque-regles',
  'warix',
  'performance',
  'payouts',
  'paiements',
  'identite',
  'compte-securite',
  'technique',
  'support',
] as const;

export type HelpCategoryId = (typeof HELP_CATEGORY_IDS)[number];

/**
 * Publication state, from §6's matrix.
 *
 * `draft_policy` and `draft_provider` articles are written and kept in the
 * registry deliberately: an article that exists and is hidden is a decision
 * a test can assert, whereas an article that was never written is an absence
 * nobody can measure. Neither is ever rendered — §9.
 */
export const HELP_STATUSES = ['publish', 'dynamic', 'draft_policy', 'draft_provider'] as const;
export type HelpStatus = (typeof HELP_STATUSES)[number];

/**
 * What kind of rule an article describes — §4's semantic types.
 *
 * The distinction that matters most to a trader is the one between
 * `soft_lock` (today is over, the account is not), `hard_breach` (the account
 * is over) and `pass_condition` (nothing is broken, the passage is not yet
 * earned). Colour never carries this alone.
 */
export const HELP_SEVERITIES = [
  'information',
  'pass_condition',
  'payout_condition',
  'soft_lock',
  'hard_breach',
  'operational',
] as const;
export type HelpSeverity = (typeof HELP_SEVERITIES)[number];

export const HELP_AUDIENCES = ['evaluation', 'performance', 'tous'] as const;
export type HelpAudience = (typeof HELP_AUDIENCES)[number];

/**
 * The policy values an article may quote.
 *
 * Every key here resolves from `app.policy_versions.parameters_json` for the
 * version actually in force. A key that the published policy does not carry
 * renders as « non publié » rather than as a plausible number — the same
 * refusal `buildOfferCatalog` already makes.
 */
export const HELP_FACT_KEYS = [
  'profitTargetRate',
  'dailyLossRate',
  'maximumLossRate',
  'bestDayMaxRatio',
  'minimumTradingDays',
  'activationFee',
  'shortDurationSeconds',
  'permanentBufferRate',
  'performanceDayThresholdRate',
  'performanceDaysRequired',
  'traderSplitDefault',
  'traderSplitFinalCycle',
  'maxPayoutCyclesBeforeReview',
  'overnightAllowed',
  'weekendAllowed',
  'newsAllowed',
  'evaluationPolicyVersion',
  'performancePolicyVersion',
] as const;
export type HelpFactKey = (typeof HELP_FACT_KEYS)[number];

const factKeySchema = z.enum(HELP_FACT_KEYS);

const paragraphSchema = z.object({
  kind: z.literal('paragraph'),
  /** May contain `{{fact:key}}` tokens. Never a hardcoded live rule value. */
  text: z.string().min(1),
});

const headingSchema = z.object({
  kind: z.literal('heading'),
  text: z.string().min(1),
});

const listSchema = z.object({
  kind: z.literal('list'),
  ordered: z.boolean().optional(),
  items: z.array(z.string().min(1)).min(1),
});

const tableSchema = z.object({
  kind: z.literal('table'),
  caption: z.string().optional(),
  columns: z.array(z.string().min(1)).min(2),
  rows: z.array(z.array(z.string()).min(2)).min(1),
});

/**
 * A rule table whose values come from the published policy.
 *
 * The article names which facts belong in it; the renderer fetches them. This
 * is the block that replaces « Perte quotidienne · 3 % » typed into prose.
 */
const ruleTableSchema = z.object({
  kind: z.literal('ruleTable'),
  caption: z.string().optional(),
  facts: z.array(factKeySchema).min(1),
});

const formulaSchema = z.object({
  kind: z.literal('formula'),
  expression: z.string().min(1),
  caption: z.string().optional(),
});

/**
 * A worked example. Numbers are allowed here and nowhere else in prose.
 *
 * Rendered under an explicit « Exemple » heading with a note that the figures
 * illustrate rather than bind, so a trader never mistakes an illustration for
 * the limit their own account is measured against.
 */
const exampleSchema = z.object({
  kind: z.literal('example'),
  title: z.string().min(1),
  lines: z.array(z.string().min(1)).min(1),
  conclusion: z.string().optional(),
});

const calloutSchema = z.object({
  kind: z.literal('callout'),
  tone: z.enum(['information', 'attention', 'danger']),
  title: z.string().min(1),
  text: z.string().min(1),
});

/**
 * A stable visual owned by the Help Center visual system.
 *
 * The block stores only the asset id. Copy, policy facts, runtime screenshot
 * paths and annotation geometry live in the renderer/model layer, so an
 * article cannot duplicate a live value or smuggle a product mock into prose.
 */
const visualSchema = z.object({
  kind: z.literal('visual'),
  id: z.enum(HELP_P0_VISUAL_IDS),
});

export const helpBlockSchema = z.discriminatedUnion('kind', [
  paragraphSchema,
  headingSchema,
  listSchema,
  tableSchema,
  ruleTableSchema,
  formulaSchema,
  exampleSchema,
  calloutSchema,
  visualSchema,
]);

export type HelpBlock = z.infer<typeof helpBlockSchema>;

export const helpArticleSchema = z.object({
  /** `HLP-012`. Stable across renames; used by the reason-code map. */
  id: z.string().regex(/^HLP-\d{3}$/),
  /** URL segment. Unique across the whole registry, French, no accents. */
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'A slug is lowercase words joined by hyphens.'),
  category: z.enum(HELP_CATEGORY_IDS),
  title: z.string().min(1),
  /** One or two sentences. Shown in search results and as the article lead. */
  summary: z.string().min(1),
  status: z.enum(HELP_STATUSES),
  severity: z.enum(HELP_SEVERITIES),
  audience: z.array(z.enum(HELP_AUDIENCES)).min(1),
  /** What the article is subordinate to. Rendered on rule articles. */
  sourceOfTruth: z.array(z.string().min(1)).min(1),
  /** Acronyms and the words a trader actually types. Feeds search. */
  searchAliases: z.array(z.string().min(1)).default([]),
  /** Slugs. Every one must resolve — asserted by the registry test. */
  related: z.array(z.string()).default([]),
  body: z.array(helpBlockSchema).min(1),
  lastReviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Set on the single article pinned above the categories on `/aide`. */
  pinned: z.boolean().optional(),
  /**
   * Why a draft is a draft. Required for draft statuses and forbidden
   * otherwise, so a hidden article always says which decision unblocks it.
   */
  blockedBy: z.string().optional(),
});

export type HelpArticle = z.infer<typeof helpArticleSchema>;

export interface HelpCategory {
  id: HelpCategoryId;
  title: string;
  description: string;
}

export const HELP_CATEGORIES: readonly HelpCategory[] = [
  {
    id: 'commencer',
    title: 'Commencer',
    description:
      'Ce qu’est WARIBA, comment se déroule le parcours, et ce qu’il faut savoir avant d’acheter.',
  },
  {
    id: 'wariba-one',
    title: 'WARIBA ONE',
    description: 'Votre objectif, vos limites de perte, et ce qui décide de la réussite.',
  },
  {
    id: 'risque-regles',
    title: 'Risque & règles',
    description:
      'Comment vos limites sont calculées, et comment lire une décision qui vous concerne.',
  },
  {
    id: 'warix',
    title: 'Trading & WariX',
    description:
      'Passer un ordre, poser un Stop Loss, gérer vos positions, et que faire en cas de coupure.',
  },
  {
    id: 'performance',
    title: 'WARIBA Performance',
    description: 'Le compte qui suit une évaluation réussie, et ce qu’il demande de plus.',
  },
  {
    id: 'payouts',
    title: 'Payouts',
    description:
      'Quand vous pouvez demander un payout, comment le demander, et ce qui se passe ensuite.',
  },
  {
    id: 'paiements',
    title: 'Paiements & facturation',
    description: 'Confirmation de votre paiement, suivi de commande, reçus.',
  },
  {
    id: 'identite',
    title: 'Identité & KYC',
    description: 'Pourquoi, quand et comment votre identité est vérifiée.',
  },
  {
    id: 'compte-securite',
    title: 'Compte & sécurité',
    description: 'Connexion, mot de passe, accès à votre compte et protection de vos données.',
  },
  {
    id: 'technique',
    title: 'Technique & incidents',
    description:
      'Prix indisponibles, incidents, et quoi faire quand quelque chose ne s’affiche pas.',
  },
  {
    id: 'support',
    title: 'Support & contestations',
    description: 'Ouvrir une demande, suivre votre dossier, contester une décision.',
  },
];

/**
 * Ce que l'article décrit, en une étiquette.
 *
 * Le mot compte plus que la couleur : « Blocage jusqu'au prochain reset » et
 * « Compte terminé » sont la différence entre une mauvaise journée et une
 * évaluation finie.
 *
 * « Jusqu'au lendemain » disait minuit local. Le reset tombe à 00:00 UTC
 * (`nextResetAt`), ce qui n'est le lendemain que pour une partie des
 * lecteurs — pour les autres c'est le milieu de l'après-midi ou la veille au
 * soir. L'étiquette nomme donc l'instant que le produit connaît. « Opérationnel » a été remplacé par « Bon à savoir » — le
 * premier décrit une catégorie interne, le second dit au lecteur ce qu'il
 * tient entre les mains.
 */
export const HELP_SEVERITY_LABELS: Record<HelpSeverity, string> = {
  information: 'Information',
  pass_condition: 'Condition de réussite',
  payout_condition: 'Condition pour être payé',
  soft_lock: 'Blocage jusqu’au prochain reset',
  hard_breach: 'Met fin au compte',
  operational: 'Bon à savoir',
};

export const HELP_AUDIENCE_LABELS: Record<HelpAudience, string> = {
  evaluation: 'WARIBA ONE',
  performance: 'WARIBA Performance',
  tous: 'Tous les comptes',
};
