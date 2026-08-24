'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import {
  assignSupportTicket,
  authorizeSensitiveStaffAction,
  replyToSupportTicket,
  setSupportTicketResolution,
} from '@wariba/application';
import { requireStaffRole } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';

/**
 * Control's Server Actions for the support queue.
 *
 * Every one re-checks the staff role itself. A Server Action is a directly
 * callable endpoint — the page having called `requireControlArea` is UX, not
 * authorization — and `authorizeSensitiveStaffAction` then applies both the
 * granular permission and the rate limit before anything is written. Same
 * shape as the payout actions next door, deliberately: an operator surface
 * that authorizes differently from its neighbours is an operator surface
 * nobody can reason about.
 *
 * `support` is the role required here, not `admin`. The hierarchy in
 * `staff.ts` already treats admin and super_admin as supersets, so naming the
 * narrow role is what keeps this from becoming an admin-only surface.
 */

export interface ControlSupportActionResult {
  error?: string;
}

const GENERIC = 'Cette action n’a pas pu aboutir.';

/**
 * Only our own errors carry their message across.
 *
 * `SupportTicketStateError` and the rate-limit error say something an operator
 * can act on ("this request is closed", "too many actions"). Anything else
 * reaching here came from the driver or the database, and a constraint name
 * rendered in an operator's browser is a disclosure that helps nobody — even
 * on a staff-only surface. Unrecognised failures get the generic sentence and
 * the server log keeps the detail.
 */
const FORWARDABLE = new Set([
  'SupportTicketStateError',
  'SupportOwnershipError',
  'ContestationStateError',
  'StaffActionRateLimitExceededError',
]);

function fail(error: unknown, fallback: string): ControlSupportActionResult {
  if (error instanceof Error && FORWARDABLE.has(error.name)) {
    return { error: error.message };
  }
  return { error: fallback };
}

export async function assignTicketToSelfAction(
  publicId: string,
): Promise<ControlSupportActionResult> {
  const session = await requireStaffRole('support');
  try {
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: 'support.assign',
      // Triage is a high-volume action: an operator sweeping a queue picks up
      // many tickets in a minute, and the default of 10 would stop them doing
      // their job. Still bounded — this is a guard against a loop, not a quota.
      limit: 60,
    });
    await assignSupportTicket(getDb(), {
      publicId,
      staffUserId: session.userId,
      staffRole: session.role,
      assignToStaffId: session.userId,
      correlationId: randomUUID(),
    });
  } catch (error) {
    return fail(error, 'Échec de la prise en charge.');
  }
  revalidatePath('/control/support');
  revalidatePath(`/control/support/${publicId}`);
  return {};
}

export async function replyToTicketAction(
  publicId: string,
  body: string,
  requestsInformation: boolean,
): Promise<ControlSupportActionResult> {
  const session = await requireStaffRole('support');
  if (body.trim().length === 0) {
    return { error: 'Un message est requis.' };
  }
  if (body.length > 4000) {
    return { error: 'Le message ne peut pas dépasser 4 000 caractères.' };
  }
  try {
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: 'support.reply',
      limit: 60,
    });
    await replyToSupportTicket(getDb(), {
      publicId,
      staffUserId: session.userId,
      staffRole: session.role,
      body,
      requestsInformation,
      correlationId: randomUUID(),
    });
  } catch (error) {
    return fail(error, 'Échec de l’envoi.');
  }
  revalidatePath(`/control/support/${publicId}`);
  revalidatePath('/control/support');
  return {};
}

export async function resolveTicketAction(
  publicId: string,
  resolution: 'resolved' | 'closed',
  reason: string,
): Promise<ControlSupportActionResult> {
  const session = await requireStaffRole('support');
  // A resolution with no reason is an audit row that explains nothing six
  // months later, and `recordStaffAuditEvent` refuses an empty one anyway.
  if (reason.trim().length === 0) {
    return { error: 'Un motif est requis.' };
  }
  try {
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: 'support.resolve',
    });
    await setSupportTicketResolution(getDb(), {
      publicId,
      staffUserId: session.userId,
      staffRole: session.role,
      resolution,
      reason,
      correlationId: randomUUID(),
    });
  } catch (error) {
    return fail(error, GENERIC);
  }
  revalidatePath(`/control/support/${publicId}`);
  revalidatePath('/control/support');
  return {};
}
