import Decimal from 'decimal.js';

/**
 * Actuarial scenario engine — Prompt 08 Phase E. Pure cohort simulation
 * over stored assumptions, never live account data (packages/database's
 * own job is comparing this model's output against measured actuals, not
 * this function). No DB/IO — a scenario run is a deterministic function of
 * its inputs, testable in isolation and safe to re-run for "what if"
 * exploration in Control (Phase G) without touching anything real.
 *
 * Assumption defaults are copied verbatim from the operator's own revised
 * Prompt 08 text §23 — editable starting points, never predictions (§24:
 * "Do not overwrite actual metrics with model assumptions").
 */

export type ScenarioName = 'conservative' | 'base' | 'aggressive' | 'stress';

export interface ScenarioAssumptions {
  /** Evaluation pass rate, e.g. "0.05" for 5%. */
  evaluationPassRate: string;
  performanceActivationRate: string;
  bufferCompletionRate: string;
  payout1EligibilityRate: string;
  /** Progression rate from payout N to payout N+1, for N = 1..4. */
  progressionRates: readonly [string, string, string, string];
  /** Average payout as a fraction of the applicable cap, e.g. "0.35". */
  averagePayoutOfCapRate: string;
  refundRate: string;
  chargebackRate: string;
}

export const SCENARIO_ASSUMPTIONS: Record<ScenarioName, ScenarioAssumptions> = {
  conservative: {
    evaluationPassRate: '0.05',
    performanceActivationRate: '0.98',
    bufferCompletionRate: '0.15',
    payout1EligibilityRate: '0.60',
    progressionRates: ['0.35', '0.25', '0.20', '0.15'],
    averagePayoutOfCapRate: '0.35',
    refundRate: '0.03',
    chargebackRate: '0.01',
  },
  base: {
    evaluationPassRate: '0.08',
    performanceActivationRate: '0.98',
    bufferCompletionRate: '0.20',
    payout1EligibilityRate: '0.65',
    progressionRates: ['0.40', '0.30', '0.25', '0.20'],
    averagePayoutOfCapRate: '0.45',
    refundRate: '0.04',
    chargebackRate: '0.015',
  },
  aggressive: {
    evaluationPassRate: '0.12',
    performanceActivationRate: '0.99',
    bufferCompletionRate: '0.30',
    payout1EligibilityRate: '0.70',
    progressionRates: ['0.50', '0.40', '0.35', '0.30'],
    averagePayoutOfCapRate: '0.60',
    refundRate: '0.05',
    chargebackRate: '0.02',
  },
  stress: {
    evaluationPassRate: '0.18',
    performanceActivationRate: '1.00',
    bufferCompletionRate: '0.40',
    payout1EligibilityRate: '0.80',
    progressionRates: ['0.60', '0.50', '0.45', '0.40'],
    averagePayoutOfCapRate: '0.80',
    refundRate: '0.07',
    chargebackRate: '0.03',
  },
};

export type ProductCode = '5K' | '10K' | '25K' | '50K' | '100K';

export interface ProductInputs {
  productCode: ProductCode;
  /** Candidate commercial price, e.g. XOF collected per purchase. */
  collectedPrice: string;
  /** Net-to-trader payout caps by rank [P1..P5], same shape as PerformancePolicyParameters. */
  capsByRank: readonly [string, string, string, string, string];
  /** Trader split by rank [P1..P5] — 85% for 1-4, 90% for 5 under the current locked splits. */
  splitByRank: readonly [string, string, string, string, string];
}

export interface CohortInputs {
  scenario: ScenarioName | ScenarioAssumptions;
  /** Purchases per product size in this cohort — the "account mix". */
  purchasesByProduct: Partial<Record<ProductCode, number>>;
  products: readonly ProductInputs[];
  pspFeeRate: string;
}

export interface ProductScenarioResult {
  productCode: ProductCode;
  purchases: number;
  grossRevenue: string;
  netRevenueAfterRefundsChargebacksAndFees: string;
  successfulEvaluations: number;
  performanceActivations: number;
  completedBuffers: number;
  /** Recipients at each payout rank [P1..P5] — always non-increasing, since each rank requires surviving the prior one. */
  payoutRecipientsByRank: readonly [number, number, number, number, number];
  expectedPayoutCost: string;
}

export interface ScenarioResult {
  scenario: ScenarioName | 'custom';
  totalPurchases: number;
  grossRevenue: string;
  netCollectedRevenue: string;
  totalSuccessfulEvaluations: number;
  totalPerformanceActivations: number;
  totalCompletedBuffers: number;
  totalPayoutRecipientsByRank: readonly [number, number, number, number, number];
  expectedPayoutCost: string;
  /** The contractual ceiling if every eligible trader hit their cap exactly, every rank — the actual worst case this cohort could ever cost, independent of averagePayoutOfCapRate. */
  maximumContractualPayoutExposure: string;
  payoutCostPerSale: string;
  /** expectedPayoutCost / netCollectedRevenue — the fraction of collected revenue paid back out. */
  payoutRatio: string;
  perProduct: readonly ProductScenarioResult[];
}

function resolveAssumptions(scenario: CohortInputs['scenario']): ScenarioAssumptions {
  return typeof scenario === 'string' ? SCENARIO_ASSUMPTIONS[scenario] : scenario;
}

/** Recipients surviving from rank N to rank N+1 — each stage is a fraction of the previous stage's survivors, never of the original cohort. */
function computeRecipientsByRank(
  payout1Recipients: number,
  progressionRates: readonly [string, string, string, string],
): readonly [number, number, number, number, number] {
  const p1 = payout1Recipients;
  const p2 = Math.round(p1 * Number(progressionRates[0]));
  const p3 = Math.round(p2 * Number(progressionRates[1]));
  const p4 = Math.round(p3 * Number(progressionRates[2]));
  const p5 = Math.round(p4 * Number(progressionRates[3]));
  return [p1, p2, p3, p4, p5];
}

