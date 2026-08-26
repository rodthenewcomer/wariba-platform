import { notFound, redirect } from 'next/navigation';
import { buildEvaluationToPerformanceHandoff } from '@wariba/application';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';
import { getDb } from '../../../../../lib/db';
import { ActionLink } from '../../../../../components/hub/Action';
import { PageHeader } from '../../../../../components/hub/PageHeader';
import { Surface, SurfaceTitle } from '../../../../../components/hub/Surface';

export const dynamic = 'force-dynamic';

export default async function AccountRulesPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/comptes/${publicId}/regles`)}`);

  const handoff = await buildEvaluationToPerformanceHandoff(getDb(), {
    userId: user.id,
    accountPublicId: publicId,
  });
  if (!handoff?.performanceAccount) notFound();
  const account = handoff.performanceAccount;

  return (
    <div className="flex max-w-4xl flex-col gap-5" data-testid="account-rules-page">
      <PageHeader
        description={`Règles attachées à ${account.publicId}. Cette page suit la version du compte, même si une nouvelle version est publiée plus tard.`}
      />
      <Surface className="p-5 sm:p-6">
        <SurfaceTitle>WARIBA Performance</SurfaceTitle>
        <dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {handoff.performanceRules.map((rule) => (
            <div key={rule.key}>
              <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                {rule.label}
              </dt>
              <dd className="mt-1">
                <span className="wariba-data font-semibold">{rule.displayValue}</span>
                <span className="mt-1 block text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
                  {rule.explanation}
                </span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="wariba-data mt-6 border-t border-[color:var(--warix-border-subtle)] pt-4 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
          Version {account.policyVersion}
        </p>
      </Surface>
      <div className="flex flex-wrap gap-2">
        <ActionLink href={`/hub?account=${account.id}`}>Retour au compte</ActionLink>
        <ActionLink href={`/trade?account=${account.id}`} variant="secondary" icon="warix">
          Ouvrir WariX
        </ActionLink>
      </div>
    </div>
  );
}
