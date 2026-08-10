import Decimal from 'decimal.js';
import type { ScenarioResult } from './actuarial-scenario';

/**
 * Appendix 08-A — the ACTUAL and VARIANCE halves of the actuarial model.
 *
 * MODEL (ScenarioResult) is simulation: assumptions in, projected cohort
 * out. ACTUAL is measured from real persisted operations — nothing here is
 * ever synthesised, and when the platform has not produced enough real data
 * the comparison says so through `coverage` rather than reporting a
 * flattering zero variance.
 *
 * The two are deliberately separate types. MODEL is never written back from
 * ACTUAL and ACTUAL is never adjusted toward MODEL; a variance run is a
 * third, immutable artifact that references both.
 */
export interface ActuarialActuals {
  /** Real paid purchase orders observed in the measurement window. */
  totalPurchases: number;
  totalSuccessfulEvaluations: number;
  totalPerformanceActivations: number;
  totalCompletedBuffers: number;
  totalPayoutRecipientsByRank: readonly [number, number, number, number, number];
  /** Sum of settled payout gross base, net of reversals. */
  realizedPayoutCost: string;
}

export type VarianceCoverage = 'insufficient_data' | 'partial' | 'comparable';

export interface ActuarialVarianceMetric {
  /** Stable metric identity, so a variance row survives display changes. */
  metric: string;
  modelValue: string;
  actualValue: string;
  /** actual − model. Positive means reality ran above the model. */
  variance: string;
  /** variance / model, or null when the model projected zero. */
  relativeVariance: string | null;
}

export interface ActuarialVarianceReport {
  asOf: string;
  modelCohortSize: number;
  actualSampleSize: number;
  coverage: VarianceCoverage;
  metrics: readonly ActuarialVarianceMetric[];
}

/**
 * A comparison needs enough real observations to mean anything. Below this
 * the report is still produced — hiding it would be worse — but it is
 * labelled so nobody reads a 0-sample variance as model validation.
 */
export const MINIMUM_COMPARABLE_SAMPLE = 30;

export function resolveVarianceCoverage(actualSampleSize: number): VarianceCoverage {
  if (actualSampleSize <= 0) return 'insufficient_data';
  if (actualSampleSize < MINIMUM_COMPARABLE_SAMPLE) return 'partial';
  return 'comparable';
}

function metric(name: string, modelValue: Decimal, actualValue: Decimal): ActuarialVarianceMetric {
  const variance = actualValue.minus(modelValue);
  return {
    metric: name,
    modelValue: modelValue.toFixed(2),
    actualValue: actualValue.toFixed(2),
    variance: variance.toFixed(2),
    relativeVariance: modelValue.isZero() ? null : variance.dividedBy(modelValue).toFixed(4),
  };
}

/**
 * Deterministic: same model and same actuals always produce the same
 * report, so a stored variance run can be recomputed and checked.
 */
export function compareModelToActual(params: {
  model: ScenarioResult;
  actuals: ActuarialActuals;
  asOf: Date;
}): ActuarialVarianceReport {
  const { model, actuals } = params;
  const metrics: ActuarialVarianceMetric[] = [
    metric('purchases', new Decimal(model.totalPurchases), new Decimal(actuals.totalPurchases)),
    metric(
      'successful_evaluations',
      new Decimal(model.totalSuccessfulEvaluations),
      new Decimal(actuals.totalSuccessfulEvaluations),
    ),
    metric(
      'performance_activations',
      new Decimal(model.totalPerformanceActivations),
      new Decimal(actuals.totalPerformanceActivations),
    ),
    metric(
      'completed_buffers',
      new Decimal(model.totalCompletedBuffers),
      new Decimal(actuals.totalCompletedBuffers),
    ),
    ...model.totalPayoutRecipientsByRank.map((modelRecipients, index) =>
      metric(
        `payout_recipients_rank_${index + 1}`,
        new Decimal(modelRecipients),
        new Decimal(actuals.totalPayoutRecipientsByRank[index] ?? 0),
      ),
    ),
    metric(
      'payout_cost',
      new Decimal(model.expectedPayoutCost),
      new Decimal(actuals.realizedPayoutCost),
    ),
  ];

  return {
    asOf: params.asOf.toISOString(),
    modelCohortSize: model.totalPurchases,
    actualSampleSize: actuals.totalPurchases,
    coverage: resolveVarianceCoverage(actuals.totalPurchases),
    metrics,
  };
}
