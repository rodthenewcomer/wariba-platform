'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import {
  assignIdentityReview,
  authorizeSensitiveStaffAction,
  staffCan,
  updateIdentityReview,
} from '@wariba/application';
import { requireStaffRole } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';

export interface IdentityActionResult {
  error?: string;
}

const FORWARDABLE = new Set([
  'IdentityReviewStateError',
  'OperatorCaseStaleError',
  'StaffActionRateLimitExceededError',
]);

function fail(error: unknown): IdentityActionResult {
  if (error instanceof Error && FORWARDABLE.has(error.name)) return { error: error.message };
  return { error: 'Cette action n’a pas pu aboutir.' };
}

export async function assignIdentityToSelfAction(
  publicId: string,
  expectedVersion: number,
): Promise<IdentityActionResult> {
  const session = await requireStaffRole();
  if (!staffCan(session.role, 'identity_review.assign')) {
    return { error: 'Votre rôle ne permet pas cette action.' };
  }
  try {
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: 'identity_review.assign',
      limit: 30,
    });
    await assignIdentityReview(getDb(), {
      publicId,
      staffUserId: session.userId,
      staffRole: session.role,
      expectedVersion,
      correlationId: randomUUID(),
    });
  } catch (error) {
    return fail(error);
  }
  revalidatePath('/control');
  revalidatePath('/control/identity');
  revalidatePath(`/control/identity/${publicId}`);
  return {};
}

export async function updateIdentityAction(
  publicId: string,
  expectedVersion: number,
  nextStatus: 'under_review' | 'needs_information' | 'verified' | 'unable_to_verify',
  decisionReason: string,
  traderMessage: string,
  evidenceReference: string,
): Promise<IdentityActionResult> {
  const session = await requireStaffRole();
  const decision = nextStatus === 'verified' || nextStatus === 'unable_to_verify';
  const permission = decision ? 'identity_review.decide' : 'identity_review.review';
  if (!staffCan(session.role, permission))
    return { error: 'Votre rôle ne permet pas cette action.' };
  if (decisionReason.trim().length < 10)
    return { error: 'Le motif doit contenir au moins 10 caractères.' };
  if (traderMessage.trim().length < 10)
    return { error: 'Le message trader doit contenir au moins 10 caractères.' };
  try {
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission,
      limit: decision ? 10 : 30,
    });
    await updateIdentityReview(getDb(), {
      publicId,
      staffUserId: session.userId,
      staffRole: session.role,
      expectedVersion,
      nextStatus,
      decisionReason,
      traderMessage,
      ...(evidenceReference.trim() ? { evidenceReference } : {}),
      correlationId: randomUUID(),
    });
  } catch (error) {
    return fail(error);
  }
  revalidatePath('/control');
  revalidatePath('/control/identity');
  revalidatePath(`/control/identity/${publicId}`);
  revalidatePath('/verification-identite');
  return {};
}
