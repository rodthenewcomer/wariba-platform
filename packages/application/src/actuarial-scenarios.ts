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

export interface RunStoredActuarialScenarioParams extends RunPersistedActuarialScenarioParams {
  /**
   * The role that actually triggered the execution. Both risk and finance
   * hold `actuarial.modify`, so recording a fixed role would attribute a
   * finance operator's run to risk — an audit trail that names the wrong
   * authority is worse than none.
   */
  executedByRole?: string;
}

/**
 * Executes a persisted scenario and records who executed it, atomically.
 *
 * `app.actuarial_scenario_runs` is immutable by trigger: a run written
 * without its audit event could never be annotated or removed afterwards,
 * leaving permanent actuarial evidence with no accountable actor. So the run
 * insert, its outbox event and the staff audit event share one transaction —
 * if the audit write fails, the run does not exist either.
 */
export async function runStoredActuarialScenario(
  db: Db,
  params: RunStoredActuarialScenarioParams,
): Promise<PersistedActuarialScenarioRun> {
  return db.transaction().execute(async (trx) => {
    const result = await runPersistedActuarialScenario(trx, params);
    if (params.executedBy) {
      await recordStaffAuditEvent(trx, {
        actorId: params.executedBy,
        actorRole: params.executedByRole ?? 'risk',
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
  });
}

export async function loadActuarialControlState(db: Db) {
  const [scenarios, runs, defaultRunInput] = await Promise.all([
    loadActiveActuarialScenarios(db),
    loadRecentActuarialScenarioRuns(db),
    loadDefaultActuarialScenarioInput(db),
  ]);
  return { scenarios, runs, defaultRunInput };
}
