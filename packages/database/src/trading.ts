import {
  assertTradeOrderTransition,
  assertPositionTransition,
  computeFillPrice,
  computeRealizedPnl,
  computeCommission,
  computeProfitEligibility,
  openingAveragePrice,
  isQuantityWithinBounds,
  isAggregateExposureAllowed,
  isStale,
  isPartialCloseQuantityValid,
  subtractQuantity,
  addRealizedPnl,
  type OrderSide,
} from '@wariba/domain';
import { lockAccount, loadSymbolSpec, type LockedAccount, type MarketSnapshot } from './accounts';
import type { Db } from './client';
import { evaluateAndApplyAccountRiskInTransaction } from './risk';
import type { TradableSymbol } from './schema';

export type { MarketSnapshot };

export interface TradeOrderOutcome {
  orderId: string;
  status: 'filled' | 'rejected';
  rejectionCode: string | null;
  accountSequence: string | null;
  alreadyExisted: boolean;
}

export interface PositionSummary {
  id: string;
  symbol: TradableSymbol;
  side: OrderSide;
  openQuantity: string;
  averageOpenPrice: string;
  realizedPnl: string;
  stopLoss: string | null;
  takeProfit: string | null;
  status: 'open' | 'closed';
  openedAt: Date;
  closedAt: Date | null;
}

export interface FillSummary {
  id: string;
  price: string;
  quantity: string;
  commission: string;
  realizedPnl: string;
  occurredAt: Date;
  /** Prompt 07B §4 — null on open fills; always set on close fills. */
  durationMs: string | null;
  isShortDurationProfit: boolean;
  eligibleRealizedPnl: string | null;
  ineligibleShortDurationProfit: string;
}

export interface TradeCommandResult {
  order: TradeOrderOutcome;
  position: PositionSummary | null;
  fill: FillSummary | null;
}

const REJECTION = {
  ACCOUNT_NOT_ACTIVE: 'account_not_active',
  STALE_MARKET_DATA: 'stale_market_data',
  INVALID_QUANTITY: 'invalid_quantity',
  UNKNOWN_SYMBOL_SPEC: 'unknown_symbol_spec',
  POSITION_NOT_FOUND: 'position_not_found',
  POSITION_ALREADY_CLOSED: 'position_already_closed',
  EXPOSURE_LIMIT_EXCEEDED: 'exposure_limit_exceeded',
} as const;

// Exported (not just module-private) so anything displaying exposure —
// e.g. services/realtime's concentration preview — buckets symbols the
// exact same way as the gate below, with no risk of the two drifting apart.
export const FOREX_SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY'] as const;

async function isWithinAggregateExposureLimit(
  trx: Db,
  account: {
    id: string;
    nominal_balance: string;
    symbol_spec_set_id: string;
  },
  symbol: TradableSymbol,
  requestedQuantity: string,
): Promise<boolean> {
  const limit = await trx
    .selectFrom('app.account_exposure_limits')
    .select(['forex_lots', 'xauusd_lots', 'nas100_contracts'])
    .where('symbol_spec_set_id', '=', account.symbol_spec_set_id)
    .where('nominal_balance', '=', account.nominal_balance)
    .executeTakeFirst();

  // Legacy 1.0 accounts have no v1.1 exposure row and retain their pinned
  // contract. New activations always pin the latest 1.1 spec set.
  if (!limit) return true;

  const bucketSymbols: readonly TradableSymbol[] = FOREX_SYMBOLS.includes(
    symbol as (typeof FOREX_SYMBOLS)[number],
  )
    ? FOREX_SYMBOLS
    : [symbol];
  const maximumAggregateQuantity = FOREX_SYMBOLS.includes(symbol as (typeof FOREX_SYMBOLS)[number])
    ? limit.forex_lots
    : symbol === 'XAUUSD'
      ? limit.xauusd_lots
      : limit.nas100_contracts;
  const openPositions = await trx
    .selectFrom('app.positions')
    .select('open_quantity')
    .where('account_id', '=', account.id)
    .where('status', '=', 'open')
    .where('symbol', 'in', bucketSymbols)
    .execute();

  return isAggregateExposureAllowed({
    currentOpenQuantities: openPositions.map((position) => position.open_quantity),
    requestedQuantity,
    maximumAggregateQuantity,
  });
}

async function findExistingOrder(trx: Db, accountId: string, idempotencyKey: string) {
  return trx
    .selectFrom('app.trade_orders')
    .selectAll()
    .where('account_id', '=', accountId)
    .where('idempotency_key', '=', idempotencyKey)
    .executeTakeFirst();
}

