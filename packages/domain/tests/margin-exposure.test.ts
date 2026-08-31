import { describe, expect, it } from 'vitest';
import {
  computeCanonicalNotionalExposure,
  evaluateGrossExposure,
  evaluateMarginExposure,
} from '../src/index';

const leverage = { FX: 50, METALS: 20, INDICES: 20, ENERGY: 10 } as const;

describe('V2 margin exposure capability', () => {
  it('computes margin but refuses enforcement while calibration is open', () => {
    expect(
      evaluateMarginExposure({
        equity: '10000',
        exposures: [{ assetGroup: 'FX', notionalAmount: '50000' }],
        leverageByAssetGroup: leverage,
        candidateCapRate: '0.20',
        calibrationStatus: 'calibration_required',
      }),
    ).toEqual({
      requiredMargin: '1000.00000000',
      marginUsageRate: '0.10000000',
      candidateCapRate: '0.20000000',
      enforcementReady: false,
      allowed: false,
      reasonCode: 'MARGIN_CALIBRATION_REQUIRED',
    });
  });

  it('enforces only after validation, including the exact cap boundary', () => {
    const atBoundary = evaluateMarginExposure({
      equity: '10000',
      exposures: [{ assetGroup: 'FX', notionalAmount: '100000' }],
      leverageByAssetGroup: leverage,
      candidateCapRate: '0.20',
      calibrationStatus: 'validated',
    });
    expect(atBoundary.allowed).toBe(true);
    expect(atBoundary.reasonCode).toBe('WITHIN_MARGIN_CAP');
    const above = evaluateMarginExposure({
      equity: '10000',
      exposures: [{ assetGroup: 'FX', notionalAmount: '100000.50' }],
      leverageByAssetGroup: leverage,
      candidateCapRate: '0.20',
      calibrationStatus: 'validated',
    });
    expect(above.allowed).toBe(false);
    expect(above.reasonCode).toBe('MARGIN_CAP_EXCEEDED');
  });
});

describe('V2 canonical gross exposure', () => {
  it('uses absolute notional and never nets opposite legs', () => {
    expect(
      evaluateGrossExposure({
        nominalBalance: '100000',
        exposures: [{ notionalAmount: '100000' }, { notionalAmount: '-100000' }],
        maximumMultiple: '3.00',
      }),
    ).toMatchObject({
      grossExposure: '200000.00000000',
      grossExposureRate: '2.00000000',
      allowed: true,
    });
  });

  it('allows the smallest unit below and the exact cap, then rejects the smallest unit above', () => {
    const belowCap = evaluateGrossExposure({
      nominalBalance: '5000',
      exposures: [{ notionalAmount: '14999.99999999' }],
      maximumMultiple: '3.00',
    });
    const atCap = evaluateGrossExposure({
      nominalBalance: '5000',
      exposures: [{ notionalAmount: '15000.00000000' }],
      maximumMultiple: '3.00',
    });
    const aboveCap = evaluateGrossExposure({
      nominalBalance: '5000',
      exposures: [{ notionalAmount: '15000.00000001' }],
      maximumMultiple: '3.00',
    });
    expect(belowCap.allowed).toBe(true);
    expect(atCap.allowed).toBe(true);
    expect(atCap.reasonCode).toBe('WITHIN_GROSS_EXPOSURE_CAP');
    expect(aboveCap.allowed).toBe(false);
    expect(aboveCap.reasonCode).toBe('GROSS_EXPOSURE_EXCEEDED');
  });

  it('aggregates same-side, cross-symbol, and cross-asset notionals under one cap', () => {
    const combined = evaluateGrossExposure({
      nominalBalance: '10000',
      exposures: [
        { notionalAmount: '8000' },
        { notionalAmount: '7000' },
        { notionalAmount: '9000' },
      ],
      maximumMultiple: '3.00',
    });
    expect(combined).toMatchObject({
      grossExposure: '24000.00000000',
      grossExposureRate: '2.40000000',
      allowed: true,
    });
  });

  it('converts supported USD instruments and fails closed without a safe account FX path', () => {
    expect(
      computeCanonicalNotionalExposure({
        symbol: 'EURUSD',
        quantity: '1',
        contractSize: '100000',
        price: '1.10',
        accountCurrency: 'USD',
      }),
    ).toMatchObject({ ready: true, amount: '110000.00000000' });
    expect(
      computeCanonicalNotionalExposure({
        symbol: 'USDJPY',
        quantity: '1',
        contractSize: '100000',
        price: '150.00',
        accountCurrency: 'USD',
      }),
    ).toMatchObject({ ready: true, amount: '100000.00000000' });
    expect(
      computeCanonicalNotionalExposure({
        symbol: 'XAUUSD',
        quantity: '1',
        contractSize: '100',
        price: '2000',
        accountCurrency: 'EUR',
      }),
    ).toEqual({
      ready: false,
      amount: null,
      currency: 'EUR',
      reasonCode: 'EXPOSURE_CONVERSION_UNAVAILABLE',
    });
  });
});
