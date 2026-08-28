import Decimal from 'decimal.js';
import {
  computeDailyLossFloor,
  computeCanonicalNotionalExposure,
  evaluateGrossExposure,
  evaluateMarginExposure,
  evaluateV2TradingPermission,
  isDailyLossSoftLockTriggered,
  isMaximumLossBreached,
  quotedPrice,
  computeRealizedPnl,
  type ExposureIntent,
  type HighImpactNewsWindow,
  type MarketClosureWindow,
  type MarginExposureLine,
  type V2AssetGroup,
} from '@wariba/domain';
import { EXPOSURE_REASON_CODES, RISK_REASON_CODES, type LoadedPolicy } from '@wariba/policies';
import type { LockedAccount, MarketSnapshot } from './accounts';
import { loadSymbolSpec } from './accounts';
import type { Db } from './client';
import { loadAccountBalanceProjection } from './program-eligibility';
import type { TradableSymbol } from './schema';

/**
 * Phase 3.4.3 §53 — the one pre-trade decision chain.
 *
 * Every exposure-increasing command runs the same ordered checks against
 * the policy pinned to the account: market session, news, instrument
 * leverage, margin, then the account's live daily/maximum-loss state. A
 * single ALLOW/DENY plus one canonical reason code comes back; nothing here
 * writes, and nothing here is duplicated in a caller.
 *
 * V2-pinned accounts traverse the full policy chain. Historical V1 accounts
 * still return `notApplicable` for exposure policy, but first traverse the
 * shared Daily/Maximum Loss safety guard. POLICY-GOV-004 classifies that
 * narrow pass_pending bypass closure as a bug fix: no V1 numeric policy is
 * changed and no V2 rule is projected onto a V1 account.
 */

export type V2PreTradeReasonCode =
  | 'V2_PRE_TRADE_ALLOWED'
  | 'V2_POLICY_NOT_APPLICABLE'
  | (typeof EXPOSURE_REASON_CODES)[keyof typeof EXPOSURE_REASON_CODES]
  | typeof RISK_REASON_CODES.DAILY_LOSS_SOFT_LOCKED
  | typeof RISK_REASON_CODES.MAXIMUM_LOSS_BREACHED;

export interface V2PreTradeDecision {
  allowed: boolean;
  /** False when the account is not pinned to a V2 policy — the caller keeps its V1 chain. */
  applicable: boolean;
  reasonCode: V2PreTradeReasonCode;
  /** Present once the margin step ran; useful as pre-trade evidence. */
  marginUsageRate: string | null;
  requiredMargin: string | null;
  grossExposureRate: string | null;
  grossExposure: string | null;
  maximumGrossExposure: string | null;
}

const ALLOWED: V2PreTradeDecision = {
  allowed: true,
  applicable: true,
  reasonCode: 'V2_PRE_TRADE_ALLOWED',
  marginUsageRate: null,
  requiredMargin: null,
  grossExposureRate: null,
  grossExposure: null,
  maximumGrossExposure: null,
};

const NOT_APPLICABLE: V2PreTradeDecision = {
  allowed: true,
  applicable: false,
  reasonCode: 'V2_POLICY_NOT_APPLICABLE',
  marginUsageRate: null,
  requiredMargin: null,
  grossExposureRate: null,
  grossExposure: null,
  maximumGrossExposure: null,
};

/**
 * `app.symbol_specs.asset_class` is the execution-side classification;
 * `leverage_by_asset_group` is the policy-side one. This is the only place
 * the two vocabularies meet, so a new asset class fails loudly here rather
 * than silently borrowing another group's leverage.
 */
export function assetGroupForAssetClass(
  assetClass: 'forex_major' | 'metal' | 'index_cfd_simulated',
): V2AssetGroup {
  switch (assetClass) {
    case 'forex_major':
      return 'FX';
    case 'metal':
      return 'METALS';
    case 'index_cfd_simulated':
      return 'INDICES';
    default: {
      const exhaustive: never = assetClass;
      throw new Error(`No V2 asset group mapped for asset class ${String(exhaustive)}.`);
    }
  }
}

function parseAssetGroups(value: unknown): readonly string[] {
  if (Array.isArray(value)) return value.map((entry) => String(entry));
  if (typeof value === 'string') {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [];
  }
  return [];
}

