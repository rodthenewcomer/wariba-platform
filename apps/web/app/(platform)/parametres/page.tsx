import { redirect } from 'next/navigation';
import { listAccountsForUser } from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';
import { resolveHubIdentity } from '../../../lib/hub-identity';
import { maskEmail } from '../../../lib/product-copy';
import { SUPPORTED_COUNTRIES } from '../../../lib/supported-countries';
import { ActionLink } from '../../../components/hub/Action';
import { PageHeader } from '../../../components/hub/PageHeader';
import { StatusPill } from '../../../components/hub/StatusPill';
import { Surface, SurfaceTitle } from '../../../components/hub/Surface';

export const dynamic = 'force-dynamic';

/**
 * Profile, security and preferences.
 *
 * ## Read-only, and honest about it
 *
 * There is no profile-update action in the application layer, no password
 * change beyond the recovery flow, and no preference store. So this page shows
 * what WARIBA holds and routes to the flows that genuinely exist — recovery for
 * a password, support for a correction. Rendering editable fields whose Save
 * button has nothing behind it would be the most obvious kind of placebo
 * control.
 *
 * The address is masked. A settings page is the most screenshotted page in any
 * product, and there is no reason for the full address to travel in one.
 */
export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/parametres');

  const identity = resolveHubIdentity(user.user_metadata ?? null);
  const accounts = await listAccountsForUser(getDb(), { userId: user.id });
  const verified = accounts.some((account) => account.kycSandboxVerified);

  const countryCode =
    typeof user.user_metadata?.country === 'string' ? user.user_metadata.country : null;
  const country = SUPPORTED_COUNTRIES.find((entry) => entry.code === countryCode);

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageHeader description="Les informations que WARIBA conserve sur votre compte." />

      <Surface className="flex flex-col gap-4 p-5 sm:p-6">
        <SurfaceTitle>Profil</SurfaceTitle>
        <dl className="flex flex-col divide-y divide-[color:var(--warix-border-subtle)]">
          {[
            { label: 'Nom', value: identity.displayName ?? 'Non renseigné' },
            { label: 'Adresse e-mail', value: user.email ? maskEmail(user.email) : '—' },
            { label: 'Pays de résidence', value: country?.label ?? 'Non renseigné' },
          ].map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                {row.label}
              </dt>
              <dd className="text-right text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
          Pour corriger une de ces informations, contactez le support.
        </p>
      </Surface>

      <Surface className="flex flex-col gap-4 p-5 sm:p-6">
        <SurfaceTitle>Sécurité</SurfaceTitle>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
              Mot de passe
            </p>
            <p className="mt-0.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              Modifiable via le lien de récupération envoyé à votre adresse.
            </p>
          </div>
          <ActionLink href="/mot-de-passe-oublie" variant="secondary" size="sm">
            Changer mon mot de passe
          </ActionLink>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--warix-border-subtle)] pt-4">
          <div>
            <p className="flex items-center gap-2 text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
              Vérification d’identité
              <StatusPill tone={verified ? 'success' : 'neutral'} size="sm">
                {verified ? 'Vérifiée' : 'Non vérifiée'}
              </StatusPill>
            </p>
            <p className="mt-0.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              Exigée une seule fois, avant votre premier payout.
            </p>
          </div>
          <ActionLink href="/verification-identite" variant="secondary" size="sm">
            Voir le détail
          </ActionLink>
        </div>
      </Surface>

      <Surface className="flex flex-col gap-2 p-5 sm:p-6">
        <SurfaceTitle>Langue</SurfaceTitle>
        <p className="text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
          WARIBA est disponible en français. D’autres langues arriveront avec l’ouverture publique.
        </p>
      </Surface>
    </div>
  );
}
