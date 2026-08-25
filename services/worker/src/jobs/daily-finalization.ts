import {
  finalizeDailyBoundaryForAccount,
  listAccountsDueForFinalization,
  evaluateAndApplyAccountRisk,
  type Db,
} from '@wariba/database';
import type { Logger } from '@wariba/observability';

export interface DailyFinalizationJobResult {
  startedAt: string;
  finishedAt: string;
  dueAccountCount: number;
  processedAccountIds: string[];
  failedAccountIds: string[];
}

/**
 * Prompt 05 "DAILY WORKER" — for every account with a stale (elapsed) open
 * daily snapshot: finalize the boundary (EOD balance, Maximum Loss floor
 * ratchet, soft-lock reset), then re-run the risk engine so an account
 * already sitting in `pass_pending` with nothing left to block it advances
 * to `passed` — otherwise it would never move, since positions are already
 * zero by the time an account reaches pass_pending, so no further trade
 * would ever trigger that follow-up evaluation on its own.
 *
 * `marketBySymbol: {}` — this job has no live price feed (V1 scope
 * decision: breach/soft-lock detection is trade-triggered + EOD-triggered
 * only, not continuous). This is safe for what this job actually does:
 * finalization itself is ledger-balance-only (no prices needed), and the
 * only status advance this job can produce (pass_pending -> passed)
 * requires zero open positions by definition, so there is nothing to price.
 * An account still holding open positions keeps getting fully-priced
 * evaluations on its next real trade.
 *
 * One account's failure never aborts the batch — each is isolated and
 * logged so the rest of the run still completes.
 */
export async function runDailyFinalizationJob(
  db: Db,
  params: { now: () => Date; logger: Logger },
): Promise<DailyFinalizationJobResult> {
  const startedAt = params.now();
  const dueAccountIds = await listAccountsDueForFinalization(db, startedAt);

  const processedAccountIds: string[] = [];
  const failedAccountIds: string[] = [];

  for (const accountId of dueAccountIds) {
    const triggerEventId = `daily_finalization:${accountId}:${startedAt.toISOString().slice(0, 10)}`;
    const lifecycleAccount = await db
      .selectFrom('app.trading_accounts')
      .select('program_type')
      .where('id', '=', accountId)
      .executeTakeFirst();
    const isEvaluation = lifecycleAccount?.program_type === 'WARIBA_ONE';
    if (isEvaluation) {
      params.logger.info('evaluation_daily_finalization_started', {
        accountId,
        triggerEventId,
      });
    }
    try {
      await finalizeDailyBoundaryForAccount(db, { accountId, clock: params.now });
      const evaluationNow = params.now();
      // Deterministic, not randomUUID(): app.risk_violations dedupes on
      // (trigger_event_type, trigger_event_id, rule_code). A fresh random id
      // per call defeats that dedup entirely for this job — if the setInterval
      // poll ever overlaps a still-running previous invocation (a due-account
      // batch that takes longer than WORKER_POLL_INTERVAL_MS, or the manual
      // /jobs/daily-finalization endpoint firing while the timer-driven run
      // is in flight), the same real boundary-crossing event gets logged
      // twice under two different ids, corrupting the violations table as an
      // audit/compliance record. Scoping the id to the account and the UTC
      // calendar day being evaluated makes two overlapping runs that reach
      // the same account on the same day collide on purpose.
      const riskOutcome = await evaluateAndApplyAccountRisk(db, {
        accountId,
        now: evaluationNow,
        marketBySymbol: {},
        triggerEventType: 'daily_finalization',
        triggerEventId,
      });
      processedAccountIds.push(accountId);
      if (isEvaluation) {
        params.logger.info('evaluation_daily_finalization_completed', {
          accountId,
          triggerEventId,
          previousStatus: riskOutcome.previousStatus,
          newStatus: riskOutcome.newStatus,
        });
      }
    } catch (error) {
      params.logger.error('daily_finalization.account_failed', {
        accountId,
        errorCode: (error as Error).message,
      });
      failedAccountIds.push(accountId);
    }
  }

  const finishedAt = params.now();
  params.logger.info('daily_finalization.run_completed', {
    dueAccountCount: dueAccountIds.length,
    processedCount: processedAccountIds.length,
    failedCount: failedAccountIds.length,
    durationMs: finishedAt.getTime() - startedAt.getTime(),
  });

  return {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    dueAccountCount: dueAccountIds.length,
    processedAccountIds,
    failedAccountIds,
  };
}
