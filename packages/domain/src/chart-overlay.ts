import Decimal from 'decimal.js';
import { computeRealizedPnl, type OrderSide } from './trading-math';

/**
 * Prompt 7 Appendix 07-C — pure preview math for WariX's chart-based SL/TP
 * drag and partial-close UI. Every function here is a PREVIEW only: the
 * server independently recomputes and validates everything on submit
 * (packages/database/src/trading.ts). Nothing exported here is ever trusted
 * as the executed price, fee or PnL — Decimal.js/decimal strings throughout,
 * same as every other money calculation in this codebase.
 *
 * No "pip" convention is used (a pip's decimal position is an FX-specific
 * convention that doesn't hold for XAUUSD/NAS100) — distance is expressed in
 * "points": the symbol's smallest quoted increment, 10^-pricePrecision.
 */

/** The smallest quoted price increment for a symbol, as a Decimal. */
function pointSize(pricePrecision: number): Decimal {
  return new Decimal(10).pow(-pricePrecision);
}

export function roundPriceToTick(params: { price: string; pricePrecision: number }): string {
  return new Decimal(params.price).toFixed(params.pricePrecision);
}

/**
 * Digits after the decimal point in a quantity-step string, e.g. "0.01" -> 2.
 * Uses Decimal.js's own digit representation rather than counting the raw
 * string's length after the dot: app.symbol_specs.quantity_step is a
 * numeric(14,4) column, so the server always delivers it right-padded to
 * that column's declared scale ("0.0100", never "0.01") — counting string
 * length directly would return 4 there, not the step's actual 2 meaningful
 * decimals, producing quantities like "0.0500" instead of "0.05".
 * Decimal.js drops insignificant trailing zeros when parsing a string, so
 * `.decimalPlaces()` reports the value's real precision regardless of how
 * many trailing zeros the source string happened to have.
 */
function decimalPlacesOf(value: string): number {
  return new Decimal(value).decimalPlaces();
}

export interface LevelPnlPreview {
  levelPrice: string;
  /** Unsigned distance from the reference price, in points (10^-pricePrecision units). */
  distancePoints: string;
  /** Signed — negative for a loss (typically the SL side), positive for a profit (typically TP). */
  estimatedPnl: string;
  /** Unsigned percentage of current account equity, 2dp. */
  percentOfAccountEquity: string;
}

/**
 * Shared math behind both the Stop Loss and Take Profit drag/exact-price
 * previews (appendix §4's example cards) — what happens to PnL if this
 * position were closed at `levelPrice` right now, using the same
 * computeRealizedPnl the server uses for both realized and (via
 * PositionsTabPanel) live unrealized PnL, so the preview and the eventual
 * fill/summary numbers are always the same formula.
 */
export function computeLevelPnlPreview(params: {
  levelPrice: string;
  /** Current executable close price for this position (quotedPrice(action:'close')), not the level itself. */
  referencePrice: string;
  positionSide: OrderSide;
  quantity: string;
  contractSize: string;
  pricePrecision: number;
  accountEquity: string;
}): LevelPnlPreview {
  const distancePoints = new Decimal(params.levelPrice)
    .minus(params.referencePrice)
    .abs()
    .dividedBy(pointSize(params.pricePrecision))
    .toFixed(1);
  const estimatedPnl = computeRealizedPnl({
    openPrice: params.referencePrice,
    closePrice: params.levelPrice,
    quantity: params.quantity,
    contractSize: params.contractSize,
    positionSide: params.positionSide,
  });
  const equity = new Decimal(params.accountEquity);
  const percentOfAccountEquity = equity.isZero()
    ? '0.00'
    : new Decimal(estimatedPnl).abs().dividedBy(equity).times(100).toFixed(2);
  return {
    levelPrice: params.levelPrice,
    distancePoints,
    estimatedPnl,
    percentOfAccountEquity,
  };
}

/**
 * Take Profit distance divided by Stop Loss distance, both measured from the
 * current reference price — null when either level is missing or SL sits
 * exactly on the reference price (division by zero, not a real ratio).
 */
export function computeRiskRewardRatio(params: {
  stopLossPrice: string | null;
  takeProfitPrice: string | null;
  referencePrice: string;
}): string | null {
  if (!params.stopLossPrice || !params.takeProfitPrice) return null;
  const risk = new Decimal(params.referencePrice).minus(params.stopLossPrice).abs();
  const reward = new Decimal(params.takeProfitPrice).minus(params.referencePrice).abs();
  if (risk.isZero()) return null;
  return reward.dividedBy(risk).toFixed(2);
}

