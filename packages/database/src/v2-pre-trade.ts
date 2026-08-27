import Decimal from 'decimal.js';
import {
  computeDailyLossFloor,
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
 * Scope is deliberately V2-pinned accounts only. A V1 account returns
 * `notApplicable` and keeps exactly the gate chain it shipped with —
 * Phase 3.4.3 §82's "V1 results do not change" is stronger than the
 * convenience of one code path, and the V1 gates are already covered by
 * their own tests. The V1 exposure gap this exposed (see
 * WARIBA_PHASE_3_4_3_RISK_LIFECYCLE_CLOSURE.md §"pass_pending") is reported
 * for an owner decision rather than silently patched here.
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
}

const ALLOWED: V2PreTradeDecision = {
  allowed: true,
  applicable: true,
  reasonCode: 'V2_PRE_TRADE_ALLOWED',
  marginUsageRate: null,
  requiredMargin: null,
};

const NOT_APPLICABLE: V2PreTradeDecision = {
  allowed: true,
  applicable: false,
  reasonCode: 'V2_POLICY_NOT_APPLICABLE',
  marginUsageRate: null,
  requiredMargin: null,
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

/**
 * Gross margin lines for everything currently open plus the increase being
 * requested. Notional is priced at the live quote for the incoming leg and
 * at the position's own average open price for existing legs — the same
 * convention `isWithinAggregateExposureLimit` already uses, so the two
 * exposure views cannot disagree about what is open.
 */
async function loadExposureLines(
  trx: Db,
  params: {
    account: LockedAccount;
    incoming: { symbol: TradableSymbol; quantity: string; price: string } | null;
  },
): Promise<MarginExposureLine[]> {
  const positions = await trx
    .selectFrom('app.positions')
    .select(['symbol', 'side', 'open_quantity', 'average_open_price'])
    .where('account_id', '=', params.account.id)
    .where('status', '=', 'open')
    .execute();

  const lines: MarginExposureLine[] = [];
  for (const position of positions) {
    const spec = await loadSymbolSpec(trx, params.account.symbol_spec_set_id, position.symbol);
    if (!spec) continue;
    lines.push({
      assetGroup: assetGroupForAssetClass(spec.asset_class),
      notionalAmount: new Decimal(position.open_quantity)
        .times(spec.contract_size)
        .times(position.average_open_price)
        .toFixed(8),
    });
  }

  if (params.incoming) {
    const spec = await loadSymbolSpec(
      trx,
      params.account.symbol_spec_set_id,
      params.incoming.symbol,
    );
    if (spec) {
      lines.push({
        assetGroup: assetGroupForAssetClass(spec.asset_class),
        notionalAmount: new Decimal(params.incoming.quantity)
          .times(spec.contract_size)
          .times(params.incoming.price)
          .toFixed(8),
      });
    }
  }

  return lines;
}

export interface EvaluateV2PreTradeParams {
  account: LockedAccount;
  policy: LoadedPolicy;
  intent: ExposureIntent;
  symbol: TradableSymbol;
  quantity: string;
  market: MarketSnapshot;
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
    weekend_new_exposure_cutoff_minutes?: number;
    weekend_minimum_closure_minutes?: number;
  };
  if (parameters.contract_version !== 'WARIBA_POLICY_V2') return NOT_APPLICABLE;
  if (params.intent === 'reduce' || params.intent === 'close') return ALLOWED;

  const spec = await loadSymbolSpec(trx, params.account.symbol_spec_set_id, params.symbol);
  if (!spec) {
    // An unknown spec is the caller's own UNKNOWN_SYMBOL_SPEC rejection; this
    // chain must not invent a second verdict for it.
    return NOT_APPLICABLE;
  }
  const assetGroup = assetGroupForAssetClass(spec.asset_class);
  const context = await loadV2PolicyRuntimeContext(trx, params.policy.id);

  // 1-2. Market session and news, in the contract's own order: a missing
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
    };
  }

  // 3-4. Instrument leverage and the margin cap. An uncalibrated cap is not
  // silently treated as "no cap" — evaluateMarginExposure denies.
  if (!context.marginProfile) {
    return {
      allowed: false,
      applicable: true,
      reasonCode: EXPOSURE_REASON_CODES.MARGIN_CAP_NOT_CALIBRATED,
      marginUsageRate: null,
      requiredMargin: null,
    };
  }

  const projection = await loadAccountBalanceProjection(trx, params.account.id);
  const openPositions = await trx
    .selectFrom('app.positions')
    .select(['symbol', 'side', 'open_quantity', 'average_open_price'])
    .where('account_id', '=', params.account.id)
    .where('status', '=', 'open')
    .execute();
  let unrealized = new Decimal(0);
  for (const position of openPositions) {
    const positionSpec = await loadSymbolSpec(
      trx,
      params.account.symbol_spec_set_id,
      position.symbol,
    );
    if (!positionSpec) continue;
    unrealized = unrealized.plus(
      computeRealizedPnl({
        openPrice: position.average_open_price,
        closePrice: quotedPrice({
          bid: params.market.bid,
          ask: params.market.ask,
          positionSide: position.side,
          action: 'close',
        }),
        quantity: position.open_quantity,
        contractSize: positionSpec.contract_size,
        positionSide: position.side,
      }),
    );
  }
  const equity = new Decimal(projection.accountBalance).plus(unrealized);
  if (equity.lessThanOrEqualTo(0)) {
    // A non-positive equity cannot support any new exposure, and
    // evaluateMarginExposure refuses to divide by it.
    return {
      allowed: false,
      applicable: true,
      reasonCode: EXPOSURE_REASON_CODES.MARGIN_CAP_EXCEEDED,
      marginUsageRate: null,
      requiredMargin: null,
    };
  }

  const incomingPrice = quotedPrice({
    bid: params.market.bid,
    ask: params.market.ask,
    positionSide: params.side,
    action: 'open',
  });
  const lines = await loadExposureLines(trx, {
    account: params.account,
    incoming: { symbol: params.symbol, quantity: params.quantity, price: incomingPrice },
  });
  const margin = evaluateMarginExposure({
    equity: equity.toFixed(2),
    exposures: lines,
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
    };
  }

  // 5. The account's live daily/maximum-loss state. Phase 3.4.3 §60's
  // priority order: a terminal breach outranks a soft lock, and both
  // outrank "the objective is currently satisfied". Reaching the target
  // must never be a way to keep opening exposure past the daily floor.
  const riskEquity = new Decimal(projection.riskAdjustedBalance).plus(unrealized).toFixed(2);
  const today = await trx
    .selectFrom('app.account_daily_snapshots')
    .select(['daily_reference', 'maximum_loss_floor_before'])
    .where('account_id', '=', params.account.id)
    .orderBy('trading_day', 'desc')
    .executeTakeFirst();
  if (today) {
    if (
      isMaximumLossBreached({
        currentEquity: riskEquity,
        maximumLossFloor: today.maximum_loss_floor_before,
      })
    ) {
      return {
        allowed: false,
        applicable: true,
        reasonCode: RISK_REASON_CODES.MAXIMUM_LOSS_BREACHED,
        marginUsageRate: margin.marginUsageRate,
        requiredMargin: margin.requiredMargin,
      };
    }
    const dailyFloor = computeDailyLossFloor({
      dailyReference: today.daily_reference,
      nominalBalance: params.account.nominal_balance,
      dailyLossRate: parameters.daily_loss_rate,
    });
    if (
      isDailyLossSoftLockTriggered({
        currentAdjustedEquity: riskEquity,
        dailyLossFloor: dailyFloor,
      })
    ) {
      return {
        allowed: false,
        applicable: true,
        reasonCode: RISK_REASON_CODES.DAILY_LOSS_SOFT_LOCKED,
        marginUsageRate: margin.marginUsageRate,
        requiredMargin: margin.requiredMargin,
      };
    }
  }

  return {
    ...ALLOWED,
    marginUsageRate: margin.marginUsageRate,
    requiredMargin: margin.requiredMargin,
  };
}
