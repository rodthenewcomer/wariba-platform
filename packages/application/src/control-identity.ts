import {
  assignIdentityReviewInTransaction,
  loadIdentityReviewDetail,
  loadIdentityReviewQueue,
  recordStaffAuditEvent,
  setPerformanceAccountComplianceFlags,
  updateIdentityReviewInTransaction,
  type Db,
  type IdentityReviewFilters,
  type IdentityReviewStatus,
} from '@wariba/database';
import { maskEmail } from './control-pii';
import { accountStatusLabel } from './account-status-labels';
import { formatAge, formatSupportTimestamp } from './support-view';

export const IDENTITY_REVIEW_STATUS_LABELS: Record<IdentityReviewStatus, string> = {
  requested: 'À examiner',
  under_review: 'En cours d’examen',
  needs_information: 'Information requise',
  verified: 'Identité vérifiée',
  unable_to_verify: 'Vérification non aboutie',
  closed: 'Clôturée',
};

export const IDENTITY_REVIEW_STATUSES = [
  'requested',
  'under_review',
  'needs_information',
  'verified',
  'unable_to_verify',
  'closed',
] as const;

export const IDENTITY_REVIEW_ASSIGNMENTS = ['assigned', 'unassigned', 'mine'] as const;
export type ControlIdentitySearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const item = Array.isArray(value) ? value[0] : value;
  const trimmed = item?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseControlIdentityQuery(params: ControlIdentitySearchParams): {
  filters: IdentityReviewFilters;
  page: number;
  ignored: readonly string[];
} {
  const filters: IdentityReviewFilters = {};
  const ignored: string[] = [];
  const status = first(params.status);
  if (status && (IDENTITY_REVIEW_STATUSES as readonly string[]).includes(status)) {
    filters.status = status as IdentityReviewStatus;
  } else if (status) ignored.push('status');
  const assignment = first(params.assignment);
  if (assignment && (IDENTITY_REVIEW_ASSIGNMENTS as readonly string[]).includes(assignment)) {
    filters.assignment = assignment as NonNullable<IdentityReviewFilters['assignment']>;
  } else if (assignment) ignored.push('assignment');
  const query = first(params.q);
  if (query) filters.query = query;
  const rawPage = first(params.page);
  const parsed = rawPage ? Number.parseInt(rawPage, 10) : 1;
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  if (rawPage && page === 1 && rawPage !== '1') ignored.push('page');
  return { filters, page, ignored };
}

function resolveMine(
  filters: IdentityReviewFilters,
  currentStaffId: string,
): IdentityReviewFilters {
  if (filters.assignment !== 'mine') return filters;
  const { assignment: _assignment, ...rest } = filters;
  return { ...rest, assignedStaffId: currentStaffId };
}

export async function buildControlIdentityQueueView(
  db: Db,
  params: {
    filters: IdentityReviewFilters;
    page: number;
    currentStaffId: string;
    now?: Date;
  },
) {
  const now = params.now ?? new Date();
  const result = await loadIdentityReviewQueue(db, {
    filters: resolveMine(params.filters, params.currentStaffId),
    page: params.page,
  });
  return {
    items: result.items.map((row) => ({
      publicId: row.publicId,
      href: `/control/identity/${row.publicId}`,
      traderMasked: maskEmail(row.traderEmail),
      accountPublicId: row.accountPublicId,
      status: row.status,
      statusLabel: IDENTITY_REVIEW_STATUS_LABELS[row.status],
      requestedAtLabel: formatSupportTimestamp(row.requestedAt),
      ageLabel: formatAge(row.requestedAt, now),
      lastActivityLabel: formatSupportTimestamp(row.updatedAt),
      assignedLabel: row.assignedStaffEmail ?? 'Non affectée',
    })),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: Math.max(1, Math.ceil(result.total / result.pageSize)),
  };
}

