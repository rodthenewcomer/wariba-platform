import { randomUUID } from 'node:crypto';
import { recordStaffAuditEvent, type Db } from '@wariba/database';

export interface StaffAuditFixture {
  correlationIds: readonly string[];
  /** Roles the seeded events carry — the audit filter offers exactly these. */
  roles: readonly string[];
  targetTypes: readonly string[];
}

/**
 * Deterministic audit events for the audit explorer's E2E coverage.
 *
 * The explorer builds its filter options from recorded data — a role only
 * appears in the dropdown if some event carries it. That is correct
 * behaviour, but it made the E2E depend on whatever staff actions happened
 * to have run first, which is nothing at all on a freshly reset database.
 * The tests now own the data they assert against.
 *
 * `audit.audit_events` carries no immutability trigger, so a fixture that
 * writes here is responsible for removing exactly what it wrote.
 */
export async function seedStaffAuditEvents(db: Db, actorId: string): Promise<StaffAuditFixture> {
  const financeCorrelationId = randomUUID();
  const riskCorrelationId = randomUUID();
  const now = new Date();

  await recordStaffAuditEvent(db, {
    actorId,
    actorRole: 'finance',
    permission: 'payout.approve',
    action: 'payout.approved',
    targetType: 'payout_request',
    targetId: randomUUID(),
    before: null,
    after: { fixture: true },
    reason: 'E2E audit explorer fixture',
    correlationId: financeCorrelationId,
    occurredAt: now,
  });

  await recordStaffAuditEvent(db, {
    actorId,
    actorRole: 'risk',
    permission: 'integrity_hold.place',
    action: 'integrity_hold.placed',
    targetType: 'trading_account',
    targetId: randomUUID(),
    before: null,
    after: { fixture: true },
    reason: 'E2E audit explorer fixture',
    correlationId: riskCorrelationId,
    occurredAt: now,
  });

  return {
    correlationIds: [financeCorrelationId, riskCorrelationId],
    roles: ['finance', 'risk'],
    targetTypes: ['payout_request', 'trading_account'],
  };
}

export async function deleteStaffAuditEvents(db: Db, fixture: StaffAuditFixture): Promise<void> {
  for (const correlationId of fixture.correlationIds) {
    await db.deleteFrom('audit.audit_events').where('correlation_id', '=', correlationId).execute();
  }
}
