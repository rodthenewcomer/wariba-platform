/**
 * @wariba/application — Application layer: use-cases that orchestrate
 * domain logic (@wariba/domain) and infrastructure (@wariba/database)
 * behind DTOs. apps/web (presentation) depends on this package instead of
 * @wariba/database directly — the frontend never sees a repository,
 * a table, or a raw ORM model (AGENTS.md §7.1, Engineering Constitution §6.2).
 */

export const PACKAGE_NAME = '@wariba/application';

// Re-exported so apps/web can hold a connection handle without importing
// @wariba/database itself — the boundary this package exists to enforce
// is "no raw queries in the frontend", not "the frontend can't hold a
// handle to pass into these functions".
export { createDbClient, type Db } from '@wariba/database';
export {
  listCanonicalV2Offers,
  createCanonicalV2PurchaseOrder,
  type CanonicalOfferReadModel,
  type CreateCanonicalV2OrderResult,
} from './canonical-offers';

export {
  getStaffRole,
  staffRoleSatisfies,
  staffCan,
  type StaffRole,
  type ControlPermission,
} from '@wariba/database';
export { maskEmail, displayName } from './control-pii';
export {
  parsePayoutQuery,
  payoutPageHref,
  PAYOUT_STATUSES,
  PAYOUT_PROVIDER_STATUSES,
  PAYOUT_FILTER_LABELS,
  type PayoutQuery,
  type PayoutSearchParams,
} from './control-payouts-query';
export {
  parseAccountQuery,
  accountPageHref,
  accountTotalPages,
  ACCOUNT_PROGRAMS,
  ACCOUNT_STATUSES,
  ACCOUNT_FILTER_LABELS,
  type AccountQuery,
  type AccountSearchParams,
} from './control-accounts-view';
export {
  ACCOUNT_SECTIONS,
  ACCOUNT_SECTION_PERMISSION,
  authorizedAccountSections,
  canReadAccountSection,
  type AccountSection,
} from './control-account-sections';
export {
  buildMarketOpsView,
  observed,
  unavailable,
  PROBE_UNAVAILABLE_REASON,
  LAST_TICK_AGE_UNAVAILABLE_REASON,
  type MarketOpsView,
  type Observed,
  type OperationalAlertView,
  type RealtimeHealthReport,
  type RealtimeMetricsReport,
} from './control-market-ops-view';
export {
  parsePolicyQuery,
  parseStaffQuery,
  parseOrderQuery,
  governancePageHref,
  TRADABLE_SYMBOLS,
  ORDER_FILTER_LABELS,
  STAFF_ROLES,
  POLICY_FILTER_LABELS,
  STAFF_FILTER_LABELS,
  type GovernanceSearchParams,
  type PolicyQuery,
  type StaffQuery,
  type OrderQuery,
} from './control-governance-query';
export {
  evaluateCommercialGate,
  resolveFeatureFlagState,
  FEATURE_FLAG_STATE_SOURCE,
  FEATURE_FLAG_SOURCE_LIMITATION,
  FOUNDER_COHORT_GATE_IMPLEMENTED,
  FOUNDER_COHORT_GATE_NOTE,
  PRICING_STATUS_NOTE,
  type CommercialGateEvaluation,
  type FeatureFlagState,
} from './control-feature-gates';
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
  searchControlPolicies,
  loadControlPolicyDetail,
  resolveEffectivePolicyVersionIds,
  loadCommercialCatalogue,
  searchStaffDirectory,
  CONTROL_POLICIES_PAGE_SIZE,
  CONTROL_TEAM_PAGE_SIZE,
  POLICY_PROGRAMS,
  POLICY_STATUSES,
  type ControlPolicyFilters,
  type ControlPolicyRow,
  type ControlPolicyPage,
  type ControlPolicyDetail,
  type PolicyProgram,
  type PolicyStatus,
  type ControlProduct,
  type ControlProductVersion,
  type ControlCommercialCatalogue,
  type ControlStaffFilters,
  type ControlStaffMember,
  type ControlStaffPage,
} from '@wariba/database';
export {
  searchControlPayouts,
  loadControlPayoutDetail,
  loadTreasuryCockpit,
  CONTROL_PAYOUTS_PAGE_SIZE,
  type ControlPayoutFilters,
  type ControlPayoutRow,
  type ControlPayoutPage,
  type ControlPayoutDetail,
  type PayoutDetailSection,
  type TreasuryCockpit,
  type TreasuryComposition,
  type TreasuryHistoryEntry,
} from '@wariba/database';
export {
  searchControlIncidents,
  loadIncidentCodes,
  loadMarketOperationsState,
  loadRiskCases,
  loadRiskInvestigation,
  CONTROL_INCIDENTS_PAGE_SIZE,
  type ControlIncidentRow,
  type ControlIncidentPage,
  type ControlIncidentFilters,
  type IncidentScope,
  type MarketOperationsState,
  type RiskCaseRow,
  type RiskInvestigationDetail,
  type RiskInvestigationSection,
} from '@wariba/database';
export {
  searchControlAccounts,
  loadControlAccountDetail,
  CONTROL_ACCOUNTS_PAGE_SIZE,
  type ControlAccountRow,
  type ControlAccountPage,
  type ControlAccountFilters,
  type ControlAccountDetail,
} from '@wariba/database';
export {
  searchControlUsers,
  loadControlUserDetail,
  CONTROL_USERS_PAGE_SIZE,
  type ControlUserRow,
  type ControlUserPage,
  type ControlUserDetail,
  type ControlUserAccount,
  type ControlUserLifecycleEvent,
} from '@wariba/database';
export {
  searchAuditEvents,
  loadAuditFilterOptions,
  AUDIT_PAGE_SIZE,
  type AuditEventFilters,
  type AuditEventPage,
  type AuditEventRecord,
} from '@wariba/database';
export {
  parseAuditQuery,
  auditPageHref,
  auditTotalPages,
  AUDIT_PAGE_SIZES,
  AUDIT_FILTER_LABELS,
  type AuditQuery,
  type AuditSearchParams,
} from './control-audit-view';
export {
  CONTROL_AREAS,
  canReadControlArea,
  controlArea,
  visibleControlAreas,
  type ControlArea,
  type ControlAreaId,
} from './control-navigation';
export {
  authorizeSensitiveStaffAction,
  type AuthorizeSensitiveStaffActionParams,
} from './control-security';
export {
  IDENTITY_REVIEW_STATUS_LABELS,
  IDENTITY_REVIEW_STATUSES,
  IDENTITY_REVIEW_ASSIGNMENTS,
  parseControlIdentityQuery,
  buildControlIdentityQueueView,
  buildControlIdentityDetailView,
  assignIdentityReview,
  updateIdentityReview,
  type ControlIdentitySearchParams,
  type ControlIdentityActionParams,
} from './control-identity';
export {
  PASS_REVIEW_STATUSES,
  PASS_REVIEW_ACTION_BLOCKED_BY_PRODUCT_DECISION,
  parseControlPassReviewQuery,
  buildControlPassReviewQueueView,
  buildControlPassReviewDetailView,
  recordPassReviewOperationalState,
  type ControlPassReviewSearchParams,
  type ControlPassReviewActionParams,
} from './control-pass-review';
export { buildControlOverviewView } from './control-overview';