async function loadPositionSummary(trx: Db, positionId: string): Promise<PositionSummary> {
  const row = await trx
    .selectFrom('app.positions')
    .selectAll()
    .where('id', '=', positionId)
    .executeTakeFirstOrThrow();
  return {
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
  };
}

async function loadFillSummary(trx: Db, orderId: string): Promise<FillSummary> {
  const row = await trx
    .selectFrom('app.fills')
    .selectAll()
    .where('order_id', '=', orderId)
    .executeTakeFirstOrThrow();
  return {
    id: row.id,
    price: row.price,
    quantity: row.quantity,
    commission: row.commission,
    realizedPnl: row.realized_pnl,
    occurredAt: row.occurred_at,
    durationMs: row.duration_ms,
    isShortDurationProfit: row.is_short_duration_profit,
    eligibleRealizedPnl: row.eligible_realized_pnl,
    ineligibleShortDurationProfit: row.ineligible_short_duration_profit,
  };
}

async function replayExistingOrder(
  trx: Db,
  existing: {
    id: string;
    status: string;
    position_id: string | null;
    rejection_code: string | null;
    account_sequence: string | null;
  },
): Promise<TradeCommandResult> {
  const order: TradeOrderOutcome = {
    orderId: existing.id,
    status: existing.status === 'filled' ? 'filled' : 'rejected',
    rejectionCode: existing.rejection_code,
    accountSequence: existing.account_sequence,
    alreadyExisted: true,
  };
  if (existing.status !== 'filled') {
    return { order, position: null, fill: null };
  }
  const position = existing.position_id
    ? await loadPositionSummary(trx, existing.position_id)
    : null;
  const fill = await loadFillSummary(trx, existing.id);
  return { order, position, fill };
}

async function insertRejectedOrder(
  trx: Db,
  params: {
    account: { id: string; version: number };
    idempotencyKey: string;
    orderType: 'market_open' | 'partial_close' | 'full_close' | 'modify_sl' | 'modify_tp';
    symbol: TradableSymbol | null;
    side: OrderSide | null;
    positionId: string | null;
    requestedQuantity: string | null;
    rejectionCode: string;
    now: Date;
  },
): Promise<TradeCommandResult> {
  // A rejection still advances the account's optimistic-concurrency counter
  // (lockAccount/FOR UPDATE already serializes every attempt on this
  // account, filled or not — this just also records the attempt in it).
  // Without this, a rejected order can land in recentOrders while
  // trading_accounts.version stays exactly what it was on the last real
  // snapshot — and apps/web's realtime client uses that version as its
  // sequence-gate, so an unchanged version reads as "nothing new, drop this
  // reply" and the rejection silently never reaches the UI.
  const nextSequence = params.account.version + 1;
  await trx
    .updateTable('app.trading_accounts')
    .set({ version: nextSequence, updated_at: params.now })
    .where('id', '=', params.account.id)
    .where('version', '=', params.account.version)
    .execute();

  const order = await trx
    .insertInto('app.trade_orders')
    .values({
      account_id: params.account.id,
      idempotency_key: params.idempotencyKey,
      order_type: params.orderType,
      symbol: params.symbol,
      side: params.side,
      position_id: params.positionId,
      requested_quantity: params.requestedQuantity,
      status: 'rejected',
      rejection_code: params.rejectionCode,
      account_sequence: String(nextSequence),
      received_at: params.now,
      completed_at: params.now,
    })
    .returning(['id'])
    .executeTakeFirstOrThrow();
  return {
    order: {
      orderId: order.id,
      status: 'rejected',
      rejectionCode: params.rejectionCode,
      accountSequence: String(nextSequence),
      alreadyExisted: false,
    },
    position: null,
    fill: null,
  };
}

export interface OpenPositionParams {
  accountId: string;
  idempotencyKey: string;
  symbol: TradableSymbol;
  side: OrderSide;
  quantity: string;
  stopLoss?: string;
  takeProfit?: string;
  market: MarketSnapshot;
  /** Live quotes for every tradable symbol — used only for the post-fill risk
   * evaluation's equity calc (fill pricing itself uses `market` above), so
   * an account holding positions in symbols other than the one just traded
   * still gets an accurate breach/soft-lock check. */
  marketBySymbol: Record<TradableSymbol, MarketSnapshot>;
  now: Date;
}

