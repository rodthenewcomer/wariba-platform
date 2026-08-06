import { z } from 'zod';
import { symbolSchema } from './market';

/**
 * Prompt 7 Appendix 07-D — Buy/Sell Limit/Stop pending orders. See
 * packages/database/src/pending-orders.ts for the server-side lifecycle
 * these messages drive.
 */
const decimalString = z.string().regex(/^\d+(\.\d+)?$/, 'must be a non-negative decimal string');

export const pendingOrderTypeSchema = z.enum(['buy_limit', 'sell_limit', 'buy_stop', 'sell_stop']);
export type PendingOrderType = z.infer<typeof pendingOrderTypeSchema>;

export const pendingOrderStatusSchema = z.enum([
  'active',
  'triggered',
  'filled',
  'cancelled',
  'rejected',
  'suspended_market_data',
  'failed',
]);
export type PendingOrderStatus = z.infer<typeof pendingOrderStatusSchema>;

export const createPendingOrderMessageSchema = z.object({
  accountId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  symbol: symbolSchema,
  orderType: pendingOrderTypeSchema,
  quantity: decimalString,
  triggerPrice: decimalString,
  stopLoss: decimalString.optional(),
  takeProfit: decimalString.optional(),
});
export type CreatePendingOrderMessage = z.infer<typeof createPendingOrderMessageSchema>;

// No idempotency key on modify/cancel — same convention as
// cancelQueuedReduction (Appendix 07-C): safety comes from the
// version-guarded update / status check on the row itself, not a retried
// side-effect that needs deduping.
export const modifyPendingOrderMessageSchema = z.object({
  accountId: z.string().uuid(),
  pendingOrderId: z.string().uuid(),
  triggerPrice: decimalString.optional(),
  quantity: decimalString.optional(),
  stopLoss: decimalString.nullable().optional(),
  takeProfit: decimalString.nullable().optional(),
});
export type ModifyPendingOrderMessage = z.infer<typeof modifyPendingOrderMessageSchema>;

export const cancelPendingOrderMessageSchema = z.object({
  accountId: z.string().uuid(),
  pendingOrderId: z.string().uuid(),
});
export type CancelPendingOrderMessage = z.infer<typeof cancelPendingOrderMessageSchema>;

export const cancelAllPendingOrdersMessageSchema = z.object({
  accountId: z.string().uuid(),
});
export type CancelAllPendingOrdersMessage = z.infer<typeof cancelAllPendingOrdersMessageSchema>;

export const pendingOrderDtoSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  symbol: symbolSchema,
  side: z.enum(['buy', 'sell']),
  orderType: pendingOrderTypeSchema,
  quantity: z.string(),
  triggerPrice: z.string(),
  requestedStopLoss: z.string().nullable(),
  requestedTakeProfit: z.string().nullable(),
  status: pendingOrderStatusSchema,
  version: z.number().int().nonnegative(),
  rejectionCode: z.string().nullable(),
  executionOrderId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  triggeredAt: z.string().datetime().nullable(),
  filledAt: z.string().datetime().nullable(),
  cancelledAt: z.string().datetime().nullable(),
});
export type PendingOrderDTO = z.infer<typeof pendingOrderDtoSchema>;

export const pendingOrderResultMessageSchema = z.object({
  type: z.literal('pending_order_result'),
  idempotencyKey: z.string().uuid().nullable(),
  status: z.enum(['active', 'rejected']),
  rejectionCode: z.string().nullable(),
  order: pendingOrderDtoSchema.nullable(),
});
export type PendingOrderResultMessage = z.infer<typeof pendingOrderResultMessageSchema>;
