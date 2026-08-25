import type { Db } from './client';

export type OperationalQueueKind = 'pass_review' | 'identity' | 'support' | 'contestation';

export interface OperationalQueueSummary {
  kind: OperationalQueueKind;
  count: number;
  oldestAt: Date | null;
}

export interface AssignedOperationalCase {
  kind: OperationalQueueKind;
  publicId: string;
  status: string;
  openedAt: Date;
  updatedAt: Date;
}

export interface AgingOperationalCase {
  kind: OperationalQueueKind;
  publicId: string;
  status: string;
  openedAt: Date;
  updatedAt: Date;
}

export interface RecentOperatorDecision {
  action: string;
  targetType: string;
  publicId: string | null;
  actorEmail: string | null;
  reason: string | null;
  occurredAt: Date;
}

export interface ControlOverviewScope {
  passReview: boolean;
  identity: boolean;
  support: boolean;
  contestation: boolean;
}

async function queueSummaries(db: Db, scope: ControlOverviewScope) {
  const pending: Promise<OperationalQueueSummary>[] = [];
  if (scope.passReview) {
    pending.push(
      db
        .selectFrom('app.trading_accounts')
        .leftJoin(
          'app.pass_review_operator_states',
          'app.pass_review_operator_states.account_id',
          'app.trading_accounts.id',
        )
        .select((eb) => [
          eb.fn.countAll<string>().as('count'),
          eb.fn.min<Date>('app.trading_accounts.updated_at').as('oldest_at'),
        ])
        .where('app.trading_accounts.program_type', '=', 'WARIBA_ONE')
        .where('app.trading_accounts.status', '=', 'passed')
        .where((eb) =>
          eb.or([
            eb('app.pass_review_operator_states.account_id', 'is', null),
            eb('app.pass_review_operator_states.status', '=', 'integrity_escalated'),
          ]),
        )
        .executeTakeFirst()
        .then((row) => ({
          kind: 'pass_review' as const,
          count: Number(row?.count ?? 0),
          oldestAt: row?.oldest_at ?? null,
        })),
    );
  }
  if (scope.identity) {
    pending.push(
      db
        .selectFrom('app.identity_review_cases')
        .select((eb) => [
          eb.fn.countAll<string>().as('count'),
          eb.fn.min<Date>('requested_at').as('oldest_at'),
        ])
        .where('status', 'in', ['requested', 'under_review', 'needs_information'])
        .executeTakeFirst()
        .then((row) => ({
          kind: 'identity' as const,
          count: Number(row?.count ?? 0),
          oldestAt: row?.oldest_at ?? null,
        })),
    );
  }
  if (scope.support) {
    pending.push(
      db
        .selectFrom('app.support_tickets')
        .select((eb) => [
          eb.fn.countAll<string>().as('count'),
          eb.fn.min<Date>('created_at').as('oldest_at'),
        ])
        .where('status', 'in', ['open', 'waiting_for_user', 'under_review'])
        .executeTakeFirst()
        .then((row) => ({
          kind: 'support' as const,
          count: Number(row?.count ?? 0),
          oldestAt: row?.oldest_at ?? null,
        })),
    );
  }
  if (scope.contestation) {
    pending.push(
      db
        .selectFrom('app.contestations')
        .select((eb) => [
          eb.fn.countAll<string>().as('count'),
          eb.fn.min<Date>('opened_at').as('oldest_at'),
        ])
        .where('status', 'in', [
          'open',
          'under_review',
          'needs_information',
          'correction_required',
          'finance_compliance_review',
        ])
        .executeTakeFirst()
        .then((row) => ({
          kind: 'contestation' as const,
          count: Number(row?.count ?? 0),
          oldestAt: row?.oldest_at ?? null,
        })),
    );
  }
  return Promise.all(pending);
}