export {
  createUserProfile,
  acceptSandboxDisclosure,
  type CreateUserProfileParams,
  type AcceptSandboxDisclosureParams,
  type AcceptedSandboxDisclosure,
} from './identity';

export {
  getLatestAccountForUser,
  type TradingAccountDTO,
  type GetLatestAccountForUserParams,
} from './activation';

export {
  listAccountsForUser,
  type AccountSummaryDTO,
  type ListAccountsForUserParams,
} from './accounts-list';

export {
  buildEvaluationToPerformanceHandoff,
  EvaluationPerformanceHandoffError,
  type EvaluationPerformanceHandoffStage,
  type EvaluationToPerformanceHandoffDTO,
  type HandoffRuleKey,
  type HandoffTimelineItem,
  type PayoutPathStep,
  type PayoutPathPhase,
  type PerformanceRuleItem,
  type RuleComparisonItem,
} from './evaluation-performance-handoff';
export {
  acknowledgePerformanceRules,
  loadPerformanceRulesAcknowledgement,
  PerformanceRulesAcknowledgementError,
  type PerformanceRulesAcknowledgement,
  type PerformanceRulesAcknowledgementErrorCode,
} from '@wariba/database';

export {
  loadAccountRiskEngineInputs,
  UnsupportedProgramError,
  type AccountRiskEngineInputs,
} from './risk-engine-inputs';

