import {
  approvePayoutRequestInTransaction,
  rejectPayoutRequestInTransaction,
  settlePayoutProviderInTransaction,
  setPerformanceAccountComplianceFlags,
  type Db,
} from '@wariba/database';

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
  return { status: result.status };
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
}
export async function settlePayoutRequest(
  db: Db,
  params: SettlePayoutParams,
): Promise<{ status: string }> {
  const now = new Date();
  const result = await db
    .transaction()
    .execute((trx) => settlePayoutProviderInTransaction(trx, { ...params, now }));
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
