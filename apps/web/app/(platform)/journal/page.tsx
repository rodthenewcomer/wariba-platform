import { redirect } from 'next/navigation';
import { buildJournalView, listAccountsForUser, type JournalOutcome } from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';
import { ActionLink } from '../../../components/hub/Action';
import { HubEmptyState } from '../../../components/hub/HubEmptyState';
import { PageHeader } from '../../../components/hub/PageHeader';
import { SegmentedFilter } from '../../../components/hub/SegmentedFilter';
import { Surface } from '../../../components/hub/Surface';
import { AccountSwitcher } from '../hub/AccountSwitcher';
import { toSwitcherAccounts } from '../hub/switcher-accounts';
import { JournalTable } from './JournalTable';
import { JournalSummary } from './JournalSummary';
import { TradeRow } from './TradeRow';

export const dynamic = 'force-dynamic';

/**
 * Every closed trade, one at a time.
 *
 * Distinct from `/performance`: that page aggregates, this one enumerates. A
 * trader uses the first to notice a pattern and the second to find the trades
 * that made it.
 *
 * ## No notes, tags or setups
 *
 * They are a real feature with a real table, and no such table exists. The
 * journal reads what the platform recorded; annotation arrives when there is
 * somewhere to store it. Rendering a disabled "Ajouter une note" would be the
 * same promise this product has refused everywhere else.
 */

const OUTCOMES: { value: string; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'win', label: 'Gagnants' },
  { value: 'loss', label: 'Perdants' },
];

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; resultat?: string; instrument?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/journal');

  const db = getDb();
  const accounts = await listAccountsForUser(db, { userId: user.id });

  if (accounts.length === 0) {
    return (
      <div className="max-w-2xl">
        <HubEmptyState
          icon="journal"
          title="Aucun trade à analyser."
          description="Activez un compte et passez votre premier ordre — chaque trade clôturé apparaîtra ici."
          action={
            <ActionLink href="/comptes/nouveau" icon="addAccount">
              Choisir une évaluation
            </ActionLink>
          }
        />
      </div>
    );
  }

  const params = await searchParams;
  const activeAccount =
    accounts.find((candidate) => candidate.id === params.account) ??
    (accounts[0] as (typeof accounts)[number]);

  const outcome = OUTCOMES.some((option) => option.value === params.resultat)
    ? params.resultat
    : 'all';

  const journal = await buildJournalView(db, {
    accountId: activeAccount.id,
    ...(outcome && outcome !== 'all' ? { outcome: outcome as JournalOutcome } : {}),
    ...(params.instrument ? { symbol: params.instrument } : {}),
  });

  const href = (patch: Record<string, string | undefined>) => {
    const query = new URLSearchParams({ account: activeAccount.id });
    const resolved = { resultat: outcome, instrument: params.instrument, ...patch };
    for (const [key, value] of Object.entries(resolved)) {
      if (value && value !== 'all') query.set(key, value);
    }
    return `/journal?${query.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <AccountSwitcher
          accounts={toSwitcherAccounts(accounts)}
          activeAccountId={activeAccount.id}
          basePath="/journal"
        />
      </div>

      <PageHeader description="Chaque ligne est un aller-retour complet : une entrée, une sortie, un résultat réalisé. Les clôtures partielles apparaissent séparément — c’est ce qu’elles sont.">
        <SegmentedFilter
          label="Résultat"
          active={outcome ?? 'all'}
          options={OUTCOMES.map((option) => ({
            value: option.value,
            label: option.label,
            href: href({ resultat: option.value }),
          }))}
        />
      </PageHeader>

      {journal.symbols.length > 1 ? (
        <SegmentedFilter
          label="Instrument"
          active={params.instrument ?? 'all'}
          options={[
            { value: 'all', label: 'Tous les instruments', href: href({ instrument: undefined }) },
            ...journal.symbols.map((symbol) => ({
              value: symbol,
              label: symbol,
              href: href({ instrument: symbol }),
            })),
          ]}
        />
      ) : null}

      {journal.entries.length === 0 ? (
        <HubEmptyState
          icon="journal"
          title="Aucun trade pour cette période."
          description="Modifiez vos filtres, ou passez un ordre dans WariX pour commencer à remplir votre journal."
          action={
            <ActionLink href="/trade" icon="warix" variant="secondary">
              Ouvrir WariX
            </ActionLink>
          }
          compact
        />
      ) : (
        <>
          {/*
           * The same figures the Performance page reports, over the same
           * filtered set — §17. A record with no total at the top makes the
           * reader add eleven numbers to answer the first question they have.
           */}
          <JournalSummary summary={journal.summary} />

          <Surface className="p-3 sm:p-4 lg:p-5">
            {/* Table from lg up, cards below — see JournalTable's note. */}
            <JournalTable entries={journal.entries} />
            <ul
              data-testid="journal-list"
              className="flex list-none flex-col gap-2 p-0 lg:hidden"
            >
              {journal.entries.map((entry) => (
                <TradeRow key={entry.id} entry={entry} />
              ))}
            </ul>
          </Surface>
        </>
      )}
    </div>
  );
}
