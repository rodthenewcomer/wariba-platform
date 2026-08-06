import type {
  PositionSummary,
  TradeOrderOutcome,
  FillSummary,
  QueuedReductionSummary,
} from '@wariba/database';
import type { TradableSymbol, OrderSide } from '@wariba/database';
import type {
  OrderDTO,
  PositionDTO,
  FillDTO,
  OrderType,
  QueuedReductionDTO,
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
