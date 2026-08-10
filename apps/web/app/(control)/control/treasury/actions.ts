'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  authorizeSensitiveStaffAction,
  recordControlTreasuryReserveEntry,
} from '@wariba/application';
import { getDb } from '../../../../lib/db';
import { requireStaffRole } from '../../../../lib/staff-auth';

const entryTypeSchema = z.enum(['deposit', 'withdrawal', 'adjustment']);
const amountSchema = z.string().regex(/^\d+(?:\.\d{1,2})?$/);

export async function recordTreasuryReserveAction(
  entryTypeInput: string,
  amountInput: string,
  reason: string,
): Promise<{ error?: string }> {
  const session = await requireStaffRole('finance');
  try {
    const entryType = entryTypeSchema.parse(entryTypeInput);
    const amount = amountSchema.parse(amountInput);
    if (!reason.trim()) return { error: 'Un motif est requis.' };
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: 'treasury.modify',
      limit: 10,
    });
    await recordControlTreasuryReserveEntry(getDb(), {
      entryType,
      amount,
      reason: reason.trim(),
      staffUserId: session.userId,
      staffRole: session.role,
      correlationId: randomUUID(),
    });
    revalidatePath('/control');
    revalidatePath('/control/treasury');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Écriture de réserve impossible.' };
  }
}
