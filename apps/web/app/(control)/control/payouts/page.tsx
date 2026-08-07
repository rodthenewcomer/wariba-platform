import {
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyState,
  Text,
} from '@wariba/ui';
import { buildControlPayoutQueueView, staffRoleSatisfies } from '@wariba/application';
import { requireStaffRole } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';
import { ControlPayoutRowActions } from './ControlPayoutRowActions';

// requireStaffRole() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

export default async function ControlPayoutsPage() {
  // Any staff role can see the queue (finance/compliance both need to,
  // support/risk/admin have legitimate reasons to check status too) — each
  // row's actual buttons are gated per-action below and, authoritatively,
  // by each Server Action's own requireStaffRole call.
  const session = await requireStaffRole();
  const staffCanReviewFinance = staffRoleSatisfies(session.role, 'finance');
  const staffCanManageCompliance = staffRoleSatisfies(session.role, 'compliance');

  const queue = await buildControlPayoutQueueView(getDb());

  return (
    <div className="flex flex-col gap-6">
      <Text as="h1" variant="heading-lg">
        Payout queue
      </Text>

      {queue.length === 0 ? (
        <EmptyState
          title="Aucune demande de payout"
          description="Aucune demande n’attend de revue ou de règlement pour le moment."
        />
      ) : (
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Trader</DataTableHeaderCell>
              <DataTableHeaderCell>Compte</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Cycle</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Statut</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Demandé (net)</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Plafond / Split</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Approuvé</DataTableHeaderCell>
              <DataTableHeaderCell align="right">KYC / Paiement</DataTableHeaderCell>
              <DataTableHeaderCell>Demandé le</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Actions</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {queue.map((item) => (
              <DataTableRow key={item.id}>
                <DataTableCell>{item.traderName}</DataTableCell>
                <DataTableCell>
                  {item.accountPublicId}
                  <br />
                  <span className="text-[color:var(--wariba-text-secondary)]">
                    {item.nominalBalanceFormatted}
                  </span>
                </DataTableCell>
                <DataTableCell numeric>n°{item.cycleNumber}</DataTableCell>
                <DataTableCell align="right">
                  <Badge variant={item.statusVariant}>{item.statusLabel}</Badge>
                </DataTableCell>
                <DataTableCell numeric>{item.requestedNetCashFormatted}</DataTableCell>
                <DataTableCell numeric>
                  {item.capAppliedFormatted} · {item.traderSplitPercent} %
                </DataTableCell>
                <DataTableCell numeric>
                  {item.approvedGrossBaseFormatted ?? '—'}
                  {item.traderNetCashFormatted ? (
                    <>
                      <br />
                      <span className="text-[color:var(--wariba-text-secondary)]">
                        net {item.traderNetCashFormatted}
                      </span>
                    </>
                  ) : null}
                </DataTableCell>
                <DataTableCell align="right">
                  <Badge variant={item.kycVerified ? 'success' : 'warning'}>
                    {item.kycVerified ? 'KYC OK' : 'KYC manquant'}
                  </Badge>
                  <br />
                  <Badge variant={item.payoutMethodConfigured ? 'success' : 'warning'}>
                    {item.payoutMethodConfigured ? 'Paiement OK' : 'Paiement manquant'}
                  </Badge>
                </DataTableCell>
                <DataTableCell>{item.requestedAtLabel}</DataTableCell>
                <DataTableCell align="right">
                  <ControlPayoutRowActions
                    payoutRequestId={item.id}
                    accountId={item.accountId}
                    canApproveOrReject={item.canApproveOrReject}
                    canSettle={item.canSettle}
                    kycVerified={item.kycVerified}
                    payoutMethodConfigured={item.payoutMethodConfigured}
                    staffCanReviewFinance={staffCanReviewFinance}
                    staffCanManageCompliance={staffCanManageCompliance}
                  />
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}
