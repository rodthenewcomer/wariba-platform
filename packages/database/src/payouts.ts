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
import { reconcileAccountFinancialStateInTransaction } from './financial-reconciliation';

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
  INTEGRITY_HOLD: 'integrity_hold',
} as const;
export type PayoutRejectionCode = (typeof REJECTION)[keyof typeof REJECTION];

const PAYOUT_PROVIDER_STATUSES = ['pending', 'processing', 'paid', 'failed', 'returned'] as const;
const PAYOUT_PROVIDER_STATUS_SET = new Set<string>(PAYOUT_PROVIDER_STATUSES);
export type PayoutProviderStatus = (typeof PAYOUT_PROVIDER_STATUSES)[number];

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
  providerIdempotencyKey: string | null;
  providerStatus: PayoutProviderStatus | null;
  providerSubmissionResult: unknown | null;
  providerSubmittedAt: Date | null;
  providerReconciliationResult: unknown | null;
  providerReconciledAt: Date | null;
  providerReconciledBy: string | null;
  eligibilitySnapshot: unknown;
  calculationTimestamp: Date | null;
  reversedAt: Date | null;
  reversedBy: string | null;
  reversalReason: string | null;
  reversalEvidence: unknown | null;
  reversalLedgerEntryId: string | null;
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
  provider_idempotency_key: string | null;
  provider_status: PayoutProviderStatus | null;
  provider_submission_result: unknown | null;
  provider_submitted_at: Date | null;
  provider_reconciliation_result: unknown | null;
  provider_reconciled_at: Date | null;
  provider_reconciled_by: string | null;
  eligibility_snapshot: unknown;
  calculation_timestamp: Date | null;
  reversed_at: Date | null;
  reversed_by: string | null;
  reversal_reason: string | null;
  reversal_evidence: unknown | null;
  reversal_ledger_entry_id: string | null;
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
    providerIdempotencyKey: row.provider_idempotency_key,
    providerStatus: row.provider_status,
    providerSubmissionResult: row.provider_submission_result,
    providerSubmittedAt: row.provider_submitted_at,
    providerReconciliationResult: row.provider_reconciliation_result,
    providerReconciledAt: row.provider_reconciled_at,
    providerReconciledBy: row.provider_reconciled_by,
    eligibilitySnapshot: row.eligibility_snapshot,
    calculationTimestamp: row.calculation_timestamp,
    reversedAt: row.reversed_at,
    reversedBy: row.reversed_by,
    reversalReason: row.reversal_reason,
    reversalEvidence: row.reversal_evidence,
    reversalLedgerEntryId: row.reversal_ledger_entry_id,
  };
}

function assertPayoutProviderStatus(status: string): asserts status is PayoutProviderStatus {
  if (!PAYOUT_PROVIDER_STATUS_SET.has(status)) {
    throw new Error('Unsupported payout provider status: ' + status + '.');
  }
}

