'use server';

import { randomUUID } from 'node:crypto';
import {
  acknowledgePerformanceRules,
  buildEvaluationToPerformanceHandoff,
} from '@wariba/application';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { getDb } from '../../../../lib/db';

export interface PerformanceRulesAcknowledgementActionResult {
  destination?: string;
  error?: string;
}

const GENERIC_ERROR = 'Impossible de continuer pour le moment. Réessayez.';

export async function acknowledgePerformanceRulesAction(
  formData: FormData,
): Promise<PerformanceRulesAcknowledgementActionResult> {
  const accountPublicId = formData.get('accountPublicId');
  const acknowledged = formData.get('acknowledged');
  if (typeof accountPublicId !== 'string' || accountPublicId.length === 0) {
    return { error: GENERIC_ERROR };
  }
  if (acknowledged !== 'yes') {
    return { error: 'Cochez la case après avoir pris connaissance des règles.' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      destination: `/login?next=${encodeURIComponent(`/comptes/${accountPublicId}/bienvenue-performance`)}`,
    };
  }

  const db = getDb();
  const handoff = await buildEvaluationToPerformanceHandoff(db, {
    userId: user.id,
    accountPublicId,
  });
  const performance = handoff?.performanceAccount;
  if (!handoff || !performance) {
    return { error: GENERIC_ERROR };
  }

  try {
    await acknowledgePerformanceRules(db, {
      userId: user.id,
      accountId: performance.id,
      correlationId: randomUUID(),
      now: new Date(),
    });
  } catch {
    return { error: GENERIC_ERROR };
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
  return { destination: `/hub?account=${performance.id}` };
}
