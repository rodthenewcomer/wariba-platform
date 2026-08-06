import {
  openPosition,
  closePosition,
  closeAllPositions,
  modifyPositionRisk,
  queuePositionReduction,
  cancelQueuedReduction,
  createPendingOrder,
  modifyPendingOrder,
  cancelPendingOrder,
  cancelAllPendingOrders,
  createPriceAlert,
  modifyPriceAlert,
  enablePriceAlert,
  disablePriceAlert,
  deletePriceAlert,
  markNotificationsRead,
  type Db,
  type TradeCommandResult,
  type MarketSnapshot,
  type TradableSymbol,
  type PendingOrderCommandResult,
  type AlertCommandResult,
} from '@wariba/database';
import {
  TRADABLE_SYMBOLS,
  type SubmitOrderMessage,
  type CloseAllMessage,
  type OrderResultMessage,
  type QueueReductionMessage,
  type CancelQueuedReductionMessage,
  type QueueReductionResultMessage,
  type CreatePendingOrderMessage,
  type ModifyPendingOrderMessage,
  type CancelPendingOrderMessage,
  type CancelAllPendingOrdersMessage,
  type PendingOrderResultMessage,
  type CreatePriceAlertMessage,
  type ModifyPriceAlertMessage,
  type AlertIdMessage,
  type MarkNotificationsReadMessage,
  type AlertResultMessage,
} from '@wariba/contracts';
import type { MarketDataProvider } from '@wariba/adapters';
import type { LoadedSymbolSpec } from './market';
import {
  toOrderDTO,
  toPositionDTO,
  toFillDTO,
  toQueuedReductionDTO,
  toPendingOrderDTO,
  toPriceAlertDTO,
} from './dto-mappers';

export type OrderRejectionReason = 'not_owner';

/**
 * TRD-013/Engineering Constitution §37: the market snapshot is read from
 * the in-memory simulator *before* the DB transaction opens (never inside
 * it) — this is that read, translated into the MarketSnapshot shape
 * packages/database expects.
 */
function readMarketSnapshot(market: MarketDataProvider, symbol: TradableSymbol): MarketSnapshot {
  const tick = market.getSnapshot(symbol);
  return {
    bid: tick.bid,
    ask: tick.ask,
    timestamp: tick.timestamp,
    sequence: String(tick.sequence),
  };
}

/**
 * Prompt 05: every trade command now also runs a risk evaluation covering
 * every open position on the account, not just the symbol being traded —
 * so it always needs live quotes for all tradable symbols, not just one.
 */
export function readAllMarkets(market: MarketDataProvider): Record<TradableSymbol, MarketSnapshot> {
  const result = {} as Record<TradableSymbol, MarketSnapshot>;
  for (const symbol of TRADABLE_SYMBOLS) {
    result[symbol] = readMarketSnapshot(market, symbol);
  }
  return result;
}

export async function verifyAccountOwnership(
  db: Db,
  accountId: string,
  userId: string,
): Promise<boolean> {
  const account = await db
    .selectFrom('app.trading_accounts')
    .select('id')
    .where('id', '=', accountId)
    .where('user_id', '=', userId)
    .executeTakeFirst();
  return Boolean(account);
}

/**
 * Used only to pick which market tick to read for a close/modify command.
 * If the position doesn't exist, this arbitrary choice is never actually
 * used for pricing — the DB transaction checks existence under lock before
 * touching the market snapshot at all, and correctly rejects with
 * position_not_found regardless of what tick was read here.
 */
async function symbolForPosition(db: Db, positionId: string): Promise<TradableSymbol> {
  const row = await db
    .selectFrom('app.positions')
    .select('symbol')
    .where('id', '=', positionId)
    .executeTakeFirst();
  return row?.symbol ?? 'EURUSD';
}

export function buildResultMessage(
  accountId: string,
  idempotencyKey: string,
  orderType: SubmitOrderMessage['orderType'],
  result: TradeCommandResult,
): OrderResultMessage {
  return {
    type: 'order_result',
    idempotencyKey,
    status: result.order.status,
    rejectionCode: result.order.rejectionCode,
    order: toOrderDTO({
      accountId,
      orderId: result.order.orderId,
      idempotencyKey,
      orderType,
      symbol: result.position?.symbol ?? null,
      side: result.position?.side ?? null,
      positionId: result.position?.id ?? null,
      requestedQuantity: result.fill?.quantity ?? null,
      filledQuantity: result.fill?.quantity ?? '0',
      outcome: result.order,
      receivedAt: result.fill?.occurredAt ?? new Date(),
      completedAt: result.fill?.occurredAt ?? null,
    }),
    position: result.position ? toPositionDTO(accountId, result.position) : null,
    fill:
      result.fill && result.position
        ? toFillDTO(
            result.order.orderId,
            result.fill,
            result.position.id,
            result.position.symbol,
            result.position.side,
            orderType === 'market_open' ? 'open' : 'close',
            result.position.averageOpenPrice,
            result.position.openedAt,
          )
        : null,
  };
}

