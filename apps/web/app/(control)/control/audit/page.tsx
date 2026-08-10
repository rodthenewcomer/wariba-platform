import { Badge, Card, EmptyState, Text } from '@wariba/ui';
import {
  auditPageHref,
  auditTotalPages,
  loadAuditFilterOptions,
  parseAuditQuery,
  searchAuditEvents,
  type AuditEventRecord,
  type AuditSearchParams,
} from '@wariba/application';
import { requireControlArea } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';
import { AuditFilters } from './AuditFilters';

// requireControlArea() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'UTC',
});

/**
 * Prompt 09 — the immutable audit explorer.
 *
 * Read-only by construction, not by convention: the page has no Server
 * Action, and the module it queries through exposes no write at all. Audit
 * evidence is the record of what staff did; Control can search it and can
 * never edit, delete or backfill it.
 */
function summarise(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

function AuditRow({ event }: { event: AuditEventRecord }) {
  return (
    <tr className="border-t border-[color:var(--wariba-border-subtle)] align-top">
      <td className="whitespace-nowrap p-2">
        <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
          {DATE_FORMAT.format(event.occurredAt)}
        </span>
      </td>
      <td className="p-2">
        <div className="flex flex-col gap-0.5">
          <span>{event.actorId ?? '—'}</span>
          <span className="text-[color:var(--wariba-text-secondary)]">
            {event.role ?? event.actorType}
          </span>
        </div>
      </td>
      <td className="p-2">
        <div className="flex flex-col gap-0.5">
          <span>{event.action}</span>
          {event.permission ? (
            <span className="text-[color:var(--wariba-text-secondary)]">{event.permission}</span>
          ) : null}
        </div>
      </td>
      <td className="p-2">
        <div className="flex flex-col gap-0.5">
          <span>{event.targetType}</span>
          <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
            {event.targetId ?? '—'}
          </span>
        </div>
      </td>
      <td className="p-2">{event.reason ?? '—'}</td>
      <td className="p-2">
        <div className="flex flex-col gap-0.5 text-[color:var(--wariba-text-secondary)]">
          <span>avant : {summarise(event.before)}</span>
          <span>après : {summarise(event.after)}</span>
        </div>
      </td>
      <td className="p-2">
        <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
          {event.correlationId ?? '—'}
        </span>
      </td>
    </tr>
  );
}

function text(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? '';
}

export default async function ControlAuditPage({
  searchParams,
}: {
  searchParams: Promise<AuditSearchParams>;
}) {
  await requireControlArea('audit');
  const params = await searchParams;
  // Every filter is applied by the database, never in the browser: the page
  // only ever holds the rows an operator is authorized to see and actually
  // asked for.
  const query = parseAuditQuery(params);
  const db = getDb();
  const [{ events, total, page, pageSize }, options] = await Promise.all([
    searchAuditEvents(db, query),
    loadAuditFilterOptions(db),
  ]);
  const totalPages = auditTotalPages(total, pageSize);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text as="h1" variant="heading-lg">
          Audit
        </Text>
        <Badge variant="neutral">{total} événement(s)</Badge>
      </div>
      <Text variant="body-sm" color="secondary">
        Journal immuable des actions sensibles. Lecture seule : aucune modification, suppression ou
        reprise n’est possible depuis Control.
      </Text>

      <Card>
        <AuditFilters
          options={options}
          values={{
            actor: text(params.actor),
            role: text(params.role),
            activity: text(params.activity),
            targetType: text(params.targetType),
            target: text(params.target),
            correlation: text(params.correlation),
            from: text(params.from),
            to: text(params.to),
            pageSize,
          }}
        />
      </Card>

      {events.length === 0 ? (
        <EmptyState
          title="Aucun événement d’audit"
          description="Aucun événement ne correspond à ces filtres."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] text-left text-[length:var(--wariba-font-size-body-sm)]">
              <caption className="sr-only">Événements d’audit les plus récents</caption>
              <thead className="text-[color:var(--wariba-text-secondary)]">
                <tr>
                  <th scope="col" className="p-2 font-semibold">
                    Horodatage (UTC)
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Acteur
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Action
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Cible
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Motif
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    État
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Corrélation
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <AuditRow key={event.id} event={event} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="Pagination des événements d’audit"
          className="flex flex-wrap items-center gap-3"
        >
          <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
            Page {page} sur {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <a
                href={auditPageHref(params, page - 1)}
                rel="prev"
                className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
              >
                Précédent
              </a>
            ) : null}
            {page < totalPages ? (
              <a
                href={auditPageHref(params, page + 1)}
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
