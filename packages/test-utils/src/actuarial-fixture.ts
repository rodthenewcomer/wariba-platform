import {
  loadDefaultActuarialScenarioInput,
  runPersistedActuarialScenario,
  type Db,
} from '@wariba/database';

/**
 * A MODEL run for the Control actuarial console's E2E coverage.
 *
 * `executed_by` is deliberately null. `app.actuarial_scenario_runs` is
 * immutable by trigger and its `executed_by` references `auth.users` with no
 * cascade, so a run executed by an ephemeral fixture staff member would pin
 * that user in the database forever and break their teardown. That FK
 * behaviour is correct — you should not be able to erase who ran a scenario
 * — so the fixture stays anonymous rather than weakening it.
 *
 * The row itself is never cleaned up, because immutable means immutable.
 */
export async function seedActuarialScenarioRun(db: Db): Promise<{ scenarioRunId: string }> {
  // The platform's real products and pricing, so the run is representative
  // rather than a hand-made cohort.
  const input = await loadDefaultActuarialScenarioInput(db);
  const run = await runPersistedActuarialScenario(db, {
    scenarioName: 'base',
    purchasesByProduct: input.purchasesByProduct,
    products: input.products,
    pspFeeRate: input.pspFeeRate,
    executedBy: null,
  });
  return { scenarioRunId: run.id };
}

/**
 * Removes the comparisons a test recorded against `scenarioRunId`.
 *
 * Variance runs carry no immutability trigger — they are analytical
 * artifacts, not financial history — so a test that produces one is
 * responsible for removing it, including the `executed_by` reference to the
 * staff user about to be torn down.
 */
export async function deleteActuarialVarianceRuns(db: Db, scenarioRunId: string): Promise<void> {
  await db
    .deleteFrom('app.actuarial_variance_runs')
    .where('scenario_run_id', '=', scenarioRunId)
    .execute();
}
