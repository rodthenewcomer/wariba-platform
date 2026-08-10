import { describe, expect, it } from 'vitest';
import {
  POLICY_PROGRAMS,
  POLICY_STATUSES,
  TRADE_ORDER_STATUSES,
  TRADE_ORDER_TYPES,
} from '@wariba/database';
import {
  governancePageHref,
  parseOrderQuery,
  parsePolicyQuery,
  parseStaffQuery,
  STAFF_ROLES,
  TRADABLE_SYMBOLS,
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

describe('parseOrderQuery', () => {
  it('accepts every order status and type the columns allow', () => {
    for (const status of TRADE_ORDER_STATUSES) {
      expect(parseOrderQuery({ status }).filters.status).toBe(status);
    }
    for (const type of TRADE_ORDER_TYPES) {
      expect(parseOrderQuery({ type }).filters.orderType).toBe(type);
    }
  });

  it('accepts only the five tradable symbols', () => {
    for (const symbol of TRADABLE_SYMBOLS) {
      expect(parseOrderQuery({ symbol }).filters.symbol).toBe(symbol);
    }
    const parsed = parseOrderQuery({ symbol: 'BTCUSD' });
    // Crypto is explicitly out of scope; an unknown symbol must not reach
    // a column typed to the five that exist.
    expect(parsed.filters.symbol).toBeUndefined();
    expect(parsed.ignored).toContain('symbol');
  });

  it('drops an unknown status or type and reports it', () => {
    const parsed = parseOrderQuery({ status: 'settled', type: 'martingale' });
    expect(parsed.filters.status).toBeUndefined();
    expect(parsed.filters.orderType).toBeUndefined();
    expect(parsed.ignored).toEqual(expect.arrayContaining(['status', 'type']));
  });

  it('spans a whole day when given a date so the upper bound is inclusive', () => {
    const parsed = parseOrderQuery({ from: '2026-02-01', to: '2026-02-28' });
    expect(parsed.filters.receivedFrom?.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(parsed.filters.receivedTo?.toISOString()).toBe('2026-02-28T23:59:59.999Z');
  });

  it('reports an unparseable date instead of quietly widening the range', () => {
    expect(parseOrderQuery({ from: 'last week' }).ignored).toContain('from');
  });
});
