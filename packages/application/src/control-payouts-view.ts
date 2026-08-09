import { loadPayoutRequestsForReview, type Db } from '@wariba/database';

export type ControlPayoutStatusVariant =
  'neutral' | 'information' | 'success' | 'warning' | 'danger';

export interface ControlPayoutQueueItemView {
  id: string;
  accountId: string;
  accountPublicId: string;
  traderName: string;
  nominalBalanceFormatted: string;
  cycleNumber: number;
  status: string;
  statusLabel: string;
  statusVariant: ControlPayoutStatusVariant;
  requestedNetCashFormatted: string;
  capAppliedFormatted: string;
  traderSplitPercent: number;
  approvedGrossBaseFormatted: string | null;
  traderNetCashFormatted: string | null;
  kycVerified: boolean;
  payoutMethodConfigured: boolean;
  requestedAtLabel: string;
  canApproveOrReject: boolean;
  canSubmit: boolean;
  canSettle: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  pending_review: 'En revue',
  needs_information: 'Information requise',
  approved: 'Approuvé — à soumettre',
  processing: 'Approuvé — en attente de règlement',
};

const STATUS_VARIANT: Record<string, ControlPayoutStatusVariant> = {
  pending_review: 'information',
  needs_information: 'warning',
  approved: 'warning',
  processing: 'success',
};

function formatUsd(amount: string): string {
  return `${Math.round(Number.parseFloat(amount)).toLocaleString('fr-FR')} USD`;
}

/**
 * Prompt 08 Phase G — every payout request a staff member still has
 * something to do on (packages/database/src/payouts.ts's
 * loadPayoutRequestsForReview), formatted for /control/payouts. Oldest
 * first (the query's own order) — first come, first reviewed.
 */
export async function buildControlPayoutQueueView(db: Db): Promise<ControlPayoutQueueItemView[]> {
  const rows = await loadPayoutRequestsForReview(db);
  return rows.map((row) => ({
    id: row.id,
    accountId: row.accountId,
    accountPublicId: row.accountPublicId,
    traderName: `${row.traderFirstName} ${row.traderLastName}`,
    nominalBalanceFormatted: formatUsd(row.nominalBalance),
    cycleNumber: row.cycleNumber,
    status: row.status,
    statusLabel: STATUS_LABEL[row.status] ?? row.status,
    statusVariant: STATUS_VARIANT[row.status] ?? 'neutral',
    requestedNetCashFormatted: formatUsd(row.requestedNetTraderCash),
    capAppliedFormatted: formatUsd(row.capApplied),
    traderSplitPercent: Math.round(Number(row.traderSplitRate) * 100),
    approvedGrossBaseFormatted: row.approvedGrossBase ? formatUsd(row.approvedGrossBase) : null,
    traderNetCashFormatted: row.traderNetCash ? formatUsd(row.traderNetCash) : null,
    kycVerified: row.kycVerified,
    payoutMethodConfigured: row.payoutMethodConfigured,
    requestedAtLabel: row.requestedAt.toLocaleString('fr-FR'),
    canApproveOrReject: row.status === 'pending_review' || row.status === 'needs_information',
    canSubmit: row.status === 'approved',
    canSettle: row.status === 'processing',
  }));
}
