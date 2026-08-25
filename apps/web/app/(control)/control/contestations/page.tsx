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
  buildControlContestationQueueView,
  controlSupportPageHref,
  parseControlContestationQuery,
  CONTESTATION_REASON_LABELS,
  CONTESTATION_STATUS_LABELS,
  CONTESTATION_TARGET_LABELS,
  CONTROL_CONTESTATION_FILTER_LABELS,
  CONTROL_CONTESTATION_REASONS,
  CONTROL_CONTESTATION_STATUSES,
  CONTROL_CONTESTATION_TARGETS,
  CONTROL_SUPPORT_ASSIGNMENTS,
  type ContestationReasonCategory,
  type ContestationStatus,
  type ContestationTargetType,
  type ControlSupportSearchParams,
} from '@wariba/application';
import { requireControlArea } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

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
 * The contestation queue — its own surface, not a filter on Support.
 *
 * A dispute over a recorded breach is triaged by different people, on a
 * different clock, against evidence rather than against a question. Folding it
 * into the support queue would have buried it among questions and would have
 * put a risk reviewer's work behind a support operator's permission.
 *
 * The rule column is what an operator triages on: `RISK_MAXIMUM_LOSS_BREACH`
 * and `RISK_DAILY_LOSS_LOCK` are different conversations. It is read live from
 * `app.risk_violations`, not from anything stored on the contestation.
 */
export default async function ControlContestationsPage({
  searchParams,
}: {
  searchParams: Promise<ControlSupportSearchParams>;
}) {
  const session = await requireControlArea('contestations');

  const params = await searchParams;
  const query = parseControlContestationQuery(params);
  const result = await buildControlContestationQueueView(getDb(), {
    filters: query.filters,
    page: query.page,
    currentStaffId: session.userId,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text as="h1" variant="heading-lg">
          File de contestations
        </Text>
        <Badge variant="neutral">{result.total} contestation(s)</Badge>
      </div>

      {query.ignored.length > 0 ? (
        <Alert level="warning" title="Filtres ignorés">
          {query.ignored
            .map(
              (key) =>
                `${CONTROL_CONTESTATION_FILTER_LABELS[key] ?? key} : « ${raw(params[key])} »`,
            )
            .join(' · ')}{' '}
          — valeur invalide, non appliquée.
        </Alert>
      ) : null}

      <Card padding="comfortable">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className={LABEL_CLASS}>
            Statut
            <select name="status" defaultValue={query.filters.status ?? ''} className={FIELD_CLASS}>
              <option value="">Tous</option>
              {CONTROL_CONTESTATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {CONTESTATION_STATUS_LABELS[status as ContestationStatus]}
                </option>
              ))}
            </select>
          </label>
          <label className={LABEL_CLASS}>
            Objet
            <select
              name="target"
              defaultValue={query.filters.targetType ?? ''}
              className={FIELD_CLASS}
            >
              <option value="">Tous</option>
              {CONTROL_CONTESTATION_TARGETS.map((target) => (
                <option key={target} value={target}>
                  {CONTESTATION_TARGET_LABELS[target as ContestationTargetType]}
                </option>
              ))}
            </select>
          </label>
          <label className={LABEL_CLASS}>
            Motif
            <select
              name="reason"
              defaultValue={query.filters.reasonCategory ?? ''}
              className={FIELD_CLASS}
            >
              <option value="">Tous</option>
              {CONTROL_CONTESTATION_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {CONTESTATION_REASON_LABELS[reason as ContestationReasonCategory]}
                </option>
              ))}
            </select>
          </label>
          <label className={LABEL_CLASS}>
            Affectation
            <select
              name="assignment"
              defaultValue={query.filters.assignment ?? ''}
              className={FIELD_CLASS}
            >
              <option value="">Toutes</option>
              {CONTROL_SUPPORT_ASSIGNMENTS.map((value) => (
                <option key={value} value={value}>
                  {value === 'mine'
                    ? 'À moi'
                    : value === 'assigned'
                      ? 'Affectées'
                      : 'Non affectées'}
                </option>
              ))}
            </select>
          </label>
          <label className={LABEL_CLASS}>
            Référence
            <input
              name="q"
              defaultValue={query.filters.query ?? ''}
              placeholder="CTS-, WRB- ou EVAL-"
              className={FIELD_CLASS}
            />
          </label>
          <button
            type="submit"
            className="rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-default)] px-3 py-1.5 text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-text-primary)]"
          >
            Filtrer
          </button>
        </form>
      </Card>

      {result.items.length === 0 ? (
        <EmptyState
          title="Aucune contestation"
          description="Aucune contestation ne correspond à ces filtres."
        />
      ) : (
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Référence</DataTableHeaderCell>
              <DataTableHeaderCell>Trader</DataTableHeaderCell>
              <DataTableHeaderCell>Compte</DataTableHeaderCell>
              <DataTableHeaderCell>Objet</DataTableHeaderCell>
              <DataTableHeaderCell>Règle</DataTableHeaderCell>
              <DataTableHeaderCell>Motif</DataTableHeaderCell>
              <DataTableHeaderCell>Statut</DataTableHeaderCell>
              <DataTableHeaderCell>Ancienneté</DataTableHeaderCell>
              <DataTableHeaderCell>Dernière activité</DataTableHeaderCell>
              <DataTableHeaderCell>Examinateur</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {result.items.map((item) => (
              <DataTableRow key={item.publicId}>
                <DataTableCell>
                  <Link
                    href={item.href}
                    data-testid="control-contestation-row"
                    className="wariba-data font-semibold text-[color:var(--wariba-text-primary)] underline-offset-2 hover:underline"
                  >
                    {item.publicId}
                  </Link>
                </DataTableCell>
                <DataTableCell>{item.traderMasked}</DataTableCell>
                <DataTableCell>{item.accountPublicId ?? '—'}</DataTableCell>
                <DataTableCell>{item.targetLabel}</DataTableCell>
                <DataTableCell>{item.ruleLabel}</DataTableCell>
                <DataTableCell>{item.reasonLabel}</DataTableCell>
                <DataTableCell>{item.statusLabel}</DataTableCell>
                <DataTableCell>{item.ageLabel}</DataTableCell>
                <DataTableCell>
                  <span className="wariba-data">{item.lastActivityLabel}</span>
                </DataTableCell>
                <DataTableCell>{item.reviewerLabel}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      {result.totalPages > 1 ? (
        <nav className="flex items-center gap-3" aria-label="Pagination">
          {result.page > 1 ? (
            <Link href={controlSupportPageHref(params, result.page - 1, '/control/contestations')}>
              Précédent
            </Link>
          ) : null}
          <Text variant="body-sm" color="secondary">
            Page {result.page} / {result.totalPages}
          </Text>
          {result.page < result.totalPages ? (
            <Link href={controlSupportPageHref(params, result.page + 1, '/control/contestations')}>
              Suivant
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
