import type { Db } from './client';
import {
  loadContestedDecisionEvidence,
  type ContestationEvidenceRef,
  type ContestedDecisionEvidence,
} from './contestation-evidence';
import { SupportOwnershipError } from './support-tickets';
import type {
  ContestationReasonCategory,
  ContestationStatus,
  ContestationTargetType,
} from './schema';

/**
 * Phase 3.2 — a challenge to an authoritative WARIBA decision.
 *
 * ## The invariant this module exists to hold
 *
 * Opening, reviewing or deciding a contestation never mutates historical
 * financial truth. There is no write here to `app.trading_accounts`,
 * `app.risk_violations`, `app.account_daily_snapshots`,
 * `app.account_state_transitions` or `app.trading_ledger_entries`, and the
 * account's state machine has no exit from `breached` for anything to call.
 * A decision is recorded beside the evidence; the evidence is untouched.
 *
 * That is not a stylistic preference. If contesting a breach could reverse it,
 * then every recorded breach becomes provisional, the maximum-loss floor stops
 * being a fact about the past, and the ledger that reconstructs an account's
 * balance no longer reconstructs anything. Reversal, when a policy eventually
 * authorises one, has to arrive as an explicit corrective transition that is
 * itself recorded — never as an UPDATE over the original.
 */

/** Statuses in which a contestation is still live and blocks a second one. */
export const LIVE_CONTESTATION_STATUSES: readonly ContestationStatus[] = [
  'open',
  'under_review',
  'needs_information',
];

export class DuplicateContestationError extends Error {
  constructor(readonly existingPublicId: string) {
    super('A contestation is already open for this decision.');
    this.name = 'DuplicateContestationError';
  }
}

export class ContestationTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContestationTargetError';
  }
}

export interface OpenContestationParams {
  userId: string;
  accountId: string;
  targetType: ContestationTargetType;
  /** A risk-violation id. Verified to exist on this account before anything is written. */
  targetId: string;
  reasonCategory: ContestationReasonCategory;
  traderStatement: string;
  /**
   * The contested rule, in the product's language.
   *
   * Supplied by the caller because the French rule vocabulary lives in
   * @wariba/application (`RISK_RULE_LABELS`), not here. Both the thread's
   * subject and its opening system message are built from it. Without one they
   * fell back to `rule_code`, which put `RISK_MAXIMUM_LOSS_BREACH` in a
   * trader's list of requests — the schema talking directly to a person. The
   * fallback remains, because an unlabelled rule should look unfinished rather
   * than plausible.
   */
  ruleLabel?: string;
  correlationId: string;
  now?: Date;
}

export interface OpenedContestation {
  contestationId: string;
  contestationPublicId: string;
  ticketId: string;
  ticketPublicId: string;
}

/**
 * Opens a contestation and the support thread that carries its conversation.
 *
 * One transaction, in this order: prove the account is the trader's, prove the
 * contested decision exists *on that account*, refuse a second live
 * contestation for the same decision, then write the ticket, the trader's
 * statement as the opening message, a system message recording that a
 * contestation was opened, and the contestation itself.
 *
 * The evidence reference is assembled from the decision that was just verified
 * rather than from anything the caller supplied — a request naming a real
 * violation and a fabricated policy version cannot produce a row that claims
 * both.
 */
