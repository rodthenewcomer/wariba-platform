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

export type CanonicalNotionalSymbol = 'EURUSD' | 'GBPUSD' | 'USDJPY' | 'XAUUSD' | 'NAS100';

export type CanonicalNotionalExposureResult =
  | { ready: true; amount: string; currency: 'USD' }
  | { ready: false; amount: null; currency: string; reasonCode: 'EXPOSURE_CONVERSION_UNAVAILABLE' };

/**
 * Converts one position leg to the account's canonical base currency.
 *
 * Every currently tradable WARIBA instrument is USD-denominated. EURUSD,
 * GBPUSD, XAUUSD and NAS100 are quoted in USD, while USDJPY is converted from
 * JPY through its authoritative live USDJPY quote (which algebraically leaves
 * quantity × contract size in USD). Any non-USD account or unknown runtime
 * symbol fails closed instead of inventing an FX rate.
 */
export function computeCanonicalNotionalExposure(params: {
  symbol: CanonicalNotionalSymbol;
  quantity: string;
  contractSize: string;
  price: string;
  accountCurrency: string;
}): CanonicalNotionalExposureResult {
  if (params.accountCurrency !== 'USD') {
    return {
      ready: false,
      amount: null,
      currency: params.accountCurrency,
      reasonCode: 'EXPOSURE_CONVERSION_UNAVAILABLE',
    };
  }

  const quantity = new Decimal(params.quantity).abs();
  const contractSize = new Decimal(params.contractSize);
  const price = new Decimal(params.price);
  if (contractSize.lessThanOrEqualTo(0) || price.lessThanOrEqualTo(0)) {
    throw new Error('Canonical notional inputs must use positive contract size and price.');
  }

  const baseUnits = quantity.times(contractSize);
  switch (params.symbol) {
    case 'USDJPY':
      return { ready: true, amount: baseUnits.toFixed(8), currency: 'USD' };
    case 'EURUSD':
    case 'GBPUSD':
    case 'XAUUSD':
    case 'NAS100':
      return { ready: true, amount: baseUnits.times(price).toFixed(8), currency: 'USD' };
    default:
      return {
        ready: false,
        amount: null,
        currency: params.accountCurrency,
        reasonCode: 'EXPOSURE_CONVERSION_UNAVAILABLE',
      };
  }
}

export interface GrossExposureEvaluation {
  grossExposure: string;
  maximumGrossExposure: string;
  grossExposureRate: string;
  maximumMultiple: string;
  allowed: boolean;
  reasonCode: 'WITHIN_GROSS_EXPOSURE_CAP' | 'GROSS_EXPOSURE_EXCEEDED';
}

/**
 * Gross means gross: every leg contributes its absolute canonical notional,
 * including equal and opposite positions on the same symbol. The exact cap is
 * admissible (`<=`); only an amount strictly above it is refused.
 */
export function evaluateGrossExposure(params: {
  nominalBalance: string;
  exposures: readonly Pick<MarginExposureLine, 'notionalAmount'>[];
  maximumMultiple: string;
}): GrossExposureEvaluation {
  const nominalBalance = new Decimal(params.nominalBalance);
  const maximumMultiple = new Decimal(params.maximumMultiple);
  if (nominalBalance.lessThanOrEqualTo(0) || maximumMultiple.lessThanOrEqualTo(0)) {
    throw new Error('Gross exposure requires positive nominal balance and maximum multiple.');
  }
  const grossExposure = params.exposures.reduce(
    (total, exposure) => total.plus(new Decimal(exposure.notionalAmount).abs()),
    new Decimal(0),
  );
  const maximumGrossExposure = nominalBalance.times(maximumMultiple);
  const allowed = grossExposure.lessThanOrEqualTo(maximumGrossExposure);
  return {
    grossExposure: grossExposure.toFixed(8),
    maximumGrossExposure: maximumGrossExposure.toFixed(8),
    grossExposureRate: grossExposure.dividedBy(nominalBalance).toFixed(8),
    maximumMultiple: maximumMultiple.toFixed(8),
    allowed,
    reasonCode: allowed ? 'WITHIN_GROSS_EXPOSURE_CAP' : 'GROSS_EXPOSURE_EXCEEDED',
  };
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
