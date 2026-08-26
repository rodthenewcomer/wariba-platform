import Decimal from 'decimal.js';
import {
  assertEvaluationAccountTransition,
  computeDailyReference,
  computeInitialMaximumLossFloor,
  computeNextMaximumLossFloor,
} from '@wariba/domain';
import { resolveProfitEligibilityPolicy, type LoadedPolicy } from '@wariba/policies';
import { lockAccount, type LockedAccount } from './accounts';
import type { Db } from './client';
import { loadPolicyById } from './policy';
import { loadAccountBalanceProjection } from './program-eligibility';

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
  programSodBalance: string;
  programSodEquity: string;
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
  const programSodBalance = isFirstEverEvaluation
    ? params.nominalBalance
    : params.programSodBalance;
  const programSodEquity = isFirstEverEvaluation ? params.nominalBalance : params.programSodEquity;

  const dailyReference = computeDailyReference({
    balanceAtReset: programSodBalance,
    equityAtReset: programSodEquity,
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
      program_sod_balance: programSodBalance,
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

/**
 * Finalizes the account's most recent still-`open` daily snapshot if (and
 * only if) its `trading_day` has fully elapsed — the actual boundary-
 * crossing logic shared by the daily worker (`finalizeDailyBoundaryForAccount`)
 * and every real-time risk evaluation (`evaluateAndApplyAccountRiskInTransaction`
 * in risk.ts).
 *
 * Calling this before `ensureTodaySnapshot` is what prevents the race that
 * used to exist here: `ensureTodaySnapshot` only ever looks for a row
 * matching *today's* trading_day, so if a trade landed on a new UTC day
 * before the worker had finalized the previous one, it would silently
 * bootstrap a fresh "today" row from the live current balance — orphaning
 * the true prior-day snapshot forever (it becomes invisible to both
 * `ensureTodaySnapshot`, which only looks for today, and
 * `finalizeDailyBoundaryForAccount`, which only ever finalizes the *most
 * recent* open row by trading_day, and today's newer row would now shadow
 * it) and permanently corrupting the Maximum-Loss floor ratchet / Best-Day
 * tracking for that account. Every caller that might create or read a
 * daily snapshot in the risk-evaluation transaction must call this first.
 *
 * Returns null when nothing needed finalizing (today's own row, if any,
 * still needs `ensureTodaySnapshot` from the caller).
 */
async function finalizeElapsedDailyBoundaryInTransaction(
  trx: Db,
  params: {
    account: LockedAccount;
    policy: LoadedPolicy;
    eligibilityEnabled: boolean;
    now: Date;
  },
): Promise<{
  finalizedTradingDay: string;
  maximumLossFloorAfter: string;
  eodBalance: string;
  programEodBalance: string;
} | null> {
  const { account, policy, eligibilityEnabled, now } = params;
  const todayDate = utcDateString(now);

  const openSnapshot = await trx
    .selectFrom('app.account_daily_snapshots')
    .selectAll()
    .where('account_id', '=', account.id)
    .where('status', '=', 'open')
    .orderBy('trading_day', 'desc')
    .executeTakeFirst();

  if (!openSnapshot || openSnapshot.trading_day >= todayDate) {
    return null;
  }

  // openSnapshot.trading_day < todayDate — that UTC day has fully elapsed.
  // If multiple days elapsed with no trading in between (a dormant
  // account the worker didn't reach for a while), the balance — and
  // therefore the floor ratchet — is provably unchanged across the empty
  // days, so this collapses straight to today rather than materializing
  // a row per skipped day.
  const boundaryInstant = new Date(`${addOneUtcDay(openSnapshot.trading_day)}T00:00:00.000Z`);
  const boundaryProjection = await loadAccountBalanceProjection(
    trx,
    account.id,
    boundaryInstant,
    eligibilityEnabled,
  );
  const eodBalance = boundaryProjection.accountBalance;
  const programEodBalance = boundaryProjection.programEligibleBalance;
  const realizedNetProfitForDay = new Decimal(eodBalance)
    .minus(openSnapshot.sod_balance)
    .toFixed(2);
  const eligibleRealizedNetProfitForDay = new Decimal(programEodBalance)
    .minus(openSnapshot.program_sod_balance)
    .toFixed(2);

  const previousHighest = await trx
    .selectFrom('app.account_daily_snapshots')
    .select(['highest_eod_balance_after', 'highest_program_eod_balance_after'])
    .where('account_id', '=', account.id)
    .where('status', '=', 'finalized')
    .orderBy('trading_day', 'desc')
    .executeTakeFirst();
  const highestEodBalanceAfter = Decimal.max(
    previousHighest?.highest_eod_balance_after ?? account.nominal_balance,
    eodBalance,
  ).toFixed(2);
  const highestProgramEodBalanceAfter = Decimal.max(
    previousHighest?.highest_program_eod_balance_after ?? account.nominal_balance,
    programEodBalance,
  ).toFixed(2);

  const maximumLossFloorAfter = computeNextMaximumLossFloor({
    previousFloor: openSnapshot.maximum_loss_floor_before,
    highestEodBalance: highestProgramEodBalanceAfter,
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
      program_eod_balance: programEodBalance,
      maximum_loss_floor_after: maximumLossFloorAfter,
      highest_eod_balance_after: highestEodBalanceAfter,
      highest_program_eod_balance_after: highestProgramEodBalanceAfter,
      realized_net_profit_for_day: realizedNetProfitForDay,
      eligible_realized_net_profit_for_day: eligibleRealizedNetProfitForDay,
      finalized_at: now,
    })
    .where('id', '=', openSnapshot.id)
    .where('status', '=', 'open')
    .returning(['id'])
    .executeTakeFirstOrThrow(
      () =>
        new Error(
          `finalizeElapsedDailyBoundaryInTransaction: snapshot ${openSnapshot.id} for account ` +
            `${account.id} was no longer 'open' — concurrently finalized by another process. ` +
            "lockAccount's FOR UPDATE should make this unreachable; treat as a serialization bug.",
        ),
    );

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
        // This reset belongs to the boundary being crossed, so it is stamped
        // with the same `now` as the snapshot that closed the day.
        occurred_at: now,
      })
      .execute();
  }

  return {
    finalizedTradingDay: openSnapshot.trading_day,
    maximumLossFloorAfter,
    eodBalance,
    programEodBalance,
  };
}