export async function handleSubmitOrder(
  db: Db,
  market: MarketDataProvider,
  userId: string,
  msg: SubmitOrderMessage,
): Promise<{ result: TradeCommandResult; message: OrderResultMessage } | OrderRejectionReason> {
  if (!(await verifyAccountOwnership(db, msg.accountId, userId))) {
    return 'not_owner';
  }

  const now = new Date();
  const marketBySymbol = readAllMarkets(market);

  if (msg.orderType === 'market_open') {
    const result = await openPosition(db, {
      accountId: msg.accountId,
      idempotencyKey: msg.idempotencyKey,
      symbol: msg.symbol,
      side: msg.side,
      quantity: msg.quantity,
      ...(msg.stopLoss !== undefined && { stopLoss: msg.stopLoss }),
      ...(msg.takeProfit !== undefined && { takeProfit: msg.takeProfit }),
      market: marketBySymbol[msg.symbol],
      marketBySymbol,
      now,
    });
    return {
      result,
      message: buildResultMessage(msg.accountId, msg.idempotencyKey, 'market_open', result),
    };
  }

  if (msg.orderType === 'partial_close') {
    const symbol = await symbolForPosition(db, msg.positionId);
    const result = await closePosition(db, {
      accountId: msg.accountId,
      idempotencyKey: msg.idempotencyKey,
      positionId: msg.positionId,
      mode: 'partial',
      quantity: msg.quantity,
      market: marketBySymbol[symbol],
      marketBySymbol,
      now,
    });
    return {
      result,
      message: buildResultMessage(msg.accountId, msg.idempotencyKey, 'partial_close', result),
    };
  }

  if (msg.orderType === 'full_close') {
    const symbol = await symbolForPosition(db, msg.positionId);
    const result = await closePosition(db, {
      accountId: msg.accountId,
      idempotencyKey: msg.idempotencyKey,
      positionId: msg.positionId,
      mode: 'full',
      market: marketBySymbol[symbol],
      marketBySymbol,
      now,
    });
    return {
      result,
      message: buildResultMessage(msg.accountId, msg.idempotencyKey, 'full_close', result),
    };
  }

  // modify_sl / modify_tp
  const result = await modifyPositionRisk(db, {
    accountId: msg.accountId,
    idempotencyKey: msg.idempotencyKey,
    positionId: msg.positionId,
    field: msg.orderType === 'modify_sl' ? 'stop_loss' : 'take_profit',
    value: msg.orderType === 'modify_sl' ? msg.stopLoss : msg.takeProfit,
    marketBySymbol,
    now,
  });
  return {
    result,
    message: buildResultMessage(msg.accountId, msg.idempotencyKey, msg.orderType, result),
  };
}

export async function handleCloseAll(
  db: Db,
  market: MarketDataProvider,
  symbolSpecs: Record<TradableSymbol, LoadedSymbolSpec>,
  userId: string,
  msg: CloseAllMessage,
): Promise<
  { results: TradeCommandResult[]; messages: OrderResultMessage[] } | OrderRejectionReason
> {
  if (!(await verifyAccountOwnership(db, msg.accountId, userId))) {
    return 'not_owner';
  }
  const now = new Date();
  const marketBySymbol = {} as Record<TradableSymbol, MarketSnapshot>;
  for (const symbol of Object.keys(symbolSpecs) as TradableSymbol[]) {
    marketBySymbol[symbol] = readMarketSnapshot(market, symbol);
  }
  const results = await closeAllPositions(db, {
    accountId: msg.accountId,
    idempotencyKeyPrefix: msg.idempotencyKey,
    marketBySymbol,
    now,
  });
  const messages = results.map((r) =>
    buildResultMessage(msg.accountId, msg.idempotencyKey, 'full_close', r),
  );
  return { results, messages };
}

