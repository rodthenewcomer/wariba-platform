import type { Expression, ExpressionBuilder, SqlBool } from 'kysely';
import type { Db } from './client';
import type { Database } from './schema';

/**
 * Prompt 09 — read-only access to the immutable audit trail.
 *
 * This module deliberately exposes queries and nothing else. `audit.audit_events`
 * is the evidence of record for every sensitive staff action, so Control can
 * search it and can do nothing else to it: there is no update, no delete, no
 * backfill, and no write path here at all. Writes have exactly one entrance —
 * `recordStaffAuditEvent`, inside the same transaction as the mutation it
 * describes — and Prompt 09 does not add a second.
 */
export interface AuditEventFilters {
  actorId?: string;
  role?: string;
  /** Matches `permission` or `action`; operators think of these as one thing. */
  activity?: string;
  targetType?: string;
  targetId?: string;
  correlationId?: string;
  occurredFrom?: Date;
  occurredTo?: Date;
}

export interface AuditEventRecord {
  id: string;
  actorType: string;
  actorId: string | null;
  role: string | null;
  permission: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  source: string;
  correlationId: string | null;
  occurredAt: Date;
}

export interface AuditEventPage {
  events: readonly AuditEventRecord[];
  /** Total matching rows, so an operator knows whether they are seeing everything. */
  total: number;
  page: number;
  pageSize: number;
}

export const AUDIT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

/**
 * Every filter as one composable expression, so the page query and the count
 * query cannot drift apart — a mismatch there would report a total that does
 * not describe the rows on screen.
 */
function auditFilterExpression(filters: AuditEventFilters) {
  return (eb: ExpressionBuilder<Database, 'audit.audit_events'>): Expression<SqlBool> => {
    const clauses: Expression<SqlBool>[] = [];
    if (filters.actorId) clauses.push(eb('actor_id', '=', filters.actorId));
    if (filters.role) clauses.push(eb('role', '=', filters.role));
    if (filters.targetType) clauses.push(eb('target_type', '=', filters.targetType));
    if (filters.targetId) clauses.push(eb('target_id', '=', filters.targetId));
    if (filters.correlationId) clauses.push(eb('correlation_id', '=', filters.correlationId));
    if (filters.occurredFrom) clauses.push(eb('occurred_at', '>=', filters.occurredFrom));
    if (filters.occurredTo) clauses.push(eb('occurred_at', '<=', filters.occurredTo));
    // `activity` matches either column — an operator searching
    // "payout.approve" should not have to know whether it was recorded as
    // the permission or the action.
    if (filters.activity) {
      const activity = filters.activity;
      clauses.push(eb.or([eb('permission', '=', activity), eb('action', '=', activity)]));
    }
    return eb.and(clauses);
  };
}

export async function searchAuditEvents(
  db: Db,
  params: { filters?: AuditEventFilters; page?: number; pageSize?: number } = {},
): Promise<AuditEventPage> {
  const filters = params.filters ?? {};
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? AUDIT_PAGE_SIZE));

  const where = auditFilterExpression(filters);

  const [records, totals] = await Promise.all([
    db
      .selectFrom('audit.audit_events')
      .selectAll()
      .where(where)
      .orderBy('occurred_at', 'desc')
      .orderBy('id', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute(),
    db
      .selectFrom('audit.audit_events')
      .select((expression) => expression.fn.countAll().as('count'))
      .where(where)
      .executeTakeFirst(),
  ]);

  return {
    events: records.map((row) => ({
      id: row.id,
      actorType: row.actor_type,
      actorId: row.actor_id,
      role: row.role,
      permission: row.permission,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      before: row.before_json,
      after: row.after_json,
      reason: row.reason,
      source: row.source,
      correlationId: row.correlation_id,
      occurredAt: row.occurred_at,
    })),
    total: Number(totals?.count ?? 0),
    page,
    pageSize,
  };
}

/** Distinct values for the filter controls, so operators filter by what exists. */
export async function loadAuditFilterOptions(db: Db): Promise<{
  roles: readonly string[];
  activities: readonly string[];
  targetTypes: readonly string[];
}> {
  const [roles, permissions, actions, targetTypes] = await Promise.all([
    db.selectFrom('audit.audit_events').select('role').distinct().orderBy('role').execute(),
    db
      .selectFrom('audit.audit_events')
      .select('permission')
      .distinct()
      .orderBy('permission')
      .execute(),
    db.selectFrom('audit.audit_events').select('action').distinct().orderBy('action').execute(),
    db
      .selectFrom('audit.audit_events')
      .select('target_type')
      .distinct()
      .orderBy('target_type')
      .execute(),
  ]);

  const activities = new Set<string>();
  for (const row of permissions) if (row.permission) activities.add(row.permission);
  for (const row of actions) activities.add(row.action);

  return {
    roles: roles.map((row) => row.role).filter((role): role is string => role !== null),
    activities: [...activities].sort(),
    targetTypes: targetTypes.map((row) => row.target_type),
  };
}
