import {
  Badge,
  Card,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  Text,
} from '@wariba/ui';
import { buildControlReviewCasesView, loadRiskCases } from '@wariba/application';
import Link from 'next/link';
import { requireControlArea } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';
import { IntegrityHoldManager } from './IntegrityHoldManager';

// requireControlArea() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

export default async function ControlIntegrityPage() {
  await requireControlArea('risk');
  const db = getDb();
  const [reviewCases, riskCases] = await Promise.all([
    buildControlReviewCasesView(db),
    loadRiskCases(db),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Text as="h1" variant="heading-lg">
        Integrity
      </Text>

      <Card padding="comfortable" className="flex flex-col gap-4">
        <div>
          <Text as="h2" variant="heading-sm">
            Dossiers d’intégrité
          </Text>
          <Text variant="body-sm" color="secondary">
            Comptes sous integrity hold, portant un incident ouvert, ou dont une réconciliation a
            échoué. C’est une liste de cas, pas un annuaire : l’identité affichée se limite au
            strict nécessaire pour identifier le compte à investiguer.
          </Text>
        </div>

        {riskCases.length === 0 ? (
          <Text variant="body-sm" color="secondary">
            Aucun compte ne requiert d’attention.
          </Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-[length:var(--wariba-font-size-body-sm)]">
              <caption className="sr-only">Dossiers d’intégrité</caption>
              <thead className="text-[color:var(--wariba-text-secondary)]">
                <tr>
                  <th scope="col" className="p-2 font-semibold">
                    Compte
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Programme
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Statut
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Integrity hold
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Incidents
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Violations
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Dernier écart
                  </th>
                </tr>
              </thead>
              <tbody>
                {riskCases.map((riskCase) => (
                  <tr
                    key={riskCase.accountId}
                    className="border-t border-[color:var(--wariba-border-subtle)]"
                  >
                    <td className="p-2">
                      <Link
                        href={`/control/integrity/${riskCase.accountId}`}
                        className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-link)]"
                      >
                        {riskCase.accountPublicId}
                      </Link>
                    </td>
                    <td className="p-2">{riskCase.programType}</td>
                    <td className="p-2">{riskCase.status}</td>
                    <td className="p-2">
                      {riskCase.integrityHold ? (
                        <Badge variant="danger">actif</Badge>
                      ) : (
                        <span className="text-[color:var(--wariba-text-secondary)]">—</span>
                      )}
                    </td>
                    <td className="p-2">
                      {riskCase.criticalIncidents > 0 ? (
                        <Badge variant="danger">{riskCase.criticalIncidents} critique(s)</Badge>
                      ) : riskCase.openIncidents > 0 ? (
                        <Badge variant="warning">{riskCase.openIncidents} ouvert(s)</Badge>
                      ) : (
                        <span className="text-[color:var(--wariba-text-secondary)]">—</span>
                      )}
                    </td>
                    <td className="p-2">{riskCase.violations}</td>
                    <td className="p-2">
                      <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
                        {riskCase.lastMismatchAt
                          ? riskCase.lastMismatchAt.toISOString().slice(0, 16).replace('T', ' ')
                          : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
