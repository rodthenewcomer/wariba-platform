import type { Db, DbExecutor } from './client';
import { evaluatePayoutEligibility } from './payouts';
import { assertExpectedCaseVersion } from './operator-case';
import type { IdentityReviewStatus } from './schema';

export class IdentityReviewStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdentityReviewStateError';
  }
}

export interface IdentityReviewFilters {
  status?: IdentityReviewStatus;
  assignment?: 'assigned' | 'unassigned' | 'mine';
  assignedStaffId?: string;
  query?: string;
}

export interface IdentityReviewQueueRow {
  publicId: string;
  traderEmail: string | null;
  accountPublicId: string;
  status: IdentityReviewStatus;
  requestedAt: Date;
  updatedAt: Date;
  assignedStaffEmail: string | null;
}

export interface IdentityReviewQueuePage {
  items: readonly IdentityReviewQueueRow[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 25;

export async function loadIdentityReviewQueue(
  db: Db,
  params: { filters: IdentityReviewFilters; page: number },
): Promise<IdentityReviewQueuePage> {
  const { filters } = params;
  const page = Math.max(1, params.page);
  const base = db
    .selectFrom('app.identity_review_cases')
    .innerJoin(
      'app.trading_accounts',
      'app.trading_accounts.id',
      'app.identity_review_cases.account_id',
    )
    .$if(filters.status !== undefined, (qb) =>
      qb.where('app.identity_review_cases.status', '=', filters.status as IdentityReviewStatus),
    )
    .$if(filters.assignment === 'assigned', (qb) =>
      qb.where('app.identity_review_cases.assigned_staff_id', 'is not', null),
    )
    .$if(filters.assignment === 'unassigned', (qb) =>
      qb.where('app.identity_review_cases.assigned_staff_id', 'is', null),
    )
    .$if(filters.assignedStaffId !== undefined, (qb) =>
      qb.where(
        'app.identity_review_cases.assigned_staff_id',
        '=',
        filters.assignedStaffId as string,
      ),
    )
    .$if(filters.query !== undefined, (qb) => {
      const pattern = `%${(filters.query as string).replace(/[%_]/g, (value) => `\\${value}`)}%`;
      return qb.where((eb) =>
        eb.or([
          eb('app.identity_review_cases.public_id', 'ilike', pattern),
          eb('app.trading_accounts.public_id', 'ilike', pattern),
        ]),
      );
    });

  const [rows, count] = await Promise.all([
    base
      .leftJoin('auth.users as trader', 'trader.id', 'app.identity_review_cases.user_id')
      .leftJoin(
        'auth.users as operator',
        'operator.id',
        'app.identity_review_cases.assigned_staff_id',
      )
      .select([
        'app.identity_review_cases.public_id as public_id',
        'app.identity_review_cases.status as status',
        'app.identity_review_cases.requested_at as requested_at',
        'app.identity_review_cases.updated_at as updated_at',
        'app.trading_accounts.public_id as account_public_id',
        'trader.email as trader_email',
        'operator.email as operator_email',
      ])
      .orderBy('app.identity_review_cases.requested_at', 'asc')
      .orderBy('app.identity_review_cases.id', 'asc')
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE)
      .execute(),
    base.select((eb) => eb.fn.countAll<string>().as('total')).executeTakeFirst(),
  ]);

  return {
    items: rows.map((row) => ({
      publicId: row.public_id,
      traderEmail: row.trader_email,
      accountPublicId: row.account_public_id,
      status: row.status,
      requestedAt: row.requested_at,
      updatedAt: row.updated_at,
      assignedStaffEmail: row.operator_email,
    })),
    total: Number(count?.total ?? 0),
    page,
    pageSize: PAGE_SIZE,
  };
}

export interface IdentityReviewDetail {
  id: string;
  publicId: string;
  userId: string;
  traderEmail: string | null;
  accountId: string;
  accountPublicId: string;
  accountStatus: string;
  nominalBalance: string;
  currency: string;
  reason: 'first_payout';
  status: IdentityReviewStatus;
  assignedStaffId: string | null;
  assignedStaffEmail: string | null;
  assignedAt: Date | null;
  evidenceReference: string | null;
  decisionReason: string | null;
  traderMessage: string | null;
  requestedAt: Date;
  reviewedAt: Date | null;
  resolvedAt: Date | null;
  updatedAt: Date;
  version: number;
  correlationId: string;
  operatorHistory: readonly {
    action: string;
    actorEmail: string | null;
    reason: string | null;
    occurredAt: Date;
  }[];
}

export async function loadIdentityReviewDetail(
  db: Db,
  params: { publicId: string },
): Promise<IdentityReviewDetail | null> {
  const row = await db
    .selectFrom('app.identity_review_cases')
    .innerJoin(
      'app.trading_accounts',
      'app.trading_accounts.id',
      'app.identity_review_cases.account_id',
    )
    .leftJoin('auth.users as trader', 'trader.id', 'app.identity_review_cases.user_id')
    .leftJoin(
      'auth.users as operator',
      'operator.id',
      'app.identity_review_cases.assigned_staff_id',
    )
    .select([
      'app.identity_review_cases.id as id',
      'app.identity_review_cases.public_id as public_id',
      'app.identity_review_cases.user_id as user_id',
      'app.identity_review_cases.account_id as account_id',
      'app.identity_review_cases.reason as reason',
      'app.identity_review_cases.status as status',
      'app.identity_review_cases.assigned_staff_id as assigned_staff_id',
      'app.identity_review_cases.assigned_at as assigned_at',
      'app.identity_review_cases.evidence_reference as evidence_reference',
      'app.identity_review_cases.decision_reason as decision_reason',
      'app.identity_review_cases.trader_message as trader_message',
      'app.identity_review_cases.requested_at as requested_at',
      'app.identity_review_cases.reviewed_at as reviewed_at',
      'app.identity_review_cases.resolved_at as resolved_at',
      'app.identity_review_cases.updated_at as updated_at',
      'app.identity_review_cases.version as version',
      'app.identity_review_cases.correlation_id as correlation_id',
      'app.trading_accounts.public_id as account_public_id',
      'app.trading_accounts.status as account_status',
      'app.trading_accounts.nominal_balance as nominal_balance',
      'app.trading_accounts.currency as currency',
      'trader.email as trader_email',
      'operator.email as operator_email',
    ])
    .where('app.identity_review_cases.public_id', '=', params.publicId)
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
    .where('audit.audit_events.target_type', '=', 'identity_review_case')
    .where('audit.audit_events.target_id', '=', row.id)
    .where('audit.audit_events.actor_type', '=', 'staff')
    .orderBy('audit.audit_events.occurred_at', 'desc')
    .limit(25)
    .execute();
  return {
    id: row.id,
    publicId: row.public_id,
    userId: row.user_id,
    traderEmail: row.trader_email,
    accountId: row.account_id,
    accountPublicId: row.account_public_id,
    accountStatus: row.account_status,
    nominalBalance: row.nominal_balance,
    currency: row.currency,
    reason: row.reason,
    status: row.status,
    assignedStaffId: row.assigned_staff_id,
    assignedStaffEmail: row.operator_email,
    assignedAt: row.assigned_at,
    evidenceReference: row.evidence_reference,
    decisionReason: row.decision_reason,
    traderMessage: row.trader_message,
    requestedAt: row.requested_at,
    reviewedAt: row.reviewed_at,
    resolvedAt: row.resolved_at,
    updatedAt: row.updated_at,
    version: row.version,
    correlationId: row.correlation_id,
    operatorHistory: operatorHistory.map((event) => ({
      action: event.action,
      actorEmail: event.actor_email,
      reason: event.reason,
      occurredAt: event.occurred_at,
    })),
  };
}

export async function loadLatestIdentityReviewForTrader(
  db: Db,
  params: { userId: string },
): Promise<Pick<
  IdentityReviewDetail,
  'publicId' | 'accountPublicId' | 'status' | 'traderMessage' | 'requestedAt' | 'updatedAt'
> | null> {
  const row = await db
    .selectFrom('app.identity_review_cases')
    .innerJoin(
      'app.trading_accounts',
      'app.trading_accounts.id',
      'app.identity_review_cases.account_id',
    )
    .select([
      'app.identity_review_cases.public_id as public_id',
      'app.identity_review_cases.status as status',
      'app.identity_review_cases.trader_message as trader_message',
      'app.identity_review_cases.requested_at as requested_at',
      'app.identity_review_cases.updated_at as updated_at',
      'app.trading_accounts.public_id as account_public_id',
    ])
    .where('app.identity_review_cases.user_id', '=', params.userId)
    .orderBy('app.identity_review_cases.requested_at', 'desc')
    .executeTakeFirst();
  return row
    ? {
        publicId: row.public_id,
        accountPublicId: row.account_public_id,
        status: row.status,
        traderMessage: row.trader_message,
        requestedAt: row.requested_at,
        updatedAt: row.updated_at,
      }
    : null;
}

export async function requestIdentityReview(
  db: Db,
  params: { userId: string; accountId: string; correlationId: string; now: Date },
): Promise<{ publicId: string; created: boolean }> {
  return db.transaction().execute(async (trx) => {
    const account = await trx
      .selectFrom('app.trading_accounts')
      .select(['id', 'user_id', 'program_type', 'kyc_sandbox_verified'])
      .where('id', '=', params.accountId)
      .forUpdate()
      .executeTakeFirst();
    if (
      !account ||
      account.user_id !== params.userId ||
      account.program_type !== 'WARIBA_PERFORMANCE'
    ) {
      throw new IdentityReviewStateError('Ce compte ne peut pas demander cette vérification.');
    }
    if (account.kyc_sandbox_verified) {
      throw new IdentityReviewStateError('Votre identité est déjà vérifiée.');
    }

    const existing = await trx
      .selectFrom('app.identity_review_cases')
      .select('public_id')
      .where('account_id', '=', account.id)
      .where('status', 'in', ['requested', 'under_review', 'needs_information'])
      .executeTakeFirst();
    if (existing) return { publicId: existing.public_id, created: false };

    const eligibility = await evaluatePayoutEligibility(trx, account.id);
    if (eligibility.eligible || eligibility.rejectionCode !== 'kyc_not_verified') {
      throw new IdentityReviewStateError(
        'La vérification sera demandée lorsque les conditions de payout seront remplies.',
      );
    }

    const created = await trx
      .insertInto('app.identity_review_cases')
      .values({
        user_id: params.userId,
        account_id: account.id,
        reason: 'first_payout',
        correlation_id: params.correlationId,
        requested_at: params.now,
        created_at: params.now,
        updated_at: params.now,
      })
      .returning(['id', 'public_id'])
      .executeTakeFirstOrThrow();

    await trx
      .insertInto('audit.audit_events')
      .values({
        actor_type: 'user',
        actor_id: params.userId,
        action: 'identity_review.requested',
        target_type: 'identity_review_case',
        target_id: created.id,
        after_json: JSON.stringify({ status: 'requested', accountId: account.id }),
        reason: 'Demande de vérification avant le premier payout.',
        source: 'web',
        correlation_id: params.correlationId,
        occurred_at: params.now,
      })
      .execute();
    return { publicId: created.public_id, created: true };
  });
}

export interface IdentityReviewBeforeAfter {
  caseId: string;
  accountId: string;
  before: { status: IdentityReviewStatus; assignedStaffId: string | null; version: number };
  after: { status: IdentityReviewStatus; assignedStaffId: string | null; version: number };
}

async function lockIdentityReview(trx: DbExecutor, publicId: string) {
  const row = await trx
    .selectFrom('app.identity_review_cases')
    .select(['id', 'account_id', 'status', 'assigned_staff_id', 'assigned_at', 'version'])
    .where('public_id', '=', publicId)
    .forUpdate()
    .executeTakeFirst();
  if (!row) throw new IdentityReviewStateError('Cette vérification n’existe pas.');
  return row;
}

const LIVE_STATUSES: readonly IdentityReviewStatus[] = [
  'requested',
  'under_review',
  'needs_information',
];

function assertIdentityReviewLive(status: IdentityReviewStatus): void {
  if (!LIVE_STATUSES.includes(status)) {
    throw new IdentityReviewStateError('Cette vérification est déjà terminée.');
  }
}

export async function assignIdentityReviewInTransaction(
  trx: DbExecutor,
  params: { publicId: string; staffUserId: string; expectedVersion: number; now: Date },
): Promise<IdentityReviewBeforeAfter> {
  const row = await lockIdentityReview(trx, params.publicId);
  assertExpectedCaseVersion(row.version, params.expectedVersion);
  assertIdentityReviewLive(row.status);
  if (row.assigned_staff_id && row.assigned_staff_id !== params.staffUserId) {
    throw new IdentityReviewStateError(
      'Cette vérification est déjà affectée à un autre opérateur.',
    );
  }
  await trx
    .updateTable('app.identity_review_cases')
    .set({
      assigned_staff_id: params.staffUserId,
      assigned_at: row.assigned_at ?? params.now,
      status: row.status === 'requested' ? 'under_review' : row.status,
      reviewed_at: params.now,
      updated_at: params.now,
      version: row.version + 1,
    })
    .where('id', '=', row.id)
    .execute();
  return {
    caseId: row.id,
    accountId: row.account_id,
    before: {
      status: row.status,
      assignedStaffId: row.assigned_staff_id,
      version: row.version,
    },
    after: {
      status: row.status === 'requested' ? 'under_review' : row.status,
      assignedStaffId: params.staffUserId,
      version: row.version + 1,
    },
  };
}

export async function updateIdentityReviewInTransaction(
  trx: DbExecutor,
  params: {
    publicId: string;
    staffUserId: string;
    expectedVersion: number;
    nextStatus: 'under_review' | 'needs_information' | 'verified' | 'unable_to_verify';
    decisionReason: string;
    traderMessage: string;
    evidenceReference?: string;
    now: Date;
  },
): Promise<IdentityReviewBeforeAfter> {
  const row = await lockIdentityReview(trx, params.publicId);
  assertExpectedCaseVersion(row.version, params.expectedVersion);
  assertIdentityReviewLive(row.status);
  if (row.assigned_staff_id && row.assigned_staff_id !== params.staffUserId) {
    throw new IdentityReviewStateError('Cette vérification est affectée à un autre opérateur.');
  }
  if (params.decisionReason.trim().length < 10 || params.traderMessage.trim().length < 10) {
    throw new IdentityReviewStateError('Un motif et un message clair pour le trader sont requis.');
  }
  if (params.nextStatus === 'verified' && !params.evidenceReference?.trim()) {
    throw new IdentityReviewStateError('Une référence de preuve est requise pour confirmer.');
  }
  if (params.evidenceReference?.includes('://')) {
    throw new IdentityReviewStateError(
      'Utilisez une référence opaque, sans URL ni contenu de document.',
    );
  }
  const terminal = params.nextStatus === 'verified' || params.nextStatus === 'unable_to_verify';
  await trx
    .updateTable('app.identity_review_cases')
    .set({
      status: params.nextStatus,
      assigned_staff_id: row.assigned_staff_id ?? params.staffUserId,
      assigned_at: row.assigned_at ?? params.now,
      reviewed_at: params.now,
      resolved_at: terminal ? params.now : null,
      decision_reason: params.decisionReason.trim(),
      trader_message: params.traderMessage.trim(),
      evidence_reference: params.evidenceReference?.trim() || null,
      updated_at: params.now,
      version: row.version + 1,
    })
    .where('id', '=', row.id)
    .execute();
  return {
    caseId: row.id,
    accountId: row.account_id,
    before: {
      status: row.status,
      assignedStaffId: row.assigned_staff_id,
      version: row.version,
    },
    after: {
      status: params.nextStatus,
      assignedStaffId: row.assigned_staff_id ?? params.staffUserId,
      version: row.version + 1,
    },
  };
}
