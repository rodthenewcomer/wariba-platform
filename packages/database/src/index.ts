/**
 * @wariba/database — Kysely database types, transaction helpers, repositories, locks and outbox.
 *
 * Prompt 03 adds the identity/commerce/activation schema types, the DB
 * client factory, and the activation + payment-event repositories. Prompt 04
 * adds the trading schema types and the order-execution transactions.
 */

export const PACKAGE_NAME = '@wariba/database';

export { createDbClient, type Db, type DbExecutor } from './client';
export {
  registerMarketDataSource,
  upsertMarketBars,
  loadMarketBarPage,
  loadCurrentMarketBars,
  loadMarketSourceSequenceWatermarks,
  type MarketDataSourceRecord,
  type PersistedMarketBar,
  type MarketBarPage,
} from './market-bars';
export {
  loadMarketBarBounds,
  loadMarketBarCoverage,
  saveMarketBarCoverage,
  upsertProviderMarketBars,
  withMarketHistoryBackfillLock,
  type MarketBarCoverage,
  type ProviderMarketBar,
} from './market-history-coverage';
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
  MarketBarOrigin,
  MarketBarVolumeSemantics,
  MarketBarSessionState,
  MarketBarHistoryProvenance,
  RiskViolationRuleCode,
  SupportTicketCategory,
  SupportTicketStatus,
  SupportTicketPriority,
  TicketMessageActorType,
  ContestationTargetType,
  ContestationStatus,
  ContestationReasonCategory,
  ContestationDecision,
} from './schema';
export {
  getStaffRole,
  staffRoleSatisfies,
  staffCan,
  CONTROL_PERMISSIONS,
  type ControlPermission,
} from './staff';
export {
  bootstrapPlatformOwner,
  CANONICAL_OWNER_ROLE,
  type BootstrapPlatformOwnerParams,
  type BootstrapPlatformOwnerResult,
  type OwnerAuthAdmin,
} from './owner-bootstrap';
export {
  consumeStaffActionRateLimit,
  consumeActorActionRateLimit,
  StaffActionRateLimitExceededError,
  type ConsumeStaffActionRateLimitParams,
} from './staff-action-rate-limit';