/**
 * Prompt 7 Appendix 07-C §12 — QueuePositionReductionDuringOutage. Uses the
 * position's own symbol's tick (read the same way symbolForPosition does for
 * every other position-scoped command) so "is this market stale" is judged
 * against the right symbol, not whatever the client happened to have open.
 */
export async function handleQueueReduction(
  db: Db,
  market: MarketDataProvider,
  userId: string,
  msg: QueueReductionMessage,
): Promise<QueueReductionResultMessage | OrderRejectionReason> {
  if (!(await verifyAccountOwnership(db, msg.accountId, userId))) {
    return 'not_owner';
  }
  const now = new Date();
  const symbol = await symbolForPosition(db, msg.positionId);
  const marketSnapshot = readMarketSnapshot(market, symbol);
  const result = await queuePositionReduction(db, {
    accountId: msg.accountId,
    idempotencyKey: msg.idempotencyKey,
    positionId: msg.positionId,
    mode: msg.mode,
    ...(msg.quantity !== undefined && { quantity: msg.quantity }),
    market: marketSnapshot,
    now,
  });
  return {
    type: 'queue_reduction_result',
    idempotencyKey: msg.idempotencyKey,
    status: result.status,
    rejectionCode: result.rejectionCode,
    queueEntry: result.queueEntry ? toQueuedReductionDTO(result.queueEntry) : null,
  };
}

export async function handleCancelQueuedReduction(
  db: Db,
  userId: string,
  msg: CancelQueuedReductionMessage,
): Promise<QueueReductionResultMessage | OrderRejectionReason> {
  if (!(await verifyAccountOwnership(db, msg.accountId, userId))) {
    return 'not_owner';
  }
  const now = new Date();
  const result = await cancelQueuedReduction(db, {
    accountId: msg.accountId,
    queueId: msg.queueId,
    now,
  });
  return {
    type: 'queue_reduction_result',
    idempotencyKey: null,
    status: result.status,
    rejectionCode: result.rejectionCode,
    queueEntry: result.queueEntry ? toQueuedReductionDTO(result.queueEntry) : null,
  };
}

function toPendingOrderResultMessage(
  idempotencyKey: string | null,
  result: PendingOrderCommandResult,
): PendingOrderResultMessage {
  return {
    type: 'pending_order_result',
    idempotencyKey,
    status: result.status,
    rejectionCode: result.rejectionCode,
    order: result.order ? toPendingOrderDTO(result.order) : null,
  };
}

export async function handleCreatePendingOrder(
  db: Db,
  market: MarketDataProvider,
  userId: string,
  msg: CreatePendingOrderMessage,
): Promise<PendingOrderResultMessage | OrderRejectionReason> {
  if (!(await verifyAccountOwnership(db, msg.accountId, userId))) {
    return 'not_owner';
  }
  const now = new Date();
  const result = await createPendingOrder(db, {
    accountId: msg.accountId,
    idempotencyKey: msg.idempotencyKey,
    symbol: msg.symbol,
    orderType: msg.orderType,
    quantity: msg.quantity,
    triggerPrice: msg.triggerPrice,
    ...(msg.stopLoss !== undefined && { stopLoss: msg.stopLoss }),
    ...(msg.takeProfit !== undefined && { takeProfit: msg.takeProfit }),
    market: readMarketSnapshot(market, msg.symbol),
    now,
  });
  return toPendingOrderResultMessage(msg.idempotencyKey, result);
}

export async function handleModifyPendingOrder(
  db: Db,
  market: MarketDataProvider,
  userId: string,
  msg: ModifyPendingOrderMessage,
): Promise<PendingOrderResultMessage | OrderRejectionReason> {
  if (!(await verifyAccountOwnership(db, msg.accountId, userId))) {
    return 'not_owner';
  }
  const now = new Date();
  const symbol = await symbolForPendingOrder(db, msg.pendingOrderId);
  const result = await modifyPendingOrder(db, {
    accountId: msg.accountId,
    pendingOrderId: msg.pendingOrderId,
    ...(msg.triggerPrice !== undefined && { triggerPrice: msg.triggerPrice }),
    ...(msg.quantity !== undefined && { quantity: msg.quantity }),
    ...(msg.stopLoss !== undefined && { stopLoss: msg.stopLoss }),
    ...(msg.takeProfit !== undefined && { takeProfit: msg.takeProfit }),
    market: readMarketSnapshot(market, symbol),
    now,
  });
  return toPendingOrderResultMessage(null, result);
}

