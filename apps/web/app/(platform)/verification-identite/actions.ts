'use server';

import { randomUUID } from 'node:crypto';
import { requestIdentityReview } from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';

export interface IdentityReviewActionResult {
  destination: string;
}

export async function requestIdentityReviewAction(
  formData: FormData,
): Promise<IdentityReviewActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { destination: '/login?next=/verification-identite' };
  const accountId = formData.get('accountId');
  if (typeof accountId !== 'string' || accountId.length === 0) {
    return { destination: '/verification-identite?error=compte' };
  }
  let destination = '/verification-identite?demande=recue';
  try {
    await requestIdentityReview(getDb(), {
      userId: user.id,
      accountId,
      correlationId: randomUUID(),
      now: new Date(),
    });
  } catch (error) {
    destination =
      error instanceof Error && error.name === 'IdentityReviewStateError'
        ? '/verification-identite?error=etat'
        : '/verification-identite?error=indisponible';
  }
  return { destination };
}
