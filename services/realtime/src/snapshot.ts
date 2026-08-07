import Decimal from 'decimal.js';
import {
  quotedPrice,
  computeRealizedPnl,
  computeConcentration,
  computeDailyLossRemaining,
  evaluateShortDurationMonitoring,
  resolveTraderSplitRate,
} from '@wariba/domain';
import {
  loadPolicyById,
  evaluateAccountRisk,
  FOREX_SYMBOLS,
  loadAccountBalanceProjection,
  countShortDurationProfitClosures,
  resolveProfitEligibilityPolicy,
  loadQueuedReductionsForAccount,
  loadActivePendingOrdersForAccount,
  evaluateCycleProgress,
  loadPayoutRequestsForAccount,
  asPerformancePolicy,
  type Db,
  type TradableSymbol,
  type DailySnapshotInput,
} from '@wariba/database';
import type {
  AccountRisk,
  AccountSnapshot,
  ConcentrationBucket,
  PositionDTO,
  PerformanceProgressDTO,
  PayoutRequestDTO,
} from '@wariba/contracts';
import type { MarketDataProvider } from '@wariba/adapters';
import type { LoadedSymbolSpec } from './market';
import {
  toPositionDTO,
  toOrderDTO,
  toFillDTO,
  toQueuedReductionDTO,
  toPendingOrderDTO,
} from './dto-mappers';

/**
 * Full account state — used both for the initial subscribe (System
 * Architecture §62-64: "full snapshot + explicit sequence reset" is the V1
 * resync strategy) and for reconnects. Balance is the ledger sum (TRD-011:
 * append-only, so balance is always a reconciliable projection of it, never
 * a separately-stored counter that could drift). Equity adds unrealized PnL
 * from the live market snapshot — a paper calculation using the same
 * close-side price rule as an actual close (TRD-007/008), without slippage
 * since nothing is actually being filled.
 */