export async function openPosition(
  db: Db,
  params: OpenPositionParams,
): Promise<TradeCommandResult> {
  return db.transaction().execute(async (trx) => {
    // Lock BEFORE checking idempotency: two concurrent calls with the same
    // key must not both read "no existing order" before either commits.
    // Serializing on the account row lock first closes that race — only one
    // of them can be past this point at a time for a given account.
    const account = await lockAccount(trx, params.accountId);

    const existing = await findExistingOrder(trx, params.accountId, params.idempotencyKey);
    if (existing) {
      return replayExistingOrder(trx, existing);
    }

    const reject = (code: string) =>
      insertRejectedOrder(trx, {
        account,
        idempotencyKey: params.idempotencyKey,
        orderType: 'market_open',
        symbol: params.symbol,
        side: params.side,
        positionId: null,
        requestedQuantity: params.quantity,
        rejectionCode: code,
        now: params.now,
      });

    if (account.status !== 'active') {
      return reject(REJECTION.ACCOUNT_NOT_ACTIVE);
    }

    const spec = await loadSymbolSpec(trx, account.symbol_spec_set_id, params.symbol);
    if (!spec) {
      return reject(REJECTION.UNKNOWN_SYMBOL_SPEC);
    }

    if (
      isStale({
        tickTimestamp: params.market.timestamp,
        now: params.now,
        staleThresholdMs: spec.stale_threshold_ms,
      })
    ) {
      return reject(REJECTION.STALE_MARKET_DATA);
    }

    if (
      !isQuantityWithinBounds({
        quantity: params.quantity,
        minimumQuantity: spec.minimum_quantity,
        maximumQuantity: spec.maximum_quantity,
        quantityStep: spec.quantity_step,
      })
    ) {
      return reject(REJECTION.INVALID_QUANTITY);
    }

    if (!(await isWithinAggregateExposureLimit(trx, account, params.symbol, params.quantity))) {
      return reject(REJECTION.EXPOSURE_LIMIT_EXCEEDED);
    }

    const fillPrice = computeFillPrice({
      bid: params.market.bid,
      ask: params.market.ask,
      positionSide: params.side,
      action: 'open',
      slippagePoints: spec.slippage_points,
      pricePrecision: spec.price_precision,
    });
    const commission = computeCommission({
      quantity: params.quantity,
      commissionPerLot: spec.commission_per_lot,
    });
    const nextSequence = account.version + 1;

    await trx
      .updateTable('app.trading_accounts')
      .set({ version: nextSequence, updated_at: params.now })
      .where('id', '=', account.id)
      .where('version', '=', account.version)
      .execute();

    const order = await trx
      .insertInto('app.trade_orders')
      .values({
        account_id: params.accountId,
        idempotency_key: params.idempotencyKey,
        order_type: 'market_open',
        symbol: params.symbol,
        side: params.side,
        position_id: null,
        requested_quantity: params.quantity,
        filled_quantity: params.quantity,
        requested_stop_loss: params.stopLoss ?? null,
        requested_take_profit: params.takeProfit ?? null,
        status: 'accepted',
        account_sequence: String(nextSequence),
        received_at: params.now,
        accepted_at: params.now,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    const position = await trx
      .insertInto('app.positions')
      .values({
        account_id: params.accountId,
        symbol: params.symbol,
        side: params.side,
        opening_quantity: params.quantity,
        open_quantity: params.quantity,
        average_open_price: openingAveragePrice(fillPrice),
        stop_loss: params.stopLoss ?? null,
        take_profit: params.takeProfit ?? null,
        status: 'open',
        account_sequence: String(nextSequence),
        opened_at: params.now,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    const fill = await trx
      .insertInto('app.fills')
      .values({
        order_id: order.id,
        account_id: params.accountId,
        position_id: position.id,
        symbol: params.symbol,
        side: params.side,
        fill_type: 'open',
        quantity: params.quantity,
        price: fillPrice,
        spread_points: spec.spread_points,
        slippage_points: spec.slippage_points,
        commission,
        market_sequence: params.market.sequence,
        account_sequence: String(nextSequence),
        occurred_at: params.now,
      })
      .returning(['id', 'price', 'quantity', 'commission', 'realized_pnl', 'occurred_at'])
      .executeTakeFirstOrThrow();

    assertTradeOrderTransition('accepted', 'filled');
    await trx
      .updateTable('app.trade_orders')
      .set({ status: 'filled', completed_at: params.now, position_id: position.id })
      .where('id', '=', order.id)
      .execute();

    if (commission !== '0.00') {
      await trx
        .insertInto('app.trading_ledger_entries')
        .values({
          account_id: params.accountId,
          entry_type: 'commission',
          amount: `-${commission}`,
          reference_type: 'fill',
          reference_id: fill.id,
          occurred_at: params.now,
        })
        .execute();
    }

    await trx
      .insertInto('app.outbox_events')
      .values({
        aggregate_type: 'position',
        aggregate_id: position.id,
        event_type: 'position.opened',
        payload: JSON.stringify({
          accountId: params.accountId,
          orderId: order.id,
          positionId: position.id,
        }),
        occurred_at: params.now,
      })
      .execute();

    const riskOutcome = await evaluateAndApplyAccountRiskInTransaction(trx, {
      accountId: params.accountId,
      now: params.now,
      marketBySymbol: params.marketBySymbol,
      triggerEventType: 'trade_order',
      triggerEventId: order.id,
    });
    if (riskOutcome.transitioned && riskOutcome.newStatus === 'breached') {
      await closeAllOpenPositionsOnBreach(trx, params.accountId, params.marketBySymbol, params.now);
    }

    return {
      order: {
        orderId: order.id,
        status: 'filled',
        rejectionCode: null,
        accountSequence: String(nextSequence),
        alreadyExisted: false,
      },
      position: await loadPositionSummary(trx, position.id),
      fill: {
        id: fill.id,
        price: fill.price,
        quantity: fill.quantity,
        commission: fill.commission,
        realizedPnl: fill.realized_pnl,
        occurredAt: fill.occurred_at,
        // Open fills never carry a duration or eligibility outcome — only closes do.
        durationMs: null,
        isShortDurationProfit: false,
        eligibleRealizedPnl: null,
        ineligibleShortDurationProfit: '0.00',
      },
    };
  });
}

export interface ClosePositionParams {
  accountId: string;
  idempotencyKey: string;
  positionId: string;
  mode: 'partial' | 'full';
  quantity?: string;
  market: MarketSnapshot;
  /** See OpenPositionParams.marketBySymbol — same purpose. */
  marketBySymbol: Record<TradableSymbol, MarketSnapshot>;
  now: Date;
}

interface ClosePositionExecution {
  result: TradeCommandResult;
  nextAccount: LockedAccount;
}

/**
 * Executes a close while the caller already holds the account row lock. This
 * keeps single-position closes and Close All on the same financial path while
 * allowing Close All to remain one atomic, replayable transaction.
 */
async function closePositionLocked(
  trx: Db,
  params: ClosePositionParams,
  account: LockedAccount,
): Promise<ClosePositionExecution> {
  const existing = await findExistingOrder(trx, params.accountId, params.idempotencyKey);
  if (existing) {
    return {
      result: await replayExistingOrder(trx, existing),
      nextAccount: account,
    };
  }

  const orderType = params.mode === 'partial' ? 'partial_close' : 'full_close';

  // positionId is explicit (not closed over params.positionId) because the
  // not-found case must record null — trade_orders.position_id is a real FK.
  const reject = async (
    code: string,
    symbol: TradableSymbol | null,
    side: OrderSide | null,
    positionId: string | null,
  ): Promise<ClosePositionExecution> => ({
    result: await insertRejectedOrder(trx, {
      account,
      idempotencyKey: params.idempotencyKey,
      orderType,
      symbol,
      side,
      positionId,
      requestedQuantity: params.quantity ?? null,
      rejectionCode: code,
      now: params.now,
    }),
    // insertRejectedOrder bumped trading_accounts.version by exactly one —
    // must be reflected here too, or a Close All loop chaining this through
    // as the next iteration's `account` would retry the optimistic-
    // concurrency UPDATE against a version the DB has already moved past.
    nextAccount: { ...account, version: account.version + 1, updated_at: params.now },
  });

  const position = await trx
    .selectFrom('app.positions')
    .selectAll()
    .where('id', '=', params.positionId)
    .where('account_id', '=', params.accountId)
    .executeTakeFirst();

  if (!position) {
    return reject(REJECTION.POSITION_NOT_FOUND, null, null, null);
  }
  if (position.status !== 'open') {
    return reject(REJECTION.POSITION_ALREADY_CLOSED, position.symbol, position.side, position.id);
  }
  // Reducing/closing exposure stays allowed under a soft lock (RULESET v1.1
  // enforcement.soft_lock: reduce_position/close_position = allowed), and
  // under a breach too — closing is exactly what the forced close-all in
  // closeAllOpenPositionsOnBreach needs to do. Only new/increased exposure
  // (openPosition) is ever blocked.
  if (
    account.status !== 'active' &&
    account.status !== 'soft_locked' &&
    account.status !== 'breached'
  ) {
    return reject(REJECTION.ACCOUNT_NOT_ACTIVE, position.symbol, position.side, position.id);
  }

  const spec = await loadSymbolSpec(trx, account.symbol_spec_set_id, position.symbol);
  if (!spec) {
    return reject(REJECTION.UNKNOWN_SYMBOL_SPEC, position.symbol, position.side, position.id);
  }
  if (
    isStale({
      tickTimestamp: params.market.timestamp,
      now: params.now,
      staleThresholdMs: spec.stale_threshold_ms,
    })
  ) {
    return reject(REJECTION.STALE_MARKET_DATA, position.symbol, position.side, position.id);
  }

  let closeQuantity: string;
  if (params.mode === 'full') {
    closeQuantity = position.open_quantity;
  } else {
    if (
      !params.quantity ||
      !isPartialCloseQuantityValid({
        requestedQuantity: params.quantity,
        openQuantity: position.open_quantity,
      })
    ) {
      return reject(REJECTION.INVALID_QUANTITY, position.symbol, position.side, position.id);
    }
    closeQuantity = params.quantity;
  }

  const fillPrice = computeFillPrice({
    bid: params.market.bid,
    ask: params.market.ask,
    positionSide: position.side,
    action: 'close',
    slippagePoints: spec.slippage_points,
    pricePrecision: spec.price_precision,
  });
  const realizedPnl = computeRealizedPnl({
    openPrice: position.average_open_price,
    closePrice: fillPrice,
    quantity: closeQuantity,
    contractSize: spec.contract_size,
    positionSide: position.side,
  });
  const commission = computeCommission({
    quantity: closeQuantity,
    commissionPerLot: spec.commission_per_lot,
  });
  // Prompt 07B §4 — duration measured strictly from the position's server
  // opening timestamp to this closing fill's server timestamp (params.now),
  // never a client-supplied time. TRD-020's hedging model (one opening fill
  // per position) means this single-timestamp check is exactly right — see
  // computeProfitEligibility's doc comment for why no FIFO lot-matching is needed.
  const eligibility = computeProfitEligibility({
    openedAt: position.opened_at,
    closedAt: params.now,
    realizedPnl,
  });
  const remainingQuantity = subtractQuantity(position.open_quantity, closeQuantity);
  const newPositionStatus = remainingQuantity === '0.0000' ? 'closed' : 'open';
  if (newPositionStatus === 'closed') {
    assertPositionTransition('open', 'closed');
  }

  const nextSequence = account.version + 1;
  await trx
    .updateTable('app.trading_accounts')
    .set({ version: nextSequence, updated_at: params.now })
    .where('id', '=', account.id)
    .where('version', '=', account.version)
    .executeTakeFirstOrThrow();

  const order = await trx
    .insertInto('app.trade_orders')
    .values({
      account_id: params.accountId,
      idempotency_key: params.idempotencyKey,
      order_type: orderType,
      symbol: position.symbol,
      side: position.side,
      position_id: position.id,
      requested_quantity: params.mode === 'partial' ? closeQuantity : null,
      filled_quantity: closeQuantity,
      status: 'accepted',
      account_sequence: String(nextSequence),
      received_at: params.now,
      accepted_at: params.now,
    })
    .returning(['id'])
    .executeTakeFirstOrThrow();

  await trx
    .updateTable('app.positions')
    .set({
      open_quantity: remainingQuantity,
      realized_pnl: addRealizedPnl(position.realized_pnl, realizedPnl),
      status: newPositionStatus,
      account_sequence: String(nextSequence),
      closed_at: newPositionStatus === 'closed' ? params.now : null,
      version: position.version + 1,
    })
    .where('id', '=', position.id)
    .where('version', '=', position.version)
    .executeTakeFirstOrThrow();

  const fill = await trx
    .insertInto('app.fills')
    .values({
      order_id: order.id,
      account_id: params.accountId,
      position_id: position.id,
      symbol: position.symbol,
      side: position.side,
      fill_type: 'close',
      quantity: closeQuantity,
      price: fillPrice,
      spread_points: spec.spread_points,
      slippage_points: spec.slippage_points,
      commission,
      realized_pnl: realizedPnl,
      market_sequence: params.market.sequence,
      account_sequence: String(nextSequence),
      occurred_at: params.now,
      duration_ms: String(eligibility.durationMs),
      is_short_duration_profit: eligibility.isShortDurationProfit,
      eligible_realized_pnl: eligibility.eligibleRealizedPnl,
      ineligible_short_duration_profit: eligibility.ineligibleShortDurationProfit,
    })
    .returning([
      'id',
      'price',
      'quantity',
      'commission',
      'realized_pnl',
      'occurred_at',
      'duration_ms',
      'is_short_duration_profit',
      'eligible_realized_pnl',
      'ineligible_short_duration_profit',
    ])
    .executeTakeFirstOrThrow();

  assertTradeOrderTransition('accepted', 'filled');
  await trx
    .updateTable('app.trade_orders')
    .set({ status: 'filled', completed_at: params.now })
    .where('id', '=', order.id)
    .execute();

  await trx
    .insertInto('app.trading_ledger_entries')
    .values({
      account_id: params.accountId,
      entry_type: 'realized_pnl',
      amount: realizedPnl,
      reference_type: 'fill',
      reference_id: fill.id,
      occurred_at: params.now,
    })
    .execute();

  if (commission !== '0.00') {
    await trx
      .insertInto('app.trading_ledger_entries')
      .values({
        account_id: params.accountId,
        entry_type: 'commission',
        amount: `-${commission}`,
        reference_type: 'fill',
        reference_id: fill.id,
        occurred_at: params.now,
      })
      .execute();
  }

  await trx
    .insertInto('app.outbox_events')
    .values({
      aggregate_type: 'position',
      aggregate_id: position.id,
      event_type: newPositionStatus === 'closed' ? 'position.closed' : 'position.partially_closed',
      payload: JSON.stringify({
        accountId: params.accountId,
        orderId: order.id,
        positionId: position.id,
      }),
      occurred_at: params.now,
    })
    .execute();

  const riskOutcome = await evaluateAndApplyAccountRiskInTransaction(trx, {
    accountId: params.accountId,
    now: params.now,
    marketBySymbol: params.marketBySymbol,
    triggerEventType: 'trade_order',
    triggerEventId: order.id,
  });
  if (riskOutcome.transitioned && riskOutcome.newStatus === 'breached') {
    await closeAllOpenPositionsOnBreach(trx, params.accountId, params.marketBySymbol, params.now);
  }

  return {
    result: {
      order: {
        orderId: order.id,
        status: 'filled',
        rejectionCode: null,
        accountSequence: String(nextSequence),
        alreadyExisted: false,
      },
      position: await loadPositionSummary(trx, position.id),
      fill: {
        id: fill.id,
        price: fill.price,
        quantity: fill.quantity,
        commission: fill.commission,
        realizedPnl: fill.realized_pnl,
        occurredAt: fill.occurred_at,
        durationMs: fill.duration_ms,
        isShortDurationProfit: fill.is_short_duration_profit,
        eligibleRealizedPnl: fill.eligible_realized_pnl,
        ineligibleShortDurationProfit: fill.ineligible_short_duration_profit,
      },
    },
    nextAccount: { ...account, version: nextSequence, updated_at: params.now },
  };
}

/**
 * Prompt 05 — RULESET v1.1 `maximum_loss.close_positions_on_breach: true`:
 * a hard breach is terminal, so every remaining open position is force-
 * closed in the same transaction as the breach itself, not left dangling.
 * Re-locks the account (safe no-op under an already-held lock) rather than
 * trusting a caller-supplied account object, since callers may have bumped
 * `version` since they last read it.
 */
async function closeAllOpenPositionsOnBreach(
  trx: Db,
  accountId: string,
  marketBySymbol: Record<TradableSymbol, MarketSnapshot>,
  now: Date,
): Promise<void> {
  let account = await lockAccount(trx, accountId);
  const openPositions = await trx
    .selectFrom('app.positions')
    .select(['id', 'symbol'])
    .where('account_id', '=', accountId)
    .where('status', '=', 'open')
    .orderBy('opened_at', 'asc')
    .forUpdate()
    .execute();

  for (const position of openPositions) {
    const market = marketBySymbol[position.symbol];
    if (!market) continue; // no live quote for this symbol — left open for the next opportunity to price and close it.
    const execution = await closePositionLocked(
      trx,
      {
        accountId,
        idempotencyKey: `breach-close:${accountId}:${position.id}`,
        positionId: position.id,
        mode: 'full',
        market,
        marketBySymbol,
        now,
      },
      account,
    );
    account = execution.nextAccount;
  }
}

export async function closePosition(
  db: Db,
  params: ClosePositionParams,
): Promise<TradeCommandResult> {
  return db.transaction().execute(async (trx) => {
    // Lock BEFORE checking idempotency — see openPosition for why.
    const account = await lockAccount(trx, params.accountId);
    return (await closePositionLocked(trx, params, account)).result;
  });
}

export interface CloseAllPositionsParams {
  accountId: string;
  idempotencyKeyPrefix: string;
  marketBySymbol: Record<TradableSymbol, MarketSnapshot>;
  now: Date;
}

export async function closeAllPositions(
  db: Db,
  params: CloseAllPositionsParams,
): Promise<TradeCommandResult[]> {
  return db.transaction().execute(async (trx) => {
    let account = await lockAccount(trx, params.accountId);

    const existingMaster = await findExistingOrder(
      trx,
      params.accountId,
      params.idempotencyKeyPrefix,
    );
    if (existingMaster) {
      const existingChildren = await trx
        .selectFrom('app.trade_orders')
        .selectAll()
        .where('account_id', '=', params.accountId)
        .where('idempotency_key', 'like', `${existingMaster.id}:%`)
        .orderBy('received_at', 'asc')
        .execute();
      return Promise.all(existingChildren.map((order) => replayExistingOrder(trx, order)));
    }

    const master = await trx
      .insertInto('app.trade_orders')
      .values({
        account_id: params.accountId,
        idempotency_key: params.idempotencyKeyPrefix,
        order_type: 'close_all',
        symbol: null,
        side: null,
        position_id: null,
        status: 'accepted',
        account_sequence: String(account.version),
        received_at: params.now,
        accepted_at: params.now,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    const openPositions = await trx
      .selectFrom('app.positions')
      .select(['id', 'symbol'])
      .where('account_id', '=', params.accountId)
      .where('status', '=', 'open')
      .orderBy('opened_at', 'asc')
      .forUpdate()
      .execute();

    const results: TradeCommandResult[] = [];
    for (const position of openPositions) {
      const market = params.marketBySymbol[position.symbol];
      if (!market) {
        throw new Error(`Missing market snapshot for ${position.symbol}`);
      }
      const execution = await closePositionLocked(
        trx,
        {
          accountId: params.accountId,
          idempotencyKey: `${master.id}:${position.id}`,
          positionId: position.id,
          mode: 'full',
          market,
          marketBySymbol: params.marketBySymbol,
          now: params.now,
        },
        account,
      );
      account = execution.nextAccount;
      results.push(execution.result);
    }

    const masterStatus = results.every((result) => result.order.status === 'filled')
      ? 'filled'
      : 'rejected';
    assertTradeOrderTransition('accepted', masterStatus);
    await trx
      .updateTable('app.trade_orders')
      .set({
        status: masterStatus,
        rejection_code: masterStatus === 'rejected' ? 'close_all_incomplete' : null,
        account_sequence: String(account.version),
        completed_at: params.now,
      })
      .where('id', '=', master.id)
      .execute();

    await trx
      .insertInto('app.outbox_events')
      .values({
        aggregate_type: 'account',
        aggregate_id: params.accountId,
        event_type: 'positions.close_all_completed',
        payload: JSON.stringify({
          accountId: params.accountId,
          masterOrderId: master.id,
          positionCount: results.length,
          status: masterStatus,
        }),
        occurred_at: params.now,
      })
      .execute();

    return results;
  });
}

export interface ModifyPositionRiskParams {
  accountId: string;
  idempotencyKey: string;
  positionId: string;
  field: 'stop_loss' | 'take_profit';
  value: string | null;
  /** See OpenPositionParams.marketBySymbol — same purpose (an SL/TP edit
   * doesn't change exposure, but the risk check it triggers still needs
   * full market coverage to value every open position accurately). */
  marketBySymbol: Record<TradableSymbol, MarketSnapshot>;
  now: Date;
}

export async function modifyPositionRisk(
  db: Db,
  params: ModifyPositionRiskParams,
): Promise<TradeCommandResult> {
  return db.transaction().execute(async (trx) => {
    // Lock BEFORE checking idempotency — see openPosition for why.
    const account = await lockAccount(trx, params.accountId);

    const existing = await findExistingOrder(trx, params.accountId, params.idempotencyKey);
    if (existing) {
      return replayExistingOrder(trx, existing);
    }

    const orderType = params.field === 'stop_loss' ? 'modify_sl' : 'modify_tp';

    const reject = (
      code: string,
      symbol: TradableSymbol | null,
      side: OrderSide | null,
      positionId: string | null,
    ) =>
      insertRejectedOrder(trx, {
        account,
        idempotencyKey: params.idempotencyKey,
        orderType,
        symbol,
        side,
        positionId,
        requestedQuantity: null,
        rejectionCode: code,
        now: params.now,
      });

    const position = await trx
      .selectFrom('app.positions')
      .selectAll()
      .where('id', '=', params.positionId)
      .where('account_id', '=', params.accountId)
      .executeTakeFirst();

    if (!position) {
      return reject(REJECTION.POSITION_NOT_FOUND, null, null, null);
    }
    if (position.status !== 'open') {
      return reject(REJECTION.POSITION_ALREADY_CLOSED, position.symbol, position.side, position.id);
    }
    // SL/TP edits don't change exposure — allowed under a soft lock, same as reduce/close.
    if (account.status !== 'active' && account.status !== 'soft_locked') {
      return reject(REJECTION.ACCOUNT_NOT_ACTIVE, position.symbol, position.side, position.id);
    }

    const nextSequence = account.version + 1;
    await trx
      .updateTable('app.trading_accounts')
      .set({ version: nextSequence, updated_at: params.now })
      .where('id', '=', account.id)
      .where('version', '=', account.version)
      .execute();

    const order = await trx
      .insertInto('app.trade_orders')
      .values({
        account_id: params.accountId,
        idempotency_key: params.idempotencyKey,
        order_type: orderType,
        symbol: position.symbol,
        side: position.side,
        position_id: position.id,
        requested_stop_loss: params.field === 'stop_loss' ? params.value : null,
        requested_take_profit: params.field === 'take_profit' ? params.value : null,
        status: 'filled',
        account_sequence: String(nextSequence),
        received_at: params.now,
        accepted_at: params.now,
        completed_at: params.now,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    await trx
      .updateTable('app.positions')
      .set({
        [params.field]: params.value,
        account_sequence: String(nextSequence),
        version: position.version + 1,
      })
      .where('id', '=', position.id)
      .where('version', '=', position.version)
      .execute();

    await trx
      .insertInto('app.outbox_events')
      .values({
        aggregate_type: 'position',
        aggregate_id: position.id,
        event_type: 'position.risk_modified',
        payload: JSON.stringify({
          accountId: params.accountId,
          orderId: order.id,
          positionId: position.id,
          field: params.field,
          value: params.value,
        }),
        occurred_at: params.now,
      })
      .execute();

    const riskOutcome = await evaluateAndApplyAccountRiskInTransaction(trx, {
      accountId: params.accountId,
      now: params.now,
      marketBySymbol: params.marketBySymbol,
      triggerEventType: 'trade_order',
      triggerEventId: order.id,
    });
    if (riskOutcome.transitioned && riskOutcome.newStatus === 'breached') {
      await closeAllOpenPositionsOnBreach(trx, params.accountId, params.marketBySymbol, params.now);
    }

    return {
      order: {
        orderId: order.id,
        status: 'filled',
        rejectionCode: null,
        accountSequence: String(nextSequence),
        alreadyExisted: false,
      },
      position: await loadPositionSummary(trx, position.id),
      fill: null,
    };
  });
}

/**
 * Prompt 07B — rolling 24h short-duration profit count, read directly from
 * app.fills (fills_account_short_duration_idx) rather than a separate
 * counter table, so there is exactly one durable record of each occurrence.
 * Feed the result into @wariba/domain's evaluateShortDurationMonitoring to
 * get the warning/entry_locked status. Detection only — see DECISION_LOG
 * for why actual entry-lock enforcement (a new account status + order-
 * handler gate) is tracked as a separate follow-up rather than wired here.
 */
export async function countShortDurationProfitClosures(
  db: Db,
  accountId: string,
  now: Date,
): Promise<number> {
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const { count } = await db
    .selectFrom('app.fills')
    .select((eb) => eb.fn.countAll<string>().as('count'))
    .where('account_id', '=', accountId)
    .where('is_short_duration_profit', '=', true)
    .where('occurred_at', '>=', windowStart)
    .where('occurred_at', '<=', now)
    .executeTakeFirstOrThrow();
  return Number(count);
}
