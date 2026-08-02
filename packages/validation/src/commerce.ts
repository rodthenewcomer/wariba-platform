import { z } from 'zod';

export const productCodeSchema = z.enum(['5K', '10K', '25K']);
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
  amount: z.string().regex(/^\d+\.\d{2}$/, 'Amount must be a decimal string with 2 places'),
  currency: z.string().length(3),
  occurredAt: z.string().datetime(),
});
export type SandboxWebhookEvent = z.infer<typeof sandboxWebhookEventSchema>;
