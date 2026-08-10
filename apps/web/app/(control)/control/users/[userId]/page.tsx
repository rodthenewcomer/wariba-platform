import { Badge, Card, EmptyState, Text } from '@wariba/ui';
import { displayName, loadControlUserDetail } from '@wariba/application';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireControlArea } from '../../../../../lib/staff-auth';
import { getDb } from '../../../../../lib/db';

// requireControlArea() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

const DATE_TIME = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'UTC',
});
const DATE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeZone: 'UTC' });

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  soft_locked: 'warning',
  breached: 'danger',
  passed: 'success',
  pass_pending: 'warning',
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A user's operational record.
 *
 * The email is shown in full here and masked in the list: this page is a
 * deliberate, single-subject lookup, whereas a list is bulk exposure nobody
 * had to justify. Read-only throughout — Prompt 09 gives Control no way to
 * edit a user, and nothing on this page mutates anything.
 */
export default async function ControlUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireControlArea('users');
  const { userId } = await params;
  // A malformed id would be a Postgres error against a uuid column, so it is
  // a 404 before it ever reaches the query.
  if (!UUID_PATTERN.test(userId)) notFound();

  const user = await loadControlUserDetail(getDb(), userId);
  if (!user) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/control/users"
          className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
        >
          ← Users
        </Link>
        <Text as="h1" variant="heading-lg">
          {displayName(user.firstName, user.lastName)}
        </Text>
      </div>

      <Card>
        <Text as="h2" variant="heading-sm">
          Identité
        </Text>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
              Email
            </dt>
            <dd className="wariba-data">{user.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
              Pays
            </dt>
            <dd>{user.country ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
              Langue
            </dt>
            <dd>{user.language ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
              Inscrit le
            </dt>
            <dd className="wariba-data">{DATE.format(user.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
              Identifiant
            </dt>
            <dd className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
              {user.userId}
            </dd>
          </div>
          <div>
            <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
              Demandes de payout
            </dt>
            <dd>{user.payoutRequestCount}</dd>
          </div>
          <div>
            <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
              Dossiers WARIBA Review ouverts
            </dt>
            <dd>{user.openReviewCases}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <Text as="h2" variant="heading-sm">
          Comptes
        </Text>
        {user.accounts.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Aucun compte" description="Cet utilisateur n’a aucun compte." />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-[length:var(--wariba-font-size-body-sm)]">
              <caption className="sr-only">Comptes de l’utilisateur</caption>
              <thead className="text-[color:var(--wariba-text-secondary)]">
                <tr>
                  <th scope="col" className="p-2 font-semibold">
                    Identifiant
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
                    KYC sandbox
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Méthode de payout
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Activé le
                  </th>
                </tr>
              </thead>
              <tbody>
                {user.accounts.map((account) => (
                  <tr
                    key={account.id}
                    className="border-t border-[color:var(--wariba-border-subtle)]"
                  >
                    <td className="p-2">
                      <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
                        {account.publicId}
                      </span>
                    </td>
                    <td className="p-2">{account.programType}</td>
                    <td className="p-2">
                      <span className="wariba-data">
                        {account.nominalBalance} {account.currency}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={STATUS_VARIANT[account.status] ?? 'neutral'}>
                          {account.status}
                        </Badge>
                        {account.integrityHold ? <Badge variant="danger">integrity</Badge> : null}
                      </div>
                    </td>
                    {/* Compliance owns changing these; support reads them to
                        explain why a payout is or is not available. */}
                    <td className="p-2">
                      {account.kycSandboxVerified ? 'Vérifié' : 'Non vérifié'}
                    </td>
                    <td className="p-2">
                      {account.payoutMethodSandboxConfigured ? 'Configurée' : 'Absente'}
                    </td>
                    <td className="p-2">
                      <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
                        {account.activatedAt ? DATE.format(account.activatedAt) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <Text as="h2" variant="heading-sm">
          Événements de cycle de vie
        </Text>
        {user.lifecycle.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="Aucun événement"
              description="Aucune transition d’état enregistrée pour cet utilisateur."
            />
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {user.lifecycle.map((event, index) => (
              <li
                key={`${event.accountId}-${event.occurredAt.toISOString()}-${index}`}
                className="flex flex-wrap items-baseline gap-2 border-t border-[color:var(--wariba-border-subtle)] pt-2 text-[length:var(--wariba-font-size-body-sm)] first:border-0 first:pt-0"
              >
                <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
                  {DATE_TIME.format(event.occurredAt)}
                </span>
                <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
                  {event.accountPublicId}
                </span>
                <span>
                  {event.fromStatus ?? '—'} → {event.toStatus}
                </span>
                <span className="text-[color:var(--wariba-text-secondary)]">{event.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
