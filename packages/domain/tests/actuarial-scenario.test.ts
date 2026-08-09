import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import {
  parseScenarioAssumptions,
  runActuarialScenario,
  SCENARIO_ASSUMPTIONS,
  type ProductInputs,
} from '../src/actuarial-scenario';

// 10K only, candidate cap/split shape from the currently locked
// WARIBA_PERFORMANCE 1.1.0 policy (PERF-027/028/030).
const PRODUCT_10K: ProductInputs = {
  productCode: '10K',
  collectedPrice: '39900',
  capsByRank: ['500', '750', '1000', '1500', '2000'],
  splitByRank: ['0.85', '0.85', '0.85', '0.85', '0.90'],
};

describe('runActuarialScenario — §22-24', () => {
  it('validates persisted assumption payloads before a scenario can use them', () => {
    expect(parseScenarioAssumptions(SCENARIO_ASSUMPTIONS.base)).toEqual(SCENARIO_ASSUMPTIONS.base);
    expect(() =>
      parseScenarioAssumptions({
        ...SCENARIO_ASSUMPTIONS.base,
        progressionRates: ['0.40', '0.30', '0.25'],
      }),
    ).toThrow('exactly four rates');
    expect(() =>
      parseScenarioAssumptions({
        ...SCENARIO_ASSUMPTIONS.base,
        refundRate: '1.01',
      }),
    ).toThrow('outside [0, 1]');
  });

  it('produces zero of everything for zero purchases, never NaN or negative', () => {
    const result = runActuarialScenario({
      scenario: 'base',
      purchasesByProduct: { '10K': 0 },
      products: [PRODUCT_10K],
      pspFeeRate: '0.03',
    });
    expect(result.totalPurchases).toBe(0);
    expect(result.grossRevenue).toBe('0.00');
    expect(result.expectedPayoutCost).toBe('0.00');
    expect(result.payoutCostPerSale).toBe('0.00');
    expect(result.payoutRatio).toBe('0.0000');
  });

  it('recipient counts never increase from one payout rank to the next', () => {
    for (const scenario of ['conservative', 'base', 'aggressive', 'stress'] as const) {
      const result = runActuarialScenario({
        scenario,
        purchasesByProduct: { '10K': 10000 },
        products: [PRODUCT_10K],
        pspFeeRate: '0.03',
      });
      const [p1, p2, p3, p4, p5] = result.totalPayoutRecipientsByRank;
      expect(p2).toBeLessThanOrEqual(p1);
      expect(p3).toBeLessThanOrEqual(p2);
      expect(p4).toBeLessThanOrEqual(p3);
      expect(p5).toBeLessThanOrEqual(p4);
    }
  });

  it('expected payout cost never exceeds the maximum contractual exposure', () => {
    for (const scenario of ['conservative', 'base', 'aggressive', 'stress'] as const) {
      const result = runActuarialScenario({
        scenario,
        purchasesByProduct: { '10K': 5000 },
        products: [PRODUCT_10K],
        pspFeeRate: '0.03',
      });
      expect(
        new Decimal(result.expectedPayoutCost).lessThanOrEqualTo(
          result.maximumContractualPayoutExposure,
        ),
      ).toBe(true);
    }
  });

  it('STRESS always costs at least as much as CONSERVATIVE for the same cohort — every stress assumption is monotonically worse', () => {
    const conservative = runActuarialScenario({
      scenario: 'conservative',
      purchasesByProduct: { '10K': 10000 },
      products: [PRODUCT_10K],
      pspFeeRate: '0.03',
    });
    const stress = runActuarialScenario({
      scenario: 'stress',
      purchasesByProduct: { '10K': 10000 },
      products: [PRODUCT_10K],
      pspFeeRate: '0.03',
    });
    expect(
      new Decimal(stress.expectedPayoutCost).greaterThanOrEqualTo(conservative.expectedPayoutCost),
    ).toBe(true);
    expect(new Decimal(stress.payoutRatio).greaterThanOrEqualTo(conservative.payoutRatio)).toBe(
      true,
    );
  });

  it('runs cleanly for cohort sizes 100, 500, 1000, and 10000 with no negative or NaN outputs', () => {
    for (const cohortSize of [100, 500, 1000, 10000]) {
      const result = runActuarialScenario({
        scenario: 'base',
        purchasesByProduct: { '10K': cohortSize },
        products: [PRODUCT_10K],
        pspFeeRate: '0.03',
      });
      expect(Number.isNaN(Number(result.expectedPayoutCost))).toBe(false);
      expect(new Decimal(result.expectedPayoutCost).greaterThanOrEqualTo(0)).toBe(true);
      expect(new Decimal(result.netCollectedRevenue).greaterThanOrEqualTo(0)).toBe(true);
    }
  });

  it('a disabled product (zero purchases) contributes zero sales and zero payout cost, never breaking the total', () => {
    const result = runActuarialScenario({
      scenario: 'base',
      purchasesByProduct: { '10K': 1000, '50K': 0 },
      products: [PRODUCT_10K, { ...PRODUCT_10K, productCode: '50K', collectedPrice: '144900' }],
      pspFeeRate: '0.03',
    });
    const fiftyK = result.perProduct.find((p) => p.productCode === '50K');
    expect(fiftyK?.purchases).toBe(0);
    expect(fiftyK?.expectedPayoutCost).toBe('0.00');
  });

  it('concentration sums correctly — the sum of per-product purchases equals the total', () => {
    const result = runActuarialScenario({
      scenario: 'base',
      purchasesByProduct: { '10K': 600, '25K': 300, '50K': 100 },
      products: [
        PRODUCT_10K,
        { ...PRODUCT_10K, productCode: '25K', collectedPrice: '84900' },
        { ...PRODUCT_10K, productCode: '50K', collectedPrice: '144900' },
      ],
      pspFeeRate: '0.03',
    });
    expect(result.totalPurchases).toBe(1000);
    expect(result.perProduct.reduce((sum, p) => sum + p.purchases, 0)).toBe(result.totalPurchases);
  });

  it('accepts a fully custom assumption set instead of a named preset', () => {
    const result = runActuarialScenario({
      scenario: {
        ...SCENARIO_ASSUMPTIONS.base,
        evaluationPassRate: '0.50', // deliberately unrealistic, to prove custom overrides apply
      },
      purchasesByProduct: { '10K': 1000 },
      products: [PRODUCT_10K],
      pspFeeRate: '0.03',
    });
    expect(result.scenario).toBe('custom');
    expect(result.totalSuccessfulEvaluations).toBe(500);
  });
});
