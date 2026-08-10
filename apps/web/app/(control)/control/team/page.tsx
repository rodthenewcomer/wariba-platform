import {
  Alert,
  Badge,
  Card,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyState,
  Text,
} from '@wariba/ui';
import {
  governancePageHref,
  parseStaffQuery,
  searchStaffDirectory,
  STAFF_FILTER_LABELS,
  STAFF_ROLES,
  type GovernanceSearchParams,
} from '@wariba/application';
import { requireControlArea } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';

// requireControlArea() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

const DATE_TIME = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'UTC',
});

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

/**
 * The staff directory.
 *
 * Read-only, with nothing hidden behind that: Prompt 09 authorizes no staff
 * role mutation, no invitation, no removal and no impersonation, so no such
 * permission and no Server Action exists to gate. The page says so out loud,
 * because an access-management screen with no controls should read as a
 * deliberate governance state rather than a missing feature.
 *
 * A row here is *authority* — an `app.staff_members` grant. It is not the
 * same thing as identity: see SEC-017, explained on the page.
 */
export default async function ControlTeamPage({
  searchParams,
}: {
  searchParams: Promise<GovernanceSearchParams>;
}) {
  await requireControlArea('team');

  const params = await searchParams;
  const query = parseStaffQuery(params);
  const result = await searchStaffDirectory(getDb(), {
    filters: query.filters,
    page: query.page,
  });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Text as="h1" variant="heading-lg">
            Team Access
          </Text>
          <Text variant="body-sm" color="secondary">
            Autorisations staff accordées, en lecture seule.
          </Text>
        </div>
        <Badge variant="neutral">{result.total} autorisation(s)</Badge>
      </div>

      <Alert level="information" title="Lecture seule">
        La gestion des accès est en lecture seule dans le Prompt 09. Aucun changement de rôle,
        ajout, retrait, désactivation, réinitialisation de mot de passe ni usurpation d’identité
        n’est disponible — et aucune opération serveur correspondante n’existe.
      </Alert>

      {/* SEC-017. Without this, a reader could mistake retained identity for
          a lingering grant, and try to "clean it up". */}
      <Card padding="comfortable" className="flex flex-col gap-2">
        <Text as="h2" variant="heading-sm">
          Autorité et identité historique
        </Text>
        <Text variant="body-sm" color="secondary">
          Ce tableau liste l’<strong>autorité</strong> : une ligne existe tant qu’une autorisation
          staff est accordée. L’<strong>identité historique</strong> est distincte : une personne
          peut ne plus figurer ici tout en restant référencée par des preuves immuables (exécutions
          actuarielles, événements d’audit). Cette rétention est voulue — une preuve dont l’acteur
          peut disparaître n’est plus une preuve — et ne constitue pas un accès résiduel.
        </Text>
        <Text variant="body-sm" color="secondary">
          Le modèle de désaffectation futur reste : révoquer l’autorité → désactiver
          l’authentification si nécessaire → conserver l’identité d’acteur historique.
        </Text>
      </Card>

      {Object.keys(result.countsByRole).length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {STAFF_ROLES.filter((role) => result.countsByRole[role]).map((role) => (
            <Badge key={role} variant="neutral">
              {role} · {result.countsByRole[role]}
            </Badge>
          ))}
        </div>
      ) : null}

      {query.ignored.length > 0 ? (
        <Alert level="warning" title="Filtres ignorés">
          {query.ignored
            .map((key) => `${STAFF_FILTER_LABELS[key] ?? key} : « ${raw(params[key])} »`)
            .join(' · ')}{' '}
          — valeur invalide, non appliquée.
        </Alert>
      ) : null}

      <Card padding="comfortable">
        <form method="get" action="/control/team" className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={LABEL_CLASS}>
              Recherche (email, user id)
              <input
                type="search"
                name="q"
                defaultValue={query.filters.query ?? ''}
                className={FIELD_CLASS}
              />
            </label>
            <label className={LABEL_CLASS}>
              Rôle
              <select name="role" defaultValue={query.filters.role ?? ''} className={FIELD_CLASS}>
                <option value="">Tous</option>
                {STAFF_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
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
              href="/control/team"
              className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
            >
              Réinitialiser
            </a>
          </div>
        </form>
      </Card>

      {result.members.length === 0 ? (
        <EmptyState
          title="Aucune autorisation staff"
          description="Aucune autorisation ne correspond à ces filtres."
        />
      ) : (
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Email</DataTableHeaderCell>
              <DataTableHeaderCell>Rôle</DataTableHeaderCell>
              <DataTableHeaderCell>User ID</DataTableHeaderCell>
              <DataTableHeaderCell>Autorisation ID</DataTableHeaderCell>
              <DataTableHeaderCell>Accordée par</DataTableHeaderCell>
              <DataTableHeaderCell>Accordée le</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {result.members.map((member) => (
              <DataTableRow key={member.id}>
                <DataTableCell>{member.email ?? 'adresse indisponible'}</DataTableCell>
                <DataTableCell>
                  <Badge variant="neutral">{member.role}</Badge>
                </DataTableCell>
                <DataTableCell>
                  <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
                    {member.userId}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
                    {member.id}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  {member.grantedByUserId
                    ? (member.grantedByEmail ?? member.grantedByUserId)
                    : 'non enregistré'}
                </DataTableCell>
                <DataTableCell>{DATE_TIME.format(member.grantedAt)}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="Pagination des autorisations"
          className="flex flex-wrap items-center gap-3"
        >
          <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
            Page {result.page} sur {totalPages}
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <a
                href={governancePageHref('/control/team', params, result.page - 1)}
                rel="prev"
                className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
              >
                Précédent
              </a>
            ) : null}
            {result.page < totalPages ? (
              <a
                href={governancePageHref('/control/team', params, result.page + 1)}
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