export {
  buildAccountPolicyView,
  loadSuccessorPayoutSplit,
  type AccountPolicyView,
  type AccountLimits,
  type AccountCapabilities,
  type AccountProvenance,
  type BuildAccountPolicyViewParams,
} from './account-policy-view';

export {
  loadFlexActivationObligation,
  flexActivationNotice,
  type FlexActivationObligationView,
  type FlexActivationNotice,
  type FlexActivationStatus,
} from './flex-activation';

export {
  projectAccountRules,
  formatRate,
  formatMoney,
  ACCOUNT_RULE_LABEL,
  PRODUCT_FAMILY_LABEL,
  ACCOUNT_PHASE_LABEL,
  type AccountRuleItem,
  type AccountRuleKey,
  type ProjectAccountRulesParams,
} from './account-policy-rules';

export {
  deriveAccountNextAction,
  type AccountNextAction,
  type AccountNextActionKind,
  type AccountNextActionFacts,
} from './account-next-action';

export {
  reasonCodeCopy,
  resolveReasonCodeCopy,
  ALL_REASON_CODE_COPY,
  UNKNOWN_REASON_COPY,
  type ReasonCodeCopy,
  type ReasonSeverity,
} from './reason-code-copy';

export {
  buildAccountRiskView,
  projectAccountRiskView,
  RISK_RULE_LABELS,
  type AccountRiskView,
  type AccountRiskStatus,
  type AccountRiskViolation,
  type BuildAccountRiskViewParams,
} from './risk-view';

export {
  buildAccountMissionView,
  projectAccountMissionView,
  type AccountMissionView,
  type AccountMissionUnavailable,
  type AccountMissionState,
  type AccountMissionCondition,
  type AccountMissionNextAction,
  type AccountConsistencyView,
  type BuildAccountMissionViewParams,
} from './mission-view';

export {
  buildAccountPerformanceMissionView,
  type AccountPerformanceMissionView,
  type AccountPerformanceMissionUnavailable,
  type AccountPerformanceMissionState,
  type AccountPerformanceMissionCondition,
  type AccountPerformancePayoutHistoryItem,
  type BuildAccountPerformanceMissionViewParams,
} from './performance-mission-view';

export { ACCOUNT_STATUS_LABEL, accountStatusLabel, traderLabel } from './account-status-labels';

/* Product OS Phase 2 — the account's life, payouts, identity, and the record. */
export {
  deriveAccountLifecycle,
  deriveAccountLifecycleState,
  journeyStepIndex,
  EVALUATION_JOURNEY,
  type AccountLifecycleState,
  type AccountLifecycleView,
  type LifecycleTone,
  type DeriveAccountLifecycleParams,
} from './account-lifecycle';

export {
  buildOfferCatalog,
  type OfferCatalog,
  type OfferConfiguration,
  type OfferRule,
} from './offer-configuration';

export {
  buildAccountsOverview,
  accountFilterOf,
  type AccountOverviewItem,
  type AccountOverviewDetail,
  type AccountFilter,
} from './accounts-overview';

export {
  deriveAccountHealth,
  type AccountHealth,
  type AccountHealthView,
  type DeriveAccountHealthParams,
} from './account-health';

export {
  deriveKycState,
  kycView,
  reachableKycStates,
  KYC_PROVIDER_INTEGRATED,
  type KycState,
  type KycView,
} from './kyc-state';

export {
  buildPayoutLifecycle,
  PAYOUT_BLOCKING_REASON,
  type PayoutLifecycleState,
  type PayoutLifecycleView,
  type PayoutCycleProgress,
  type BuildPayoutLifecycleParams,
} from './payout-lifecycle';