// Phase 3.2 — support and contestations (UX-010 LOCKED).
export {
  listSupportTicketsForUser,
  loadSupportTicketForUser,
  createSupportTicket,
  appendTraderMessage,
  traderCanReply,
  SupportOwnershipError,
  SupportTicketStateError,
  type SupportTicketListRow,
  type SupportTicketThread,
  type SupportThreadMessage,
  type CreateSupportTicketParams,
  type CreatedSupportTicket,
  type AppendTraderMessageParams,
} from './support-tickets';
export {
  loadContestedDecisionEvidence,
  listContestableDecisions,
  type ContestedDecisionEvidence,
  type ContestedOrderEvidence,
  type ContestableDecision,
  type ContestationEvidenceRef,
} from './contestation-evidence';
export {
  openContestation,
  listContestationsForUser,
  loadContestationForUser,
  LIVE_CONTESTATION_STATUSES,
  DuplicateContestationError,
  ContestationTargetError,
  type OpenContestationParams,
  type OpenedContestation,
  type ContestationListRow,
  type ContestationDetail,
} from './contestations';
export {
  loadControlSupportQueue,
  loadControlSupportTicket,
  assignSupportTicketInTransaction,
  appendStaffMessageInTransaction,
  setSupportTicketResolutionInTransaction,
  type ControlSupportFilters,
  type ControlSupportQueueRow,
  type ControlSupportQueuePage,
  type ControlSupportTicketDetail,
  type TicketBeforeAfter,
} from './control-support';
export {
  loadControlContestationQueue,
  loadControlContestation,
  setContestationReviewStateInTransaction,
  recordContestationDecisionInTransaction,
  ContestationStateError,
  type ControlContestationFilters,
  type ControlContestationQueueRow,
  type ControlContestationQueuePage,
  type ControlContestationDetail,
  type ContestationBeforeAfter,
} from './control-contestations';
export { recordStaffAuditEvent, type RecordStaffAuditEventParams } from './audit';
export {
  searchControlOrders,
  loadControlTradingSummary,
  CONTROL_ORDERS_PAGE_SIZE,
  TRADE_ORDER_STATUSES,
  TRADE_ORDER_TYPES,
  type ControlOrderFilters,
  type ControlOrderRow,
  type ControlOrderPage,
  type ControlTradingSummary,
} from './control-trading';
export {
  searchControlPolicies,
  loadControlPolicyDetail,
  resolveEffectivePolicyVersionIds,
  CONTROL_POLICIES_PAGE_SIZE,
  POLICY_PROGRAMS,
  POLICY_STATUSES,
  type ControlPolicyFilters,
  type ControlPolicyRow,
  type ControlPolicyPage,
  type ControlPolicyDetail,
  type ControlPolicyUsage,
  type PolicyProgram,
  type PolicyStatus,
} from './control-policies';
export {
  loadCommercialCatalogue,
  type ControlProduct,
  type ControlProductVersion,
  type ControlCommercialCatalogue,
} from './control-commercial';
export {
  searchStaffDirectory,
  CONTROL_TEAM_PAGE_SIZE,
  type ControlStaffFilters,
  type ControlStaffMember,
  type ControlStaffPage,
} from './control-team';
export {
  searchControlPayouts,
  loadControlPayoutDetail,
  CONTROL_PAYOUTS_PAGE_SIZE,
  type ControlPayoutFilters,
  type ControlPayoutRow,
  type ControlPayoutPage,
  type ControlPayoutDetail,
  type PayoutDetailSection,
  type PayoutLifecycleEvent,
} from './control-payout-review';
export {
  loadTreasuryCockpit,
  type TreasuryCockpit,
  type TreasuryComposition,
  type TreasuryHistoryEntry,
  type TreasuryLiabilities,
  type TreasuryNonReserve,
} from './control-treasury-cockpit';
export {
  searchControlIncidents,
  loadIncidentCodes,
  loadMarketOperationsState,
  CONTROL_INCIDENTS_PAGE_SIZE,
  type ControlIncidentRow,
  type ControlIncidentPage,
  type ControlIncidentFilters,
  type IncidentScope,
  type MarketOperationsState,
} from './control-operations';
export {
  loadRiskCases,
  loadRiskInvestigation,
  type RiskCaseRow,
  type RiskInvestigationDetail,
  type RiskInvestigationSection,
} from './control-risk-investigation';
export {
  searchControlAccounts,
  loadControlAccountDetail,
  CONTROL_ACCOUNTS_PAGE_SIZE,
  type AccountDetailSection,
  type ControlAccountRow,
  type ControlAccountPage,
  type ControlAccountFilters,
  type ControlAccountDetail,
} from './control-accounts';
export {
  searchControlUsers,
  loadControlUserDetail,
  CONTROL_USERS_PAGE_SIZE,
  type ControlUserRow,
  type ControlUserPage,
  type ControlUserSearch,
  type ControlUserDetail,
  type ControlUserAccount,
  type ControlUserLifecycleEvent,
} from './control-users';
export {
  searchAuditEvents,
  loadAuditFilterOptions,
  AUDIT_PAGE_SIZE,
  type AuditEventFilters,
  type AuditEventPage,
  type AuditEventRecord,
} from './audit-explorer';
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
  loadActuarialScenarioRunModel,
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
  measureActuarialActuals,
  recordActuarialVarianceRun,
  loadRecentActuarialVarianceRuns,
  type PersistedActuarialVarianceRun,
} from './actuarial-actuals';
export {
  OPERATIONAL_ALERT,
  evaluateOperationalAlerts,
  reconcileOperationalAlerts,
  loadDatabaseAlertSignals,
  type AlertReconciliationResult,
  type AlertSeverity,
  type EvaluatedAlert,
  type OperationalAlertCode,
  type OperationalAlertSignals,
} from './operational-alerts';
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
