import { Alert, Badge, Card, EmptyState, Text } from '@wariba/ui';
import {
  ACCOUNT_FILTER_LABELS,
  ACCOUNT_PROGRAMS,
  ACCOUNT_STATUSES,
  accountPageHref,
  accountTotalPages,
  maskEmail,
  parseAccountQuery,
  searchControlAccounts,
  type AccountSearchParams,
  type ControlAccountRow,
} from '@wariba/application';
import Link from 'next/link';
import { requireControlArea } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';

// requireControlArea() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

const DATE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeZone: 'UTC' });

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  soft_locked: 'warning',
  breached: 'danger',
  passed: 'success',
  pass_pending: 'warning',
};

const FIELD_CLASS =
  'rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] ' +
  'bg-[color:var(--wariba-background-surface)] px-2 py-1.5 ' +
  'text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]';
const LABEL_CLASS =
  'flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] ' +
  'text-[color:var(--wariba-text-secondary)]';

function raw(value: string | string[] | undefined): string {
  const single = Array.isArray(value) ? value[0] : value;
  return single ?? '';
}

function AccountRow({ account }: { account: ControlAccountRow }) {
  return (
    <tr className="border-t border-[color:var(--wariba-border-subtle)] align-top">
      <td className="p-2">
        <Link
          href={`/control/accounts/${account.id}`}
          className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-link)]"
        >
          {account.publicId}
        </Link>
      </td>
      {/* Masked, as in the Users list: an account list is bulk exposure too. */}
      <td className="p-2">{maskEmail(account.userEmail)}</td>
      <td className="p-2">{account.programType}</td>
      <td className="p-2">
        <span className="wariba-data">
          {account.nominalBalance} {account.currency}
        </span>
      </td>
      <td className="p-2">
        <div className="flex flex-wrap gap-1">
          <Badge variant={STATUS_VARIANT[account.status] ?? 'neutral'}>{account.status}</Badge>
          {account.integrityHold ? <Badge variant="danger">integrity</Badge> : null}
        </div>
      </td>
      <td className="p-2">
        {account.openPayoutRequests > 0 ? (
          <Badge variant="warning">{account.openPayoutRequests} en cours</Badge>
        ) : (
          <span className="text-[color:var(--wariba-text-secondary)]">—</span>
        )}
      </td>
      <td className="whitespace-nowrap p-2">
        <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
          {account.activatedAt ? DATE.format(account.activatedAt) : '—'}
        </span>
      </td>
    </tr>
  );
}

export default async function ControlAccountsPage({
  searchParams,
}: {
  searchParams: Promise<AccountSearchParams>;
}) {
  await requireControlArea('accounts');
  const params = await searchParams;
  const query = parseAccountQuery(params);
  const result = await searchControlAccounts(getDb(), {
    filters: query.filters,
    page: query.page,
  });
  const totalPages = accountTotalPages(result.total, result.pageSize);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text as="h1" variant="heading-lg">
          Accounts
        </Text>
        <Badge variant="neutral">{result.total} compte(s)</Badge>
      </div>

      {query.ignored.length > 0 ? (
        <Alert level="warning" title="Filtres ignorés">
          {query.ignored
            .map((key) => `${ACCOUNT_FILTER_LABELS[key] ?? key} : « ${raw(params[key])} »`)
            .join(' · ')}{' '}
          — valeur invalide, non appliquée. Les résultats ci-dessous ne sont pas filtrés par cette
          valeur.
        </Alert>
      ) : null}

      <Card>
        {/* Rendered from the parsed query, never the raw URL: a rejected
            value must not appear active while the results ignore it. */}
        <form method="get" action="/control/accounts" className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className={LABEL_CLASS}>
              Recherche (identifiant public, email)
              <input
                type="search"
                name="q"
                defaultValue={query.filters.query ?? ''}
                className={FIELD_CLASS}
              />
            </label>
            <label className={LABEL_CLASS}>
              Programme
              <select
                name="program"
                defaultValue={query.filters.program ?? ''}
                className={FIELD_CLASS}
              >
                <option value="">Tous</option>
                {ACCOUNT_PROGRAMS.map((program) => (
                  <option key={program} value={program}>
                    {program}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL_CLASS}>
              Statut
              <select
                name="status"
                defaultValue={query.filters.status ?? ''}
                className={FIELD_CLASS}
              >
                <option value="">Tous</option>
                {ACCOUNT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL_CLASS}>
              Nominal
              <input
                type="text"
                name="nominal"
                inputMode="decimal"
                defaultValue={query.filters.nominalBalance ?? ''}
                placeholder="10000.00"
                className={FIELD_CLASS}
              />
            </label>
            <label className={LABEL_CLASS}>
              Integrity hold
              <select
                name="hold"
                defaultValue={
                  query.filters.integrityHold === undefined
                    ? ''
                    : String(query.filters.integrityHold)
                }
                className={FIELD_CLASS}
              >
                <option value="">Tous</option>
                <option value="true">Sous hold</option>
                <option value="false">Sans hold</option>
              </select>
            </label>
            <label className={LABEL_CLASS}>
              Payout
              <select
                name="payout"
                defaultValue={query.filters.payoutPending ? 'pending' : ''}
                className={FIELD_CLASS}
              >
                <option value="">Tous</option>
                <option value="pending">Demande en cours</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-background-selected)] px-3 py-1.5 text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-text-primary)]"
            >
              Filtrer
            </button>
            <a
              href="/control/accounts"
              className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
            >
              Réinitialiser
            </a>
          </div>
        </form>
      </Card>

      {result.accounts.length === 0 ? (
        <EmptyState title="Aucun compte" description="Aucun compte ne correspond à ces filtres." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] text-left text-[length:var(--wariba-font-size-body-sm)]">
              <caption className="sr-only">Comptes</caption>
              <thead className="text-[color:var(--wariba-text-secondary)]">
                <tr>
                  <th scope="col" className="p-2 font-semibold">
                    Identifiant
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Titulaire
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Programme
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Nominal
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Statut
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Payout
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Activé le
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.accounts.map((account) => (
                  <AccountRow key={account.id} account={account} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Pagination des comptes" className="flex flex-wrap items-center gap-3">
          <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
            Page {result.page} sur {totalPages}
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <a
                href={accountPageHref(params, result.page - 1)}
                rel="prev"
                className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
              >
                Précédent
              </a>
            ) : null}
            {result.page < totalPages ? (
              <a
                href={accountPageHref(params, result.page + 1)}
                rel="next"
                className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
              >
                Suivant
              </a>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
