import Decimal from 'decimal.js';
import {
  assertEvaluationAccountTransition,
  computeDailyReference,
  computeInitialMaximumLossFloor,
  computeNextMaximumLossFloor,
} from '@wariba/domain';
import { lockAccount } from './accounts';
import type { Db } from './client';
import { loadPolicyById } from './policy';

/**
 * Prompt 05 "DAILY WORKER" — SOD snapshot, finalize the previous UTC day,
 * update the Maximum Loss floor (ONE-021: EOD-trailing, only after a
 * finalized day, never decreases), and reset the daily soft lock
 * (ONE-020: reset at next_daily_reset). Idempotent via
 * unique(account_id, trading_day) on app.account_daily_snapshots.
 *
 * V1 simplification, deliberate: this module never fetches live market
 * prices (services/worker has no market-data connection). Equity at a UTC
 * boundary therefore falls back to balance (no unrealized PnL) here — the
 * Maximum Loss floor ratchet itself is unaffected (its formula uses
 * `highest_eod_balance`, not equity), but the *next* day's `daily_reference`
 * is computed from balance alone rather than `max(balance, equity)`. Since
 * a lower reference produces a lower (tighter) daily-loss floor, this
 * under-approximation never hides a real breach — it can only make the
 * soft lock trigger slightly earlier than the Rulebook formula would in a
 * day that opens with a large unrealized gain still open from overnight.
 * Real-time evaluations (risk.ts, on every trade) use live prices and are
 * unaffected by this simplification.
 */

