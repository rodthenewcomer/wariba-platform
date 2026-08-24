import {
  appendStaffMessageInTransaction,
  assignSupportTicketInTransaction,
  recordContestationDecisionInTransaction,
  recordStaffAuditEvent,
  setContestationReviewStateInTransaction,
  setSupportTicketResolutionInTransaction,
  type ContestationDecision,
  type Db,
} from '@wariba/database';

/**
 * Phase 3.2 — every Control mutation on a support request or a contestation.
 *
 * Each one follows the shape Control's payout and integrity actions already
 * use: the primitive runs inside a transaction, the audit event is written in
 * that same transaction, and the two commit or roll back together. An audit
 * trail that can be missing the event it describes is not an audit trail.
 *
 * RBAC and the rate limit are applied by the caller through
 * `authorizeSensitiveStaffAction`, before any of this runs — the Server Action
 * is the boundary, not the page that rendered the button.
 */

export interface ControlSupportActionParams {
  publicId: string;
  staffUserId: string;
  staffRole: string;
  correlationId: string;
}

export async function assignSupportTicket(
  db: Db,
  params: ControlSupportActionParams & { assignToStaffId: string },
): Promise<void> {
  const now = new Date();
  await db.transaction().execute(async (trx) => {
    const change = await assignSupportTicketInTransaction(trx, {
      publicId: params.publicId,
      assignToStaffId: params.assignToStaffId,
      now,
    });
    await recordStaffAuditEvent(trx, {
      actorId: params.staffUserId,
      actorRole: params.staffRole,
      permission: 'support.assign',
      action: 'support_ticket.assigned',
      targetType: 'support_ticket',
      targetId: change.ticketId,
      before: change.before,
      after: change.after,
      reason:
        params.assignToStaffId === params.staffUserId
          ? 'Prise en charge par l’opérateur.'
          : 'Affectation à un opérateur.',
      correlationId: params.correlationId,
      occurredAt: now,
    });
  });
}

export async function replyToSupportTicket(
  db: Db,
  params: ControlSupportActionParams & { body: string; requestsInformation: boolean },
): Promise<void> {
  const now = new Date();
  await db.transaction().execute(async (trx) => {
    const change = await appendStaffMessageInTransaction(trx, {
      publicId: params.publicId,
      staffUserId: params.staffUserId,
      body: params.body,
      requestsInformation: params.requestsInformation,
      correlationId: params.correlationId,
      now,
    });
    await recordStaffAuditEvent(trx, {
      actorId: params.staffUserId,
      actorRole: params.staffRole,
      permission: 'support.reply',
      action: params.requestsInformation
        ? 'support_ticket.information_requested'
        : 'support_ticket.replied',
      targetType: 'support_ticket',
      targetId: change.ticketId,
      before: change.before,
      after: change.after,
      /*
       * The message body is deliberately not the audit reason.
       *
       * An audit event records that an operator answered and what the request's
       * state became. Copying the prose in would duplicate the conversation
       * into a table with a different retention posture and different readers,
       * for no investigative gain — the thread itself is append-only and is
       * where the words live.
       */
      reason: params.requestsInformation
        ? 'Complément d’information demandé au trader.'
        : 'Réponse opérateur envoyée au trader.',
      correlationId: params.correlationId,
      occurredAt: now,
    });
  });
}

export async function setSupportTicketResolution(
  db: Db,
  params: ControlSupportActionParams & { resolution: 'resolved' | 'closed'; reason: string },
): Promise<void> {
  const now = new Date();
  await db.transaction().execute(async (trx) => {
    const change = await setSupportTicketResolutionInTransaction(trx, {
      publicId: params.publicId,
      staffUserId: params.staffUserId,
      resolution: params.resolution,
      reason: params.reason,
      correlationId: params.correlationId,
      now,
    });
    await recordStaffAuditEvent(trx, {
      actorId: params.staffUserId,
      actorRole: params.staffRole,
      permission: 'support.resolve',
      action:
        params.resolution === 'resolved' ? 'support_ticket.resolved' : 'support_ticket.closed',
      targetType: 'support_ticket',
      targetId: change.ticketId,
      before: change.before,
      after: change.after,
      reason: params.reason,
      correlationId: params.correlationId,
      occurredAt: now,
    });
  });
}

export interface ControlContestationActionParams {
  publicId: string;
  staffUserId: string;
  staffRole: string;
  correlationId: string;
}

export async function setContestationReviewState(
  db: Db,
  params: ControlContestationActionParams & {
    nextStatus: 'under_review' | 'needs_information';
    reason: string;
  },
): Promise<void> {
  const now = new Date();
  await db.transaction().execute(async (trx) => {
    const change = await setContestationReviewStateInTransaction(trx, {
      publicId: params.publicId,
      reviewerUserId: params.staffUserId,
      nextStatus: params.nextStatus,
      now,
    });
    await recordStaffAuditEvent(trx, {
      actorId: params.staffUserId,
      actorRole: params.staffRole,
      permission: 'dispute.review',
      action:
        params.nextStatus === 'under_review'
          ? 'contestation.review_started'
          : 'contestation.information_requested',
      targetType: 'contestation',
      targetId: change.contestationId,
      before: change.before,
      after: change.after,
      reason: params.reason,
      correlationId: params.correlationId,
      occurredAt: now,
    });
  });
}

/**
 * Records an outcome. Writes nothing to any financial table, by construction.
 *
 * `recordContestationDecisionInTransaction` refuses `overturned` — there is no
 * authorized corrective command in this build, and recording a reversal the
 * platform cannot perform would tell a trader their account was restored when
 * it was not. The audit event captures the decision and its reason so that a
 * later reader can see both what was concluded and that nothing was mutated.
 */
export async function recordContestationDecision(
  db: Db,
  params: ControlContestationActionParams & { decision: ContestationDecision; reason: string },
): Promise<void> {
  const now = new Date();
  await db.transaction().execute(async (trx) => {
    const change = await recordContestationDecisionInTransaction(trx, {
      publicId: params.publicId,
      reviewerUserId: params.staffUserId,
      decision: params.decision,
      reason: params.reason,
      correlationId: params.correlationId,
      now,
    });
    await recordStaffAuditEvent(trx, {
      actorId: params.staffUserId,
      actorRole: params.staffRole,
      permission: 'dispute.resolve',
      action: 'contestation.decision_recorded',
      targetType: 'contestation',
      targetId: change.contestationId,
      before: change.before,
      after: {
        ...change.after,
        // Stated in the record rather than inferred later: this outcome changed
        // no account state, no risk violation and no ledger entry.
        financialStateMutated: false,
      },
      reason: params.reason,
      correlationId: params.correlationId,
      occurredAt: now,
    });
  });
}
