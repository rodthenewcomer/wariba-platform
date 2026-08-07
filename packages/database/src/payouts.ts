import Decimal from 'decimal.js';
import {
  computeApprovedGrossBase,
  computeMaxGrossBaseFromCap,
  computeRequestedGrossBase,
  computeTraderNetCash,
  computeWaribaShare,
  resolveTraderSplitRate,
} from '@wariba/domain';
import type { Db } from './client';
import { loadPolicyById } from './policy';
import {
  asPerformancePolicy,
  closeCycleAndAdvanceInTransaction,
  evaluateCycleProgress,
  loadActiveCycle,
} from './performance';

const REJECTION = {
  ACCOUNT_NOT_ACTIVE: 'account_not_active',
  NO_ACTIVE_CYCLE: 'no_active_cycle',
  BUFFER_NOT_REACHED: 'buffer_not_reached',
  PERFORMANCE_DAYS_INCOMPLETE: 'performance_days_incomplete',
  CONSISTENCY_NON_COMPLIANT: 'consistency_non_compliant',
  OPEN_POSITION_BLOCKS_PAYOUT: 'open_position_blocks_payout',
  PENDING_ORDER_BLOCKS_PAYOUT: 'pending_order_blocks_payout',
  KYC_NOT_VERIFIED: 'kyc_not_verified',
  PAYOUT_METHOD_NOT_CONFIGURED: 'payout_method_not_configured',
  INVALID_REQUESTED_AMOUNT: 'invalid_requested_amount',
  NO_CAP_FOR_ACCOUNT_SIZE: 'no_cap_for_account_size',
} as const;
export type PayoutRejectionCode = (typeof REJECTION)[keyof typeof REJECTION];

export interface PayoutRequestSummary {
  id: string;
  accountId: string;
  cycleId: string;
  cycleNumber: number;
  status: string;
  requestedNetTraderCash: string;
  requestedGrossBase: string;
  traderSplitRate: string;
  capApplied: string;
  approvedGrossBase: string | null;
  traderNetCash: string | null;
  waribaShare: string | null;
  rejectionCode: string | null;
  provider: string | null;
  providerReference: string | null;
}

export type PayoutRequestResult =
  | { status: 'rejected'; rejectionCode: PayoutRejectionCode; request: null }
  | { status: 'pending_review'; rejectionCode: null; request: PayoutRequestSummary };

function toSummary(row: {
  id: string;
  account_id: string;
  cycle_id: string;
  cycle_number: number;
  status: string;
  requested_net_trader_cash: string;
  requested_gross_base: string;
  trader_split_rate: string;
  cap_applied: string;
  approved_gross_base: string | null;
  trader_net_cash: string | null;
  wariba_share: string | null;
  rejection_code: string | null;
  provider: string | null;
  provider_reference: string | null;
}): PayoutRequestSummary {
  return {
    id: row.id,
    accountId: row.account_id,
    cycleId: row.cycle_id,
    cycleNumber: row.cycle_number,
    status: row.status,
    requestedNetTraderCash: row.requested_net_trader_cash,
    requestedGrossBase: row.requested_gross_base,
    traderSplitRate: row.trader_split_rate,
    capApplied: row.cap_applied,
    approvedGrossBase: row.approved_gross_base,
    traderNetCash: row.trader_net_cash,
    waribaShare: row.wariba_share,
    rejectionCode: row.rejection_code,
    provider: row.provider,
    providerReference: row.provider_reference,
  };
}

/**
 * The full ELIGIBILITY checklist (Prompt 08 §16), composing Phase C's
 * cycle-scoped buffer/days/consistency progress with the account-wide
 * checks that belong here, not duplicated into evaluateCycleProgress:
 * open positions, pending orders, and the sandbox KYC/payout-method flags.
 * Re-run identically at both request time and approval time — "approve
 * while account state changes" is only a real guard if approval doesn't
 * just trust the request-time snapshot.
 */
