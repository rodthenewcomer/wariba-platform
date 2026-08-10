import { Badge, Card, EmptyState, Text } from '@wariba/ui';
import {
  displayName,
  maskEmail,
  searchControlUsers,
  type ControlUserRow,
} from '@wariba/application';
import Link from 'next/link';
import { requireControlArea } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';

// requireControlArea() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeZone: 'UTC' });

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  soft_locked: 'warning',
  breached: 'danger',
  passed: 'success',
  pass_pending: 'warning',
};

function text(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? '';
}

function positiveInteger(value: string | string[] | undefined): number {
  const raw = text(value);
  return /^\d+$/.test(raw) ? Math.max(1, Number.parseInt(raw, 10)) : 1;
}

function UserRow({ user }: { user: ControlUserRow }) {
  return (
    <tr className="border-t border-[color:var(--wariba-border-subtle)] align-top">
      <td className="p-2">
        <Link
          href={`/control/users/${user.userId}`}
          className="text-[color:var(--wariba-text-link)]"
        >
          {displayName(user.firstName, user.lastName)}
        </Link>
      </td>
      {/* Masked in the list: see control-pii.ts — bulk exposure is the risk,
          targeted lookup on the detail page is the job. */}
      <td className="p-2">{maskEmail(user.email)}</td>
      <td className="p-2">{user.country ?? '—'}</td>
      <td className="whitespace-nowrap p-2">
        <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
          {DATE_FORMAT.format(user.createdAt)}
        </span>
      </td>
      <td className="p-2">{user.accountCount}</td>
      <td className="p-2">
        <div className="flex flex-wrap gap-1">
          {user.accountStatuses.length === 0 ? (
            <span className="text-[color:var(--wariba-text-secondary)]">—</span>
          ) : (
            user.accountStatuses.map((status) => (
              <Badge key={status} variant={STATUS_VARIANT[status] ?? 'neutral'}>
                {status}
              </Badge>
            ))
          )}
        </div>
      </td>
      <td className="p-2">
        <div className="flex flex-wrap gap-1">
          {user.integrityHolds > 0 ? (
            <Badge variant="danger">{user.integrityHolds} hold</Badge>
          ) : null}
          {user.softLockedAccounts > 0 ? (
            <Badge variant="warning">{user.softLockedAccounts} verrouillé</Badge>
          ) : null}
          {user.breachedAccounts > 0 ? (
            <Badge variant="danger">{user.breachedAccounts} breach</Badge>
          ) : null}
          {user.integrityHolds === 0 &&
          user.softLockedAccounts === 0 &&
          user.breachedAccounts === 0 ? (
            <span className="text-[color:var(--wariba-text-secondary)]">—</span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export default async function ControlUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireControlArea('users');
  const params = await searchParams;
  const query = text(params.q);
  const page = positiveInteger(params.page);

  // Searched, counted and paged by PostgreSQL — the page only ever receives
  // the rows it renders.
  const result = await searchControlUsers(getDb(), { ...(query ? { query } : {}), page });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  const pageHref = (target: number): string => {
    const search = new URLSearchParams();
    if (query) search.set('q', query);
    if (target > 1) search.set('page', String(target));
    const suffix = search.toString();
    return suffix ? `/control/users?${suffix}` : '/control/users';
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text as="h1" variant="heading-lg">
          Users
        </Text>
        <Badge variant="neutral">{result.total} utilisateur(s)</Badge>
      </div>

      <Card>
        {/* GET form: searching is a read, so it stays a shareable URL and the
            page keeps no Server Action. */}
        <form method="get" action="/control/users" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
            Recherche (email, nom, identifiant de compte)
            <input
              type="search"
              name="q"
              defaultValue={query}
              className="min-w-[18rem] rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] px-2 py-1.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]"
            />
          </label>
          <button
            type="submit"
            className="rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-background-selected)] px-3 py-1.5 text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-text-primary)]"
          >
            Rechercher
          </button>
          {query ? (
            <a
              href="/control/users"
              className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
            >
              Réinitialiser
            </a>
          ) : null}
        </form>
      </Card>

      {result.users.length === 0 ? (
        <EmptyState
          title="Aucun utilisateur"
          description={
            query
              ? 'Aucun utilisateur ne correspond à cette recherche.'
              : 'Aucun utilisateur enregistré.'
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-[length:var(--wariba-font-size-body-sm)]">
              <caption className="sr-only">Utilisateurs</caption>
              <thead className="text-[color:var(--wariba-text-secondary)]">
                <tr>
                  <th scope="col" className="p-2 font-semibold">
                    Nom
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Email
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Pays
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Inscrit le
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Comptes
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Statuts
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Signaux
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.users.map((user) => (
                  <UserRow key={user.userId} user={user} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Pagination des utilisateurs" className="flex flex-wrap items-center gap-3">
          <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
            Page {result.page} sur {totalPages}
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <a
                href={pageHref(result.page - 1)}
                rel="prev"
                className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
              >
                Précédent
              </a>
            ) : null}
            {result.page < totalPages ? (
              <a
                href={pageHref(result.page + 1)}
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
