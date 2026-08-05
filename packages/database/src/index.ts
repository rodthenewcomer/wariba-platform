/**
 * @wariba/database — Kysely database types, transaction helpers, repositories, locks and outbox.
 *
 * Prompt 03 adds the identity/commerce/activation schema types, the DB
 * client factory, and the activation + payment-event repositories. Prompt 04
 * adds the trading schema types and the order-execution transactions.
 */

export const PACKAGE_NAME = '@wariba/database';

export { createDbClient, type Db, type DbExecutor } from './client';
export type { Database, TradableSymbol, OrderSide } from './schema';
export {
  activateEvaluationAccount,
  activateEvaluationAccountInTransaction,
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
  FOREX_SYMBOLS,
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
export { loadPublishedPolicy, loadPolicyById } from './policy';
export {
  evaluateAndApplyAccountRisk,
  evaluateAndApplyAccountRiskInTransaction,
  type EvaluateAndApplyRiskParams,
  type RiskEvaluationOutcome,
} from './risk';
export {
  ensureTodaySnapshot,
  finalizeDailyBoundaryForAccount,
  listAccountsDueForFinalization,
  type EnsureTodaySnapshotParams,
  type FinalizeDailyBoundaryResult,
} from './daily-finalization';
export {
  evaluateAccountRisk,
  type EvaluateAccountRiskParams,
  type RiskEngineResult,
  type DailySnapshotInput,
} from '@wariba/policies';
