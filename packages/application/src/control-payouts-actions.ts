import {
  approvePayoutRequestInTransaction,
  loadPayoutProviderWorkItem,
  recordPayoutProviderReconciliationInTransaction,
  recordPayoutProviderSubmissionInTransaction,
  rejectPayoutRequestInTransaction,
  reversePayoutInTransaction,
  setPerformanceAccountComplianceFlags,
  recordStaffAuditEvent,
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
  providerName?: PayoutProviderName;
  staffRole?: string;
  correlationId?: string;
}
export async function approvePayoutRequest(
  db: Db,
  params: ApprovePayoutParams,
): Promise<{ status: string }> {
  const now = new Date();
  const result = await db.transaction().execute(async (trx) => {
    const approved = await approvePayoutRequestInTransaction(trx, { ...params, now });
    await recordStaffAuditEvent(trx, {
      actorId: params.staffUserId,
      actorRole: params.staffRole ?? 'finance',
      permission: 'payout.approve',
      action: approved.status === 'approved' ? 'payout.approved' : 'payout.approval_rejected',
      targetType: 'payout_request',
      targetId: approved.id,
      before: { status: 'pending_review' },
      after: { status: approved.status, rejectionCode: approved.rejectionCode },
      reason:
        approved.status === 'approved' ? 'Control payout approval' : 'Eligibility revalidation',
      correlationId: params.correlationId ?? approved.id,
      occurredAt: now,
    });
    return approved;
  });
  if (result.status !== 'approved') {
    return { status: result.status };
  }
  return submitPayoutRequest(db, {
    payoutRequestId: result.id,
    providerName: params.providerName ?? 'manual',
    staffUserId: params.staffUserId,
    staffRole: params.staffRole ?? 'finance',
    correlationId: params.correlationId ?? result.id,
  });
}