function parseLeverageByAssetGroup(value: unknown): Readonly<Record<V2AssetGroup, number>> {
  const raw: unknown = typeof value === 'string' ? JSON.parse(value) : value;
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Margin profile leverage_by_asset_group is not an object.');
  }
  const record = raw as Record<string, unknown>;
  const groups: V2AssetGroup[] = ['FX', 'METALS', 'INDICES', 'ENERGY'];
  const leverage = {} as Record<V2AssetGroup, number>;
  for (const group of groups) {
    const entry = record[group];
    if (typeof entry !== 'number' || !Number.isSafeInteger(entry) || entry <= 0) {
      throw new Error(`Margin profile has no usable leverage for ${group}.`);
    }
    leverage[group] = entry;
  }
  return leverage;
}

interface V2PolicyRuntimeContext {
  marginProfile: {
    candidateMarginCapRate: string;
    calibrationStatus: 'calibration_required' | 'validated' | 'retired';
    leverageByAssetGroup: Readonly<Record<V2AssetGroup, number>>;
  } | null;
  newsCalendarVersionId: string | null;
  newsSourceReady: boolean;
  sessionCalendarVersionId: string | null;
  sessionSourceReady: boolean;
}

async function loadV2PolicyRuntimeContext(
  trx: Db,
  policyVersionId: string,
): Promise<V2PolicyRuntimeContext> {
  const row = await trx
    .selectFrom('app.policy_versions as policy')
    .leftJoin('app.margin_profiles as margin', 'margin.id', 'policy.margin_profile_id')
    .leftJoin('app.news_calendar_versions as news', 'news.id', 'policy.news_calendar_version_id')
    .leftJoin(
      'app.session_calendar_versions as session',
      'session.id',
      'policy.session_calendar_version_id',
    )
    .select([
      'policy.news_calendar_version_id',
      'policy.session_calendar_version_id',
      'margin.candidate_margin_cap_rate',
      'margin.calibration_status',
      'margin.leverage_by_asset_group',
      'news.source_ready as news_source_ready',
      'session.source_ready as session_source_ready',
    ])
    .where('policy.id', '=', policyVersionId)
    .executeTakeFirstOrThrow(() => new Error(`Policy version ${policyVersionId} not found.`));

  return {
    marginProfile:
      row.candidate_margin_cap_rate && row.calibration_status
        ? {
            candidateMarginCapRate: row.candidate_margin_cap_rate,
            calibrationStatus: row.calibration_status,
            leverageByAssetGroup: parseLeverageByAssetGroup(row.leverage_by_asset_group),
          }
        : null,
    newsCalendarVersionId: row.news_calendar_version_id,
    newsSourceReady: row.news_source_ready === true,
    sessionCalendarVersionId: row.session_calendar_version_id,
    sessionSourceReady: row.session_source_ready === true,
  };
}

async function loadNewsWindows(
  trx: Db,
  calendarVersionId: string | null,
  now: Date,
): Promise<HighImpactNewsWindow[]> {
  if (!calendarVersionId) return [];
  const rows = await trx
    .selectFrom('app.news_events')
    .select(['affected_asset_groups', 'window_starts_at', 'window_ends_at'])
    .where('calendar_version_id', '=', calendarVersionId)
    .where('impact', '=', 'high')
    .where('window_ends_at', '>=', now)
    .where('window_starts_at', '<=', now)
    .execute();
  return rows.map((row) => ({
    startsAt: row.window_starts_at,
    endsAt: row.window_ends_at,
    affectedAssetGroups: parseAssetGroups(row.affected_asset_groups),
  }));
}

async function loadClosureWindows(
  trx: Db,
  calendarVersionId: string | null,
  now: Date,
): Promise<MarketClosureWindow[]> {
  if (!calendarVersionId) return [];
  const rows = await trx
    .selectFrom('app.session_closures')
    .select(['affected_asset_groups', 'closes_at', 'reopens_at'])
    .where('calendar_version_id', '=', calendarVersionId)
    .where('reopens_at', '>=', now)
    .execute();
  return rows.map((row) => ({
    closesAt: row.closes_at,
    reopensAt: row.reopens_at,
    affectedAssetGroups: parseAssetGroups(row.affected_asset_groups),
  }));
}

type CurrentExposureSnapshot =
  | { ready: true; lines: MarginExposureLine[]; unrealizedPnl: string }
  | { ready: false; reasonCode: typeof EXPOSURE_REASON_CODES.EXPOSURE_CONVERSION_UNAVAILABLE };

