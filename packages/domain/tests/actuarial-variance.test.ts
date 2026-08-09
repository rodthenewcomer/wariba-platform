import { describe, expect, it } from 'vitest';
import {
  compareModelToActual,
  resolveVarianceCoverage,
  runActuarialScenario,
  type ActuarialActuals,
  type ActuarialProductInputs,
  type ActuarialScenarioResult,
} from '../src/index';

const PRODUCT_10K: ActuarialProductInputs = {
  productCode: '10K',
  collectedPrice: '39900',
  capsByRank: ['500', '750', '1000', '1500', '2000'],
  splitByRank: ['0.85', '0.85', '0.85', '0.85', '0.90'],
};

const MODEL: ActuarialScenarioResult = runActuarialScenario({
  scenario: 'base',
  purchasesByProduct: { '10K': 1000 },
  products: [PRODUCT_10K],
  pspFeeRate: '0.03',
});

const EMPTY_ACTUALS: ActuarialActuals = {
  totalPurchases: 0,
  totalSuccessfulEvaluations: 0,
  totalPerformanceActivations: 0,
  totalCompletedBuffers: 0,
  totalPayoutRecipientsByRank: [0, 0, 0, 0, 0],
  realizedPayoutCost: '0.00',
};

describe('actuarial MODEL vs ACTUAL variance', () => {
  it('labels an empty platform as insufficient data rather than as agreement', () => {
    const report = compareModelToActual({
      model: MODEL,
      actuals: EMPTY_ACTUALS,
      asOf: new Date('2026-08-10T00:00:00.000Z'),
    });
    expect(report.coverage).toBe('insufficient_data');
    expect(report.actualSampleSize).toBe(0);
    // The zeros are reported honestly, and the variance is the full model
    // value — never silently zeroed to make the model look correct.
    const purchases = report.metrics.find((metric) => metric.metric === 'purchases');
    expect(purchases?.actualValue).toBe('0.00');
    expect(purchases?.variance).toBe('-1000.00');
    expect(purchases?.relativeVariance).toBe('-1.0000');
  });

  it('grades coverage by real sample size', () => {
    expect(resolveVarianceCoverage(0)).toBe('insufficient_data');
    expect(resolveVarianceCoverage(1)).toBe('partial');
    expect(resolveVarianceCoverage(29)).toBe('partial');
    expect(resolveVarianceCoverage(30)).toBe('comparable');
  });

  it('computes variance as actual minus model, signed', () => {
    const report = compareModelToActual({
      model: MODEL,
      actuals: { ...EMPTY_ACTUALS, totalPurchases: 1200 },
      asOf: new Date('2026-08-10T00:00:00.000Z'),
    });
    const purchases = report.metrics.find((metric) => metric.metric === 'purchases');
    expect(purchases?.modelValue).toBe('1000.00');
    expect(purchases?.actualValue).toBe('1200.00');
    expect(purchases?.variance).toBe('200.00');
    expect(purchases?.relativeVariance).toBe('0.2000');
    expect(report.coverage).toBe('comparable');
  });

  it('reports a null relative variance instead of dividing by a zero model', () => {
    const zeroModel = runActuarialScenario({
      scenario: 'base',
      purchasesByProduct: { '10K': 0 },
      products: [PRODUCT_10K],
      pspFeeRate: '0.03',
    });
    const report = compareModelToActual({
      model: zeroModel,
      actuals: { ...EMPTY_ACTUALS, totalPurchases: 5 },
      asOf: new Date('2026-08-10T00:00:00.000Z'),
    });
    for (const metric of report.metrics) {
      expect(metric.relativeVariance).toBeNull();
      expect(Number.isNaN(Number(metric.variance))).toBe(false);
    }
  });

  it('is deterministic — the same model and actuals always produce the same report', () => {
    const asOf = new Date('2026-08-10T00:00:00.000Z');
    const actuals = { ...EMPTY_ACTUALS, totalPurchases: 40, realizedPayoutCost: '1234.56' };
    expect(compareModelToActual({ model: MODEL, actuals, asOf })).toEqual(
      compareModelToActual({ model: MODEL, actuals, asOf }),
    );
  });

  it('compares every payout rank, so a model that front-loads payouts is visible', () => {
    const report = compareModelToActual({
      model: MODEL,
      actuals: {
        ...EMPTY_ACTUALS,
        totalPurchases: 1000,
        totalPayoutRecipientsByRank: [10, 0, 0, 0, 0],
      },
      asOf: new Date('2026-08-10T00:00:00.000Z'),
    });
    const rankMetrics = report.metrics.filter((metric) =>
      metric.metric.startsWith('payout_recipients_rank_'),
    );
    expect(rankMetrics).toHaveLength(5);
    expect(rankMetrics[0]?.actualValue).toBe('10.00');
    expect(rankMetrics[4]?.actualValue).toBe('0.00');
  });
});
