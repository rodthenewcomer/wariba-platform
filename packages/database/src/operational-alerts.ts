import type { Db } from './client';

/**
 * Appendix 08-A — internal operational alerting.
 *
 * The Security/QA standard enumerates the conditions WARIBA must notice.
 * Until now those existed as metrics and prose: the numbers were exposed on
 * /health and the thresholds were written in a document, but nothing
 * evaluated one against the other, so "reserve below 1.2x" was only ever
 * true on a dashboard somebody had to be looking at.
 *
 * This evaluates them and persists the result as an operations incident —
 * the same table integrity holds and reconciliation failures already use,
 * so Control has one queue rather than two. Scope is deliberately internal:
 * there is no paging, no e-mail, no third-party vendor, and nothing here
 * claims external delivery. An open incident is the alert.
 *
 * De-duplication is the database's job: a partial unique index allows one
 * open incident per code platform-wide, so a condition that stays true for
 * an hour produces one row, not one per evaluation.
 */
export const OPERATIONAL_ALERT = {
  LEADER_LOST: 'LEADER_LOST',
  LEADER_TAKEOVER_SLOW: 'LEADER_TAKEOVER_SLOW',
  NO_STANDBY_READY: 'NO_STANDBY_READY',
  MARKET_FEED_STALE: 'MARKET_FEED_STALE',
  MARKET_FEED_OUTAGE: 'MARKET_FEED_OUTAGE',
  RECONCILIATION_MISMATCH: 'RECONCILIATION_MISMATCH',
  LEDGER_IMBALANCE: 'LEDGER_IMBALANCE',
  PAYOUT_PROCESSING_STALLED: 'PAYOUT_PROCESSING_STALLED',
  TREASURY_RESERVE_PRUDENCE: 'TREASURY_RESERVE_PRUDENCE',
  TREASURY_RESERVE_DEFENSIVE: 'TREASURY_RESERVE_DEFENSIVE',
  DAILY_FINALIZATION_FAILURE: 'DAILY_FINALIZATION_FAILURE',
} as const;

export type OperationalAlertCode = (typeof OPERATIONAL_ALERT)[keyof typeof OPERATIONAL_ALERT];

export type AlertSeverity = 'warning' | 'critical';

export interface OperationalAlertSignals {
  /** Null when leadership state could not be read at all. */
  leaderInstanceId: string | null;
  standbyReady: boolean;
  lastTakeoverDurationMs: number | null;
  takeoverTargetMs: number;
  staleSymbols: readonly string[];
  outageSymbols: readonly string[];
  /** Accounts currently failing reconstruction. */
  reconciliationMismatchCount: number;
  ledgerImbalanceCount: number;
  /** Payout requests stuck mid-flight beyond the processing target. */
  stalledPayoutCount: number;
  /** Null when no treasury coverage ratio can be computed yet. */
  reserveCoverageRatio: string | null;
  failedDailyFinalizationCount: number;
}

export interface EvaluatedAlert {
  code: OperationalAlertCode;
  severity: AlertSeverity;
  evidence: Record<string, unknown>;
}

/**
 * Pure: turns a snapshot of platform signals into the set of alerts that
 * should currently be open. Separated from persistence so the threshold
 * logic is unit-testable without a database.
 */
export function evaluateOperationalAlerts(
  signals: OperationalAlertSignals,
): readonly EvaluatedAlert[] {
  const alerts: EvaluatedAlert[] = [];

  if (signals.leaderInstanceId === null) {
    alerts.push({
      code: OPERATIONAL_ALERT.LEADER_LOST,
      severity: 'critical',
      evidence: { reason: 'No instance currently holds the market-trigger lease.' },
    });
  } else if (!signals.standbyReady) {
    // Only meaningful while a leader exists: with no leader at all,
    // LEADER_LOST is the alert that matters and this would be noise.
    alerts.push({
      code: OPERATIONAL_ALERT.NO_STANDBY_READY,
      severity: 'warning',
      evidence: { leaderInstanceId: signals.leaderInstanceId },
    });
  }

  if (
    signals.lastTakeoverDurationMs !== null &&
    signals.lastTakeoverDurationMs > signals.takeoverTargetMs
  ) {
    alerts.push({
      code: OPERATIONAL_ALERT.LEADER_TAKEOVER_SLOW,
      severity: 'warning',
      evidence: {
        lastTakeoverDurationMs: signals.lastTakeoverDurationMs,
        takeoverTargetMs: signals.takeoverTargetMs,
      },
    });
  }

  if (signals.outageSymbols.length > 0) {
    alerts.push({
      code: OPERATIONAL_ALERT.MARKET_FEED_OUTAGE,
      severity: 'critical',
      evidence: { symbols: [...signals.outageSymbols] },
    });
  }
  if (signals.staleSymbols.length > 0) {
    alerts.push({
      code: OPERATIONAL_ALERT.MARKET_FEED_STALE,
      severity: 'warning',
      evidence: { symbols: [...signals.staleSymbols] },
    });
  }

  if (signals.reconciliationMismatchCount > 0) {
    alerts.push({
      code: OPERATIONAL_ALERT.RECONCILIATION_MISMATCH,
      severity: 'critical',
      evidence: { accounts: signals.reconciliationMismatchCount },
    });
  }
  if (signals.ledgerImbalanceCount > 0) {
    alerts.push({
      code: OPERATIONAL_ALERT.LEDGER_IMBALANCE,
      severity: 'critical',
      evidence: { accounts: signals.ledgerImbalanceCount },
    });
  }
  if (signals.stalledPayoutCount > 0) {
    alerts.push({
      code: OPERATIONAL_ALERT.PAYOUT_PROCESSING_STALLED,
      severity: 'warning',
      evidence: { payoutRequests: signals.stalledPayoutCount },
    });
  }
  if (signals.failedDailyFinalizationCount > 0) {
    alerts.push({
      code: OPERATIONAL_ALERT.DAILY_FINALIZATION_FAILURE,
      severity: 'critical',
      evidence: { accounts: signals.failedDailyFinalizationCount },
    });
  }

  // TREASURY-002 zones. Below 1.2x is the defensive alert and supersedes
  // the prudence one, so an operator sees one severity, not two rows.
  if (signals.reserveCoverageRatio !== null) {
    const ratio = Number(signals.reserveCoverageRatio);
    if (Number.isFinite(ratio)) {
      if (ratio < 1.2) {
        alerts.push({
          code: OPERATIONAL_ALERT.TREASURY_RESERVE_DEFENSIVE,
          severity: 'critical',
          evidence: { coverageRatio: signals.reserveCoverageRatio, threshold: '1.2' },
        });
      } else if (ratio < 1.5) {
        alerts.push({
          code: OPERATIONAL_ALERT.TREASURY_RESERVE_PRUDENCE,
          severity: 'warning',
          evidence: { coverageRatio: signals.reserveCoverageRatio, threshold: '1.5' },
        });
      }
    }
  }

  return alerts;
}

