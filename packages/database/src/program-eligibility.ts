import Decimal from 'decimal.js';
import type { Db } from './client';

export interface AccountBalanceProjection {
  accountBalance: string;
  programEligibleBalance: string;
  riskAdjustedBalance: string;
  ineligibleShortDurationProfit: string;
  payoutRiskNeutralAdjustment: string;
}

interface ProjectionLedgerEntry {
  amount: string;
  entry_type: string;
  reference_type: string | null;
}

export function projectAccountBalances(params: {
  ledgerEntries: readonly ProjectionLedgerEntry[];
  ineligibleShortDurationProfit: string;
}): AccountBalanceProjection {
  const accountBalance = params.ledgerEntries.reduce(
    (sum, entry) => sum.plus(entry.amount),
    new Decimal(0),
  );
  const ineligibleShortDurationProfit = new Decimal(params.ineligibleShortDurationProfit);
  const payoutLedgerEffect = params.ledgerEntries
    .filter(
      (entry) =>
        entry.entry_type === 'payout_debit' ||
        (entry.entry_type === 'reversal' && entry.reference_type === 'payout_request'),
    )
    .reduce((sum, entry) => sum.plus(entry.amount), new Decimal(0));
  const payoutRiskNeutralAdjustment = payoutLedgerEffect.negated();

  return {
    accountBalance: accountBalance.toFixed(2),
    programEligibleBalance: accountBalance.minus(ineligibleShortDurationProfit).toFixed(2),
    riskAdjustedBalance: accountBalance
      .minus(ineligibleShortDurationProfit)
      .plus(payoutRiskNeutralAdjustment)
      .toFixed(2),
    ineligibleShortDurationProfit: ineligibleShortDurationProfit.toFixed(2),
    payoutRiskNeutralAdjustment: payoutRiskNeutralAdjustment.toFixed(2),
  };
}

/**
 * Prompt 07B's two-balance projection without a mutable balance counter.
 * The regular balance remains the append-only ledger sum. The program
 * projection subtracts only durable, per-fill ineligible short-duration
 * profit, so every loss, commission, swap and authorized adjustment keeps
 * exactly the same effect in both projections.
 */
export async function loadAccountBalanceProjection(
  db: Db,
  accountId: string,
  before?: Date,
  eligibilityEnabled = true,
): Promise<AccountBalanceProjection> {
  let ledgerQuery = db
    .selectFrom('app.trading_ledger_entries')
    .select(['amount', 'entry_type', 'reference_type'])
    .where('account_id', '=', accountId);
  let ineligibleQuery = db
    .selectFrom('app.fills')
    .select('ineligible_short_duration_profit')
    .where('account_id', '=', accountId)
    .where('fill_type', '=', 'close');

  if (before) {
    ledgerQuery = ledgerQuery.where('occurred_at', '<', before);
    ineligibleQuery = ineligibleQuery.where('occurred_at', '<', before);
  }

  const [ledgerEntries, ineligibleFills] = await Promise.all([
    ledgerQuery.execute(),
    ineligibleQuery.execute(),
  ]);
  const ineligibleShortDurationProfit = eligibilityEnabled
    ? ineligibleFills.reduce(
        (sum, fill) => sum.plus(fill.ineligible_short_duration_profit),
        new Decimal(0),
      )
    : new Decimal(0);

  return projectAccountBalances({
    ledgerEntries,
    ineligibleShortDurationProfit: ineligibleShortDurationProfit.toFixed(2),
  });
}