export async function buildControlIdentityDetailView(db: Db, params: { publicId: string }) {
  const detail = await loadIdentityReviewDetail(db, params);
  if (!detail) return null;
  return {
    ...detail,
    traderEmail: detail.traderEmail ?? '—',
    accountStatusLabel: accountStatusLabel(detail.accountStatus),
    statusLabel: IDENTITY_REVIEW_STATUS_LABELS[detail.status],
    reasonLabel: 'Premier payout disponible',
    assignedLabel: detail.assignedStaffEmail ?? 'Non affectée',
    requestedAtLabel: formatSupportTimestamp(detail.requestedAt),
    reviewedAtLabel: detail.reviewedAt ? formatSupportTimestamp(detail.reviewedAt) : null,
    resolvedAtLabel: detail.resolvedAt ? formatSupportTimestamp(detail.resolvedAt) : null,
    updatedAtLabel: formatSupportTimestamp(detail.updatedAt),
    isLive: ['requested', 'under_review', 'needs_information'].includes(detail.status),
    operatorHistory: detail.operatorHistory.map((event) => ({
      actionLabel:
        (
          {
            'identity_review.assigned': 'Affectation',
            'identity_review.updated': 'Examen mis à jour',
            'identity_review.decision_recorded': 'Décision enregistrée',
          } as Record<string, string>
        )[event.action] ?? 'Action opérateur',
      actorLabel: event.actorEmail ?? 'Opérateur',
      reason: event.reason ?? '—',
      occurredAtLabel: formatSupportTimestamp(event.occurredAt),
    })),
  };
}

export interface ControlIdentityActionParams {
  publicId: string;
  staffUserId: string;
  staffRole: string;
  expectedVersion: number;
  correlationId: string;
}

export async function assignIdentityReview(
  db: Db,
  params: ControlIdentityActionParams,
): Promise<void> {
  const now = new Date();
  await db.transaction().execute(async (trx) => {
    const change = await assignIdentityReviewInTransaction(trx, {
      publicId: params.publicId,
      staffUserId: params.staffUserId,
      expectedVersion: params.expectedVersion,
      now,
    });
    await recordStaffAuditEvent(trx, {
      actorId: params.staffUserId,
      actorRole: params.staffRole,
      permission: 'identity_review.assign',
      action: 'identity_review.assigned',
      targetType: 'identity_review_case',
      targetId: change.caseId,
      before: change.before,
      after: change.after,
      reason: 'Prise en charge par l’opérateur.',
      correlationId: params.correlationId,
      occurredAt: now,
    });
  });
}

export async function updateIdentityReview(
  db: Db,
  params: ControlIdentityActionParams & {
    nextStatus: 'under_review' | 'needs_information' | 'verified' | 'unable_to_verify';
    decisionReason: string;
    traderMessage: string;
    evidenceReference?: string;
  },
): Promise<void> {
  const now = new Date();
  await db.transaction().execute(async (trx) => {
    const change = await updateIdentityReviewInTransaction(trx, {
      publicId: params.publicId,
      staffUserId: params.staffUserId,
      expectedVersion: params.expectedVersion,
      nextStatus: params.nextStatus,
      decisionReason: params.decisionReason,
      traderMessage: params.traderMessage,
      ...(params.evidenceReference === undefined
        ? {}
        : { evidenceReference: params.evidenceReference }),
      now,
    });
    let complianceChange: unknown = null;
    if (params.nextStatus === 'verified') {
      complianceChange = await setPerformanceAccountComplianceFlags(trx, {
        accountId: change.accountId,
        kycVerified: true,
        now,
      });
    }
    const decision = params.nextStatus === 'verified' || params.nextStatus === 'unable_to_verify';
    await recordStaffAuditEvent(trx, {
      actorId: params.staffUserId,
      actorRole: params.staffRole,
      permission: decision ? 'identity_review.decide' : 'identity_review.review',
      action: decision ? 'identity_review.decision_recorded' : 'identity_review.updated',
      targetType: 'identity_review_case',
      targetId: change.caseId,
      before: change.before,
      after: { ...change.after, complianceChange },
      reason: params.decisionReason,
      correlationId: params.correlationId,
      occurredAt: now,
    });
  });
}
