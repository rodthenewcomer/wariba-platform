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
  StatTile,
  Text,
} from '@wariba/ui';
import { loadTreasuryCockpit, staffCan } from '@wariba/application';
import type { ReserveZone } from '@wariba/domain';
import { getDb } from '../../../../lib/db';
import { requireControlArea } from '../../../../lib/staff-auth';
import { TreasuryReserveManager } from './TreasuryReserveManager';

export const dynamic = 'force-dynamic';

const DATE_TIME = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'UTC',
});

const ZONE_LABEL: Record<ReserveZone, string> = {
  normal: 'Normale',
  prudence: 'Prudence',
  defensive: 'Défensive',
  critical: 'Critique',
};
const ZONE_VARIANT: Record<ReserveZone, 'success' | 'warning' | 'danger'> = {
  normal: 'success',
  prudence: 'warning',
  defensive: 'danger',
  critical: 'danger',
};
const ENTRY_LABEL: Record<string, string> = {
  deposit: 'Dépôt',
  withdrawal: 'Retrait',
  adjustment: 'Ajustement',
};

/**
 * The treasury cockpit.
 *
 * Three figures sit next to each other here that must never be added
 * together: the reserve is real cash, the 30-day projection is an
 * expectation, and simulated trader nominal is not WARIBA money at all. They
 * are grouped and labelled separately for that reason.
 *
 * The coverage ratio and zone come from the canonical reserve engine — the
 * same evaluation that gates commercial behaviour — so the operator and the
 * platform can never disagree about which zone the treasury is in.
 */
export default async function ControlTreasuryPage() {
  const session = await requireControlArea('treasury');
  // Reading the cockpit never implies authority to move the reserve.
  const canModifyReserve = staffCan(session.role, 'treasury.modify');
  const cockpit = await loadTreasuryCockpit(getDb());
  const { status } = cockpit;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Text as="h1" variant="heading-lg">
            Treasury
          </Text>
          <Text variant="body-sm" color="secondary">
            Évalué le {DATE_TIME.format(cockpit.calculatedAt)} UTC par le moteur de réserve
            canonique.
          </Text>
        </div>
        <Badge variant={ZONE_VARIANT[status.zone]}>Zone {ZONE_LABEL[status.zone]}</Badge>
      </div>

      {cockpit.openReserveAlerts.length > 0 ? (
        <Alert level="danger" title="Alertes de réserve ouvertes">
          {cockpit.openReserveAlerts
            .map(
              (alert) =>
                `${alert.incidentCode} (${alert.severity}) — ouvert le ${DATE_TIME.format(alert.openedAt)}`,
            )
            .join(' · ')}
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label="Réserve disponible (cash)" value={status.availableReserve} />
        <StatTile label="Projection payouts 30 j" value={status.projectedPayoutsNext30Days} />
        <StatTile
          label="Ratio de couverture"
          // null quand aucune projection n'existe : une période sans payout
          // projeté n'est pas « infiniment couverte », le ratio n'a pas de sens.
          value={status.coverageRatio ?? 'Non calculable'}
        />
      </div>

      <Card padding="comfortable" className="flex flex-col gap-4">
        <div>
          <Text as="h2" variant="heading-sm">
            Composition de la réserve
          </Text>
          <Text variant="body-sm" color="secondary">
            Sommes issues des écritures de réserve enregistrées.
          </Text>
        </div>
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Poche</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Solde</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Dépôts</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Retraits</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Ajustements</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {cockpit.composition.map((bucket) => (
              <DataTableRow key={bucket.bucket}>
                <DataTableCell>{bucket.label}</DataTableCell>
                <DataTableCell numeric>{bucket.amount}</DataTableCell>
                <DataTableCell numeric>{bucket.deposits}</DataTableCell>
                <DataTableCell numeric>{bucket.withdrawals}</DataTableCell>
                <DataTableCell numeric>{bucket.adjustments}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        {cockpit.unrepresentedBuckets.length > 0 ? (
          <Alert level="information" title="Poches non modélisées">
            {cockpit.unrepresentedBuckets.join(' · ')} — ces catégories n’existent pas dans le
            modèle de données. Elles sont nommées ici plutôt qu’affichées à zéro, car un zéro se
            lirait comme un solde réel.
          </Alert>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card padding="comfortable" className="flex flex-col gap-4">
          <div>
            <Text as="h2" variant="heading-sm">
              Engagements
            </Text>
            <Text variant="body-sm" color="secondary">
              Une projection n’est pas de la trésorerie : elle est reportée à côté de la réserve,
              jamais soustraite.
            </Text>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatTile
              label="Payouts projetés 30 j"
              value={cockpit.liabilities.projectedPayoutsNext30Days}
            />
            <StatTile
              label="Approuvés non réglés"
              value={cockpit.liabilities.committedUnsettledPayouts}
            />
            <StatTile
              label="Demandes ouvertes"
              value={String(cockpit.liabilities.openPayoutRequestCount)}
            />
          </div>
        </Card>

        <Card padding="comfortable" className="flex flex-col gap-4">
          <div>
            <Text as="h2" variant="heading-sm">
              Hors réserve — soldes simulés
            </Text>
            <Text variant="body-sm" color="secondary">
              Nominal des comptes sandbox. Ce n’est pas de la trésorerie WARIBA et cela n’entre dans
              aucun total de réserve — affiché précisément pour qu’on puisse voir qu’il en est
              exclu.
            </Text>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatTile
              label="Nominal simulé cumulé"
              value={cockpit.nonReserve.simulatedTraderNominal}
            />
            <StatTile
              label="Comptes actifs"
              value={String(cockpit.nonReserve.simulatedAccountCount)}
            />
          </div>
        </Card>
      </div>

      <Card padding="comfortable" className="flex flex-col gap-4">
        <Text as="h2" variant="heading-sm">
          Historique des écritures
        </Text>
        {cockpit.history.length === 0 ? (
          <EmptyState
            title="Aucune écriture de réserve"
            description="Aucun mouvement n’a encore été enregistré."
          />
        ) : (
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Horodatage</DataTableHeaderCell>
                <DataTableHeaderCell>Type</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Montant</DataTableHeaderCell>
                <DataTableHeaderCell>Motif</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {cockpit.history.map((entry) => (
                <DataTableRow key={entry.id}>
                  <DataTableCell>{DATE_TIME.format(entry.occurredAt)}</DataTableCell>
                  <DataTableCell>{ENTRY_LABEL[entry.entryType] ?? entry.entryType}</DataTableCell>
                  <DataTableCell numeric>
                    {entry.amount} {entry.currency}
                  </DataTableCell>
                  <DataTableCell>{entry.reason}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </Card>

      {canModifyReserve ? (
        <Card padding="comfortable" className="flex flex-col gap-4">
          <div>
            <Text as="h2" variant="heading-sm">
              Écriture de réserve
            </Text>
            <Text variant="body-sm" color="secondary">
              Additive et immuable : une écriture en compense une autre, aucune n’est modifiée.
            </Text>
          </div>
          {/* The Server Action re-checks treasury.modify itself — hiding the
              form is usability, not the boundary. */}
          <TreasuryReserveManager />
        </Card>
      ) : null}
    </div>
  );
}
