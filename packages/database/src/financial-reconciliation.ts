import Decimal from 'decimal.js';
import type { Db } from './client';

const RECONCILIATION_INCIDENT_CODE = 'ACCOUNT_RECONCILIATION_FAILURE';

export interface FinancialReconstructionBreakdown {
  initialBalance: string;
  realizedProfit: string;
  realizedLoss: string;
  commissions: string;
  swaps: string;
  payoutDebits: string;
  authorizedAdjustments: string;
  otherReversals: string;
  ineligibleShortDurationProfit: string;
  currentPerformanceCycle: {
    cycleNumber: number;
    status: 'active' | 'payout_pending' | 'closed';
  } | null;
}

export interface AccountFinancialReconstruction {
  accountId: string;
  storedAccountBalance: string;
  reconstructedAccountBalance: string;
  storedProgramEligibleBalance: string;
  reconstructedProgramEligibleBalance: string;
  matches: boolean;
  breakdown: FinancialReconstructionBreakdown;
}

function sum(values: readonly string[]): Decimal {
  return values.reduce((total, value) => total.plus(value), new Decimal(0));
}

function fixed(value: Decimal): string {
  return value.toFixed(8);
}

export async function reconstructAccountFinancialState(
  db: Db,
  accountId: string,
): Promise<AccountFinancialReconstruction> {
  const [account, ledgerEntries, fills, payouts, currentCycle] = await Promise.all([
    db
      .selectFrom('app.trading_accounts')
      .select(['id', 'nominal_balance'])
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow(),
    db
      .selectFrom('app.trading_ledger_entries')
      .select(['entry_type', 'amount', 'reference_type'])
      .where('account_id', '=', accountId)
      .execute(),
    db
      .selectFrom('app.fills')
      .select(['fill_type', 'realized_pnl', 'commission', 'ineligible_short_duration_profit'])
      .where('account_id', '=', accountId)
      .execute(),
    db
      .selectFrom('app.payout_requests')
      .select(['status', 'approved_gross_base'])
      .where('account_id', '=', accountId)
      .where('status', 'in', ['paid', 'reversed'])
      .execute(),
    db
      .selectFrom('app.performance_cycles')
      .select(['cycle_number', 'status'])
      .where('account_id', '=', accountId)
      .where('status', '!=', 'closed')
      .executeTakeFirst(),
  ]);

  const closeFills = fills.filter((fill) => fill.fill_type === 'close');
  const realizedProfit = sum(
    closeFills
      .filter((fill) => new Decimal(fill.realized_pnl).isPositive())
      .map((fill) => fill.realized_pnl),
  );
  const realizedLoss = sum(
    closeFills
      .filter((fill) => new Decimal(fill.realized_pnl).isNegative())
      .map((fill) => fill.realized_pnl),
  );
  const commissions = sum(fills.map((fill) => fill.commission)).negated();
  const ineligibleShortDurationProfit = sum(
    closeFills.map((fill) => fill.ineligible_short_duration_profit),
  );
  const swaps = sum(
    ledgerEntries.filter((entry) => entry.entry_type === 'swap').map((entry) => entry.amount),
  );
  const authorizedAdjustments = sum(
    ledgerEntries
      .filter((entry) => entry.entry_type === 'authorized_adjustment')
      .map((entry) => entry.amount),
  );
  const otherReversals = sum(
    ledgerEntries
      .filter(
        (entry) => entry.entry_type === 'reversal' && entry.reference_type !== 'payout_request',
      )
      .map((entry) => entry.amount),
  );
  const payoutDebits = sum(
    payouts
      .filter((payout) => payout.status === 'paid' && payout.approved_gross_base !== null)
      .map((payout) => `-${payout.approved_gross_base as string}`),
  );
  const initialBalance = new Decimal(account.nominal_balance);
  const reconstructedAccountBalance = initialBalance
    .plus(realizedProfit)
    .plus(realizedLoss)
    .plus(commissions)
    .plus(swaps)
    .plus(payoutDebits)
    .plus(authorizedAdjustments)
    .plus(otherReversals);
  const storedAccountBalance = sum(ledgerEntries.map((entry) => entry.amount));
  const storedProgramEligibleBalance = storedAccountBalance.minus(ineligibleShortDurationProfit);
  const reconstructedProgramEligibleBalance = reconstructedAccountBalance.minus(
    ineligibleShortDurationProfit,
  );

  return {
    accountId,
    storedAccountBalance: fixed(storedAccountBalance),
    reconstructedAccountBalance: fixed(reconstructedAccountBalance),
    storedProgramEligibleBalance: fixed(storedProgramEligibleBalance),
    reconstructedProgramEligibleBalance: fixed(reconstructedProgramEligibleBalance),
    matches:
      storedAccountBalance.equals(reconstructedAccountBalance) &&
      storedProgramEligibleBalance.equals(reconstructedProgramEligibleBalance),
    breakdown: {
      initialBalance: fixed(initialBalance),
      realizedProfit: fixed(realizedProfit),
      realizedLoss: fixed(realizedLoss),
      commissions: fixed(commissions),
      swaps: fixed(swaps),
      payoutDebits: fixed(payoutDebits),
      authorizedAdjustments: fixed(authorizedAdjustments),
      otherReversals: fixed(otherReversals),
      ineligibleShortDurationProfit: fixed(ineligibleShortDurationProfit),
      currentPerformanceCycle: currentCycle
        ? { cycleNumber: currentCycle.cycle_number, status: currentCycle.status }
        : null,
    },
  };
}

