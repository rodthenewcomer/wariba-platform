/**
 * @wariba/domain — Business domain modules: identity, commerce, trading, policy-risk, performance-payout, support, operations.
 *
 * Prompt 03 (Identity, Commerce & Activation) adds Money, the purchase-order
 * and evaluation-account state machines, and DomainError. Prompt 04
 * (Trading Core) adds the trade-order and position state machines.
 * Policy-risk/performance-payout domain logic lands in later prompts.
 */

export const PACKAGE_NAME = '@wariba/domain';

export { Money } from './money';
export { DomainError } from './errors';
export {
  assertPurchaseOrderTransition,
  assertEvaluationAccountTransition,
  assertTradeOrderTransition,
  assertPositionTransition,
  InvalidTransitionError,
  PURCHASE_ORDER_TERMINAL_STATUSES,
  EVALUATION_ACCOUNT_TERMINAL_STATUSES,
  TRADE_ORDER_TERMINAL_STATUSES,
  POSITION_TERMINAL_STATUSES,
  type PurchaseOrderStatus,
  type EvaluationAccountStatus,
  type TradeOrderStatus,
  type PositionStatus,
} from './state-machines';
export {
  quotedPrice,
  applySlippage,
  computeFillPrice,
  computeRealizedPnl,
  computeCommission,
  openingAveragePrice,
  isQuantityWithinBounds,
  isAggregateExposureAllowed,
  isStale,
  isPartialCloseQuantityValid,
  subtractQuantity,
  addRealizedPnl,
  estimateRequiredMargin,
  computeConcentration,
  type OrderSide,
  type FillAction,
  type ExposureBucketUsage,
  type ExposureBucketConcentration,
} from './trading-math';
export {
  computeDailyReference,
  computeDailyLossFloor,
  computeDailyLossUsed,
  isDailyLossSoftLockTriggered,
  computeDailyLossRemaining,
  computeDailyLossUsedRatio,
  computeInitialMaximumLossFloor,
  computeNextMaximumLossFloor,
  isMaximumLossBreached,
  computeBestDayRatio,
  isBestDayCompliant,
  computeProfitTargetRequired,
  isProfitTargetReached,
} from './risk-math';
export {
  computeProfitEligibility,
  MINIMUM_PROFIT_ELIGIBLE_DURATION_MS,
  evaluateShortDurationMonitoring,
  SHORT_DURATION_WARNING_THRESHOLD,
  SHORT_DURATION_ENTRY_LOCK_THRESHOLD,
  type ProfitEligibilityInput,
  type ProfitEligibilityResult,
  type ShortDurationMonitoringStatus,
  type ShortDurationMonitoringResult,
} from './profit-eligibility';
