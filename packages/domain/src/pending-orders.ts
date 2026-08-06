import Decimal from 'decimal.js';
import type { OrderSide } from './trading-math';

/**
 * Prompt 7 Appendix 07-D — pure validation/trigger/fill-price semantics for
 * WariX's four pending-order types. No leadership/fencing/failover model
 * exists anywhere in this codebase (services/realtime is a single process
 * with an in-memory market simulator — packages/adapters/src/
 * market-data-provider.ts) — these functions provide exactly-once-safe
 * semantics for THAT real architecture (a single authoritative writer,
 * Postgres transactions + idempotency keys, exactly the model every other
 * command in this codebase already uses), not for a distributed
 * active/standby setup that would need to be a separate infrastructure
 * project first. See the Appendix 07-D final report for the explicit list
 * of what genuine multi-node failover would require.
 */
export type PendingOrderType = 'buy_limit' | 'sell_limit' | 'buy_stop' | 'sell_stop';

export function pendingOrderSide(orderType: PendingOrderType): OrderSide {
  return orderType === 'buy_limit' || orderType === 'buy_stop' ? 'buy' : 'sell';
}

/**
 * Creation-time price protection (appendix §4). A limit/stop price on the
 * wrong side of the current market at creation would either fill
 * immediately (defeating the point of a limit) or never trigger at all
 * (a stop already past its own level).
 */
export function isPendingOrderCreationPriceValid(params: {
  orderType: PendingOrderType;
  triggerPrice: string;
  currentBid: string;
  currentAsk: string;
}): boolean {
  const price = new Decimal(params.triggerPrice);
  switch (params.orderType) {
    case 'buy_limit':
      return price.lessThan(params.currentAsk);
    case 'sell_limit':
      return price.greaterThan(params.currentBid);
    case 'buy_stop':
      return price.greaterThan(params.currentAsk);
    case 'sell_stop':
      return price.lessThan(params.currentBid);
  }
}

/** Whether the current authoritative bid/ask satisfies this order's trigger condition right now. */
export function isPendingOrderTriggered(params: {
  orderType: PendingOrderType;
  triggerPrice: string;
  currentBid: string;
  currentAsk: string;
}): boolean {
  const price = new Decimal(params.triggerPrice);
  switch (params.orderType) {
    case 'buy_limit':
      return new Decimal(params.currentAsk).lessThanOrEqualTo(price);
    case 'sell_limit':
      return new Decimal(params.currentBid).greaterThanOrEqualTo(price);
    case 'buy_stop':
      return new Decimal(params.currentAsk).greaterThanOrEqualTo(price);
    case 'sell_stop':
      return new Decimal(params.currentBid).lessThanOrEqualTo(price);
  }
}

/**
 * Limit-order price protection on the actual fill (appendix §4: "A Buy
 * Limit must never fill above its limit price" / "must never fill below").
 * The shared fill-price computation (computeFillPrice in trading-math.ts)
 * applies deterministic adverse slippage on top of the raw quoted price —
 * correct and desired for a market order, but for a limit order it could
 * push an already-valid trigger price past the limit. Stop orders are
 * explicitly exempt: "the execution may be above/below the stop price when
 * the market gaps or moves quickly" is the documented, intended behavior,
 * so their fill price is never clamped.
 */
export function clampPendingOrderFillPrice(params: {
  orderType: PendingOrderType;
  fillPrice: string;
  triggerPrice: string;
  pricePrecision: number;
}): string {
  if (params.orderType === 'buy_limit') {
    return Decimal.min(params.fillPrice, params.triggerPrice).toFixed(params.pricePrecision);
  }
  if (params.orderType === 'sell_limit') {
    return Decimal.max(params.fillPrice, params.triggerPrice).toFixed(params.pricePrecision);
  }
  return params.fillPrice;
}

/** Appendix §17 — distance-from-market preview for the pending-order confirmation UI, same "points" convention as chart-overlay.ts. */
export function pendingOrderDistancePoints(params: {
  triggerPrice: string;
  referencePrice: string;
  pricePrecision: number;
}): string {
  const point = new Decimal(10).pow(-params.pricePrecision);
  return new Decimal(params.triggerPrice)
    .minus(params.referencePrice)
    .abs()
    .dividedBy(point)
    .toFixed(1);
}
