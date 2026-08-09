import {
  recordStaffAuditEvent,
  recordTreasuryReserveEntry,
  type Db,
  type TreasuryReserveEntryType,
} from '@wariba/database';

export interface RecordControlTreasuryReserveEntryParams {
  entryType: TreasuryReserveEntryType;
  amount: string;
  reason: string;
  staffUserId: string;
  staffRole: string;
  correlationId: string;
}

export async function recordControlTreasuryReserveEntry(
  db: Db,
  params: RecordControlTreasuryReserveEntryParams,
): Promise<void> {
  const now = new Date();
  await db.transaction().execute(async (trx) => {
    await recordTreasuryReserveEntry(trx, {
      entryType: params.entryType,
      amount: params.amount,
      reason: params.reason,
      createdBy: params.staffUserId,
      now,
    });
    await recordStaffAuditEvent(trx, {
      actorId: params.staffUserId,
      actorRole: params.staffRole,
      permission: 'treasury.modify',
      action: 'treasury.reserve_entry_recorded',
      targetType: 'treasury_reserve',
      targetId: null,
      before: null,
      after: { entryType: params.entryType, amount: params.amount },
      reason: params.reason,
      correlationId: params.correlationId,
      occurredAt: now,
    });
  });
}