export {
  buildPerformanceAnalytics,
  type PerformanceAnalytics,
  type PerformanceKpis,
  type DailyResult,
  type SymbolResult,
  type DurationBucket,
  type BuildPerformanceAnalyticsParams,
} from './performance-analytics';

export {
  buildJournalView,
  summarize as summarizeJournal,
  type JournalSummaryView,
  type JournalView,
  type JournalEntry,
  type JournalFilters,
  type JournalOutcome,
  type JournalDirection,
  type BuildJournalViewParams,
} from './journal-view';

export {
  buildBillingView,
  SAVED_PAYMENT_METHODS_AVAILABLE,
  summarizeOrders,
  type BillingSummary,
  type BillingView,
  type BillingOrder,
  type OrderDisplayStatus,
} from './billing-view';

export {
  buildAccountHubView,
  isBalanceHistoryMeaningful,
  type AccountHubView,
  type AccountBadgeVariant,
  type BalancePoint,
  type DailyPnlPoint,
  type TradingDayItem,
  type BuildAccountHubViewParams,
} from './hub-view';

export { nextResetAt, tradingDayOf, millisecondsUntilReset } from './trading-day';

export {
  buildCommandCenterView,
  buildAccountTelemetry,
  type CommandCenterView,
  type BuildCommandCenterViewParams,
  type AccountTelemetry,
} from './command-center';

export {
  buildRecentActivityView,
  type ActivityItem,
  type ActivityItemKind,
  type ActivitySeverity,
  type BuildRecentActivityViewParams,
} from './activity-view';

export {
  buildOpenPositionsView,
  type OpenPositionItem,
  type BuildOpenPositionsViewParams,
} from './positions-view';

export {
  buildControlPayoutQueueView,
  buildControlPayoutReviewView,
  type ControlPayoutReviewPageView,
  type ControlPayoutQueueItemView,
  type ControlPayoutStatusVariant,
} from './control-payouts-view';

export {
  buildControlReserveView,
  type ControlReserveView,
  type ControlReserveZone,
} from './control-treasury-view';
export {
  recordControlTreasuryReserveEntry,
  type RecordControlTreasuryReserveEntryParams,
} from './control-treasury-actions';
export {
  placeAccountIntegrityHold,
  clearAccountIntegrityHold,
  type ControlIntegrityHoldParams,
} from './control-integrity-actions';

export {
  replaceActuarialScenarioAssumptions,
  runStoredActuarialScenario,
  loadActuarialControlState,
  type ReplaceActuarialScenarioAssumptionsParams,
  type RunStoredActuarialScenarioParams,
} from './actuarial-scenarios';

export {
  buildActuarialConsoleView,
  recordActuarialVariance,
  resolveActuarialModelValidation,
  ACTUAL_POPULATION_SCOPE,
  type ActuarialConsoleView,
  type ActuarialModelValidation,
  type RecordActuarialVarianceParams,
} from './control-actuarial-view';

export {
  buildControlReviewCasesView,
  type ControlReviewCaseItemView,
} from './control-review-cases-view';

export {
  approvePayoutRequest,
  rejectPayoutRequest,
  submitPayoutRequest,
  settlePayoutRequest,
  reversePayoutRequest,
  setPerformanceComplianceFlags,
  type ApprovePayoutParams,
  type RejectPayoutParams,
  type SubmitPayoutParams,
  type SettlePayoutParams,
  type ReversePayoutRequestParams,
  type SetComplianceFlagsParams,
} from './control-payouts-actions';

// Help Center — policy-bound facts (content master §11.3).
export {
  buildHelpPolicyFacts,
  resolveHelpFacts,
  HELP_FACT_UNPUBLISHED,
  type HelpFact,
  type HelpFactKey,
  type HelpPolicyFacts,
} from './help-policy-facts';