/**
 * Loads open positions once, loads their specs in one query, and prices every
 * leg with an authoritative current symbol snapshot. Both margin and gross
 * exposure consume the same canonical-USD lines, so opposite positions add
 * rather than net and cross-symbol checks cannot use stale entry prices.
 */
async function loadCurrentExposureSnapshot(
  trx: Db,
  params: {
    account: LockedAccount;
    incoming: {
      symbol: TradableSymbol;
      quantity: string;
      side: 'buy' | 'sell';
      market: MarketSnapshot;
    };
    marketBySymbol?: Partial<Record<TradableSymbol, MarketSnapshot>>;
  },
): Promise<CurrentExposureSnapshot> {
  const positions = await trx
    .selectFrom('app.positions')
    .select(['symbol', 'side', 'open_quantity', 'average_open_price'])
    .where('account_id', '=', params.account.id)
    .where('status', '=', 'open')
    .execute();

  const symbols = [
    ...new Set([...positions.map((position) => position.symbol), params.incoming.symbol]),
  ];
  const specs = await trx
    .selectFrom('app.symbol_specs')
    .select(['symbol', 'asset_class', 'contract_size'])
    .where('symbol_spec_set_id', '=', params.account.symbol_spec_set_id)
    .where('symbol', 'in', symbols)
    .execute();
  const specsBySymbol = new Map(specs.map((spec) => [spec.symbol, spec]));

  const lines: MarginExposureLine[] = [];
  let unrealizedPnl = new Decimal(0);
  for (const position of positions) {
    const spec = specsBySymbol.get(position.symbol);
    const market =
      params.marketBySymbol?.[position.symbol] ??
      (position.symbol === params.incoming.symbol ? params.incoming.market : undefined);
    if (!spec || !market) {
      return { ready: false, reasonCode: EXPOSURE_REASON_CODES.EXPOSURE_CONVERSION_UNAVAILABLE };
    }
    const markPrice = Decimal.max(market.bid, market.ask).toFixed(8);
    const notional = computeCanonicalNotionalExposure({
      symbol: position.symbol,
      quantity: position.open_quantity,
      contractSize: spec.contract_size,
      price: markPrice,
      accountCurrency: params.account.currency,
    });
    if (!notional.ready) {
      return { ready: false, reasonCode: EXPOSURE_REASON_CODES.EXPOSURE_CONVERSION_UNAVAILABLE };
    }
    lines.push({
      assetGroup: assetGroupForAssetClass(spec.asset_class),
      notionalAmount: notional.amount,
    });
    unrealizedPnl = unrealizedPnl.plus(
      computeRealizedPnl({
        openPrice: position.average_open_price,
        closePrice: quotedPrice({
          bid: market.bid,
          ask: market.ask,
          positionSide: position.side,
          action: 'close',
        }),
        quantity: position.open_quantity,
        contractSize: spec.contract_size,
        positionSide: position.side,
      }),
    );
  }

  const incomingSpec = specsBySymbol.get(params.incoming.symbol);
  if (!incomingSpec) {
    return { ready: false, reasonCode: EXPOSURE_REASON_CODES.EXPOSURE_CONVERSION_UNAVAILABLE };
  }
  const incomingPrice = quotedPrice({
    bid: params.incoming.market.bid,
    ask: params.incoming.market.ask,
    positionSide: params.incoming.side,
    action: 'open',
  });
  const incomingNotional = computeCanonicalNotionalExposure({
    symbol: params.incoming.symbol,
    quantity: params.incoming.quantity,
    contractSize: incomingSpec.contract_size,
    price: incomingPrice,
    accountCurrency: params.account.currency,
  });
  if (!incomingNotional.ready) {
    return { ready: false, reasonCode: EXPOSURE_REASON_CODES.EXPOSURE_CONVERSION_UNAVAILABLE };
  }
  lines.push({
    assetGroup: assetGroupForAssetClass(incomingSpec.asset_class),
    notionalAmount: incomingNotional.amount,
  });

  return { ready: true, lines, unrealizedPnl: unrealizedPnl.toFixed(8) };
}

export interface EvaluateV2PreTradeParams {
  account: LockedAccount;
  policy: LoadedPolicy;
  intent: ExposureIntent;
  symbol: TradableSymbol;
  quantity: string;
  market: MarketSnapshot;
  marketBySymbol?: Partial<Record<TradableSymbol, MarketSnapshot>>;
  side: 'buy' | 'sell';
  now: Date;
}

