import {
  listContestationsForUser,
  listSupportTicketsForUser,
  loadContestationForUser,
  loadSupportTicketForUser,
  traderCanReply,
  type ContestationDetail,
  type ContestationReasonCategory,
  type ContestationStatus,
  type ContestationTargetType,
  type ContestedDecisionEvidence,
  type Db,
  type SupportTicketCategory,
  type SupportTicketStatus,
} from '@wariba/database';
import { accountStatusLabel, traderLabel } from './account-status-labels';
import { RISK_RULE_LABELS } from './risk-view';

/**
 * Phase 3.2 — what a trader reads in Support, in the product's own words.
 *
 * Every string a support surface renders is decided here rather than in a
 * page, for the reason the rest of this layer already gives: a status word
 * that means one thing in the list and another in the detail is how a trader
 * ends up unsure whether anyone is working on their problem. Pages render;
 * they do not translate.
 *
 * Nothing here computes a figure. The evidence a contestation points at is
 * formatted for display and never recalculated — the numbers a dispute turns
 * on are the ones the risk engine recorded, exactly as it recorded them.
 */

export const SUPPORT_CATEGORIES: readonly SupportTicketCategory[] = [
  'general',
  'account',
  'trading',
  'risk',
  'breach',
  'performance',
  'payout',
  'billing',
  'identity',
  'technical',
];

export const SUPPORT_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  general: 'Question générale',
  account: 'Compte',
  trading: 'Trading',
  risk: 'Risque',
  breach: 'Compte terminé',
  performance: 'Performance',
  payout: 'Payout',
  billing: 'Facturation',
  identity: 'Identité',
  technical: 'Technique',
};

/**
 * Short form for a dense list column, where the sentence does not fit.
 *
 * « Breach » s'affichait sur la page Support d'un trader, à côté de la
 * référence de sa contestation : le mot du domaine, en anglais, pour dire
 * qu'un compte est terminé. Court ne veut pas dire non traduit.
 */
export const SUPPORT_CATEGORY_SHORT: Record<SupportTicketCategory, string> = {
  general: 'Général',
  account: 'Compte',
  trading: 'Trading',
  risk: 'Risque',
  breach: 'Compte terminé',
  performance: 'Performance',
  payout: 'Payout',
  billing: 'Facturation',
  identity: 'Identité',
  technical: 'Technique',
};

export const SUPPORT_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: 'Ouverte',
  waiting_for_user: 'En attente de votre réponse',
  under_review: 'En cours d’examen',
  resolved: 'Résolue',
  closed: 'Clôturée',
};

/**
 * Où en est la demande, dit à la personne qui attend.
 *
 * Un mot de statut dit où en est un dossier ; il ne dit pas à qui de jouer.
 * « En attente » est le cas qui compte le plus : sans cette phrase, un trader
 * lit « en attente » et attend, alors que c'est précisément l'inverse qu'on
 * lui demande.
 *
 * Écrit à la première personne du pluriel — « nous avons reçu », « nous avons
 * besoin ». Une demande de support est une conversation entre deux personnes,
 * pas un état système décrit à la troisième personne.
 */
export const SUPPORT_STATUS_NEXT_ACTION: Record<SupportTicketStatus, string> = {
  open: 'Nous avons bien reçu votre demande. Un membre de l’équipe va la prendre en charge.',
  waiting_for_user: 'Nous avons besoin d’une précision de votre part pour continuer.',
  under_review: 'L’équipe WARIBA analyse votre demande.',
  resolved:
    'Une réponse vous a été apportée. Si ce n’est pas réglé pour vous, répondez ici : la demande repart.',
  closed: 'Cette demande est terminée. Vous pouvez en ouvrir une nouvelle si besoin.',
};

/**
 * Status tone.
 *
 * `waiting_for_user` is the only one carrying attention, and it does so
 * because the trader is the blocker. Everything else is neutral or settled:
 * a support queue that paints every open request amber teaches people to
 * ignore amber.
 */
