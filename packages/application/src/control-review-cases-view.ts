import { loadOpenPerformanceReviewCases, type Db } from '@wariba/database';

export interface ControlReviewCaseItemView {
  id: string;
  accountId: string;
  accountPublicId: string;
  nominalBalanceFormatted: string;
  traderName: string;
  openedAtLabel: string;
}

function formatUsd(amount: string): string {
  return `${Math.round(Number.parseFloat(amount)).toLocaleString('fr-FR')} USD`;
}

/**
 * Prompt 08 Phase G — open WARIBA Review cases (PERF-018/031: an account
 * that exhausted its 5 payout cycles) for /control/integrity. Read-only —
 * see loadOpenPerformanceReviewCases's own doc comment for why there is no
 * resolve/close action here yet.
 */
export async function buildControlReviewCasesView(db: Db): Promise<ControlReviewCaseItemView[]> {
  const rows = await loadOpenPerformanceReviewCases(db);
  return rows.map((row) => ({
    id: row.id,
    accountId: row.accountId,
    accountPublicId: row.accountPublicId,
    nominalBalanceFormatted: formatUsd(row.nominalBalance),
    traderName: `${row.traderFirstName} ${row.traderLastName}`,
    openedAtLabel: row.openedAt.toLocaleDateString('fr-FR'),
  }));
}
