import { z } from 'zod';

export const productCodeSchema = z.enum(['5K', '10K', '25K', '50K', '100K']);
export type ProductCode = z.infer<typeof productCodeSchema>;

/**
 * Checkout input intentionally carries NO amount, price, or currency field.
 * AGENTS.md invariant: "prix serveur uniquement ; devise serveur uniquement."
 * The server looks up the current product_version's price by productCode —
 * a client can never supply or influence a monetary value here. This is a
 * hard invariant, not a convenience: accepting a client-supplied amount here
 * is exactly the stop condition Prompt 03 names ("si le client contrôle le
 * montant").
 */
export const checkoutInputSchema = z.object({
  productCode: productCodeSchema,
  idempotencyKey: z.string().uuid(),
  acceptSimulatedAccountDisclosure: z.literal(true),
});
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

/**
 * Sandbox PSP webhook envelope. `signature` is verified against the raw body
 * before this schema is even parsed (HMAC check happens on the raw bytes,
 * not the parsed JSON) — see packages/adapters SandboxPaymentProvider.
 */
export const sandboxWebhookEventSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.enum(['payment.confirmed', 'payment.failed']),
  purchaseOrderId: z.string().uuid(),
  // Bounded to at most 9 integer digits (below Number.MAX_SAFE_INTEGER's
  // ~15-16 significant digits with room to spare) — every real product
  // price is a few hundred at most, so this only exists to reject an
  // absurd/adversarial value, not to constrain a legitimate one. `> 0`
  // rejects a "payment.confirmed" event for $0, which is never a real
  // payment.
  amount: z
    .string()
    .regex(/^\d{1,9}\.\d{2}$/, 'Amount must be a decimal string with 2 places')
    .refine((value) => Number.parseFloat(value) > 0, 'Amount must be positive'),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Currency must be an uppercase ISO 4217 code'),
  occurredAt: z.string().datetime(),
});
export type SandboxWebhookEvent = z.infer<typeof sandboxWebhookEventSchema>;
