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

/**
 * Rounds to 4 decimals, matching app.fills.commission and
 * symbol_specs.commission_per_lot (both numeric(10,4)) — this is the
 * precision those columns have always supported; rounding to 2 here would
 * needlessly throw away digits they can already hold. Prompt 7 Appendix
 * 07-B widened app.trading_ledger_entries.amount to numeric(20,8)
 * specifically so the ledger entry this value is written into (see
 * packages/database/src/trading.ts) never truncates it back down —
 * without that, a fill's own stored `commission` (evidence) could diverge
 * from what the ledger says actually left the account's balance.
 */
export function computeCommission(params: { quantity: string; commissionPerLot: string }): string {
  return new Decimal(params.commissionPerLot).times(params.quantity).toFixed(4);
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

/**
 * Rules v1.1 aggregate exposure gate. Quantities are decimal strings from
 * PostgreSQL; the proposed order is accepted only when the combined open
 * exposure remains at or below the account-size limit.
 */
export function isAggregateExposureAllowed(params: {
  currentOpenQuantities: readonly string[];
  requestedQuantity: string;
  maximumAggregateQuantity: string;
}): boolean {
  const current = params.currentOpenQuantities.reduce(
    (sum, quantity) => sum.plus(quantity),
    new Decimal(0),
  );
  return current.plus(params.requestedQuantity).lessThanOrEqualTo(params.maximumAggregateQuantity);
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

/**
 * Prompt 07 — Guardian/Order Ticket margin preview. Standard notional/leverage
 * formula, no order-book or funding-rate modeling (none exists in this
 * sandbox). `leverage` is the account's per-symbol-class effective leverage
 * (already resolved by the caller from leverage_one/leverage_performance —
 * this function doesn't know about programs, only the number to divide by).
 */
export function estimateRequiredMargin(params: {
  quantity: string;
  price: string;
  contractSize: string;
  leverage: number;
}): string {
  const notional = new Decimal(params.quantity).times(params.contractSize).times(params.price);
  return notional.dividedBy(params.leverage).toFixed(2);
}

export interface ExposureBucketUsage {
  bucket: string;
  usedQuantity: string;
  limitQuantity: string;
}

export type ExposureBucketConcentration = ExposureBucketUsage & { usedRatio: string };

/**
 * Prompt 07 Guardian — "concentration informative" (Rulebook §9.5: informative
 * only, never blocking; the actual gate is isAggregateExposureAllowed at
 * order time). Reuses whatever buckets the caller already built for the
 * exposure gate (packages/database's FOREX_SYMBOLS/XAUUSD/NAS100 split) —
 * this function only turns used/limit pairs into a ratio, it doesn't know
 * about symbols. A zero limit reads as zero concentration rather than
 * dividing by zero; a ratio above 1 is left as-is (informative, not clamped)
 * since it can legitimately happen if a limit tightened after positions were
 * already open.
 */
export function computeConcentration(
  buckets: readonly ExposureBucketUsage[],
): ExposureBucketConcentration[] {
  return buckets.map((bucket) => ({
    ...bucket,
    usedRatio: new Decimal(bucket.limitQuantity).isZero()
      ? '0.0000'
      : new Decimal(bucket.usedQuantity).dividedBy(bucket.limitQuantity).toFixed(4),
  }));
}
