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
import {
  ACTUAL_POPULATION_SCOPE,
  buildActuarialConsoleView,
  staffRoleSatisfies,
} from '@wariba/application';
import type { VarianceCoverage } from '@wariba/domain';
import { requireControlArea } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';
import { ActuarialScenarioManager } from './ActuarialScenarioManager';
import { ActuarialVarianceButton } from './ActuarialVarianceButton';
import { ActuarialVariancePanel } from './ActuarialVariancePanel';
import { ActuarialVarianceProvider } from './ActuarialVarianceStore';

export const dynamic = 'force-dynamic';

const DATE_TIME = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'UTC',
});

const COVERAGE_LABEL: Record<VarianceCoverage, string> = {
  insufficient_data: 'Données insuffisantes',
  partial: 'Partielle',
  comparable: 'Comparable',
};
const COVERAGE_VARIANT: Record<VarianceCoverage, 'danger' | 'warning' | 'success'> = {
  insufficient_data: 'danger',
  partial: 'warning',
  comparable: 'success',
};
const METRIC_LABEL: Record<string, string> = {
  purchases: 'Achats',
  successful_evaluations: 'Évaluations réussies',
  performance_activations: 'Activations Performance',
  completed_buffers: 'Buffers complétés',
  payout_recipients_rank_1: 'Bénéficiaires P1',
  payout_recipients_rank_2: 'Bénéficiaires P2',
  payout_recipients_rank_3: 'Bénéficiaires P3',
  payout_recipients_rank_4: 'Bénéficiaires P4',
  payout_recipients_rank_5: 'Bénéficiaires P5',
  payout_cost: 'Coût de payout',
};

/**
 * The actuarial console — MODEL, ACTUAL and VARIANCE side by side.
 *
 * MODEL is simulation and says nothing about the platform. ACTUAL is
 * measured from rows the platform really wrote. VARIANCE is a stored,
 * immutable comparison of the two. Presenting them in one place is only safe
 * because each is labelled for what it is: a projected payout cost rendered
 * beside a realized one, without that distinction, is how a simulation gets
 * read as a financial position.
 *
 * Nothing here reports the model as validated. See
 * `resolveActuarialModelValidation` — coverage measures sample size, and no
 * canonical validation threshold exists to promote that into a verdict.
 */
