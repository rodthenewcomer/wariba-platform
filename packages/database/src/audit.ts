import type { DbExecutor } from './client';

export interface RecordStaffAuditEventParams {
  actorId: string;
  actorRole: string;
  permission: string;
  action: string;
  targetType: string;
  targetId: string | null;
  before: unknown;
  after: unknown;
  reason: string;
  correlationId: string;
  occurredAt: Date;
}

export async function recordStaffAuditEvent(
  db: DbExecutor,
  params: RecordStaffAuditEventParams,
): Promise<void> {
  if (params.reason.trim().length === 0) throw new Error('Staff audit reason is required.');
  await db
    .insertInto('audit.audit_events')
    .values({
      actor_type: 'staff',
      actor_id: params.actorId,
      role: params.actorRole,
      permission: params.permission,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId,
      before_json: JSON.stringify(params.before),
      after_json: JSON.stringify(params.after),
      reason: params.reason.trim(),
      source: 'control',
      correlation_id: params.correlationId,
      occurred_at: params.occurredAt,
    })
    .execute();
}
