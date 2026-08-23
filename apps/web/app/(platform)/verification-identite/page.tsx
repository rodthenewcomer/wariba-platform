import { redirect } from 'next/navigation';
import {
  deriveKycState,
  kycView,
  KYC_PROVIDER_INTEGRATED,
  listAccountsForUser,
} from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';
import { ActionLink } from '../../../components/hub/Action';
import { HubIcon } from '../../../components/hub/icons';
import { PageHeader } from '../../../components/hub/PageHeader';
import { StatusPill } from '../../../components/hub/StatusPill';
import { Surface, SurfaceTitle } from '../../../components/hub/Surface';

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
export default async function IdentityVerificationPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/verification-identite');

  const accounts = await listAccountsForUser(getDb(), { userId: user.id });
  // Verification is recorded per account; the trader experiences it once. If
  // any account carries it, they are verified.
  const verified = accounts.some((account) => account.kycSandboxVerified);
  const view = kycView(deriveKycState({ verified }));

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
      detail: KYC_PROVIDER_INTEGRATED
        ? 'Vous serez redirigé vers notre prestataire de vérification.'
        : 'La vérification est réalisée par l’équipe WARIBA pendant la bêta privée. Contactez le support pour la déclencher.',
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

        {view.actionable ? (
          <div className="flex flex-wrap gap-2">
            {/*
             * The action is the truthful one. With no provider wired, "Vérifier
             * mon identité" can only mean "ask the team to run it" — so that is
             * where it goes, rather than to a form that would collect documents
             * nothing can process.
             */}
            <ActionLink href="/support" data-testid="kyc-action">
              {KYC_PROVIDER_INTEGRATED ? view.actionLabel : 'Demander ma vérification'}
            </ActionLink>
          </div>
        ) : null}
      </Surface>

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
