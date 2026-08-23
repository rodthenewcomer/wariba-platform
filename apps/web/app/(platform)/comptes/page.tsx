import { redirect } from 'next/navigation';
import { accountFilterOf, buildAccountsOverview, type AccountFilter } from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';
import { ActionLink } from '../../../components/hub/Action';
import { HubEmptyState } from '../../../components/hub/HubEmptyState';
import { PageHeader } from '../../../components/hub/PageHeader';
import { SegmentedFilter } from '../../../components/hub/SegmentedFilter';
import { Stagger, StaggerItem } from '../../../components/motion/primitives';
import { HubHeaderSlot } from '../HubHeaderSlot';
import { AccountCard } from './AccountCard';

export const dynamic = 'force-dynamic';

/**
 * Every account, filterable.
 *
 * ## Filters are links, and the server does the filtering
 *
 * `?etat=funded` is an address. That makes a filtered view shareable,
 * bookmarkable and back-button correct, and it means the filtering happens
 * where the data is rather than in a `useState` a client could disagree with.
 *
 * Counts come from the real set, so an empty bucket says "0" rather than
 * hiding — a trader who has failed an account should be able to see that the
 * "Échoués" tab exists and holds one.
 */

const FILTERS: { value: AccountFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'evaluation', label: 'Évaluations' },
  { value: 'review', label: 'En vérification' },
  { value: 'funded', label: 'Funded' },
  { value: 'failed', label: 'Échoués' },
  { value: 'closed', label: 'Fermés' },
];

function parseFilter(value: string | undefined): AccountFilter {
  return FILTERS.some((filter) => filter.value === value) ? (value as AccountFilter) : 'all';
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ etat?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/comptes');

  const items = await buildAccountsOverview(getDb(), { userId: user.id });
  const { etat } = await searchParams;
  const active = parseFilter(etat);

  const counts = new Map<AccountFilter, number>();
  for (const item of items) {
    const bucket = accountFilterOf(item);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  counts.set('all', items.length);

  const visible =
    active === 'all' ? items : items.filter((item) => accountFilterOf(item) === active);

  const addAccount = (
    <ActionLink href="/comptes/nouveau" icon="addAccount" size="sm" data-testid="accounts-add">
      Ajouter un compte
    </ActionLink>
  );

  if (items.length === 0) {
    return (
      <div className="flex max-w-2xl flex-col gap-5">
        <HubEmptyState
          icon="accounts"
          title="Vous n’avez pas encore de compte WARIBA."
          description="Choisissez une évaluation pour activer votre premier compte simulé."
          action={addAccount}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <HubHeaderSlot>{addAccount}</HubHeaderSlot>

      <PageHeader description="Chaque compte a ses propres règles, son propre risque et sa propre progression. Rien n’est jamais fusionné entre deux comptes.">
        <SegmentedFilter
          label="Filtrer les comptes"
          active={active}
          options={FILTERS.map((filter) => ({
            value: filter.value,
            label: filter.label,
            href: filter.value === 'all' ? '/comptes' : `/comptes?etat=${filter.value}`,
            count: counts.get(filter.value) ?? 0,
          }))}
        />
      </PageHeader>

      {visible.length === 0 ? (
        <HubEmptyState
          icon="accounts"
          title="Aucun compte dans cette catégorie."
          description="Changez de filtre pour voir vos autres comptes."
          compact
        />
      ) : (
        /* Two columns only when there is a second card to put in one. A lone
           half-width card beside an empty half reads as a page that failed to
           load the rest. */
        <Stagger
          as="ul"
          className={`grid list-none gap-4 p-0 ${visible.length > 1 ? 'xl:grid-cols-2' : 'max-w-3xl'}`}
        >
          {visible.map((item) => (
            <StaggerItem key={item.account.id} as="li">
              <AccountCard item={item} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
