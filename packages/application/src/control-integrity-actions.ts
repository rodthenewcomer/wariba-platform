import {
  clearAccountIntegrityHoldInTransaction,
  placeAccountIntegrityHoldInTransaction,
  recordStaffAuditEvent,
  type Db,
} from '@wariba/database';

export interface ControlIntegrityHoldParams {
  accountId: string;
  staffUserId: string;
  staffRole: string;
  reason: string;
  correlationId: string;
}

export async function placeAccountIntegrityHold(
  db: Db,
  params: ControlIntegrityHoldParams,
): Promise<void> {
  const now = new Date();
  await db.transaction().execute(async (trx) => {
    const incidentId = await placeAccountIntegrityHoldInTransaction(trx, {
      accountId: params.accountId,
      placedBy: params.staffUserId,
      reason: params.reason,
      now,
    });
    await recordStaffAuditEvent(trx, {
      actorId: params.staffUserId,
      actorRole: params.staffRole,
      permission: 'integrity_hold.place',
      action: 'account.integrity_hold_placed',
      targetType: 'trading_account',
      targetId: params.accountId,
      before: { integrityHold: false },
      after: { integrityHold: true, incidentId },
      reason: params.reason,
      correlationId: params.correlationId,
      occurredAt: now,
    });
  });
}

export async function clearAccountIntegrityHold(
  db: Db,
  params: ControlIntegrityHoldParams,
): Promise<void> {
  const now = new Date();
  await db.transaction().execute(async (trx) => {
    await clearAccountIntegrityHoldInTransaction(trx, {
      accountId: params.accountId,
      clearedBy: params.staffUserId,
      reason: params.reason,
      now,
    });
    await recordStaffAuditEvent(trx, {
      actorId: params.staffUserId,
      actorRole: params.staffRole,
      permission: 'integrity_hold.clear',
      action: 'account.integrity_hold_cleared',
      targetType: 'trading_account',
      targetId: params.accountId,
      before: { integrityHold: true },
      after: { integrityHold: false },
      reason: params.reason,
      correlationId: params.correlationId,
      occurredAt: now,
    });
  });
}
