export type ExposureIntent = 'open' | 'increase' | 'reduce' | 'close';
export type PolicyAccountPhase = 'evaluation' | 'performance';

export interface HighImpactNewsWindow {
  startsAt: Date;
  endsAt: Date;
  affectedAssetGroups: readonly string[];
}

export interface MarketClosureWindow {
  closesAt: Date;
  reopensAt: Date;
  affectedAssetGroups: readonly string[];
}

export type TradingPermissionReasonCode =
  | 'TRADE_ALLOWED'
  | 'NEWS_EXPOSURE_INCREASE_BLOCKED'
  | 'MARKET_CLOSURE_EXPOSURE_INCREASE_BLOCKED'
  | 'NEWS_CALENDAR_SOURCE_UNAVAILABLE'
  | 'MARKET_SESSION_SOURCE_UNAVAILABLE';

export interface TradingPermissionDecision {
  allowed: boolean;
  activationReady: boolean;
  reasonCode: TradingPermissionReasonCode;
}

function affects(assetGroup: string, groups: readonly string[]): boolean {
  return groups.includes(assetGroup);
}

/**
 * V2 pre-trade permission matrix. Missing calendar sources do not fabricate a
 * breach or retroactively sanction an account; they make the V2 activation
 * capability unavailable. Reduce/close remains possible in every window.
 */
export function evaluateV2TradingPermission(params: {
  now: Date;
  accountPhase: PolicyAccountPhase;
  intent: ExposureIntent;
  assetGroup: string;
  newsSourceReady: boolean;
  sessionSourceReady: boolean;
  newsWindows: readonly HighImpactNewsWindow[];
  closureWindows: readonly MarketClosureWindow[];
  closureCutoffMinutes?: number;
  minimumClosureMinutes?: number;
}): TradingPermissionDecision {
  const reducesExposure = params.intent === 'reduce' || params.intent === 'close';
  if (!params.sessionSourceReady) {
    return {
      allowed: reducesExposure,
      activationReady: false,
      reasonCode: 'MARKET_SESSION_SOURCE_UNAVAILABLE',
    };
  }
  if (params.accountPhase === 'performance' && !params.newsSourceReady) {
    return {
      allowed: reducesExposure,
      activationReady: false,
      reasonCode: 'NEWS_CALENDAR_SOURCE_UNAVAILABLE',
    };
  }
  if (reducesExposure) {
    return { allowed: true, activationReady: true, reasonCode: 'TRADE_ALLOWED' };
  }

  const inNewsWindow =
    params.accountPhase === 'performance' &&
    params.newsWindows.some(
      (window) =>
        affects(params.assetGroup, window.affectedAssetGroups) &&
        params.now >= window.startsAt &&
        params.now <= window.endsAt,
    );
  if (inNewsWindow) {
    return {
      allowed: false,
      activationReady: true,
      reasonCode: 'NEWS_EXPOSURE_INCREASE_BLOCKED',
    };
  }

  const cutoffMs = (params.closureCutoffMinutes ?? 30) * 60_000;
  const minimumClosureMs = (params.minimumClosureMinutes ?? 120) * 60_000;
  const nearMaterialClosure = params.closureWindows.some((window) => {
    if (!affects(params.assetGroup, window.affectedAssetGroups)) return false;
    const timeToClose = window.closesAt.getTime() - params.now.getTime();
    const closureDuration = window.reopensAt.getTime() - window.closesAt.getTime();
    return timeToClose >= 0 && timeToClose <= cutoffMs && closureDuration >= minimumClosureMs;
  });
  if (nearMaterialClosure) {
    return {
      allowed: false,
      activationReady: true,
      reasonCode: 'MARKET_CLOSURE_EXPOSURE_INCREASE_BLOCKED',
    };
  }

  return { allowed: true, activationReady: true, reasonCode: 'TRADE_ALLOWED' };
}
