import { randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import {
  computeBestDayRatio,
  computeEligibleExcess,
  computePayoutBufferFloor,
  computePerformanceDayThreshold,
  isBestDayCompliant,
  isPayoutBufferReached,
  isPerformanceDayQualified,
} from '@wariba/domain';
import type { LoadedPolicy, PerformancePolicyParameters } from '@wariba/policies';
import { loadLatestSandboxSymbolSpecSet } from './activation';
import type { Db } from './client';
import { loadAccountBalanceProjection } from './program-eligibility';
import { loadPolicyById, loadPublishedPolicy } from './policy';

export interface ActivatePerformanceAccountParams {
  evaluationAccountId: string;
  userId: string;
  nominalBalance: string;
  currency: string;
  now?: () => Date;
}

export interface ActivatedPerformanceAccount {
  id: string;
  publicId: string;
  status: string;
  alreadyExisted: boolean;
}

/**
 * Prompt 08 Phase B, PERF-020 — "une seule relation Performance issue d'une
 * Evaluation réussie". Called from inside the same transaction that just
 * moved an Evaluation account pass_pending -> passed
 * (packages/database/src/risk.ts) so the pass and the new Performance
 * account either both land or neither does — no window where an account
 * shows as "passed" without its Performance account existing yet.
 *
 * Idempotent under retry the same way activateEvaluationAccountInTransaction
 * is: source_evaluation_account_id carries a UNIQUE constraint as the final
 * database invariant, this lookup is just the fast path that avoids a
 * duplicate-key error under normal (non-racing) retry.
 */
export async function activatePerformanceAccountInTransaction(
  trx: Db,
  params: ActivatePerformanceAccountParams,
): Promise<ActivatedPerformanceAccount> {
  const timestamp = params.now?.() ?? new Date();

  const existing = await trx
    .selectFrom('app.trading_accounts')
    .select(['id', 'public_id', 'status'])
    .where('source_evaluation_account_id', '=', params.evaluationAccountId)
    .executeTakeFirst();

  if (existing) {
    return {
      id: existing.id,
      publicId: existing.public_id,
      status: existing.status,
      alreadyExisted: true,
    };
  }

  const policyVersion = await loadPublishedPolicy(trx, 'WARIBA_PERFORMANCE');
  const symbolSpecSet = await loadLatestSandboxSymbolSpecSet(trx);

  const publicId = `PERF-${params.nominalBalance.split('.')[0]}-${randomUUID().slice(0, 8).toUpperCase()}`;

  const account = await trx
    .insertInto('app.trading_accounts')
    .values({
      public_id: publicId,
      user_id: params.userId,
      source_purchase_order_id: null,
      source_evaluation_account_id: params.evaluationAccountId,
      program_type: 'WARIBA_PERFORMANCE',
      nominal_balance: params.nominalBalance,
      currency: params.currency,
      status: 'active',
      policy_version_id: policyVersion.id,
      symbol_spec_set_id: symbolSpecSet.id,
      activated_at: timestamp,
    })
    .returning(['id', 'public_id', 'status'])
    .executeTakeFirstOrThrow();

  await trx
    .insertInto('app.account_state_transitions')
    .values({
      account_id: account.id,
      from_status: 'pending_activation',
      to_status: 'active',
      reason: 'evaluation_passed',
    })
    .execute();

  // No purchase_order-derived initial_balance ledger entry — nothing was
  // purchased. This is the Performance nominal reset (TRD-... none yet;
  // see DECISION_LOG PERF-020's "nominal reset" clause): a fresh ledger,
  // not the Evaluation account's carried-over balance.
  await trx
    .insertInto('app.trading_ledger_entries')
    .values({
      account_id: account.id,
      entry_type: 'initial_balance',
      amount: params.nominalBalance,
      currency: params.currency,
    })
    .execute();

  await trx
    .insertInto('app.outbox_events')
    .values({
      aggregate_type: 'trading_account',
      aggregate_id: account.id,
      event_type: 'performance.activated',
      payload: JSON.stringify({
        accountId: account.id,
        publicId: account.public_id,
        userId: params.userId,
        sourceEvaluationAccountId: params.evaluationAccountId,
      }),
    })
    .execute();

  // PERF-020's "cycle #1" clause — same transaction, same all-or-nothing
  // guarantee as everything else above.
  await trx
    .insertInto('app.performance_cycles')
    .values({ account_id: account.id, cycle_number: 1, opened_at: timestamp })
    .execute();

  return {
    id: account.id,
    publicId: account.public_id,
    status: account.status,
    alreadyExisted: false,
  };
}

/** Loads a user's active Performance account, if any — used by snapshot/UI code that needs to know whether one exists without caring about its id ahead of time. */
export async function findActivePerformanceAccountForUser(
  trx: Db,
  userId: string,
): Promise<{ id: string; publicId: string } | null> {
  const row = await trx
    .selectFrom('app.trading_accounts')
    .select(['id', 'public_id'])
    .where('user_id', '=', userId)
    .where('program_type', '=', 'WARIBA_PERFORMANCE')
    .where('status', 'in', ['active', 'soft_locked'])
    .executeTakeFirst();
  return row ? { id: row.id, publicId: row.public_id } : null;
}

/** Runtime-checked narrowing — a WARIBA_PERFORMANCE policy_versions row always parses against performancePolicyParametersSchema (loader.ts dispatches on `program`); this just gives call sites the narrower static type without a bare cast. */
export function asPerformancePolicy(policy: LoadedPolicy): PerformancePolicyParameters {
  if (policy.program !== 'WARIBA_PERFORMANCE') {
    throw new Error(`Expected a WARIBA_PERFORMANCE policy, got ${policy.program}.`);
  }
  return policy.parameters as PerformancePolicyParameters;
}

export interface PerformanceCycle {
  id: string;
  accountId: string;
  cycleNumber: number;
  status: 'active' | 'payout_pending' | 'closed';
  openedAt: Date;
  closedAt: Date | null;
  version: number;
}

/** The single non-closed cycle for an account — the partial unique index on app.performance_cycles guarantees there is never more than one. */
export async function loadActiveCycle(
  trx: Db,
  accountId: string,
): Promise<PerformanceCycle | null> {
  const row = await trx
    .selectFrom('app.performance_cycles')
    .selectAll()
    .where('account_id', '=', accountId)
    .where('status', '!=', 'closed')
    .executeTakeFirst();
  if (!row) return null;
  return {
    id: row.id,
    accountId: row.account_id,
    cycleNumber: row.cycle_number,
    status: row.status,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    version: row.version,
  };
}

function tradingDayOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Finalized daily snapshots whose trading_day falls inside the cycle's own
 * date range — a day belongs to exactly one cycle purely by when it
 * finalized, never by a separate "consumed" flag (see the migration's own
 * doc comment). Only finalized days are ever eligible for Performance
 * Days/Best Day — same rule the Evaluation risk engine already enforces
 * (packages/policies/src/risk-engine.ts).
 */
async function loadCycleDailySnapshots(
  trx: Db,
  accountId: string,
  cycle: Pick<PerformanceCycle, 'openedAt' | 'closedAt'>,
) {
  let query = trx
    .selectFrom('app.account_daily_snapshots')
    .select(['trading_day', 'eligible_realized_net_profit_for_day', 'realized_net_profit_for_day'])
    .where('account_id', '=', accountId)
    .where('status', '=', 'finalized')
    .where('trading_day', '>=', tradingDayOf(cycle.openedAt));
  if (cycle.closedAt) {
    query = query.where('trading_day', '<', tradingDayOf(cycle.closedAt));
  }
  return query.execute();
}

export interface CycleProgress {
  cycleNumber: number;
  cycleStatus: PerformanceCycle['status'];
  /** The program-eligible realized balance this progress was computed from — lets a UI show "how close" even below the floor, which eligibleExcess alone (clamped to 0) cannot. */
  realizedBalance: string;
  bufferFloor: string;
  eligibleExcess: string;
  bufferReached: boolean;
  performanceDayThreshold: string;
  performanceDaysCompleted: number;
  performanceDaysRequired: number;
  consistencyRatio: string | null;
  consistencyCompliant: boolean;
  /** Raw inputs behind consistencyRatio — a consistency-meter UI needs these, not just the ratio, the same way risk-view.ts's bestDay exposes them for WARIBA ONE. */
  bestDayProfit: string;
  positiveDaysProfitSum: string;
  consistencyLimitRatio: string;
}

/**
 * Prompt 08 Phase C — buffer/Performance-Days/consistency progress toward
 * a payout, scoped to the account's current cycle. Deliberately does NOT
 * check open positions, pending orders, account lock/breach, KYC, or an
 * already-active payout request — those are Phase D's full payout
 * eligibility endpoint (§16), which composes this with the equity/position
 * checks risk.ts already has rather than duplicating them here.
 */
export async function evaluateCycleProgress(trx: Db, accountId: string): Promise<CycleProgress> {
  const account = await trx
    .selectFrom('app.trading_accounts')
    .select(['nominal_balance', 'policy_version_id'])
    .where('id', '=', accountId)
    .where('program_type', '=', 'WARIBA_PERFORMANCE')
    .executeTakeFirstOrThrow(
      () => new Error(`No WARIBA_PERFORMANCE account found for id ${accountId}.`),
    );
  const cycle = await loadActiveCycle(trx, accountId);
  if (!cycle) {
    throw new Error(`Account ${accountId} has no active performance cycle.`);
  }
  const policy = asPerformancePolicy(await loadPolicyById(trx, account.policy_version_id));
  const projection = await loadAccountBalanceProjection(trx, accountId);

  const bufferFloor = computePayoutBufferFloor({
    nominalBalance: account.nominal_balance,
    permanentBufferRate: policy.permanent_buffer_rate,
  });
  const performanceDayThreshold = computePerformanceDayThreshold({
    nominalBalance: account.nominal_balance,
    performanceDayThresholdRate: policy.performance_day_threshold_rate,
  });

  const cycleDays = await loadCycleDailySnapshots(trx, accountId, cycle);
  const eligibleProfitForDay = (day: {
    eligible_realized_net_profit_for_day: string | null;
    realized_net_profit_for_day: string | null;
  }): string => day.eligible_realized_net_profit_for_day ?? day.realized_net_profit_for_day ?? '0';

  const qualifyingDays = cycleDays.filter((day) =>
    isPerformanceDayQualified({
      eligibleRealizedNetProfitForDay: eligibleProfitForDay(day),
      performanceDayThreshold,
    }),
  );

  const positiveDays = cycleDays.filter((day) =>
    new Decimal(eligibleProfitForDay(day)).greaterThan(0),
  );
  const sumOfPositiveDayProfits = positiveDays
    .reduce((sum, day) => sum.plus(eligibleProfitForDay(day)), new Decimal(0))
    .toFixed(2);
  const bestDayProfit = positiveDays
    .reduce((max, day) => Decimal.max(max, eligibleProfitForDay(day)), new Decimal(0))
    .toFixed(2);
  const consistencyRatio = computeBestDayRatio({
    bestProfitableFinalizedDayProfit: bestDayProfit,
    sumOfPositiveDayProfits,
  });

  return {
    cycleNumber: cycle.cycleNumber,
    cycleStatus: cycle.status,
    realizedBalance: projection.programEligibleBalance,
    bufferFloor,
    eligibleExcess: computeEligibleExcess({
      realizedBalance: projection.programEligibleBalance,
      bufferFloor,
    }),
    bufferReached: isPayoutBufferReached({
      realizedBalance: projection.programEligibleBalance,
      bufferFloor,
    }),
    performanceDayThreshold,
    performanceDaysCompleted: qualifyingDays.length,
    performanceDaysRequired: policy.performance_days_required_per_payout,
    consistencyRatio,
    consistencyCompliant: isBestDayCompliant({
      bestDayRatio: consistencyRatio,
      maxRatio: policy.best_day_max_ratio,
    }),
    bestDayProfit,
    positiveDaysProfitSum: sumOfPositiveDayProfits,
    consistencyLimitRatio: policy.best_day_max_ratio,
  };
}

/**
 * PERF-018/031 — called once a cycle's payout is marked paid (Phase D).
 * Closes the given cycle and either opens cycle N+1 or, if this was the
 * last cycle before review, creates the WARIBA Review case instead — never
 * both, never neither. Caller must already hold the account row lock
 * (same convention as every other locked-account mutation in this file).
 */
export async function closeCycleAndAdvanceInTransaction(
  trx: Db,
  params: { accountId: string; cycleId: string; now: Date },
): Promise<{ nextCycleNumber: number | null; reviewCaseCreated: boolean }> {
  const account = await trx
    .selectFrom('app.trading_accounts')
    .select(['policy_version_id'])
    .where('id', '=', params.accountId)
    .executeTakeFirstOrThrow();
  const policy = asPerformancePolicy(await loadPolicyById(trx, account.policy_version_id));

  const closedCycle = await trx
    .updateTable('app.performance_cycles')
    .set({ status: 'closed', closed_at: params.now, updated_at: params.now })
    .where('id', '=', params.cycleId)
    .where('account_id', '=', params.accountId)
    .where('status', '!=', 'closed')
    .returning(['cycle_number'])
    .executeTakeFirstOrThrow(
      () => new Error(`Cycle ${params.cycleId} was not open — cannot close it twice.`),
    );

  if (closedCycle.cycle_number >= policy.max_payout_cycles_before_review) {
    await trx
      .insertInto('app.performance_review_cases')
      .values({ account_id: params.accountId, opened_at: params.now })
      .onConflict((oc) => oc.column('account_id').doNothing())
      .execute();
    return { nextCycleNumber: null, reviewCaseCreated: true };
  }

  const nextCycleNumber = closedCycle.cycle_number + 1;
  await trx
    .insertInto('app.performance_cycles')
    .values({ account_id: params.accountId, cycle_number: nextCycleNumber, opened_at: params.now })
    .onConflict((oc) => oc.columns(['account_id', 'cycle_number']).doNothing())
    .execute();
  return { nextCycleNumber, reviewCaseCreated: false };
}

/**
 * Prompt 08 Phase G — the only writer of these two columns (see their own
 * doc comment in schema.ts: "Staff-set via Control, never trader-set").
 * Partial on purpose: Control can flip either flag independently without
 * clobbering the other.
 */
export async function setPerformanceAccountComplianceFlags(
  trx: Db,
  params: {
    accountId: string;
    kycVerified?: boolean;
    payoutMethodConfigured?: boolean;
    now: Date;
  },
): Promise<void> {
  const update: { kyc_sandbox_verified?: boolean; payout_method_sandbox_configured?: boolean } = {};
  if (params.kycVerified !== undefined) update.kyc_sandbox_verified = params.kycVerified;
  if (params.payoutMethodConfigured !== undefined) {
    update.payout_method_sandbox_configured = params.payoutMethodConfigured;
  }
  if (Object.keys(update).length === 0) return;

  await trx
    .updateTable('app.trading_accounts')
    .set({ ...update, updated_at: params.now })
    .where('id', '=', params.accountId)
    .where('program_type', '=', 'WARIBA_PERFORMANCE')
    .execute();
}

export interface OpenPerformanceReviewCase {
  id: string;
  accountId: string;
  accountPublicId: string;
  nominalBalance: string;
  traderFirstName: string;
  traderLastName: string;
  openedAt: Date;
}

/**
 * Prompt 08 Phase G — read-only by design: PERF-018/031's own migration
 * comment marks the review case's actual outcome workflow as "deliberately
 * OPEN" (PERF-021/022, undecided). Control can only see who is waiting,
 * not resolve the case, until that decision lands.
 */
export async function loadOpenPerformanceReviewCases(
  trx: Db,
): Promise<OpenPerformanceReviewCase[]> {
  const rows = await trx
    .selectFrom('app.performance_review_cases')
    .innerJoin(
      'app.trading_accounts',
      'app.trading_accounts.id',
      'app.performance_review_cases.account_id',
    )
    .innerJoin('app.user_profiles', 'app.user_profiles.user_id', 'app.trading_accounts.user_id')
    .select([
      'app.performance_review_cases.id',
      'app.performance_review_cases.account_id',
      'app.trading_accounts.public_id as account_public_id',
      'app.trading_accounts.nominal_balance',
      'app.user_profiles.first_name as trader_first_name',
      'app.user_profiles.last_name as trader_last_name',
      'app.performance_review_cases.opened_at',
    ])
    .where('app.performance_review_cases.status', '=', 'open')
    .orderBy('app.performance_review_cases.opened_at', 'asc')
    .execute();

  return rows.map((row) => ({
    id: row.id,
    accountId: row.account_id,
    accountPublicId: row.account_public_id,
    nominalBalance: row.nominal_balance,
    traderFirstName: row.trader_first_name,
    traderLastName: row.trader_last_name,
    openedAt: row.opened_at,
  }));
}
