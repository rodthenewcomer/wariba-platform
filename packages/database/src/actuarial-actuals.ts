import Decimal from 'decimal.js';
import {
  compareModelToActual,
  type ActuarialActuals,
  type ActuarialVarianceReport,
  type ActuarialModelSummary,
} from '@wariba/domain';
import type { Db } from './client';

/**
 * Appendix 08-A — measures the ACTUAL side of the actuarial model from real
 * persisted operations. Every number below is a count or a sum over rows
 * the platform actually wrote; there is no imputation, no extrapolation and
 * no default-to-model behaviour. An empty platform reports zeros, and the
 * variance report labels that as `insufficient_data`.
 *
 * Scope, stated plainly (ACTUARIAL-VARIANCE-002): these are counts over the
 * *whole* persisted population — no cohort identity, no date window. MODEL
 * simulates one specific cohort, so a MODEL/ACTUAL comparison is an
 * order-of-magnitude indicator rather than a paired statistical test. No
 * matching mechanism exists here, and none is faked.
 */
async function countRows(query: Promise<{ count: string | number | bigint }[]>): Promise<number> {
  const rows = await query;
  return Number(rows[0]?.count ?? 0);
}

export async function measureActuarialActuals(db: Db): Promise<ActuarialActuals> {
  const [purchases, activations, performanceAccounts, bufferAccounts, paidPayouts, reversals] =
    await Promise.all([
      // A real sale: a purchase order that was actually paid.
      countRows(
        db
          .selectFrom('app.purchase_orders')
          .select((expression) => expression.fn.countAll().as('count'))
          .where('status', '=', 'paid')
          .execute(),
      ),
      // A successful evaluation is one that produced a performance account.
      countRows(
        db
          .selectFrom('app.trading_accounts')
          .select((expression) =>
            expression.fn.count('source_evaluation_account_id').distinct().as('count'),
          )
          .where('source_evaluation_account_id', 'is not', null)
          .execute(),
      ),
      countRows(
        db
          .selectFrom('app.trading_accounts')
          .select((expression) => expression.fn.countAll().as('count'))
          .where('program_type', '=', 'WARIBA_PERFORMANCE')
          .execute(),
      ),
      // Reaching the permanent buffer is what makes a payout requestable,
      // so an account with at least one payout request has demonstrably
      // completed its buffer.
      countRows(
        db
          .selectFrom('app.payout_requests')
          .select((expression) => expression.fn.count('account_id').distinct().as('count'))
          .execute(),
      ),
      db
        .selectFrom('app.payout_requests')
        .select(['cycle_number', 'approved_gross_base', 'account_id'])
        .where('status', '=', 'paid')
        .execute(),
      db
        .selectFrom('app.payout_requests')
        .select(['approved_gross_base'])
        .where('status', '=', 'reversed')
        .execute(),
    ]);

  const recipientsByRank: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  const countedPerRank = new Map<number, Set<string>>();
  for (const payout of paidPayouts) {
    const rankIndex = payout.cycle_number - 1;
    if (rankIndex < 0 || rankIndex > 4) continue;
    const seen = countedPerRank.get(rankIndex) ?? new Set<string>();
    seen.add(payout.account_id);
    countedPerRank.set(rankIndex, seen);
  }
  for (const [rankIndex, accounts] of countedPerRank) {
    recipientsByRank[rankIndex] = accounts.size;
  }

  // Reversed payouts returned the money, so they are not a realized cost.
  const realizedPayoutCost = paidPayouts
    .reduce((total, payout) => total.plus(payout.approved_gross_base ?? '0'), new Decimal(0))
    .minus(
      reversals.reduce(
        (total, payout) => total.plus(payout.approved_gross_base ?? '0'),
        new Decimal(0),
      ),
    );

  return {
    totalPurchases: purchases,
    totalSuccessfulEvaluations: activations,
    totalPerformanceActivations: performanceAccounts,
    totalCompletedBuffers: bufferAccounts,
    totalPayoutRecipientsByRank: recipientsByRank,
    realizedPayoutCost: realizedPayoutCost.toFixed(2),
  };
}

export interface PersistedActuarialVarianceRun extends ActuarialVarianceReport {
  id: string;
  scenarioRunId: string;
  scenarioName: string;
  scenarioVersion: number;
  executedAt: Date;
}

/**
 * Records an immutable MODEL vs ACTUAL comparison. Neither side is
 * modified: the referenced scenario run keeps its own snapshot, and the
 * actuals are measured fresh at `now`.
 */
export async function recordActuarialVarianceRun(
  db: Db,
  params: {
    scenarioRunId: string;
    model: ActuarialModelSummary;
    executedBy: string | null;
    now: Date;
  },
): Promise<PersistedActuarialVarianceRun> {
  const run = await db
    .selectFrom('app.actuarial_scenario_runs')
    .select(['id', 'scenario_name', 'scenario_version'])
    .where('id', '=', params.scenarioRunId)
    .executeTakeFirstOrThrow(() => new Error('Actuarial scenario run was not found.'));

  const actuals = await measureActuarialActuals(db);
  const report = compareModelToActual({
    model: params.model,
    actuals,
    asOf: params.now,
  });

  const inserted = await db
    .insertInto('app.actuarial_variance_runs')
    .values({
      scenario_run_id: run.id,
      scenario_name: run.scenario_name,
      scenario_version: run.scenario_version,
      as_of: params.now,
      model_cohort_size: report.modelCohortSize,
      actual_sample_size: report.actualSampleSize,
      coverage: report.coverage,
      metrics: JSON.stringify(report.metrics),
      executed_by: params.executedBy,
      executed_at: params.now,
    })
    .returning(['id', 'executed_at'])
    .executeTakeFirstOrThrow();

  return {
    ...report,
    id: inserted.id,
    scenarioRunId: run.id,
    scenarioName: run.scenario_name,
    scenarioVersion: run.scenario_version,
    executedAt: inserted.executed_at,
  };
}

export async function loadRecentActuarialVarianceRuns(
  db: Db,
  limit = 20,
): Promise<PersistedActuarialVarianceRun[]> {
  const rows = await db
    .selectFrom('app.actuarial_variance_runs')
    .selectAll()
    .orderBy('executed_at', 'desc')
    .limit(limit)
    .execute();
  return rows.map((row) => ({
    id: row.id,
    scenarioRunId: row.scenario_run_id,
    scenarioName: row.scenario_name,
    scenarioVersion: row.scenario_version,
    asOf: row.as_of.toISOString(),
    modelCohortSize: row.model_cohort_size,
    actualSampleSize: row.actual_sample_size,
    coverage: row.coverage,
    metrics: row.metrics as PersistedActuarialVarianceRun['metrics'],
    executedAt: row.executed_at,
  }));
}
