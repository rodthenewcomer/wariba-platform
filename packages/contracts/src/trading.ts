import { z } from 'zod';
import { symbolSchema } from './market';

// Client-submitted quantity/price-level strings reach Decimal.js deep inside
// the openPosition DB transaction (packages/domain/src/trading-math.ts) with
// no try/catch around that parse — an unconstrained z.string() (e.g. "NaN",
// "abc", "") crashes that transaction with an uncaught DecimalError instead
// of a clean REJECTION.INVALID_QUANTITY. Bounds (min/max/step) are still the
// server's job downstream; this only guarantees the string is parseable.
const decimalString = z.string().regex(/^\d+(\.\d+)?$/, 'must be a non-negative decimal string');

export const orderTypeSchema = z.enum([
  'market_open',
  'partial_close',
  'full_close',
  'close_all',
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
    quantity: decimalString,
    stopLoss: decimalString.optional(),
    takeProfit: decimalString.optional(),
  }),
  z.object({
    ...baseOrderFields,
    orderType: z.literal('partial_close'),
    positionId: z.string().uuid(),
    quantity: decimalString,
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
    stopLoss: decimalString.nullable(),
  }),
  z.object({
    ...baseOrderFields,
    orderType: z.literal('modify_tp'),
    positionId: z.string().uuid(),
    takeProfit: decimalString.nullable(),
  }),
]);
export type SubmitOrderMessage = z.infer<typeof submitOrderMessageSchema>;

export const closeAllMessageSchema = z.object({
  accountId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
});
export type CloseAllMessage = z.infer<typeof closeAllMessageSchema>;

// Prompt 7 Appendix 07-C §12/§16 — QueuePositionReductionDuringOutage. Only
// meaningful while the position's market data is stale/unavailable — a
// fresh market rejects this with 'market_not_stale' and expects the normal
// partial_close/full_close command instead (packages/database/src/
// position-reduction-queue.ts).
export const queueReductionMessageSchema = z.object({
  accountId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  positionId: z.string().uuid(),
  mode: z.enum(['partial', 'full']),
  quantity: decimalString.optional(),
});
export type QueueReductionMessage = z.infer<typeof queueReductionMessageSchema>;

export const cancelQueuedReductionMessageSchema = z.object({
  accountId: z.string().uuid(),
  queueId: z.string().uuid(),
});
export type CancelQueuedReductionMessage = z.infer<typeof cancelQueuedReductionMessageSchema>;

// --- Server -> client DTOs — all money/quantity fields are decimal strings ---

export const orderDtoSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  idempotencyKey: z.string(),
  orderType: orderTypeSchema,
  // Nullable: a Close All master has no single symbol/side/position, and a
  // rejected close/modify can reference no real position — see the matching
  // trade_orders nullability in packages/database.
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
  openingFillId: z.string().uuid().nullable(),
  orderId: z.string().uuid(),
  positionId: z.string().uuid(),
  symbol: symbolSchema,
  side: sideSchema,
  fillType: z.enum(['open', 'close']),
  quantity: z.string(),
  price: z.string(),
  commission: z.string(),
  realizedPnl: z.string(),
  openingPrice: z.string(),
  openedAt: z.string().datetime(),
  occurredAt: z.string().datetime(),
  durationMs: z.string().nullable(),
  allocatedOpenCommission: z.string(),
  netRealizedPnl: z.string().nullable(),
  eligibleRealizedPnl: z.string().nullable(),
  ineligibleShortDurationProfit: z.string(),
  eligibilityReason: z
    .enum(['eligible', 'short_duration_profit', 'loss_counted', 'breakeven'])
    .nullable(),
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

// Prompt 7 Appendix 07-C §12 — only ever carries 'queued' entries in
// AccountSnapshot.queuedReductions (executed/cancelled/failed rows drop out
// once settled — see loadQueuedReductionsForAccount); the result message
// below carries the terminal status of an individual submit/cancel/execute.
export const queuedReductionStatusSchema = z.enum(['queued', 'executed', 'cancelled', 'failed']);
export const queuedReductionDtoSchema = z.object({
  id: z.string().uuid(),
  positionId: z.string().uuid(),
  symbol: symbolSchema,
  mode: z.enum(['partial', 'full']),
  requestedQuantity: z.string().nullable(),
  status: queuedReductionStatusSchema,
  queuedAt: z.string().datetime(),
  executedAt: z.string().datetime().nullable(),
  cancelledAt: z.string().datetime().nullable(),
  executionOrderId: z.string().uuid().nullable(),
  failureReason: z.string().nullable(),
});
export type QueuedReductionDTO = z.infer<typeof queuedReductionDtoSchema>;

// Prompt 05 — mirrors @wariba/policies' RiskEngineResult, decoupled into its
// own DTO shape rather than importing the engine's internal type directly
// (same boundary discipline as every other DTO in this file).
export const evaluationAccountStatusSchema = z.enum([
  'pending_activation',
  'active',
  'soft_locked',
  'pass_pending',
  'inactive',
  'passed',
  'breached',
  'closed',
]);

