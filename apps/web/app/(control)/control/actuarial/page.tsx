import {
  Card,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  Text,
} from '@wariba/ui';
import { loadActuarialControlState, staffRoleSatisfies } from '@wariba/application';
import { requireStaffRole } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';
import { ActuarialScenarioManager } from './ActuarialScenarioManager';

export const dynamic = 'force-dynamic';

export default async function ControlActuarialPage() {
  const session = await requireStaffRole();
  if (!staffRoleSatisfies(session.role, 'risk') && !staffRoleSatisfies(session.role, 'finance')) {
    return (
      <Text variant="body-md" color="danger">
        Risk or Finance authorization is required.
      </Text>
    );
  }
  const state = await loadActuarialControlState(getDb());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Text as="h1" variant="heading-lg">
          Actuarial scenarios
        </Text>
        <Text variant="body-sm" color="secondary">
          MODEL assumptions and immutable runs. ACTUAL metrics remain separate.
        </Text>
      </div>

      <Card padding="comfortable">
        <ActuarialScenarioManager
          scenarios={state.scenarios.map((scenario) => ({
            scenarioName: scenario.scenarioName,
            version: scenario.version,
            assumptions: scenario.assumptions,
            notes: scenario.notes,
          }))}
          defaultRunInput={state.defaultRunInput}
        />
      </Card>

      <Card padding="comfortable" className="flex flex-col gap-4">
        <Text as="h2" variant="heading-sm">
          Historical run comparison
        </Text>
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Scenario</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Version</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Purchases</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Net revenue</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Expected payouts</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Payout ratio</DataTableHeaderCell>
              <DataTableHeaderCell>Executed</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {state.runs.map((run) => (
              <DataTableRow key={run.id}>
                <DataTableCell>{run.scenarioName.toUpperCase()}</DataTableCell>
                <DataTableCell numeric>{run.assumptionsVersion}</DataTableCell>
                <DataTableCell numeric>{run.totalPurchases}</DataTableCell>
                <DataTableCell numeric>{run.netCollectedRevenue}</DataTableCell>
                <DataTableCell numeric>{run.expectedPayoutCost}</DataTableCell>
                <DataTableCell numeric>{run.payoutRatio}</DataTableCell>
                <DataTableCell>{run.executedAt.toISOString()}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </Card>
    </div>
  );
}