export async function evaluateV2PreTradeDecisionInTransaction(
  trx: Db,
  params: EvaluateV2PreTradeParams,
): Promise<V2PreTradeDecision> {
  const parameters = params.policy.parameters as {
    contract_version?: unknown;
    daily_loss_rate: string;
    gross_exposure_max_multiple?: string;
    weekend_new_exposure_cutoff_minutes?: number;
    weekend_minimum_closure_minutes?: number;
  };
  if (params.intent === 'reduce' || params.intent === 'close') return ALLOWED;
  const isV2 = parameters.contract_version === 'WARIBA_POLICY_V2';

  const spec = await loadSymbolSpec(trx, params.account.symbol_spec_set_id, params.symbol);
  if (!spec) {
    // An unknown spec is the caller's own UNKNOWN_SYMBOL_SPEC rejection; this
    // chain must not invent a second verdict for it.
    return NOT_APPLICABLE;
  }
  const assetGroup = assetGroupForAssetClass(spec.asset_class);
  const exposure = await loadCurrentExposureSnapshot(trx, {
    account: params.account,
    incoming: {
      symbol: params.symbol,
      quantity: params.quantity,
      side: params.side,
      market: params.market,
    },
    ...(params.marketBySymbol ? { marketBySymbol: params.marketBySymbol } : {}),
  });
  if (!exposure.ready) {
    return isV2
      ? {
          allowed: false,
          applicable: true,
          reasonCode: exposure.reasonCode,
          marginUsageRate: null,
          requiredMargin: null,
          grossExposureRate: null,
          grossExposure: null,
          maximumGrossExposure: null,
        }
      : NOT_APPLICABLE;
  }

  const projection = await loadAccountBalanceProjection(trx, params.account.id);
  const equity = new Decimal(projection.accountBalance).plus(exposure.unrealizedPnl);
  const riskEquity = new Decimal(projection.riskAdjustedBalance)
    .plus(exposure.unrealizedPnl)
    .toFixed(2);
  const latestSnapshot = await trx
    .selectFrom('app.account_daily_snapshots')
    .select(['id', 'trading_day', 'daily_reference', 'maximum_loss_floor_before'])
    .where('account_id', '=', params.account.id)
    .orderBy('trading_day', 'desc')
    .executeTakeFirst();

  // Owner decision POLICY-GOV-004: hard breach > Daily restriction >
  // pass_pending. The Daily evidence belongs to the current UTC snapshot, so
  // yesterday's lock never leaks past the reset boundary. This guard applies
  // to V1 as a risk-enforcement bug fix without changing any V1 number.
  if (
    latestSnapshot &&
    isMaximumLossBreached({
      currentEquity: riskEquity,
      maximumLossFloor: latestSnapshot.maximum_loss_floor_before,
    })
  ) {
    return {
      allowed: false,
      applicable: true,
      reasonCode: RISK_REASON_CODES.MAXIMUM_LOSS_BREACHED,
      marginUsageRate: null,
      requiredMargin: null,
      grossExposureRate: null,
      grossExposure: null,
      maximumGrossExposure: null,
    };
  }
  const currentTradingDay = params.now.toISOString().slice(0, 10);
  if (latestSnapshot?.trading_day === currentTradingDay) {
    const persistedDailyRestriction = await trx
      .selectFrom('app.risk_violations')
      .select('id')
      .where('account_id', '=', params.account.id)
      .where('account_daily_snapshot_id', '=', latestSnapshot.id)
      .where('rule_code', '=', 'RISK_DAILY_LOSS_LOCK')
      .executeTakeFirst();
    const dailyFloor = computeDailyLossFloor({
      dailyReference: latestSnapshot.daily_reference,
      nominalBalance: params.account.nominal_balance,
      dailyLossRate: parameters.daily_loss_rate,
    });
    if (
      persistedDailyRestriction ||
      isDailyLossSoftLockTriggered({
        currentAdjustedEquity: riskEquity,
        dailyLossFloor: dailyFloor,
      })
    ) {
      return {
        allowed: false,
        applicable: true,
        reasonCode: RISK_REASON_CODES.DAILY_LOSS_SOFT_LOCKED,
        marginUsageRate: null,
        requiredMargin: null,
        grossExposureRate: null,
        grossExposure: null,
        maximumGrossExposure: null,
      };
    }
  }

  if (!isV2) return NOT_APPLICABLE;

  const context = await loadV2PolicyRuntimeContext(trx, params.policy.id);

  // Market session and news: a missing
  // source denies the increase without ever fabricating an event.
  const permission = evaluateV2TradingPermission({
    now: params.now,
    accountPhase: params.policy.accountPhase,
    intent: params.intent,
    assetGroup,
    newsSourceReady: context.newsSourceReady,
    sessionSourceReady: context.sessionSourceReady,
    newsWindows: await loadNewsWindows(trx, context.newsCalendarVersionId, params.now),
    closureWindows: await loadClosureWindows(trx, context.sessionCalendarVersionId, params.now),
    ...(parameters.weekend_new_exposure_cutoff_minutes !== undefined
      ? { closureCutoffMinutes: parameters.weekend_new_exposure_cutoff_minutes }
      : {}),
    ...(parameters.weekend_minimum_closure_minutes !== undefined
      ? { minimumClosureMinutes: parameters.weekend_minimum_closure_minutes }
      : {}),
  });
  if (!permission.allowed) {
    return {
      allowed: false,
      applicable: true,
      reasonCode: EXPOSURE_REASON_CODES[permission.reasonCode as keyof typeof EXPOSURE_REASON_CODES]
        ? (permission.reasonCode as V2PreTradeReasonCode)
        : EXPOSURE_REASON_CODES.MARKET_SESSION_SOURCE_UNAVAILABLE,
      marginUsageRate: null,
      requiredMargin: null,
      grossExposureRate: null,
      grossExposure: null,
      maximumGrossExposure: null,
    };
  }

  // Instrument leverage and the margin cap. An uncalibrated cap is not
  // silently treated as "no cap" — evaluateMarginExposure denies.
  if (!context.marginProfile) {
    return {
      allowed: false,
      applicable: true,
      reasonCode: EXPOSURE_REASON_CODES.MARGIN_CAP_NOT_CALIBRATED,
      marginUsageRate: null,
      requiredMargin: null,
      grossExposureRate: null,
      grossExposure: null,
      maximumGrossExposure: null,
    };
  }

  if (equity.lessThanOrEqualTo(0)) {
    // A non-positive equity cannot support any new exposure, and
    // evaluateMarginExposure refuses to divide by it.
    return {
      allowed: false,
      applicable: true,
      reasonCode: EXPOSURE_REASON_CODES.MARGIN_CAP_EXCEEDED,
      marginUsageRate: null,
      requiredMargin: null,
      grossExposureRate: null,
      grossExposure: null,
      maximumGrossExposure: null,
    };
  }

  const margin = evaluateMarginExposure({
    equity: equity.toFixed(2),
    exposures: exposure.lines,
    leverageByAssetGroup: context.marginProfile.leverageByAssetGroup,
    candidateCapRate: context.marginProfile.candidateMarginCapRate,
    calibrationStatus:
      context.marginProfile.calibrationStatus === 'validated'
        ? 'validated'
        : 'calibration_required',
  });
  if (!margin.allowed) {
    return {
      allowed: false,
      applicable: true,
      reasonCode:
        margin.reasonCode === 'MARGIN_CALIBRATION_REQUIRED'
          ? EXPOSURE_REASON_CODES.MARGIN_CAP_NOT_CALIBRATED
          : EXPOSURE_REASON_CODES.MARGIN_CAP_EXCEEDED,
      marginUsageRate: margin.marginUsageRate,
      requiredMargin: margin.requiredMargin,
      grossExposureRate: null,
      grossExposure: null,
      maximumGrossExposure: null,
    };
  }

  const gross = parameters.gross_exposure_max_multiple
    ? evaluateGrossExposure({
        nominalBalance: params.account.nominal_balance,
        exposures: exposure.lines,
        maximumMultiple: parameters.gross_exposure_max_multiple,
      })
    : null;
  if (gross && !gross.allowed) {
    return {
      allowed: false,
      applicable: true,
      reasonCode: EXPOSURE_REASON_CODES.GROSS_EXPOSURE_EXCEEDED,
      marginUsageRate: margin.marginUsageRate,
      requiredMargin: margin.requiredMargin,
      grossExposureRate: gross.grossExposureRate,
      grossExposure: gross.grossExposure,
      maximumGrossExposure: gross.maximumGrossExposure,
    };
  }

  return {
    ...ALLOWED,
    marginUsageRate: margin.marginUsageRate,
    requiredMargin: margin.requiredMargin,
    grossExposureRate: gross?.grossExposureRate ?? null,
    grossExposure: gross?.grossExposure ?? null,
    maximumGrossExposure: gross?.maximumGrossExposure ?? null,
  };
}
