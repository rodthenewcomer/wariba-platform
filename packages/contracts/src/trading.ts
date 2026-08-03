import { z } from 'zod';
import { symbolSchema } from './market';

export const orderTypeSchema = z.enum([
  'market_open',
  'partial_close',
  'full_close',
  'modify_sl',
  'modify_tp',
]);
export type OrderType = z.infer<typeof orderTypeSchema>;

export const sideSchema = z.enum(['buy', 'sell']);
export type Side = z.infer<typeof sideSchema>;

export const tradeOrderStatusSchema = z.enum([
  'received',
  'validated',
  'accepted',
  'filled',
  'rejected',
  'cancelled',
]);

export const positionStatusSchema = z.enum(['open', 'closed']);

// --- Client -> server: order submission over the authenticated WebSocket ---
// TRD-006: no client-supplied price. TRD-013: no offline orders — every
// field here is either an instruction (what to do) or an idempotency key,
// never a price or PnL value the server would trust.

// A WS connection is authenticated as a user, not an account — a user can
// hold more than one trading account (one per purchased evaluation), so
// every command names which one it's for. Ownership is verified server-side
// before anything reaches packages/database.
const baseOrderFields = {
  accountId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
};

export const submitOrderMessageSchema = z.discriminatedUnion('orderType', [
  z.object({
    ...baseOrderFields,
    orderType: z.literal('market_open'),
    symbol: symbolSchema,
    side: sideSchema,
    quantity: z.string(),
    stopLoss: z.string().optional(),
    takeProfit: z.string().optional(),
  }),
  z.object({
    ...baseOrderFields,
    orderType: z.literal('partial_close'),
    positionId: z.string().uuid(),
    quantity: z.string(),
  }),
  z.object({
    ...baseOrderFields,
    orderType: z.literal('full_close'),
    positionId: z.string().uuid(),
  }),
  z.object({
    ...baseOrderFields,
    orderType: z.literal('modify_sl'),
    positionId: z.string().uuid(),
    stopLoss: z.string().nullable(),
  }),
  z.object({
    ...baseOrderFields,
    orderType: z.literal('modify_tp'),
    positionId: z.string().uuid(),
    takeProfit: z.string().nullable(),
  }),
]);
export type SubmitOrderMessage = z.infer<typeof submitOrderMessageSchema>;

export const closeAllMessageSchema = z.object({
  accountId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
});
export type CloseAllMessage = z.infer<typeof closeAllMessageSchema>;

// --- Server -> client DTOs — all money/quantity fields are decimal strings ---

export const orderDtoSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  orderType: orderTypeSchema,
  // Nullable: a close/modify order rejected because its position_id didn't
  // exist has no real symbol/side to report — see the matching
  // trade_orders.symbol/side nullability in packages/database.
  symbol: symbolSchema.nullable(),
  side: sideSchema.nullable(),
  positionId: z.string().uuid().nullable(),
  requestedQuantity: z.string().nullable(),
  filledQuantity: z.string(),
  status: tradeOrderStatusSchema,
  rejectionCode: z.string().nullable(),
  receivedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});
export type OrderDTO = z.infer<typeof orderDtoSchema>;

export const fillDtoSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  positionId: z.string().uuid(),
  symbol: symbolSchema,
  side: sideSchema,
  fillType: z.enum(['open', 'close']),
  quantity: z.string(),
  price: z.string(),
  commission: z.string(),
  realizedPnl: z.string(),
  occurredAt: z.string().datetime(),
});
export type FillDTO = z.infer<typeof fillDtoSchema>;

export const positionDtoSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  symbol: symbolSchema,
  side: sideSchema,
  openQuantity: z.string(),
  averageOpenPrice: z.string(),
  realizedPnl: z.string(),
  stopLoss: z.string().nullable(),
  takeProfit: z.string().nullable(),
  status: positionStatusSchema,
  openedAt: z.string().datetime(),
  closedAt: z.string().datetime().nullable(),
});
export type PositionDTO = z.infer<typeof positionDtoSchema>;

export const accountSnapshotSchema = z.object({
  accountId: z.string().uuid(),
  balance: z.string(),
  equity: z.string(),
  accountSequence: z.number().int().nonnegative(),
  openPositions: z.array(positionDtoSchema),
  recentOrders: z.array(orderDtoSchema),
});
export type AccountSnapshot = z.infer<typeof accountSnapshotSchema>;

export const orderResultMessageSchema = z.object({
  type: z.literal('order_result'),
  idempotencyKey: z.string().uuid(),
  status: z.enum(['filled', 'rejected']),
  rejectionCode: z.string().nullable(),
  order: orderDtoSchema.nullable(),
  position: positionDtoSchema.nullable(),
  fill: fillDtoSchema.nullable(),
});
export type OrderResultMessage = z.infer<typeof orderResultMessageSchema>;
