import { createPayoutRequestInTransaction, type Db } from '@wariba/database';
import type {
  PayoutResultMessage,
  PayoutRequestDTO,
  RequestPayoutMessage,
} from '@wariba/contracts';
import { verifyAccountOwnership, type OrderRejectionReason } from './order-handler';

/**
 * Prompt 08 Phase F — the trader-facing side of the payout request
 * transaction (packages/database/src/payouts.ts). Approval/rejection by
 * staff and provider settlement are Control-only (Phase G) and never
 * arrive through this handler — a trader can only ever create a request,
 * never move it forward themselves.
 */
export async function handleRequestPayout(
  db: Db,
  userId: string,
  msg: RequestPayoutMessage,
): Promise<PayoutResultMessage | OrderRejectionReason> {
  if (!(await verifyAccountOwnership(db, msg.accountId, userId))) {
    return 'not_owner';
  }
  const result = await createPayoutRequestInTransaction(db, {
    accountId: msg.accountId,
    idempotencyKey: msg.idempotencyKey,
    requestedNetTraderCash: msg.requestedNetTraderCash,
    now: new Date(),
  });

  return {
    type: 'payout_result',
    status: result.status,
    rejectionCode: result.rejectionCode,
    request: result.request ? toPayoutRequestDTO(result.request) : null,
  };
}

function toPayoutRequestDTO(request: {
  id: string;
  cycleNumber: number;
  status: string;
  requestedNetTraderCash: string;
  approvedGrossBase: string | null;
  traderNetCash: string | null;
  waribaShare: string | null;
  rejectionCode: string | null;
}): PayoutRequestDTO {
  return {
    id: request.id,
    cycleNumber: request.cycleNumber,
    status: request.status as PayoutRequestDTO['status'],
    requestedNetTraderCash: request.requestedNetTraderCash,
    approvedGrossBase: request.approvedGrossBase,
    traderNetCash: request.traderNetCash,
    waribaShare: request.waribaShare,
    rejectionCode: request.rejectionCode,
    // Fresh creation — the just-created row's own timestamp is close
    // enough to "now" that recomputing it here (rather than a second
    // round trip to re-read the row) is the right tradeoff; the account
    // snapshot's payoutRequests list is the source of truth for the exact
    // persisted value going forward.
    requestedAt: new Date().toISOString(),
    paidAt: null,
  };
}
