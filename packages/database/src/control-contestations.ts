import type { Db, DbExecutor } from './client';
import {
  loadContestedDecisionEvidence,
  type ContestedDecisionEvidence,
} from './contestation-evidence';
import type {
  ContestationDecision,
  ContestationReasonCategory,
  ContestationStatus,
  ContestationTargetType,
} from './schema';

/**
 * Phase 3.2 — WARIBA Control's contestation queue.
 *
 * §12: « The operator should NOT have to query Supabase manually. » Everything
 * needed to decide a dispute — rule, threshold, observed value, occurrence
 * time, policy version, the risk event, the orders and fills behind it, and
 * the correlation id — is assembled here from the authoritative rows, using
 * the same loader the trader's own view uses.
 */

export class ContestationStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContestationStateError';
  }
}

export interface ControlContestationFilters {
  status?: ContestationStatus;
  targetType?: ContestationTargetType;
  reasonCategory?: ContestationReasonCategory;
  assignment?: 'assigned' | 'unassigned';
  query?: string;
}

export interface ControlContestationQueueRow {
  publicId: string;
  ticketPublicId: string;
  traderEmail: string | null;
  accountPublicId: string | null;
  targetType: ContestationTargetType;
  /** The rule the contested decision applied — the operator's first triage signal. */
  ruleCode: string | null;
  reasonCategory: ContestationReasonCategory;
  status: ContestationStatus;
  openedAt: Date;
  reviewerEmail: string | null;
}

