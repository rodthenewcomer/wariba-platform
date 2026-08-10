import {
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
import { buildControlReviewCasesView } from '@wariba/application';
import { requireControlArea } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';
import { IntegrityHoldManager } from './IntegrityHoldManager';

// requireControlArea() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

export default async function ControlIntegrityPage() {
  await requireControlArea('risk');
  const reviewCases = await buildControlReviewCasesView(getDb());

  return (
    <div className="flex flex-col gap-6">
      <Text as="h1" variant="heading-lg">
        Integrity
      </Text>

      <EmptyState
        title="Aucun signal"
        description="Les signaux d'intégrité (Guardian, revue humaine) arrivent avec Prompt 09."
      />

      <Card padding="comfortable" className="flex flex-col gap-4">
        <div>
          <Text as="h2" variant="heading-sm">
            Protection d’intégrité
          </Text>
          <Text variant="body-sm" color="secondary">
            La levée exige une réconciliation financière exacte et reste auditée.
          </Text>
        </div>
        <IntegrityHoldManager />
      </Card>

      <Card padding="comfortable" className="flex flex-col gap-4">
        <div>
          <Text as="h2" variant="heading-sm">
            Dossiers WARIBA Review
          </Text>
          <Text variant="body-sm" color="secondary">
            Comptes Performance ayant épuisé leurs 5 cycles de payout — lecture seule (PERF-021/022,
            le critère de résolution finale n&apos;est pas encore fixé).
          </Text>
        </div>

        {reviewCases.length === 0 ? (
          <Text variant="body-sm" color="secondary">
            Aucun dossier ouvert.
          </Text>
        ) : (
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Trader</DataTableHeaderCell>
                <DataTableHeaderCell>Compte</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Solde nominal</DataTableHeaderCell>
                <DataTableHeaderCell>Ouvert le</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {reviewCases.map((item) => (
                <DataTableRow key={item.id}>
                  <DataTableCell>{item.traderName}</DataTableCell>
                  <DataTableCell>{item.accountPublicId}</DataTableCell>
                  <DataTableCell numeric>{item.nominalBalanceFormatted}</DataTableCell>
                  <DataTableCell>{item.openedAtLabel}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </Card>
    </div>
  );
}
