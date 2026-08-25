import {
  loadControlPassReviewCase,
  loadControlPassReviewQueue,
  recordStaffAuditEvent,
  setPassReviewOperatorStateInTransaction,
  type Db,
  type PassReviewFilters,
  type PassReviewOperatorStatus,
} from '@wariba/database';
import { buildAccountMissionView } from './mission-view';
import { buildAccountRiskView } from './risk-view';
import { displayName, maskEmail } from './control-pii';
import { formatAge, formatSupportTimestamp } from './support-view';

export type ControlPassReviewSearchParams = Record<string, string | string[] | undefined>;
export const PASS_REVIEW_STATUSES = ['awaiting_review', 'reviewed', 'integrity_escalated'] as const;

function first(value: string | string[] | undefined): string | undefined {
  const item = Array.isArray(value) ? value[0] : value;
  const trimmed = item?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseControlPassReviewQuery(params: ControlPassReviewSearchParams): {
  filters: PassReviewFilters;
  page: number;
  ignored: readonly string[];
} {
  const filters: PassReviewFilters = {};
  const ignored: string[] = [];
  const status = first(params.status);
  if (status && (PASS_REVIEW_STATUSES as readonly string[]).includes(status)) {
    filters.status = status as NonNullable<PassReviewFilters['status']>;
  } else if (status) ignored.push('status');
  const query = first(params.q);
  if (query) filters.query = query;
  const rawPage = first(params.page);
  const parsed = rawPage ? Number.parseInt(rawPage, 10) : 1;
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  if (rawPage && page === 1 && rawPage !== '1') ignored.push('page');
  return { filters, page, ignored };
}

export async function buildControlPassReviewQueueView(
  db: Db,
  params: { filters: PassReviewFilters; page: number; now?: Date },
) {
  const now = params.now ?? new Date();
  const result = await loadControlPassReviewQueue(db, params);
  return {
    items: result.items.map((row) => {
      const enteredAt = row.reviewEnteredAt ?? row.updatedAt;
      return {
        accountPublicId: row.accountPublicId,
        href: `/control/pass-reviews/${row.accountPublicId}`,
        traderLabel: traderIdentity(row.traderFirstName, row.traderLastName, row.traderEmail),
        programLabel: 'WARIBA ONE',
        nominalLabel: `${row.nominalBalance} ${row.currency}`,
        targetStatusLabel: 'Objectif atteint',
        ruleStatusLabel:
          row.lifecycleStatus === 'passed' ? 'Contrôles finalisés' : 'Traitement système en cours',
        enteredAtLabel: formatSupportTimestamp(enteredAt),
        ageLabel: formatAge(enteredAt, now),
        status: row.operatorStatus ?? 'awaiting_review',
        statusLabel:
          row.operatorStatus === 'reviewed'
            ? 'Revue effectuée'
            : row.operatorStatus === 'integrity_escalated'
              ? 'Doute d’intégrité signalé'
              : 'À revoir',
        assignedLabel: row.assignedStaffEmail ?? 'Non affectée',
        operatorVersion: row.operatorVersion,
        policyVersion: row.policyVersion,
      };
    }),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: Math.max(1, Math.ceil(result.total / result.pageSize)),
  };
}

export async function buildControlPassReviewDetailView(
  db: Db,
  params: { accountPublicId: string; now?: Date },
) {
  const now = params.now ?? new Date();
  const facts = await loadControlPassReviewCase(db, params);
  if (!facts) return null;
  // Both projections may materialize today's canonical risk snapshot. Keep
  // them sequential so a previously unseen account cannot race the unique
  // (account_id, trading_day) constraint on first load in Control.
  const mission = await buildAccountMissionView(db, { accountId: facts.accountId, now });
  const risk = await buildAccountRiskView(db, { accountId: facts.accountId, now });
  if (!mission.available) {
    throw new Error(`Mission système indisponible pour ${facts.accountPublicId}.`);
  }
  return {
    ...facts,
    traderLabel: traderIdentity(facts.traderFirstName, facts.traderLastName, facts.traderEmail),
    nominalLabel: `${facts.nominalBalance} ${facts.currency}`,
    lifecycleStatusLabel:
      facts.lifecycleStatus === 'passed' ? 'Évaluation réussie' : 'Traitement système en cours',
    activatedAtLabel: facts.activatedAt ? formatSupportTimestamp(facts.activatedAt) : '—',
    reviewEnteredAtLabel: facts.reviewEnteredAt
      ? formatSupportTimestamp(facts.reviewEnteredAt)
      : 'Transition non enregistrée',
    passedAtLabel: facts.passedAt ? formatSupportTimestamp(facts.passedAt) : null,
    conditions: mission.conditions,
    risk: {
      status: risk.status,
      dailyLossRemaining: risk.dailyLossRemainingFormatted,
      maximumLossRemaining: risk.maximumLossRemainingFormatted,
      currentEquity: risk.currentEquityFormatted,
      violations: risk.violations,
    },
    finalization: {
      accountPassed: facts.lifecycleStatus === 'passed',
      performanceCreated: facts.performanceAccountId !== null,
      label:
        facts.lifecycleStatus === 'passed' && facts.performanceAccountId
          ? 'Finalisée — compte Performance créé'
          : 'Traitement automatique non finalisé',
    },
    operatorStatusLabel:
      facts.operatorStatus === 'reviewed'
        ? 'Revue effectuée'
        : facts.operatorStatus === 'integrity_escalated'
          ? 'Doute d’intégrité signalé'
          : 'À revoir',
    operatorReviewedAtLabel: facts.operatorReviewedAt
      ? formatSupportTimestamp(facts.operatorReviewedAt)
      : null,
    operatorHistory: facts.operatorHistory.map((event) => ({
      actionLabel:
        event.action === 'pass_review.reviewed'
          ? 'Revue effectuée'
          : event.action === 'pass_review.integrity_escalated'
            ? 'Doute d’intégrité signalé'
            : 'Action opérateur',
      actorLabel: event.actorEmail ?? 'Opérateur',
      reason: event.reason ?? '—',
      occurredAtLabel: formatSupportTimestamp(event.occurredAt),
    })),
    operatorActionAuthorized: facts.lifecycleStatus === 'passed',
  };
}

/** ONE-025 authorizes only post-result review and integrity escalation. */
export const PASS_REVIEW_ACTION_BLOCKED_BY_PRODUCT_DECISION = false;

export interface ControlPassReviewActionParams {
  accountPublicId: string;
  staffUserId: string;
  staffRole: string;
  status: PassReviewOperatorStatus;
  reason: string;
  expectedVersion: number;
  correlationId: string;
}

export async function recordPassReviewOperationalState(
  db: Db,
  params: ControlPassReviewActionParams,
): Promise<void> {
  const now = new Date();
  await db.transaction().execute(async (trx) => {
    const change = await setPassReviewOperatorStateInTransaction(trx, {
      accountPublicId: params.accountPublicId,
      staffUserId: params.staffUserId,
      status: params.status,
      reason: params.reason,
      expectedVersion: params.expectedVersion,
      correlationId: params.correlationId,
      now,
    });
    const permission = params.status === 'reviewed' ? 'pass_review.review' : 'pass_review.escalate';
    await recordStaffAuditEvent(trx, {
      actorId: params.staffUserId,
      actorRole: params.staffRole,
      permission,
      action:
        params.status === 'reviewed' ? 'pass_review.reviewed' : 'pass_review.integrity_escalated',
      targetType: 'pass_review',
      targetId: change.accountId,
      before: change.before,
      after: {
        ...change.after,
        accountLifecycleMutated: false,
        financialStateMutated: false,
      },
      reason: params.reason.trim(),
      correlationId: params.correlationId,
      occurredAt: now,
    });
  });
}

function traderIdentity(firstName: string | null, lastName: string | null, email: string | null) {
  const name = displayName(firstName, lastName);
  return name === '—' ? maskEmail(email) : name;
}
