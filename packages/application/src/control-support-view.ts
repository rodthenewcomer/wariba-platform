import {
  loadControlContestation,
  loadControlContestationQueue,
  loadControlSupportQueue,
  loadControlSupportTicket,
  type ControlContestationFilters,
  type ControlSupportFilters,
  type Db,
} from '@wariba/database';
import { maskEmail } from './control-pii';
import {
  CONSEQUENCE_LABELS,
  CONTESTATION_DECISION_LABELS,
  CONTESTATION_REASON_LABELS,
  CONTESTATION_STATUS_LABELS,
  CONTESTATION_TARGET_LABELS,
  SUPPORT_CATEGORY_SHORT,
  SUPPORT_STATUS_LABELS,
  formatAge,
  formatSupportTimestamp,
  projectContestationEvidence,
  type ContestationEvidenceView,
  type EvidenceRow,
} from './support-view';
import { accountStatusLabel } from './account-status-labels';

/**
 * Phase 3.2 — the operator's read of Support and Contestations.
 *
 * Two rules shape everything here.
 *
 * **The list masks; the detail does not.** A support queue necessarily spans
 * every trader on the platform, so it is the single best place to harvest
 * addresses from. `maskEmail` keeps a row recognisable to an operator who
 * already knows who they are looking for and useless to anyone collecting.
 * The detail page — opened one trader at a time, for a reason — shows the
 * address.
 *
 * **The operator reads the trader's evidence, not a second version of it.**
 * The contestation detail projects through `projectContestationEvidence`, the
 * same function the trader's own page uses. A dispute where the two sides see
 * different renderings of the same event cannot be settled.
 */

export type ControlSupportSearchParams = Record<string, string | string[] | undefined>;

export const CONTROL_SUPPORT_STATUSES = [
  'open',
  'waiting_for_user',
  'under_review',
  'resolved',
  'closed',
] as const;

export const CONTROL_SUPPORT_CATEGORIES = [
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
] as const;

export const CONTROL_SUPPORT_ASSIGNMENTS = ['assigned', 'unassigned', 'mine'] as const;

/** Age buckets an operator actually triages by. */
export const CONTROL_SUPPORT_AGES: Record<string, number> = {
  '4h': 4,
  '24h': 24,
  '72h': 72,
};

export const CONTROL_SUPPORT_FILTER_LABELS: Record<string, string> = {
  status: 'Statut',
  category: 'Catégorie',
  assignment: 'Affectation',
  age: 'Ancienneté',
  q: 'Recherche',
};

export interface ControlSupportQuery {
  filters: ControlSupportFilters;
  page: number;
  /** Values that could not be applied, reported rather than silently dropped. */
  ignored: readonly string[];
}

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Parses the queue's URL query.
 *
 * Same contract as Control's other explorers: filters live in the URL so a
 * triage session can be shared and reloaded, every value is untrusted, and an
 * unusable one is dropped *and named* — a filter that silently does nothing is
 * how an operator concludes the queue is empty.
 */
export function parseControlSupportQuery(params: ControlSupportSearchParams): ControlSupportQuery {
  const ignored: string[] = [];
  const filters: ControlSupportFilters = {};

  const status = first(params.status);
  if (status && (CONTROL_SUPPORT_STATUSES as readonly string[]).includes(status)) {
    filters.status = status as NonNullable<ControlSupportFilters['status']>;
  } else if (status) ignored.push('status');

  const category = first(params.category);
  if (category && (CONTROL_SUPPORT_CATEGORIES as readonly string[]).includes(category)) {
    filters.category = category as NonNullable<ControlSupportFilters['category']>;
  } else if (category) ignored.push('category');

  const assignment = first(params.assignment);
  if (assignment && (CONTROL_SUPPORT_ASSIGNMENTS as readonly string[]).includes(assignment)) {
    filters.assignment = assignment as 'assigned' | 'unassigned' | 'mine';
  } else if (assignment) ignored.push('assignment');

  const age = first(params.age);
  if (age && CONTROL_SUPPORT_AGES[age] !== undefined) {
    filters.minAgeHours = CONTROL_SUPPORT_AGES[age] as number;
  } else if (age) ignored.push('age');

  const query = first(params.q);
  if (query) filters.query = query;

  const rawPage = first(params.page);
  const parsedPage = rawPage ? Number.parseInt(rawPage, 10) : 1;
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  if (rawPage && page === 1 && rawPage !== '1') ignored.push('page');

  return { filters, page, ignored };
}

