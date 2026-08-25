'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import {
  authorizeSensitiveStaffAction,
  assignContestation,
  executeContestationReplacement,
  recordContestationDecision,
  setContestationReviewState,
  staffCan,
  type ContestationDecision,
} from '@wariba/application';
import { requireStaffRole } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';

/**
 * Control's Server Actions for contestations.
 *
 * ## Why these do not require the `support` role
 *
 * A contestation challenges a risk decision made from a published policy.
 * Reading one is first-line work; deciding one is not. `dispute.review` and
 * `dispute.resolve` belong to risk and compliance, and `staffCan` is consulted
 * directly here rather than through a single role name because two roles
 * qualify — `requireStaffRole` takes one.
 *
 * ## The outcome that does not exist
 *
 * There is no "annuler la décision" action, because there is no command in
 * this platform that could carry one out: `breached` is terminal in the
 * evaluation-account state machine. `recordContestationDecisionInTransaction`
 * refuses `overturned` outright, so even a crafted request cannot record an
 * outcome WARIBA is unable to perform. An operator who believes a decision was
 * wrong records `requires_escalation`.
 */

export interface ControlContestationActionResult {
  error?: string;
}

const NOT_AUTHORIZED = 'Votre rôle ne permet pas cette action.';
const GENERIC = 'Cette action n’a pas pu aboutir.';

const FORWARDABLE = new Set([
  'ContestationStateError',
  'OperatorCaseStaleError',
  'StaffActionRateLimitExceededError',
]);

function fail(error: unknown): ControlContestationActionResult {
  if (error instanceof Error && FORWARDABLE.has(error.name)) return { error: error.message };
  return { error: GENERIC };
}

export async function assignContestationToSelfAction(
  publicId: string,
  expectedVersion: number,
): Promise<ControlContestationActionResult> {
  const session = await requireStaffRole();
  if (!staffCan(session.role, 'dispute.assign')) return { error: NOT_AUTHORIZED };
  try {
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: 'dispute.assign',
      limit: 30,
    });
    await assignContestation(getDb(), {
      publicId,
      staffUserId: session.userId,
      staffRole: session.role,
      expectedVersion,
      correlationId: randomUUID(),
    });
  } catch (error) {
    return fail(error);
  }
  revalidatePath('/control/contestations');
  revalidatePath(`/control/contestations/${publicId}`);
  return {};
}

export async function takeContestationReviewAction(
  publicId: string,
  nextStatus: 'under_review' | 'needs_information',
  reason: string,
  expectedVersion: number,
): Promise<ControlContestationActionResult> {
  // Any staff role gets past this; `staffCan` below is the real gate, because
  // two roles qualify for dispute.review and requireStaffRole names only one.
  const session = await requireStaffRole();
  if (!staffCan(session.role, 'dispute.review')) return { error: NOT_AUTHORIZED };
  if (reason.trim().length === 0) return { error: 'Un motif est requis.' };

  try {
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: 'dispute.review',
      limit: 30,
    });
    await setContestationReviewState(getDb(), {
      publicId,
      staffUserId: session.userId,
      staffRole: session.role,
      nextStatus,
      reason,
      correlationId: randomUUID(),
      expectedVersion,
    });
  } catch (error) {
    return fail(error);
  }
  revalidatePath('/control/contestations');
  revalidatePath(`/control/contestations/${publicId}`);
  return {};
}

export async function recordContestationDecisionAction(
  publicId: string,
  decision: ContestationDecision,
  reason: string,
  expectedVersion: number,
): Promise<ControlContestationActionResult> {
  const session = await requireStaffRole();
  const permission = decision === 'correction_required' ? 'dispute.correct' : 'dispute.resolve';
  if (!staffCan(session.role, permission)) return { error: NOT_AUTHORIZED };
  if (reason.trim().length === 0) return { error: 'Un motif de décision est requis.' };

  try {
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission,
      // Deciding a dispute is a low-volume, high-consequence action. Five per
      // minute is far above any real review pace and well below a script's.
      limit: 5,
    });
    await recordContestationDecision(getDb(), {
      publicId,
      staffUserId: session.userId,
      staffRole: session.role,
      decision,
      reason,
      correlationId: randomUUID(),
      expectedVersion,
    });
  } catch (error) {
    return fail(error);
  }
  revalidatePath('/control/contestations');
  revalidatePath(`/control/contestations/${publicId}`);
  return {};
}

export async function executeContestationReplacementAction(
  publicId: string,
  reason: string,
  expectedVersion: number,
): Promise<ControlContestationActionResult & { replacementAccountPublicId?: string }> {
  const session = await requireStaffRole();
  if (!staffCan(session.role, 'dispute.remediate')) return { error: NOT_AUTHORIZED };
  if (reason.trim().length < 10) {
    return { error: 'Décrivez la correction effectuée en au moins 10 caractères.' };
  }

  try {
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: 'dispute.remediate',
      limit: 5,
    });
    const result = await executeContestationReplacement(getDb(), {
      publicId,
      staffUserId: session.userId,
      staffRole: session.role,
      reason,
      correlationId: randomUUID(),
      expectedVersion,
    });
    revalidatePath('/control/contestations');
    revalidatePath(`/control/contestations/${publicId}`);
    revalidatePath('/control');
    revalidatePath('/support');
    revalidatePath(`/support/contestations/${publicId}`);
    revalidatePath('/hub');
    return { replacementAccountPublicId: result.replacementAccountPublicId };
  } catch (error) {
    return fail(error);
  }
}