export async function evaluatePayoutEligibility(
  trx: Db,
  accountId: string,
): Promise<{ eligible: true } | { eligible: false; rejectionCode: PayoutRejectionCode }> {
  const account = await trx
    .selectFrom('app.trading_accounts')
    .select(['status', 'kyc_sandbox_verified', 'payout_method_sandbox_configured'])
    .where('id', '=', accountId)
    .where('program_type', '=', 'WARIBA_PERFORMANCE')
    .executeTakeFirstOrThrow();
  if (account.status !== 'active') {
    return { eligible: false, rejectionCode: REJECTION.ACCOUNT_NOT_ACTIVE };
  }

  const progress = await evaluateCycleProgress(trx, accountId);
  if (!progress.bufferReached) {
    return { eligible: false, rejectionCode: REJECTION.BUFFER_NOT_REACHED };
  }
  if (progress.performanceDaysCompleted < progress.performanceDaysRequired) {
    return { eligible: false, rejectionCode: REJECTION.PERFORMANCE_DAYS_INCOMPLETE };
  }
  if (!progress.consistencyCompliant) {
    return { eligible: false, rejectionCode: REJECTION.CONSISTENCY_NON_COMPLIANT };
  }

  const openPositions = await trx
    .selectFrom('app.positions')
    .select('id')
    .where('account_id', '=', accountId)
    .where('status', '=', 'open')
    .executeTakeFirst();
  if (openPositions) {
    return { eligible: false, rejectionCode: REJECTION.OPEN_POSITION_BLOCKS_PAYOUT };
  }

  const activePendingOrder = await trx
    .selectFrom('app.pending_orders')
    .select('id')
    .where('account_id', '=', accountId)
    .where('status', '=', 'active')
    .executeTakeFirst();
  if (activePendingOrder) {
    return { eligible: false, rejectionCode: REJECTION.PENDING_ORDER_BLOCKS_PAYOUT };
  }

  if (!account.kyc_sandbox_verified) {
    return { eligible: false, rejectionCode: REJECTION.KYC_NOT_VERIFIED };
  }
  if (!account.payout_method_sandbox_configured) {
    return { eligible: false, rejectionCode: REJECTION.PAYOUT_METHOD_NOT_CONFIGURED };
  }

  return { eligible: true };
}

export interface CreatePayoutRequestParams {
  accountId: string;
  idempotencyKey: string;
  requestedNetTraderCash: string;
  now: Date;
}

/**
 * PERF-012/013 — the "REQUEST TRANSACTION": lock, re-evaluate, snapshot,
 * freeze, create, commit. Freezing is not a new account status — it's the
 * active cycle moving active -> payout_pending, which both blocks a second
 * request (the partial unique index on payout_requests) and is what a
 * future trading-command gate checks (see performance_cycles' own
 * migration doc comment).
 */
