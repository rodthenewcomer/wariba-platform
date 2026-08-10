import { describe, expect, it } from 'vitest';
import {
  parsePayoutQuery,
  payoutPageHref,
  PAYOUT_PROVIDER_STATUSES,
  PAYOUT_STATUSES,
} from '../src/control-payouts-query';

/**
 * Prompt 09 milestone 4 — the payout queue's URL contract.
 *
 * The query string is untrusted input. Two properties matter: an unusable
 * value must never reach SQL, and it must never *silently* fail to apply —
 * an operator who filters on `status=paid`, gets an unfiltered list, and is
 * told nothing has been shown the wrong answer to their question.
 */
describe('parsePayoutQuery', () => {
  it('normalizes an empty query to page one with no filters', () => {
    expect(parsePayoutQuery({})).toEqual({ filters: {}, page: 1, ignored: [] });
  });

  it('accepts every status the column actually allows', () => {
    for (const status of PAYOUT_STATUSES) {
      const parsed = parsePayoutQuery({ status });
      expect(parsed.filters.status).toBe(status);
      expect(parsed.ignored).toEqual([]);
    }
  });

  it('accepts every provider status the column actually allows', () => {
    for (const providerStatus of PAYOUT_PROVIDER_STATUSES) {
      const parsed = parsePayoutQuery({ provider: providerStatus });
      expect(parsed.filters.providerStatus).toBe(providerStatus);
      expect(parsed.ignored).toEqual([]);
    }
  });

  it('drops an unknown status and reports it rather than passing it to SQL', () => {
    const parsed = parsePayoutQuery({ status: 'paid; drop table' });
    expect(parsed.filters.status).toBeUndefined();
    expect(parsed.ignored).toContain('status');
  });

  it('rejects a cycle outside P1–P5, which the database cannot hold', () => {
    expect(parsePayoutQuery({ cycle: '6' }).filters.cycleNumber).toBeUndefined();
    expect(parsePayoutQuery({ cycle: '6' }).ignored).toContain('cycle');
    expect(parsePayoutQuery({ cycle: '0' }).ignored).toContain('cycle');
    expect(parsePayoutQuery({ cycle: '5' }).filters.cycleNumber).toBe(5);
  });

  it('keeps a nominal balance as the exact decimal string, never a float', () => {
    const parsed = parsePayoutQuery({ nominal: '10000.00' });
    // A Number round-trip here would be the start of money arithmetic in JS.
    expect(parsed.filters.nominalBalance).toBe('10000.00');
    expect(parsePayoutQuery({ nominal: '1e5' }).ignored).toContain('nominal');
  });

  it('treats only the literal booleans as booleans', () => {
    expect(parsePayoutQuery({ kyc: 'true' }).filters.kycVerified).toBe(true);
    expect(parsePayoutQuery({ kyc: 'false' }).filters.kycVerified).toBe(false);
    const nonsense = parsePayoutQuery({ kyc: 'maybe' });
    expect(nonsense.filters.kycVerified).toBeUndefined();
    expect(nonsense.ignored).toContain('kyc');
  });

  it('spans a whole day when given a date, so the upper bound is inclusive', () => {
    const parsed = parsePayoutQuery({ from: '2026-01-01', to: '2026-01-31' });
    expect(parsed.filters.requestedFrom?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(parsed.filters.requestedTo?.toISOString()).toBe('2026-01-31T23:59:59.999Z');
  });

  it('reports an unparseable date instead of quietly widening the range', () => {
    const parsed = parsePayoutQuery({ from: 'yesterday' });
    expect(parsed.filters.requestedFrom).toBeUndefined();
    expect(parsed.ignored).toContain('from');
  });

  it('falls back to page one for a non-numeric page and says so', () => {
    const parsed = parsePayoutQuery({ page: '../../etc' });
    expect(parsed.page).toBe(1);
    expect(parsed.ignored).toContain('page');
  });

  it('takes the first value when a parameter is repeated', () => {
    expect(parsePayoutQuery({ status: ['paid', 'rejected'] }).filters.status).toBe('paid');
  });

  it('keeps a search term literal so wildcards are text, not operators', () => {
    expect(parsePayoutQuery({ q: '  %ACC%  ' }).filters.query).toBe('%ACC%');
  });
});

describe('payoutPageHref', () => {
  it('carries the current filters onto the next page', () => {
    const href = payoutPageHref({ status: 'paid', q: 'ACC' }, 3);
    expect(href).toContain('status=paid');
    expect(href).toContain('q=ACC');
    expect(href).toContain('page=3');
  });

  it('omits page=1 so the first page has one canonical URL', () => {
    expect(payoutPageHref({ status: 'paid' }, 1)).toBe('/control/payouts?status=paid');
    expect(payoutPageHref({}, 1)).toBe('/control/payouts');
  });

  it('replaces an existing page rather than appending a second one', () => {
    expect(payoutPageHref({ page: '7' }, 2)).toBe('/control/payouts?page=2');
  });
});
