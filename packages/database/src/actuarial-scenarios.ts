import {
  parseScenarioAssumptions,
  runActuarialScenario,
  SCENARIO_NAMES,
  type ActuarialCohortInputs as CohortInputs,
  type ScenarioAssumptions,
  type ScenarioName,
  type ActuarialScenarioResult as ScenarioResult,
} from '@wariba/domain';
import type { Db } from './client';

export interface PersistedActuarialScenarioAssumptions {
  id: string;
  scenarioName: ScenarioName;
  version: number;
  assumptions: ScenarioAssumptions;
  changeReason: string;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
}

function toPersistedScenario(row: {
  id: string;
  scenario_name: ScenarioName;
  version: number;
  assumptions_json: unknown;
  change_reason: string;
  is_active: boolean;
  created_by: string | null;
  created_at: Date;
}): PersistedActuarialScenarioAssumptions {
  return {
    id: row.id,
    scenarioName: row.scenario_name,
    version: row.version,
    assumptions: parseScenarioAssumptions(row.assumptions_json),
    changeReason: row.change_reason,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function loadActiveActuarialScenarioAssumptions(
  db: Db,
  scenarioName: ScenarioName,
): Promise<PersistedActuarialScenarioAssumptions> {
  const row = await db
    .selectFrom('app.actuarial_scenario_assumptions')
    .selectAll()
    .where('scenario_name', '=', scenarioName)
    .where('is_active', '=', true)
    .executeTakeFirstOrThrow(
      () => new Error('Active actuarial assumptions were not found for ' + scenarioName + '.'),
    );
  return toPersistedScenario(row);
}

export interface ReplaceActuarialScenarioAssumptionsParams {
  scenarioName: ScenarioName;
  assumptions: unknown;
  changeReason: string;
  changedBy: string | null;
  now: Date;
}

export async function replaceActuarialScenarioAssumptionsInTransaction(
  trx: Db,
  params: ReplaceActuarialScenarioAssumptionsParams,
): Promise<PersistedActuarialScenarioAssumptions> {
  if (!SCENARIO_NAMES.includes(params.scenarioName)) {
    throw new Error('Unknown actuarial scenario.');
  }
  if (params.changeReason.trim().length === 0) {
    throw new Error('An actuarial assumption change reason is required.');
  }
  const assumptions = parseScenarioAssumptions(params.assumptions);
  const active = await trx
    .selectFrom('app.actuarial_scenario_assumptions')
    .selectAll()
    .where('scenario_name', '=', params.scenarioName)
    .where('is_active', '=', true)
    .forUpdate()
    .executeTakeFirstOrThrow(
      () =>
        new Error('Active actuarial assumptions were not found for ' + params.scenarioName + '.'),
    );

  await trx
    .updateTable('app.actuarial_scenario_assumptions')
    .set({ is_active: false })
    .where('id', '=', active.id)
    .execute();

  const inserted = await trx
    .insertInto('app.actuarial_scenario_assumptions')
    .values({
      scenario_name: params.scenarioName,
      version: active.version + 1,
      assumptions_json: JSON.stringify(assumptions),
      change_reason: params.changeReason.trim(),
      created_by: params.changedBy,
      created_at: params.now,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  await trx
    .insertInto('app.outbox_events')
    .values({
      aggregate_type: 'actuarial_scenario_assumptions',
      aggregate_id: inserted.id,
      event_type: 'actuarial_scenario.assumptions_replaced',
      payload: JSON.stringify({
        scenarioName: params.scenarioName,
        version: inserted.version,
        changedBy: params.changedBy,
      }),
    })
    .execute();

  return toPersistedScenario(inserted);
}

export interface RunPersistedActuarialScenarioParams extends Omit<CohortInputs, 'scenario'> {
  scenarioName: ScenarioName;
}

export interface PersistedActuarialScenarioRun {
  assumptionsVersion: number;
  result: ScenarioResult;
}

export async function runPersistedActuarialScenario(
  db: Db,
  params: RunPersistedActuarialScenarioParams,
): Promise<PersistedActuarialScenarioRun> {
  const persisted = await loadActiveActuarialScenarioAssumptions(db, params.scenarioName);
  return {
    assumptionsVersion: persisted.version,
    result: runActuarialScenario({ ...params, scenario: persisted.assumptions }),
  };
}
