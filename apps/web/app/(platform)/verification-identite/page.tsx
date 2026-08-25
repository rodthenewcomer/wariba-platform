import { redirect } from 'next/navigation';
import {
  deriveKycState,
  kycView,
  KYC_PROVIDER_INTEGRATED,
  loadLatestIdentityReviewForTrader,
  listAccountsForUser,
} from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';
import { ActionLink } from '../../../components/hub/Action';
import { HubIcon } from '../../../components/hub/icons';
import { PageHeader } from '../../../components/hub/PageHeader';
import { StatusPill } from '../../../components/hub/StatusPill';
import { Surface, SurfaceTitle } from '../../../components/hub/Surface';
import { Alert, Button } from '@wariba/ui';
import { requestIdentityReviewAction } from './actions';

export const dynamic = 'force-dynamic';

/**
 * Identity verification.
 *
 * ## What this page does and does not do
 *
 * WARIBA does not verify identity documents. It holds one authoritative fact —
 * `trading_accounts.kyc_sandbox_verified` — set today by WARIBA staff review
 * and, when a provider is integrated, by that provider. There is no upload
 * widget here, no liveness capture and no progress bar through steps nobody
 * runs, because building those would be a flow that pretends to do something
 * the platform cannot do.
 *
 * What the page *is* is the product boundary: the state a trader is in, why it
 * matters, and what happens next. That boundary is the part worth building
 * now — the provider integration fills it in without a redesign, and
 * `KYC_PROVIDER_INTEGRATED` is the single switch that changes the copy.
 */
