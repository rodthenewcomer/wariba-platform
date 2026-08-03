/**
 * @wariba/database — Kysely database types, transaction helpers, repositories, locks and outbox.
 *
 * Prompt 03 adds the identity/commerce/activation schema types, the DB
 * client factory, and the activation + payment-event repositories. Prompt 04
 * adds the trading schema types and the order-execution transactions.
 */

export const PACKAGE_NAME = '@wariba/database';

export { createDbClient, type Db } from './client';
export type { Database, TradableSymbol, OrderSide } from './schema';
export {
  activateEvaluationAccount,
  type ActivateEvaluationAccountParams,
  type ActivatedAccount,
} from './activation';
export {
  recordPaymentEvent,
  type RecordPaymentEventParams,
  type RecordPaymentEventResult,
} from './payment-events';
export {
  openPosition,
  closePosition,
  closeAllPositions,
  modifyPositionRisk,
  type MarketSnapshot,
  type TradeOrderOutcome,
  type PositionSummary,
  type FillSummary,
  type TradeCommandResult,
  type OpenPositionParams,
  type ClosePositionParams,
  type CloseAllPositionsParams,
  type ModifyPositionRiskParams,
} from './trading';