export type SupportTone = 'neutral' | 'progress' | 'attention' | 'success' | 'muted';

export const SUPPORT_STATUS_TONE: Record<SupportTicketStatus, SupportTone> = {
  open: 'neutral',
  waiting_for_user: 'attention',
  under_review: 'progress',
  resolved: 'success',
  closed: 'muted',
};

export const CONTESTATION_STATUS_LABELS: Record<ContestationStatus, string> = {
  open: 'Ouverte',
  under_review: 'En cours d’examen',
  needs_information: 'Complément demandé',
  upheld: 'Décision maintenue',
  overturned: 'Décision annulée',
  closed: 'Clôturée',
  correction_required: 'Correction en préparation',
  decision_corrected: 'Décision corrigée',
  finance_compliance_review: 'Examen en cours',
};

/**
 * La même chose pour une contestation.
 *
 * Rien ici ne laisse entendre qu'un compte terminé peut être rouvert : WARIBA
 * ne réécrit pas un historique financier, et le dire à demi-mot serait pire
 * que ne rien dire.
 */
export const CONTESTATION_STATUS_NEXT_ACTION: Record<ContestationStatus, string> = {
  open: 'Votre contestation a bien été enregistrée.',
  under_review: 'L’équipe examine la décision et les éléments de votre dossier.',
  needs_information: 'Nous avons besoin d’une information de votre part pour continuer.',
  upheld: 'Après examen, la décision d’origine ne change pas. Le motif est indiqué ci-dessous.',
  overturned: 'Après examen, la décision d’origine a été revue. Le motif est indiqué ci-dessous.',
  closed: 'L’examen de cette contestation est terminé.',
  correction_required:
    'Nous avons confirmé qu’une correction est nécessaire. Votre historique reste conservé pendant que nous préparons la suite.',
  decision_corrected:
    'Un compte de remplacement vous a été attribué sans frais. Votre ancien compte reste consultable afin de conserver son historique.',
  finance_compliance_review:
    'Le dossier nécessite un examen complémentaire. Aucune compensation automatique n’a été appliquée.',
};

export const CONTESTATION_STATUS_TONE: Record<ContestationStatus, SupportTone> = {
  open: 'neutral',
  under_review: 'progress',
  needs_information: 'attention',
  upheld: 'muted',
  overturned: 'success',
  closed: 'muted',
  correction_required: 'attention',
  decision_corrected: 'success',
  finance_compliance_review: 'progress',
};

export const CONTESTATION_REASON_CATEGORIES: readonly ContestationReasonCategory[] = [
  'rule_misapplied',
  'market_data_disputed',
  'execution_error',
  'evidence_incomplete',
  'other',
];

export const CONTESTATION_REASON_LABELS: Record<ContestationReasonCategory, string> = {
  rule_misapplied: 'La règle n’a pas été appliquée correctement',
  market_data_disputed: 'Je conteste les prix retenus',
  execution_error: 'Une exécution est en cause',
  evidence_incomplete: 'Les éléments fournis me paraissent incomplets',
  other: 'Autre motif',
};

export const CONTESTATION_TARGET_LABELS: Record<ContestationTargetType, string> = {
  account_breach: 'Compte terminé',
  risk_decision: 'Décision de risque',
  payout_decision: 'Décision de payout',
};

/** Ce que la décision a changé pour le compte, dans les mots du trader. */
export const CONSEQUENCE_LABELS: Record<string, string> = {
  hard_breach: 'Compte terminé',
  soft_lock: 'Blocage jusqu’au prochain reset',
  entry_lock: 'Nouvelles positions bloquées',
  blocks_pass: 'Passage bloqué',
  none: 'Aucune conséquence',
};