/**
 * Ensures the account's daily-snapshot chain is caught up to `now`: finalizes
 * an elapsed prior-day snapshot if one exists, then guarantees a row for
 * today. Safe (and idempotent) to call from both the daily worker and every
 * real-time risk evaluation — see `finalizeElapsedDailyBoundaryInTransaction`'s
 * doc comment for why calling this before `ensureTodaySnapshot` matters.
 */
export async function ensureDailyBoundaryCaughtUpInTransaction(
  trx: Db,
  params: { account: LockedAccount; policy: LoadedPolicy; eligibilityEnabled: boolean; now: Date },
): Promise<void> {
  await finalizeElapsedDailyBoundaryInTransaction(trx, params);
}

export async function finalizeDailyBoundaryForAccount(
  db: Db,
  params: { accountId: string; clock: () => Date },
): Promise<FinalizeDailyBoundaryResult> {
  return db.transaction().execute(async (trx) => {
    const account = await lockAccount(trx, params.accountId);
    const policy = await loadPolicyById(trx, account.policy_version_id);
    const eligibilityPolicy = resolveProfitEligibilityPolicy(policy.parameters);
    const now = params.clock();

    const finalized = await finalizeElapsedDailyBoundaryInTransaction(trx, {
      account,
      policy,
      eligibilityEnabled: eligibilityPolicy.enabled,
      now,
    });

    if (!finalized) {
      // Nothing has elapsed yet — only bootstrap today's row if missing.
      const projection = await loadAccountBalanceProjection(
        trx,
        account.id,
        undefined,
        eligibilityPolicy.enabled,
      );
      const today = await ensureTodaySnapshot(trx, {
        accountId: account.id,
        nominalBalance: account.nominal_balance,
        policyVersionId: policy.id,
        maximumLossRate: policy.parameters.maximum_loss_rate,
        sodBalance: projection.accountBalance,
        sodEquity: projection.accountBalance,
        programSodBalance: projection.programEligibleBalance,
        programSodEquity: projection.programEligibleBalance,
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

    // Carries forward the EOD balance finalizeElapsed... just wrote as the
    // new day's SOD — no duplicated floor computation or redundant re-read
    // between this function and ensureTodaySnapshot.
    const today = await ensureTodaySnapshot(trx, {
      accountId: account.id,
      nominalBalance: account.nominal_balance,
      policyVersionId: policy.id,
      maximumLossRate: policy.parameters.maximum_loss_rate,
      sodBalance: finalized.eodBalance,
      sodEquity: finalized.eodBalance,
      programSodBalance: finalized.programEodBalance,
      programSodEquity: finalized.programEodBalance,
      now,
    });

    return {
      accountId: account.id,
      finalizedTradingDay: finalized.finalizedTradingDay,
      newTradingDay: today.trading_day,
      maximumLossFloorAfter: finalized.maximumLossFloorAfter,
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