export interface ControlContestationQueuePage {
  items: readonly ControlContestationQueueRow[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 25;

export async function loadControlContestationQueue(
  db: Db,
  params: { filters: ControlContestationFilters; page: number },
): Promise<ControlContestationQueuePage> {
  const { filters } = params;
  const page = Math.max(1, params.page);

  const base = db
    .selectFrom('app.contestations')
    .innerJoin('app.support_tickets', 'app.support_tickets.id', 'app.contestations.ticket_id')
    .leftJoin('app.trading_accounts', 'app.trading_accounts.id', 'app.contestations.account_id')
    .$if(filters.status !== undefined, (qb) =>
      qb.where('app.contestations.status', '=', filters.status as ContestationStatus),
    )
    .$if(filters.targetType !== undefined, (qb) =>
      qb.where('app.contestations.target_type', '=', filters.targetType as ContestationTargetType),
    )
    .$if(filters.reasonCategory !== undefined, (qb) =>
      qb.where(
        'app.contestations.reason_category',
        '=',
        filters.reasonCategory as ContestationReasonCategory,
      ),
    )
    .$if(filters.assignment === 'unassigned', (qb) =>
      qb.where('app.contestations.reviewed_by', 'is', null),
    )
    .$if(filters.assignment === 'assigned', (qb) =>
      qb.where('app.contestations.reviewed_by', 'is not', null),
    )
    .$if(filters.query !== undefined, (qb) => {
      const pattern = `%${(filters.query as string).replace(/[%_]/g, (m) => `\\${m}`)}%`;
      return qb.where((eb) =>
        eb.or([
          eb('app.contestations.public_id', 'ilike', pattern),
          eb('app.support_tickets.public_id', 'ilike', pattern),
          eb('app.trading_accounts.public_id', 'ilike', pattern),
        ]),
      );
    });

  const [rows, count] = await Promise.all([
    base
      .leftJoin('auth.users as trader', 'trader.id', 'app.contestations.user_id')
      .leftJoin('auth.users as reviewer', 'reviewer.id', 'app.contestations.reviewed_by')
      .leftJoin('app.risk_violations', 'app.risk_violations.id', 'app.contestations.target_id')
      .select([
        'app.contestations.public_id as public_id',
        'app.support_tickets.public_id as ticket_public_id',
        'app.trading_accounts.public_id as account_public_id',
        'app.contestations.target_type as target_type',
        'app.contestations.reason_category as reason_category',
        'app.contestations.status as status',
        'app.contestations.opened_at as opened_at',
        'app.risk_violations.rule_code as rule_code',
        'trader.email as trader_email',
        'reviewer.email as reviewer_email',
      ])
      .orderBy('app.contestations.opened_at', 'asc')
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE)
      .execute(),
    base.select((eb) => eb.fn.countAll<string>().as('total')).executeTakeFirst(),
  ]);

  return {
    items: rows.map((row) => ({
      publicId: row.public_id,
      ticketPublicId: row.ticket_public_id,
      traderEmail: row.trader_email,
      accountPublicId: row.account_public_id,
      targetType: row.target_type,
      ruleCode: row.rule_code,
      reasonCategory: row.reason_category,
      status: row.status,
      openedAt: row.opened_at,
      reviewerEmail: row.reviewer_email,
    })),
    total: Number(count?.total ?? 0),
    page,
    pageSize: PAGE_SIZE,
  };
}

export interface ControlContestationDetail {
  id: string;
  publicId: string;
  ticketPublicId: string;
  traderEmail: string | null;
  accountPublicId: string | null;
  targetType: ContestationTargetType;
  targetId: string;
  status: ContestationStatus;
  reasonCategory: ContestationReasonCategory;
  /** The trader's account of events. Not evidence, and labelled as such. */
  traderStatement: string;
  decision: ContestationDecision | null;
  decisionReason: string | null;
  openedAt: Date;
  reviewedAt: Date | null;
  resolvedAt: Date | null;
  reviewerEmail: string | null;
  correlationId: string;
  /** The identifiers pinned at creation, for proving what was contested. */
  evidenceRef: unknown;
  /** Read live from the authoritative rows, not from the contestation. */
  evidence: ContestedDecisionEvidence | null;
}

export async function loadControlContestation(
  db: Db,
  params: { publicId: string },
): Promise<ControlContestationDetail | null> {
  const row = await db
    .selectFrom('app.contestations')
    .innerJoin('app.support_tickets', 'app.support_tickets.id', 'app.contestations.ticket_id')
    .leftJoin('app.trading_accounts', 'app.trading_accounts.id', 'app.contestations.account_id')
    .leftJoin('auth.users as trader', 'trader.id', 'app.contestations.user_id')
    .leftJoin('auth.users as reviewer', 'reviewer.id', 'app.contestations.reviewed_by')
    .select([
      'app.contestations.id as id',
      'app.contestations.public_id as public_id',
      'app.support_tickets.public_id as ticket_public_id',
      'app.trading_accounts.public_id as account_public_id',
      'app.contestations.account_id as account_id',
      'app.contestations.target_type as target_type',
      'app.contestations.target_id as target_id',
      'app.contestations.status as status',
      'app.contestations.reason_category as reason_category',
      'app.contestations.trader_statement as trader_statement',
      'app.contestations.decision as decision',
      'app.contestations.decision_reason as decision_reason',
      'app.contestations.opened_at as opened_at',
      'app.contestations.reviewed_at as reviewed_at',
      'app.contestations.resolved_at as resolved_at',
      'app.contestations.correlation_id as correlation_id',
      'app.contestations.evidence_ref as evidence_ref',
      'trader.email as trader_email',
      'reviewer.email as reviewer_email',
    ])
    .where('app.contestations.public_id', '=', params.publicId)
    .executeTakeFirst();
  if (!row) return null;

  const evidence = row.account_id
    ? await loadContestedDecisionEvidence(db, {
        targetType: row.target_type,
        targetId: row.target_id,
        accountId: row.account_id,
      })
    : null;

  return {
    id: row.id,
    publicId: row.public_id,
    ticketPublicId: row.ticket_public_id,
    traderEmail: row.trader_email,
    accountPublicId: row.account_public_id,
    targetType: row.target_type,
    targetId: row.target_id,
    status: row.status,
    reasonCategory: row.reason_category,
    traderStatement: row.trader_statement,
    decision: row.decision,
    decisionReason: row.decision_reason,
    openedAt: row.opened_at,
    reviewedAt: row.reviewed_at,
    resolvedAt: row.resolved_at,
    reviewerEmail: row.reviewer_email,
    correlationId: row.correlation_id,
    evidenceRef: row.evidence_ref,
    evidence,
  };
}

export interface ContestationBeforeAfter {
  contestationId: string;
  ticketId: string;
  before: { status: ContestationStatus; decision: ContestationDecision | null };
  after: { status: ContestationStatus; decision: ContestationDecision | null };
}

async function lockContestation(trx: DbExecutor, publicId: string) {
  const row = await trx
    .selectFrom('app.contestations')
    .select(['id', 'ticket_id', 'status', 'decision'])
    .where('public_id', '=', publicId)
    .forUpdate()
    .executeTakeFirst();
  if (!row) throw new ContestationStateError('This contestation does not exist.');
  return row;
}

const LIVE: readonly ContestationStatus[] = ['open', 'under_review', 'needs_information'];

/** Takes review of a contestation, or asks the trader for more. */
export async function setContestationReviewStateInTransaction(
  trx: DbExecutor,
  params: {
    publicId: string;
    reviewerUserId: string;
    nextStatus: Extract<ContestationStatus, 'under_review' | 'needs_information'>;
    now: Date;
  },
): Promise<ContestationBeforeAfter> {
  const row = await lockContestation(trx, params.publicId);
  if (!LIVE.includes(row.status)) {
    throw new ContestationStateError('This contestation is already decided.');
  }

  await trx
    .updateTable('app.contestations')
    .set({
      status: params.nextStatus,
      reviewed_by: params.reviewerUserId,
      reviewed_at: params.now,
      updated_at: params.now,
    })
    .where('id', '=', row.id)
    .execute();

  return {
    contestationId: row.id,
    ticketId: row.ticket_id,
    before: { status: row.status, decision: row.decision },
    after: { status: params.nextStatus, decision: row.decision },
  };
}

/**
 * Records the outcome of a contestation. Writes nothing else, anywhere.
 *
 * `overturned` is refused. The evaluation-account state machine gives
 * `breached` no outbound transition (@wariba/domain), so no authorized
 * corrective command exists in this build — and an outcome the platform cannot
 * carry out is worse than no outcome at all: the trader is told their account
 * was restored and it was not. Until a policy authorises an explicit,
 * audited corrective transition, an operator who believes a decision was wrong
 * records `requires_escalation`, which says exactly that.
 *
 * What this function must never do, restated because it is the invariant the
 * whole slice turns on: it does not touch app.trading_accounts,
 * app.risk_violations, app.account_daily_snapshots,
 * app.account_state_transitions or app.trading_ledger_entries. The original
 * evidence is what the decision is measured against; a decision that could
 * edit its own evidence is not a decision.
 */
export async function recordContestationDecisionInTransaction(
  trx: DbExecutor,
  params: {
    publicId: string;
    reviewerUserId: string;
    decision: ContestationDecision;
    reason: string;
    correlationId: string;
    now: Date;
  },
): Promise<ContestationBeforeAfter> {
  if (params.decision === 'overturned') {
    throw new ContestationStateError(
      'No authorized corrective command exists: a recorded breach cannot be reversed in this build. Record requires_escalation instead.',
    );
  }
  if (params.reason.trim().length === 0) {
    throw new ContestationStateError('A decision reason is required.');
  }

  const row = await lockContestation(trx, params.publicId);
  if (!LIVE.includes(row.status)) {
    throw new ContestationStateError('This contestation is already decided.');
  }

  /*
   * The status the outcome lands in.
   *
   * `upheld` is its own status — the original decision stands, and the record
   * says so in one word. `requires_escalation` closes the contestation for the
   * trader (they are not left refreshing an open dispute) while the decision
   * column keeps the fact that it was escalated rather than upheld. Two
   * different outcomes, never collapsed into one.
   */
  const nextStatus: ContestationStatus = params.decision === 'upheld' ? 'upheld' : 'closed';

  await trx
    .updateTable('app.contestations')
    .set({
      status: nextStatus,
      decision: params.decision,
      decision_reason: params.reason.trim(),
      reviewed_by: params.reviewerUserId,
      reviewed_at: params.now,
      resolved_at: params.now,
      updated_at: params.now,
    })
    .where('id', '=', row.id)
    .execute();

  await trx
    .insertInto('app.ticket_messages')
    .values({
      ticket_id: row.ticket_id,
      actor_type: 'system',
      body:
        params.decision === 'upheld'
          ? `Contestation ${params.publicId} : décision maintenue. Motif : ${params.reason.trim()}`
          : `Contestation ${params.publicId} : dossier escaladé. Motif : ${params.reason.trim()}`,
      correlation_id: params.correlationId,
      created_at: params.now,
    })
    .execute();

  return {
    contestationId: row.id,
    ticketId: row.ticket_id,
    before: { status: row.status, decision: row.decision },
    after: { status: nextStatus, decision: params.decision },
  };
}
