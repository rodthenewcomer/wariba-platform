import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  loadActiveActuarialScenarioAssumptions,
  replaceActuarialScenarioAssumptionsInTransaction,
  runPersistedActuarialScenario,
} from '../src/actuarial-scenarios';
import { createDbClient, type Db } from '../src/client';

const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('actuarial scenario assumptions — real database', () => {
  let db: Db;

  beforeAll(() => {
    db = createDbClient(DATABASE_URL as string);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('uses persisted active assumptions and versions replacements without leaving test data behind', async () => {
    const before = await loadActiveActuarialScenarioAssumptions(db, 'base');
    await expect(
      db.transaction().execute(async (trx) => {
        const replacement = await replaceActuarialScenarioAssumptionsInTransaction(trx, {
          scenarioName: 'base',
          assumptions: {
            ...before.assumptions,
            refundRate: '0.05',
          },
          changeReason: 'Integration test rollback',
          changedBy: null,
          now: new Date(),
        });
        expect(replacement.version).toBe(before.version + 1);
        expect(replacement.assumptions.refundRate).toBe('0.05');

        const run = await runPersistedActuarialScenario(trx, {
          scenarioName: 'base',
          purchasesByProduct: { '10K': 100 },
          products: [
            {
              productCode: '10K',
              collectedPrice: '39900',
              capsByRank: ['500', '750', '1000', '1500', '2000'],
              splitByRank: ['0.85', '0.85', '0.85', '0.85', '0.90'],
            },
          ],
          pspFeeRate: '0.03',
        });
        expect(run.assumptionsVersion).toBe(replacement.version);
        expect(run.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(run.scenarioName).toBe('base');
        expect(run.result.netCollectedRevenue).toBe('3618730.50');
        throw new Error('Rollback actuarial assumption replacement.');
      }),
    ).rejects.toThrow('Rollback actuarial assumption replacement.');

    const after = await loadActiveActuarialScenarioAssumptions(db, 'base');
    expect(after.id).toBe(before.id);
    expect(after.version).toBe(before.version);
    expect(after.assumptions).toEqual(before.assumptions);
  });

  it('loads the persisted CUSTOM configuration rather than a code-level authority', async () => {
    const custom = await loadActiveActuarialScenarioAssumptions(db, 'custom');
    expect(custom.scenarioName).toBe('custom');
    expect(custom.version).toBeGreaterThan(0);
    expect(custom.effectiveStatus).toBe('active');
    expect(custom.notes.length).toBeGreaterThan(0);
  });
});
