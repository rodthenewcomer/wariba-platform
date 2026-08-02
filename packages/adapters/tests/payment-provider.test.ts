import { describe, expect, it } from 'vitest';
import { SandboxPaymentProvider } from '../src/payment-provider';

describe('SandboxPaymentProvider', () => {
  it('rejects an empty webhook secret at construction — fail fast, not at first webhook', () => {
    expect(() => new SandboxPaymentProvider('')).toThrow();
  });

  it('verifies a correctly signed body', () => {
    const provider = new SandboxPaymentProvider('test-secret');
    const body = JSON.stringify({ eventId: 'evt_1', amount: '100.00' });
    const signature = provider.signWebhookBody(body);
    expect(provider.verifyWebhookSignature(body, signature)).toBe(true);
  });

  it('rejects a tampered body against the original signature', () => {
    const provider = new SandboxPaymentProvider('test-secret');
    const original = JSON.stringify({ eventId: 'evt_1', amount: '100.00' });
    const tampered = JSON.stringify({ eventId: 'evt_1', amount: '999999.00' });
    const signature = provider.signWebhookBody(original);
    expect(provider.verifyWebhookSignature(tampered, signature)).toBe(false);
  });

  it('rejects a signature produced with the wrong secret', () => {
    const provider = new SandboxPaymentProvider('test-secret');
    const attacker = new SandboxPaymentProvider('attacker-guessed-secret');
    const body = JSON.stringify({ eventId: 'evt_1' });
    const forgedSignature = attacker.signWebhookBody(body);
    expect(provider.verifyWebhookSignature(body, forgedSignature)).toBe(false);
  });

  it('rejects a signature missing the expected prefix', () => {
    const provider = new SandboxPaymentProvider('test-secret');
    expect(provider.verifyWebhookSignature('{}', 'not-a-real-signature')).toBe(false);
  });

  it('rejects a malformed (non-hex) signature without throwing', () => {
    const provider = new SandboxPaymentProvider('test-secret');
    expect(() => provider.verifyWebhookSignature('{}', 'sha256=not-hex-zzz')).not.toThrow();
    expect(provider.verifyWebhookSignature('{}', 'sha256=not-hex-zzz')).toBe(false);
  });

  it('rejects an empty body signature mismatch cleanly', () => {
    const provider = new SandboxPaymentProvider('test-secret');
    expect(provider.verifyWebhookSignature('', 'sha256=deadbeef')).toBe(false);
  });

  it('initiate() returns a sandbox-labeled reference, never a bare/production-looking one', () => {
    const provider = new SandboxPaymentProvider('test-secret');
    return provider
      .initiate({ purchaseOrderId: 'po_123', amount: '100.00', currency: 'XOF' })
      .then((result) => {
        expect(result.providerReference).toMatch(/^sandbox_/);
      });
  });
});
