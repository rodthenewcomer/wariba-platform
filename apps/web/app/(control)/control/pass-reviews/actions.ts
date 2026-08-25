'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import {
  authorizeSensitiveStaffAction,
  recordPassReviewOperationalState,
  staffCan,
  type PassReviewOperatorStatus,
} from '@wariba/application';
import { getDb } from '../../../../lib/db';
import { requireStaffRole } from '../../../../lib/staff-auth';

export interface PassReviewActionResult {
  error?: string;
}

const FORWARDABLE = new Set([
  'PassReviewStateError',
  'OperatorCaseStaleError',
  'StaffActionRateLimitExceededError',
]);

export async function recordPassReviewAction(
  accountPublicId: string,
  status: PassReviewOperatorStatus,
  reason: string,
  expectedVersion: number,
): Promise<PassReviewActionResult> {
  const session = await requireStaffRole();
  const permission = status === 'reviewed' ? 'pass_review.review' : 'pass_review.escalate';
  if (!staffCan(session.role, permission)) {
    return { error: 'Votre rôle ne permet pas cette action.' };
  }
  if (reason.trim().length < 10) {
    return { error: 'Décrivez le contrôle effectué en au moins 10 caractères.' };
  }

  try {
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission,
      limit: 10,
    });
    await recordPassReviewOperationalState(getDb(), {
      accountPublicId,
      staffUserId: session.userId,
      staffRole: session.role,
      status,
      reason,
      expectedVersion,
      correlationId: randomUUID(),
    });
  } catch (error) {
    if (error instanceof Error && FORWARDABLE.has(error.name)) return { error: error.message };
    return { error: 'Cette action n’a pas pu aboutir.' };
  }

  revalidatePath('/control/pass-reviews');
  revalidatePath(`/control/pass-reviews/${accountPublicId}`);
  revalidatePath('/control');
  return {};
}
