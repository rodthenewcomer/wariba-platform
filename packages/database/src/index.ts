/**
 * @wariba/database — Kysely database types, transaction helpers, repositories, locks and outbox.
 *
 * Prompt 03 adds the identity/commerce/activation schema types, the DB
 * client factory, and the activation + payment-event repositories. Prompt 04
 * adds the trading schema types and the order-execution transactions.
 */

export const PACKAGE_NAME = '@wariba/database';

export { createDbClient, type Db, type DbExecutor } from './client';
export type {
  Database,
  TradableSymbol,
  OrderSide,
  StaffRole,
  PositionReductionQueueStatus,
  PendingOrderType,
  PendingOrderStatus,
  AlertDirection,
  AlertSource,
  AlertRecurrence,
} from './schema';
export { getStaffRole, staffRoleSatisfies } from './staff';
export {
  activateEvaluationAccount,
  activateEvaluationAccountInTransaction,
  type ActivateEvaluationAccountParams,
  type ActivatedAccount,
} from './activation';
export {
  activatePerformanceAccountInTransaction,
  findActivePerformanceAccountForUser,
  loadActiveCycle,
  evaluateCycleProgress,
  closeCycleAndAdvanceInTransaction,
  type ActivatePerformanceAccountParams,
  type ActivatedPerformanceAccount,
  type PerformanceCycle,
  type CycleProgress,
} from './performance';
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
  countShortDurationProfitClosures,
  isWithinAggregateExposureLimit,
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
export {
  createPendingOrder,
  modifyPendingOrder,
  cancelPendingOrder,
  cancelAllPendingOrders,
  triggerPendingOrders,
  loadActivePendingOrdersForAccount,
  type PendingOrderSummary,
  type CreatePendingOrderParams,
  type ModifyPendingOrderParams,
  type CancelPendingOrderParams,
  type PendingOrderCommandResult,
  type TriggerPendingOrdersParams,
  type TriggeredPendingOrder,
} from './pending-orders';
export {
  createPriceAlert,
  modifyPriceAlert,
  enablePriceAlert,
  disablePriceAlert,
  deletePriceAlert,
  evaluateAlerts,
  loadActiveAlertsForUser,
  loadNotificationsForUser,
  markNotificationsRead,
  type PriceAlertSummary,
  type AlertCommandResult,
  type CreatePriceAlertParams,
  type ModifyPriceAlertParams,
  type AlertNotificationSummary,
} from './price-alerts';
export {
  queuePositionReduction,
  cancelQueuedReduction,
  executeQueuedReductions,
  loadQueuedReductionsForAccount,
  type QueuedReductionSummary,
  type QueuePositionReductionParams,
  type QueuePositionReductionResult,
  type CancelQueuedReductionParams,
  type CancelQueuedReductionResult,
  type ExecuteQueuedReductionsParams,
  type ExecutedQueuedReduction,
} from './position-reduction-queue';
export { loadPublishedPolicy, loadPolicyById } from './policy';
export { loadAccountBalanceProjection, type AccountBalanceProjection } from './program-eligibility';
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
  resolveProfitEligibilityPolicy,
  type EvaluateAccountRiskParams,
  type RiskEngineResult,
  type DailySnapshotInput,
} from '@wariba/policies';