export interface SubmitPayoutParams {
  payoutRequestId: string;
  providerName?: PayoutProviderName;
  staffUserId?: string;
  staffRole?: string;
  correlationId?: string;
}
export async function submitPayoutRequest(
  db: Db,
  params: SubmitPayoutParams,
): Promise<{ status: string }> {
  const workItem = await loadPayoutProviderWorkItem(db, params.payoutRequestId);
  if (
    workItem.payoutRequestStatus === 'processing' ||
    workItem.payoutRequestStatus === 'paid' ||
    workItem.payoutRequestStatus === 'failed' ||
    workItem.payoutRequestStatus === 'reversed'
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
  const persisted = await db.transaction().execute(async (trx) => {
    const result = await recordPayoutProviderSubmissionInTransaction(trx, {
      payoutRequestId: workItem.payoutRequestId,
      provider: submitted.provider,
      providerReference: submitted.providerReference,
      providerIdempotencyKey: submitted.idempotencyKey,
      providerStatus: submitted.status,
      submissionResult: submitted,
      submittedAt: submitted.submittedAt,
      now,
    });
    if (params.staffUserId) {
      await recordStaffAuditEvent(trx, {
        actorId: params.staffUserId,
        actorRole: params.staffRole ?? 'finance',
        permission: 'payout.approve',
        action: 'payout.provider_submitted',
        targetType: 'payout_request',
        targetId: workItem.payoutRequestId,
        before: { status: workItem.payoutRequestStatus },
        after: { status: result.status, provider: submitted.provider },
        reason: 'Submit approved payout to configured provider',
        correlationId: params.correlationId ?? workItem.payoutRequestId,
        occurredAt: now,
      });
    }
    return result;
  });
  return { status: persisted.status };
}

export interface RejectPayoutParams {
  payoutRequestId: string;
  staffUserId: string;
  reason: string;
  staffRole?: string;
  correlationId?: string;
}
export async function rejectPayoutRequest(
  db: Db,
  params: RejectPayoutParams,
): Promise<{ status: string }> {
  const now = new Date();
  const result = await db.transaction().execute(async (trx) => {
    const rejected = await rejectPayoutRequestInTransaction(trx, {
      payoutRequestId: params.payoutRequestId,
      staffUserId: params.staffUserId,
      now,
      rejectionCode: params.reason,
    });
    await recordStaffAuditEvent(trx, {
      actorId: params.staffUserId,
      actorRole: params.staffRole ?? 'finance',
      permission: 'payout.reject',
      action: 'payout.rejected',
      targetType: 'payout_request',
      targetId: rejected.id,
      before: { status: 'pending_review' },
      after: { status: rejected.status, rejectionCode: rejected.rejectionCode },
      reason: params.reason,
      correlationId: params.correlationId ?? rejected.id,
      occurredAt: now,
    });
    return rejected;
  });
  return { status: result.status };
}

export interface SettlePayoutParams {
  payoutRequestId: string;
  staffUserId: string;
  manualOutcome?: Extract<PayoutProviderStatus, 'paid' | 'failed' | 'returned'>;
  staffRole?: string;
  correlationId?: string;
}
export async function settlePayoutRequest(
  db: Db,
  params: SettlePayoutParams,
): Promise<{ status: string }> {
  const workItem = await loadPayoutProviderWorkItem(db, params.payoutRequestId);
  if (
    workItem.payoutRequestStatus === 'paid' ||
    workItem.payoutRequestStatus === 'failed' ||
    workItem.payoutRequestStatus === 'reversed'
  ) {
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
  const result = await db.transaction().execute(async (trx) => {
    const persisted = await recordPayoutProviderReconciliationInTransaction(trx, {
      payoutRequestId: workItem.payoutRequestId,
      provider: reconciled.provider,
      providerReference: reconciled.providerReference,
      providerIdempotencyKey: reconciled.idempotencyKey,
      providerStatus: reconciled.status,
      reconciliationResult: reconciled,
      reconciledAt: reconciled.reconciledAt,
      reconciledBy: params.staffUserId,
      now,
    });
    await recordStaffAuditEvent(trx, {
      actorId: params.staffUserId,
      actorRole: params.staffRole ?? 'finance',
      permission: 'payout.settle',
      action: 'payout.provider_reconciled',
      targetType: 'payout_request',
      targetId: workItem.payoutRequestId,
      before: { status: workItem.payoutRequestStatus, providerStatus: workItem.providerStatus },
      after: { status: persisted.status, providerStatus: reconciled.status },
      reason: 'Manual provider settlement reconciliation',
      correlationId: params.correlationId ?? workItem.payoutRequestId,
      occurredAt: now,
    });
    return persisted;
  });
  return { status: result.status };
}

export interface ReversePayoutRequestParams {
  payoutRequestId: string;
  staffUserId: string;
  staffRole: string;
  reason: string;
  evidence: unknown;
  correlationId: string;
}

export async function reversePayoutRequest(
  db: Db,
  params: ReversePayoutRequestParams,
): Promise<{ status: string }> {
  const result = await db.transaction().execute((trx) =>
    reversePayoutInTransaction(trx, {
      payoutRequestId: params.payoutRequestId,
      reversedBy: params.staffUserId,
      actorRole: params.staffRole,
      reason: params.reason,
      evidence: params.evidence,
      correlationId: params.correlationId,
      now: new Date(),
    }),
  );
  return { status: result.status };
}

export interface SetComplianceFlagsParams {
  accountId: string;
  kycVerified?: boolean;
  payoutMethodConfigured?: boolean;
  staffUserId?: string;
  staffRole?: string;
  reason?: string;
  correlationId?: string;
}
export async function setPerformanceComplianceFlags(
  db: Db,
  params: SetComplianceFlagsParams,
): Promise<void> {
  const now = new Date();
  await db.transaction().execute(async (trx) => {
    const changed = await setPerformanceAccountComplianceFlags(trx, { ...params, now });
    if (params.staffUserId) {
      await recordStaffAuditEvent(trx, {
        actorId: params.staffUserId,
        actorRole: params.staffRole ?? 'compliance',
        permission:
          params.kycVerified !== undefined ? 'sandbox_kyc.modify' : 'payout_method.modify',
        action: 'performance_account.compliance_flags_modified',
        targetType: 'trading_account',
        targetId: params.accountId,
        before: changed.before,
        after: changed.after,
        reason: params.reason ?? 'Sandbox compliance state updated in Control',
        correlationId: params.correlationId ?? params.accountId,
        occurredAt: now,
      });
    }
  });
}
