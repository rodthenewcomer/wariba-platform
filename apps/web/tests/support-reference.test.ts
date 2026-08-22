import { describe, expect, it } from 'vitest';
import { safeSupportReference } from '../lib/support-reference';

/**
 * `/erreur?ref=` is attacker-controlled. Without this guard anyone could hand
 * a WARIBA user a link that renders arbitrary text on a page wearing the
 * WARIBA mark — a phishing primitive built out of an error page.
 */
describe('safeSupportReference', () => {
  it('accepts an opaque digest', () => {
    expect(safeSupportReference('3f81a0c9b2')).toBe('3f81a0c9b2');
    expect(safeSupportReference('WRB-2026-08-22-14ff')).toBe('WRB-2026-08-22-14ff');
  });

  it('refuses anything that could carry a sentence', () => {
    for (const hostile of [
      'Votre compte a été suspendu, appelez le 06 00 00 00 00',
      '<script>alert(1)</script>',
      'a b c d e f',
      'ref/../../etc/passwd',
    ]) {
      expect(safeSupportReference(hostile)).toBeNull();
    }
  });

  it('refuses values too short to be a reference or too long to be one', () => {
    expect(safeSupportReference('abc')).toBeNull();
    expect(safeSupportReference('a'.repeat(65))).toBeNull();
  });

  it('refuses a missing or non-string value', () => {
    expect(safeSupportReference(undefined)).toBeNull();
    expect(safeSupportReference(['a', 'b'])).toBeNull();
  });
});