export async function openContestation(
  db: Db,
  params: OpenContestationParams,
): Promise<OpenedContestation> {
  const now = params.now ?? new Date();

  return db.transaction().execute(async (trx) => {
    const account = await trx
      .selectFrom('app.trading_accounts')
      .select(['id', 'public_id'])
      .where('id', '=', params.accountId)
      .where('user_id', '=', params.userId)
      .executeTakeFirst();
    if (!account) {
      throw new SupportOwnershipError('This account does not belong to the requesting user.');
    }

    const decision = await trx
      .selectFrom('app.risk_violations')
      .select([
        'id',
        'rule_code',
        'consequence',
        'policy_version_id',
        'account_daily_snapshot_id',
        'account_state_transition_id',
        'trigger_event_type',
        'trigger_event_id',
      ])
      .where('id', '=', params.targetId)
      .where('account_id', '=', params.accountId)
      .executeTakeFirst();
    if (!decision) {
      throw new ContestationTargetError('This decision does not exist for this account.');
    }
    // An informational warning restricted nothing. Contesting it would be
    // contesting a note, and the queue would fill with disputes that have no
    // decision to overturn even in principle.
    if (!['hard_breach', 'soft_lock', 'entry_lock'].includes(decision.consequence)) {
      throw new ContestationTargetError('This decision is not contestable.');
    }

    const existing = await trx
      .selectFrom('app.contestations')
      .select('public_id')
      .where('target_type', '=', params.targetType)
      .where('target_id', '=', params.targetId)
      .where('status', 'in', LIVE_CONTESTATION_STATUSES)
      .executeTakeFirst();
    if (existing) {
      throw new DuplicateContestationError(existing.public_id);
    }

    const ticket = await trx
      .insertInto('app.support_tickets')
      .values({
        user_id: params.userId,
        account_id: params.accountId,
        // The category is derived from the consequence, not chosen by the
        // trader: a contestation over a terminal breach is a breach case
        // whatever the person filing it picked from a dropdown.
        category: decision.consequence === 'hard_breach' ? 'breach' : 'risk',
        subject: `Contestation — ${params.ruleLabel?.trim() || decision.rule_code}`,
        correlation_id: params.correlationId,
        created_at: now,
        updated_at: now,
      })
      .returning(['id', 'public_id'])
      .executeTakeFirstOrThrow();

    await trx
      .insertInto('app.ticket_messages')
      .values({
        ticket_id: ticket.id,
        actor_type: 'trader',
        actor_user_id: params.userId,
        body: params.traderStatement.trim(),
        correlation_id: params.correlationId,
        created_at: now,
      })
      .execute();

    const evidenceRef: ContestationEvidenceRef = {
      riskViolationId: decision.id,
      policyVersionId: decision.policy_version_id,
      accountDailySnapshotId: decision.account_daily_snapshot_id,
      accountStateTransitionId: decision.account_state_transition_id,
      triggerEventType: decision.trigger_event_type,
      triggerEventId: decision.trigger_event_id,
      correlationId: params.correlationId,
    };

    const contestation = await trx
      .insertInto('app.contestations')
      .values({
        user_id: params.userId,
        ticket_id: ticket.id,
        account_id: params.accountId,
        target_type: params.targetType,
        target_id: params.targetId,
        reason_category: params.reasonCategory,
        trader_statement: params.traderStatement.trim(),
        evidence_ref: JSON.stringify(evidenceRef),
        correlation_id: params.correlationId,
        opened_at: now,
        created_at: now,
        updated_at: now,
      })
      .returning(['id', 'public_id'])
      .executeTakeFirstOrThrow();

    // A state transition worth recording in the thread, and the only kind of
    // system message this build writes: it explains why the ticket exists.
    await trx
      .insertInto('app.ticket_messages')
      .values({
        ticket_id: ticket.id,
        actor_type: 'system',
        body: `Contestation ${contestation.public_id} ouverte sur la décision « ${params.ruleLabel?.trim() || decision.rule_code} » du compte ${account.public_id}.`,
        correlation_id: params.correlationId,
        created_at: now,
      })
      .execute();

    return {
      contestationId: contestation.id,
      contestationPublicId: contestation.public_id,
      ticketId: ticket.id,
      ticketPublicId: ticket.public_id,
    };
  });
}

export interface ContestationListRow {
  publicId: string;
  ticketPublicId: string;
  accountPublicId: string | null;
  targetType: ContestationTargetType;
  status: ContestationStatus;
  reasonCategory: ContestationReasonCategory;
  openedAt: Date;
  resolvedAt: Date | null;
}

export async function listContestationsForUser(
  db: Db,
  params: { userId: string; limit?: number },
): Promise<readonly ContestationListRow[]> {
  const rows = await db
    .selectFrom('app.contestations')
    .innerJoin('app.support_tickets', 'app.support_tickets.id', 'app.contestations.ticket_id')
    .leftJoin('app.trading_accounts', 'app.trading_accounts.id', 'app.contestations.account_id')
    .select([
      'app.contestations.public_id as public_id',
      'app.support_tickets.public_id as ticket_public_id',
      'app.trading_accounts.public_id as account_public_id',
      'app.contestations.target_type as target_type',
      'app.contestations.status as status',
      'app.contestations.reason_category as reason_category',
      'app.contestations.opened_at as opened_at',
      'app.contestations.resolved_at as resolved_at',
    ])
    .where('app.contestations.user_id', '=', params.userId)
    .orderBy('app.contestations.opened_at', 'desc')
    .limit(params.limit ?? 50)
    .execute();

  return rows.map((row) => ({
    publicId: row.public_id,
    ticketPublicId: row.ticket_public_id,
    accountPublicId: row.account_public_id,
    targetType: row.target_type,
    status: row.status,
    reasonCategory: row.reason_category,
    openedAt: row.opened_at,
    resolvedAt: row.resolved_at,
  }));
}

export interface ContestationDetail {
  publicId: string;
  ticketPublicId: string;
  accountPublicId: string | null;
  targetType: ContestationTargetType;
  targetId: string;
  status: ContestationStatus;
  reasonCategory: ContestationReasonCategory;
  traderStatement: string;
  decision: string | null;
  decisionReason: string | null;
  openedAt: Date;
  reviewedAt: Date | null;
  resolvedAt: Date | null;
  correlationId: string;
  /** Read live from the authoritative rows on every render. */
  evidence: ContestedDecisionEvidence | null;
}

/**
 * A trader's own contestation, with its evidence.
 *
 * `reviewed_by` is selected nowhere: which operator reviewed a dispute is an
 * internal fact, and attaching an employee to a decision a trader disagrees
 * with serves nobody.
 */
export async function loadContestationForUser(
  db: Db,
  params: { userId: string; publicId: string },
): Promise<ContestationDetail | null> {
  const row = await db
    .selectFrom('app.contestations')
    .innerJoin('app.support_tickets', 'app.support_tickets.id', 'app.contestations.ticket_id')
    .leftJoin('app.trading_accounts', 'app.trading_accounts.id', 'app.contestations.account_id')
    .select([
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
    ])
    .where('app.contestations.public_id', '=', params.publicId)
    .where('app.contestations.user_id', '=', params.userId)
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
    publicId: row.public_id,
    ticketPublicId: row.ticket_public_id,
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
    correlationId: row.correlation_id,
    evidence,
  };
}
