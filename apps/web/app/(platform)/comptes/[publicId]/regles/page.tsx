import { notFound, redirect } from 'next/navigation';
import { buildAccountPolicyView } from '@wariba/application';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';
import { getDb } from '../../../../../lib/db';
import { ActionLink } from '../../../../../components/hub/Action';
import { PageHeader } from '../../../../../components/hub/PageHeader';
import { Surface, SurfaceTitle } from '../../../../../components/hub/Surface';

export const dynamic = 'force-dynamic';

/**
 * Phase 3.4.4 §8 — the rules attached to one account, whichever account it is.
 *
 * ## What changed and why
 *
 * This page used to reach its content through
 * `buildEvaluationToPerformanceHandoff` and `notFound()` unless that returned
 * a Performance account. Three kinds of account therefore had no rules page at
 * all: a ONE account still in Evaluation, any FLEX account (the handoff throws
 * unless the evaluation is `WARIBA_ONE`), and every INSTANT account, which has
 * no Evaluation parent for a handoff to be about.
 *
 * It now reads `buildAccountPolicyView`, which branches on the policy the
 * account is pinned to rather than on the shape of a ONE handoff. The
 * consequence worth stating: a V1 account renders its own four rules and a V2
 * account renders its eleven, from the same component, because the row list
 * comes from the parameters rather than from a template chosen by product
 * name.
 *
 * ## Why the version is at the bottom
 *
 * §8 — the policy version is a trust artefact, not a headline. A trader needs
 * to know their rules cannot move under them, which the sentence above the
 * list says in words; the identifier is what makes that checkable, and belongs
 * where a checkable detail belongs.
 */
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

  const view = await buildAccountPolicyView(getDb(), {
    userId: user.id,
    accountPublicId: publicId,
    now: new Date(),
  });
  if (!view) notFound();

  const { account, policy, rules, capabilities } = view;
  /*
   * §17/§19/§57 — a control the policy requires but whose source is not
   * rattached cannot run. Saying so is the honest state; inventing a countdown
   * to an economic event nobody has published would not be.
   */
  const unavailableCapabilities = [
    capabilities.news.required && !capabilities.news.sourceReady
      ? 'le calendrier économique'
      : null,
    capabilities.marketSession.required && !capabilities.marketSession.sourceReady
      ? 'le calendrier des sessions'
      : null,
  ].filter((entry): entry is string => entry !== null);

  return (
    <div className="flex max-w-4xl flex-col gap-5" data-testid="account-rules-page">
      <PageHeader
        description={`Règles attachées à ${account.publicId}. Vos règles sont attachées à ce compte et ne changent pas en cours de route, même si une nouvelle version est publiée plus tard.`}
      />
      <Surface className="p-5 sm:p-6">
        <SurfaceTitle>
          {account.productLabel} · {account.phaseLabel}
        </SurfaceTitle>
        <p
          className="mt-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]"
          data-testid="account-rules-identity"
        >
          {account.publicId} · {account.nominalFormatted}
        </p>

        <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule) => (
            <div key={rule.key} data-testid={`account-rule-${rule.key}`}>
              <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                {rule.label}
              </dt>
              <dd className="mt-1">
                <span className="wariba-data font-semibold">{rule.displayValue}</span>
                {rule.amountFormatted ? (
                  <span className="wariba-data ml-2 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                    {rule.amountFormatted}
                  </span>
                ) : null}
                <span className="mt-1 block text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
                  {rule.explanation}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        {unavailableCapabilities.length > 0 ? (
          <p
            className="mt-6 text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]"
            data-testid="account-rules-capability-notice"
          >
            {unavailableCapabilities.join(' et ')}{' '}
            {unavailableCapabilities.length > 1 ? 'ne sont pas activés' : 'n’est pas activé'} pour
            ce programme. Les restrictions correspondantes ne s’affichent pas tant que la source
            n’est pas disponible.
          </p>
        ) : null}

        <p className="wariba-data mt-6 border-t border-[color:var(--warix-border-subtle)] pt-4 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
          Version de vos règles : {policy.semanticVersion}
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