export async function buildAccountSnapshot(
  db: Db,
  accountId: string,
  market: MarketDataProvider,
  symbolSpecs: Record<TradableSymbol, LoadedSymbolSpec>,
): Promise<AccountSnapshot> {
  const account = await db
    .selectFrom('app.trading_accounts')
    .select([
      'version',
      'status',
      'nominal_balance',
      'policy_version_id',
      'symbol_spec_set_id',
      'program_type',
      'kyc_sandbox_verified',
      'payout_method_sandbox_configured',
    ])
    .where('id', '=', accountId)
    .executeTakeFirstOrThrow();
  const policy = await loadPolicyById(db, account.policy_version_id);
  const eligibilityPolicy = resolveProfitEligibilityPolicy(policy.parameters);

  const live = await computeLiveBalanceAndEquity(
    db,
    accountId,
    market,
    symbolSpecs,
    eligibilityPolicy.enabled,
  );

  const recentOrderRows = await db
    .selectFrom('app.trade_orders')
    .selectAll()
    .where('account_id', '=', accountId)
    .orderBy('received_at', 'desc')
    .limit(20)
    .execute();

  const recentOrders = recentOrderRows.map((row) =>
    toOrderDTO({
      accountId,
      orderId: row.id,
      idempotencyKey: row.idempotency_key,
      orderType: row.order_type,
      symbol: row.symbol,
      side: row.side,
      positionId: row.position_id,
      requestedQuantity: row.requested_quantity,
      filledQuantity: row.filled_quantity,
      outcome: {
        orderId: row.id,
        status: row.status === 'filled' ? 'filled' : 'rejected',
        rejectionCode: row.rejection_code,
        accountSequence: row.account_sequence,
        alreadyExisted: true,
      },
      receivedAt: row.received_at,
      completedAt: row.completed_at,
    }),
  );

  const recentFillRows = await db
    .selectFrom('app.fills')
    .innerJoin('app.positions', 'app.positions.id', 'app.fills.position_id')
    .select([
      'app.fills.id as fill_id',
      'app.fills.opening_fill_id',
      'app.fills.order_id',
      'app.fills.position_id',
      'app.fills.symbol',
      'app.fills.side',
      'app.fills.fill_type',
      'app.fills.quantity',
      'app.fills.price',
      'app.fills.commission',
      'app.fills.realized_pnl',
      'app.fills.occurred_at',
      'app.fills.duration_ms',
      'app.fills.is_short_duration_profit',
      'app.fills.eligible_realized_pnl',
      'app.fills.ineligible_short_duration_profit',
      'app.fills.allocated_open_commission',
      'app.fills.net_realized_pnl',
      'app.fills.eligibility_reason',
      'app.positions.average_open_price',
      'app.positions.opened_at',
    ])
    .where('app.fills.account_id', '=', accountId)
    .where('app.fills.fill_type', '=', 'close')
    .orderBy('app.fills.occurred_at', 'desc')
    .limit(20)
    .execute();
  const recentFills = recentFillRows.map((row) =>
    toFillDTO(
      row.order_id,
      {
        id: row.fill_id,
        openingFillId: row.opening_fill_id,
        price: row.price,
        quantity: row.quantity,
        commission: row.commission,
        realizedPnl: row.realized_pnl,
        occurredAt: row.occurred_at,
        durationMs: row.duration_ms,
        isShortDurationProfit: row.is_short_duration_profit,
        eligibleRealizedPnl: row.eligible_realized_pnl,
        ineligibleShortDurationProfit: row.ineligible_short_duration_profit,
        allocatedOpenCommission: row.allocated_open_commission,
        netRealizedPnl: row.net_realized_pnl,
        eligibilityReason: row.eligibility_reason,
      },
      row.position_id,
      row.symbol,
      row.side,
      row.fill_type,
      row.average_open_price,
      row.opened_at,
    ),
  );

  const risk = await buildAccountRisk(
    db,
    accountId,
    account,
    live.balance,
    live.programEligibleBalance,
    live.equity,
    live.openPositionRows,
  );

  const queuedReductions = await loadQueuedReductionsForAccount(db, accountId);
  const pendingOrders = await loadActivePendingOrdersForAccount(db, accountId);

  const performanceProgress =
    account.program_type === 'WARIBA_PERFORMANCE'
      ? await buildPerformanceProgress(db, accountId, account, policy, live.openPositionRows.length)
      : null;
  const payoutRequests =
    account.program_type === 'WARIBA_PERFORMANCE'
      ? (await loadPayoutRequestsForAccount(db, accountId)).map(toPayoutRequestDTO)
      : [];

  return {
    accountId,
    programType: account.program_type,
    nominalBalance: account.nominal_balance,
    balance: live.balance,
    programEligibleBalance: live.programEligibleBalance,
    equity: live.equity,
    accountSequence: Number(account.version),
    openPositions: live.openPositions,
    recentOrders,
    recentFills,
    profitEligibility: {
      enabled: eligibilityPolicy.enabled,
      minimumDurationMs: eligibilityPolicy.minimumDurationMs,
    },
    risk,
    queuedReductions: queuedReductions.map(toQueuedReductionDTO),
    pendingOrders: pendingOrders.map(toPendingOrderDTO),
    performanceProgress,
    payoutRequests,
  };
}

/**
 * Prompt 08 Phase F — composes Phase C's cycle-scoped progress
 * (evaluateCycleProgress) with the account-wide blockers Phase D's own
 * eligibility check also uses (open positions, pending orders), so the
 * trader sees the exact same picture the server will actually enforce at
 * request time — never a rosier client-only estimate.
 */
async function buildPerformanceProgress(
  db: Db,
  accountId: string,
  account: {
    nominal_balance: string;
    kyc_sandbox_verified: boolean;
    payout_method_sandbox_configured: boolean;
  },
  policy: Awaited<ReturnType<typeof loadPolicyById>>,
  openPositionCount: number,
): Promise<PerformanceProgressDTO | null> {
  const activePendingOrder = await db
    .selectFrom('app.pending_orders')
    .select('id')
    .where('account_id', '=', accountId)
    .where('status', '=', 'active')
    .executeTakeFirst();

  try {
    const progress = await evaluateCycleProgress(db, accountId);
    const performancePolicy = asPerformancePolicy(policy);
    const capsForSize = performancePolicy.payout_caps_by_nominal_balance[account.nominal_balance];
    const splitRate = resolveTraderSplitRate({
      cycleNumber: progress.cycleNumber,
      maxPayoutCyclesBeforeReview: performancePolicy.max_payout_cycles_before_review,
      defaultSplitRate: performancePolicy.trader_split_rate_default,
      finalCycleSplitRate: performancePolicy.trader_split_rate_final_cycle,
    });
    return {
      cycleNumber: progress.cycleNumber,
      cycleStatus: progress.cycleStatus,
      realizedBalance: progress.realizedBalance,
      bufferFloor: progress.bufferFloor,
      eligibleExcess: progress.eligibleExcess,
      bufferReached: progress.bufferReached,
      performanceDayThreshold: progress.performanceDayThreshold,
      performanceDaysCompleted: progress.performanceDaysCompleted,
      performanceDaysRequired: progress.performanceDaysRequired,
      consistencyRatio: progress.consistencyRatio,
      consistencyCompliant: progress.consistencyCompliant,
      capApplied: capsForSize ? (capsForSize[progress.cycleNumber - 1] as string) : '0.00',
      traderSplitRate: splitRate,
      kycVerified: account.kyc_sandbox_verified,
      payoutMethodConfigured: account.payout_method_sandbox_configured,
      openPositionBlocking: openPositionCount > 0,
      pendingOrderBlocking: activePendingOrder !== undefined,
    };
  } catch {
    // No active cycle (e.g. a Review case already opened after payout #5)
    // — a null progress is the honest "nothing to show", not an error the
    // trader needs to see.
    return null;
  }
}

