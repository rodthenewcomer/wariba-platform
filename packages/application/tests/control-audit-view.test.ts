import { describe, expect, it } from 'vitest';
import {
  auditPageHref,
  auditTotalPages,
  parseAuditQuery,
  AUDIT_PAGE_SIZES,
} from '../src/control-audit-view';

const UUID = '3f7ec8e0-e836-4a5a-97b5-632c52cc8fbe';
const OTHER_UUID = '0085beab-6aae-4a42-8e6e-097800cf2ff6';

describe('audit explorer query parsing', () => {
  it('defaults to an unfiltered first page', () => {
    const query = parseAuditQuery({});
    expect(query.filters).toEqual({});
    expect(query.page).toBe(1);
    expect(AUDIT_PAGE_SIZES).toContain(query.pageSize as (typeof AUDIT_PAGE_SIZES)[number]);
  });

  it('accepts a single filter', () => {
    expect(parseAuditQuery({ role: 'finance' }).filters).toEqual({ role: 'finance' });
  });

  it('accepts several filters together', () => {
    const query = parseAuditQuery({
      role: 'finance',
      activity: 'payout.approve',
      targetType: 'payout_request',
      target: UUID,
      actor: OTHER_UUID,
      correlation: 'CERT-08A',
    });
    expect(query.filters).toEqual({
      role: 'finance',
      activity: 'payout.approve',
      targetType: 'payout_request',
      targetId: UUID,
      actorId: OTHER_UUID,
      correlationId: 'CERT-08A',
    });
  });

  it('reads a bare date as UTC, with the "to" bound covering the whole day', () => {
    const query = parseAuditQuery({ from: '2026-08-01', to: '2026-08-09' });
    expect(query.filters.occurredFrom?.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    // Not the first instant of the 9th — "up to the 9th" includes the 9th.
    expect(query.filters.occurredTo?.toISOString()).toBe('2026-08-09T23:59:59.999Z');
  });

  it('drops a malformed UUID instead of forwarding it to a uuid column', () => {
    // Postgres answers `where actor_id = 'not-a-uuid'` with an error, not an
    // empty set — so this must never reach the query.
    const query = parseAuditQuery({ actor: 'not-a-uuid', target: '123' });
    expect(query.filters.actorId).toBeUndefined();
    expect(query.filters.targetId).toBeUndefined();
  });

  it('drops an unparseable date rather than inventing a range', () => {
    const query = parseAuditQuery({ from: 'yesterday', to: '2026-13-45' });
    expect(query.filters.occurredFrom).toBeUndefined();
    expect(query.filters.occurredTo).toBeUndefined();
  });

  it('normalises hostile or nonsensical paging to safe defaults', () => {
    for (const page of ['0', '-3', 'abc', '', '1e9']) {
      expect(parseAuditQuery({ page }).page).toBe(1);
    }
    // An arbitrary page size would let one request pull the whole trail.
    expect(parseAuditQuery({ pageSize: '100000' }).pageSize).not.toBe(100000);
    expect(parseAuditQuery({ pageSize: '25' }).pageSize).toBe(25);
  });

  it('ignores blank and whitespace-only values so they do not filter anything', () => {
    expect(parseAuditQuery({ role: '   ', activity: '', correlation: '\t' }).filters).toEqual({});
  });

  it('takes the first value when a parameter is repeated', () => {
    expect(parseAuditQuery({ role: ['finance', 'support'] }).filters.role).toBe('finance');
  });

  it('keeps filters when paging, and drops page=1 from the URL', () => {
    const params = { role: 'finance', activity: 'payout.approve', page: '2' };
    expect(auditPageHref(params, 3)).toBe(
      '/control/audit?role=finance&activity=payout.approve&page=3',
    );
    expect(auditPageHref(params, 1)).toBe('/control/audit?role=finance&activity=payout.approve');
    expect(auditPageHref({}, 1)).toBe('/control/audit');
  });

  it('always reports at least one page', () => {
    expect(auditTotalPages(0, 50)).toBe(1);
    expect(auditTotalPages(50, 50)).toBe(1);
    expect(auditTotalPages(51, 50)).toBe(2);
    expect(auditTotalPages(101, 25)).toBe(5);
  });
});
