/**
 * Phase 3.4.3 §64/§65 — the risk/lifecycle metric and cohort-dimension
 * contract.
 *
 * Two rules shape this file. First, the metric names are fixed here rather
 * than spelled inline at each emit site, so a dashboard cannot silently
 * diverge from what the code emits. Second, dimensions are an allow-list:
 * an account id would make every one of these series unbounded, so
 * `buildRiskLifecycleDimensions` accepts only the controlled-cardinality
 * fields the actuarial cohorts actually need and drops anything else.
 *
 * This is a contract plus a recorder, not a metrics backend. `createRecorder`
 * takes the sink; wiring it to a real exporter belongs to the deployment
 * that has one.
 */

export const RISK_LIFECYCLE_METRICS = {
  DAILY_SOFT_LOCKS_TOTAL: 'wariba_daily_soft_locks_total',
  HARD_BREACHES_TOTAL: 'wariba_hard_breaches_total',
  PASS_PENDING_TOTAL: 'wariba_pass_pending_total',
  PASSES_TOTAL: 'wariba_passes_total',
  PERFORMANCE_DAYS_TOTAL: 'wariba_performance_days_total',
  FINANCIALLY_ELIGIBLE_TOTAL: 'wariba_financially_eligible_total',
  PAYOUT_REQUESTS_TOTAL: 'wariba_payout_requests_total',
  PAYOUT_PAID_TOTAL: 'wariba_payout_paid_total',
  SHORT_PROFIT_EXCLUDED_AMOUNT: 'wariba_short_profit_excluded_amount',
  PRE_TRADE_DENIED_TOTAL: 'wariba_pre_trade_denied_total',
} as const;

export type RiskLifecycleMetric =
  (typeof RISK_LIFECYCLE_METRICS)[keyof typeof RISK_LIFECYCLE_METRICS];

/**
 * Every dimension is either a small closed set (product family, phase,
 * nominal size, reason code) or a policy version — bounded by how many
 * policies have ever been published. `country` is included because the
 * actuarial cohorts need it, and is optional precisely because it is often
 * unknown; an unknown country is omitted rather than bucketed as "other".
 */
export interface RiskLifecycleDimensions {
  productFamily: 'WARIBA_ONE' | 'WARIBA_FLEX' | 'WARIBA_INSTANT';
  accountPhase: 'evaluation' | 'performance';
  nominalBalance: string;
  policySemanticVersion: string;
  country?: string;
  payoutCycleNumber?: number;
  reasonCode?: string;
}

const ALLOWED_DIMENSION_KEYS: readonly (keyof RiskLifecycleDimensions)[] = [
  'productFamily',
  'accountPhase',
  'nominalBalance',
  'policySemanticVersion',
  'country',
  'payoutCycleNumber',
  'reasonCode',
];

/**
 * Filters an arbitrary context down to the allow-listed dimensions. Anything
 * not on the list — an account id, a user id, a correlation id — is dropped
 * rather than passed through, because a high-cardinality label on a counter
 * is not a logging mistake, it is an outage.
 */
export function buildRiskLifecycleDimensions(
  context: RiskLifecycleDimensions & Record<string, unknown>,
): Record<string, string> {
  const dimensions: Record<string, string> = {};
  for (const key of ALLOWED_DIMENSION_KEYS) {
    const value = context[key];
    if (value === undefined || value === null || value === '') continue;
    dimensions[key] = String(value);
  }
  return dimensions;
}

export interface MetricSample {
  metric: RiskLifecycleMetric;
  value: number;
  dimensions: Record<string, string>;
}

export interface RiskLifecycleRecorder {
  /** Adds to a counter. `value` defaults to 1; a monetary counter passes the amount. */
  increment(
    metric: RiskLifecycleMetric,
    context: RiskLifecycleDimensions & Record<string, unknown>,
    value?: number,
  ): void;
}

export function createRiskLifecycleRecorder(
  emit: (sample: MetricSample) => void,
): RiskLifecycleRecorder {
  return {
    increment(metric, context, value = 1) {
      if (!Number.isFinite(value)) {
        throw new Error(`Refusing to record a non-finite value for ${metric}.`);
      }
      emit({ metric, value, dimensions: buildRiskLifecycleDimensions(context) });
    },
  };
}
