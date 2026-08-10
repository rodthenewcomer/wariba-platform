import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { runPersistedActuarialScenario } from '../src/actuarial-scenarios';
import {
  measureActuarialActuals,
  recordActuarialVarianceRun,
  loadRecentActuarialVarianceRuns,
} from '../src/actuarial-actuals';

const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

const PRODUCTS = [
  {
    productCode: '10K' as const,
    collectedPrice: '39900',
    capsByRank: ['500', '750', '1000', '1500', '2000'] as const,
    splitByRank: ['0.85', '0.85', '0.85', '0.85', '0.90'] as const,
  },
];

describeIfDb('actuarial MODEL vs ACTUAL — real database', () => {
  let db: Db;

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
  }, 15000);

  afterAll(async () => {
    await db.destroy();
  }, 15000);

  it('measures ACTUAL only from persisted rows, never from the model', async () => {
    const actuals = await measureActuarialActuals(db);
    // Whatever the platform currently holds, every figure must be a real,
    // non-negative measurement and the payout cost a valid decimal.
    expect(actuals.totalPurchases).toBeGreaterThanOrEqual(0);
    expect(actuals.totalPerformanceActivations).toBeGreaterThanOrEqual(0);
    expect(actuals.totalCompletedBuffers).toBeGreaterThanOrEqual(0);
    expect(actuals.totalPayoutRecipientsByRank).toHaveLength(5);
    for (const recipients of actuals.totalPayoutRecipientsByRank) {
      expect(recipients).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(recipients)).toBe(true);
    }
    expect(Number.isNaN(Number(actuals.realizedPayoutCost))).toBe(false);

    const independentPurchaseCount = await db
      .selectFrom('app.purchase_orders')
      .select((expression) => expression.fn.countAll().as('count'))
      .where('status', '=', 'paid')
      .executeTakeFirstOrThrow();
    expect(actuals.totalPurchases).toBe(Number(independentPurchaseCount.count));
  }, 30000);

  /**
   * app.actuarial_scenario_runs is immutable by trigger — history cannot be
   * deleted, which is the whole point of it. So these tests do their work
   * inside a transaction and roll it back, leaving no audit rows behind
   * rather than trying (and failing) to clean up after themselves.
   */
  const ROLLBACK = 'Rollback actuarial variance integration test.';

  it('persists an immutable variance run that does not touch the model run', async () => {
    await expect(
      db.transaction().execute(async (trx) => {
        const modelRun = await runPersistedActuarialScenario(trx, {
          scenarioName: 'base',
          purchasesByProduct: { '10K': 1000 },
          products: PRODUCTS,
          pspFeeRate: '0.03',
        });
        const modelSnapshotBefore = await trx
          .selectFrom('app.actuarial_scenario_runs')
          .select('result_snapshot')
          .where('id', '=', modelRun.id)
          .executeTakeFirstOrThrow();

        const variance = await recordActuarialVarianceRun(trx, {
          scenarioRunId: modelRun.id,
          model: modelRun.result,
          executedBy: null,
          now: new Date(),
        });

        expect(variance.scenarioRunId).toBe(modelRun.id);
        expect(variance.modelCohortSize).toBe(1000);
        expect(variance.metrics.length).toBeGreaterThanOrEqual(9);
        for (const metric of variance.metrics) {
          expect(metric.metric).toMatch(/^[a-z0-9_]+$/);
          expect(Number.isNaN(Number(metric.modelValue))).toBe(false);
          expect(Number.isNaN(Number(metric.actualValue))).toBe(false);
          expect(Number(metric.variance)).toBeCloseTo(
            Number(metric.actualValue) - Number(metric.modelValue),
            2,
          );
        }

        // MODEL is untouched: recording a variance must never write back.
        const modelSnapshotAfter = await trx
          .selectFrom('app.actuarial_scenario_runs')
          .select('result_snapshot')
          .where('id', '=', modelRun.id)
          .executeTakeFirstOrThrow();
        expect(modelSnapshotAfter.result_snapshot).toEqual(modelSnapshotBefore.result_snapshot);

        const recent = await loadRecentActuarialVarianceRuns(trx, 5);
        expect(recent.some((run) => run.id === variance.id)).toBe(true);

        throw new Error(ROLLBACK);
      }),
    ).rejects.toThrow(ROLLBACK);
  }, 30000);

  it('labels a sandbox with too little real data rather than claiming agreement', async () => {
    const actuals = await measureActuarialActuals(db);
    await expect(
      db.transaction().execute(async (trx) => {
        const modelRun = await runPersistedActuarialScenario(trx, {
          scenarioName: 'base',
          purchasesByProduct: { '10K': 1000 },
          products: PRODUCTS,
          pspFeeRate: '0.03',
        });
        const variance = await recordActuarialVarianceRun(trx, {
          scenarioRunId: modelRun.id,
          model: modelRun.result,
          executedBy: null,
          now: new Date(),
        });

        // This is why ACTUARIAL_MODEL_VALIDATED stays false: a sandbox has
        // nowhere near the sample a real validation would need.
        const expected =
          actuals.totalPurchases === 0
            ? 'insufficient_data'
            : actuals.totalPurchases < 30
              ? 'partial'
              : 'comparable';
        expect(variance.coverage).toBe(expected);
        expect(variance.actualSampleSize).toBe(actuals.totalPurchases);

        throw new Error(ROLLBACK);
      }),
    ).rejects.toThrow(ROLLBACK);
  }, 30000);
});
