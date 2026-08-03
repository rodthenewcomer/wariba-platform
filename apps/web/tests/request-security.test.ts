import { describe, expect, it } from 'vitest';
import { hasTrustedMutationOrigin } from '../lib/request-security';

describe('hasTrustedMutationOrigin', () => {
  const appBaseUrl = 'https://wariba.app';

  it('accepts the configured application origin', () => {
    const request = new Request('https://wariba.app/api/v1/orders', {
      method: 'POST',
      headers: { origin: 'https://wariba.app' },
    });

    expect(hasTrustedMutationOrigin(request, appBaseUrl)).toBe(true);
  });

  it('rejects a missing origin', () => {
    const request = new Request('https://wariba.app/api/v1/orders', { method: 'POST' });

    expect(hasTrustedMutationOrigin(request, appBaseUrl)).toBe(false);
  });

  it('rejects an attacker-controlled origin even when the request Host is attacker-controlled', () => {
    const request = new Request('https://evil.example/api/v1/orders', {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
    });

    expect(hasTrustedMutationOrigin(request, appBaseUrl)).toBe(false);
  });
});
