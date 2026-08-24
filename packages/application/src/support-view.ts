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
import { accountStatusLabel } from './account-status-labels';
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

/** Short form for a dense list column, where the sentence does not fit. */
export const SUPPORT_CATEGORY_SHORT: Record<SupportTicketCategory, string> = {
  general: 'Général',
  account: 'Compte',
  trading: 'Trading',
  risk: 'Risque',
  breach: 'Breach',
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
 * What the trader should do next, per status.
 *
 * A status word says where a request stands; it does not say whose turn it is.
 * `waiting_for_user` in particular is useless without this — a trader reads
 * "En attente" and waits, which is the exact opposite of what is being asked.
 */
export const SUPPORT_STATUS_NEXT_ACTION: Record<SupportTicketStatus, string> = {
  open: 'Reçue. Un opérateur WARIBA la prendra en charge.',
  waiting_for_user: 'WARIBA attend une précision de votre part.',
  under_review: 'Un opérateur WARIBA examine votre demande.',
  resolved: 'Une réponse a été apportée. Répondez si le sujet n’est pas clos.',
  closed: 'Cette demande est clôturée. Ouvrez-en une nouvelle si nécessaire.',
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
};

export const CONTESTATION_STATUS_TONE: Record<ContestationStatus, SupportTone> = {
  open: 'neutral',
  under_review: 'progress',
  needs_information: 'attention',
  upheld: 'muted',
  overturned: 'success',
  closed: 'muted',
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
  evidence_incomplete: 'Les preuves me paraissent incomplètes',
  other: 'Autre motif',
};

export const CONTESTATION_TARGET_LABELS: Record<ContestationTargetType, string> = {
  account_breach: 'Compte terminé',
  risk_decision: 'Décision de risque',
  payout_decision: 'Décision de payout',
};

/** How a contested decision restricted the account, in a trader's words. */
export const CONSEQUENCE_LABELS: Record<string, string> = {
  hard_breach: 'Compte terminé',
  soft_lock: 'Blocage temporaire',
  entry_lock: 'Blocage des entrées',
  blocks_pass: 'Passage bloqué',
  none: 'Aucune conséquence',
};

/**
 * What set the risk engine running, in the product's language.
 *
 * `trade_order` / `daily_finalization` / `manual_review` are database enum
 * values, and a contestation page that prints one is the schema talking
 * directly to a person — the same layering gap `account-status-labels.ts`
 * exists to close. The fallback is the raw value on purpose: an unmapped
 * trigger is a schema change nobody propagated, and an identifier on screen is
 * unmistakable in a way an invented French phrase would not be.
 */
export const TRIGGER_EVENT_LABELS: Record<string, string> = {
  trade_order: 'Ordre de trading',
  daily_finalization: 'Finalisation de journée',
  manual_review: 'Examen manuel',
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
      label: 'Version de policy',
      value: `${evidence.policy.program} ${evidence.policy.semanticVersion}`,
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
    ruleLabel: RISK_RULE_LABELS[evidence.violation.ruleCode] ?? evidence.violation.ruleCode,
    ruleCode: evidence.violation.ruleCode,
    consequenceLabel:
      CONSEQUENCE_LABELS[evidence.violation.consequence] ?? evidence.violation.consequence,
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
  tone: SupportTone;
  status: ContestationStatus;
  reasonLabel: string;
  traderStatement: string;
  decisionLabel: string | null;
  decisionReason: string | null;
  openedAtLabel: string;
  resolvedAtLabel: string | null;
  correlationId: string;
  evidence: ContestationEvidenceView | null;
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
};

export function projectContestationView(detail: ContestationDetail): ContestationView {
  return {
    publicId: detail.publicId,
    ticketPublicId: detail.ticketPublicId,
    ticketHref: `/support/demandes/${detail.ticketPublicId}`,
    accountPublicId: detail.accountPublicId,
    targetLabel: CONTESTATION_TARGET_LABELS[detail.targetType],
    statusLabel: CONTESTATION_STATUS_LABELS[detail.status],
    tone: CONTESTATION_STATUS_TONE[detail.status],
    status: detail.status,
    reasonLabel: CONTESTATION_REASON_LABELS[detail.reasonCategory],
    traderStatement: detail.traderStatement,
    decisionLabel: detail.decision ? (CONTESTATION_DECISION_LABELS[detail.decision] ?? null) : null,
    decisionReason: detail.decisionReason,
    openedAtLabel: formatSupportTimestamp(detail.openedAt),
    resolvedAtLabel: detail.resolvedAt ? formatSupportTimestamp(detail.resolvedAt) : null,
    correlationId: detail.correlationId,
    evidence: detail.evidence ? projectContestationEvidence(detail.evidence) : null,
  };
}

export async function buildContestationView(
  db: Db,
  params: { userId: string; publicId: string },
): Promise<ContestationView | null> {
  const detail = await loadContestationForUser(db, params);
  return detail ? projectContestationView(detail) : null;
}
