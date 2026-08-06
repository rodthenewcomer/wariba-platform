import { describe, expect, it } from 'vitest';
import {
  roundPriceToTick,
  computeLevelPnlPreview,
  computeRiskRewardRatio,
  computePartialClosePresetQuantity,
  roundCustomPartialCloseQuantity,
  computeNetPnlAfterFees,
} from '../src/chart-overlay';

describe('roundPriceToTick', () => {
  it('rounds to the symbol precision', () => {
    expect(roundPriceToTick({ price: '1.084521', pricePrecision: 5 })).toBe('1.08452');
    expect(roundPriceToTick({ price: '1950.2', pricePrecision: 2 })).toBe('1950.20');
  });
});

describe('computeLevelPnlPreview', () => {
  it('a long Stop Loss below reference price previews a loss', () => {
    const preview = computeLevelPnlPreview({
      levelPrice: '1.08290',
      referencePrice: '1.08452',
      positionSide: 'buy',
      quantity: '0.50',
      contractSize: '100000',
      pricePrecision: 5,
      accountEquity: '10000.00',
    });
    expect(preview.distancePoints).toBe('162.0');
    expect(Number(preview.estimatedPnl)).toBeLessThan(0);
    expect(preview.estimatedPnl).toBe('-81.00');
    expect(preview.percentOfAccountEquity).toBe('0.81');
  });

  it('a long Take Profit above reference price previews a profit', () => {
    const preview = computeLevelPnlPreview({
      levelPrice: '1.08740',
      referencePrice: '1.08452',
      positionSide: 'buy',
      quantity: '0.50',
      contractSize: '100000',
      pricePrecision: 5,
      accountEquity: '10000.00',
    });
    expect(Number(preview.estimatedPnl)).toBeGreaterThan(0);
    expect(preview.estimatedPnl).toBe('144.00');
  });

  it('a short Stop Loss above reference price previews a loss', () => {
    const preview = computeLevelPnlPreview({
      levelPrice: '1.08600',
      referencePrice: '1.08452',
      positionSide: 'sell',
      quantity: '0.50',
      contractSize: '100000',
      pricePrecision: 5,
      accountEquity: '10000.00',
    });
    expect(Number(preview.estimatedPnl)).toBeLessThan(0);
  });

  it('zero equity never divides by zero', () => {
    const preview = computeLevelPnlPreview({
      levelPrice: '1.08290',
      referencePrice: '1.08452',
      positionSide: 'buy',
      quantity: '0.50',
      contractSize: '100000',
      pricePrecision: 5,
      accountEquity: '0.00',
    });
    expect(preview.percentOfAccountEquity).toBe('0.00');
  });
});

describe('computeRiskRewardRatio', () => {
  it('computes reward/risk from the reference price', () => {
    const ratio = computeRiskRewardRatio({
      stopLossPrice: '1.08290',
      takeProfitPrice: '1.08740',
      referencePrice: '1.08452',
    });
    expect(ratio).toBe('1.78');
  });

  it('is null when either level is missing', () => {
    expect(
      computeRiskRewardRatio({
        stopLossPrice: null,
        takeProfitPrice: '1.08740',
        referencePrice: '1.08452',
      }),
    ).toBeNull();
  });

  it('is null when the stop loss sits exactly on the reference price', () => {
    expect(
      computeRiskRewardRatio({
        stopLossPrice: '1.08452',
        takeProfitPrice: '1.08740',
        referencePrice: '1.08452',
      }),
    ).toBeNull();
  });
});

describe('computePartialClosePresetQuantity', () => {
  it('25% of 1.00 lot at a 0.01 step rounds to 0.25', () => {
    expect(
      computePartialClosePresetQuantity({
        openQuantity: '1.00',
        percent: 25,
        quantityStep: '0.01',
        minimumQuantity: '0.01',
      }),
    ).toBe('0.25');
  });

  it('50% of 1.00 lot rounds to 0.50', () => {
    expect(
      computePartialClosePresetQuantity({
        openQuantity: '1.00',
        percent: 50,
        quantityStep: '0.01',
        minimumQuantity: '0.01',
      }),
    ).toBe('0.50');
  });

  it('75% of 1.00 lot rounds to 0.75', () => {
    expect(
      computePartialClosePresetQuantity({
        openQuantity: '1.00',
        percent: 75,
        quantityStep: '0.01',
        minimumQuantity: '0.01',
      }),
    ).toBe('0.75');
  });

  it('never rounds up to the full open quantity — steps back below it', () => {
    // 75% of 0.03 at a 0.01 step rounds to 0.02 (0.0225 -> nearest step 0.02),
    // which is fine; but a percent that would round exactly to openQuantity
    // must step back one increment rather than silently becoming a full close.
    const result = computePartialClosePresetQuantity({
      openQuantity: '0.02',
      percent: 75,
      quantityStep: '0.01',
      minimumQuantity: '0.01',
    });
    expect(result).not.toBe('0.02');
    expect(Number(result)).toBeLessThan(0.02);
  });

  it('returns null when rounding would produce zero or an invalid lot size', () => {
    const result = computePartialClosePresetQuantity({
      openQuantity: '0.01',
      percent: 25,
      quantityStep: '0.01',
      minimumQuantity: '0.01',
    });
    expect(result).toBeNull();
  });
});

describe('roundCustomPartialCloseQuantity', () => {
  it('rounds down to the nearest valid step', () => {
    expect(
      roundCustomPartialCloseQuantity({
        requestedQuantity: '0.37',
        openQuantity: '1.00',
        quantityStep: '0.01',
      }),
    ).toBe('0.37');
    expect(
      roundCustomPartialCloseQuantity({
        requestedQuantity: '0.375',
        openQuantity: '1.00',
        quantityStep: '0.01',
      }),
    ).toBe('0.37');
  });

  it('never reaches the open quantity — steps back one increment so it stays a genuine partial close', () => {
    expect(
      roundCustomPartialCloseQuantity({
        requestedQuantity: '5.00',
        openQuantity: '1.00',
        quantityStep: '0.01',
      }),
    ).toBe('0.99');
  });

  it('a request already at the open quantity also steps back rather than landing on the boundary', () => {
    expect(
      roundCustomPartialCloseQuantity({
        requestedQuantity: '1.00',
        openQuantity: '1.00',
        quantityStep: '0.01',
      }),
    ).toBe('0.99');
  });
});

describe('computeNetPnlAfterFees', () => {
  it('subtracts fees from a positive gross PnL', () => {
    expect(computeNetPnlAfterFees({ grossPnl: '50.00', fees: '1.75' })).toBe('48.25');
  });

  it('handles a negative gross PnL', () => {
    expect(computeNetPnlAfterFees({ grossPnl: '-20.00', fees: '1.75' })).toBe('-21.75');
  });
});
