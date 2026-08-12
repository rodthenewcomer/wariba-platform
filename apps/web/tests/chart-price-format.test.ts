import { describe, expect, it } from 'vitest';
import {
  chartPriceFormatFor,
  RENDERER_DEFAULT_PRICE_FORMAT,
  type ChartPriceFormat,
} from '../app/(trade)/trade/chart-price-format';

/**
 * W4 visual closure §6 — every renderer-drawn price label respects the
 * instrument's own `SymbolSpec.pricePrecision`.
 *
 * The defect this locks down: with no `priceFormat` on the series,
 * lightweight-charts printed two decimals for everything, so EURUSD's Bid and
 * Ask axis labels read `1.09 / 1.09` while the market was 1.08504 / 1.08514 —
 * a 10-pip presentation error on a 1-pip spread.
 *
 * The fixtures below are the **live** `app.symbol_specs.price_precision`
 * values, not invented ones:
 *
 *   EURUSD 5   GBPUSD 5   USDJPY 3   XAUUSD 2   NAS100 1
 *
 * Each case asserts the rendered label a trader would actually read, by
 * applying the format the same way the renderer does. Asserting the
 * `{ precision, minMove }` object alone would pass for a format that is
 * internally consistent and still prints the wrong number of digits.
 */

/** What lightweight-charts prints for a price under a given format. */
function renderedLabel(price: number, format: ChartPriceFormat): string {
  return price.toFixed(format.precision);
}

const SHIPPED_INSTRUMENTS = [
  {
    symbol: 'EURUSD',
    pricePrecision: 5,
    bid: 1.08504,
    ask: 1.08514,
    expectedBid: '1.08504',
    expectedAsk: '1.08514',
    minMove: 0.00001,
  },
  {
    symbol: 'GBPUSD',
    pricePrecision: 5,
    bid: 1.25824,
    ask: 1.25839,
    expectedBid: '1.25824',
    expectedAsk: '1.25839',
    minMove: 0.00001,
  },
  {
    symbol: 'USDJPY',
    pricePrecision: 3,
    bid: 149.797,
    ask: 149.809,
    expectedBid: '149.797',
    expectedAsk: '149.809',
    minMove: 0.001,
  },
  {
    symbol: 'XAUUSD',
    pricePrecision: 2,
    bid: 1998.62,
    ask: 1998.92,
    expectedBid: '1998.62',
    expectedAsk: '1998.92',
    minMove: 0.01,
  },
  {
    symbol: 'NAS100',
    pricePrecision: 1,
    bid: 18008.9,
    ask: 18010.9,
    expectedBid: '18008.9',
    expectedAsk: '18010.9',
    minMove: 0.1,
  },
] as const;

describe('chartPriceFormatFor — shipped instruments', () => {
  for (const instrument of SHIPPED_INSTRUMENTS) {
    it(`prints ${instrument.symbol} at ${instrument.pricePrecision} decimals`, () => {
      const format = chartPriceFormatFor(instrument.pricePrecision);

      expect(format.precision).toBe(instrument.pricePrecision);
      expect(format.minMove).toBeCloseTo(instrument.minMove, 10);

      // The label a trader reads on the Bid and Ask axis lines.
      expect(renderedLabel(instrument.bid, format)).toBe(instrument.expectedBid);
      expect(renderedLabel(instrument.ask, format)).toBe(instrument.expectedAsk);
    });
  }

  it('never leaves a sub-cent instrument on the renderer’s two-decimal default', () => {
    // The specific regression. Under the default, EURUSD's bid and ask collapse
    // onto the same label and the spread becomes invisible.
    const eurusd = SHIPPED_INSTRUMENTS[0];
    expect(renderedLabel(eurusd.bid, RENDERER_DEFAULT_PRICE_FORMAT)).toBe(
      renderedLabel(eurusd.ask, RENDERER_DEFAULT_PRICE_FORMAT),
    );

    const format = chartPriceFormatFor(eurusd.pricePrecision);
    expect(renderedLabel(eurusd.bid, format)).not.toBe(renderedLabel(eurusd.ask, format));
  });

  it('keeps the tick spacing at the instrument’s own point, not the default cent', () => {
    // minMove drives the price-scale step, so a correct `precision` with a
    // stale `minMove` prints right numbers on wrong gridlines.
    for (const instrument of SHIPPED_INSTRUMENTS) {
      const format = chartPriceFormatFor(instrument.pricePrecision);
      expect(format.minMove).toBeCloseTo(10 ** -instrument.pricePrecision, 10);
    }
  });

  it('agrees with the one-point keyboard nudge step used for SL/TP handles', () => {
    // TradeChart nudges a level by `Number(\`1e-${pricePrecision}\`)`. If these
    // two ever diverge, a single arrow press would move a level by less than
    // the chart can draw, or by more than one visible tick.
    for (const instrument of SHIPPED_INSTRUMENTS) {
      expect(chartPriceFormatFor(instrument.pricePrecision).minMove).toBe(
        Number(`1e-${instrument.pricePrecision}`),
      );
    }
  });
});

describe('chartPriceFormatFor — inputs that cannot come from a valid spec', () => {
  it('falls back to the renderer default rather than throwing', () => {
    // A chart that prints two decimals is wrong; a chart that fails to mount
    // is worse. `null` is the honest "no spec yet" input.
    for (const invalid of [null, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 99]) {
      expect(chartPriceFormatFor(invalid as number | null)).toEqual(RENDERER_DEFAULT_PRICE_FORMAT);
    }
  });

  it('accepts a whole-number instrument (zero decimals)', () => {
    const format = chartPriceFormatFor(0);
    expect(format.precision).toBe(0);
    expect(format.minMove).toBe(1);
    expect(renderedLabel(18009.4, format)).toBe('18009');
  });
});