export interface AccountReconciliationResult extends AccountFinancialReconstruction {
  runId: string;
  incidentId: string | null;
  executedAt: Date;
}

export async function placeAccountIntegrityHoldInTransaction(
  trx: Db,
  params: { accountId: string; placedBy: string; reason: string; now: Date },
): Promise<string> {
  if (params.reason.trim().length === 0) throw new Error('Integrity hold reason required.');
  const account = await trx
    .selectFrom('app.trading_accounts')
    .select(['integrity_hold', 'integrity_hold_incident_id'])
    .where('id', '=', params.accountId)
    .forUpdate()
    .executeTakeFirstOrThrow(() => new Error('Trading account was not found.'));
  if (account.integrity_hold && account.integrity_hold_incident_id) {
    return account.integrity_hold_incident_id;
  }
  const incident = await trx
    .insertInto('app.operations_incidents')
    .values({
      incident_code: 'MANUAL_INTEGRITY_HOLD',
      severity: 'warning',
      account_id: params.accountId,
      payout_request_id: null,
      evidence: JSON.stringify({ reason: params.reason.trim(), placedBy: params.placedBy }),
      opened_at: params.now,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  await trx
    .updateTable('app.trading_accounts')
    .set({
      integrity_hold: true,
      integrity_hold_reason: params.reason.trim(),
      integrity_hold_set_at: params.now,
      integrity_hold_incident_id: incident.id,
      updated_at: params.now,
    })
    .where('id', '=', params.accountId)
    .execute();
  return incident.id;
}

export async function reconcileAccountFinancialStateInTransaction(
  trx: Db,
  params: { accountId: string; executedBy: string | null; now: Date },
): Promise<AccountReconciliationResult> {
  await trx
    .selectFrom('app.trading_accounts')
    .select('id')
    .where('id', '=', params.accountId)
    .forUpdate()
    .executeTakeFirstOrThrow();
  const reconstruction = await reconstructAccountFinancialState(trx, params.accountId);

  let incidentId: string | null = null;
  if (!reconstruction.matches) {
    const evidence = JSON.stringify(reconstruction);
    const existingIncident = await trx
      .selectFrom('app.operations_incidents')
      .select('id')
      .where('account_id', '=', params.accountId)
      .where('incident_code', '=', RECONCILIATION_INCIDENT_CODE)
      .where('status', '=', 'open')
      .executeTakeFirst();
    if (!existingIncident) {
      await trx
        .insertInto('app.operations_incidents')
        .values({
          incident_code: RECONCILIATION_INCIDENT_CODE,
          severity: 'critical',
          account_id: params.accountId,
          payout_request_id: null,
          evidence,
          opened_at: params.now,
        })
        .onConflict((conflict) => conflict.doNothing())
        .execute();
    }
    const incident = await trx
      .selectFrom('app.operations_incidents')
      .select('id')
      .where('account_id', '=', params.accountId)
      .where('incident_code', '=', RECONCILIATION_INCIDENT_CODE)
      .where('status', '=', 'open')
      .executeTakeFirstOrThrow();
    incidentId = incident.id;
    await trx
      .updateTable('app.trading_accounts')
      .set({
        integrity_hold: true,
        integrity_hold_reason: RECONCILIATION_INCIDENT_CODE,
        integrity_hold_set_at: params.now,
        integrity_hold_incident_id: incidentId,
        updated_at: params.now,
      })
      .where('id', '=', params.accountId)
      .execute();
  }

  const run = await trx
    .insertInto('app.account_reconciliation_runs')
    .values({
      account_id: params.accountId,
      status: reconstruction.matches ? 'matched' : 'mismatched',
      stored_account_balance: reconstruction.storedAccountBalance,
      reconstructed_account_balance: reconstruction.reconstructedAccountBalance,
      stored_program_eligible_balance: reconstruction.storedProgramEligibleBalance,
      reconstructed_program_eligible_balance: reconstruction.reconstructedProgramEligibleBalance,
      breakdown: JSON.stringify(reconstruction.breakdown),
      incident_id: incidentId,
      executed_by: params.executedBy,
      executed_at: params.now,
    })
    .returning(['id', 'executed_at'])
    .executeTakeFirstOrThrow();

  await trx
    .insertInto('app.outbox_events')
    .values({
      aggregate_type: 'account_reconciliation',
      aggregate_id: run.id,
      event_type: reconstruction.matches
        ? 'account.reconciliation_succeeded'
        : 'account.reconciliation_failed',
      payload: JSON.stringify({ accountId: params.accountId, incidentId }),
      occurred_at: params.now,
    })
    .execute();

  return { ...reconstruction, runId: run.id, incidentId, executedAt: run.executed_at };
}

export async function clearAccountIntegrityHoldInTransaction(
  trx: Db,
  params: { accountId: string; clearedBy: string; reason: string; now: Date },
): Promise<void> {
  if (params.reason.trim().length === 0)
    throw new Error('Integrity hold resolution reason required.');
  const account = await trx
    .selectFrom('app.trading_accounts')
    .select(['integrity_hold', 'integrity_hold_incident_id'])
    .where('id', '=', params.accountId)
    .forUpdate()
    .executeTakeFirstOrThrow();
  if (!account.integrity_hold || !account.integrity_hold_incident_id) return;

  const reconciliation = await reconcileAccountFinancialStateInTransaction(trx, {
    accountId: params.accountId,
    executedBy: params.clearedBy,
    now: params.now,
  });
  if (!reconciliation.matches)
    throw new Error('Integrity hold cannot clear while reconciliation fails.');

  await trx
    .updateTable('app.operations_incidents')
    .set({
      status: 'resolved',
      resolved_at: params.now,
      resolved_by: params.clearedBy,
      resolution_reason: params.reason.trim(),
    })
    .where('id', '=', account.integrity_hold_incident_id)
    .where('status', '=', 'open')
    .execute();
  await trx
    .updateTable('app.trading_accounts')
    .set({
      integrity_hold: false,
      integrity_hold_reason: null,
      integrity_hold_set_at: null,
      integrity_hold_incident_id: null,
      updated_at: params.now,
    })
    .where('id', '=', params.accountId)
    .execute();
}