function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addOneUtcDay(dateString: string): string {
  const next = new Date(`${dateString}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return utcDateString(next);
}

export interface EnsureTodaySnapshotParams {
  accountId: string;
  nominalBalance: string;
  policyVersionId: string;
  maximumLossRate: string;
  sodBalance: string;
  sodEquity: string;
  now: Date;
}

/**
 * Guarantees a row exists for "today" (UTC), creating one if this is either
 * the account's first-ever evaluation or the first evaluation of a new UTC
 * day. The new floor carries forward from the most recently finalized day
 * (or the policy's initial floor if none exists yet) — callers never need
 * to compute the floor themselves.
 */
export async function ensureTodaySnapshot(trx: Db, params: EnsureTodaySnapshotParams) {
  const todayDate = utcDateString(params.now);

  const existing = await trx
    .selectFrom('app.account_daily_snapshots')
    .selectAll()
    .where('account_id', '=', params.accountId)
    .where('trading_day', '=', todayDate)
    .executeTakeFirst();
  if (existing) return existing;

  const previousFinalized = await trx
    .selectFrom('app.account_daily_snapshots')
    .select('maximum_loss_floor_after')
    .where('account_id', '=', params.accountId)
    .where('status', '=', 'finalized')
    .orderBy('trading_day', 'desc')
    .executeTakeFirst();

  const maximumLossFloorBefore =
    previousFinalized?.maximum_loss_floor_after ??
    computeInitialMaximumLossFloor({
      nominalBalance: params.nominalBalance,
      maximumLossRate: params.maximumLossRate,
    });

  // If this is the account's first-ever evaluation (no finalized day exists
  // yet), the caller's sodBalance/sodEquity were computed *after* whatever
  // trade triggered this bootstrap already wrote its commission/PnL to the
  // ledger — using them here would silently absorb that trade's cost into
  // a phantom "day 0" instead of counting it as day 1's own activity,
  // understating day 1's realized P&L bucket at finalization. The account's
  // true starting point is always its nominal balance, so use that instead.
  const isFirstEverEvaluation = previousFinalized === undefined;
  const sodBalance = isFirstEverEvaluation ? params.nominalBalance : params.sodBalance;
  const sodEquity = isFirstEverEvaluation ? params.nominalBalance : params.sodEquity;

  const dailyReference = computeDailyReference({
    balanceAtReset: sodBalance,
    equityAtReset: sodEquity,
  });

  await trx
    .insertInto('app.account_daily_snapshots')
    .values({
      account_id: params.accountId,
      trading_day: todayDate,
      policy_version_id: params.policyVersionId,
      status: 'open',
      sod_balance: sodBalance,
      sod_equity: sodEquity,
      daily_reference: dailyReference,
      maximum_loss_floor_before: maximumLossFloorBefore,
    })
    .onConflict((oc) => oc.columns(['account_id', 'trading_day']).doNothing())
    .execute();

  // Re-select rather than trust the insert: a concurrent evaluation for the
  // same account/day may have won the race and its onConflict no-op above.
  return trx
    .selectFrom('app.account_daily_snapshots')
    .selectAll()
    .where('account_id', '=', params.accountId)
    .where('trading_day', '=', todayDate)
    .executeTakeFirstOrThrow();
}

export interface FinalizeDailyBoundaryResult {
  accountId: string;
  finalizedTradingDay: string | null;
  newTradingDay: string;
  maximumLossFloorAfter: string;
  alreadyUpToDate: boolean;
}

export async function finalizeDailyBoundaryForAccount(
  db: Db,
  params: { accountId: string; clock: () => Date },
): Promise<FinalizeDailyBoundaryResult> {
  return db.transaction().execute(async (trx) => {
    const account = await lockAccount(trx, params.accountId);
    const policy = await loadPolicyById(trx, account.policy_version_id);
    const now = params.clock();
    const todayDate = utcDateString(now);

    const openSnapshot = await trx
      .selectFrom('app.account_daily_snapshots')
      .selectAll()
      .where('account_id', '=', account.id)
      .where('status', '=', 'open')
      .orderBy('trading_day', 'desc')
      .executeTakeFirst();

    if (!openSnapshot || openSnapshot.trading_day >= todayDate) {
      // Nothing has elapsed yet — only bootstrap today's row if missing.
      const ledgerEntries = await trx
        .selectFrom('app.trading_ledger_entries')
        .select('amount')
        .where('account_id', '=', account.id)
        .execute();
      const currentBalance = ledgerEntries
        .reduce((sum, e) => sum.plus(e.amount), new Decimal(0))
        .toFixed(2);
      const today = await ensureTodaySnapshot(trx, {
        accountId: account.id,
        nominalBalance: account.nominal_balance,
        policyVersionId: policy.id,
        maximumLossRate: policy.parameters.maximum_loss_rate,
        sodBalance: currentBalance,
        sodEquity: currentBalance,
        now,
      });
      return {
        accountId: account.id,
        finalizedTradingDay: null,
        newTradingDay: today.trading_day,
        maximumLossFloorAfter: today.maximum_loss_floor_before,
        alreadyUpToDate: true,
      };
    }

    // openSnapshot.trading_day < todayDate — that UTC day has fully elapsed.
    // If multiple days elapsed with no trading in between (a dormant
    // account the worker didn't reach for a while), the balance — and
    // therefore the floor ratchet — is provably unchanged across the empty
    // days, so this collapses straight to today rather than materializing
    // a row per skipped day.
    const boundaryInstant = new Date(`${addOneUtcDay(openSnapshot.trading_day)}T00:00:00.000Z`);
    const ledgerEntriesBeforeBoundary = await trx
      .selectFrom('app.trading_ledger_entries')
      .select('amount')
      .where('account_id', '=', account.id)
      .where('occurred_at', '<', boundaryInstant)
      .execute();
    const eodBalance = ledgerEntriesBeforeBoundary
      .reduce((sum, e) => sum.plus(e.amount), new Decimal(0))
      .toFixed(2);
    const realizedNetProfitForDay = new Decimal(eodBalance)
      .minus(openSnapshot.sod_balance)
      .toFixed(2);

    const previousHighest = await trx
      .selectFrom('app.account_daily_snapshots')
      .select('highest_eod_balance_after')
      .where('account_id', '=', account.id)
      .where('status', '=', 'finalized')
      .orderBy('trading_day', 'desc')
      .executeTakeFirst();
    const highestEodBalanceAfter = Decimal.max(
      previousHighest?.highest_eod_balance_after ?? account.nominal_balance,
      eodBalance,
    ).toFixed(2);

    const maximumLossFloorAfter = computeNextMaximumLossFloor({
      previousFloor: openSnapshot.maximum_loss_floor_before,
      highestEodBalance: highestEodBalanceAfter,
      nominalBalance: account.nominal_balance,
      maximumLossRate: policy.parameters.maximum_loss_rate,
    });

    await trx
      .updateTable('app.account_daily_snapshots')
      .set({
        status: 'finalized',
        eod_balance: eodBalance,
        // See module doc comment — no historical price feed to price open
        // positions exactly at the UTC boundary in V1.
        eod_equity: eodBalance,
        maximum_loss_floor_after: maximumLossFloorAfter,
        highest_eod_balance_after: highestEodBalanceAfter,
        realized_net_profit_for_day: realizedNetProfitForDay,
        finalized_at: now,
      })
      .where('id', '=', openSnapshot.id)
      .where('status', '=', 'open')
      .execute();

    // ONE-020: DLL soft lock resets at the next daily reset.
    if (account.status === 'soft_locked') {
      assertEvaluationAccountTransition('soft_locked', 'active');
      await trx
        .updateTable('app.trading_accounts')
        .set({ status: 'active', updated_at: now })
        .where('id', '=', account.id)
        .execute();
      await trx
        .insertInto('app.account_state_transitions')
        .values({
          account_id: account.id,
          from_status: 'soft_locked',
          to_status: 'active',
          reason: 'daily_loss_limit_reset',
        })
        .execute();
    }

    // Re-derives today's floor from the row just finalized above — no
    // duplicated floor computation between this function and ensureTodaySnapshot.
    const today = await ensureTodaySnapshot(trx, {
      accountId: account.id,
      nominalBalance: account.nominal_balance,
      policyVersionId: policy.id,
      maximumLossRate: policy.parameters.maximum_loss_rate,
      sodBalance: eodBalance,
      sodEquity: eodBalance,
      now,
    });

    return {
      accountId: account.id,
      finalizedTradingDay: openSnapshot.trading_day,
      newTradingDay: today.trading_day,
      maximumLossFloorAfter,
      alreadyUpToDate: false,
    };
  });
}

/** Accounts with a stale 'open' snapshot (an elapsed UTC day not yet finalized) that are still live. */
export async function listAccountsDueForFinalization(db: Db, now: Date): Promise<string[]> {
  const todayDate = utcDateString(now);
  const rows = await db
    .selectFrom('app.account_daily_snapshots as ads')
    .innerJoin('app.trading_accounts as ta', 'ta.id', 'ads.account_id')
    .select('ads.account_id')
    .where('ads.status', '=', 'open')
    .where('ads.trading_day', '<', todayDate)
    .where('ta.status', 'in', ['active', 'soft_locked', 'pass_pending'])
    .execute();
  return rows.map((row) => row.account_id);
}