function toPayoutRequestDTO(row: {
  id: string;
  cycleNumber: number;
  status: string;
  requestedNetTraderCash: string;
  approvedGrossBase: string | null;
  traderNetCash: string | null;
  waribaShare: string | null;
  rejectionCode: string | null;
  requestedAt: Date;
  paidAt: Date | null;
}): PayoutRequestDTO {
  return {
    id: row.id,
    cycleNumber: row.cycleNumber,
    status: row.status as PayoutRequestDTO['status'],
    requestedNetTraderCash: row.requestedNetTraderCash,
    approvedGrossBase: row.approvedGrossBase,
    traderNetCash: row.traderNetCash,
    waribaShare: row.waribaShare,
    rejectionCode: row.rejectionCode,
    requestedAt: row.requestedAt.toISOString(),
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
  };
}

/**
 * Prompt 07 — Guardian/RiskRibbon liveness. A lighter re-computation of just
 * the price-sensitive fields, called on a timer while an account has open
 * positions (services/realtime/src/websocket.ts) rather than only on
 * (re)subscribe/order events. Returns null when there is nothing open — the
 * caller skips broadcasting rather than repeatedly pushing an unchanged
 * number for an idle account.
 */
export async function buildAccountRiskPreview(
  db: Db,
  accountId: string,
  market: MarketDataProvider,
  symbolSpecs: Record<TradableSymbol, LoadedSymbolSpec>,
): Promise<{ accountId: string; equity: string; risk: AccountRisk | null } | null> {
  const account = await db
    .selectFrom('app.trading_accounts')
    .select(['status', 'nominal_balance', 'policy_version_id', 'symbol_spec_set_id'])
    .where('id', '=', accountId)
    .executeTakeFirstOrThrow();
  const policy = await loadPolicyById(db, account.policy_version_id);
  const eligibilityPolicy = resolveProfitEligibilityPolicy(policy.parameters);

  const live = await computeLiveBalanceAndEquity(
    db,
    accountId,
    market,
    symbolSpecs,
    eligibilityPolicy.enabled,
  );
  if (live.openPositionRows.length === 0) return null;

  const risk = await buildAccountRisk(
    db,
    accountId,
    account,
    live.balance,
    live.programEligibleBalance,
    live.equity,
    live.openPositionRows,
  );
  return { accountId, equity: live.equity, risk };
}

interface OpenPositionRow {
  id: string;
  symbol: TradableSymbol;
  side: 'buy' | 'sell';
  open_quantity: string;
  average_open_price: string;
  realized_pnl: string;
  stop_loss: string | null;
  take_profit: string | null;
  status: 'open' | 'closed';
  opened_at: Date;
  closed_at: Date | null;
}

