import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Port interface — a real PSP adapter implements the same shape later
 * (Prompt Pack non-scope for Prompt 03: "provider réel"). The sandbox
 * implementation below is the only one that exists right now.
 */
export interface PaymentProvider {
  initiate(params: {
    purchaseOrderId: string;
    amount: string;
    currency: string;
  }): Promise<{ providerReference: string; redirectUrl: string }>;

  /**
   * Verifies a raw webhook body against its signature header. Must be run
   * on the *raw* request bytes, before JSON parsing — signing a
   * re-serialized object can silently accept a tampered payload if
   * key order or whitespace differs from what was signed.
   */
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;
}

const SIGNATURE_PREFIX = 'sha256=';

/**
 * Deterministic sandbox PSP. System Architecture §112: sandbox providers
 * must fail-fast if ever selected in production — see assertNotSandboxInProduction
 * in @wariba/config, called by the checkout route before this adapter is used.
 */
export class SandboxPaymentProvider implements PaymentProvider {
  constructor(private readonly webhookSecret: string) {
    if (!webhookSecret) {
      throw new Error('SandboxPaymentProvider requires a non-empty webhook secret.');
    }
  }

  initiate(params: { purchaseOrderId: string; amount: string; currency: string }): Promise<{
    providerReference: string;
    redirectUrl: string;
  }> {
    const providerReference = `sandbox_${params.purchaseOrderId}`;
    return Promise.resolve({
      providerReference,
      redirectUrl: `/checkout/sandbox-pay?ref=${providerReference}`,
    });
  }

  /** Signs a webhook payload the same way the sandbox provider's simulated sender does. */
  signWebhookBody(rawBody: string): string {
    const digest = createHmac('sha256', this.webhookSecret).update(rawBody, 'utf8').digest('hex');
    return `${SIGNATURE_PREFIX}${digest}`;
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    if (!signatureHeader.startsWith(SIGNATURE_PREFIX)) {
      return false;
    }
    const provided = signatureHeader.slice(SIGNATURE_PREFIX.length);
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody, 'utf8').digest('hex');

    const providedBuffer = Buffer.from(provided, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    // Constant-time comparison — a naive `===` leaks timing information an
    // attacker can use to forge a valid signature byte by byte.
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return timingSafeEqual(providedBuffer, expectedBuffer);
  }
}