async function assignedCases(db: Db, staffId: string, scope: ControlOverviewScope) {
  const pending: Promise<AssignedOperationalCase[]>[] = [];
  if (scope.passReview) {
    pending.push(
      db
        .selectFrom('app.pass_review_operator_states')
        .innerJoin(
          'app.trading_accounts',
          'app.trading_accounts.id',
          'app.pass_review_operator_states.account_id',
        )
        .select([
          'app.trading_accounts.public_id as public_id',
          'app.pass_review_operator_states.status as status',
          'app.pass_review_operator_states.reviewed_at as opened_at',
          'app.pass_review_operator_states.updated_at as updated_at',
        ])
        .where('app.pass_review_operator_states.assigned_staff_id', '=', staffId)
        .where('app.pass_review_operator_states.status', '=', 'integrity_escalated')
        .orderBy('app.pass_review_operator_states.updated_at', 'asc')
        .limit(8)
        .execute()
        .then((rows) =>
          rows.map((row) => ({
            kind: 'pass_review' as const,
            publicId: row.public_id,
            status: row.status,
            openedAt: row.opened_at,
            updatedAt: row.updated_at,
          })),
        ),
    );
  }
  if (scope.support) {
    pending.push(
      db
        .selectFrom('app.support_tickets')
        .select(['public_id', 'status', 'created_at', 'updated_at'])
        .where('assigned_staff_id', '=', staffId)
        .where('status', 'in', ['open', 'waiting_for_user', 'under_review'])
        .orderBy('updated_at', 'asc')
        .limit(8)
        .execute()
        .then((rows) =>
          rows.map((row) => ({
            kind: 'support' as const,
            publicId: row.public_id,
            status: row.status,
            openedAt: row.created_at,
            updatedAt: row.updated_at,
          })),
        ),
    );
  }
  if (scope.contestation) {
    pending.push(
      db
        .selectFrom('app.contestations')
        .select(['public_id', 'status', 'opened_at', 'updated_at'])
        .where('assigned_staff_id', '=', staffId)
        .where('status', 'in', [
          'open',
          'under_review',
          'needs_information',
          'correction_required',
          'finance_compliance_review',
        ])
        .orderBy('updated_at', 'asc')
        .limit(8)
        .execute()
        .then((rows) =>
          rows.map((row) => ({
            kind: 'contestation' as const,
            publicId: row.public_id,
            status: row.status,
            openedAt: row.opened_at,
            updatedAt: row.updated_at,
          })),
        ),
    );
  }
  if (scope.identity) {
    pending.push(
      db
        .selectFrom('app.identity_review_cases')
        .select(['public_id', 'status', 'requested_at', 'updated_at'])
        .where('assigned_staff_id', '=', staffId)
        .where('status', 'in', ['requested', 'under_review', 'needs_information'])
        .orderBy('updated_at', 'asc')
        .limit(8)
        .execute()
        .then((rows) =>
          rows.map((row) => ({
            kind: 'identity' as const,
            publicId: row.public_id,
            status: row.status,
            openedAt: row.requested_at,
            updatedAt: row.updated_at,
          })),
        ),
    );
  }
  return (await Promise.all(pending))
    .flat()
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
    .slice(0, 8);
}

async function agingCases(db: Db, scope: ControlOverviewScope) {
  const pending: Promise<AgingOperationalCase[]>[] = [];
  if (scope.passReview) {
    pending.push(
      db
        .selectFrom('app.trading_accounts')
        .leftJoin(
          'app.pass_review_operator_states',
          'app.pass_review_operator_states.account_id',
          'app.trading_accounts.id',
        )
        .select([
          'app.trading_accounts.public_id as public_id',
          'app.trading_accounts.status as status',
          'app.trading_accounts.updated_at as updated_at',
        ])
        .where('app.trading_accounts.program_type', '=', 'WARIBA_ONE')
        .where('app.trading_accounts.status', '=', 'passed')
        .where((eb) =>
          eb.or([
            eb('app.pass_review_operator_states.account_id', 'is', null),
            eb('app.pass_review_operator_states.status', '=', 'integrity_escalated'),
          ]),
        )
        .orderBy('app.trading_accounts.updated_at', 'asc')
        .limit(8)
        .execute()
        .then((rows) =>
          rows.map((row) => ({
            kind: 'pass_review' as const,
            publicId: row.public_id,
            status: row.status,
            openedAt: row.updated_at,
            updatedAt: row.updated_at,
          })),
        ),
    );
  }
  if (scope.identity) {
    pending.push(
      db
        .selectFrom('app.identity_review_cases')
        .select(['public_id', 'status', 'requested_at', 'updated_at'])
        .where('status', 'in', ['requested', 'under_review', 'needs_information'])
        .orderBy('requested_at', 'asc')
        .limit(8)
        .execute()
        .then((rows) =>
          rows.map((row) => ({
            kind: 'identity' as const,
            publicId: row.public_id,
            status: row.status,
            openedAt: row.requested_at,
            updatedAt: row.updated_at,
          })),
        ),
    );
  }
  if (scope.support) {
    pending.push(
      db
        .selectFrom('app.support_tickets')
        .select(['public_id', 'status', 'created_at', 'updated_at'])
        .where('status', 'in', ['open', 'waiting_for_user', 'under_review'])
        .orderBy('created_at', 'asc')
        .limit(8)
        .execute()
        .then((rows) =>
          rows.map((row) => ({
            kind: 'support' as const,
            publicId: row.public_id,
            status: row.status,
            openedAt: row.created_at,
            updatedAt: row.updated_at,
          })),
        ),
    );
  }
  if (scope.contestation) {
    pending.push(
      db
        .selectFrom('app.contestations')
        .select(['public_id', 'status', 'opened_at', 'updated_at'])
        .where('status', 'in', [
          'open',
          'under_review',
          'needs_information',
          'correction_required',
          'finance_compliance_review',
        ])
        .orderBy('opened_at', 'asc')
        .limit(8)
        .execute()
        .then((rows) =>
          rows.map((row) => ({
            kind: 'contestation' as const,
            publicId: row.public_id,
            status: row.status,
            openedAt: row.opened_at,
            updatedAt: row.updated_at,
          })),
        ),
    );
  }
  return (await Promise.all(pending))
    .flat()
    .sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime())
    .slice(0, 8);
}