/**
 * Ce qui a déclenché la vérification, dans la langue du produit.
 *
 * `trade_order` / `daily_finalization` / `manual_review` sont des valeurs de
 * base de données. Une page de contestation qui en imprime une, c'est le
 * schéma qui parle directement à une personne — le même défaut de couche que
 * `account-status-labels.ts` existe pour fermer. Le repli affiche la valeur
 * brute volontairement : un déclencheur non traduit est un changement de
 * schéma que personne n'a propagé, et un identifiant à l'écran se remarque là
 * où une jolie phrase française inventée passerait inaperçue.
 */
export const TRIGGER_EVENT_LABELS: Record<string, string> = {
  trade_order: 'Un ordre que vous avez passé',
  daily_finalization: 'La clôture de la journée',
  manual_review: 'Une vérification manuelle',
};

export function triggerEventLabel(value: string): string {
  return TRIGGER_EVENT_LABELS[value] ?? value;
}

export function formatSupportTimestamp(date: Date): string {
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * "Il y a 18 min" — the figure a support list actually needs.
 *
 * An absolute timestamp answers "when"; a queue is read for "how long has
 * this been sitting". Both are shown: the relative age carries the list, the
 * absolute stamp carries the detail, and neither is invented — every value
 * comes from `now` minus a stored instant.
 */
export function formatAge(from: Date, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 60_000));
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'il y a 1 jour' : `il y a ${days} jours`;
}

export interface SupportTicketSummary {
  publicId: string;
  subject: string;
  categoryLabel: string;
  statusLabel: string;
  tone: SupportTone;
  status: SupportTicketStatus;
  accountPublicId: string | null;
  ageLabel: string;
  updatedAtLabel: string;
  contestationPublicId: string | null;
  href: string;
}

export interface SupportHomeView {
  /** Live requests — the ones a trader came to check on. */
  openTickets: readonly SupportTicketSummary[];
  /** Settled requests, kept reachable rather than deleted. */
  settledTickets: readonly SupportTicketSummary[];
  contestations: readonly ContestationSummary[];
}

export interface ContestationSummary {
  publicId: string;
  ticketPublicId: string;
  targetLabel: string;
  reasonLabel: string;
  statusLabel: string;
  tone: SupportTone;
  accountPublicId: string | null;
  openedAtLabel: string;
  ageLabel: string;
  href: string;
}

const SETTLED: readonly SupportTicketStatus[] = ['resolved', 'closed'];

export async function buildSupportHomeView(
  db: Db,
  params: { userId: string; now?: Date },
): Promise<SupportHomeView> {
  const now = params.now ?? new Date();
  const [tickets, contestations] = await Promise.all([
    listSupportTicketsForUser(db, { userId: params.userId }),
    listContestationsForUser(db, { userId: params.userId }),
  ]);

  const summaries = tickets.map((ticket): SupportTicketSummary => ({
    publicId: ticket.publicId,
    subject: ticket.subject,
    categoryLabel: SUPPORT_CATEGORY_SHORT[ticket.category],
    statusLabel: SUPPORT_STATUS_LABELS[ticket.status],
    tone: SUPPORT_STATUS_TONE[ticket.status],
    status: ticket.status,
    accountPublicId: ticket.accountPublicId,
    ageLabel: formatAge(ticket.updatedAt, now),
    updatedAtLabel: formatSupportTimestamp(ticket.updatedAt),
    contestationPublicId: ticket.contestationPublicId,
    href: `/support/demandes/${ticket.publicId}`,
  }));

  return {
    openTickets: summaries.filter((ticket) => !SETTLED.includes(ticket.status)),
    settledTickets: summaries.filter((ticket) => SETTLED.includes(ticket.status)),
    contestations: contestations.map((contestation) => ({
      publicId: contestation.publicId,
      ticketPublicId: contestation.ticketPublicId,
      targetLabel: CONTESTATION_TARGET_LABELS[contestation.targetType],
      reasonLabel: CONTESTATION_REASON_LABELS[contestation.reasonCategory],
      statusLabel: CONTESTATION_STATUS_LABELS[contestation.status],
      tone: CONTESTATION_STATUS_TONE[contestation.status],
      accountPublicId: contestation.accountPublicId,
      openedAtLabel: formatSupportTimestamp(contestation.openedAt),
      ageLabel: formatAge(contestation.openedAt, now),
      href: `/support/contestations/${contestation.publicId}`,
    })),
  };
}

