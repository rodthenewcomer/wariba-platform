import { Alert, Badge, Card, Text } from '@wariba/ui';
import {
  buildMarketOpsView,
  loadMarketOperationsState,
  type Observed,
  type OperationalAlertView,
} from '@wariba/application';
import { requireControlArea } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';
import { probeRealtimeHealth } from '../../../../lib/realtime-health';

// requireControlArea() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

const DATE_TIME = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'UTC',
});

/**
 * Renders a value, or the reason there isn't one.
 *
 * The whole point of this component: an unavailable datum reads as
 * "inconnu" with its cause, never as a default that an operator would
 * mistake for a healthy measurement.
 */
function ObservedValue<T>({
  observation,
  render,
}: {
  observation: Observed<T>;
  render: (value: T) => string;
}) {
  if (!observation.available) {
    return (
      <span className="text-[color:var(--wariba-text-secondary)]" title={observation.reason}>
        inconnu
      </span>
    );
  }
  return <span className="wariba-data">{render(observation.value)}</span>;
}

function Field<T>({
  label,
  observation,
  render,
  hint,
}: {
  label: string;
  observation: Observed<T>;
  render: (value: T) => string;
  hint?: string;
}) {
  return (
    <div>
      <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
        {label}
      </dt>
      <dd>
        <ObservedValue observation={observation} render={render} />
      </dd>
      {hint ? (
        <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function PlainField({ label, value, hint }: { label: string; value: string; hint?: string }) {
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

function AlertList({ alerts }: { alerts: readonly OperationalAlertView[] }) {
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {alerts.map((alert) => (
        <li
          key={`${alert.incidentCode}-${alert.openedAt.toISOString()}`}
          className="flex flex-wrap items-baseline gap-2 text-[length:var(--wariba-font-size-body-sm)]"
        >
          <Badge variant={alert.severity === 'critical' ? 'danger' : 'warning'}>
            {alert.incidentCode}
          </Badge>
          <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
            {DATE_TIME.format(alert.openedAt)}
          </span>
          {alert.symbols.length > 0 ? (
            <span className="wariba-data">{alert.symbols.join(', ')}</span>
          ) : null}
          {alert.detail ? (
            <span className="text-[color:var(--wariba-text-secondary)]">{alert.detail}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Market Operations — read-only operational truth, from the sources that
 * actually hold each fact.
 *
 * Leadership and the feed/HA alerts are persisted, so they are always
 * readable. Process, standby and tick state exist only inside the realtime
 * process, so they come from its own /health report — probed server-side,
 * never from the browser, and never carrying a credential. When that probe
 * fails, those fields say so rather than defaulting to healthy.
 *
 * No controls: leadership is arbitrated by PostgreSQL and a lease, so a
 * promote button here would be a second unfenced writer — exactly what the
 * fencing epoch exists to prevent.
 */
export default async function ControlMarketOperationsPage() {
  await requireControlArea('market-operations');
  const [state, health] = await Promise.all([
    loadMarketOperationsState(getDb()),
    probeRealtimeHealth(),
  ]);
  const view = buildMarketOpsView({ state, health });
  const { leadership, ha, feed, process } = view;

  const leaseSeconds = Math.round(
    (leadership.leaseExpiresAt.getTime() - state.leadership.databaseNow.getTime()) / 1000,
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

      {!process.reachable ? (
        <Alert level="warning" title="Service realtime injoignable">
          L’état persisté ci-dessous (leadership, alertes) reste exact. L’état vivant — santé du
          processus, standby prêt, compteurs de ticks — n’est pas persisté : il est affiché comme
          inconnu, et non comme sain.
        </Alert>
      ) : null}

      <Card>
        <Text as="h2" variant="heading-sm">
          Leadership realtime
        </Text>
        <Text variant="body-sm" color="secondary">
          Source : `app.realtime_leadership` (persisté).
        </Text>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PlainField label="Instance leader" value={leadership.leaderInstanceId ?? '—'} />
          <PlainField
            label="Epoch de fencing"
            value={leadership.fencingEpoch}
            hint="Monotone : toute écriture d’un ancien leader échoue."
          />
          <PlainField
            label="Bail"
            value={leadership.leaseIsCurrent ? `expire dans ${leaseSeconds}s` : 'expiré'}
          />
          <PlainField label="Reprises" value={String(leadership.takeoverCount)} />
          <PlainField
            label="Acquis le"
            value={leadership.acquiredAt ? DATE_TIME.format(leadership.acquiredAt) : '—'}
          />
          <PlainField
            label="Renouvelé le"
            value={leadership.renewedAt ? DATE_TIME.format(leadership.renewedAt) : '—'}
          />
          <PlainField label="Leader précédent" value={leadership.previousLeaderInstanceId ?? '—'} />
          <Field
            label="Durée de la dernière reprise"
            observation={leadership.lastTakeoverDurationMs}
            render={(value) => (value === null ? 'aucune reprise observée' : `${value} ms`)}
            hint="Compteur local au processus leader."
          />
        </dl>
      </Card>

      <Card>
        <Text as="h2" variant="heading-sm">
          Haute disponibilité
        </Text>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field
            label="Standby prêt"
            observation={ha.standbyReady}
            render={(value) => (value ? 'oui' : 'non')}
            hint="Jamais déduit de l’absence d’alerte."
          />
          <Field
            label="Trafic de trading sûr"
            observation={ha.safeToAcceptTradingTraffic}
            render={(value) => (value ? 'oui' : 'non')}
          />
          <PlainField label="Alertes HA ouvertes" value={String(ha.openLeadershipAlerts.length)} />
        </dl>
        {ha.openLeadershipAlerts.length > 0 ? (
          <AlertList alerts={ha.openLeadershipAlerts} />
        ) : (
          <Text variant="body-sm" color="secondary">
            Aucune alerte de leadership persistée n’est ouverte. Cela ne signifie pas qu’un standby
            est prêt — voir le champ ci-dessus.
          </Text>
        )}
      </Card>

      <Card>
        <Text as="h2" variant="heading-sm">
          Feed de marché
        </Text>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Feed connecté"
            observation={feed.connected}
            render={(value) => (value ? 'oui' : 'non')}
          />
          <Field
            label="Adaptateur joignable"
            observation={feed.marketReachable}
            render={(value) => (value ? 'oui' : 'non')}
          />
          <PlainField
            label="Symboles périmés"
            value={feed.staleSymbols.length > 0 ? feed.staleSymbols.join(', ') : 'aucun signalé'}
            hint="Source : évidence d’alerte persistée."
          />
          <PlainField
            label="Symboles en panne"
            value={feed.outageSymbols.length > 0 ? feed.outageSymbols.join(', ') : 'aucun signalé'}
          />
          <Field
            label="Âge du dernier tick valide"
            observation={feed.lastValidTickAge}
            render={(value) => `${value} ms`}
            hint="Non persisté et non exposé — décision d’observabilité ouverte."
          />
          <Field
            label="Ticks acceptés"
            observation={feed.acceptedTicks}
            render={(value) => String(value)}
          />
          <Field
            label="Ticks rejetés"
            observation={feed.rejectedTicks}
            render={(value) => String(value)}
          />
          <Field
            label="Détail des rejets"
            observation={feed.rejectedBreakdown}
            render={(value) =>
              `doublon ${value.duplicate} · désordre ${value.outOfOrder} · marché fermé ${value.notOpen}`
            }
          />
        </dl>
        {feed.openFeedAlerts.length > 0 ? <AlertList alerts={feed.openFeedAlerts} /> : null}
      </Card>

      <Card>
        <Text as="h2" variant="heading-sm">
          Processus
        </Text>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Instance"
            observation={process.instanceId}
            render={(value) => value || '—'}
          />
          <Field
            label="Processus vivant"
            observation={process.alive}
            render={(value) => (value ? 'oui' : 'non')}
          />
          <Field label="Base de données" observation={process.database} render={(value) => value} />
          <Field
            label="État global"
            observation={process.overallStatus}
            render={(value) => value}
          />
          <Field
            label="Clients connectés"
            observation={process.connectedClients}
            render={(value) => String(value)}
          />
          <Field
            label="Reconnexions"
            observation={process.reconnects}
            render={(value) => String(value)}
            hint="Compteur de reprise de session."
          />
        </dl>
      </Card>
    </div>
  );
}
