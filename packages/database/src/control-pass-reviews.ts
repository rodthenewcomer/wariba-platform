import type { Db, DbExecutor } from './client';
import { assertExpectedCaseVersion, OperatorCaseStaleError } from './operator-case';
import type { PassReviewOperatorStatus } from './schema';

export interface PassReviewFilters {
  status?: 'awaiting_review' | PassReviewOperatorStatus;
  query?: string;
}

export interface PassReviewQueueRow {
  accountId: string;
  accountPublicId: string;
  traderEmail: string | null;
  traderFirstName: string | null;
  traderLastName: string | null;
  nominalBalance: string;
  currency: string;
  lifecycleStatus: 'pass_pending' | 'passed';
  policyVersion: string;
  reviewEnteredAt: Date | null;
  updatedAt: Date;
  operatorStatus: PassReviewOperatorStatus | null;
  assignedStaffId: string | null;
  assignedStaffEmail: string | null;
  operatorReviewedAt: Date | null;
  operatorVersion: number;
}

export interface PassReviewQueuePage {
  items: readonly PassReviewQueueRow[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 25;

export async function loadControlPassReviewQueue(
  db: Db,
  params: { filters: PassReviewFilters; page: number },
): Promise<PassReviewQueuePage> {
  const page = Math.max(1, params.page);
  const { filters } = params;
  const base = db
    .selectFrom('app.trading_accounts')
    .innerJoin(
      'app.policy_versions',
      'app.policy_versions.id',
      'app.trading_accounts.policy_version_id',
    )
    .leftJoin('app.user_profiles', 'app.user_profiles.user_id', 'app.trading_accounts.user_id')
    .leftJoin(
      'app.pass_review_operator_states',
      'app.pass_review_operator_states.account_id',
      'app.trading_accounts.id',
    )
    .where('app.trading_accounts.program_type', '=', 'WARIBA_ONE')
    .where('app.trading_accounts.status', 'in', ['pass_pending', 'passed'])
    .$if(filters.status === 'awaiting_review', (qb) =>
      qb.where('app.pass_review_operator_states.account_id', 'is', null),
    )
    .$if(filters.status === 'reviewed', (qb) =>
      qb.where('app.pass_review_operator_states.status', '=', 'reviewed'),
    )
    .$if(filters.status === 'integrity_escalated', (qb) =>
      qb.where('app.pass_review_operator_states.status', '=', 'integrity_escalated'),
    )
    .$if(filters.query !== undefined, (qb) => {
      const pattern = `%${(filters.query as string).replace(/[%_]/g, (value) => `\\${value}`)}%`;
      return qb.where('app.trading_accounts.public_id', 'ilike', pattern);
    });

  const [rows, count] = await Promise.all([
    base
      .leftJoin('auth.users as trader', 'trader.id', 'app.trading_accounts.user_id')
      .leftJoin(
        'auth.users as pass_reviewer',
        'pass_reviewer.id',
        'app.pass_review_operator_states.assigned_staff_id',
      )
      .select((eb) => [
        'app.trading_accounts.id as account_id',
        'app.trading_accounts.public_id as account_public_id',
        'app.trading_accounts.nominal_balance as nominal_balance',
        'app.trading_accounts.currency as currency',
        'app.trading_accounts.status as lifecycle_status',
        'app.trading_accounts.updated_at as updated_at',
        'app.policy_versions.semantic_version as policy_version',
        'app.user_profiles.first_name as first_name',
        'app.user_profiles.last_name as last_name',
        'trader.email as trader_email',
        'app.pass_review_operator_states.status as operator_status',
        'app.pass_review_operator_states.assigned_staff_id as assigned_staff_id',
        'app.pass_review_operator_states.reviewed_at as operator_reviewed_at',
        'app.pass_review_operator_states.version as operator_version',
        'pass_reviewer.email as assigned_staff_email',
        eb
          .selectFrom('app.account_state_transitions as transition')
          .select('transition.occurred_at')
          .whereRef('transition.account_id', '=', 'app.trading_accounts.id')
          .where('transition.to_status', '=', 'pass_pending')
          .orderBy('transition.occurred_at', 'desc')
          .limit(1)
          .as('review_entered_at'),
      ])
      .orderBy('app.trading_accounts.updated_at', 'asc')
      .orderBy('app.trading_accounts.id', 'asc')
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE)
      .execute(),
    base.select((eb) => eb.fn.countAll<string>().as('total')).executeTakeFirst(),
  ]);

  return {
    items: rows.map((row) => ({
      accountId: row.account_id,
      accountPublicId: row.account_public_id,
      traderEmail: row.trader_email,
      traderFirstName: row.first_name,
      traderLastName: row.last_name,
      nominalBalance: row.nominal_balance,
      currency: row.currency,
      lifecycleStatus: row.lifecycle_status as 'pass_pending' | 'passed',
      policyVersion: row.policy_version,
      reviewEnteredAt: row.review_entered_at,
      updatedAt: row.updated_at,
      operatorStatus: row.operator_status,
      assignedStaffId: row.assigned_staff_id,
      assignedStaffEmail: row.assigned_staff_email,
      operatorReviewedAt: row.operator_reviewed_at,
      operatorVersion: row.operator_version ?? 0,
    })),
    total: Number(count?.total ?? 0),
    page,
    pageSize: PAGE_SIZE,
  };
}

export interface PassReviewCaseFacts {
  accountId: string;
  accountPublicId: string;
  traderEmail: string | null;
  traderFirstName: string | null;
  traderLastName: string | null;
  nominalBalance: string;
  currency: string;
  lifecycleStatus: 'pass_pending' | 'passed';
  activatedAt: Date | null;
  policyVersion: string;
  policyVersionId: string;
  reviewEnteredAt: Date | null;
  passedAt: Date | null;
  performanceAccountId: string | null;
  performanceAccountPublicId: string | null;
  operatorStatus: PassReviewOperatorStatus | null;
  assignedStaffId: string | null;
  assignedStaffEmail: string | null;
  operatorReason: string | null;
  operatorReviewedAt: Date | null;
  operatorVersion: number;
  operatorHistory: readonly {
    action: string;
    actorEmail: string | null;
    reason: string | null;
    occurredAt: Date;
  }[];
}

export async function loadControlPassReviewCase(
  db: Db,
  params: { accountPublicId: string },
): Promise<PassReviewCaseFacts | null> {
  const row = await db
    .selectFrom('app.trading_accounts')
    .innerJoin(
      'app.policy_versions',
      'app.policy_versions.id',
      'app.trading_accounts.policy_version_id',
    )
    .leftJoin('app.user_profiles', 'app.user_profiles.user_id', 'app.trading_accounts.user_id')
    .leftJoin('auth.users as trader', 'trader.id', 'app.trading_accounts.user_id')
    .leftJoin(
      'app.pass_review_operator_states',
      'app.pass_review_operator_states.account_id',
      'app.trading_accounts.id',
    )
    .leftJoin(
      'auth.users as pass_reviewer',
      'pass_reviewer.id',
      'app.pass_review_operator_states.assigned_staff_id',
    )
    .select((eb) => [
      'app.trading_accounts.id as account_id',
      'app.trading_accounts.public_id as account_public_id',
      'app.trading_accounts.nominal_balance as nominal_balance',
      'app.trading_accounts.currency as currency',
      'app.trading_accounts.status as lifecycle_status',
      'app.trading_accounts.activated_at as activated_at',
      'app.trading_accounts.policy_version_id as policy_version_id',
      'app.policy_versions.semantic_version as policy_version',
      'app.user_profiles.first_name as first_name',
      'app.user_profiles.last_name as last_name',
      'trader.email as trader_email',
      'app.pass_review_operator_states.status as operator_status',
      'app.pass_review_operator_states.assigned_staff_id as assigned_staff_id',
      'app.pass_review_operator_states.reason as operator_reason',
      'app.pass_review_operator_states.reviewed_at as operator_reviewed_at',
      'app.pass_review_operator_states.version as operator_version',
      'pass_reviewer.email as assigned_staff_email',
      eb
        .selectFrom('app.account_state_transitions as transition')
        .select('transition.occurred_at')
        .whereRef('transition.account_id', '=', 'app.trading_accounts.id')
        .where('transition.to_status', '=', 'pass_pending')
        .orderBy('transition.occurred_at', 'desc')
        .limit(1)
        .as('review_entered_at'),
      eb
        .selectFrom('app.account_state_transitions as transition')
        .select('transition.occurred_at')
        .whereRef('transition.account_id', '=', 'app.trading_accounts.id')
        .where('transition.to_status', '=', 'passed')
        .orderBy('transition.occurred_at', 'desc')
        .limit(1)
        .as('passed_at'),
      eb
        .selectFrom('app.trading_accounts as performance')
        .select('performance.id')
        .whereRef('performance.source_evaluation_account_id', '=', 'app.trading_accounts.id')
        .limit(1)
        .as('performance_account_id'),
      eb
        .selectFrom('app.trading_accounts as performance')
        .select('performance.public_id')
        .whereRef('performance.source_evaluation_account_id', '=', 'app.trading_accounts.id')
        .limit(1)
        .as('performance_account_public_id'),
    ])
    .where('app.trading_accounts.public_id', '=', params.accountPublicId)
    .where('app.trading_accounts.program_type', '=', 'WARIBA_ONE')
    .where('app.trading_accounts.status', 'in', ['pass_pending', 'passed'])
    .executeTakeFirst();
  if (!row) return null;
  const operatorHistory = await db
    .selectFrom('audit.audit_events')
    .leftJoin('auth.users as actor', 'actor.id', 'audit.audit_events.actor_id')
    .select([
      'audit.audit_events.action as action',
      'audit.audit_events.reason as reason',
      'audit.audit_events.occurred_at as occurred_at',
      'actor.email as actor_email',
    ])
    .where('audit.audit_events.target_type', '=', 'pass_review')
    .where('audit.audit_events.target_id', '=', row.account_id)
    .orderBy('audit.audit_events.occurred_at', 'desc')
    .limit(25)
    .execute();
  return {
    accountId: row.account_id,
    accountPublicId: row.account_public_id,
    traderEmail: row.trader_email,
    traderFirstName: row.first_name,
    traderLastName: row.last_name,
    nominalBalance: row.nominal_balance,
    currency: row.currency,
    lifecycleStatus: row.lifecycle_status as 'pass_pending' | 'passed',
    activatedAt: row.activated_at,
    policyVersion: row.policy_version,
    policyVersionId: row.policy_version_id,
    reviewEnteredAt: row.review_entered_at,
    passedAt: row.passed_at,
    performanceAccountId: row.performance_account_id,
    performanceAccountPublicId: row.performance_account_public_id,
    operatorStatus: row.operator_status,
    assignedStaffId: row.assigned_staff_id,
    assignedStaffEmail: row.assigned_staff_email,
    operatorReason: row.operator_reason,
    operatorReviewedAt: row.operator_reviewed_at,
    operatorVersion: row.operator_version ?? 0,
    operatorHistory: operatorHistory.map((event) => ({
      action: event.action,
      actorEmail: event.actor_email,
      reason: event.reason,
      occurredAt: event.occurred_at,
    })),
  };
}

export class PassReviewStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PassReviewStateError';
  }
}

