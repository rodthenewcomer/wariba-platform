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

  redirect(`/comptes/${encodeURIComponent(performance.publicId)}/bienvenue-performance?etat=pret`);
}
