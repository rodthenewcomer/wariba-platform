import { ControlDocumentLink as Link } from '../../ControlDocumentLink';
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
  buildControlIdentityQueueView,
  IDENTITY_REVIEW_ASSIGNMENTS,
  IDENTITY_REVIEW_STATUSES,
  IDENTITY_REVIEW_STATUS_LABELS,
  parseControlIdentityQuery,
  type ControlIdentitySearchParams,
} from '@wariba/application';
import { requireControlArea } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';

export const dynamic = 'force-dynamic';
const FIELD =
  'rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] px-2 py-1.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]';

export default async function IdentityQueuePage({
  searchParams,
}: {
  searchParams: Promise<ControlIdentitySearchParams>;
}) {
  const session = await requireControlArea('identity-reviews');
  const params = await searchParams;
  const query = parseControlIdentityQuery(params);
  const result = await buildControlIdentityQueueView(getDb(), {
    ...query,
    currentStaffId: session.userId,
  });
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Text as="h1" variant="heading-lg">
            Vérifications d’identité
          </Text>
          <Text variant="body-sm" color="secondary">
            Bêta privée — résultat manuel, sans stockage de document.
          </Text>
        </div>
        <Badge variant="neutral">{result.total} dossier(s)</Badge>
      </div>
      {query.ignored.length ? (
        <Alert level="warning" title="Filtres ignorés">
          {query.ignored.join(', ')}
        </Alert>
      ) : null}
      <Card padding="comfortable">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
            Statut
            <select name="status" defaultValue={query.filters.status ?? ''} className={FIELD}>
              <option value="">Tous</option>
              {IDENTITY_REVIEW_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {IDENTITY_REVIEW_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
            Affectation
            <select
              name="assignment"
              defaultValue={query.filters.assignment ?? ''}
              className={FIELD}
            >
              <option value="">Toutes</option>
              {IDENTITY_REVIEW_ASSIGNMENTS.map((assignment) => (
                <option key={assignment} value={assignment}>
                  {assignment === 'mine'
                    ? 'À moi'
                    : assignment === 'assigned'
                      ? 'Affectées'
                      : 'Non affectées'}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
            Référence
            <input
              name="q"
              defaultValue={query.filters.query ?? ''}
              placeholder="IDV- ou PERF-"
              className={FIELD}
            />
          </label>
          <button type="submit" className={`${FIELD} font-semibold`}>
            Filtrer
          </button>
        </form>
      </Card>
      {result.items.length === 0 ? (
        <EmptyState
          title="Aucune vérification en attente"
          description="Aucun dossier d’identité ne correspond à ces filtres."
        />
      ) : (
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Référence</DataTableHeaderCell>
              <DataTableHeaderCell>Trader</DataTableHeaderCell>
              <DataTableHeaderCell>Compte</DataTableHeaderCell>
              <DataTableHeaderCell>Statut</DataTableHeaderCell>
              <DataTableHeaderCell>Demandée</DataTableHeaderCell>
              <DataTableHeaderCell>Ancienneté</DataTableHeaderCell>
              <DataTableHeaderCell>Dernière activité</DataTableHeaderCell>
              <DataTableHeaderCell>Opérateur</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {result.items.map((item) => (
              <DataTableRow key={item.publicId}>
                <DataTableCell>
                  <Link
                    href={item.href}
                    className="wariba-data font-semibold underline-offset-2 hover:underline"
                  >
                    {item.publicId}
                  </Link>
                </DataTableCell>
                <DataTableCell>{item.traderMasked}</DataTableCell>
                <DataTableCell>{item.accountPublicId}</DataTableCell>
                <DataTableCell>{item.statusLabel}</DataTableCell>
                <DataTableCell>
                  <span className="wariba-data">{item.requestedAtLabel}</span>
                </DataTableCell>
                <DataTableCell>{item.ageLabel}</DataTableCell>
                <DataTableCell>
                  <span className="wariba-data">{item.lastActivityLabel}</span>
                </DataTableCell>
                <DataTableCell>{item.assignedLabel}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}
