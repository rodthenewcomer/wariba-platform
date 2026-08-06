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
  symbolSpecSchema,
  symbolSpecsMessageSchema,
  type MarketStatus,
  type MarketTick,
  type SymbolSpec,
  type SymbolSpecsMessage,
} from './market';

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