/**
 * Runs one scenario over one cohort. Every count is rounded at each stage
 * (a fractional trader cannot exist) rather than carried as a fraction
 * throughout — this makes cross-checking a specific run's numbers by hand
 * possible, at the cost of small compounding rounding versus a
 * pure-fraction model. Acceptable for a planning tool; not acceptable for
 * anything touching a real ledger (which this function never does).
 */
export function runActuarialScenario(inputs: CohortInputs): ScenarioResult {
  const assumptions = resolveAssumptions(inputs.scenario);
  const scenarioName = typeof inputs.scenario === 'string' ? inputs.scenario : 'custom';

  const perProduct: ProductScenarioResult[] = inputs.products.map((product) => {
    const purchases = inputs.purchasesByProduct[product.productCode] ?? 0;
    const grossRevenue = new Decimal(product.collectedPrice).times(purchases);

    const successfulEvaluations = Math.round(purchases * Number(assumptions.evaluationPassRate));
    const performanceActivations = Math.round(
      successfulEvaluations * Number(assumptions.performanceActivationRate),
    );
    const completedBuffers = Math.round(
      performanceActivations * Number(assumptions.bufferCompletionRate),
    );
    const payout1Recipients = Math.round(
      completedBuffers * Number(assumptions.payout1EligibilityRate),
    );
    const payoutRecipientsByRank = computeRecipientsByRank(
      payout1Recipients,
      assumptions.progressionRates,
    );

    let expectedPayoutCost = new Decimal(0);
    for (let rank = 0; rank < 5; rank += 1) {
      const recipients = payoutRecipientsByRank[rank] as number;
      const cap = product.capsByRank[rank] as string;
      const averagePayout = new Decimal(cap).times(assumptions.averagePayoutOfCapRate);
      expectedPayoutCost = expectedPayoutCost.plus(averagePayout.times(recipients));
    }

    const refundsAndChargebacks = grossRevenue.times(
      new Decimal(assumptions.refundRate).plus(assumptions.chargebackRate),
    );
    const netAfterRefundsChargebacks = grossRevenue.minus(refundsAndChargebacks);
    const netAfterFees = netAfterRefundsChargebacks.times(new Decimal(1).minus(inputs.pspFeeRate));

    return {
      productCode: product.productCode,
      purchases,
      grossRevenue: grossRevenue.toFixed(2),
      netRevenueAfterRefundsChargebacksAndFees: netAfterFees.toFixed(2),
      successfulEvaluations,
      performanceActivations,
      completedBuffers,
      payoutRecipientsByRank,
      expectedPayoutCost: expectedPayoutCost.toFixed(2),
    };
  });

  const totalPurchases = perProduct.reduce((sum, p) => sum + p.purchases, 0);
  const grossRevenue = perProduct.reduce((sum, p) => sum.plus(p.grossRevenue), new Decimal(0));
  const netCollectedRevenue = perProduct.reduce(
    (sum, p) => sum.plus(p.netRevenueAfterRefundsChargebacksAndFees),
    new Decimal(0),
  );
  const totalSuccessfulEvaluations = perProduct.reduce(
    (sum, p) => sum + p.successfulEvaluations,
    0,
  );
  const totalPerformanceActivations = perProduct.reduce(
    (sum, p) => sum + p.performanceActivations,
    0,
  );
  const totalCompletedBuffers = perProduct.reduce((sum, p) => sum + p.completedBuffers, 0);
  const totalPayoutRecipientsByRank = perProduct.reduce<[number, number, number, number, number]>(
    (totals, p) => [
      totals[0] + p.payoutRecipientsByRank[0],
      totals[1] + p.payoutRecipientsByRank[1],
      totals[2] + p.payoutRecipientsByRank[2],
      totals[3] + p.payoutRecipientsByRank[3],
      totals[4] + p.payoutRecipientsByRank[4],
    ],
    [0, 0, 0, 0, 0],
  );
  const expectedPayoutCost = perProduct.reduce(
    (sum, p) => sum.plus(p.expectedPayoutCost),
    new Decimal(0),
  );

  const maximumContractualPayoutExposure = inputs.products.reduce((sum, product) => {
    const productResult = perProduct.find((p) => p.productCode === product.productCode);
    if (!productResult) return sum;
    const capSum = product.capsByRank.reduce(
      (rankSum, cap, rank) =>
        rankSum.plus(new Decimal(cap).times(productResult.payoutRecipientsByRank[rank] as number)),
      new Decimal(0),
    );
    return sum.plus(capSum);
  }, new Decimal(0));

  const payoutCostPerSale =
    totalPurchases > 0 ? expectedPayoutCost.dividedBy(totalPurchases).toFixed(2) : '0.00';
  const payoutRatio = netCollectedRevenue.greaterThan(0)
    ? expectedPayoutCost.dividedBy(netCollectedRevenue).toFixed(4)
    : '0.0000';

  return {
    scenario: scenarioName,
    totalPurchases,
    grossRevenue: grossRevenue.toFixed(2),
    netCollectedRevenue: netCollectedRevenue.toFixed(2),
    totalSuccessfulEvaluations,
    totalPerformanceActivations,
    totalCompletedBuffers,
    totalPayoutRecipientsByRank,
    expectedPayoutCost: expectedPayoutCost.toFixed(2),
    maximumContractualPayoutExposure: maximumContractualPayoutExposure.toFixed(2),
    payoutCostPerSale,
    payoutRatio,
    perProduct,
  };
}
