import { describe, expect, it } from 'vitest';
import { safeInternalPath } from '../lib/navigation';

/**
 * The open-redirect contract.
 *
 * Every auth surface carries a destination — login has `next`, signup has
 * `returnTo`, the session-expired screen forwards one into login — and all of
 * them come from a query string, which means all of them are
 * attacker-controlled. A single unchecked one turns the platform's own login
 * page into a credible phishing hop.
 *
 * One helper decides for all of them, and this file is the whole contract.
 */
describe('safeInternalPath', () => {
  it('preserves an internal checkout query string', () => {
    expect(safeInternalPath('/checkout?product=100K')).toBe('/checkout?product=100K');
  });

  it('preserves an ordinary internal route', () => {
    expect(safeInternalPath('/hub')).toBe('/hub');
    expect(safeInternalPath('/comptes')).toBe('/comptes');
  });

  it.each([
    'https://evil.invalid',
    'http://evil.invalid',
    // A URL, not a path: browsers resolve it against the current scheme and
    // leave the site entirely.
    '//evil.invalid/path',
    // Some browsers normalise a backslash to a forward slash first.
    '/\\evil.invalid/path',
    '\\\\evil.invalid',
    'javascript:x',
    'data:text/html,<script>alert(1)</script>',
  ])('rejects external or malformed destination %s', (destination) => {
    expect(safeInternalPath(destination)).toBe('/hub');
  });

  it('rejects anything that is not a string', () => {
    expect(safeInternalPath(null)).toBe('/hub');
    expect(safeInternalPath(undefined)).toBe('/hub');
    expect(safeInternalPath(42)).toBe('/hub');
    // An object that would pass a naive `String(value)` coercion.
    expect(safeInternalPath({ toString: () => '/hub' })).toBe('/hub');
  });

  it('honours the caller fallback, so signup can return to the offers page', () => {
    expect(safeInternalPath('https://evil.invalid', '/offres')).toBe('/offres');
    expect(safeInternalPath('', '/offres')).toBe('/offres');
  });

  it('drops a fragment rather than carrying it into a redirect', () => {
    expect(safeInternalPath('/hub#section')).toBe('/hub');
  });
});
