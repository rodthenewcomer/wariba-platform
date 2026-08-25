'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { requestIdentityReview } from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';

export async function requestIdentityReviewAction(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/verification-identite');
  const accountId = formData.get('accountId');
  if (typeof accountId !== 'string' || accountId.length === 0) {
    redirect('/verification-identite?error=compte');
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
        ? `/verification-identite?error=${encodeURIComponent(error.message)}`
        : '/verification-identite?error=indisponible';
  }
  redirect(destination);
}
