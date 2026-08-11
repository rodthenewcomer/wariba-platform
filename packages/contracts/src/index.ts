/**
 * @wariba/contracts — Versioned HTTP DTOs, WebSocket message envelopes, domain event and error contracts.
 *
 * Scaffolded in Prompt 01. Prompt 04 (Trading Core) adds the first real
 * contracts: the WebSocket envelope, channel names, market ticks, and
 * order/fill/position DTOs — shared between services/realtime (which
 * produces them) and apps/web (which consumes them), the reason this
 * package exists instead of inlining shapes per-service the way Prompt 03
 * inlined HTTP response shapes for its single-consumer API routes.
 */

export const PACKAGE_NAME = '@wariba/contracts';

export {
  TRADABLE_SYMBOLS,
  marketSymbolChannel,
  accountStateChannel,
  accountOrdersChannel,
  accountPositionsChannel,
  userNotificationsChannel,
  type TradableSymbol,
} from './channels';

export { messageEnvelopeSchema, buildEnvelope, type MessageEnvelope } from './envelope';

export {
  symbolSchema,
  marketStatusSchema,
  marketTickSchema,
  assetClassSchema,
  symbolSpecSchema,
  symbolSpecsMessageSchema,
  type AssetClass,
  type MarketStatus,
  type MarketTick,
  type SymbolSpec,
  type SymbolSpecsMessage,
} from './market';

export {
  CANDLE_TIMEFRAMES,
  candleTimeframeSchema,
  marketCandleSchema,
  bucketStartSeconds,
  bucketStartForTimestamp,
  createCandleAggregator,
  midPrice,
  timeframeSeconds,
  type CandleAggregator,
  type CandleObservation,
  type CandleTimeframe,
  type CandleUpdate,
  type MarketCandle,
} from './market-candles';

export {
  INITIAL_HISTORY_CANDLE_LIMIT,
  MAX_HISTORY_CANDLE_LIMIT,
  historySourceSchema,
  historyPriceBasisSchema,
  marketHistoryRequestSchema,
  marketHistoryRequestFrameSchema,
  marketHistoryResultSchema,
  marketHistoryErrorCodeSchema,
  marketHistoryErrorMessageSchema,
  replayAfterSequence,
  validateHistoryWindow,
  mergeFinalizedCandles,
  type HistoryMergeResult,
  type HistoryPriceBasis,
  type HistorySource,
  type HistoryValidation,
  type MarketHistoryErrorCode,
  type MarketHistoryErrorMessage,
  type MarketHistoryPort,
  type MarketHistoryQuery,
  type MarketHistoryRequest,
  type MarketHistoryRequestFrame,
  type MarketHistoryResult,
  type MarketHistoryWindow,
} from './market-history';

export {
  orderTypeSchema,
  sideSchema,
  tradeOrderStatusSchema,
  positionStatusSchema,
  submitOrderMessageSchema,
  closeAllMessageSchema,
  queueReductionMessageSchema,
  cancelQueuedReductionMessageSchema,
  orderDtoSchema,
  fillDtoSchema,
  positionDtoSchema,
  queuedReductionStatusSchema,
  queuedReductionDtoSchema,
  evaluationAccountStatusSchema,
  exposureBucketSchema,
  concentrationBucketSchema,
  accountRiskSchema,
  accountSnapshotSchema,
  orderResultMessageSchema,
  queueReductionResultMessageSchema,
  accountRiskPreviewMessageSchema,
  type OrderType,
  type Side,
  type SubmitOrderMessage,
  type CloseAllMessage,
  type QueueReductionMessage,
  type CancelQueuedReductionMessage,
  type OrderDTO,
  type FillDTO,
  type PositionDTO,
  type QueuedReductionDTO,
  type ConcentrationBucket,
  type AccountRisk,
  type AccountSnapshot,
  type OrderResultMessage,
  type QueueReductionResultMessage,
  type AccountRiskPreviewMessage,
} from './trading';

export {
  subscribeMessageSchema,
  unsubscribeMessageSchema,
  pingMessageSchema,
  pongMessageSchema,
  resyncRequiredMessageSchema,
  type SubscribeMessage,
  type UnsubscribeMessage,
  type ResyncRequiredMessage,
} from './control';

export {
  pendingOrderTypeSchema,
  pendingOrderStatusSchema,
  createPendingOrderMessageSchema,
  modifyPendingOrderMessageSchema,
  cancelPendingOrderMessageSchema,
  cancelAllPendingOrdersMessageSchema,
  pendingOrderDtoSchema,
  pendingOrderResultMessageSchema,
  type PendingOrderType,
  type PendingOrderStatus,
  type CreatePendingOrderMessage,
  type ModifyPendingOrderMessage,
  type CancelPendingOrderMessage,
  type CancelAllPendingOrdersMessage,
  type PendingOrderDTO,
  type PendingOrderResultMessage,
} from './pending-orders';

export {
  alertDirectionSchema,
  alertSourceSchema,
  alertRecurrenceSchema,
  createPriceAlertMessageSchema,
  modifyPriceAlertMessageSchema,
  alertIdMessageSchema,
  markNotificationsReadMessageSchema,
  priceAlertDtoSchema,
  alertResultMessageSchema,
  alertNotificationDtoSchema,
  notificationsSnapshotMessageSchema,
  newAlertNotificationMessageSchema,
  type AlertDirection,
  type AlertSource,
  type AlertRecurrence,
  type CreatePriceAlertMessage,
  type ModifyPriceAlertMessage,
  type AlertIdMessage,
  type MarkNotificationsReadMessage,
  type PriceAlertDTO,
  type AlertResultMessage,
  type AlertNotificationDTO,
  type NotificationsSnapshotMessage,
  type NewAlertNotificationMessage,
} from './price-alerts';

export {
  performanceCycleStatusSchema,
  performanceProgressDtoSchema,
  payoutRequestStatusSchema,
  payoutRequestDtoSchema,
  requestPayoutMessageSchema,
  payoutResultMessageSchema,
  type PerformanceCycleStatusDTO,
  type PerformanceProgressDTO,
  type PayoutRequestStatus,
  type PayoutRequestDTO,
  type RequestPayoutMessage,
  type PayoutResultMessage,
} from './performance';
