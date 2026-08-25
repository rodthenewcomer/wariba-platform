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
  buildControlPassReviewQueueView,
  parseControlPassReviewQuery,
  PASS_REVIEW_STATUSES,
  type ControlPassReviewSearchParams,
} from '@wariba/application';
import { requireControlArea } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

const FIELD =
  'rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] px-2 py-1.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]';

export default async function PassReviewsPage({
  searchParams,
}: {
  searchParams: Promise<ControlPassReviewSearchParams>;
}) {
  await requireControlArea('pass-reviews');
  const params = await searchParams;
  const query = parseControlPassReviewQuery(params);
  const result = await buildControlPassReviewQueueView(getDb(), query);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Text as="h1" variant="heading-lg">
            Revues de passage
          </Text>
          <Text variant="body-sm" color="secondary">
            Résultats du moteur pour les évaluations ayant atteint leur objectif.
          </Text>
        </div>
        <Badge variant="neutral">{result.total} dossier(s)</Badge>
      </div>

      {query.ignored.length > 0 ? (
        <Alert level="warning" title="Filtres ignorés">
          {query.ignored.join(', ')} — valeur invalide, non appliquée.
        </Alert>
      ) : null}

      <Card padding="comfortable">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
            Statut
            <select name="status" defaultValue={query.filters.status ?? ''} className={FIELD}>
              <option value="">Tous</option>
              {PASS_REVIEW_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status === 'awaiting_review'
                    ? 'À revoir'
                    : status === 'reviewed'
                      ? 'Revues effectuées'
                      : 'Doutes d’intégrité'}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
            Compte
            <input
              name="q"
              defaultValue={query.filters.query ?? ''}
              placeholder="EVAL-"
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
          title="Aucune évaluation à vérifier"
          description="Aucune évaluation ne correspond à ces filtres."
        />
      ) : (
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Compte</DataTableHeaderCell>
              <DataTableHeaderCell>Trader</DataTableHeaderCell>
              <DataTableHeaderCell>Programme</DataTableHeaderCell>
              <DataTableHeaderCell>Objectif</DataTableHeaderCell>
              <DataTableHeaderCell>Règles</DataTableHeaderCell>
              <DataTableHeaderCell>Entrée</DataTableHeaderCell>
              <DataTableHeaderCell>Ancienneté</DataTableHeaderCell>
              <DataTableHeaderCell>Traitement</DataTableHeaderCell>
              <DataTableHeaderCell>Statut</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {result.items.map((item) => (
              <DataTableRow key={item.accountPublicId}>
                <DataTableCell>
                  <Link
                    href={item.href}
                    className="wariba-data font-semibold underline-offset-2 hover:underline"
                  >
                    {item.accountPublicId}
                  </Link>
                </DataTableCell>
                <DataTableCell>{item.traderLabel}</DataTableCell>
                <DataTableCell>{item.programLabel}</DataTableCell>
                <DataTableCell>{item.targetStatusLabel}</DataTableCell>
                <DataTableCell>{item.ruleStatusLabel}</DataTableCell>
                <DataTableCell>
                  <span className="wariba-data">{item.enteredAtLabel}</span>
                </DataTableCell>
                <DataTableCell>{item.ageLabel}</DataTableCell>
                <DataTableCell>{item.assignedLabel}</DataTableCell>
                <DataTableCell>{item.statusLabel}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}
