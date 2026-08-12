/**
 * W4 visual closure §6 — how the renderer is told to print a price.
 *
 * **The defect.** `TradeChart` never gave lightweight-charts a `priceFormat`,
 * so the series kept the library's default `{ precision: 2, minMove: 0.01 }`.
 * Every label the *renderer* draws therefore printed two decimals regardless of
 * the instrument: the price-scale ticks, the crosshair label, and — most
 * visibly — the Bid and Ask axis labels, which showed `1.09 / 1.09` on EURUSD
 * while the market was 1.08504 / 1.08514. A 10-pip presentation error on a
 * 1-pip spread.
 *
 * **Scope.** Presentation only. No authoritative price changes: the server's
 * strings still reach the overlay untouched (`priceFormatted` on the position,
 * SL/TP, pending-order and alert handles is the server's own value, printed
 * verbatim), and nothing here rounds, clamps or re-derives a price. This module
 * only tells the renderer how many decimals to draw.
 *
 * **Why `minMove` matters as much as `precision`.** lightweight-charts uses
 * `minMove` to choose the price-scale tick spacing, not merely to round. Left
 * at 0.01 on EURUSD the scale would still step in cents — five orders of
 * magnitude coarser than the instrument trades — so a correct `precision` with
 * a stale `minMove` produces correctly-printed labels on wrong gridlines.
 *
 * The `1e-{precision}` idiom is the one already used for the keyboard nudge
 * step in TradeChart, kept identical so the two cannot drift.
 */

export interface ChartPriceFormat {
  type: 'price';
  precision: number;
  minMove: number;
}

/**
 * The library's own default, and what the chart was silently using. Named so
 * the tests can assert the shipped instruments are *not* this.
 */
export const RENDERER_DEFAULT_PRICE_FORMAT: ChartPriceFormat = {
  type: 'price',
  precision: 2,
  minMove: 0.01,
};

/** lightweight-charts renders at most 8 decimals; beyond that it is noise anyway. */
const MAXIMUM_PRECISION = 8;

/**
 * The renderer's price format for an instrument, from its own
 * `SymbolSpec.pricePrecision`.
 *
 * A precision that is not a finite non-negative integer cannot come from a
 * valid spec, so it falls back to the library default rather than throwing: a
 * chart that prints two decimals is wrong, and a chart that fails to mount is
 * worse. `null` is the honest input for "no spec yet" and takes the same path —
 * the caller simply does not apply a format until one arrives.
 */
export function chartPriceFormatFor(pricePrecision: number | null): ChartPriceFormat {
  if (
    pricePrecision === null ||
    !Number.isInteger(pricePrecision) ||
    pricePrecision < 0 ||
    pricePrecision > MAXIMUM_PRECISION
  ) {
    return RENDERER_DEFAULT_PRICE_FORMAT;
  }
  return {
    type: 'price',
    precision: pricePrecision,
    // `Number('1e-5')` is the exact double nearest 0.00001 — the same value a
    // literal 0.00001 produces, and the same expression TradeChart already uses
    // for its one-point keyboard nudge.
    minMove: Number(`1e-${pricePrecision}`),
  };
}