export interface AlertReconciliationResult {
  opened: readonly OperationalAlertCode[];
  stillOpen: readonly OperationalAlertCode[];
  resolved: readonly OperationalAlertCode[];
}

/**
 * Persists the evaluation: opens incidents for newly-true conditions and
 * auto-resolves ones whose condition has cleared. Idempotent — running it
 * twice against an unchanged platform opens nothing and resolves nothing.
 */
export async function reconcileOperationalAlerts(
  db: Db,
  params: { signals: OperationalAlertSignals; now: Date },
): Promise<AlertReconciliationResult> {
  const shouldBeOpen = evaluateOperationalAlerts(params.signals);
  const shouldBeOpenByCode = new Map(shouldBeOpen.map((alert) => [alert.code, alert]));

  return db.transaction().execute(async (trx) => {
    const currentlyOpen = await trx
      .selectFrom('app.operations_incidents')
      .select(['id', 'incident_code'])
      .where('status', '=', 'open')
      .where('account_id', 'is', null)
      .execute();
    const openByCode = new Map(currentlyOpen.map((row) => [row.incident_code, row.id]));

    const opened: OperationalAlertCode[] = [];
    const stillOpen: OperationalAlertCode[] = [];
    for (const alert of shouldBeOpen) {
      if (openByCode.has(alert.code)) {
        stillOpen.push(alert.code);
        continue;
      }
      await trx
        .insertInto('app.operations_incidents')
        .values({
          incident_code: alert.code,
          severity: alert.severity,
          account_id: null,
          payout_request_id: null,
          evidence: JSON.stringify(alert.evidence),
          opened_at: params.now,
        })
        // The partial unique index is the real guard against a concurrent
        // evaluator opening the same alert twice.
        .onConflict((conflict) => conflict.doNothing())
        .execute();
      opened.push(alert.code);
    }

    const resolved: OperationalAlertCode[] = [];
    for (const row of currentlyOpen) {
      const code = row.incident_code as OperationalAlertCode;
      if (shouldBeOpenByCode.has(code)) continue;
      if (!Object.values(OPERATIONAL_ALERT).includes(code)) continue;
      await trx
        .updateTable('app.operations_incidents')
        .set({
          status: 'resolved',
          resolved_at: params.now,
          resolved_by: null,
          resolution_reason: 'Alert condition cleared; resolved automatically by the platform.',
        })
        .where('id', '=', row.id)
        .where('status', '=', 'open')
        .execute();
      resolved.push(code);
    }

    return { opened, stillOpen, resolved };
  });
}

/** Signals sourced from the database alone (everything except live feed/leadership state). */
export async function loadDatabaseAlertSignals(
  db: Db,
): Promise<
  Pick<
    OperationalAlertSignals,
    'reconciliationMismatchCount' | 'ledgerImbalanceCount' | 'stalledPayoutCount'
  >
> {
  const [mismatches, holds, stalledPayouts] = await Promise.all([
    db
      .selectFrom('app.operations_incidents')
      .select((expression) => expression.fn.countAll().as('count'))
      .where('status', '=', 'open')
      .where('incident_code', '=', 'ACCOUNT_RECONCILIATION_FAILURE')
      .execute(),
    db
      .selectFrom('app.trading_accounts')
      .select((expression) => expression.fn.countAll().as('count'))
      .where('integrity_hold', '=', true)
      .execute(),
    db
      .selectFrom('app.payout_requests')
      .select((expression) => expression.fn.countAll().as('count'))
      .where('status', '=', 'processing')
      .execute(),
  ]);
  return {
    reconciliationMismatchCount: Number(mismatches[0]?.count ?? 0),
    ledgerImbalanceCount: Number(holds[0]?.count ?? 0),
    stalledPayoutCount: Number(stalledPayouts[0]?.count ?? 0),
  };
}
