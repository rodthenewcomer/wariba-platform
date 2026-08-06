import type {
  PositionSummary,
  TradeOrderOutcome,
  FillSummary,
  QueuedReductionSummary,
  PendingOrderSummary,
  PriceAlertSummary,
  AlertNotificationSummary,
} from '@wariba/database';
import type { TradableSymbol, OrderSide } from '@wariba/database';
import type {
  OrderDTO,
  PositionDTO,
  FillDTO,
  OrderType,
  QueuedReductionDTO,
  PendingOrderDTO,
  PriceAlertDTO,
  AlertNotificationDTO,
} from '@wariba/contracts';

export function toPositionDTO(accountId: string, p: PositionSummary): PositionDTO {
  return {
    id: p.id,
    accountId,
    symbol: p.symbol,
    side: p.side,
    openQuantity: p.openQuantity,
    averageOpenPrice: p.averageOpenPrice,
    realizedPnl: p.realizedPnl,
    stopLoss: p.stopLoss,
    takeProfit: p.takeProfit,
    status: p.status,
    openedAt: p.openedAt.toISOString(),
    closedAt: p.closedAt ? p.closedAt.toISOString() : null,
  };
}

export function toOrderDTO(params: {
  accountId: string;
  orderId: string;
  idempotencyKey: string;
  orderType: OrderType;
  symbol: TradableSymbol | null;
  side: OrderSide | null;
  positionId: string | null;
  requestedQuantity: string | null;
  filledQuantity: string;
  outcome: TradeOrderOutcome;
  receivedAt: Date;
  completedAt: Date | null;
}): OrderDTO {
  return {
    id: params.orderId,
    accountId: params.accountId,
    idempotencyKey: params.idempotencyKey,
    orderType: params.orderType,
    symbol: params.symbol,
    side: params.side,
    positionId: params.positionId,
    requestedQuantity: params.requestedQuantity,
    filledQuantity: params.filledQuantity,
    status: params.outcome.status,
    rejectionCode: params.outcome.rejectionCode,
    receivedAt: params.receivedAt.toISOString(),
    completedAt: params.completedAt ? params.completedAt.toISOString() : null,
  };
}

export function toFillDTO(
  orderId: string,
  f: FillSummary,
  positionId: string,
  symbol: TradableSymbol,
  side: OrderSide,
  fillType: 'open' | 'close',
  openingPrice: string,
  openedAt: Date,
): FillDTO {
  return {
    id: f.id,
    openingFillId: f.openingFillId,
    orderId,
    positionId,
    symbol,
    side,
    fillType,
    quantity: f.quantity,
    price: f.price,
    commission: f.commission,
    realizedPnl: f.realizedPnl,
    openingPrice,
    openedAt: openedAt.toISOString(),
    occurredAt: f.occurredAt.toISOString(),
    durationMs: f.durationMs,
    allocatedOpenCommission: f.allocatedOpenCommission,
    netRealizedPnl: f.netRealizedPnl,
    eligibleRealizedPnl: f.eligibleRealizedPnl,
    ineligibleShortDurationProfit: f.ineligibleShortDurationProfit,
    eligibilityReason: f.eligibilityReason,
  };
}

export function toQueuedReductionDTO(q: QueuedReductionSummary): QueuedReductionDTO {
  return {
    id: q.id,
    positionId: q.positionId,
    symbol: q.symbol,
    mode: q.mode,
    requestedQuantity: q.requestedQuantity,
    status: q.status,
    queuedAt: q.queuedAt.toISOString(),
    executedAt: q.executedAt ? q.executedAt.toISOString() : null,
    cancelledAt: q.cancelledAt ? q.cancelledAt.toISOString() : null,
    executionOrderId: q.executionOrderId,
    failureReason: q.failureReason,
  };
}

export function toPendingOrderDTO(o: PendingOrderSummary): PendingOrderDTO {
  return {
    id: o.id,
    accountId: o.accountId,
    symbol: o.symbol,
    side: o.side,
    orderType: o.orderType,
    quantity: o.quantity,
    triggerPrice: o.triggerPrice,
    requestedStopLoss: o.requestedStopLoss,
    requestedTakeProfit: o.requestedTakeProfit,
    status: o.status,
    version: o.version,
    rejectionCode: o.rejectionCode,
    executionOrderId: o.executionOrderId,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    triggeredAt: o.triggeredAt ? o.triggeredAt.toISOString() : null,
    filledAt: o.filledAt ? o.filledAt.toISOString() : null,
    cancelledAt: o.cancelledAt ? o.cancelledAt.toISOString() : null,
  };
}

export function toPriceAlertDTO(a: PriceAlertSummary): PriceAlertDTO {
  return {
    id: a.id,
    userId: a.userId,
    symbol: a.symbol,
    direction: a.direction,
    thresholdPrice: a.thresholdPrice,
    source: a.source,
    recurrence: a.recurrence,
    enabled: a.enabled,
    lastObservedSideAbove: a.lastObservedSideAbove,
    lastTriggeredAt: a.lastTriggeredAt ? a.lastTriggeredAt.toISOString() : null,
    triggerCount: a.triggerCount,
    version: a.version,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export function toAlertNotificationDTO(n: AlertNotificationSummary): AlertNotificationDTO {
  return {
    id: n.id,
    alertId: n.alertId,
    symbol: n.symbol,
    direction: n.direction,
    thresholdPrice: n.thresholdPrice,
    triggeringPrice: n.triggeringPrice,
    source: n.source,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    occurredAt: n.occurredAt.toISOString(),
  };
}
