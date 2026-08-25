'use client';

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
import type { ActuarialVarianceDTO } from './actions';
import { useActuarialVariance } from './ActuarialVarianceStore';

const COVERAGE_LABEL: Record<ActuarialVarianceDTO['coverage'], string> = {
  insufficient_data: 'Données insuffisantes',
  partial: 'Partielle',
  comparable: 'Comparable',
};

const COVERAGE_VARIANT: Record<ActuarialVarianceDTO['coverage'], 'danger' | 'warning' | 'success'> =
  {
    insufficient_data: 'danger',
    partial: 'warning',
    comparable: 'success',
  };

const DATE_TIME = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'UTC',
});

/**
 * ÉCART — the last recorded MODEL vs ACTUAL comparison, and the control that
 * records a new one.
 *
 * ## Why the panel owns the reading, not just the button
 *
 * The button used to sit alone in the runs table while the comparison was
 * rendered by the server component around it. `revalidatePath` marked the route
 * stale, but nothing in the operator's current render was subscribed to that:
 * the write landed in the database, the audit row landed beside it, and the
 * card above kept saying "Aucune comparaison enregistrée" until the operator
 * happened to navigate. An operator who cannot see the artifact they just
 * created has no way to tell a successful comparison from a silent failure.
 *
 * The fix is not a timer. The mutation returns the canonical record it wrote —
 * the same row a reload will read — and this component renders that. The
 * database stays the authority; the browser is only allowed to display what
 * the server says it stored, never to compute a comparison of its own.
 */
export function ActuarialVariancePanel({
  minimumComparableSample,
  metricLabel,
}: {
  minimumComparableSample: number;
  metricLabel: Record<string, string>;
}) {
  const { variance } = useActuarialVariance();

  return (
    <Card padding="comfortable" className="flex flex-col gap-4" data-testid="actuarial-variance">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Text as="h2" variant="heading-sm">
          ÉCART — dernière comparaison enregistrée
        </Text>
        {variance ? (
          <Badge variant={COVERAGE_VARIANT[variance.coverage]}>
            {COVERAGE_LABEL[variance.coverage]}
          </Badge>
        ) : null}
      </div>

      {!variance ? (
        <EmptyState
          title="Aucune comparaison enregistrée"
          description="Le modèle n’a jamais été confronté aux données réelles. Rien ici ne peut être lu comme une validation."
        />
      ) : (
        <>
          <Text variant="body-sm" color="secondary" data-testid="actuarial-variance-summary">
            {variance.scenarioName.toUpperCase()} v{variance.scenarioVersion} · cohorte modèle{' '}
            {variance.modelCohortSize} · échantillon réel {variance.actualSampleSize} ·{' '}
            {DATE_TIME.format(new Date(variance.executedAt))} UTC
          </Text>
          {variance.coverage !== 'comparable' ? (
            <Alert level="warning" title="Comparaison non concluante">
              L’échantillon réel est en dessous du seuil de comparabilité ({minimumComparableSample}
              ). Les écarts ci-dessous sont affichés tels qu’enregistrés, mais ne peuvent pas être
              interprétés comme une mesure de justesse du modèle.
            </Alert>
          ) : null}
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Métrique</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Modèle</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Réel</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Écart</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Écart relatif</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {variance.metrics.map((metric) => (
                <DataTableRow key={metric.metric}>
                  <DataTableCell>{metricLabel[metric.metric] ?? metric.metric}</DataTableCell>
                  <DataTableCell numeric>{metric.modelValue}</DataTableCell>
                  <DataTableCell numeric>{metric.actualValue}</DataTableCell>
                  <DataTableCell numeric>{metric.variance}</DataTableCell>
                  <DataTableCell numeric>
                    {/* Null when the model projected zero — a ratio against
                        zero is undefined, not 0 %. */}
                    {metric.relativeVariance ?? 'n/a'}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </>
      )}
    </Card>
  );
}
