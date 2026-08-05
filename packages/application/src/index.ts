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
