import { describe, expect, it } from 'vitest';
import { POLICY_PROGRAMS, POLICY_STATUSES } from '@wariba/database';
import {
  governancePageHref,
  parsePolicyQuery,
  parseStaffQuery,
  STAFF_ROLES,
} from '../src/control-governance-query';

/**
 * Prompt 09 milestone 5 — the governance explorers' URL contract.
 *
 * `program`, `status` and `role` are all checked columns or fixed unions, so
 * an unknown value must never reach SQL — and must never sit in the form
 * looking as though it narrowed anything.
 */
describe('parsePolicyQuery', () => {
  it('normalizes an empty query to page one with no filters', () => {
    expect(parsePolicyQuery({})).toEqual({ filters: {}, page: 1, ignored: [] });
  });

  it('accepts every program and status the column allows', () => {
    for (const program of POLICY_PROGRAMS) {
      expect(parsePolicyQuery({ program }).filters.program).toBe(program);
    }
    for (const status of POLICY_STATUSES) {
      expect(parsePolicyQuery({ status }).filters.status).toBe(status);
    }
  });

  it('drops an unknown program or status and reports it', () => {
    const parsed = parsePolicyQuery({ program: 'WARIBA_SECRET', status: "'; drop table" });
    expect(parsed.filters.program).toBeUndefined();
    expect(parsed.filters.status).toBeUndefined();
    expect(parsed.ignored).toEqual(expect.arrayContaining(['program', 'status']));
  });

  it('accepts only a well-formed semantic version', () => {
    expect(parsePolicyQuery({ version: '1.1.0' }).filters.semanticVersion).toBe('1.1.0');
    expect(parsePolicyQuery({ version: '1.1' }).ignored).toContain('version');
    expect(parsePolicyQuery({ version: 'latest' }).ignored).toContain('version');
  });

  it('treats retired as a strict boolean', () => {
    expect(parsePolicyQuery({ retired: 'true' }).filters.retired).toBe(true);
    expect(parsePolicyQuery({ retired: 'false' }).filters.retired).toBe(false);
    expect(parsePolicyQuery({ retired: 'maybe' }).ignored).toContain('retired');
  });

  it('falls back to page one for a non-numeric page and says so', () => {
    const parsed = parsePolicyQuery({ page: '../../etc' });
    expect(parsed.page).toBe(1);
    expect(parsed.ignored).toContain('page');
  });
});

describe('parseStaffQuery', () => {
  it('accepts every real staff role', () => {
    for (const role of STAFF_ROLES) {
      const parsed = parseStaffQuery({ role });
      expect(parsed.filters.role).toBe(role);
      expect(parsed.ignored).toEqual([]);
    }
  });

  it('refuses a role the hierarchy does not define', () => {
    // 'owner' looks plausible and is not a role — it must not reach the
    // column, and the operator must be told it was dropped.
    const parsed = parseStaffQuery({ role: 'owner' });
    expect(parsed.filters.role).toBeUndefined();
    expect(parsed.ignored).toContain('role');
  });

  it('keeps a search term literal', () => {
    expect(parseStaffQuery({ q: '  %admin%  ' }).filters.query).toBe('%admin%');
  });

  it('takes the first value when a parameter is repeated', () => {
    expect(parseStaffQuery({ role: ['admin', 'support'] }).filters.role).toBe('admin');
  });
});

describe('governancePageHref', () => {
  it('carries current filters onto the next page', () => {
    const href = governancePageHref('/control/policies', { program: 'WARIBA_ONE' }, 2);
    expect(href).toContain('program=WARIBA_ONE');
    expect(href).toContain('page=2');
  });

  it('omits page=1 so the first page has one canonical URL', () => {
    expect(governancePageHref('/control/team', {}, 1)).toBe('/control/team');
    expect(governancePageHref('/control/team', { role: 'admin' }, 1)).toBe(
      '/control/team?role=admin',
    );
  });

  it('replaces an existing page rather than appending a second one', () => {
    expect(governancePageHref('/control/team', { page: '9' }, 3)).toBe('/control/team?page=3');
  });
});
