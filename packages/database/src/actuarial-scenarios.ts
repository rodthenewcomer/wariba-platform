import {
  parseScenarioAssumptions,
  runActuarialScenario,
  SCENARIO_NAMES,
  resolveTraderSplitRate,
  type ActuarialProductCode as ProductCode,
  type ActuarialCohortInputs as CohortInputs,
  type ScenarioAssumptions,
  type ScenarioName,
  type ActuarialScenarioResult as ScenarioResult,
} from '@wariba/domain';
import type { Db } from './client';
import { asPerformancePolicy } from './performance';
import { loadPublishedPolicy } from './policy';

export interface PersistedActuarialScenarioAssumptions {
  id: string;
  scenarioName: ScenarioName;
  version: number;
  assumptions: ScenarioAssumptions;
  changeReason: string;
  notes: string;
  effectiveStatus: 'active' | 'retired';
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
  notes: string;
  effective_status: 'active' | 'retired';
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
    notes: row.notes,
    effectiveStatus: row.effective_status,
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
  notes?: string;
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
      notes: params.notes?.trim() ?? active.notes,
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
  executedBy?: string | null;
  now?: Date;
}

export interface PersistedActuarialScenarioRun {
  id: string;
  scenarioName: ScenarioName;
  assumptionsVersion: number;
  assumptions: ScenarioAssumptions;
  input: Omit<CohortInputs, 'scenario'>;
  result: ScenarioResult;
  executedBy: string | null;
  executedAt: Date;
}

export async function runPersistedActuarialScenario(
  db: Db,
  params: RunPersistedActuarialScenarioParams,
): Promise<PersistedActuarialScenarioRun> {
  const persisted = await loadActiveActuarialScenarioAssumptions(db, params.scenarioName);
  const input = {
    purchasesByProduct: params.purchasesByProduct,
    products: params.products,
    pspFeeRate: params.pspFeeRate,
  };
  const computed = runActuarialScenario({ ...input, scenario: persisted.assumptions });
  const result: ScenarioResult = { ...computed, scenario: params.scenarioName };
  const executedAt = params.now ?? new Date();
  const inserted = await db
    .insertInto('app.actuarial_scenario_runs')
    .values({
      scenario_assumption_id: persisted.id,
      scenario_name: params.scenarioName,
      scenario_version: persisted.version,
      assumptions_snapshot: JSON.stringify(persisted.assumptions),
      input_snapshot: JSON.stringify(input),
      result_snapshot: JSON.stringify(result),
      executed_by: params.executedBy ?? null,
      executed_at: executedAt,
    })
    .returning(['id', 'executed_at'])
    .executeTakeFirstOrThrow();

  await db
    .insertInto('app.outbox_events')
    .values({
      aggregate_type: 'actuarial_scenario_run',
      aggregate_id: inserted.id,
      event_type: 'actuarial_scenario.executed',
      payload: JSON.stringify({
        scenarioName: params.scenarioName,
        assumptionsVersion: persisted.version,
      }),
      occurred_at: executedAt,
    })
    .execute();

  return {
    id: inserted.id,
    scenarioName: params.scenarioName,
    assumptionsVersion: persisted.version,
    assumptions: persisted.assumptions,
    input,
    result,
    executedBy: params.executedBy ?? null,
    executedAt: inserted.executed_at,
  };
}

export async function loadActiveActuarialScenarios(
  db: Db,
): Promise<PersistedActuarialScenarioAssumptions[]> {
  const rows = await db
    .selectFrom('app.actuarial_scenario_assumptions')
    .selectAll()
    .where('is_active', '=', true)
    .orderBy('scenario_name', 'asc')
    .execute();
  return rows.map(toPersistedScenario);
}

export interface ActuarialScenarioRunComparison {
  id: string;
  scenarioName: ScenarioName;
  assumptionsVersion: number;
  totalPurchases: number;
  netCollectedRevenue: string;
  expectedPayoutCost: string;
  payoutRatio: string;
  executedBy: string | null;
  executedAt: Date;
}

function readResultField(result: unknown, field: string): unknown {
  if (typeof result !== 'object' || result === null || Array.isArray(result)) {
    throw new Error('Stored actuarial result is not an object.');
  }
  return (result as Record<string, unknown>)[field];
}

export async function loadRecentActuarialScenarioRuns(
  db: Db,
  limit = 20,
): Promise<ActuarialScenarioRunComparison[]> {
  const rows = await db
    .selectFrom('app.actuarial_scenario_runs')
    .select([
      'id',
      'scenario_name',
      'scenario_version',
      'result_snapshot',
      'executed_by',
      'executed_at',
    ])
    .orderBy('executed_at', 'desc')
    .limit(limit)
    .execute();

  return rows.map((row) => {
    const totalPurchases = readResultField(row.result_snapshot, 'totalPurchases');
    const netCollectedRevenue = readResultField(row.result_snapshot, 'netCollectedRevenue');
    const expectedPayoutCost = readResultField(row.result_snapshot, 'expectedPayoutCost');
    const payoutRatio = readResultField(row.result_snapshot, 'payoutRatio');
    if (
      typeof totalPurchases !== 'number' ||
      typeof netCollectedRevenue !== 'string' ||
      typeof expectedPayoutCost !== 'string' ||
      typeof payoutRatio !== 'string'
    ) {
      throw new Error('Stored actuarial result summary is invalid.');
    }
    return {
      id: row.id,
      scenarioName: row.scenario_name,
      assumptionsVersion: row.scenario_version,
      totalPurchases,
      netCollectedRevenue,
      expectedPayoutCost,
      payoutRatio,
      executedBy: row.executed_by,
      executedAt: row.executed_at,
    };
  });
}

export async function loadDefaultActuarialScenarioInput(
  db: Db,
): Promise<Omit<CohortInputs, 'scenario'>> {
  const policy = asPerformancePolicy(await loadPublishedPolicy(db, 'WARIBA_PERFORMANCE'));
  const rows = await db
    .selectFrom('app.products')
    .innerJoin('app.product_versions', 'app.product_versions.product_id', 'app.products.id')
    .select([
      'app.products.code',
      'app.products.nominal_balance',
      'app.product_versions.price_amount',
    ])
    .where('app.product_versions.retired_at', 'is', null)
    .orderBy('app.products.nominal_balance', 'asc')
    .execute();

  const purchasesByProduct: Partial<Record<ProductCode, number>> = {};
  const products = rows.map((row) => {
    purchasesByProduct[row.code] = row.code === '10K' ? 500 : 0;
    const caps = policy.payout_caps_by_nominal_balance[row.nominal_balance];
    if (!caps) {
      throw new Error('Performance payout caps are missing for ' + row.nominal_balance + '.');
    }
    return {
      productCode: row.code,
      collectedPrice: row.price_amount,
      capsByRank: caps,
      splitByRank: [1, 2, 3, 4, 5].map((cycleNumber) =>
        resolveTraderSplitRate({
          cycleNumber,
          maxPayoutCyclesBeforeReview: policy.max_payout_cycles_before_review,
          defaultSplitRate: policy.trader_split_rate_default,
          finalCycleSplitRate: policy.trader_split_rate_final_cycle,
        }),
      ) as [string, string, string, string, string],
    };
  });

  return { purchasesByProduct, products, pspFeeRate: '0.03' };
}
