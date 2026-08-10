import { Badge, Card, EmptyState, Text } from '@wariba/ui';
import { loadMarketOperationsState } from '@wariba/application';
import { requireControlArea } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';

// requireControlArea() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

const DATE_TIME = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'UTC',
});

const FEED_ALERTS = new Set(['MARKET_FEED_STALE', 'MARKET_FEED_OUTAGE']);
const LEADERSHIP_ALERTS = new Set(['LEADER_LOST', 'LEADER_TAKEOVER_SLOW', 'NO_STANDBY_READY']);

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
        {label}
      </dt>
      <dd className="wariba-data">{value}</dd>
      {hint ? (
        <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function summarise(evidence: unknown): string {
  if (evidence === null || evidence === undefined) return '—';
  const text = typeof evidence === 'string' ? evidence : JSON.stringify(evidence);
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}

/**
 * Market Operations — read-only operational truth.
 *
 * Everything here comes from durable state the platform already writes: the
 * leadership lease row, and the platform-scoped alerts the leader itself
 * persists when the feed goes stale or a takeover runs long. Nothing reaches
 * into a market-data provider and no credential is read, let alone rendered
 * — the realtime service owns its secrets and Control never sees them.
 *
 * There are no controls on this page. Leadership is arbitrated by PostgreSQL
 * and a lease; a button that "promoted" an instance from here would be a
 * second, unfenced writer, which is precisely what the fencing epoch exists
 * to make impossible.
 */
export default async function ControlMarketOperationsPage() {
  await requireControlArea('market-operations');
  const state = await loadMarketOperationsState(getDb());
  const { leadership, openAlerts } = state;

  const feedAlerts = openAlerts.filter((alert) => FEED_ALERTS.has(alert.incidentCode));
  const leadershipAlerts = openAlerts.filter((alert) => LEADERSHIP_ALERTS.has(alert.incidentCode));
  const leaseAgeSeconds = Math.round(
    (leadership.leaseExpiresAt.getTime() - leadership.databaseNow.getTime()) / 1000,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text as="h1" variant="heading-lg">
          Market Ops
        </Text>
        <Badge variant={leadership.leaseIsCurrent ? 'success' : 'danger'}>
          {leadership.leaseIsCurrent ? 'Leader actif' : 'Aucun leader'}
        </Badge>
      </div>

      <Text variant="body-sm" color="secondary">
        Lecture seule. Le leadership est arbitré par PostgreSQL et un bail avec epoch de fencing —
        aucune promotion manuelle n’est exposée ici, car un second écrivain non clôturé est
        exactement ce que le fencing empêche.
      </Text>

      <Card>
        <Text as="h2" variant="heading-sm">
          Leadership realtime
        </Text>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Service" value={leadership.serviceName} />
          <Field label="Instance leader" value={leadership.leaderInstanceId ?? '—'} />
          <Field
            label="Epoch de fencing"
            value={leadership.fencingEpoch}
            hint="Monotone : toute écriture d’un ancien leader échoue."
          />
          <Field
            label="Bail"
            value={leadership.leaseIsCurrent ? `expire dans ${leaseAgeSeconds}s` : 'expiré'}
          />
          <Field
            label="Acquis le"
            value={leadership.acquiredAt ? DATE_TIME.format(leadership.acquiredAt) : '—'}
          />
          <Field
            label="Renouvelé le"
            value={leadership.renewedAt ? DATE_TIME.format(leadership.renewedAt) : '—'}
          />
          <Field
            label="Leader précédent"
            value={leadership.previousLeaderInstanceId ?? '—'}
            hint="Renseigné après une reprise."
          />
          <Field label="Reprises" value={String(leadership.takeoverCount)} />
        </dl>
      </Card>

      <Card>
        <Text as="h2" variant="heading-sm">
          État du feed
        </Text>
        {feedAlerts.length === 0 ? (
          <div className="mt-3">
            <Text variant="body-sm" color="secondary">
              Aucune alerte de feed ouverte. Un feed périmé ou en panne ouvre un incident plateforme
              qui apparaîtrait ici.
            </Text>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {feedAlerts.map((alert) => (
              <li
                key={alert.incidentCode}
                className="flex flex-wrap items-baseline gap-2 text-[length:var(--wariba-font-size-body-sm)]"
              >
                <Badge variant={alert.severity === 'critical' ? 'danger' : 'warning'}>
                  {alert.incidentCode}
                </Badge>
                <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
                  {DATE_TIME.format(alert.openedAt)}
                </span>
                <span className="text-[color:var(--wariba-text-secondary)]">
                  {summarise(alert.evidence)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <Text as="h2" variant="heading-sm">
          Alertes haute disponibilité
        </Text>
        {leadershipAlerts.length === 0 ? (
          <div className="mt-3">
            <Text variant="body-sm" color="secondary">
              Aucune alerte de leadership ouverte.
            </Text>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {leadershipAlerts.map((alert) => (
              <li
                key={alert.incidentCode}
                className="flex flex-wrap items-baseline gap-2 text-[length:var(--wariba-font-size-body-sm)]"
              >
                <Badge variant={alert.severity === 'critical' ? 'danger' : 'warning'}>
                  {alert.incidentCode}
                </Badge>
                <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
                  {DATE_TIME.format(alert.openedAt)}
                </span>
                <span className="text-[color:var(--wariba-text-secondary)]">
                  {summarise(alert.evidence)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {openAlerts.length === 0 ? (
        <EmptyState
          title="Plateforme nominale"
          description="Aucune alerte opérationnelle ouverte au niveau plateforme."
        />
      ) : null}
    </div>
  );
}
