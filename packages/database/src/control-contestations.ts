import { randomUUID } from 'node:crypto';
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
import { assertExpectedCaseVersion } from './operator-case';

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
  assignment?: 'assigned' | 'unassigned' | 'mine';
  assignedStaffId?: string;
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
  updatedAt: Date;
  reviewerEmail: string | null;
  assignedStaffEmail: string | null;
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
      qb.where('app.contestations.assigned_staff_id', 'is', null),
    )
    .$if(filters.assignment === 'assigned', (qb) =>
      qb.where('app.contestations.assigned_staff_id', 'is not', null),
    )
    .$if(filters.assignedStaffId !== undefined, (qb) =>
      qb.where('app.contestations.assigned_staff_id', '=', filters.assignedStaffId as string),
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
      .leftJoin('auth.users as assignee', 'assignee.id', 'app.contestations.assigned_staff_id')
      .leftJoin('app.risk_violations', 'app.risk_violations.id', 'app.contestations.target_id')
      .select([
        'app.contestations.public_id as public_id',
        'app.support_tickets.public_id as ticket_public_id',
        'app.trading_accounts.public_id as account_public_id',
        'app.contestations.target_type as target_type',
        'app.contestations.reason_category as reason_category',
        'app.contestations.status as status',
        'app.contestations.opened_at as opened_at',
        'app.contestations.updated_at as updated_at',
        'app.risk_violations.rule_code as rule_code',
        'trader.email as trader_email',
        'reviewer.email as reviewer_email',
        'assignee.email as assignee_email',
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
      updatedAt: row.updated_at,
      reviewerEmail: row.reviewer_email,
      assignedStaffEmail: row.assignee_email,
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
  accountProgramType: 'WARIBA_ONE' | 'WARIBA_PERFORMANCE' | null;
  accountNominalBalance: string | null;
  accountCurrency: string | null;
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
  assignedStaffId: string | null;
  assignedStaffEmail: string | null;
  assignedAt: Date | null;
  version: number;
  correlationId: string;
  /** The identifiers pinned at creation, for proving what was contested. */
  evidenceRef: unknown;
  /** Read live from the authoritative rows, not from the contestation. */
  evidence: ContestedDecisionEvidence | null;
  operatorHistory: readonly {
    action: string;
    actorEmail: string | null;
    reason: string | null;
    occurredAt: Date;
  }[];
  replacementAccountPublicId: string | null;
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
    .leftJoin('auth.users as assignee', 'assignee.id', 'app.contestations.assigned_staff_id')
    .select((eb) => [
      'app.contestations.id as id',
      'app.contestations.public_id as public_id',
      'app.support_tickets.public_id as ticket_public_id',
      'app.trading_accounts.public_id as account_public_id',
      'app.trading_accounts.program_type as account_program_type',
      'app.trading_accounts.nominal_balance as account_nominal_balance',
      'app.trading_accounts.currency as account_currency',
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
      'app.contestations.assigned_staff_id as assigned_staff_id',
      'app.contestations.assigned_at as assigned_at',
      'app.contestations.version as version',
      'app.contestations.evidence_ref as evidence_ref',
      'trader.email as trader_email',
      'reviewer.email as reviewer_email',
      'assignee.email as assignee_email',
      eb
        .selectFrom('app.trading_accounts as replacement')
        .select('replacement.public_id')
        .whereRef('replacement.source_contestation_id', '=', 'app.contestations.id')
        .limit(1)
        .as('replacement_account_public_id'),
    ])
    .where('app.contestations.public_id', '=', params.publicId)
    .executeTakeFirst();
  if (!row) return null;

  const [evidence, operatorHistory] = await Promise.all([
    row.account_id
      ? loadContestedDecisionEvidence(db, {
          targetType: row.target_type,
          targetId: row.target_id,
          accountId: row.account_id,
        })
      : Promise.resolve(null),
    db
      .selectFrom('audit.audit_events')
      .leftJoin('auth.users as actor', 'actor.id', 'audit.audit_events.actor_id')
      .select([
        'audit.audit_events.action as action',
        'audit.audit_events.reason as reason',
        'audit.audit_events.occurred_at as occurred_at',
        'actor.email as actor_email',
      ])
      .where('audit.audit_events.target_type', '=', 'contestation')
      .where('audit.audit_events.target_id', '=', row.id)
      .where('audit.audit_events.actor_type', '=', 'staff')
      .orderBy('audit.audit_events.occurred_at', 'desc')
      .limit(25)
      .execute(),
  ]);

  return {
    id: row.id,
    publicId: row.public_id,
    ticketPublicId: row.ticket_public_id,
    traderEmail: row.trader_email,
    accountPublicId: row.account_public_id,
    accountProgramType: row.account_program_type,
    accountNominalBalance: row.account_nominal_balance,
    accountCurrency: row.account_currency,
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
    assignedStaffId: row.assigned_staff_id,
    assignedStaffEmail: row.assignee_email,
    assignedAt: row.assigned_at,
    version: row.version,
    correlationId: row.correlation_id,
    evidenceRef: row.evidence_ref,
    evidence,
    operatorHistory: operatorHistory.map((event) => ({
      action: event.action,
      actorEmail: event.actor_email,
      reason: event.reason,
      occurredAt: event.occurred_at,
    })),
    replacementAccountPublicId: row.replacement_account_public_id,
  };
}

export interface ContestationBeforeAfter {
  contestationId: string;
  ticketId: string;
  before: {
    status: ContestationStatus;
    decision: ContestationDecision | null;
    assignedStaffId: string | null;
    version: number;
  };
  after: {
    status: ContestationStatus;
    decision: ContestationDecision | null;
    assignedStaffId: string | null;
    version: number;
  };
}

async function lockContestation(trx: DbExecutor, publicId: string) {
  const row = await trx
    .selectFrom('app.contestations')
    .select([
      'id',
      'ticket_id',
      'status',
      'decision',
      'decision_reason',
      'account_id',
      'target_type',
      'target_id',
      'assigned_staff_id',
      'assigned_at',
      'version',
    ])
    .where('public_id', '=', publicId)
    .forUpdate()
    .executeTakeFirst();
  if (!row) throw new ContestationStateError('This contestation does not exist.');
  return row;
}

const LIVE: readonly ContestationStatus[] = ['open', 'under_review', 'needs_information'];

const OPERATOR_DECISIONS: readonly ContestationDecision[] = [
  'upheld',
  'requires_escalation',
  'correction_required',
];

async function assertContestationEvidenceAvailable(
  trx: DbExecutor,
  row: Awaited<ReturnType<typeof lockContestation>>,
): Promise<void> {
  if (!row.account_id) {
    throw new ContestationStateError(
      'Les preuves liées à cette contestation sont indisponibles. Aucune action n’est autorisée.',
    );
  }
  const evidence = await loadContestedDecisionEvidence(trx, {
    targetType: row.target_type,
    targetId: row.target_id,
    accountId: row.account_id,
  });
  if (!evidence) {
    throw new ContestationStateError(
      'Les preuves liées à cette contestation sont indisponibles. Aucune action n’est autorisée.',
    );
  }
}

export async function assignContestationInTransaction(
  trx: DbExecutor,
  params: { publicId: string; staffUserId: string; expectedVersion: number; now: Date },
): Promise<ContestationBeforeAfter> {
  const row = await lockContestation(trx, params.publicId);
  assertExpectedCaseVersion(row.version, params.expectedVersion);
  if (!LIVE.includes(row.status)) {
    throw new ContestationStateError('Cette contestation est déjà tranchée.');
  }
  if (row.assigned_staff_id && row.assigned_staff_id !== params.staffUserId) {
    throw new ContestationStateError('Cette contestation est déjà affectée à un autre opérateur.');
  }

  await trx
    .updateTable('app.contestations')
    .set({
      assigned_staff_id: params.staffUserId,
      assigned_at: row.assigned_at ?? params.now,
      updated_at: params.now,
      version: row.version + 1,
    })
    .where('id', '=', row.id)
    .execute();

  return {
    contestationId: row.id,
    ticketId: row.ticket_id,
    before: {
      status: row.status,
      decision: row.decision,
      assignedStaffId: row.assigned_staff_id,
      version: row.version,
    },
    after: {
      status: row.status,
      decision: row.decision,
      assignedStaffId: params.staffUserId,
      version: row.version + 1,
    },
  };
}

/** Takes review of a contestation, or asks the trader for more. */
export async function setContestationReviewStateInTransaction(
  trx: DbExecutor,
  params: {
    publicId: string;
    reviewerUserId: string;
    nextStatus: Extract<ContestationStatus, 'under_review' | 'needs_information'>;
    expectedVersion: number;
    now: Date;
  },
): Promise<ContestationBeforeAfter> {
  const row = await lockContestation(trx, params.publicId);
  assertExpectedCaseVersion(row.version, params.expectedVersion);
  if (!LIVE.includes(row.status)) {
    throw new ContestationStateError('This contestation is already decided.');
  }
  if (row.assigned_staff_id && row.assigned_staff_id !== params.reviewerUserId) {
    throw new ContestationStateError('Cette contestation est affectée à un autre opérateur.');
  }
  await assertContestationEvidenceAvailable(trx, row);

  await trx
    .updateTable('app.contestations')
    .set({
      status: params.nextStatus,
      reviewed_by: params.reviewerUserId,
      reviewed_at: params.now,
      assigned_staff_id: row.assigned_staff_id ?? params.reviewerUserId,
      assigned_at: row.assigned_at ?? params.now,
      updated_at: params.now,
      version: row.version + 1,
    })
    .where('id', '=', row.id)
    .execute();

  return {
    contestationId: row.id,
    ticketId: row.ticket_id,
    before: {
      status: row.status,
      decision: row.decision,
      assignedStaffId: row.assigned_staff_id,
      version: row.version,
    },
    after: {
      status: params.nextStatus,
      decision: row.decision,
      assignedStaffId: row.assigned_staff_id ?? params.reviewerUserId,
      version: row.version + 1,
    },
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
    expectedVersion: number;
    now: Date;
  },
): Promise<ContestationBeforeAfter> {
  if (!OPERATOR_DECISIONS.includes(params.decision)) {
    throw new ContestationStateError(
      'Cette issue ne peut pas être enregistrée directement par un opérateur.',
    );
  }
  if (params.reason.trim().length === 0) {
    throw new ContestationStateError('A decision reason is required.');
  }

  const row = await lockContestation(trx, params.publicId);
  assertExpectedCaseVersion(row.version, params.expectedVersion);
  if (!LIVE.includes(row.status)) {
    throw new ContestationStateError('This contestation is already decided.');
  }
  if (row.assigned_staff_id && row.assigned_staff_id !== params.reviewerUserId) {
    throw new ContestationStateError('Cette contestation est affectée à un autre opérateur.');
  }
  await assertContestationEvidenceAvailable(trx, row);

  let effectiveDecision = params.decision;
  if (params.decision === 'correction_required') {
    effectiveDecision = (await isAutomaticReplacementEligible(trx, row))
      ? 'correction_required'
      : 'finance_compliance_review';
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
  const nextStatus: ContestationStatus =
    effectiveDecision === 'upheld'
      ? 'upheld'
      : effectiveDecision === 'requires_escalation'
        ? 'closed'
        : effectiveDecision;
  const isPendingCorrection =
    nextStatus === 'correction_required' || nextStatus === 'finance_compliance_review';

  await trx
    .updateTable('app.contestations')
    .set({
      status: nextStatus,
      decision: effectiveDecision,
      decision_reason: params.reason.trim(),
      reviewed_by: params.reviewerUserId,
      reviewed_at: params.now,
      assigned_staff_id: row.assigned_staff_id ?? params.reviewerUserId,
      assigned_at: row.assigned_at ?? params.now,
      resolved_at: isPendingCorrection ? null : params.now,
      updated_at: params.now,
      version: row.version + 1,
    })
    .where('id', '=', row.id)
    .execute();

  await trx
    .insertInto('app.ticket_messages')
    .values({
      ticket_id: row.ticket_id,
      actor_type: 'system',
      body: contestationDecisionMessage(params.publicId, effectiveDecision, params.reason.trim()),
      correlation_id: params.correlationId,
    })
    .execute();

  return {
    contestationId: row.id,
    ticketId: row.ticket_id,
    before: {
      status: row.status,
      decision: row.decision,
      assignedStaffId: row.assigned_staff_id,
      version: row.version,
    },
    after: {
      status: nextStatus,
      decision: effectiveDecision,
      assignedStaffId: row.assigned_staff_id ?? params.reviewerUserId,
      version: row.version + 1,
    },
  };
}

async function isAutomaticReplacementEligible(
  trx: DbExecutor,
  row: Awaited<ReturnType<typeof lockContestation>>,
): Promise<boolean> {
  if (!row.account_id || row.target_type !== 'account_breach') return false;
  const [account, violation, performanceChild] = await Promise.all([
    trx
      .selectFrom('app.trading_accounts')
      .select(['program_type', 'status'])
      .where('id', '=', row.account_id)
      .executeTakeFirst(),
    trx
      .selectFrom('app.risk_violations')
      .select(['consequence'])
      .where('id', '=', row.target_id)
      .where('account_id', '=', row.account_id)
      .executeTakeFirst(),
    trx
      .selectFrom('app.trading_accounts')
      .select('id')
      .where('source_evaluation_account_id', '=', row.account_id)
      .executeTakeFirst(),
  ]);
  if (
    !account ||
    account.program_type !== 'WARIBA_ONE' ||
    account.status !== 'breached' ||
    violation?.consequence !== 'hard_breach' ||
    performanceChild
  ) {
    return false;
  }

  const payoutOrDebit = await trx
    .selectFrom('app.trading_ledger_entries')
    .select('id')
    .where('account_id', '=', row.account_id)
    .where('entry_type', '=', 'payout_debit')
    .executeTakeFirst();
  return !payoutOrDebit;
}

function contestationDecisionMessage(
  publicId: string,
  decision: ContestationDecision,
  reason: string,
): string {
  if (decision === 'upheld') {
    return `Contestation ${publicId} : décision maintenue. Motif : ${reason}`;
  }
  if (decision === 'requires_escalation') {
    return `Contestation ${publicId} : examen complémentaire demandé. Motif : ${reason}`;
  }
  if (decision === 'correction_required') {
    return `Contestation ${publicId} : nous avons confirmé qu’une correction est nécessaire. Votre historique reste conservé pendant que nous préparons la suite. Motif : ${reason}`;
  }
  return `Contestation ${publicId} : le dossier nécessite un examen conjoint par les équipes Finance et Conformité. Aucune compensation automatique n’a été appliquée. Motif : ${reason}`;
}

export interface ContestationRemediationResult {
  contestationId: string;
  originalAccountId: string;
  originalAccountPublicId: string;
  replacementAccountId: string;
  replacementAccountPublicId: string;
  originalPolicyVersionId: string;
  replacementPolicyVersionId: string;
  alreadyExisted: boolean;
  before: {
    status: ContestationStatus;
    decision: ContestationDecision | null;
    version: number;
  };
  after: {
    status: 'decision_corrected';
    decision: 'decision_corrected';
    version: number;
  };
}

/**
 * Executes UX-SUPPORT-004 as an additive, idempotent compensation. The
 * original account and every evidence table are read only; the only financial
 * row created is the replacement account's authoritative nominal opening.
 */
export async function executeContestationReplacementInTransaction(
  trx: DbExecutor,
  params: {
    publicId: string;
    staffUserId: string;
    reason: string;
    expectedVersion: number;
    correlationId: string;
    now: Date;
  },
): Promise<ContestationRemediationResult> {
  const reason = params.reason.trim();
  if (reason.length < 10) {
    throw new ContestationStateError('Le motif doit contenir au moins 10 caractères.');
  }
  const row = await lockContestation(trx, params.publicId);
  const existing = await trx
    .selectFrom('app.trading_accounts')
    .select(['id', 'public_id', 'policy_version_id'])
    .where('source_contestation_id', '=', row.id)
    .executeTakeFirst();
  if (existing && row.account_id) {
    const original = await trx
      .selectFrom('app.trading_accounts')
      .select(['public_id', 'policy_version_id'])
      .where('id', '=', row.account_id)
      .executeTakeFirstOrThrow();
    return {
      contestationId: row.id,
      originalAccountId: row.account_id,
      originalAccountPublicId: original.public_id,
      replacementAccountId: existing.id,
      replacementAccountPublicId: existing.public_id,
      originalPolicyVersionId: original.policy_version_id,
      replacementPolicyVersionId: existing.policy_version_id,
      alreadyExisted: true,
      before: { status: row.status, decision: row.decision, version: row.version },
      after: {
        status: 'decision_corrected',
        decision: 'decision_corrected',
        version: row.version,
      },
    };
  }

  assertExpectedCaseVersion(row.version, params.expectedVersion);
  if (row.status !== 'correction_required' || row.decision !== 'correction_required') {
    throw new ContestationStateError(
      'Ce dossier n’autorise pas la création d’un compte de remplacement.',
    );
  }
  if (!row.decision_reason) {
    throw new ContestationStateError('Le motif de correction d’origine est indisponible.');
  }
  if (row.assigned_staff_id && row.assigned_staff_id !== params.staffUserId) {
    throw new ContestationStateError('Cette contestation est affectée à un autre opérateur.');
  }
  if (!(await isAutomaticReplacementEligible(trx, row)) || !row.account_id) {
    throw new ContestationStateError(
      'Le dossier n’est plus éligible à la correction automatique. Un examen Finance et Conformité est requis.',
    );
  }

  const source = await trx
    .selectFrom('app.trading_accounts')
    .select([
      'id',
      'public_id',
      'user_id',
      'program_type',
      'nominal_balance',
      'currency',
      'policy_version_id',
      'symbol_spec_set_id',
      'status',
    ])
    .where('id', '=', row.account_id)
    .executeTakeFirstOrThrow();
  if (source.program_type !== 'WARIBA_ONE' || source.status !== 'breached') {
    throw new ContestationStateError('Le compte d’origine n’est pas éligible à cette correction.');
  }

  const replacementPublicId = `EVAL-${source.nominal_balance.split('.')[0]}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const replacement = await trx
    .insertInto('app.trading_accounts')
    .values({
      public_id: replacementPublicId,
      user_id: source.user_id,
      source_purchase_order_id: null,
      source_evaluation_account_id: null,
      source_contestation_id: row.id,
      program_type: source.program_type,
      nominal_balance: source.nominal_balance,
      currency: source.currency,
      status: 'active',
      policy_version_id: source.policy_version_id,
      symbol_spec_set_id: source.symbol_spec_set_id,
      activated_at: params.now,
      created_at: params.now,
      updated_at: params.now,
    })
    .returning(['id', 'public_id'])
    .executeTakeFirstOrThrow();

  await trx
    .insertInto('app.account_state_transitions')
    .values({
      account_id: replacement.id,
      from_status: 'pending_activation',
      to_status: 'active',
      reason: 'contestation_replacement_issued',
      occurred_at: params.now,
    })
    .execute();
  await trx
    .insertInto('app.trading_ledger_entries')
    .values({
      account_id: replacement.id,
      entry_type: 'initial_balance',
      amount: source.nominal_balance,
      currency: source.currency,
      reference_type: 'contestation_replacement',
      reference_id: row.id,
      occurred_at: params.now,
      created_at: params.now,
    })
    .execute();
  await trx
    .insertInto('app.outbox_events')
    .values({
      aggregate_type: 'trading_account',
      aggregate_id: replacement.id,
      event_type: 'evaluation.replacement_activated',
      payload: JSON.stringify({
        accountId: replacement.id,
        publicId: replacement.public_id,
        sourceContestationId: row.id,
        originalAccountId: source.id,
      }),
    })
    .execute();

  await trx
    .updateTable('app.contestations')
    .set({
      status: 'decision_corrected',
      decision: 'decision_corrected',
      decision_reason: row.decision_reason,
      reviewed_by: params.staffUserId,
      reviewed_at: params.now,
      resolved_at: params.now,
      updated_at: params.now,
      version: row.version + 1,
    })
    .where('id', '=', row.id)
    .execute();
  await trx
    .insertInto('app.ticket_messages')
    .values({
      ticket_id: row.ticket_id,
      actor_type: 'system',
      body: `Contestation ${params.publicId} : décision corrigée. Un compte de remplacement vous a été attribué sans frais. Votre ancien compte reste consultable afin de conserver son historique.`,
      correlation_id: params.correlationId,
      created_at: params.now,
    })
    .execute();

  return {
    contestationId: row.id,
    originalAccountId: source.id,
    originalAccountPublicId: source.public_id,
    replacementAccountId: replacement.id,
    replacementAccountPublicId: replacement.public_id,
    originalPolicyVersionId: source.policy_version_id,
    replacementPolicyVersionId: source.policy_version_id,
    alreadyExisted: false,
    before: { status: row.status, decision: row.decision, version: row.version },
    after: {
      status: 'decision_corrected',
      decision: 'decision_corrected',
      version: row.version + 1,
    },
  };
}
