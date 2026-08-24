import { redirect } from 'next/navigation';
import { buildOfferCatalog } from '@wariba/application';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { getDb } from '../../../../lib/db';
import { HubEmptyState } from '../../../../components/hub/HubEmptyState';
import { PageHeader } from '../../../../components/hub/PageHeader';
import { ActionLink } from '../../../../components/hub/Action';
import { Configurator } from './Configurator';

export const dynamic = 'force-dynamic';

/**
 * Buying an account.
 *
 * Lives inside the Hub rather than on the public marketing route because a
 * signed-in trader adding their third account is doing account management, not
 * discovery. `/offres` keeps its job of explaining the programme to someone
 * who has not signed up.
 */
export default async function NewAccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/comptes/nouveau');

  const catalog = await buildOfferCatalog(getDb());

  if (catalog.offers.length === 0) {
    return (
      <div className="max-w-2xl">
        <HubEmptyState
          icon="addAccount"
          title="Aucune évaluation disponible pour le moment."
          description="Les offres sont temporairement fermées. Elles réapparaîtront ici dès leur réouverture."
          action={
            <ActionLink href="/support" variant="secondary">
              Contacter le support
            </ActionLink>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader description="Choisissez la taille de votre compte. Les règles affichées ici sont exactement celles qui s’appliqueront à ce compte." />
      <Configurator
        offers={catalog.offers}
        policyVersion={catalog.policyVersion}
        rulesAvailable={catalog.rulesAvailable}
      />
    </div>
  );
}