export async function handleCancelPendingOrder(
  db: Db,
  userId: string,
  msg: CancelPendingOrderMessage,
): Promise<PendingOrderResultMessage | OrderRejectionReason> {
  if (!(await verifyAccountOwnership(db, msg.accountId, userId))) {
    return 'not_owner';
  }
  const now = new Date();
  const result = await cancelPendingOrder(db, {
    accountId: msg.accountId,
    pendingOrderId: msg.pendingOrderId,
    now,
  });
  return toPendingOrderResultMessage(null, result);
}

export async function handleCancelAllPendingOrders(
  db: Db,
  userId: string,
  msg: CancelAllPendingOrdersMessage,
): Promise<PendingOrderResultMessage[] | OrderRejectionReason> {
  if (!(await verifyAccountOwnership(db, msg.accountId, userId))) {
    return 'not_owner';
  }
  const now = new Date();
  const cancelled = await cancelAllPendingOrders(db, { accountId: msg.accountId, now });
  return cancelled.map((order) => ({
    type: 'pending_order_result' as const,
    idempotencyKey: null,
    status: 'active' as const,
    rejectionCode: null,
    order: toPendingOrderDTO(order),
  }));
}

/**
 * Mirrors symbolForPosition above — used only to pick which market tick to
 * read for a modify command; the DB transaction re-validates existence and
 * status under lock regardless of what's read here.
 */
async function symbolForPendingOrder(db: Db, pendingOrderId: string): Promise<TradableSymbol> {
  const row = await db
    .selectFrom('app.pending_orders')
    .select('symbol')
    .where('id', '=', pendingOrderId)
    .executeTakeFirst();
  return row?.symbol ?? 'EURUSD';
}

function toAlertResultMessage(result: AlertCommandResult): AlertResultMessage {
  return {
    type: 'alert_result',
    status: result.status,
    rejectionCode: result.rejectionCode,
    alert: result.alert ? toPriceAlertDTO(result.alert) : null,
  };
}

export async function handleCreatePriceAlert(
  db: Db,
  userId: string,
  msg: CreatePriceAlertMessage,
): Promise<AlertResultMessage> {
  const now = new Date();
  const result = await createPriceAlert(db, {
    userId,
    idempotencyKey: msg.idempotencyKey,
    symbol: msg.symbol,
    direction: msg.direction,
    thresholdPrice: msg.thresholdPrice,
    ...(msg.source !== undefined && { source: msg.source }),
    recurrence: msg.recurrence,
    now,
  });
  return toAlertResultMessage(result);
}

export async function handleModifyPriceAlert(
  db: Db,
  userId: string,
  msg: ModifyPriceAlertMessage,
): Promise<AlertResultMessage> {
  const now = new Date();
  const result = await modifyPriceAlert(db, {
    userId,
    alertId: msg.alertId,
    ...(msg.thresholdPrice !== undefined && { thresholdPrice: msg.thresholdPrice }),
    ...(msg.direction !== undefined && { direction: msg.direction }),
    ...(msg.source !== undefined && { source: msg.source }),
    ...(msg.recurrence !== undefined && { recurrence: msg.recurrence }),
    now,
  });
  return toAlertResultMessage(result);
}

export async function handleEnablePriceAlert(
  db: Db,
  userId: string,
  msg: AlertIdMessage,
): Promise<AlertResultMessage> {
  const result = await enablePriceAlert(db, { userId, alertId: msg.alertId, now: new Date() });
  return toAlertResultMessage(result);
}

export async function handleDisablePriceAlert(
  db: Db,
  userId: string,
  msg: AlertIdMessage,
): Promise<AlertResultMessage> {
  const result = await disablePriceAlert(db, { userId, alertId: msg.alertId, now: new Date() });
  return toAlertResultMessage(result);
}

export async function handleDeletePriceAlert(
  db: Db,
  userId: string,
  msg: AlertIdMessage,
): Promise<AlertResultMessage> {
  const result = await deletePriceAlert(db, { userId, alertId: msg.alertId });
  return toAlertResultMessage(result);
}

export async function handleMarkNotificationsRead(
  db: Db,
  userId: string,
  msg: MarkNotificationsReadMessage,
): Promise<void> {
  await markNotificationsRead(db, {
    userId,
    notificationIds: msg.notificationIds,
    now: new Date(),
  });
}