function serializeProviderResult(result: unknown): string {
  const serialized = JSON.stringify(result);
  if (!serialized) {
    throw new Error('Payout provider result must be serializable.');
  }
  return serialized;
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
    .select([
      'status',
      'kyc_sandbox_verified',
      'payout_method_sandbox_configured',
      'integrity_hold',
    ])
    .where('id', '=', accountId)
    .where('program_type', '=', 'WARIBA_PERFORMANCE')
    .executeTakeFirstOrThrow();
  if (account.status !== 'active') {
    return { eligible: false, rejectionCode: REJECTION.ACCOUNT_NOT_ACTIVE };
  }
  if (account.integrity_hold) {
    return { eligible: false, rejectionCode: REJECTION.INTEGRITY_HOLD };
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

  const reconciliation = await reconcileAccountFinancialStateInTransaction(trx, {
    accountId: params.accountId,
    executedBy: null,
    now: params.now,
  });
  if (!reconciliation.matches) {
    return { status: 'rejected', rejectionCode: REJECTION.INTEGRITY_HOLD, request: null };
  }

  const eligibility = await evaluatePayoutEligibility(trx, params.accountId);
  if (!eligibility.eligible) {
    return { status: 'rejected', rejectionCode: eligibility.rejectionCode, request: null };
  }

  const account = await trx
    .selectFrom('app.trading_accounts')
    .select([
      'nominal_balance',
      'policy_version_id',
      'status',
      'kyc_sandbox_verified',
      'payout_method_sandbox_configured',
    ])
    .where('id', '=', params.accountId)
    .executeTakeFirstOrThrow();
  const loadedPolicy = await loadPolicyById(trx, account.policy_version_id);
  const policy = asPerformancePolicy(loadedPolicy);
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
    ...(policy.payout_split_schedule ? { splitSchedule: policy.payout_split_schedule } : {}),
  });
  const requestedGrossBase = computeRequestedGrossBase({
    requestedNetTraderCash: params.requestedNetTraderCash,
    splitRate,
  });
  const requestedNetTraderCash = new Decimal(params.requestedNetTraderCash).toFixed(2);
  const normalizedCap = new Decimal(cap).toFixed(2);

  const inserted = await trx
    .insertInto('app.payout_requests')
    .values({
      account_id: params.accountId,
      cycle_id: cycle.id,
      cycle_number: cycle.cycleNumber,
      idempotency_key: params.idempotencyKey,
      requested_net_trader_cash: requestedNetTraderCash,
      requested_gross_base: requestedGrossBase,
      trader_split_rate: splitRate,
      cap_applied: cap,
      buffer_floor_at_request: progress.bufferFloor,
      eligible_excess_at_request: progress.eligibleExcess,
      eligibility_snapshot: JSON.stringify({
        policyVersionId: account.policy_version_id,
        policySemanticVersion: loadedPolicy.semanticVersion,
        cycleNumber: cycle.cycleNumber,
        eligibleBalance: progress.realizedBalance,
        bufferFloor: progress.bufferFloor,
        eligibleExcess: progress.eligibleExcess,
        performanceDaysCompleted: progress.performanceDaysCompleted,
        performanceDaysRequired: progress.performanceDaysRequired,
        consistencyRatio: progress.consistencyRatio,
        consistencyCompliant: progress.consistencyCompliant,
        splitRate,
        cap: normalizedCap,
        requestedNetTraderCash,
        requestedGrossBase,
        kycVerified: account.kyc_sandbox_verified,
        payoutDestinationConfigured: account.payout_method_sandbox_configured,
        accountStatus: account.status,
        calculatedAt: params.now.toISOString(),
      }),
      calculation_timestamp: params.now,
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
    .forUpdate()
    .executeTakeFirstOrThrow(
      () => new Error(`Payout request ${params.payoutRequestId} is not pending review.`),
    );

  const reconciliation = await reconcileAccountFinancialStateInTransaction(trx, {
    accountId: request.account_id,
    executedBy: params.staffUserId,
    now: params.now,
  });
  const eligibility = reconciliation.matches
    ? await evaluatePayoutEligibility(trx, request.account_id)
    : ({ eligible: false, rejectionCode: REJECTION.INTEGRITY_HOLD } as const);
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
  const approved = await trx
    .updateTable('app.payout_requests')
    .set({
      status: 'approved',
      approved_gross_base: approvedGrossBase,
      trader_net_cash: traderNetCash,
      wariba_share: waribaShare,
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

export interface PayoutProviderWorkItem {
  payoutRequestId: string;
  payoutRequestStatus: string;
  provider: string | null;
  providerReference: string | null;
  providerIdempotencyKey: string | null;
  providerStatus: PayoutProviderStatus | null;
  traderNetCash: string | null;
  currency: string;
}

export async function loadPayoutProviderWorkItem(
  db: Db,
  payoutRequestId: string,
): Promise<PayoutProviderWorkItem> {
  const row = await db
    .selectFrom('app.payout_requests')
    .select([
      'id',
      'status',
      'provider',
      'provider_reference',
      'provider_idempotency_key',
      'provider_status',
      'trader_net_cash',
      'currency',
    ])
    .where('id', '=', payoutRequestId)
    .executeTakeFirstOrThrow(
      () => new Error('Payout request ' + payoutRequestId + ' was not found.'),
    );
  return {
    payoutRequestId: row.id,
    payoutRequestStatus: row.status,
    provider: row.provider,
    providerReference: row.provider_reference,
    providerIdempotencyKey: row.provider_idempotency_key,
    providerStatus: row.provider_status,
    traderNetCash: row.trader_net_cash,
    currency: row.currency,
  };
}

export interface RecordPayoutProviderSubmissionParams {
  payoutRequestId: string;
  provider: string;
  providerReference: string;
  providerIdempotencyKey: string;
  providerStatus: PayoutProviderStatus;
  submissionResult: unknown;
  submittedAt: Date;
  now: Date;
}

export async function recordPayoutProviderSubmissionInTransaction(
  trx: Db,
  params: RecordPayoutProviderSubmissionParams,
): Promise<PayoutRequestSummary> {
  assertPayoutProviderStatus(params.providerStatus);
  const request = await trx
    .selectFrom('app.payout_requests')
    .selectAll()
    .where('id', '=', params.payoutRequestId)
    .forUpdate()
    .executeTakeFirstOrThrow(
      () => new Error('Payout request ' + params.payoutRequestId + ' was not found.'),
    );
  const expectedIdempotencyKey = 'wariba-payout:' + request.id;
  if (params.providerIdempotencyKey !== expectedIdempotencyKey) {
    throw new Error('Payout provider idempotency key does not match the payout request.');
  }
  if (request.provider_idempotency_key) {
    if (
      request.provider_idempotency_key !== params.providerIdempotencyKey ||
      request.provider !== params.provider ||
      request.provider_reference !== params.providerReference
    ) {
      throw new Error('Payout provider submission does not match the existing idempotent record.');
    }
    return toSummary(request);
  }
  if (request.status !== 'approved') {
    throw new Error(
      'Payout request ' + params.payoutRequestId + ' is not approved for provider submission.',
    );
  }

  const submitted = await trx
    .updateTable('app.payout_requests')
    .set({
      status: 'processing',
      provider: params.provider,
      provider_reference: params.providerReference,
      provider_idempotency_key: params.providerIdempotencyKey,
      provider_status: params.providerStatus,
      provider_submission_result: serializeProviderResult(params.submissionResult),
      provider_submitted_at: params.submittedAt,
      updated_at: params.now,
    })
    .where('id', '=', request.id)
    .where('status', '=', 'approved')
    .returningAll()
    .executeTakeFirstOrThrow();

  await trx
    .insertInto('app.outbox_events')
    .values({
      aggregate_type: 'payout_request',
      aggregate_id: request.id,
      event_type: 'payout_request.provider_submitted',
      payload: JSON.stringify({
        provider: params.provider,
        providerReference: params.providerReference,
        providerStatus: params.providerStatus,
      }),
    })
    .execute();

  return toSummary(submitted);
}

export interface RecordPayoutProviderReconciliationParams {
  payoutRequestId: string;
  provider: string;
  providerReference: string;
  providerIdempotencyKey: string;
  providerStatus: PayoutProviderStatus;
  reconciliationResult: unknown;
  reconciledAt: Date;
  reconciledBy: string | null;
  now: Date;
}

export async function recordPayoutProviderReconciliationInTransaction(
  trx: Db,
  params: RecordPayoutProviderReconciliationParams,
): Promise<PayoutRequestSummary> {
  assertPayoutProviderStatus(params.providerStatus);
  const request = await trx
    .selectFrom('app.payout_requests')
    .selectAll()
    .where('id', '=', params.payoutRequestId)
    .forUpdate()
    .executeTakeFirstOrThrow(
      () => new Error('Payout request ' + params.payoutRequestId + ' was not found.'),
    );
  if (request.status === 'paid' || request.status === 'failed') {
    return toSummary(request);
  }
  if (request.status !== 'processing') {
    throw new Error(
      'Payout request ' +
        params.payoutRequestId +
        ' is not processing for provider reconciliation.',
    );
  }
  if (
    request.provider !== params.provider ||
    request.provider_reference !== params.providerReference ||
    request.provider_idempotency_key !== params.providerIdempotencyKey
  ) {
    throw new Error('Payout provider reconciliation does not match the submitted provider record.');
  }

  const reconciliation = {
    provider_status: params.providerStatus,
    provider_reconciliation_result: serializeProviderResult(params.reconciliationResult),
    provider_reconciled_at: params.reconciledAt,
    provider_reconciled_by: params.reconciledBy,
    updated_at: params.now,
  };
  if (params.providerStatus === 'paid') {
    await trx
      .updateTable('app.payout_requests')
      .set(reconciliation)
      .where('id', '=', request.id)
      .where('status', '=', 'processing')
      .executeTakeFirstOrThrow();
    return settlePayoutProviderInTransaction(trx, {
      payoutRequestId: request.id,
      now: params.now,
    });
  }

  if (params.providerStatus === 'failed' || params.providerStatus === 'returned') {
    const failed = await trx
      .updateTable('app.payout_requests')
      .set({ ...reconciliation, status: 'failed' })
      .where('id', '=', request.id)
      .where('status', '=', 'processing')
      .returningAll()
      .executeTakeFirstOrThrow();
    await trx
      .updateTable('app.performance_cycles')
      .set({ status: 'active', updated_at: params.now })
      .where('id', '=', request.cycle_id)
      .execute();
    await trx
      .insertInto('app.outbox_events')
      .values({
        aggregate_type: 'payout_request',
        aggregate_id: request.id,
        event_type: 'payout_request.provider_failed',
        payload: JSON.stringify({ providerStatus: params.providerStatus }),
      })
      .execute();
    return toSummary(failed);
  }

  const reconciled = await trx
    .updateTable('app.payout_requests')
    .set(reconciliation)
    .where('id', '=', request.id)
    .where('status', '=', 'processing')
    .returningAll()
    .executeTakeFirstOrThrow();
  await trx
    .insertInto('app.outbox_events')
    .values({
      aggregate_type: 'payout_request',
      aggregate_id: request.id,
      event_type: 'payout_request.provider_reconciled',
      payload: JSON.stringify({ providerStatus: params.providerStatus }),
    })
    .execute();
  return toSummary(reconciled);
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
  if (
    !request.provider ||
    !request.provider_reference ||
    !request.provider_idempotency_key ||
    request.provider_status !== 'paid'
  ) {
    throw new Error('Payout provider reconciliation must confirm payment before settlement.');
  }

  const reconciliation = await reconcileAccountFinancialStateInTransaction(trx, {
    accountId: request.account_id,
    executedBy: request.provider_reconciled_by,
    now: params.now,
  });
  if (!reconciliation.matches) {
    throw new Error('Payout settlement blocked by ACCOUNT_RECONCILIATION_FAILURE.');
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

export interface ReversePayoutParams {
  payoutRequestId: string;
  reversedBy: string;
  actorRole: string;
  reason: string;
  evidence: unknown;
  correlationId: string;
  now: Date;
}

export async function reversePayoutInTransaction(
  trx: Db,
  params: ReversePayoutParams,
): Promise<PayoutRequestSummary> {
  if (params.reason.trim().length === 0) throw new Error('Payout reversal reason is required.');
  const evidence = serializeProviderResult(params.evidence);
  const request = await trx
    .selectFrom('app.payout_requests')
    .selectAll()
    .where('id', '=', params.payoutRequestId)
    .forUpdate()
    .executeTakeFirstOrThrow();
  if (request.status === 'reversed') return toSummary(request);
  if (request.status !== 'paid' || !request.approved_gross_base) {
    throw new Error('Only a paid payout can be reversed.');
  }

  const before = await reconcileAccountFinancialStateInTransaction(trx, {
    accountId: request.account_id,
    executedBy: params.reversedBy,
    now: params.now,
  });
  if (!before.matches) throw new Error('Payout reversal blocked by reconciliation failure.');

  const debit = await trx
    .selectFrom('app.trading_ledger_entries')
    .select(['id', 'amount'])
    .where('entry_type', '=', 'payout_debit')
    .where('reference_type', '=', 'payout_request')
    .where('reference_id', '=', request.id)
    .forUpdate()
    .executeTakeFirstOrThrow(() => new Error('Original payout debit was not found.'));
  const reversal = await trx
    .insertInto('app.trading_ledger_entries')
    .values({
      account_id: request.account_id,
      entry_type: 'reversal',
      amount: new Decimal(debit.amount).negated().toFixed(8),
      reference_type: 'payout_request',
      reference_id: request.id,
      reversal_of: debit.id,
      occurred_at: params.now,
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  const reversed = await trx
    .updateTable('app.payout_requests')
    .set({
      status: 'reversed',
      reversed_at: params.now,
      reversed_by: params.reversedBy,
      reversal_reason: params.reason.trim(),
      reversal_evidence: evidence,
      reversal_ledger_entry_id: reversal.id,
      updated_at: params.now,
    })
    .where('id', '=', request.id)
    .where('status', '=', 'paid')
    .returningAll()
    .executeTakeFirstOrThrow();

  const after = await reconcileAccountFinancialStateInTransaction(trx, {
    accountId: request.account_id,
    executedBy: params.reversedBy,
    now: params.now,
  });
  if (!after.matches) throw new Error('Payout reversal produced a reconciliation mismatch.');

  await trx
    .insertInto('app.outbox_events')
    .values({
      aggregate_type: 'payout_request',
      aggregate_id: request.id,
      event_type: 'payout_request.reversed',
      payload: JSON.stringify({
        accountId: request.account_id,
        providerReference: request.provider_reference,
        reversalLedgerEntryId: reversal.id,
      }),
      occurred_at: params.now,
    })
    .execute();
  await trx
    .insertInto('audit.audit_events')
    .values({
      actor_type: 'staff',
      actor_id: params.reversedBy,
      role: params.actorRole,
      permission: 'payout.reverse',
      action: 'payout.reversed',
      target_type: 'payout_request',
      target_id: request.id,
      before_json: JSON.stringify({ status: request.status }),
      after_json: JSON.stringify({ status: 'reversed', reversalLedgerEntryId: reversal.id }),
      reason: params.reason.trim(),
      source: 'control',
      correlation_id: params.correlationId,
      occurred_at: params.now,
    })
    .execute();

  return toSummary(reversed);
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

export interface ControlPayoutQueueEntry {
  id: string;
  accountId: string;
  accountPublicId: string;
  nominalBalance: string;
  traderFirstName: string;
  traderLastName: string;
  cycleNumber: number;
  status: string;
  requestedNetTraderCash: string;
  capApplied: string;
  traderSplitRate: string;
  approvedGrossBase: string | null;
  traderNetCash: string | null;
  kycVerified: boolean;
  payoutMethodConfigured: boolean;
  requestedAt: Date;
  reversalReason: string | null;
}

/**
 * Prompt 08 Phase G — every request a staff member still has something to
 * do on: awaiting a decision (pending_review/needs_information) or already
 * approved and waiting on the (mock) provider to confirm settlement
 * (processing). 'paid'/'rejected'/'failed'/'cancelled' are terminal — a
 * separate history view, not this queue.
 */
export async function loadPayoutRequestsForReview(trx: Db): Promise<ControlPayoutQueueEntry[]> {
  const rows = await trx
    .selectFrom('app.payout_requests')
    .innerJoin('app.trading_accounts', 'app.trading_accounts.id', 'app.payout_requests.account_id')
    .innerJoin('app.user_profiles', 'app.user_profiles.user_id', 'app.trading_accounts.user_id')
    .select([
      'app.payout_requests.id',
      'app.payout_requests.account_id',
      'app.trading_accounts.public_id as account_public_id',
      'app.trading_accounts.nominal_balance',
      'app.user_profiles.first_name as trader_first_name',
      'app.user_profiles.last_name as trader_last_name',
      'app.payout_requests.cycle_number',
      'app.payout_requests.status',
      'app.payout_requests.requested_net_trader_cash',
      'app.payout_requests.cap_applied',
      'app.payout_requests.trader_split_rate',
      'app.payout_requests.approved_gross_base',
      'app.payout_requests.trader_net_cash',
      'app.trading_accounts.kyc_sandbox_verified',
      'app.trading_accounts.payout_method_sandbox_configured',
      'app.payout_requests.requested_at',
      'app.payout_requests.reversal_reason',
    ])
    .where('app.payout_requests.status', 'in', [
      'pending_review',
      'needs_information',
      'approved',
      'processing',
      'paid',
      'reversed',
    ])
    .orderBy('app.payout_requests.requested_at', 'asc')
    .execute();

  return rows.map((row) => ({
    id: row.id,
    accountId: row.account_id,
    accountPublicId: row.account_public_id,
    nominalBalance: row.nominal_balance,
    traderFirstName: row.trader_first_name,
    traderLastName: row.trader_last_name,
    cycleNumber: row.cycle_number,
    status: row.status,
    requestedNetTraderCash: row.requested_net_trader_cash,
    capApplied: row.cap_applied,
    traderSplitRate: row.trader_split_rate,
    approvedGrossBase: row.approved_gross_base,
    traderNetCash: row.trader_net_cash,
    kycVerified: row.kyc_sandbox_verified,
    payoutMethodConfigured: row.payout_method_sandbox_configured,
    requestedAt: row.requested_at,
    reversalReason: row.reversal_reason,
  }));
}
