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
  PayoutProviderStatus,
  ActuarialScenarioName,
} from './schema';
export { getStaffRole, staffRoleSatisfies, staffCan, type ControlPermission } from './staff';
export {
  consumeStaffActionRateLimit,
  StaffActionRateLimitExceededError,
  type ConsumeStaffActionRateLimitParams,
} from './staff-action-rate-limit';
export { recordStaffAuditEvent, type RecordStaffAuditEventParams } from './audit';
export {
  findExposureIncreaseRejection,
  EXPOSURE_INCREASE_REJECTION,
  type ExposureIncreaseRejectionCode,
} from './exposure-gate';
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
  setPerformanceAccountComplianceFlags,
  loadOpenPerformanceReviewCases,
  asPerformancePolicy,
  type ActivatePerformanceAccountParams,
  type ActivatedPerformanceAccount,
  type PerformanceCycle,
  type CycleProgress,
  type OpenPerformanceReviewCase,
} from './performance';
export {
  createPayoutRequestInTransaction,
  approvePayoutRequestInTransaction,
  rejectPayoutRequestInTransaction,
  loadPayoutProviderWorkItem,
  recordPayoutProviderSubmissionInTransaction,
  recordPayoutProviderReconciliationInTransaction,
  settlePayoutProviderInTransaction,
  reversePayoutInTransaction,
  loadPayoutRequestsForAccount,
  loadPayoutRequestsForReview,
  evaluatePayoutEligibility,
  type CreatePayoutRequestParams,
  type ReviewPayoutRequestParams,
  type PayoutProviderWorkItem,
  type RecordPayoutProviderSubmissionParams,
  type RecordPayoutProviderReconciliationParams,
  type ReversePayoutParams,
  type PayoutRequestSummary,
  type PayoutRequestResult,
  type PayoutRejectionCode,
  type PayoutRequestHistoryEntry,
  type ControlPayoutQueueEntry,
} from './payouts';
export {
  recordTreasuryReserveEntry,
  loadCurrentReserve,
  computeProjected30DayPayouts,
  evaluateReserveStatus,
  type RecordTreasuryReserveEntryParams,
  type ReserveStatus,
  type TreasuryReserveEntryType,
} from './treasury';
export {
  loadActiveActuarialScenarioAssumptions,
  replaceActuarialScenarioAssumptionsInTransaction,
  runPersistedActuarialScenario,
  loadActiveActuarialScenarios,
  loadRecentActuarialScenarioRuns,
  loadDefaultActuarialScenarioInput,
  type PersistedActuarialScenarioAssumptions,
  type ReplaceActuarialScenarioAssumptionsParams,
  type RunPersistedActuarialScenarioParams,
  type PersistedActuarialScenarioRun,
  type ActuarialScenarioRunComparison,
} from './actuarial-scenarios';
export {
  recordPaymentEvent,
  type RecordPaymentEventParams,
  type RecordPaymentEventResult,
} from './payment-events';
export {
  openPosition,
  openPositionInTransaction,
  closePosition,
  closePositionInTransaction,
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
export {
  resolvePositionProtectionTrigger,
  triggerPositionProtections,
  type PositionProtectionTrigger,
  type TriggeredPositionProtection,
} from './position-protections';
export { loadPublishedPolicy, loadPolicyById } from './policy';
export { loadAccountBalanceProjection, type AccountBalanceProjection } from './program-eligibility';
export {
  reconstructAccountFinancialState,
  reconcileAccountFinancialStateInTransaction,
  placeAccountIntegrityHoldInTransaction,
  clearAccountIntegrityHoldInTransaction,
  type FinancialReconstructionBreakdown,
  type AccountFinancialReconstruction,
  type AccountReconciliationResult,
} from './financial-reconciliation';
export {
  MARKET_TRIGGER_WRITER_SERVICE,
  StaleLeadershipError,
  acquireOrRenewRealtimeLeadership,
  assertCurrentLeadershipInTransaction,
  assertExecutionLeadershipInTransaction,
  expireRealtimeLeadership,
  loadRealtimeLeadership,
  TRADER_COMMAND_EXECUTION,
  type LeadershipToken,
  type MarketMutationExecution,
  type RealtimeLeadershipState,
} from './realtime-leadership';
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