async function recentDecisions(
  db: Db,
  scope: ControlOverviewScope,
): Promise<RecentOperatorDecision[]> {
  const actions: string[] = [];
  if (scope.support)
    actions.push(
      'support_ticket.resolved',
      'support_ticket.closed',
      'support_ticket.information_requested',
    );
  if (scope.contestation)
    actions.push(
      'contestation.decision_recorded',
      'contestation.correction_required',
      'contestation.finance_compliance_review_required',
      'contestation.replacement_account_issued',
    );
  if (scope.passReview) actions.push('pass_review.reviewed', 'pass_review.integrity_escalated');
  if (scope.identity) actions.push('identity_review.decision_recorded', 'identity_review.updated');
  if (actions.length === 0) return [];
  const rows = await db
    .selectFrom('audit.audit_events')
    .leftJoin('auth.users as actor', 'actor.id', 'audit.audit_events.actor_id')
    .leftJoin('app.support_tickets', 'app.support_tickets.id', 'audit.audit_events.target_id')
    .leftJoin('app.contestations', 'app.contestations.id', 'audit.audit_events.target_id')
    .leftJoin(
      'app.trading_accounts as pass_review_account',
      'pass_review_account.id',
      'audit.audit_events.target_id',
    )
    .leftJoin(
      'app.identity_review_cases',
      'app.identity_review_cases.id',
      'audit.audit_events.target_id',
    )
    .select([
      'audit.audit_events.action as action',
      'audit.audit_events.target_type as target_type',
      'audit.audit_events.reason as reason',
      'audit.audit_events.occurred_at as occurred_at',
      'actor.email as actor_email',
      'app.support_tickets.public_id as support_public_id',
      'app.contestations.public_id as contestation_public_id',
      'app.identity_review_cases.public_id as identity_public_id',
      'pass_review_account.public_id as pass_review_public_id',
    ])
    .where('audit.audit_events.actor_type', '=', 'staff')
    .where('audit.audit_events.action', 'in', actions)
    .orderBy('audit.audit_events.occurred_at', 'desc')
    .limit(10)
    .execute();
  return rows.map((row) => ({
    action: row.action,
    targetType: row.target_type,
    publicId:
      row.support_public_id ??
      row.contestation_public_id ??
      row.identity_public_id ??
      row.pass_review_public_id,
    actorEmail: row.actor_email,
    reason: row.reason,
    occurredAt: row.occurred_at,
  }));
}

export async function loadControlOverview(
  db: Db,
  params: { staffId: string; scope: ControlOverviewScope },
) {
  const [queues, assigned, aging, decisions] = await Promise.all([
    queueSummaries(db, params.scope),
    assignedCases(db, params.staffId, params.scope),
    agingCases(db, params.scope),
    recentDecisions(db, params.scope),
  ]);
  return { queues, assigned, aging, decisions };
}
