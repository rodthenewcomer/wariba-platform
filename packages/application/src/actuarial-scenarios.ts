import {
  replaceActuarialScenarioAssumptionsInTransaction,
  runPersistedActuarialScenario,
  type Db,
  type RunPersistedActuarialScenarioParams,
} from '@wariba/database';
import type {
  PersistedActuarialScenarioRun,
  PersistedActuarialScenarioAssumptions,
} from '@wariba/database';
import type { ScenarioName } from '@wariba/domain';

export interface ReplaceActuarialScenarioAssumptionsParams {
  scenarioName: ScenarioName;
  assumptions: unknown;
  changeReason: string;
  changedBy: string | null;
}

export async function replaceActuarialScenarioAssumptions(
  db: Db,
  params: ReplaceActuarialScenarioAssumptionsParams,
): Promise<PersistedActuarialScenarioAssumptions> {
  return db.transaction().execute((trx) =>
    replaceActuarialScenarioAssumptionsInTransaction(trx, {
      ...params,
      now: new Date(),
    }),
  );
}

export async function runStoredActuarialScenario(
  db: Db,
  params: RunPersistedActuarialScenarioParams,
): Promise<PersistedActuarialScenarioRun> {
  return runPersistedActuarialScenario(db, params);
}
