import Decimal from 'decimal.js';

export type V2AssetGroup = 'FX' | 'METALS' | 'INDICES' | 'ENERGY';
export type MarginCalibrationStatus = 'calibration_required' | 'validated';

export interface MarginExposureLine {
  assetGroup: V2AssetGroup;
  notionalAmount: string;
}

export interface MarginExposureEvaluation {
  requiredMargin: string;
  marginUsageRate: string;
  candidateCapRate: string;
  enforcementReady: boolean;
  allowed: boolean;
  reasonCode: 'WITHIN_MARGIN_CAP' | 'MARGIN_CAP_EXCEEDED' | 'MARGIN_CALIBRATION_REQUIRED';
}

/**
 * Computes gross margin usage from explicit asset-group leverage. The
 * candidate 20/15/10 caps are never enforced while calibration is open:
 * activation readiness must fail instead of pretending an unvalidated cap is
 * production truth.
 */
export function evaluateMarginExposure(params: {
  equity: string;
  exposures: readonly MarginExposureLine[];
  leverageByAssetGroup: Readonly<Record<V2AssetGroup, number>>;
  candidateCapRate: string;
  calibrationStatus: MarginCalibrationStatus;
}): MarginExposureEvaluation {
  const equity = new Decimal(params.equity);
  if (equity.lessThanOrEqualTo(0)) {
    throw new Error('Margin exposure requires strictly positive equity.');
  }

  const requiredMargin = params.exposures.reduce((total, exposure) => {
    const leverage = params.leverageByAssetGroup[exposure.assetGroup];
    if (!Number.isSafeInteger(leverage) || leverage <= 0) {
      throw new Error(`Invalid leverage for ${exposure.assetGroup}.`);
    }
    const notional = new Decimal(exposure.notionalAmount);
    if (notional.isNegative()) throw new Error('Exposure notional cannot be negative.');
    return total.plus(notional.dividedBy(leverage));
  }, new Decimal(0));
  const marginUsageRate = requiredMargin.dividedBy(equity);
  const candidateCapRate = new Decimal(params.candidateCapRate);

  if (params.calibrationStatus !== 'validated') {
    return {
      requiredMargin: requiredMargin.toFixed(8),
      marginUsageRate: marginUsageRate.toFixed(8),
      candidateCapRate: candidateCapRate.toFixed(8),
      enforcementReady: false,
      allowed: false,
      reasonCode: 'MARGIN_CALIBRATION_REQUIRED',
    };
  }

  const allowed = marginUsageRate.lessThanOrEqualTo(candidateCapRate);
  return {
    requiredMargin: requiredMargin.toFixed(8),
    marginUsageRate: marginUsageRate.toFixed(8),
    candidateCapRate: candidateCapRate.toFixed(8),
    enforcementReady: true,
    allowed,
    reasonCode: allowed ? 'WITHIN_MARGIN_CAP' : 'MARGIN_CAP_EXCEEDED',
  };
}
