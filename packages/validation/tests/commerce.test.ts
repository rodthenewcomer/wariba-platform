import { describe, expect, it } from 'vitest';
import { checkoutInputSchema, sandboxWebhookEventSchema } from '../src/commerce';

describe('checkoutInputSchema', () => {
  it('accepts a canonical V2 offer identity and idempotency key', () => {
    const result = checkoutInputSchema.safeParse({
      kind: 'initial_purchase',
      offerId: 'FLEX-10',
      idempotencyKey: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      acceptSimulatedAccountDisclosure: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts all three V2 families and five public sizes', () => {
    for (const family of ['ONE', 'FLEX', 'INSTANT']) {
      for (const size of ['5', '10', '25', '50', '100']) {
        const result = checkoutInputSchema.safeParse({
          kind: 'initial_purchase',
          offerId: `${family}-${size}`,
          idempotencyKey: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          acceptSimulatedAccountDisclosure: true,
        });
        expect(result.success).toBe(true);
      }
    }
  });

  it('rejects an unknown product code', () => {
    const result = checkoutInputSchema.safeParse({
      kind: 'initial_purchase',
      offerId: 'ONE-1000',
      idempotencyKey: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      acceptSimulatedAccountDisclosure: true,
    });
    expect(result.success).toBe(false);
  });

  it('has no amount/price/currency field at all — the schema shape itself enforces server-only pricing', () => {
    const shapeKeys = checkoutInputSchema.options.flatMap((option) => Object.keys(option.shape));
    expect(shapeKeys).not.toContain('amount');
    expect(shapeKeys).not.toContain('price');
    expect(shapeKeys).not.toContain('currency');
  });

  it('accepts an existing FLEX activation order without a client-supplied amount', () => {
    expect(
      checkoutInputSchema.safeParse({
        kind: 'flex_activation',
        activationOrderId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        acceptSimulatedAccountDisclosure: true,
      }).success,
    ).toBe(true);
  });

  it('requires an explicit simulated-account disclosure acceptance', () => {
    const result = checkoutInputSchema.safeParse({
      kind: 'initial_purchase',
      offerId: 'ONE-10',
      idempotencyKey: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    });
    expect(result.success).toBe(false);
  });
});

describe('sandboxWebhookEventSchema', () => {
  const valid = {
    eventId: 'evt_123',
    eventType: 'payment.confirmed' as const,
    purchaseOrderId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    amount: '27900.00',
    currency: 'XOF',
    occurredAt: new Date().toISOString(),
  };

  it('accepts a well-formed sandbox event', () => {
    expect(sandboxWebhookEventSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an amount with wrong decimal shape (e.g. a bare float-looking string)', () => {
    expect(sandboxWebhookEventSchema.safeParse({ ...valid, amount: '27900' }).success).toBe(false);
    expect(sandboxWebhookEventSchema.safeParse({ ...valid, amount: '27900.5' }).success).toBe(
      false,
    );
  });

  it('rejects an unknown event type', () => {
    expect(
      sandboxWebhookEventSchema.safeParse({ ...valid, eventType: 'payment.pending' }).success,
    ).toBe(false);
  });

  it('rejects a zero amount — never a real "payment.confirmed" event', () => {
    expect(sandboxWebhookEventSchema.safeParse({ ...valid, amount: '0.00' }).success).toBe(false);
  });

  it('rejects an unbounded digit count', () => {
    expect(
      sandboxWebhookEventSchema.safeParse({ ...valid, amount: '99999999999999999999.00' }).success,
    ).toBe(false);
  });

  it('rejects a lowercase or malformed currency code', () => {
    expect(sandboxWebhookEventSchema.safeParse({ ...valid, currency: 'xof' }).success).toBe(false);
    expect(sandboxWebhookEventSchema.safeParse({ ...valid, currency: '12$' }).success).toBe(false);
  });
});
