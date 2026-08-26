'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import {
  ContestationTargetError,
  DuplicateContestationError,
  StaffActionRateLimitExceededError,
  SupportOwnershipError,
  SupportTicketStateError,
  submitContestation,
  submitSupportReply,
  submitSupportTicket,
} from '@wariba/application';
import {
  createSupportTicketSchema,
  openContestationSchema,
  supportReplySchema,
} from '@wariba/validation';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { getDb } from '../../lib/db';

/**
 * The trader's Server Actions for Support.
 *
 * ## Each action authenticates itself
 *
 * A Server Action is a directly callable endpoint. The page having rendered
 * behind a session is not authorization — same reasoning as `(auth)/actions.ts`
 * and Control's own actions. So every function here resolves the user itself
 * and passes that id to the command, which then scopes every query by it.
 *
 * ## What comes back
 *
 * A result object, never a thrown error crossing the boundary. The message is
 * chosen from a fixed set of French sentences by the *type* of failure; the
 * underlying error's own text is never forwarded. That rule exists because
 * these errors originate at the database, and a constraint name or a query
 * fragment rendered in a support form is a disclosure that buys the trader
 * nothing (§19).
 */

export interface SupportActionResult {
  error?: string;
  publicId?: string;
}

const GENERIC_ERROR = 'Cette action n’a pas pu aboutir. Réessayez dans un instant.';
const RATE_LIMITED =
  'Vous avez envoyé plusieurs demandes coup sur coup. Réessayez dans un instant.';
const NOT_ACCESSIBLE = 'Cette demande n’est pas accessible.';

/**
 * Turns a failure into something a trader can act on.
 *
 * Every branch is a type we raised deliberately. Anything else falls through
 * to the generic sentence — an unrecognised error is exactly the case where
 * forwarding the message is most likely to leak.
 */
function messageFor(error: unknown): string {
  if (error instanceof StaffActionRateLimitExceededError) return RATE_LIMITED;
  if (error instanceof SupportOwnershipError) return NOT_ACCESSIBLE;
  if (error instanceof SupportTicketStateError) {
    return 'Cette demande est clôturée et n’accepte plus de réponse.';
  }
  if (error instanceof ContestationTargetError) {
    return 'Cette décision ne peut pas être contestée.';
  }
  if (error instanceof DuplicateContestationError) {
    return 'Une contestation est déjà ouverte pour cette décision.';
  }
  return GENERIC_ERROR;
}

async function requireUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function createSupportTicketAction(input: {
  category: string;
  accountId: string | null;
  subject: string;
  body: string;
}): Promise<SupportActionResult> {
  const userId = await requireUserId();
  if (!userId) return { error: NOT_ACCESSIBLE };

  const parsed = createSupportTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  }

  try {
    const { publicId } = await submitSupportTicket(getDb(), {
      userId,
      category: parsed.data.category,
      // A claim until the command checks it against this user's accounts.
      accountId: parsed.data.accountId,
      subject: parsed.data.subject,
      body: parsed.data.body,
      correlationId: randomUUID(),
    });
    revalidatePath('/support');
    return { publicId };
  } catch (error) {
    return { error: messageFor(error) };
  }
}

export async function replyToSupportTicketAction(
  publicId: string,
  input: { body: string },
): Promise<SupportActionResult> {
  const userId = await requireUserId();
  if (!userId) return { error: NOT_ACCESSIBLE };

  const parsed = supportReplySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  }

  try {
    await submitSupportReply(getDb(), {
      userId,
      publicId,
      body: parsed.data.body,
      correlationId: randomUUID(),
    });
  } catch (error) {
    return { error: messageFor(error) };
  }
  revalidatePath(`/support/demandes/${publicId}`);
  revalidatePath('/support');
  return {};
}

export async function openContestationAction(input: {
  accountId: string;
  targetId: string;
  reasonCategory: string;
  traderStatement: string;
}): Promise<SupportActionResult> {
  const userId = await requireUserId();
  if (!userId) return { error: NOT_ACCESSIBLE };

  const parsed = openContestationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  }

  try {
    const opened = await submitContestation(getDb(), {
      userId,
      accountId: parsed.data.accountId,
      targetId: parsed.data.targetId,
      reasonCategory: parsed.data.reasonCategory,
      traderStatement: parsed.data.traderStatement,
      correlationId: randomUUID(),
    });
    revalidatePath('/support');
    return { publicId: opened.contestationPublicId };
  } catch (error) {
    return { error: messageFor(error) };
  }
}
