import {
  replaceActuarialScenarioAssumptionsInTransaction,
  runPersistedActuarialScenario,
  loadActiveActuarialScenarios,
  loadRecentActuarialScenarioRuns,
  loadDefaultActuarialScenarioInput,
  recordStaffAuditEvent,
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
  notes?: string;
  changedBy: string | null;
  changedByRole?: string;
  correlationId?: string;
}

export async function replaceActuarialScenarioAssumptions(
  db: Db,
  params: ReplaceActuarialScenarioAssumptionsParams,
): Promise<PersistedActuarialScenarioAssumptions> {
  return db.transaction().execute(async (trx) => {
    const result = await replaceActuarialScenarioAssumptionsInTransaction(trx, {
      ...params,
      now: new Date(),
    });
    if (params.changedBy) {
      await recordStaffAuditEvent(trx, {
        actorId: params.changedBy,
        actorRole: params.changedByRole ?? 'risk',
        permission: 'actuarial.modify',
        action: 'actuarial.assumptions_version_created',
        targetType: 'actuarial_scenario_assumptions',
        targetId: result.id,
        before: { scenarioName: result.scenarioName, version: result.version - 1 },
        after: { scenarioName: result.scenarioName, version: result.version },
        reason: result.changeReason,
        correlationId: params.correlationId ?? result.id,
        occurredAt: result.createdAt,
      });
    }
    return result;
  });
}

export async function runStoredActuarialScenario(
  db: Db,
  params: RunPersistedActuarialScenarioParams,
): Promise<PersistedActuarialScenarioRun> {
  const result = await runPersistedActuarialScenario(db, params);
  if (params.executedBy) {
    await recordStaffAuditEvent(db, {
      actorId: params.executedBy,
      actorRole: 'risk',
      permission: 'actuarial.modify',
      action: 'actuarial.scenario_executed',
      targetType: 'actuarial_scenario_run',
      targetId: result.id,
      before: null,
      after: { scenarioName: result.scenarioName, assumptionsVersion: result.assumptionsVersion },
      reason: 'Execute persisted actuarial scenario',
      correlationId: result.id,
      occurredAt: result.executedAt,
    });
  }
  return result;
}

export async function loadActuarialControlState(db: Db) {
  const [scenarios, runs, defaultRunInput] = await Promise.all([
    loadActiveActuarialScenarios(db),
    loadRecentActuarialScenarioRuns(db),
    loadDefaultActuarialScenarioInput(db),
  ]);
  return { scenarios, runs, defaultRunInput };
}