export default async function IdentityVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ demande?: string; error?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/verification-identite');

  const [accounts, latestReview, query] = await Promise.all([
    listAccountsForUser(getDb(), { userId: user.id }),
    loadLatestIdentityReviewForTrader(getDb(), { userId: user.id }),
    searchParams,
  ]);
  // Verification is recorded per account; the trader experiences it once. If
  // any account carries it, they are verified.
  const verified = accounts.some((account) => account.kycSandboxVerified);
  const performanceAccount = accounts.find(
    (account) => account.programType === 'WARIBA_PERFORMANCE',
  );
  const liveReview =
    latestReview && ['requested', 'under_review', 'needs_information'].includes(latestReview.status)
      ? latestReview
      : null;
  /*
   * B1 — one state, derived from the case that actually exists.
   *
   * The state used to be derived from the account flag alone, so a trader with
   * a file already under review was greeted with "Vérification requise" and,
   * further down, told to contact support to trigger a verification that had
   * been triggered days earlier. The header and the steps now read from the
   * same fact.
   */
  const view = kycView(deriveKycState({ verified, reviewStatus: liveReview?.status ?? null }));
  const reviewLabel = latestReview
    ? {
        requested: 'Demande reçue',
        under_review: 'En cours d’examen',
        needs_information: 'Information requise',
        verified: 'Identité vérifiée',
        unable_to_verify: 'Vérification non aboutie',
        closed: 'Dossier clôturé',
      }[latestReview.status]
    : null;

  const steps = [
    {
      title: 'Réussir une évaluation',
      done: accounts.some(
        (account) => account.programType === 'WARIBA_PERFORMANCE' || account.status === 'passed',
      ),
      detail: 'La vérification n’est demandée qu’à partir du moment où un payout est possible.',
    },
    {
      title: 'Vérifier votre identité',
      done: verified,
      /*
       * The instruction depends on the state, because in two of the three
       * states there is no instruction to give. Telling a trader whose case is
       * already open to go and open it is the contradiction this replaces.
       */
      detail: KYC_PROVIDER_INTEGRATED
        ? 'Vous serez redirigé vers notre prestataire de vérification.'
        : verified
          ? 'La vérification est terminée. Aucune action supplémentaire n’est nécessaire.'
          : liveReview
            ? liveReview.status === 'needs_information'
              ? 'L’équipe WARIBA a besoin d’une information supplémentaire. Répondez depuis votre demande de support.'
              : 'Votre dossier est chez l’équipe WARIBA. Vous n’avez rien à faire pour le moment.'
            : 'La vérification est réalisée par l’équipe WARIBA pendant la bêta privée. Lancez-la depuis le bouton ci-dessus.',
    },
    {
      title: 'Demander votre payout',
      done: false,
      detail: 'Une fois vérifiée, la demande de payout se fait depuis la page Payouts.',
    },
  ];

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageHeader description="La vérification d’identité est exigée une seule fois, avant votre premier payout. Elle ne bloque jamais le trading." />

      {query.demande === 'recue' ? (
        <Alert level="success" title="Demande reçue">
          L’équipe WARIBA examinera votre vérification. Vous retrouverez l’état du dossier ici.
        </Alert>
      ) : null}
      {query.error ? (
        <Alert level="warning" title="Demande non envoyée">
          {query.error === 'compte'
            ? 'Aucun compte Performance valide n’a été sélectionné.'
            : query.error === 'indisponible'
              ? 'Le service est momentanément indisponible. Réessayez plus tard.'
              : query.error}
        </Alert>
      ) : null}

      <Surface
        tone={view.tone === 'success' ? 'emerald' : 'amber'}
        data-testid="kyc-state"
        data-kyc={view.state}
        className="flex flex-col gap-4 p-5 sm:p-6"
      >
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
            style={{
              background:
                view.tone === 'success'
                  ? 'var(--wariba-accent-emerald-wash)'
                  : 'var(--wariba-accent-amber-wash)',
              color:
                view.tone === 'success'
                  ? 'var(--wariba-accent-emerald)'
                  : 'var(--wariba-accent-amber)',
            }}
          >
            <HubIcon role={view.state === 'verified' ? 'success' : 'identity'} size={22} active />
          </span>
          <div className="min-w-0">
            <p className="text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
              {view.label}
            </p>
            <p className="mt-1 max-w-[56ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
              {view.description}
            </p>
          </div>
        </div>

        {view.actionable && view.state === 'not_started' && performanceAccount && !latestReview ? (
          <div className="flex flex-wrap gap-2">
            <form action={requestIdentityReviewAction}>
              <input type="hidden" name="accountId" value={performanceAccount.id} />
              <Button type="submit" size="sm" data-testid="kyc-action">
                Demander ma vérification
              </Button>
            </form>
          </div>
        ) : view.actionable && !liveReview ? (
          <ActionLink href="/support" data-testid="kyc-action">
            Contacter le support
          </ActionLink>
        ) : null}
      </Surface>

      {latestReview && reviewLabel && !verified ? (
        <Surface className="flex flex-col gap-2 p-5 sm:p-6" data-testid="identity-review-state">
          <SurfaceTitle>Dossier de vérification</SurfaceTitle>
          <p className="text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
            {reviewLabel}
          </p>
          {latestReview.traderMessage ? (
            <p className="max-w-[64ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
              {latestReview.traderMessage}
            </p>
          ) : (
            <p className="max-w-[64ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
              L’équipe WARIBA suit cette demande. Aucun document n’est conservé sur la plateforme.
            </p>
          )}
        </Surface>
      ) : null}

      <Surface className="flex flex-col gap-4 p-5 sm:p-6">
        <SurfaceTitle>Comment ça se passe</SurfaceTitle>
        <ol className="flex list-none flex-col gap-0 p-0">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-3.5 border-b border-[color:var(--warix-border-subtle)] py-3.5 last:border-0"
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[length:var(--wariba-font-size-label-sm)] font-bold"
                style={{
                  background: step.done
                    ? 'var(--wariba-accent-emerald-wash)'
                    : 'var(--warix-surface-raised)',
                  color: step.done ? 'var(--wariba-accent-emerald)' : 'var(--wariba-text-tertiary)',
                }}
              >
                {step.done ? <HubIcon role="success" size={16} active /> : index + 1}
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-text-primary)]">
                  {step.title}
                  {step.done ? (
                    <StatusPill tone="success" size="sm">
                      Fait
                    </StatusPill>
                  ) : null}
                </p>
                <p className="mt-1 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
                  {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Surface>

      <Surface className="flex flex-col gap-2 p-5 sm:p-6">
        <SurfaceTitle>Ce que WARIBA conserve</SurfaceTitle>
        <p className="text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
          WARIBA enregistre uniquement le résultat de la vérification : vérifiée ou non. Aucune
          pièce d’identité n’est stockée sur la plateforme.
        </p>
      </Surface>
    </div>
  );
}
