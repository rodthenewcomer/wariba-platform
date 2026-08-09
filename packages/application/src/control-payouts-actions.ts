import {
  approvePayoutRequestInTransaction,
  loadPayoutProviderWorkItem,
  recordPayoutProviderReconciliationInTransaction,
  recordPayoutProviderSubmissionInTransaction,
  rejectPayoutRequestInTransaction,
  setPerformanceAccountComplianceFlags,
  type Db,
} from '@wariba/database';
import {
  ManualPayoutProvider,
  MockPayoutProvider,
  type PayoutProvider,
  type PayoutProviderName,
  type PayoutProviderStatus,
} from '@wariba/adapters';

const manualPayoutProvider = new ManualPayoutProvider();
const mockPayoutProvider = new MockPayoutProvider();

function resolvePayoutProvider(providerName: PayoutProviderName): PayoutProvider {
  if (providerName === 'manual') return manualPayoutProvider;
  if (providerName === 'mock') return mockPayoutProvider;
  throw new Error('Unsupported payout provider.');
}

/**
 * Prompt 08 Phase G — the Control-side counterpart of the payout engine's
 * own InTransaction functions (packages/database/src/payouts.ts). apps/web
 * never opens a Kysely transaction itself (AGENTS.md §7.1: the frontend
 * only ever calls @wariba/application) — these thin wrappers are that
 * package's only place that does, mirroring risk.ts's own
 * evaluateAndApplyAccountRisk/…InTransaction split.
 */
export interface ApprovePayoutParams {
  payoutRequestId: string;
  staffUserId: string;
}
export async function approvePayoutRequest(
  db: Db,
  params: ApprovePayoutParams,
): Promise<{ status: string }> {
  const now = new Date();
  const result = await db
    .transaction()
    .execute((trx) => approvePayoutRequestInTransaction(trx, { ...params, now }));
  if (result.status !== 'approved') {
    return { status: result.status };
  }
  return submitPayoutRequest(db, { payoutRequestId: result.id });
}

export interface SubmitPayoutParams {
  payoutRequestId: string;
  providerName?: PayoutProviderName;
}
export async function submitPayoutRequest(
  db: Db,
  params: SubmitPayoutParams,
): Promise<{ status: string }> {
  const workItem = await loadPayoutProviderWorkItem(db, params.payoutRequestId);
  if (
    workItem.payoutRequestStatus === 'processing' ||
    workItem.payoutRequestStatus === 'paid' ||
    workItem.payoutRequestStatus === 'failed'
  ) {
    return { status: workItem.payoutRequestStatus };
  }
  if (workItem.payoutRequestStatus !== 'approved' || !workItem.traderNetCash) {
    throw new Error('Payout request is not ready for provider submission.');
  }

  const provider = resolvePayoutProvider(params.providerName ?? 'manual');
  const idempotencyKey = 'wariba-payout:' + workItem.payoutRequestId;
  const submitted = await provider.submit({
    payoutRequestId: workItem.payoutRequestId,
    idempotencyKey,
    amount: workItem.traderNetCash,
    currency: workItem.currency,
  });
  const now = new Date();
  const persisted = await db.transaction().execute((trx) =>
    recordPayoutProviderSubmissionInTransaction(trx, {
      payoutRequestId: workItem.payoutRequestId,
      provider: submitted.provider,
      providerReference: submitted.providerReference,
      providerIdempotencyKey: submitted.idempotencyKey,
      providerStatus: submitted.status,
      submissionResult: submitted,
      submittedAt: submitted.submittedAt,
      now,
    }),
  );
  return { status: persisted.status };
}

export interface RejectPayoutParams {
  payoutRequestId: string;
  staffUserId: string;
  reason: string;
}
export async function rejectPayoutRequest(
  db: Db,
  params: RejectPayoutParams,
): Promise<{ status: string }> {
  const now = new Date();
  const result = await db.transaction().execute((trx) =>
    rejectPayoutRequestInTransaction(trx, {
      payoutRequestId: params.payoutRequestId,
      staffUserId: params.staffUserId,
      now,
      rejectionCode: params.reason,
    }),
  );
  return { status: result.status };
}

export interface SettlePayoutParams {
  payoutRequestId: string;
  staffUserId: string;
  manualOutcome?: Extract<PayoutProviderStatus, 'paid' | 'failed' | 'returned'>;
}
export async function settlePayoutRequest(
  db: Db,
  params: SettlePayoutParams,
): Promise<{ status: string }> {
  const workItem = await loadPayoutProviderWorkItem(db, params.payoutRequestId);
  if (workItem.payoutRequestStatus === 'paid' || workItem.payoutRequestStatus === 'failed') {
    return { status: workItem.payoutRequestStatus };
  }
  if (
    workItem.payoutRequestStatus !== 'processing' ||
    !workItem.provider ||
    !workItem.providerReference ||
    !workItem.providerIdempotencyKey
  ) {
    throw new Error('Payout request is not ready for provider reconciliation.');
  }

  const provider = resolvePayoutProvider(
    workItem.provider === 'manual' || workItem.provider === 'mock'
      ? workItem.provider
      : (() => {
          throw new Error('Unsupported stored payout provider.');
        })(),
  );
  const now = new Date();
  const reconciled = await provider.reconcile({
    providerReference: workItem.providerReference,
    idempotencyKey: workItem.providerIdempotencyKey,
    reconciledAt: now,
    manualOutcome: params.manualOutcome ?? 'paid',
  });
  const result = await db.transaction().execute((trx) =>
    recordPayoutProviderReconciliationInTransaction(trx, {
      payoutRequestId: workItem.payoutRequestId,
      provider: reconciled.provider,
      providerReference: reconciled.providerReference,
      providerIdempotencyKey: reconciled.idempotencyKey,
      providerStatus: reconciled.status,
      reconciliationResult: reconciled,
      reconciledAt: reconciled.reconciledAt,
      reconciledBy: params.staffUserId,
      now,
    }),
  );
  return { status: result.status };
}

export interface SetComplianceFlagsParams {
  accountId: string;
  kycVerified?: boolean;
  payoutMethodConfigured?: boolean;
}
export async function setPerformanceComplianceFlags(
  db: Db,
  params: SetComplianceFlagsParams,
): Promise<void> {
  await setPerformanceAccountComplianceFlags(db, { ...params, now: new Date() });
}
