import { describe, expect, it } from 'vitest';
import { evaluateMarginExposure } from '../src/index';

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
