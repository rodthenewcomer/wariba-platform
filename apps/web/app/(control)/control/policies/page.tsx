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
  parsePolicyQuery,
  searchControlPolicies,
  POLICY_FILTER_LABELS,
  POLICY_PROGRAMS,
  POLICY_STATUSES,
  type GovernanceSearchParams,
} from '@wariba/application';
import Link from 'next/link';
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

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'neutral'> = {
  published: 'success',
  approved: 'warning',
  reviewed: 'warning',
  draft: 'neutral',
  retired: 'neutral',
};

function raw(value: string | string[] | undefined): string {
  const single = Array.isArray(value) ? value[0] : value;
  return single ?? '';
}

/** Truncated for the list; the detail page shows it in full. */
function shortHash(hash: string | null): string {
  if (!hash) return 'indisponible';
  return hash.length > 16 ? `${hash.slice(0, 16)}…` : hash;
}

/**
 * The policy explorer.
 *
 * Read-only, and there is no mutation to hide: no write path to
 * `app.policy_versions` exists anywhere in application code — only
 * migrations seed it. The table carries a lifecycle column
 * (draft → reviewed → approved → published → retired), but a schema state
 * machine is not authorization to expose a staff action, so Control offers
 * no publish, approve or retire control.
 *
 * "Currently in force" comes from the same rule the policy loader applies,
 * never from newest row or highest semantic version.
 */
export default async function ControlPoliciesPage({
  searchParams,
}: {
  searchParams: Promise<GovernanceSearchParams>;
}) {
  await requireControlArea('policies');

  const params = await searchParams;
  const query = parsePolicyQuery(params);
  const result = await searchControlPolicies(getDb(), {
    filters: query.filters,
    page: query.page,
  });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Text as="h1" variant="heading-lg">
            Policies
          </Text>
          <Text variant="body-sm" color="secondary">
            Versions de politique de programme, en lecture seule.
          </Text>
        </div>
        <Badge variant="neutral">{result.total} version(s)</Badge>
      </div>

      <Alert level="information" title="Lecture seule">
        Control inspecte ce que la gouvernance a publié ; il ne publie pas. Aucune opération de
        publication, d’approbation ou de retrait n’existe côté serveur — le cycle de vie en base
        n’est pas une autorisation.
      </Alert>

      {query.ignored.length > 0 ? (
        <Alert level="warning" title="Filtres ignorés">
          {query.ignored
            .map((key) => `${POLICY_FILTER_LABELS[key] ?? key} : « ${raw(params[key])} »`)
            .join(' · ')}{' '}
          — valeur invalide, non appliquée.
        </Alert>
      ) : null}

      <Card padding="comfortable">
        <form method="get" action="/control/policies" className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className={LABEL_CLASS}>
              Programme
              <select
                name="program"
                defaultValue={query.filters.program ?? ''}
                className={FIELD_CLASS}
              >
                <option value="">Tous</option>
                {POLICY_PROGRAMS.map((program) => (
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
                {POLICY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL_CLASS}>
              Version
              <input
                type="text"
                name="version"
                placeholder="1.1.0"
                defaultValue={query.filters.semanticVersion ?? ''}
                className={FIELD_CLASS}
              />
            </label>
            <label className={LABEL_CLASS}>
              Retirée
              <select
                name="retired"
                defaultValue={
                  query.filters.retired === undefined ? '' : String(query.filters.retired)
                }
                className={FIELD_CLASS}
              >
                <option value="">Toutes</option>
                <option value="false">Non retirée</option>
                <option value="true">Retirée</option>
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
              href="/control/policies"
              className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
            >
              Réinitialiser
            </a>
          </div>
        </form>
      </Card>

      {result.policies.length === 0 ? (
        <EmptyState
          title="Aucune version de politique"
          description="Aucune version ne correspond à ces filtres."
        />
      ) : (
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Programme</DataTableHeaderCell>
              <DataTableHeaderCell>Version</DataTableHeaderCell>
              <DataTableHeaderCell>Statut</DataTableHeaderCell>
              <DataTableHeaderCell>En vigueur</DataTableHeaderCell>
              <DataTableHeaderCell>Effective le</DataTableHeaderCell>
              <DataTableHeaderCell>Retirée le</DataTableHeaderCell>
              <DataTableHeaderCell>Hash document</DataTableHeaderCell>
              <DataTableHeaderCell>Hash machine</DataTableHeaderCell>
              <DataTableHeaderCell>Créée le</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {result.policies.map((policy) => (
              <DataTableRow key={policy.id}>
                <DataTableCell>{policy.program}</DataTableCell>
                <DataTableCell>
                  {/* Detail re-checks policy.view for itself. */}
                  <Link
                    href={`/control/policies/${policy.id}`}
                    className="text-[color:var(--wariba-text-link)]"
                  >
                    {policy.semanticVersion}
                  </Link>
                </DataTableCell>
                <DataTableCell>
                  <Badge variant={STATUS_VARIANT[policy.status] ?? 'neutral'}>
                    {policy.status}
                  </Badge>
                </DataTableCell>
                <DataTableCell>
                  {/* Not "newest row" and not "retired_at is null" — the row
                      the loader would actually resolve for this program. */}
                  {policy.currentlyEffective ? (
                    <Badge variant="success">En vigueur</Badge>
                  ) : (
                    <span className="text-[color:var(--wariba-text-secondary)]">—</span>
                  )}
                </DataTableCell>
                <DataTableCell>
                  {policy.effectiveFrom ? DATE_TIME.format(policy.effectiveFrom) : 'non définie'}
                </DataTableCell>
                <DataTableCell>
                  {policy.retiredAt ? DATE_TIME.format(policy.retiredAt) : 'non retirée'}
                </DataTableCell>
                <DataTableCell>
                  <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
                    {shortHash(policy.humanDocumentHash)}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
                    {shortHash(policy.machineHash)}
                  </span>
                </DataTableCell>
                <DataTableCell>{DATE_TIME.format(policy.createdAt)}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Pagination des politiques" className="flex flex-wrap items-center gap-3">
          <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
            Page {result.page} sur {totalPages}
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <a
                href={governancePageHref('/control/policies', params, result.page - 1)}
                rel="prev"
                className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
              >
                Précédent
              </a>
            ) : null}
            {result.page < totalPages ? (
              <a
                href={governancePageHref('/control/policies', params, result.page + 1)}
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