export default async function ControlActuarialPage() {
  const session = await requireControlArea('actuarial');
  if (!staffRoleSatisfies(session.role, 'risk') && !staffRoleSatisfies(session.role, 'finance')) {
    return (
      <Text variant="body-md" color="danger">
        Risk or Finance authorization is required.
      </Text>
    );
  }
  const view = await buildActuarialConsoleView(getDb());
  const latestVariance = view.varianceRuns[0];

  return (
    <ActuarialVarianceProvider
      initialVariance={
        latestVariance
          ? {
              id: latestVariance.id,
              scenarioRunId: latestVariance.scenarioRunId,
              scenarioName: latestVariance.scenarioName,
              scenarioVersion: latestVariance.scenarioVersion,
              coverage: latestVariance.coverage,
              modelCohortSize: latestVariance.modelCohortSize,
              actualSampleSize: latestVariance.actualSampleSize,
              executedAt: latestVariance.executedAt.toISOString(),
              metrics: latestVariance.metrics.map((metric) => ({
                metric: metric.metric,
                modelValue: metric.modelValue,
                actualValue: metric.actualValue,
                variance: metric.variance,
                relativeVariance: metric.relativeVariance,
              })),
            }
          : null
      }
    >
      <div className="flex flex-col gap-6">
        <div>
          <Text as="h1" variant="heading-lg">
            Actuarial
          </Text>
          <Text variant="body-sm" color="secondary">
            MODÈLE (simulation) · RÉEL (mesuré) · ÉCART (comparaison enregistrée). Les trois restent
            séparés — aucun n’est déduit d’un autre.
          </Text>
        </div>

        <Alert
          level={view.validation.latestCoverage === null ? 'warning' : 'information'}
          title="Modèle NON VALIDÉ"
        >
          {view.validation.reason}
          {view.validation.latestSampleSize === null
            ? null
            : ` Échantillon réel : ${view.validation.latestSampleSize} (seuil de comparabilité : ${view.validation.minimumComparableSample}).`}
        </Alert>

        {/* ACTUARIAL-VARIANCE-002. Two columns side by side imply the same
          population; here they do not, and the only honest fix is to say so
          rather than let the layout make the claim. */}
        <Alert level="information" title="Portée de la comparaison">
          {ACTUAL_POPULATION_SCOPE}
        </Alert>

        <Card padding="comfortable" className="flex flex-col gap-4">
          <div>
            <Text as="h2" variant="heading-sm">
              RÉEL — mesuré depuis les opérations persistées
            </Text>
            <Text variant="body-sm" color="secondary">
              Comptages et sommes sur les lignes réellement écrites. Aucune imputation, aucune
              extrapolation. Mesuré le {DATE_TIME.format(view.measuredAt)} UTC.
            </Text>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Achats payés" value={String(view.actuals.totalPurchases)} />
            <StatTile
              label="Évaluations réussies"
              value={String(view.actuals.totalSuccessfulEvaluations)}
            />
            <StatTile
              label="Comptes Performance"
              value={String(view.actuals.totalPerformanceActivations)}
            />
            <StatTile
              label="Buffers complétés"
              value={String(view.actuals.totalCompletedBuffers)}
            />
            <StatTile
              label="Bénéficiaires P1–P5"
              value={view.actuals.totalPayoutRecipientsByRank.join(' · ')}
            />
            <StatTile label="Coût de payout réalisé" value={view.actuals.realizedPayoutCost} />
          </div>
        </Card>

        <Card padding="comfortable" className="flex flex-col gap-4">
          <div>
            <Text as="h2" variant="heading-sm">
              MODÈLE — hypothèses et exécutions
            </Text>
            <Text variant="body-sm" color="secondary">
              Une exécution conserve son propre instantané d’hypothèses ; les versions sont
              immuables.
            </Text>
          </div>
          <ActuarialScenarioManager
            scenarios={view.scenarios.map((scenario) => ({
              scenarioName: scenario.scenarioName,
              version: scenario.version,
              assumptions: scenario.assumptions,
              notes: scenario.notes,
            }))}
            defaultRunInput={view.defaultRunInput}
          />
        </Card>

        <Card padding="comfortable" className="flex flex-col gap-4">
          <Text as="h2" variant="heading-sm">
            Exécutions du modèle
          </Text>
          {view.runs.length === 0 ? (
            <EmptyState
              title="Aucune exécution"
              description="Aucun scénario n’a encore été exécuté ; il n’y a donc rien à comparer au réel."
            />
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>Scénario</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Version</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Achats (modèle)</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Revenu net</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Coût attendu</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Ratio</DataTableHeaderCell>
                  <DataTableHeaderCell>Exécuté</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Comparaison</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {view.runs.map((run) => (
                  <DataTableRow key={run.id}>
                    <DataTableCell>{run.scenarioName.toUpperCase()}</DataTableCell>
                    <DataTableCell numeric>{run.assumptionsVersion}</DataTableCell>
                    <DataTableCell numeric>{run.totalPurchases}</DataTableCell>
                    <DataTableCell numeric>{run.netCollectedRevenue}</DataTableCell>
                    <DataTableCell numeric>{run.expectedPayoutCost}</DataTableCell>
                    <DataTableCell numeric>{run.payoutRatio}</DataTableCell>
                    <DataTableCell>{DATE_TIME.format(run.executedAt)}</DataTableCell>
                    <DataTableCell align="right">
                      <ActuarialVarianceButton scenarioRunId={run.id} />
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </Card>

        <ActuarialVariancePanel
          minimumComparableSample={view.validation.minimumComparableSample}
          metricLabel={METRIC_LABEL}
        />

        {view.varianceRuns.length > 1 ? (
          <Card padding="comfortable" className="flex flex-col gap-4">
            <Text as="h2" variant="heading-sm">
              Historique des comparaisons
            </Text>
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>Scénario</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Version</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Cohorte modèle</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Échantillon réel</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Couverture</DataTableHeaderCell>
                  <DataTableHeaderCell>Exécuté</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {view.varianceRuns.map((run) => (
                  <DataTableRow key={run.id}>
                    <DataTableCell>{run.scenarioName.toUpperCase()}</DataTableCell>
                    <DataTableCell numeric>{run.scenarioVersion}</DataTableCell>
                    <DataTableCell numeric>{run.modelCohortSize}</DataTableCell>
                    <DataTableCell numeric>{run.actualSampleSize}</DataTableCell>
                    <DataTableCell align="right">
                      <Badge variant={COVERAGE_VARIANT[run.coverage]}>
                        {COVERAGE_LABEL[run.coverage]}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell>{DATE_TIME.format(run.executedAt)}</DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </Card>
        ) : null}
      </div>
    </ActuarialVarianceProvider>
  );
}
