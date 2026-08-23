import { describe, expect, it } from 'vitest';
import { resolveHubIdentity } from '../lib/hub-identity';

/**
 * The avatar is where a fabricated identity would be least noticed, so the
 * ladder is asserted rather than trusted. The specific regression: the shell
 * sliced two characters off the e-mail address, which rendered the seeded test
 * account as a person called "E2" in the review captures.
 */
describe('resolveHubIdentity', () => {
  it('builds initials from a real name', () => {
    const identity = resolveHubIdentity({ first_name: 'Rodrigue', last_name: 'Adebigni' });
    expect(identity.initials).toBe('RA');
    expect(identity.displayName).toBe('Rodrigue Adebigni');
  });

  it('takes the first and last word of a single full name', () => {
    expect(resolveHubIdentity({ full_name: 'Marie Claire Diop' }).initials).toBe('MD');
  });

  it('falls back to the silhouette rather than to the e-mail address', () => {
    const identity = resolveHubIdentity({ email: 'e2e-fixture@example.com' });
    expect(identity.initials).toBeNull();
    expect(identity.displayName).toBeNull();
  });

  it('treats an empty profile as unknown, not as a person', () => {
    expect(resolveHubIdentity(null)).toEqual({
      displayName: null,
      initials: null,
      avatarUrl: null,
    });
  });

  it('accepts an https avatar', () => {
    expect(resolveHubIdentity({ avatar_url: 'https://cdn.example.com/a.png' }).avatarUrl).toBe(
      'https://cdn.example.com/a.png',
    );
  });

  it('refuses an avatar that is not https', () => {
    // `javascript:` in an src is the reason this check exists at all; plain
    // http would silently downgrade the page's transport for a decoration.
    for (const hostile of [
      'javascript:alert(1)',
      'http://cdn.example.com/a.png',
      'data:image/svg+xml,<svg onload="alert(1)"/>',
      'not-a-url',
    ]) {
      expect(resolveHubIdentity({ avatar_url: hostile }).avatarUrl).toBeNull();
    }
  });
});
