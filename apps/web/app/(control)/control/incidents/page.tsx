import { Badge, Card, EmptyState, Text } from '@wariba/ui';
import {
  loadIncidentCodes,
  searchControlIncidents,
  type ControlIncidentFilters,
  type ControlIncidentRow,
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

const SEVERITY_VARIANT: Record<string, 'warning' | 'danger' | 'neutral'> = {
  warning: 'warning',
  critical: 'danger',
};

const FIELD_CLASS =
  'rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] ' +
  'bg-[color:var(--wariba-background-surface)] px-2 py-1.5 ' +
  'text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]';
const LABEL_CLASS =
  'flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] ' +
  'text-[color:var(--wariba-text-secondary)]';

function single(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? '';
}

function summarise(evidence: unknown): string {
  if (evidence === null || evidence === undefined) return '—';
  const text = typeof evidence === 'string' ? evidence : JSON.stringify(evidence);
  return text.length > 140 ? `${text.slice(0, 137)}…` : text;
}

function IncidentRow({ incident }: { incident: ControlIncidentRow }) {
  return (
    <tr className="border-t border-[color:var(--wariba-border-subtle)] align-top">
      <td className="whitespace-nowrap p-2">
        <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
          {DATE_TIME.format(incident.openedAt)}
        </span>
      </td>
      <td className="p-2">{incident.incidentCode}</td>
      <td className="p-2">
        <Badge variant={SEVERITY_VARIANT[incident.severity] ?? 'neutral'}>
          {incident.severity}
        </Badge>
      </td>
      <td className="p-2">
        <Badge variant={incident.status === 'open' ? 'warning' : 'success'}>
          {incident.status}
        </Badge>
      </td>
      <td className="p-2">
        {incident.accountId ? (
          // Routed to the risk investigation surface, which is where the
          // account-scoped fix lives — not to the generic Accounts explorer.
          <Link
            href={`/control/integrity/${incident.accountId}`}
            className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-link)]"
          >
            {incident.accountPublicId ?? incident.accountId}
          </Link>
        ) : (
          <span className="text-[color:var(--wariba-text-secondary)]">plateforme</span>
        )}
      </td>
      <td className="p-2 text-[color:var(--wariba-text-secondary)]">
        {summarise(incident.evidence)}
      </td>
      <td className="p-2">
        {incident.status === 'resolved' ? (
          <div className="flex flex-col gap-0.5">
            <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
              {incident.resolvedAt ? DATE_TIME.format(incident.resolvedAt) : '—'}
            </span>
            <span className="text-[color:var(--wariba-text-secondary)]">
              {incident.resolvedBy ? 'opérateur' : 'plateforme'} ·{' '}
              {incident.resolutionReason ?? '—'}
            </span>
          </div>
        ) : (
          <span className="text-[color:var(--wariba-text-secondary)]">—</span>
        )}
      </td>
    </tr>
  );
}

export default async function ControlIncidentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireControlArea('incidents');
  const params = await searchParams;

  const status = single(params.status);
  const severity = single(params.severity);
  const scope = single(params.scope);
  const code = single(params.code);
  const rawPage = single(params.page);

  // Unknown values are dropped rather than forwarded to a checked column.
  const filters: ControlIncidentFilters = {};
  if (status === 'open' || status === 'resolved') filters.status = status;
  if (severity === 'warning' || severity === 'critical') filters.severity = severity;
  if (scope === 'account' || scope === 'platform') filters.scope = scope;
  if (code) filters.incidentCode = code;
  const page = /^\d+$/.test(rawPage) ? Math.max(1, Number.parseInt(rawPage, 10)) : 1;

  const db = getDb();
  const [result, codes] = await Promise.all([
    searchControlIncidents(db, { filters, page }),
    loadIncidentCodes(db),
  ]);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  const pageHref = (target: number): string => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === 'page') continue;
      const one = single(value);
      if (one) search.set(key, one);
    }
    if (target > 1) search.set('page', String(target));
    const suffix = search.toString();
    return suffix ? `/control/incidents?${suffix}` : '/control/incidents';
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text as="h1" variant="heading-lg">
          Incidents
        </Text>
        <div className="flex gap-2">
          <Badge variant={result.criticalOpenCount > 0 ? 'danger' : 'neutral'}>
            {result.criticalOpenCount} critique(s) ouvert(s)
          </Badge>
          <Badge variant={result.openCount > 0 ? 'warning' : 'success'}>
            {result.openCount} ouvert(s)
          </Badge>
        </div>
      </div>

      <Text variant="body-sm" color="secondary">
        Console de lecture. La résolution appartient au domaine qui possède la règle : la levée d’un
        integrity hold exige une réconciliation exacte, et une alerte plateforme se referme d’
        elle-même dès que sa condition disparaît. Aucun bouton de résolution manuelle n’existe ici,
        pour qu’aucun incident ne puisse être clos en contournant ces règles.
      </Text>

      <Card>
        <form method="get" action="/control/incidents" className="flex flex-wrap items-end gap-3">
          <label className={LABEL_CLASS}>
            Statut
            <select name="status" defaultValue={filters.status ?? ''} className={FIELD_CLASS}>
              <option value="">Tous</option>
              <option value="open">Ouvert</option>
              <option value="resolved">Résolu</option>
            </select>
          </label>
          <label className={LABEL_CLASS}>
            Sévérité
            <select name="severity" defaultValue={filters.severity ?? ''} className={FIELD_CLASS}>
              <option value="">Toutes</option>
              <option value="warning">warning</option>
              <option value="critical">critical</option>
            </select>
          </label>
          <label className={LABEL_CLASS}>
            Portée
            <select name="scope" defaultValue={filters.scope ?? ''} className={FIELD_CLASS}>
              <option value="">Toutes</option>
              <option value="account">Compte</option>
              <option value="platform">Plateforme</option>
            </select>
          </label>
          <label className={LABEL_CLASS}>
            Code
            <select name="code" defaultValue={filters.incidentCode ?? ''} className={FIELD_CLASS}>
              <option value="">Tous</option>
              {codes.map((incidentCode) => (
                <option key={incidentCode} value={incidentCode}>
                  {incidentCode}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-background-selected)] px-3 py-1.5 text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-text-primary)]"
          >
            Filtrer
          </button>
          <a
            href="/control/incidents"
            className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
          >
            Réinitialiser
          </a>
        </form>
      </Card>

      {result.incidents.length === 0 ? (
        <EmptyState
          title="Aucun incident"
          description="Aucun incident ne correspond à ces filtres."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] text-left text-[length:var(--wariba-font-size-body-sm)]">
              <caption className="sr-only">Incidents opérationnels</caption>
              <thead className="text-[color:var(--wariba-text-secondary)]">
                <tr>
                  <th scope="col" className="p-2 font-semibold">
                    Ouvert le
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Code
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Sévérité
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Statut
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Portée
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Évidence
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Résolution
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.incidents.map((incident) => (
                  <IncidentRow key={incident.id} incident={incident} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Pagination des incidents" className="flex flex-wrap items-center gap-3">
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