async function computeLiveBalanceAndEquity(
  db: Db,
  accountId: string,
  market: MarketDataProvider,
  symbolSpecs: Record<TradableSymbol, LoadedSymbolSpec>,
  eligibilityEnabled: boolean,
): Promise<{
  balance: string;
  programEligibleBalance: string;
  equity: string;
  programEligibleEquity: string;
  openPositionRows: OpenPositionRow[];
  openPositions: PositionDTO[];
}> {
  const projection = await loadAccountBalanceProjection(
    db,
    accountId,
    undefined,
    eligibilityEnabled,
  );
  const balance = projection.accountBalance;

  const openPositionRows = await db
    .selectFrom('app.positions')
    .selectAll()
    .where('account_id', '=', accountId)
    .where('status', '=', 'open')
    .execute();

  let unrealizedTotal = new Decimal(0);
  const openPositions = openPositionRows.map((row) => {
    const tick = market.getSnapshot(row.symbol);
    const closePrice = quotedPrice({
      bid: tick.bid,
      ask: tick.ask,
      positionSide: row.side,
      action: 'close',
    });
    const unrealized = computeRealizedPnl({
      openPrice: row.average_open_price,
      closePrice,
      quantity: row.open_quantity,
      contractSize: symbolSpecs[row.symbol].contractSize,
      positionSide: row.side,
    });
    unrealizedTotal = unrealizedTotal.plus(unrealized);
    return toPositionDTO(accountId, {
      id: row.id,
      symbol: row.symbol,
      side: row.side,
      openQuantity: row.open_quantity,
      averageOpenPrice: row.average_open_price,
      realizedPnl: row.realized_pnl,
      stopLoss: row.stop_loss,
      takeProfit: row.take_profit,
      status: row.status,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
    });
  });

  const equity = new Decimal(balance).plus(unrealizedTotal).toFixed(2);
  const programEligibleEquity = new Decimal(projection.programEligibleBalance)
    .plus(unrealizedTotal)
    .toFixed(2);
  return {
    balance,
    programEligibleBalance: projection.programEligibleBalance,
    equity,
    programEligibleEquity,
    openPositionRows,
    openPositions,
  };
}

function toDailySnapshotInput(row: {
  trading_day: string;
  status: 'open' | 'finalized';
  daily_reference: string;
  maximum_loss_floor_before: string;
  eod_balance: string | null;
  maximum_loss_floor_after: string | null;
  realized_net_profit_for_day: string | null;
  program_sod_balance: string;
  program_eod_balance: string | null;
  highest_program_eod_balance_after: string | null;
  eligible_realized_net_profit_for_day: string | null;
}): DailySnapshotInput {
  return {
    tradingDay: row.trading_day,
    status: row.status,
    dailyReference: row.daily_reference,
    maximumLossFloorBefore: row.maximum_loss_floor_before,
    eodBalance: row.eod_balance,
    maximumLossFloorAfter: row.maximum_loss_floor_after,
    realizedNetProfitForDay: row.realized_net_profit_for_day,
    programSodBalance: row.program_sod_balance,
    programEodBalance: row.program_eod_balance,
    highestProgramEodBalanceAfter: row.highest_program_eod_balance_after,
    eligibleRealizedNetProfitForDay: row.eligible_realized_net_profit_for_day,
  };
}

/**
 * Read-only — never writes. Prices every open position with the same live
 * market snapshot the rest of this function already used, so the risk view
 * shown to the trader always matches the equity shown alongside it. Returns
 * null only before the account's first-ever trade, when no daily snapshot
 * exists yet to evaluate against (one gets created lazily by risk.ts on
 * that first trade, or by the daily worker — see packages/database).
 */
