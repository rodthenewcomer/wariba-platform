import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { recordStaffAuditEvent } from '../src/audit';
import { loadAuditFilterOptions, searchAuditEvents } from '../src/audit-explorer';

/**
 * Prompt 09 — the audit explorer against the real table. Filtering has to be
 * proven in the database rather than in a unit test with a fake, because the
 * whole point of this surface is that an operator sees exactly the evidence
 * they asked for: a filter that silently matched nothing, or matched too
 * much, would be worse than no filter at all.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('audit explorer — real database', () => {
  let db: Db;
  const correlationId = `audit-explorer-${randomUUID()}`;
  const financeActor = randomUUID();
  const riskActor = randomUUID();
  const payoutTarget = randomUUID();
  const accountTarget = randomUUID();

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    // A small, self-identifying corpus: every row shares one correlation id
    // so these assertions can never be perturbed by other suites' events.
    const base = Date.UTC(2026, 6, 1, 12, 0, 0);
    for (let index = 0; index < 7; index += 1) {
      const finance = index % 2 === 0;
      await recordStaffAuditEvent(db, {
        actorId: finance ? financeActor : riskActor,
        actorRole: finance ? 'finance' : 'risk',
        permission: finance ? 'payout.approve' : 'integrity_hold.place',
        action: finance ? 'payout.approved' : 'integrity_hold.placed',
        targetType: finance ? 'payout_request' : 'trading_account',
        targetId: finance ? payoutTarget : accountTarget,
        before: { status: 'pending_review' },
        after: { status: finance ? 'approved' : 'held' },
        reason: `Audit explorer fixture ${index}`,
        correlationId,
        occurredAt: new Date(base + index * 86_400_000),
      });
    }
  }, 60000);

  afterAll(async () => {
    await db.deleteFrom('audit.audit_events').where('correlation_id', '=', correlationId).execute();
    await db.destroy();
  }, 30000);

  it('returns the whole fixture for a single correlation filter, newest first', async () => {
    const result = await searchAuditEvents(db, {
      filters: { correlationId },
      pageSize: 100,
    });
    expect(result.total).toBe(7);
    expect(result.events).toHaveLength(7);
    const timestamps = result.events.map((event) => event.occurredAt.getTime());
    expect([...timestamps].sort((a, b) => b - a)).toEqual(timestamps);
  });

  it('filters by a single field', async () => {
    const byRole = await searchAuditEvents(db, {
      filters: { correlationId, role: 'finance' },
      pageSize: 100,
    });
    expect(byRole.total).toBe(4);
    expect(byRole.events.every((event) => event.role === 'finance')).toBe(true);
  });

  it('matches `activity` against either the permission or the action', async () => {
    const byPermission = await searchAuditEvents(db, {
      filters: { correlationId, activity: 'payout.approve' },
      pageSize: 100,
    });
    const byAction = await searchAuditEvents(db, {
      filters: { correlationId, activity: 'payout.approved' },
      pageSize: 100,
    });
    // An operator should not have to know which column recorded it.
    expect(byPermission.total).toBe(4);
    expect(byAction.total).toBe(4);
  });

  it('combines filters as AND, not OR', async () => {
    const combined = await searchAuditEvents(db, {
      filters: {
        correlationId,
        role: 'finance',
        targetType: 'payout_request',
        targetId: payoutTarget,
        actorId: financeActor,
      },
      pageSize: 100,
    });
    expect(combined.total).toBe(4);

    // A contradictory combination must return nothing rather than falling
    // back to a broader match.
    const contradictory = await searchAuditEvents(db, {
      filters: { correlationId, role: 'finance', targetType: 'trading_account' },
      pageSize: 100,
    });
    expect(contradictory.total).toBe(0);
    expect(contradictory.events).toHaveLength(0);
  });

  it('filters by an inclusive date range', async () => {
    const window = await searchAuditEvents(db, {
      filters: {
        correlationId,
        occurredFrom: new Date(Date.UTC(2026, 6, 3, 0, 0, 0)),
        occurredTo: new Date(Date.UTC(2026, 6, 5, 23, 59, 59, 999)),
      },
      pageSize: 100,
    });
    expect(window.total).toBe(3);
  });

  it('paginates without losing or repeating a row, and reports the full total', async () => {
    const first = await searchAuditEvents(db, { filters: { correlationId }, page: 1, pageSize: 3 });
    const second = await searchAuditEvents(db, {
      filters: { correlationId },
      page: 2,
      pageSize: 3,
    });
    const third = await searchAuditEvents(db, { filters: { correlationId }, page: 3, pageSize: 3 });

    expect([first.total, second.total, third.total]).toEqual([7, 7, 7]);
    expect([first.events.length, second.events.length, third.events.length]).toEqual([3, 3, 1]);

    const ids = [...first.events, ...second.events, ...third.events].map((event) => event.id);
    expect(new Set(ids).size).toBe(7);
  });

  it('returns an empty page past the end rather than wrapping around', async () => {
    const beyond = await searchAuditEvents(db, {
      filters: { correlationId },
      page: 99,
      pageSize: 3,
    });
    expect(beyond.events).toHaveLength(0);
    expect(beyond.total).toBe(7);
  });

  it('caps an oversized page size instead of returning the whole trail', async () => {
    const capped = await searchAuditEvents(db, {
      filters: { correlationId },
      pageSize: 10_000,
    });
    expect(capped.pageSize).toBeLessThanOrEqual(200);
  });

  it('offers filter options drawn from recorded data', async () => {
    const options = await loadAuditFilterOptions(db);
    expect(options.roles).toContain('finance');
    expect(options.roles).toContain('risk');
    expect(options.activities).toContain('payout.approve');
    expect(options.activities).toContain('payout.approved');
    expect(options.targetTypes).toContain('payout_request');
  });
});
