import { describe, expect, it } from 'vitest';
import {
  quotedPrice,
  applySlippage,
  computeFillPrice,
  computeRealizedPnl,
  computeCommission,
  isQuantityWithinBounds,
  isStale,
  isPartialCloseQuantityValid,
  subtractQuantity,
  addRealizedPnl,
} from '../src/trading-math';

const BID = '1.08450';
const ASK = '1.08460';

describe('quotedPrice — TRD-007/008', () => {
  it('opening a buy position uses ask', () => {
    expect(quotedPrice({ bid: BID, ask: ASK, positionSide: 'buy', action: 'open' })).toBe(ASK);
  });
  it('opening a sell position uses bid', () => {
    expect(quotedPrice({ bid: BID, ask: ASK, positionSide: 'sell', action: 'open' })).toBe(BID);
  });
  it('closing a buy position uses bid', () => {
    expect(quotedPrice({ bid: BID, ask: ASK, positionSide: 'buy', action: 'close' })).toBe(BID);
  });
  it('closing a sell position uses ask', () => {
    expect(quotedPrice({ bid: BID, ask: ASK, positionSide: 'sell', action: 'close' })).toBe(ASK);
  });
});

describe('applySlippage — deterministic, always adverse to the trader', () => {
  const base = { slippagePoints: '2', pricePrecision: 5 };

  it('moves the price up when opening a buy', () => {
    const result = applySlippage({
      ...base,
      quotedPrice: ASK,
      positionSide: 'buy',
      action: 'open',
    });
    expect(result).toBe('1.08462');
  });

  it('moves the price down when opening a sell', () => {
    const result = applySlippage({
      ...base,
      quotedPrice: BID,
      positionSide: 'sell',
      action: 'open',
    });
    expect(result).toBe('1.08448');
  });

  it('moves the price down when closing a buy (adverse to the seller-side close action)', () => {
    const result = applySlippage({
      ...base,
      quotedPrice: BID,
      positionSide: 'buy',
      action: 'close',
    });
    expect(result).toBe('1.08448');
  });

  it('moves the price up when closing a sell', () => {
    const result = applySlippage({
      ...base,
      quotedPrice: ASK,
      positionSide: 'sell',
      action: 'close',
    });
    expect(result).toBe('1.08462');
  });

  it('respects a different price precision (e.g. USDJPY at 3 decimals)', () => {
    const result = applySlippage({
      quotedPrice: '150.500',
      positionSide: 'buy',
      action: 'open',
      slippagePoints: '5',
      pricePrecision: 3,
    });
    expect(result).toBe('150.505');
  });
});

describe('computeFillPrice', () => {
  it('composes quotedPrice + applySlippage for a buy open', () => {
    const result = computeFillPrice({
      bid: BID,
      ask: ASK,
      positionSide: 'buy',
      action: 'open',
      slippagePoints: '2',
      pricePrecision: 5,
    });
    expect(result).toBe('1.08462');
  });
});

describe('computeRealizedPnl', () => {
  it('is positive for a buy position when the close price is higher than the open price', () => {
    const result = computeRealizedPnl({
      openPrice: '1.08000',
      closePrice: '1.08500',
      quantity: '1',
      contractSize: '100000',
      positionSide: 'buy',
    });
    expect(result).toBe('500.00');
  });

  it('is negative for a buy position when the close price is lower than the open price', () => {
    const result = computeRealizedPnl({
      openPrice: '1.08500',
      closePrice: '1.08000',
      quantity: '1',
      contractSize: '100000',
      positionSide: 'buy',
    });
    expect(result).toBe('-500.00');
  });

  it('is positive for a sell position when the close price is lower than the open price', () => {
    const result = computeRealizedPnl({
      openPrice: '1.08500',
      closePrice: '1.08000',
      quantity: '1',
      contractSize: '100000',
      positionSide: 'sell',
    });
    expect(result).toBe('500.00');
  });

  it('scales with a fractional quantity (e.g. 0.10 lot)', () => {
    const result = computeRealizedPnl({
      openPrice: '1.08000',
      closePrice: '1.08500',
      quantity: '0.10',
      contractSize: '100000',
      positionSide: 'buy',
    });
    expect(result).toBe('50.00');
  });
});

describe('computeCommission', () => {
  it('scales linearly with quantity', () => {
    expect(computeCommission({ quantity: '0.10', commissionPerLot: '7.00' })).toBe('0.70');
    expect(computeCommission({ quantity: '2', commissionPerLot: '7.00' })).toBe('14.00');
  });
});

describe('isQuantityWithinBounds', () => {
  const bounds = { minimumQuantity: '0.01', maximumQuantity: '10', quantityStep: '0.01' };

  it('accepts a quantity within bounds and on the step', () => {
    expect(isQuantityWithinBounds({ ...bounds, quantity: '0.10' })).toBe(true);
  });

  it('rejects below the minimum', () => {
    expect(isQuantityWithinBounds({ ...bounds, quantity: '0.001' })).toBe(false);
  });

  it('rejects above the maximum', () => {
    expect(isQuantityWithinBounds({ ...bounds, quantity: '10.01' })).toBe(false);
  });

  it('rejects a quantity not on the step', () => {
    expect(isQuantityWithinBounds({ ...bounds, quantity: '0.105' })).toBe(false);
  });
});

describe('isStale', () => {
  it('is not stale when the tick is fresh', () => {
    const now = new Date('2026-01-01T00:00:05.000Z');
    expect(
      isStale({ tickTimestamp: '2026-01-01T00:00:04.500Z', now, staleThresholdMs: 5000 }),
    ).toBe(false);
  });

  it('is stale when the tick is older than the threshold', () => {
    const now = new Date('2026-01-01T00:00:10.000Z');
    expect(
      isStale({ tickTimestamp: '2026-01-01T00:00:00.000Z', now, staleThresholdMs: 5000 }),
    ).toBe(true);
  });
});

describe('isPartialCloseQuantityValid', () => {
  it('accepts a quantity strictly less than what is open', () => {
    expect(isPartialCloseQuantityValid({ requestedQuantity: '0.05', openQuantity: '0.10' })).toBe(
      true,
    );
  });

  it('rejects closing the entire open quantity (that is a full_close, not a partial_close)', () => {
    expect(isPartialCloseQuantityValid({ requestedQuantity: '0.10', openQuantity: '0.10' })).toBe(
      false,
    );
  });

  it('rejects a quantity greater than what is open', () => {
    expect(isPartialCloseQuantityValid({ requestedQuantity: '0.20', openQuantity: '0.10' })).toBe(
      false,
    );
  });

  it('rejects a zero or negative quantity', () => {
    expect(isPartialCloseQuantityValid({ requestedQuantity: '0', openQuantity: '0.10' })).toBe(
      false,
    );
  });
});

describe('subtractQuantity / addRealizedPnl', () => {
  it('subtracts a closed quantity from the open quantity', () => {
    expect(subtractQuantity('0.10', '0.03')).toBe('0.0700');
  });

  it('accumulates realized PnL', () => {
    expect(addRealizedPnl('10.00', '5.50')).toBe('15.50');
    expect(addRealizedPnl('10.00', '-3.00')).toBe('7.00');
  });
});