export async function createPayoutRequestInTransaction(
  trx: Db,
  params: CreatePayoutRequestParams,
): Promise<PayoutRequestResult> {
  if (new Decimal(params.requestedNetTraderCash).lessThanOrEqualTo(0)) {
    return { status: 'rejected', rejectionCode: REJECTION.INVALID_REQUESTED_AMOUNT, request: null };
  }

  const existing = await trx
    .selectFrom('app.payout_requests')
    .selectAll()
    .where('account_id', '=', params.accountId)
    .where('idempotency_key', '=', params.idempotencyKey)
    .executeTakeFirst();
  if (existing) {
    return { status: 'pending_review', rejectionCode: null, request: toSummary(existing) };
  }

  const eligibility = await evaluatePayoutEligibility(trx, params.accountId);
  if (!eligibility.eligible) {
    return { status: 'rejected', rejectionCode: eligibility.rejectionCode, request: null };
  }

  const account = await trx
    .selectFrom('app.trading_accounts')
    .select(['nominal_balance', 'policy_version_id'])
    .where('id', '=', params.accountId)
    .executeTakeFirstOrThrow();
  const policy = asPerformancePolicy(await loadPolicyById(trx, account.policy_version_id));
  const cycle = await loadActiveCycle(trx, params.accountId);
  if (!cycle) {
    return { status: 'rejected', rejectionCode: REJECTION.NO_ACTIVE_CYCLE, request: null };
  }
  const progress = await evaluateCycleProgress(trx, params.accountId);

  const capsForSize = policy.payout_caps_by_nominal_balance[account.nominal_balance];
  if (!capsForSize) {
    return { status: 'rejected', rejectionCode: REJECTION.NO_CAP_FOR_ACCOUNT_SIZE, request: null };
  }
  const cap = capsForSize[cycle.cycleNumber - 1] as string;
  const splitRate = resolveTraderSplitRate({
    cycleNumber: cycle.cycleNumber,
    maxPayoutCyclesBeforeReview: policy.max_payout_cycles_before_review,
    defaultSplitRate: policy.trader_split_rate_default,
    finalCycleSplitRate: policy.trader_split_rate_final_cycle,
  });
  const requestedGrossBase = computeRequestedGrossBase({
    requestedNetTraderCash: params.requestedNetTraderCash,
    splitRate,
  });

  const inserted = await trx
    .insertInto('app.payout_requests')
    .values({
      account_id: params.accountId,
      cycle_id: cycle.id,
      cycle_number: cycle.cycleNumber,
      idempotency_key: params.idempotencyKey,
      requested_net_trader_cash: params.requestedNetTraderCash,
      requested_gross_base: requestedGrossBase,
      trader_split_rate: splitRate,
      cap_applied: cap,
      buffer_floor_at_request: progress.bufferFloor,
      eligible_excess_at_request: progress.eligibleExcess,
      requested_at: params.now,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  await trx
    .updateTable('app.performance_cycles')
    .set({ status: 'payout_pending', updated_at: params.now })
    .where('id', '=', cycle.id)
    .execute();

  await trx
    .insertInto('app.outbox_events')
    .values({
      aggregate_type: 'payout_request',
      aggregate_id: inserted.id,
      event_type: 'payout_request.created',
      payload: JSON.stringify({ accountId: params.accountId, cycleNumber: cycle.cycleNumber }),
    })
    .execute();

  return { status: 'pending_review', rejectionCode: null, request: toSummary(inserted) };
}

export interface ReviewPayoutRequestParams {
  payoutRequestId: string;
  staffUserId: string;
  now: Date;
}

/**
 * CONTROL REVIEW — revalidates eligibility fresh (not the request-time
 * snapshot) before approving. If the account is no longer eligible (e.g.
 * it soft-locked between request and review), rejects with a structured
 * reason instead of approving stale state — "no discretionary blank
 * rejection" from the original prompt text, satisfied by always attaching
 * a rejection code either way.
 */
export async function approvePayoutRequestInTransaction(
  trx: Db,
  params: ReviewPayoutRequestParams,
): Promise<PayoutRequestSummary> {
  const request = await trx
    .selectFrom('app.payout_requests')
    .selectAll()
    .where('id', '=', params.payoutRequestId)
    .where('status', '=', 'pending_review')
    .executeTakeFirstOrThrow(
      () => new Error(`Payout request ${params.payoutRequestId} is not pending review.`),
    );

  const eligibility = await evaluatePayoutEligibility(trx, request.account_id);
  if (!eligibility.eligible) {
    const rejected = await trx
      .updateTable('app.payout_requests')
      .set({
        status: 'rejected',
        rejection_code: eligibility.rejectionCode,
        reviewed_at: params.now,
        reviewed_by: params.staffUserId,
        updated_at: params.now,
      })
      .where('id', '=', request.id)
      .returningAll()
      .executeTakeFirstOrThrow();
    await trx
      .updateTable('app.performance_cycles')
      .set({ status: 'active', updated_at: params.now })
      .where('id', '=', request.cycle_id)
      .execute();
    return toSummary(rejected);
  }

  const progress = await evaluateCycleProgress(trx, request.account_id);
  const maxGrossBaseFromCap = computeMaxGrossBaseFromCap({
    cap: request.cap_applied,
    splitRate: request.trader_split_rate,
  });
  const approvedGrossBase = computeApprovedGrossBase({
    eligibleExcess: progress.eligibleExcess,
    requestedGrossBase: request.requested_gross_base,
    maxGrossBaseFromCap,
  });
  const traderNetCash = computeTraderNetCash({
    approvedGrossBase,
    splitRate: request.trader_split_rate,
  });
  const waribaShare = computeWaribaShare({ approvedGrossBase, traderNetCash });
  const providerReference = `wariba-payout:${request.id}`;

  const approved = await trx
    .updateTable('app.payout_requests')
    .set({
      status: 'processing',
      approved_gross_base: approvedGrossBase,
      trader_net_cash: traderNetCash,
      wariba_share: waribaShare,
      provider: 'mock',
      provider_reference: providerReference,
      reviewed_at: params.now,
      reviewed_by: params.staffUserId,
      updated_at: params.now,
    })
    .where('id', '=', request.id)
    .returningAll()
    .executeTakeFirstOrThrow();

  await trx
    .insertInto('app.outbox_events')
    .values({
      aggregate_type: 'payout_request',
      aggregate_id: request.id,
      event_type: 'payout_request.approved',
      payload: JSON.stringify({ accountId: request.account_id, approvedGrossBase }),
    })
    .execute();

  return toSummary(approved);
}

export async function rejectPayoutRequestInTransaction(
  trx: Db,
  params: ReviewPayoutRequestParams & { rejectionCode: string },
): Promise<PayoutRequestSummary> {
  const request = await trx
    .selectFrom('app.payout_requests')
    .selectAll()
    .where('id', '=', params.payoutRequestId)
    .where('status', 'in', ['pending_review', 'needs_information'])
    .executeTakeFirstOrThrow(
      () => new Error(`Payout request ${params.payoutRequestId} is not open for review.`),
    );

  const rejected = await trx
    .updateTable('app.payout_requests')
    .set({
      status: 'rejected',
      rejection_code: params.rejectionCode,
      reviewed_at: params.now,
      reviewed_by: params.staffUserId,
      updated_at: params.now,
    })
    .where('id', '=', request.id)
    .returningAll()
    .executeTakeFirstOrThrow();

  await trx
    .updateTable('app.performance_cycles')
    .set({ status: 'active', updated_at: params.now })
    .where('id', '=', request.cycle_id)
    .execute();

  return toSummary(rejected);
}

/**
 * The sandbox provider's own settlement confirmation — a separate call
 * from approval (mirrors PROCESSING -> PAID being genuinely async against
 * any real provider). Idempotent: a second call against an
 * already-'paid' request is a safe no-op, satisfying both "worker retry"
 * and "provider replay" without a separate idempotency table — the
 * request's own status is the guard.
 */
export async function settlePayoutProviderInTransaction(
  trx: Db,
  params: { payoutRequestId: string; now: Date },
): Promise<PayoutRequestSummary> {
  const request = await trx
    .selectFrom('app.payout_requests')
    .selectAll()
    .where('id', '=', params.payoutRequestId)
    .executeTakeFirstOrThrow();

  if (request.status === 'paid') {
    return toSummary(request); // already settled — no duplicate debit, no duplicate cycle close.
  }
  if (request.status !== 'processing') {
    throw new Error(
      `Payout request ${params.payoutRequestId} is '${request.status}', not 'processing' — cannot settle.`,
    );
  }

  const paid = await trx
    .updateTable('app.payout_requests')
    .set({ status: 'paid', paid_at: params.now, updated_at: params.now })
    .where('id', '=', request.id)
    .where('status', '=', 'processing')
    .returningAll()
    .executeTakeFirstOrThrow();

  // PERF-014 — the full approved gross base debited from the simulated
  // account, in the same transaction as the status flip and the cycle
  // close below: no window where the request shows 'paid' without the
  // ledger (or vice versa).
  await trx
    .insertInto('app.trading_ledger_entries')
    .values({
      account_id: request.account_id,
      entry_type: 'payout_debit',
      amount: `-${paid.approved_gross_base as string}`,
      reference_type: 'payout_request',
      reference_id: request.id,
      occurred_at: params.now,
    })
    .execute();

  await closeCycleAndAdvanceInTransaction(trx, {
    accountId: request.account_id,
    cycleId: request.cycle_id,
    now: params.now,
  });

  await trx
    .insertInto('app.outbox_events')
    .values({
      aggregate_type: 'payout_request',
      aggregate_id: request.id,
      event_type: 'payout_request.paid',
      payload: JSON.stringify({
        accountId: request.account_id,
        approvedGrossBase: paid.approved_gross_base,
      }),
    })
    .execute();

  return toSummary(paid);
}

export interface PayoutRequestHistoryEntry {
  id: string;
  cycleNumber: number;
  status: string;
  requestedNetTraderCash: string;
  approvedGrossBase: string | null;
  traderNetCash: string | null;
  waribaShare: string | null;
  rejectionCode: string | null;
  requestedAt: Date;
  paidAt: Date | null;
}

/** Trader-facing payout history for the account snapshot — services/realtime/src/snapshot.ts, WARIBA_PERFORMANCE accounts only. Newest first, same convention as recentOrders/recentFills. */
export async function loadPayoutRequestsForAccount(
  trx: Db,
  accountId: string,
): Promise<PayoutRequestHistoryEntry[]> {
  const rows = await trx
    .selectFrom('app.payout_requests')
    .select([
      'id',
      'cycle_number',
      'status',
      'requested_net_trader_cash',
      'approved_gross_base',
      'trader_net_cash',
      'wariba_share',
      'rejection_code',
      'requested_at',
      'paid_at',
    ])
    .where('account_id', '=', accountId)
    .orderBy('requested_at', 'desc')
    .limit(20)
    .execute();
  return rows.map((row) => ({
    id: row.id,
    cycleNumber: row.cycle_number,
    status: row.status,
    requestedNetTraderCash: row.requested_net_trader_cash,
    approvedGrossBase: row.approved_gross_base,
    traderNetCash: row.trader_net_cash,
    waribaShare: row.wariba_share,
    rejectionCode: row.rejection_code,
    requestedAt: row.requested_at,
    paidAt: row.paid_at,
  }));
}