// Phase 3.2 — Support + Contestations (UX-010 LOCKED).
export {
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_CATEGORY_SHORT,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_NEXT_ACTION,
  SUPPORT_STATUS_TONE,
  CONTESTATION_STATUS_LABELS,
  CONTESTATION_STATUS_TONE,
  CONTESTATION_STATUS_NEXT_ACTION,
  CONTESTATION_REASON_CATEGORIES,
  CONTESTATION_REASON_LABELS,
  CONTESTATION_TARGET_LABELS,
  CONTESTATION_DECISION_LABELS,
  CONSEQUENCE_LABELS,
  formatSupportTimestamp,
  formatAge,
  buildSupportHomeView,
  buildSupportTicketView,
  buildContestationView,
  projectContestationView,
  projectContestationEvidence,
  type SupportTone,
  type SupportTicketSummary,
  type SupportHomeView,
  type ContestationSummary,
  type SupportThreadEntry,
  type SupportTicketView,
  type EvidenceRow,
  type ContestationEvidenceView,
  type ContestationView,
} from './support-view';
export {
  submitSupportTicket,
  submitSupportReply,
  submitContestation,
  listContestableDecisionOptions,
  type SubmitSupportTicketParams,
  type SubmitSupportReplyParams,
  type SubmitContestationParams,
  type ContestableDecisionOption,
} from './support-actions';
export {
  parseControlSupportQuery,
  controlSupportPageHref,
  buildControlSupportQueueView,
  buildControlSupportTicketView,
  parseControlContestationQuery,
  buildControlContestationQueueView,
  buildControlContestationView,
  CONTROL_SUPPORT_STATUSES,
  CONTROL_SUPPORT_CATEGORIES,
  CONTROL_SUPPORT_ASSIGNMENTS,
  CONTROL_SUPPORT_AGES,
  CONTROL_SUPPORT_FILTER_LABELS,
  CONTROL_CONTESTATION_STATUSES,
  CONTROL_CONTESTATION_TARGETS,
  CONTROL_CONTESTATION_REASONS,
  CONTROL_CONTESTATION_FILTER_LABELS,
  type ControlSupportSearchParams,
  type ControlSupportQuery,
  type ControlSupportQueueItem,
  type ControlSupportQueueView,
  type ControlSupportTicketView,
  type ControlContestationQuery,
  type ControlContestationQueueItem,
  type ControlContestationQueueView,
  type ControlContestationView,
} from './control-support-view';
export {
  assignSupportTicket,
  replyToSupportTicket,
  setSupportTicketResolution,
  setContestationReviewState,
  assignContestation,
  recordContestationDecision,
  executeContestationReplacement,
  type ControlSupportActionParams,
  type ControlContestationActionParams,
} from './control-support-actions';
export type {
  SupportTicketCategory,
  SupportTicketStatus,
  SupportTicketPriority,
  ContestationStatus,
  ContestationTargetType,
  ContestationReasonCategory,
  ContestationDecision,
  IdentityReviewStatus,
  PassReviewOperatorStatus,
} from '@wariba/database';
export {
  SupportOwnershipError,
  SupportTicketStateError,
  DuplicateContestationError,
  ContestationTargetError,
  ContestationStateError,
  StaffActionRateLimitExceededError,
  OperatorCaseStaleError,
  IdentityReviewStateError,
  requestIdentityReview,
  loadLatestIdentityReviewForTrader,
} from '@wariba/database';

export {
  listActiveProducts,
  getCheckoutContext,
  createPurchaseOrder,
  getOrderForUser,
  recordPaymentAttempt,
  processPaymentWebhookEvent,
  SANDBOX_PRODUCT_FEATURE_FLAGS,
  isSandboxProductFeatureEnabled,
  type ProductDTO,
  type CheckoutContextDTO,
  type PurchaseOrderDTO,
  type CreatePurchaseOrderParams,
  type CreatePurchaseOrderResult,
  type RecordPaymentAttemptParams,
  type ProcessPaymentWebhookEventParams,
  type ProcessPaymentWebhookEventResult,
} from './commerce';

export {
  assertIdentityEvidenceSufficient,
  identityEvidenceRequirement,
  IdentityEvidenceError,
  type IdentityDecisionStatus,
  type IdentityEvidenceRequirement,
} from './identity-evidence';
