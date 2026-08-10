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
  getStaffRole,
  staffRoleSatisfies,
  staffCan,
  type StaffRole,
  type ControlPermission,
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
  loadAccountRiskEngineInputs,
  UnsupportedProgramError,
  type AccountRiskEngineInputs,
} from './risk-engine-inputs';

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

export {
  buildAccountHubView,
  type AccountHubView,
  type AccountBadgeVariant,
  type BalancePoint,
  type TradingDayItem,
  type BuildAccountHubViewParams,
} from './hub-view';

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
} from './actuarial-scenarios';

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