export interface PassReviewOperatorChange {
  accountId: string;
  before: { status: PassReviewOperatorStatus | null; version: number };
  after: { status: PassReviewOperatorStatus; version: number };
}

/**
 * Records post-result operational handling only. Locking the Evaluation row
 * proves the canonical pass is already complete before this separate state is
 * written. No lifecycle, Performance, Risk, snapshot or ledger table is
 * touched by this command.
 */
export async function setPassReviewOperatorStateInTransaction(
  trx: DbExecutor,
  params: {
    accountPublicId: string;
    staffUserId: string;
    status: PassReviewOperatorStatus;
    reason: string;
    expectedVersion: number;
    correlationId: string;
    now: Date;
  },
): Promise<PassReviewOperatorChange> {
  const reason = params.reason.trim();
  if (reason.length < 10) {
    throw new PassReviewStateError('Le motif doit contenir au moins 10 caractères.');
  }

  const account = await trx
    .selectFrom('app.trading_accounts')
    .select(['id', 'program_type', 'status'])
    .where('public_id', '=', params.accountPublicId)
    .forUpdate()
    .executeTakeFirst();
  if (!account || account.program_type !== 'WARIBA_ONE') {
    throw new PassReviewStateError('Cette revue de passage n’existe pas.');
  }
  if (account.status !== 'passed') {
    throw new PassReviewStateError(
      'Le résultat automatique n’est pas finalisé. Aucune revue opérateur ne peut le remplacer.',
    );
  }

  const existing = await trx
    .selectFrom('app.pass_review_operator_states')
    .select(['status', 'version'])
    .where('account_id', '=', account.id)
    .executeTakeFirst();
  const currentVersion = existing?.version ?? 0;
  if (existing) {
    assertExpectedCaseVersion(currentVersion, params.expectedVersion);
  } else if (params.expectedVersion !== 0) {
    throw new OperatorCaseStaleError();
  }
  const nextVersion = currentVersion + 1;

  if (existing) {
    await trx
      .updateTable('app.pass_review_operator_states')
      .set({
        status: params.status,
        assigned_staff_id: params.staffUserId,
        reason,
        reviewed_at: params.now,
        correlation_id: params.correlationId,
        updated_at: params.now,
        version: nextVersion,
      })
      .where('account_id', '=', account.id)
      .execute();
  } else {
    await trx
      .insertInto('app.pass_review_operator_states')
      .values({
        account_id: account.id,
        status: params.status,
        assigned_staff_id: params.staffUserId,
        reason,
        reviewed_at: params.now,
        correlation_id: params.correlationId,
        created_at: params.now,
        updated_at: params.now,
      })
      .execute();
  }

  return {
    accountId: account.id,
    before: { status: existing?.status ?? null, version: currentVersion },
    after: { status: params.status, version: nextVersion },
  };
}