export interface SupportThreadEntry {
  /** 'Vous' / 'WARIBA Support' / 'WARIBA'. Never an operator's identity. */
  authorLabel: string;
  isTrader: boolean;
  isSystem: boolean;
  body: string;
  timestampLabel: string;
}

export interface SupportTicketView {
  publicId: string;
  subject: string;
  categoryLabel: string;
  statusLabel: string;
  nextAction: string;
  tone: SupportTone;
  status: SupportTicketStatus;
  accountPublicId: string | null;
  createdAtLabel: string;
  updatedAtLabel: string;
  correlationId: string;
  canReply: boolean;
  messages: readonly SupportThreadEntry[];
  contestation: { publicId: string; statusLabel: string; href: string } | null;
}

const AUTHOR_LABEL = {
  trader: 'Vous',
  staff: 'WARIBA Support',
  system: 'WARIBA',
} as const;

export async function buildSupportTicketView(
  db: Db,
  params: { userId: string; publicId: string },
): Promise<SupportTicketView | null> {
  const thread = await loadSupportTicketForUser(db, params);
  if (!thread) return null;

  return {
    publicId: thread.publicId,
    subject: thread.subject,
    categoryLabel: SUPPORT_CATEGORY_LABELS[thread.category],
    statusLabel: SUPPORT_STATUS_LABELS[thread.status],
    nextAction: SUPPORT_STATUS_NEXT_ACTION[thread.status],
    tone: SUPPORT_STATUS_TONE[thread.status],
    status: thread.status,
    accountPublicId: thread.accountPublicId,
    createdAtLabel: formatSupportTimestamp(thread.createdAt),
    updatedAtLabel: formatSupportTimestamp(thread.updatedAt),
    correlationId: thread.correlationId,
    canReply: traderCanReply(thread.status),
    messages: thread.messages.map((message) => ({
      authorLabel: AUTHOR_LABEL[message.actorType],
      isTrader: message.actorType === 'trader',
      isSystem: message.actorType === 'system',
      body: message.body,
      timestampLabel: formatSupportTimestamp(message.createdAt),
    })),
    contestation: thread.contestation
      ? {
          publicId: thread.contestation.publicId,
          statusLabel:
            CONTESTATION_STATUS_LABELS[thread.contestation.status as ContestationStatus] ??
            thread.contestation.status,
          href: `/support/contestations/${thread.contestation.publicId}`,
        }
      : null,
  };
}

export interface EvidenceRow {
  label: string;
  value: string;
  /** Rendered in the tabular face — figures, references, hashes. */
  numeric?: boolean;
}

export interface ContestationEvidenceView {
  ruleLabel: string;
  ruleCode: string;
  consequenceLabel: string;
  /**
   * Ce qui a déclenché l'évaluation, en toutes lettres. Lu depuis
   * `trigger_event_type` et non déduit de l'absence d'un ordre — c'est la
   * contradiction que WARIBA Control affichait.
   */
  triggerLabel: string;
  /** Une phrase pour le trader. Absente de la projection opérateur. */
  narrative?: string;
  rows: readonly EvidenceRow[];
  orderRows: readonly EvidenceRow[];
  fills: readonly {
    typeLabel: string;
    quantity: string;
    price: string;
    realizedPnl: string;
    occurredAtLabel: string;
  }[];
}

