'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import {
  acknowledgePerformanceRules,
  buildEvaluationToPerformanceHandoff,
  PerformanceRulesAcknowledgementError,
} from '@wariba/application';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { getDb } from '../../../../lib/db';

export async function acknowledgePerformanceRulesAction(formData: FormData): Promise<void> {
  const accountPublicId = formData.get('accountPublicId');
  const acknowledged = formData.get('acknowledged');
  if (typeof accountPublicId !== 'string' || accountPublicId.length === 0) {
    redirect('/comptes?erreur=compte');
  }
  if (acknowledged !== 'yes') {
    redirect(
      `/comptes/${encodeURIComponent(accountPublicId)}/bienvenue-performance?erreur=confirmation`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/comptes/${accountPublicId}/bienvenue-performance`)}`,
    );
  }

  const db = getDb();
  const handoff = await buildEvaluationToPerformanceHandoff(db, {
    userId: user.id,
    accountPublicId,
  });
  const performance = handoff?.performanceAccount;
  if (!handoff || !performance) {
    redirect(
      `/comptes/${encodeURIComponent(accountPublicId)}/bienvenue-performance?erreur=indisponible`,
    );
  }

  try {
    await acknowledgePerformanceRules(db, {
      userId: user.id,
      accountId: performance.id,
      correlationId: randomUUID(),
      now: new Date(),
    });
  } catch (error) {
    const code =
      error instanceof PerformanceRulesAcknowledgementError
        ? error.code.toLowerCase()
        : 'indisponible';
    redirect(
      `/comptes/${encodeURIComponent(performance.publicId)}/bienvenue-performance?erreur=${encodeURIComponent(code)}`,
    );
  }

  /*
   * The Performance account's dashboard, not back to this page.
   *
   * Redirecting to the same path with only `?etat=pret` added was applied by
   * the client only about one time in three: the write always landed and a
   * reload always showed the ready state, but the page the trader was looking
   * at did not move. From their seat, ticking the box and pressing the button
   * did nothing — so they press it again, or they ask support. Measured over
   * repeated identical runs; a redirect to a different route was applied every
   * time.
   *
   * Landing on the Performance dashboard is also the destination that matches
   * what just happened (UX-HUB-012): the rules have been read, this account is
   * now the one the trader is working in, and its own next action is WariX.
   * The ready screen stays reachable at this route for anyone who wants to
   * re-read the comparison.
   */
  redirect(`/hub?account=${performance.id}`);
}