/**
 * Paging that keeps the filters.
 *
 * Only the keys a queue actually parses are carried forward, so a stray
 * parameter someone pasted into the URL does not survive a page change and
 * reappear as a filter that was never applied. Both queues use this; they
 * differ only in which keys they own.
 */
const SUPPORT_QUERY_KEYS = ['status', 'category', 'assignment', 'age', 'q'] as const;
const CONTESTATION_QUERY_KEYS = ['status', 'target', 'reason', 'assignment', 'q'] as const;

export function controlSupportPageHref(
  params: ControlSupportSearchParams,
  page: number,
  basePath = '/control/support',
): string {
  const keys = basePath === '/control/contestations' ? CONTESTATION_QUERY_KEYS : SUPPORT_QUERY_KEYS;
  const search = new URLSearchParams();
  for (const key of keys) {
    const value = first(params[key]);
    if (value) search.set(key, value);
  }
  if (page > 1) search.set('page', String(page));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export interface ControlSupportQueueItem {
  publicId: string;
  href: string;
  traderMasked: string;
  categoryLabel: string;
  accountPublicId: string | null;
  statusLabel: string;
  status: string;
  ageLabel: string;
  lastActivityLabel: string;
  assignedLabel: string;
  hasContestation: boolean;
}

export interface ControlSupportQueueView {
  items: readonly ControlSupportQueueItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function buildControlSupportQueueView(
  db: Db,
  params: { filters: ControlSupportFilters; page: number; now?: Date; currentStaffId?: string },
): Promise<ControlSupportQueueView> {
  const now = params.now ?? new Date();
  const filters = resolveAssignment(params.filters, params.currentStaffId);
  const result = await loadControlSupportQueue(db, {
    filters,
    page: params.page,
    now,
  });

  return {
    items: result.items.map((row) => ({
      publicId: row.publicId,
      href: `/control/support/${row.publicId}`,
      traderMasked: maskEmail(row.traderEmail),
      categoryLabel: SUPPORT_CATEGORY_SHORT[row.category],
      accountPublicId: row.accountPublicId,
      statusLabel: SUPPORT_STATUS_LABELS[row.status],
      status: row.status,
      ageLabel: formatAge(row.createdAt, now),
      lastActivityLabel: formatSupportTimestamp(row.updatedAt),
      // Unassigned is the state that needs acting on, so it is named rather
      // than left as an empty cell an operator has to interpret.
      assignedLabel: row.assignedStaffEmail ?? 'Non affectée',
      hasContestation: row.hasContestation,
    })),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: Math.max(1, Math.ceil(result.total / result.pageSize)),
  };
}

export interface ControlSupportTicketView {
  publicId: string;
  subject: string;
  traderEmail: string;
  traderUserId: string;
  categoryLabel: string;
  statusLabel: string;
  status: string;
  priority: string;
  assignedStaffId: string | null;
  version: number;
  assignedLabel: string;
  correlationId: string;
  createdAtLabel: string;
  updatedAtLabel: string;
  ageLabel: string;
  accountRows: readonly EvidenceRow[];
  accountPublicId: string | null;
  linkedAccount: {
    accountId: string;
    publicId: string;
    relationLabel: string;
  } | null;
  messages: readonly {
    authorLabel: string;
    isStaff: boolean;
    isSystem: boolean;
    body: string;
    timestampLabel: string;
  }[];
  contestation: { publicId: string; statusLabel: string; href: string } | null;
  operatorHistory: readonly {
    actionLabel: string;
    actorLabel: string;
    reason: string;
    occurredAtLabel: string;
  }[];
}

export async function buildControlSupportTicketView(
  db: Db,
  params: { publicId: string; now?: Date },
): Promise<ControlSupportTicketView | null> {
  const now = params.now ?? new Date();
  const ticket = await loadControlSupportTicket(db, { publicId: params.publicId });
  if (!ticket) return null;

  return {
    publicId: ticket.publicId,
    subject: ticket.subject,
    traderEmail: ticket.traderEmail ?? '—',
    traderUserId: ticket.traderUserId,
    categoryLabel: SUPPORT_CATEGORY_SHORT[ticket.category],
    statusLabel: SUPPORT_STATUS_LABELS[ticket.status],
    status: ticket.status,
    priority: ({ low: 'Basse', normal: 'Normale', high: 'Haute', urgent: 'Urgente' } as const)[
      ticket.priority
    ],
    assignedStaffId: ticket.assignedStaffId,
    version: ticket.version,
    assignedLabel: ticket.assignedStaffEmail ?? 'Non affectée',
    correlationId: ticket.correlationId,
    createdAtLabel: formatSupportTimestamp(ticket.createdAt),
    updatedAtLabel: formatSupportTimestamp(ticket.updatedAt),
    ageLabel: formatAge(ticket.createdAt, now),
    accountPublicId: ticket.account?.accountPublicId ?? null,
    linkedAccount: ticket.account?.linkedAccount
      ? {
          accountId: ticket.account.linkedAccount.accountId,
          publicId: ticket.account.linkedAccount.accountPublicId,
          relationLabel:
            ticket.account.linkedAccount.relation === 'source_evaluation'
              ? 'Évaluation d’origine'
              : 'Compte Performance créé',
        }
      : null,
    accountRows: ticket.account
      ? [
          { label: 'Compte', value: ticket.account.accountPublicId, numeric: true },
          {
            label: 'Programme',
            value:
              ticket.account.programType === 'WARIBA_PERFORMANCE'
                ? 'WARIBA Performance'
                : 'WARIBA ONE',
          },
          { label: 'Statut', value: accountStatusLabel(ticket.account.status) },
          {
            label: 'Nominal',
            value: `${ticket.account.nominalBalance} ${ticket.account.currency}`,
            numeric: true,
          },
          ...(ticket.account.linkedAccount
            ? [
                {
                  label:
                    ticket.account.linkedAccount.relation === 'source_evaluation'
                      ? 'Évaluation d’origine'
                      : 'Compte Performance créé',
                  value: ticket.account.linkedAccount.accountPublicId,
                  numeric: true,
                },
              ]
            : []),
        ]
      : [],
    messages: ticket.messages.map((message) => ({
      authorLabel:
        message.actorType === 'trader'
          ? 'Trader'
          : message.actorType === 'system'
            ? 'Système'
            : (message.actorEmail ?? 'Opérateur'),
      isStaff: message.actorType === 'staff',
      isSystem: message.actorType === 'system',
      body: message.body,
      timestampLabel: formatSupportTimestamp(message.createdAt),
    })),
    contestation: ticket.contestation
      ? {
          publicId: ticket.contestation.publicId,
          statusLabel:
            CONTESTATION_STATUS_LABELS[
              ticket.contestation.status as keyof typeof CONTESTATION_STATUS_LABELS
            ] ?? ticket.contestation.status,
          href: `/control/contestations/${ticket.contestation.publicId}`,
        }
      : null,
    operatorHistory: ticket.operatorHistory.map((event) => ({
      actionLabel:
        (
          {
            'support_ticket.assigned': 'Affectation',
            'support_ticket.replied': 'Réponse envoyée',
            'support_ticket.information_requested': 'Information demandée',
            'support_ticket.resolved': 'Résolution',
            'support_ticket.closed': 'Clôture',
          } as Record<string, string>
        )[event.action] ?? 'Action opérateur',
      actorLabel: event.actorEmail ?? 'Opérateur',
      reason: event.reason ?? '—',
      occurredAtLabel: formatSupportTimestamp(event.occurredAt),
    })),
  };
}

// ---------------------------------------------------------------------------
// Contestations
// ---------------------------------------------------------------------------

export const CONTROL_CONTESTATION_STATUSES = [
  'open',
  'under_review',
  'needs_information',
  'upheld',
  'overturned',
  'closed',
  'correction_required',
  'decision_corrected',
  'finance_compliance_review',
] as const;

export const CONTROL_CONTESTATION_TARGETS = [
  'account_breach',
  'risk_decision',
  'payout_decision',
] as const;

export const CONTROL_CONTESTATION_REASONS = [
  'rule_misapplied',
  'market_data_disputed',
  'execution_error',
  'evidence_incomplete',
  'other',
] as const;

export const CONTROL_CONTESTATION_FILTER_LABELS: Record<string, string> = {
  status: 'Statut',
  target: 'Objet',
  reason: 'Motif',
  assignment: 'Affectation',
  q: 'Recherche',
};

export interface ControlContestationQuery {
  filters: ControlContestationFilters;
  page: number;
  ignored: readonly string[];
}

export function parseControlContestationQuery(
  params: ControlSupportSearchParams,
): ControlContestationQuery {
  const ignored: string[] = [];
  const filters: ControlContestationFilters = {};

  const status = first(params.status);
  if (status && (CONTROL_CONTESTATION_STATUSES as readonly string[]).includes(status)) {
    filters.status = status as NonNullable<ControlContestationFilters['status']>;
  } else if (status) ignored.push('status');

  const target = first(params.target);
  if (target && (CONTROL_CONTESTATION_TARGETS as readonly string[]).includes(target)) {
    filters.targetType = target as NonNullable<ControlContestationFilters['targetType']>;
  } else if (target) ignored.push('target');

  const reason = first(params.reason);
  if (reason && (CONTROL_CONTESTATION_REASONS as readonly string[]).includes(reason)) {
    filters.reasonCategory = reason as NonNullable<ControlContestationFilters['reasonCategory']>;
  } else if (reason) ignored.push('reason');

  const assignment = first(params.assignment);
  if (assignment && (CONTROL_SUPPORT_ASSIGNMENTS as readonly string[]).includes(assignment)) {
    filters.assignment = assignment as 'assigned' | 'unassigned' | 'mine';
  } else if (assignment) ignored.push('assignment');

  const query = first(params.q);
  if (query) filters.query = query;

  const rawPage = first(params.page);
  const parsedPage = rawPage ? Number.parseInt(rawPage, 10) : 1;
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  if (rawPage && page === 1 && rawPage !== '1') ignored.push('page');

  return { filters, page, ignored };
}

export interface ControlContestationQueueItem {
  publicId: string;
  href: string;
  ticketPublicId: string;
  traderMasked: string;
  accountPublicId: string | null;
  targetLabel: string;
  ruleLabel: string;
  reasonLabel: string;
  statusLabel: string;
  status: string;
  ageLabel: string;
  lastActivityLabel: string;
  reviewerLabel: string;
}

export interface ControlContestationQueueView {
  items: readonly ControlContestationQueueItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function buildControlContestationQueueView(
  db: Db,
  params: {
    filters: ControlContestationFilters;
    page: number;
    now?: Date;
    currentStaffId?: string;
  },
): Promise<ControlContestationQueueView> {
  const now = params.now ?? new Date();
  const result = await loadControlContestationQueue(db, {
    filters: resolveAssignment(params.filters, params.currentStaffId),
    page: params.page,
  });

  return {
    items: result.items.map((row) => ({
      publicId: row.publicId,
      href: `/control/contestations/${row.publicId}`,
      ticketPublicId: row.ticketPublicId,
      traderMasked: maskEmail(row.traderEmail),
      accountPublicId: row.accountPublicId,
      targetLabel: CONTESTATION_TARGET_LABELS[row.targetType],
      ruleLabel: row.ruleCode ?? '—',
      reasonLabel: CONTESTATION_REASON_LABELS[row.reasonCategory],
      statusLabel: CONTESTATION_STATUS_LABELS[row.status],
      status: row.status,
      ageLabel: formatAge(row.openedAt, now),
      lastActivityLabel: formatSupportTimestamp(row.updatedAt),
      reviewerLabel: row.assignedStaffEmail ?? 'Non affectée',
    })),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: Math.max(1, Math.ceil(result.total / result.pageSize)),
  };
}

function resolveAssignment<T extends ControlSupportFilters | ControlContestationFilters>(
  filters: T,
  currentStaffId: string | undefined,
): T {
  if (filters.assignment !== 'mine') return filters;
  const { assignment: _assignment, ...rest } = filters;
  return {
    ...rest,
    ...(currentStaffId ? { assignedStaffId: currentStaffId } : {}),
  } as T;
}

export interface ControlContestationView {
  publicId: string;
  ticketPublicId: string;
  ticketHref: string;
  traderEmail: string;
  accountPublicId: string | null;
  targetLabel: string;
  statusLabel: string;
  status: string;
  reasonLabel: string;
  traderStatement: string;
  decisionLabel: string | null;
  decisionReason: string | null;
  openedAtLabel: string;
  reviewedAtLabel: string | null;
  resolvedAtLabel: string | null;
  reviewerLabel: string;
  assignedStaffId: string | null;
  replacementAccountPublicId: string | null;
  accountProgramLabel: string | null;
  accountNominalLabel: string | null;
  version: number;
  correlationId: string;
  consequenceLabel: string | null;
  evidence: ContestationEvidenceView | null;
  /** The identifiers pinned at creation, so the operator can prove what was contested. */
  evidenceRefRows: readonly EvidenceRow[];
  /** True while an operator may still take review or record an outcome. */
  isLive: boolean;
  operatorHistory: readonly {
    actionLabel: string;
    actorLabel: string;
    reason: string;
    occurredAtLabel: string;
  }[];
}

const LIVE_STATUSES = new Set(['open', 'under_review', 'needs_information']);

export async function buildControlContestationView(
  db: Db,
  params: { publicId: string },
): Promise<ControlContestationView | null> {
  const detail = await loadControlContestation(db, params);
  if (!detail) return null;

  const ref = (detail.evidenceRef ?? {}) as Record<string, unknown>;
  const evidenceRefRows: EvidenceRow[] = Object.entries(ref)
    .filter(([, value]) => typeof value === 'string' && value.length > 0)
    .map(([key, value]) => ({ label: key, value: value as string, numeric: true }));

  return {
    publicId: detail.publicId,
    ticketPublicId: detail.ticketPublicId,
    ticketHref: `/control/support/${detail.ticketPublicId}`,
    traderEmail: detail.traderEmail ?? '—',
    accountPublicId: detail.accountPublicId,
    targetLabel: CONTESTATION_TARGET_LABELS[detail.targetType],
    statusLabel: CONTESTATION_STATUS_LABELS[detail.status],
    status: detail.status,
    reasonLabel: CONTESTATION_REASON_LABELS[detail.reasonCategory],
    traderStatement: detail.traderStatement,
    decisionLabel: detail.decision ? (CONTESTATION_DECISION_LABELS[detail.decision] ?? null) : null,
    decisionReason: detail.decisionReason,
    openedAtLabel: formatSupportTimestamp(detail.openedAt),
    reviewedAtLabel: detail.reviewedAt ? formatSupportTimestamp(detail.reviewedAt) : null,
    resolvedAtLabel: detail.resolvedAt ? formatSupportTimestamp(detail.resolvedAt) : null,
    reviewerLabel: detail.assignedStaffEmail ?? 'Non affectée',
    assignedStaffId: detail.assignedStaffId,
    replacementAccountPublicId: detail.replacementAccountPublicId,
    accountProgramLabel:
      detail.accountProgramType === 'WARIBA_PERFORMANCE'
        ? 'WARIBA Performance'
        : detail.accountProgramType === 'WARIBA_ONE'
          ? 'WARIBA ONE'
          : null,
    accountNominalLabel:
      detail.accountNominalBalance && detail.accountCurrency
        ? `${detail.accountNominalBalance} ${detail.accountCurrency}`
        : null,
    version: detail.version,
    correlationId: detail.correlationId,
    consequenceLabel: detail.evidence
      ? (CONSEQUENCE_LABELS[detail.evidence.violation.consequence] ??
        detail.evidence.violation.consequence)
      : null,
    evidence: detail.evidence ? projectContestationEvidence(detail.evidence) : null,
    evidenceRefRows,
    isLive: LIVE_STATUSES.has(detail.status),
    operatorHistory: detail.operatorHistory.map((event) => ({
      actionLabel:
        (
          {
            'contestation.assigned': 'Affectation',
            'contestation.review_started': 'Examen commencé',
            'contestation.information_requested': 'Information demandée',
            'contestation.decision_recorded': 'Décision enregistrée',
            'contestation.correction_required': 'Correction requise',
            'contestation.finance_compliance_review_required': 'Examen Finance et Conformité',
            'contestation.replacement_account_issued': 'Compte de remplacement créé',
          } as Record<string, string>
        )[event.action] ?? 'Action opérateur',
      actorLabel: event.actorEmail ?? 'Opérateur',
      reason: event.reason ?? '—',
      occurredAtLabel: formatSupportTimestamp(event.occurredAt),
    })),
  };
}
