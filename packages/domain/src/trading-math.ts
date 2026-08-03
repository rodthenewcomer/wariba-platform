import Decimal from 'decimal.js';

/**
 * Pure trading calculations — Decimal.js only, decimal strings in and out,
 * never float (Engineering Constitution money rule). No DB/IO dependency:
 * packages/database's execution transaction calls these while holding the
 * account row lock, but the math itself doesn't know that.
 *
 * TRD-007/008: buy-open uses ask, sell-open uses bid; buy-close uses bid,
 * sell-close uses ask — "buy"/"sell" here is always the POSITION's side,
 * never a separate "close order direction".
 */

export type OrderSide = 'buy' | 'sell';
export type FillAction = 'open' | 'close';

export function quotedPrice(params: {
  bid: string;
  ask: string;
  positionSide: OrderSide;
  action: FillAction;
}): string {
  const { bid, ask, positionSide, action } = params;
  if (action === 'open') {
    return positionSide === 'buy' ? ask : bid;
  }
  return positionSide === 'buy' ? bid : ask;
}

/**
 * Deterministic (not random) slippage: always adverse to the trader, by
 * exactly `slippagePoints * 10^-pricePrecision`. Opening a buy or closing a
 * sell moves the fill price up; opening a sell or closing a buy moves it down.
 */
export function applySlippage(params: {
  quotedPrice: string;
  positionSide: OrderSide;
  action: FillAction;
  slippagePoints: string;
  pricePrecision: number;
}): string {
  const { positionSide, action, slippagePoints, pricePrecision } = params;
  const pointValue = new Decimal(10).pow(-pricePrecision);
  const slippageAmount = new Decimal(slippagePoints).times(pointValue);
  const adverse =
    (action === 'open' && positionSide === 'buy') ||
    (action === 'close' && positionSide === 'sell');
  const signedSlippage = adverse ? slippageAmount : slippageAmount.negated();
  return new Decimal(params.quotedPrice).plus(signedSlippage).toFixed(pricePrecision);
}

export function computeFillPrice(params: {
  bid: string;
  ask: string;
  positionSide: OrderSide;
  action: FillAction;
  slippagePoints: string;
  pricePrecision: number;
}): string {
  const quoted = quotedPrice(params);
  return applySlippage({ ...params, quotedPrice: quoted });
}

export function computeRealizedPnl(params: {
  openPrice: string;
  closePrice: string;
  quantity: string;
  contractSize: string;
  positionSide: OrderSide;
}): string {
  const { openPrice, closePrice, quantity, contractSize, positionSide } = params;
  const priceDelta =
    positionSide === 'buy'
      ? new Decimal(closePrice).minus(openPrice)
      : new Decimal(openPrice).minus(closePrice);
  return priceDelta.times(contractSize).times(quantity).toFixed(2);
}

export function computeCommission(params: { quantity: string; commissionPerLot: string }): string {
  return new Decimal(params.commissionPerLot).times(params.quantity).toFixed(2);
}

/**
 * TRD-020: average_open_price on a position is always the single opening
 * fill's price (hedging model, no order-level partial fills) — this
 * function exists only so callers never hand-roll "the average is just the
 * fill price" and forget it if the model ever changes.
 */
export function openingAveragePrice(fillPrice: string): string {
  return fillPrice;
}

export function isQuantityWithinBounds(params: {
  quantity: string;
  minimumQuantity: string;
  maximumQuantity: string;
  quantityStep: string;
}): boolean {
  const quantity = new Decimal(params.quantity);
  if (quantity.lessThan(params.minimumQuantity) || quantity.greaterThan(params.maximumQuantity)) {
    return false;
  }
  const step = new Decimal(params.quantityStep);
  const remainder = quantity.minus(params.minimumQuantity).modulo(step);
  return remainder.isZero();
}

export function isStale(params: {
  tickTimestamp: string;
  now: Date;
  staleThresholdMs: number;
}): boolean {
  const ageMs = params.now.getTime() - new Date(params.tickTimestamp).getTime();
  return ageMs > params.staleThresholdMs;
}

/** A partial close must close strictly less than what's open — closing all of it is a full_close order. */
export function isPartialCloseQuantityValid(params: {
  requestedQuantity: string;
  openQuantity: string;
}): boolean {
  const requested = new Decimal(params.requestedQuantity);
  if (requested.lessThanOrEqualTo(0)) {
    return false;
  }
  return requested.lessThan(params.openQuantity);
}

export function subtractQuantity(openQuantity: string, closedQuantity: string): string {
  return new Decimal(openQuantity).minus(closedQuantity).toFixed(4);
}

export function addRealizedPnl(current: string, delta: string): string {
  return new Decimal(current).plus(delta).toFixed(2);
}
