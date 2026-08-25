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
  computePayoutBufferFloor,
  computeEligibleExcess,
  computeBufferBuildProgress,
  isPayoutBufferReached,
  computePerformanceDayThreshold,
  isPerformanceDayQualified,
  resolveTraderSplitRate,
  computeMaxGrossBaseFromCap,
  computeRequestedGrossBase,
  computeApprovedGrossBase,
  computeTraderNetCash,
  computeWaribaShare,
  type BufferBuildProgress,
} from './performance-math';
export {
  computeReserveCoverageRatio,
  resolveReserveZone,
  isSizeCommerciallyAvailableInZone,
  type ReserveZone,
} from './treasury-math';
export {
  runActuarialScenario,
  parseScenarioAssumptions,
  SCENARIO_NAMES,
  SCENARIO_ASSUMPTIONS,
  type ScenarioName,
  type SeedScenarioName,
  type ScenarioAssumptions,
  type ProductCode as ActuarialProductCode,
  type ProductInputs as ActuarialProductInputs,
  type CohortInputs as ActuarialCohortInputs,
  type ScenarioResult as ActuarialScenarioResult,
  type ProductScenarioResult as ActuarialProductScenarioResult,
} from './actuarial-scenario';
export {
  compareModelToActual,
  resolveVarianceCoverage,
  MINIMUM_COMPARABLE_SAMPLE,
  type ActuarialActuals,
  type ActuarialModelSummary,
  type ActuarialVarianceMetric,
  type ActuarialVarianceReport,
  type VarianceCoverage,
} from './actuarial-variance';
export {
  deriveHubDisplayState,
  isInAttentionZone,
  isHubStateReadOnly,
  type HubDisplayState,
  type HubAttentionSignal,
  type DeriveHubDisplayStateParams,
} from './hub-state';
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
export {
  roundPriceToTick,
  computeLevelPnlPreview,
  isProtectionLevelValid,
  protectionPlacementFor,
  computeRiskRewardRatio,
  computePartialClosePresetQuantity,
  roundCustomPartialCloseQuantity,
  computeNetPnlAfterFees,
  type LevelPnlPreview,
  type ProtectionLevelKind,
  type ProtectionPlacement,
} from './chart-overlay';
export {
  isDecimalQuantityInput,
  quantityDisplayScale,
  stepQuantity,
  deriveQuantityPresets,
  DEFAULT_QUANTITY_PRESET_MULTIPLIERS,
  type QuantityBounds,
} from './execution-quantity';
export {
  pendingOrderSide,
  isPendingOrderCreationPriceValid,
  isPendingOrderTriggered,
  clampPendingOrderFillPrice,
  pendingOrderDistancePoints,
  type PendingOrderType,
} from './pending-orders';
export {
  resolveAlertPrice,
  isPriceAboveThreshold,
  shouldTriggerAlert,
  type AlertDirection,
  type AlertSource,
} from './price-alerts';