async function buildAccountRisk(
  db: Db,
  accountId: string,
  account: {
    status: string;
    nominal_balance: string;
    policy_version_id: string;
    symbol_spec_set_id: string;
  },
  balance: string,
  programEligibleBalance: string,
  equity: string,
  openPositionRows: readonly Pick<OpenPositionRow, 'symbol' | 'open_quantity'>[],
): Promise<AccountRisk | null> {
  const today = await db
    .selectFrom('app.account_daily_snapshots')
    .selectAll()
    .where('account_id', '=', accountId)
    .orderBy('trading_day', 'desc')
    .executeTakeFirst();
  if (!today) return null;

  const historicalSnapshots = await db
    .selectFrom('app.account_daily_snapshots')
    .select([
      'trading_day',
      'status',
      'daily_reference',
      'maximum_loss_floor_before',
      'eod_balance',
      'maximum_loss_floor_after',
      'realized_net_profit_for_day',
      'program_sod_balance',
      'program_eod_balance',
      'highest_program_eod_balance_after',
      'eligible_realized_net_profit_for_day',
    ])
    .where('account_id', '=', accountId)
    .where('trading_day', '<', today.trading_day)
    .orderBy('trading_day', 'asc')
    .execute();

  const policy = await loadPolicyById(db, account.policy_version_id);
  const eligibilityPolicy = resolveProfitEligibilityPolicy(policy.parameters);
  const now = new Date();

  const result = evaluateAccountRisk({
    clock: { now: () => now },
    account: {
      id: accountId,
      status: account.status as Parameters<typeof evaluateAccountRisk>[0]['account']['status'],
      nominalBalance: account.nominal_balance,
    },
    policy: policy.parameters,
    currentBalance: balance,
    currentProgramEligibleBalance: programEligibleBalance,
    currentUnrealizedPnl: new Decimal(equity).minus(balance).toFixed(2),
    openPositionCount: openPositionRows.length,
    pendingOrderCount: 0,
    dailySnapshots: [...historicalSnapshots.map(toDailySnapshotInput), toDailySnapshotInput(today)],
  });

  const concentration = await computeConcentrationForAccount(db, account, openPositionRows);
  const dailyLossRemaining = computeDailyLossRemaining(result.dailyLoss);
  const shortDurationCount = eligibilityPolicy.enabled
    ? await countShortDurationProfitClosures(db, accountId, now)
    : 0;
  const shortDurationMonitoring = evaluateShortDurationMonitoring(shortDurationCount, {
    warning: eligibilityPolicy.warningCount,
    entryLock: eligibilityPolicy.entryLockCount,
  });

  // `status` is the actual persisted, enforced status — the one trading.ts's
  // guards check — never the engine's live-computed `recommendedStatus`,
  // which could differ from what's actually in effect until the next
  // trade-triggered or daily-worker-triggered evaluation applies it. Every
  // other field here IS that live, fully-priced preview (useful for e.g.
  // an early soft-lock warning), just never mistaken for the applied status.
  return {
    status: account.status as AccountRisk['status'],
    programEligibleBalance: result.programEligibleBalance,
    programEligibleEquity: result.programEligibleEquity,
    target: result.target,
    dailyLoss: { ...result.dailyLoss, remaining: dailyLossRemaining },
    maximumLoss: result.maximumLoss,
    bestDay: result.bestDay,
    eligibility: {
      passEligible: result.eligibility.passEligible,
      blockingReasons: [...result.eligibility.blockingReasons],
    },
    concentration,
    shortDurationMonitoring: {
      status: shortDurationMonitoring.status,
      count24h: shortDurationMonitoring.count24h,
    },
  };
}

/**
 * Prompt 07 Guardian — "concentration informative" (Rulebook §9.5): reads the
 * same account_exposure_limits row the order-time gate reads
 * (packages/database/src/trading.ts's isWithinAggregateExposureLimit) and
 * buckets open positions identically (FOREX_SYMBOLS combined, XAUUSD and
 * NAS100 each alone), so the number shown here can never say something the
 * gate itself would disagree with. Legacy 1.0 accounts with no v1.1 exposure
 * row get an empty array — same "nothing to check" fallback as the gate.
 */
async function computeConcentrationForAccount(
  db: Db,
  account: { nominal_balance: string; symbol_spec_set_id: string },
  openPositionRows: readonly Pick<OpenPositionRow, 'symbol' | 'open_quantity'>[],
): Promise<ConcentrationBucket[]> {
  const limit = await db
    .selectFrom('app.account_exposure_limits')
    .select(['forex_lots', 'xauusd_lots', 'nas100_contracts'])
    .where('symbol_spec_set_id', '=', account.symbol_spec_set_id)
    .where('nominal_balance', '=', account.nominal_balance)
    .executeTakeFirst();
  if (!limit) return [];

  const sumQuantity = (symbols: readonly TradableSymbol[]): string =>
    openPositionRows
      .filter((row) => symbols.includes(row.symbol))
      .reduce((sum, row) => sum.plus(row.open_quantity), new Decimal(0))
      .toFixed(4);

  return [
    concentrationBucket('forex', sumQuantity(FOREX_SYMBOLS), limit.forex_lots),
    concentrationBucket('xauusd', sumQuantity(['XAUUSD']), limit.xauusd_lots),
    concentrationBucket('nas100', sumQuantity(['NAS100']), limit.nas100_contracts),
  ];
}

function concentrationBucket(
  bucket: ConcentrationBucket['bucket'],
  usedQuantity: string,
  limitQuantity: string,
): ConcentrationBucket {
  const [result] = computeConcentration([{ bucket, usedQuantity, limitQuantity }]);
  return { bucket, usedQuantity, limitQuantity, usedRatio: result?.usedRatio ?? '0.0000' };
}