// Prompt 07 Guardian — "concentration informative" (Rulebook §9.5): never
// blocking, the real gate is the aggregate exposure check at order time.
// Reuses the same three buckets that check already groups by
// (packages/database's FOREX_SYMBOLS/XAUUSD/NAS100 split).
export const exposureBucketSchema = z.enum(['forex', 'xauusd', 'nas100']);
export const concentrationBucketSchema = z.object({
  bucket: exposureBucketSchema,
  usedQuantity: z.string(),
  limitQuantity: z.string(),
  usedRatio: z.string(),
});
export type ConcentrationBucket = z.infer<typeof concentrationBucketSchema>;

export const accountRiskSchema = z.object({
  status: evaluationAccountStatusSchema,
  programEligibleBalance: z.string(),
  programEligibleEquity: z.string(),
  target: z.object({ required: z.string(), current: z.string(), reached: z.boolean() }),
  dailyLoss: z.object({
    reference: z.string(),
    floor: z.string(),
    used: z.string(),
    // Prompt 07 — mirrors maximumLoss.remaining below; the risk engine
    // itself doesn't compute this (only reference/floor/used), so
    // services/realtime/src/snapshot.ts derives it at the DTO boundary via
    // @wariba/domain's computeDailyLossRemaining.
    remaining: z.string(),
    softLockTriggered: z.boolean(),
  }),
  maximumLoss: z.object({ floor: z.string(), remaining: z.string(), breached: z.boolean() }),
  bestDay: z.object({ ratio: z.string().nullable(), compliant: z.boolean() }),
  eligibility: z.object({
    passEligible: z.boolean(),
    blockingReasons: z.array(z.string()),
  }),
  concentration: z.array(concentrationBucketSchema),
  shortDurationMonitoring: z.object({
    status: z.enum(['normal', 'warning', 'entry_locked']),
    count24h: z.number().int().nonnegative(),
  }),
});
export type AccountRisk = z.infer<typeof accountRiskSchema>;

export const accountSnapshotSchema = z.object({
  accountId: z.string().uuid(),
  nominalBalance: z.string(),
  balance: z.string(),
  programEligibleBalance: z.string(),
  equity: z.string(),
  accountSequence: z.number().int().nonnegative(),
  openPositions: z.array(positionDtoSchema),
  recentOrders: z.array(orderDtoSchema),
  recentFills: z.array(fillDtoSchema),
  profitEligibility: z.object({
    enabled: z.boolean(),
    minimumDurationMs: z.number().int().nonnegative(),
  }),
  // Null only before the account's first-ever trade (no daily snapshot
  // exists yet to evaluate against) — see buildAccountSnapshot.
  risk: accountRiskSchema.nullable(),
  // Prompt 7 Appendix 07-C §12 — always 'queued' entries only (see
  // queuedReductionDtoSchema's doc comment); this is how a client learns
  // "PENDING MARKET RESUME" state survived a reconnect.
  queuedReductions: z.array(queuedReductionDtoSchema),
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

// Prompt 7 Appendix 07-C §12 — response to both queue_reduction and
// cancel_queued_reduction. rejectionCode covers both a rejected *submission*
// (e.g. market_not_stale, invalid_quantity) and a rejected *cancellation*
// (queue_entry_already_settled) — the client tells them apart by which
// command it sent, same as order_result already does for every order type.
export const queueReductionResultMessageSchema = z.object({
  type: z.literal('queue_reduction_result'),
  idempotencyKey: z.string().uuid().nullable(),
  status: z.enum(['queued', 'cancelled', 'rejected']),
  rejectionCode: z.string().nullable(),
  queueEntry: queuedReductionDtoSchema.nullable(),
});
export type QueueReductionResultMessage = z.infer<typeof queueReductionResultMessageSchema>;

/**
 * Prompt 07 — Guardian/RiskRibbon liveness. `buildAccountSnapshot` already
 * live-prices equity/dailyLoss/maximumLoss on every call, but only gets
 * called on (re)subscribe or after an order; this is a periodic re-push
 * (services/realtime/src/websocket.ts, ~4s, only while positions are open)
 * of just the price-sensitive fields, computed by the same server-side logic
 * — never a client-side recomputation.
 *
 * Deliberately NOT part of the account.snapshot sequence stream: it doesn't
 * carry accountSequence and isn't gap-tracked (apps/web/lib/realtime-client.ts
 * — see channelForEnvelope), because trading_accounts.version only advances
 * on a real trade, not on a price tick, and this message fires on price
 * ticks alone. Reusing account.snapshot's sequence here would make the
 * client silently drop it as a stale duplicate.
 *
 * Payload shape only; `type` lives on the envelope, same convention as
 * MarketTick/AccountSnapshot.
 */
export const accountRiskPreviewMessageSchema = z.object({
  accountId: z.string().uuid(),
  equity: z.string(),
  risk: accountRiskSchema.nullable(),
});
export type AccountRiskPreviewMessage = z.infer<typeof accountRiskPreviewMessageSchema>;