function formatUsd(amount: string | null): string {
  if (amount === null) return '—';
  const parsed = Number.parseFloat(amount);
  if (Number.isNaN(parsed)) return '—';
  return `${parsed.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
}

/**
 * The contested decision, laid out as a table.
 *
 * Deliberately tabular and deliberately complete: rule, threshold, observed
 * value, when, which policy version, what the account did next, and the order
 * that triggered the evaluation if one did. A trader who disagrees with a
 * decision is owed the whole calculation, not a sentence summarising it — and
 * the operator reads exactly the same rows.
 */
/**
 * Le nom d'un programme, dit comme on le prononce.
 *
 * `WARIBA_ONE` est une valeur de colonne. Un trader qui lit « Version de
 * policy : WARIBA_ONE 1.1.1 » lit deux fois la base de données dans la même
 * ligne — une fois le libellé, une fois la valeur.
 */
const PROGRAM_DISPLAY_NAMES: Record<string, string> = {
  WARIBA_ONE: 'WARIBA ONE',
  WARIBA_PERFORMANCE: 'WARIBA Performance',
};

export function programDisplayName(program: string): string {
  return PROGRAM_DISPLAY_NAMES[program] ?? program.replace(/_/g, ' ');
}

/**
 * Ce qui s'est passé, en une phrase.
 *
 * La table dit les chiffres ; elle ne dit pas l'histoire. Cette phrase la
 * dit : quelle règle, ce qui l'a fait constater, et ce que le compte est
 * devenu. Elle est construite à partir des mêmes champs que la table —
 * aucune formulation ne dépend d'une hypothèse sur ce qui a déclenché la
 * vérification, ce qui est précisément l'erreur que WARIBA Control faisait.
 */
export function decisionNarrative(evidence: ContestedDecisionEvidence): string {
  const rule = traderLabel(RISK_RULE_LABELS, evidence.violation.ruleCode, 'de risque');
  const trigger = TRIGGER_EVENT_NARRATIVE[evidence.violation.triggerEventType];
  const consequence =
    CONSEQUENCE_NARRATIVE[evidence.violation.consequence] ??
    CONSEQUENCE_LABELS[evidence.violation.consequence] ??
    evidence.violation.consequence;

  const opening = trigger
    ? `${trigger}, WARIBA a constaté que la règle « ${rule} » était atteinte sur votre compte.`
    : `WARIBA a constaté que la règle « ${rule} » était atteinte sur votre compte.`;

  return `${opening} ${consequence}`;
}

/**
 * Le déclencheur, tourné pour entrer dans une phrase.
 *
 * `TRIGGER_EVENT_LABELS` répond à « quoi » dans une case de tableau ;
 * celui-ci répond à « quand » dans une phrase. Les deux lisent la même
 * colonne, donc les deux surfaces ne peuvent pas se contredire.
 */
const TRIGGER_EVENT_NARRATIVE: Record<string, string> = {
  trade_order: 'Au moment d’un ordre que vous avez passé',
  daily_finalization: 'À la clôture de la journée',
  manual_review: 'Lors d’une vérification manuelle',
};

const CONSEQUENCE_NARRATIVE: Record<string, string> = {
  hard_breach: 'Le compte a été terminé.',
  soft_lock: 'Les nouvelles positions ont été bloquées jusqu’au prochain reset.',
  entry_lock: 'L’ouverture de nouvelles positions a été bloquée.',
  blocks_pass: 'Le passage a été bloqué.',
  none: 'Aucune restriction n’a été appliquée au compte.',
};

/**
 * Les mêmes faits, pour la personne dont c'est le compte.
 *
 * La projection complète existe pour un opérateur qui instruit un dossier :
 * elle porte la version du moteur de calcul, le nom de l'événement qui a
 * déclenché l'évaluation et la transition d'état brute. Aucun des trois ne
 * dit quoi que ce soit à un trader — et deux d'entre eux ressemblent
 * suffisamment à des preuves pour qu'il essaie de les comprendre.
 *
 * Ce qui reste est ce sur quoi la décision repose vraiment : le compte, le
 * seuil, la valeur observée, l'instant, et la version des règles attachée au
 * compte. La phrase de `decisionNarrative` porte le reste, et le lien
 * « Comprendre cette règle » porte l'explication.
 *
 * Rien n'est masqué à l'audit : `projectContestationEvidence` reste la
 * projection de WARIBA Control et lit exactement les mêmes lignes.
 */
export function projectTraderContestationEvidence(
  evidence: ContestedDecisionEvidence,
): ContestationEvidenceView {
  const full = projectContestationEvidence(evidence);
  const HIDDEN = new Set(['Version de calcul', 'Événement déclencheur', 'Transition du compte']);

  const rows = full.rows
    .filter((row) => !HIDDEN.has(row.label))
    .map((row) =>
      row.label === 'Version de policy'
        ? {
            ...row,
            label: 'Version des règles',
            value: `${programDisplayName(evidence.policy.program)} ${evidence.policy.semanticVersion}`,
          }
        : row,
    );

  return { ...full, rows, narrative: decisionNarrative(evidence) };
}

export function projectContestationEvidence(
  evidence: ContestedDecisionEvidence,
): ContestationEvidenceView {
  const rows: EvidenceRow[] = [
    { label: 'Compte', value: evidence.account.accountPublicId, numeric: true },
    {
      label: 'Seuil',
      value: formatUsd(evidence.violation.thresholdValue),
      numeric: true,
    },
    {
      label: 'Valeur observée',
      value: formatUsd(evidence.violation.observedValue),
      numeric: true,
    },
    {
      label: 'Constaté le',
      value: formatSupportTimestamp(evidence.violation.occurredAt),
      numeric: true,
    },
    {
      label: 'Version des règles',
      value: `${programDisplayName(evidence.policy.program)} ${evidence.policy.semanticVersion}`,
      numeric: true,
    },
    {
      label: 'Version de calcul',
      value: evidence.violation.calculationVersion,
      numeric: true,
    },
    {
      label: 'Événement déclencheur',
      value: triggerEventLabel(evidence.violation.triggerEventType),
    },
  ];

  if (evidence.transition) {
    rows.push({
      label: 'Transition du compte',
      value: `${
        evidence.transition.fromStatus ? accountStatusLabel(evidence.transition.fromStatus) : '—'
      } → ${accountStatusLabel(evidence.transition.toStatus)}`,
    });
  }
  if (evidence.snapshot) {
    rows.push(
      { label: 'Journée', value: evidence.snapshot.tradingDay, numeric: true },
      {
        label: 'Référence du jour',
        value: formatUsd(evidence.snapshot.dailyReference),
        numeric: true,
      },
      {
        label: 'Plancher avant',
        value: formatUsd(evidence.snapshot.maximumLossFloorBefore),
        numeric: true,
      },
      {
        label: 'Plancher après',
        value: formatUsd(evidence.snapshot.maximumLossFloorAfter),
        numeric: true,
      },
    );
  }

  const orderRows: EvidenceRow[] = evidence.order
    ? [
        { label: 'Type', value: evidence.order.orderType },
        { label: 'Instrument', value: evidence.order.symbol ?? '—', numeric: true },
        { label: 'Sens', value: evidence.order.side ?? '—' },
        { label: 'Statut', value: evidence.order.status },
        {
          label: 'Quantité demandée',
          value: evidence.order.requestedQuantity ?? '—',
          numeric: true,
        },
        { label: 'Quantité exécutée', value: evidence.order.filledQuantity, numeric: true },
        {
          label: 'Reçu le',
          value: formatSupportTimestamp(evidence.order.receivedAt),
          numeric: true,
        },
      ]
    : [];

  return {
    // Le libellé ne retombe pas sur le code : `projectTraderContestationEvidence`
    // le donne à lire. `ruleCode` reste sur la projection pour WARIBA Control,
    // qui l'affiche à côté du titre.
    ruleLabel: traderLabel(RISK_RULE_LABELS, evidence.violation.ruleCode, 'Règle de risque'),
    ruleCode: evidence.violation.ruleCode,
    triggerLabel: triggerEventLabel(evidence.violation.triggerEventType),
    consequenceLabel: traderLabel(
      CONSEQUENCE_LABELS,
      evidence.violation.consequence,
      'Restriction appliquée',
    ),
    rows,
    orderRows,
    fills: (evidence.order?.fills ?? []).map((fill) => ({
      typeLabel: fill.fillType === 'open' ? 'Ouverture' : 'Clôture',
      quantity: fill.quantity,
      price: fill.price,
      realizedPnl: formatUsd(fill.realizedPnl),
      occurredAtLabel: formatSupportTimestamp(fill.occurredAt),
    })),
  };
}

export interface ContestationView {
  publicId: string;
  ticketPublicId: string;
  ticketHref: string;
  accountPublicId: string | null;
  targetLabel: string;
  statusLabel: string;
  /** Où en est le dossier, dit à la personne qui attend. */
  nextAction: string;
  tone: SupportTone;
  status: ContestationStatus;
  reasonLabel: string;
  traderStatement: string;
  decisionLabel: string | null;
  decisionReason: string | null;
  openedAtLabel: string;
  resolvedAtLabel: string | null;
  evidence: ContestationEvidenceView | null;
  replacementAccountPublicId: string | null;
  replacementAccountHref: string | null;
}

/**
 * What an operator concluded, said plainly.
 *
 * `requires_escalation` is not dressed up. A trader whose dispute went beyond
 * what a first-line operator may decide is told that, rather than being handed
 * a word that sounds like a verdict.
 */
export const CONTESTATION_DECISION_LABELS: Record<string, string> = {
  upheld: 'Décision maintenue',
  overturned: 'Décision annulée',
  requires_escalation: 'Dossier escaladé',
  correction_required: 'Correction en préparation',
  decision_corrected: 'Décision corrigée',
  finance_compliance_review: 'Examen en cours',
};

export function projectContestationView(detail: ContestationDetail): ContestationView {
  return {
    publicId: detail.publicId,
    ticketPublicId: detail.ticketPublicId,
    ticketHref: `/support/demandes/${detail.ticketPublicId}`,
    accountPublicId: detail.accountPublicId,
    targetLabel: CONTESTATION_TARGET_LABELS[detail.targetType],
    statusLabel: CONTESTATION_STATUS_LABELS[detail.status],
    nextAction: CONTESTATION_STATUS_NEXT_ACTION[detail.status],
    tone: CONTESTATION_STATUS_TONE[detail.status],
    status: detail.status,
    reasonLabel: CONTESTATION_REASON_LABELS[detail.reasonCategory],
    traderStatement: detail.traderStatement,
    decisionLabel: detail.decision ? (CONTESTATION_DECISION_LABELS[detail.decision] ?? null) : null,
    decisionReason: detail.decisionReason,
    openedAtLabel: formatSupportTimestamp(detail.openedAt),
    resolvedAtLabel: detail.resolvedAt ? formatSupportTimestamp(detail.resolvedAt) : null,
    evidence: detail.evidence ? projectTraderContestationEvidence(detail.evidence) : null,
    replacementAccountPublicId: detail.replacementAccountPublicId ?? null,
    replacementAccountHref: detail.replacementAccountId
      ? `/hub?account=${encodeURIComponent(detail.replacementAccountId)}`
      : null,
  };
}

export async function buildContestationView(
  db: Db,
  params: { userId: string; publicId: string },
): Promise<ContestationView | null> {
  const detail = await loadContestationForUser(db, params);
  return detail ? projectContestationView(detail) : null;
}
