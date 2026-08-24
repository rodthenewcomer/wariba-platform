import Link from 'next/link';
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
  buildControlSupportQueueView,
  controlSupportPageHref,
  parseControlSupportQuery,
  CONTROL_SUPPORT_AGES,
  CONTROL_SUPPORT_ASSIGNMENTS,
  CONTROL_SUPPORT_CATEGORIES,
  CONTROL_SUPPORT_FILTER_LABELS,
  CONTROL_SUPPORT_STATUSES,
  SUPPORT_CATEGORY_SHORT,
  SUPPORT_STATUS_LABELS,
  type ControlSupportSearchParams,
  type SupportTicketCategory,
  type SupportTicketStatus,
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
 * The support queue.
 *
 * ## Oldest first
 *
 * The default order is by age ascending, because a queue sorted newest-first
 * puts the person who has waited longest on the last page. Age is a column
 * rather than a timestamp for the same reason — "il y a 3 jours" is the triage
 * signal; the exact instant belongs on the detail.
 *
 * ## What the list does not show
 *
 * No subject line, no message body, no full address. The trader is masked
 * (`maskEmail`), and the request's content lives one click away on a page an
 * operator opened deliberately. A queue spanning every trader on the platform
 * is the single best place to harvest from, so it carries identity enough to
 * recognise a row and nothing more.
 */
export default async function ControlSupportQueuePage({
  searchParams,
}: {
  searchParams: Promise<ControlSupportSearchParams>;
}) {
  await requireControlArea('support');

  const params = await searchParams;
  const query = parseControlSupportQuery(params);
  const result = await buildControlSupportQueueView(getDb(), {
    filters: query.filters,
    page: query.page,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text as="h1" variant="heading-lg">
          Support queue
        </Text>
        <Badge variant="neutral">{result.total} demande(s)</Badge>
      </div>

      {query.ignored.length > 0 ? (
        <Alert level="warning" title="Filtres ignorés">
          {query.ignored
            .map((key) => `${CONTROL_SUPPORT_FILTER_LABELS[key] ?? key} : « ${raw(params[key])} »`)
            .join(' · ')}{' '}
          — valeur invalide, non appliquée. Les résultats ci-dessous ne sont pas filtrés par cette
          valeur.
        </Alert>
      ) : null}

      <Card padding="comfortable">
        {/* Rendered from the parsed query, never the raw URL. */}
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className={LABEL_CLASS}>
            Statut
            <select name="status" defaultValue={query.filters.status ?? ''} className={FIELD_CLASS}>
              <option value="">Tous</option>
              {CONTROL_SUPPORT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {SUPPORT_STATUS_LABELS[status as SupportTicketStatus]}
                </option>
              ))}
            </select>
          </label>
          <label className={LABEL_CLASS}>
            Catégorie
            <select
              name="category"
              defaultValue={query.filters.category ?? ''}
              className={FIELD_CLASS}
            >
              <option value="">Toutes</option>
              {CONTROL_SUPPORT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {SUPPORT_CATEGORY_SHORT[category as SupportTicketCategory]}
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
                  {value === 'assigned' ? 'Affectées' : 'Non affectées'}
                </option>
              ))}
            </select>
          </label>
          <label className={LABEL_CLASS}>
            Ancienneté
            <select name="age" defaultValue={raw(params.age)} className={FIELD_CLASS}>
              <option value="">Toutes</option>
              {Object.keys(CONTROL_SUPPORT_AGES).map((value) => (
                <option key={value} value={value}>
                  Plus de {value}
                </option>
              ))}
            </select>
          </label>
          <label className={LABEL_CLASS}>
            Référence
            <input
              name="q"
              defaultValue={query.filters.query ?? ''}
              placeholder="WRB- ou EVAL-"
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
          title="Aucune demande"
          description="Aucune demande de support ne correspond à ces filtres."
        />
      ) : (
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Référence</DataTableHeaderCell>
              <DataTableHeaderCell>Trader</DataTableHeaderCell>
              <DataTableHeaderCell>Catégorie</DataTableHeaderCell>
              <DataTableHeaderCell>Compte</DataTableHeaderCell>
              <DataTableHeaderCell>Statut</DataTableHeaderCell>
              <DataTableHeaderCell>Ancienneté</DataTableHeaderCell>
              <DataTableHeaderCell>Opérateur</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {result.items.map((item) => (
              <DataTableRow key={item.publicId}>
                <DataTableCell>
                  <Link
                    href={item.href}
                    data-testid="control-support-row"
                    className="wariba-data font-semibold text-[color:var(--wariba-text-primary)] underline-offset-2 hover:underline"
                  >
                    {item.publicId}
                  </Link>
                  {item.hasContestation ? (
                    <span className="ml-2">
                      <Badge variant="warning">Contestation</Badge>
                    </span>
                  ) : null}
                </DataTableCell>
                <DataTableCell>{item.traderMasked}</DataTableCell>
                <DataTableCell>{item.categoryLabel}</DataTableCell>
                <DataTableCell>{item.accountPublicId ?? '—'}</DataTableCell>
                <DataTableCell>{item.statusLabel}</DataTableCell>
                <DataTableCell>{item.ageLabel}</DataTableCell>
                <DataTableCell>{item.assignedLabel}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      {result.totalPages > 1 ? (
        <nav className="flex items-center gap-3" aria-label="Pagination">
          {result.page > 1 ? (
            <Link href={controlSupportPageHref(params, result.page - 1)}>Précédent</Link>
          ) : null}
          <Text variant="body-sm" color="secondary">
            Page {result.page} / {result.totalPages}
          </Text>
          {result.page < result.totalPages ? (
            <Link href={controlSupportPageHref(params, result.page + 1)}>Suivant</Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