/**
 * Partial-close preset -> quantity, rounded to the symbol's lot step.
 * Never returns a quantity >= openQuantity (a full close is a separate,
 * clearly labelled action — appendix §9) and never below the symbol's
 * minimum tradable quantity; returns null when the preset can't produce a
 * valid quantity at all, so the caller can disable that preset with a reason
 * instead of silently rounding into an invalid order.
 */
export function computePartialClosePresetQuantity(params: {
  openQuantity: string;
  percent: 25 | 50 | 75;
  quantityStep: string;
  minimumQuantity: string;
}): string | null {
  const step = new Decimal(params.quantityStep);
  const raw = new Decimal(params.openQuantity).times(params.percent).dividedBy(100);
  let rounded = raw.dividedBy(step).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).times(step);
  if (rounded.greaterThanOrEqualTo(params.openQuantity)) {
    rounded = rounded.minus(step);
  }
  if (rounded.lessThan(params.minimumQuantity) || rounded.lessThanOrEqualTo(0)) {
    return null;
  }
  return rounded.toFixed(decimalPlacesOf(params.quantityStep));
}

/**
 * A custom quantity input rounded down to the nearest valid lot step.
 * Strictly below openQuantity, same as computePartialClosePresetQuantity —
 * a request at or above what's open steps back one increment rather than
 * landing exactly on the boundary (which isPartialCloseQuantityValid would
 * then reject as "not a partial close" with no obvious next step); the
 * sheet's own "Fermer la position entière" action is the intended path for
 * closing everything.
 */
export function roundCustomPartialCloseQuantity(params: {
  requestedQuantity: string;
  openQuantity: string;
  quantityStep: string;
}): string {
  const step = new Decimal(params.quantityStep);
  const requested = Decimal.min(params.requestedQuantity, params.openQuantity);
  let rounded = requested.dividedBy(step).toDecimalPlaces(0, Decimal.ROUND_DOWN).times(step);
  if (rounded.greaterThanOrEqualTo(params.openQuantity)) {
    rounded = rounded.minus(step);
  }
  return Decimal.max(rounded, 0).toFixed(decimalPlacesOf(params.quantityStep));
}

/**
 * Partial-close preview's "net PnL" line (appendix §9/§10) — gross realized
 * PnL for the previewed quantity minus its estimated commission. Exists so
 * the browser (apps/web has no decimal.js dependency at all — money math
 * only ever happens via this package's exported functions, never raw
 * Decimal in application code) can show this without importing Decimal.js
 * directly.
 */
export function computeNetPnlAfterFees(params: { grossPnl: string; fees: string }): string {
  return new Decimal(params.grossPnl).minus(params.fees).toFixed(2);
}

/** Which side of the entry a protective level must sit on, given the position. */
export type ProtectionLevelKind = 'stop_loss' | 'take_profit';

export type ProtectionPlacement = 'above_entry' | 'below_entry';

/**
 * Where a protective level legally sits relative to entry — VX1-D.1 §3.
 *
 * This is the whole rule, stated once, in the one place both the chart and the
 * ticket can read it:
 *
 *     LONG   →   TP above entry,  SL below entry
 *     SHORT  →   SL above entry,  TP below entry
 *
 * The side decides the *price direction*; it never changes what the two levels
 * economically mean. A take profit is the expected gain on both sides, and a
 * stop loss is the expected loss on both sides — which is why this returns a
 * placement and not a swap. Nothing in WariX may "fix" an inverted input by
 * exchanging the two values: that would turn a trader's mistake into a
 * different order than the one they typed.
 */
export function protectionPlacementFor(
  side: OrderSide,
  kind: ProtectionLevelKind,
): ProtectionPlacement {
  const isLong = side === 'buy';
  if (kind === 'take_profit') return isLong ? 'above_entry' : 'below_entry';
  return isLong ? 'below_entry' : 'above_entry';
}

/**
 * Is this price a legal place for this level on this position?
 *
 * Advisory, and deliberately so: the server re-runs its own validation and
 * remains the only authority on whether an order is accepted. This exists so
 * the interface can mark an invalid drag *before* the trader releases it,
 * rather than letting them commit a level the exchange will refuse — and so it
 * can say which way is valid instead of only that something is wrong.
 *
 * A level exactly at the entry is not legal on either side: a stop or target
 * that triggers at the price you opened at is not a protection, it is a
 * round trip.
 */
export function isProtectionLevelValid(params: {
  side: OrderSide;
  kind: ProtectionLevelKind;
  entryPrice: string;
  levelPrice: string;
}): boolean {
  const entry = new Decimal(params.entryPrice);
  const level = new Decimal(params.levelPrice);
  if (level.equals(entry)) return false;
  return protectionPlacementFor(params.side, params.kind) === 'above_entry'
    ? level.greaterThan(entry)
    : level.lessThan(entry);
}
