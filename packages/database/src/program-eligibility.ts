import Decimal from 'decimal.js';
import type { Db } from './client';

export interface AccountBalanceProjection {
  accountBalance: string;
  programEligibleBalance: string;
  ineligibleShortDurationProfit: string;
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
    .select('amount')
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
  const accountBalance = ledgerEntries.reduce(
    (sum, entry) => sum.plus(entry.amount),
    new Decimal(0),
  );
  const ineligibleShortDurationProfit = eligibilityEnabled
    ? ineligibleFills.reduce(
        (sum, fill) => sum.plus(fill.ineligible_short_duration_profit),
        new Decimal(0),
      )
    : new Decimal(0);

  return {
    accountBalance: accountBalance.toFixed(2),
    programEligibleBalance: accountBalance.minus(ineligibleShortDurationProfit).toFixed(2),
    ineligibleShortDurationProfit: ineligibleShortDurationProfit.toFixed(2),
  };
}
