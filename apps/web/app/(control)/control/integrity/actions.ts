'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  authorizeSensitiveStaffAction,
  clearAccountIntegrityHold,
  placeAccountIntegrityHold,
} from '@wariba/application';
import { getDb } from '../../../../lib/db';
import { requireStaffRole } from '../../../../lib/staff-auth';

const accountIdSchema = z.string().uuid();

export interface IntegrityActionResult {
  error?: string;
}

async function runIntegrityAction(
  mode: 'place' | 'clear',
  accountIdInput: string,
  reason: string,
): Promise<IntegrityActionResult> {
  const session = await requireStaffRole('risk');
  try {
    const accountId = accountIdSchema.parse(accountIdInput);
    if (!reason.trim()) return { error: 'Un motif est requis.' };
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: mode === 'place' ? 'integrity_hold.place' : 'integrity_hold.clear',
      limit: 5,
    });
    const action = mode === 'place' ? placeAccountIntegrityHold : clearAccountIntegrityHold;
    await action(getDb(), {
      accountId,
      staffUserId: session.userId,
      staffRole: session.role,
      reason: reason.trim(),
      correlationId: randomUUID(),
    });
    revalidatePath('/control/integrity');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Action integrity impossible.' };
  }
}

export async function placeIntegrityHoldAction(
  accountId: string,
  reason: string,
): Promise<IntegrityActionResult> {
  return runIntegrityAction('place', accountId, reason);
}

export async function clearIntegrityHoldAction(
  accountId: string,
  reason: string,
): Promise<IntegrityActionResult> {
  return runIntegrityAction('clear', accountId, reason);
}
