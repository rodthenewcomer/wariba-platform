import { notFound, redirect } from 'next/navigation';
import { buildEvaluationToPerformanceHandoff } from '@wariba/application';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';
import { getDb } from '../../../../../lib/db';
import { trackEvent } from '../../../../../lib/analytics';
import { PerformanceHandoff } from '../PerformanceHandoff';

export const dynamic = 'force-dynamic';

export default async function PerformanceWelcomePage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ erreur?: string; etat?: string }>;
}) {
  const { publicId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    redirect(`/login?next=${encodeURIComponent(`/comptes/${publicId}/bienvenue-performance`)}`);

  const handoff = await buildEvaluationToPerformanceHandoff(getDb(), {
    userId: user.id,
    accountPublicId: publicId,
  });
  if (!handoff) notFound();
  if (handoff.performanceAccount && handoff.stage === 'rules_onboarding') {
    trackEvent('performance_rules_viewed', {
      accountId: handoff.performanceAccount.id,
      policyVersionId: handoff.performanceAccount.policyVersionId,
    });
  }
  const query = await searchParams;
  return (
    <PerformanceHandoff handoff={handoff} {...(query.erreur ? { error: query.erreur } : {})} />
  );
}
