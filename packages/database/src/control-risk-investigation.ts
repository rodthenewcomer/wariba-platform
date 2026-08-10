import type { Db } from './client';

/**
 * Prompt 09 — the risk operator's investigation surface.
 *
 * Risk deliberately cannot enter the generic Accounts explorer: it holds no
 * `account.view`, and that is least privilege working as intended. This is
 * the canonical way a risk operator reaches an account instead — scoped to
 * cases that actually need investigating, and carrying only the identity
 * needed to know *which* account is in question.
 *
 * "Minimum necessary identity" is enforced by what this module selects:
 * public id, program and status. No email, no name, no country, no user
 * directory. A risk operator investigating an integrity hold does not need
 * to know who the trader is to determine whether the ledger reconciles.
 *
 * Each evidence domain is a separate section, gated by its own authority
 * (risk.view, reconciliation.view, incident.view) and queried only when the
 * caller holds it — same contract as the account detail loader.
 */
export type RiskInvestigationSection = 'risk' | 'reconciliation_evidence' | 'incident_evidence';

export interface RiskCaseRow {
  accountId: string;
  /** Minimum necessary identity — deliberately not the trader's identity. */
  accountPublicId: string;
  programType: string;
  status: string;
  integrityHold: boolean;
  integrityHoldReason: string | null;
  integrityHoldSetAt: Date | null;
  openIncidents: number;
  criticalIncidents: number;
  violations: number;
  lastMismatchAt: Date | null;
}

/**
 * Accounts that warrant risk attention: under an integrity hold, holding an
 * open incident, or carrying a failed reconciliation. Not every account —
 * this is a case list, not a directory.
 */
export async function loadRiskCases(db: Db, limit = 50): Promise<readonly RiskCaseRow[]> {
  const rows = await db
    .selectFrom('app.trading_accounts')
    .select((eb) => [
      'app.trading_accounts.id',
      'app.trading_accounts.public_id',
      'app.trading_accounts.program_type',
      'app.trading_accounts.status',
      'app.trading_accounts.integrity_hold',
      'app.trading_accounts.integrity_hold_reason',
      'app.trading_accounts.integrity_hold_set_at',
      eb
        .selectFrom('app.operations_incidents')
        .select((inner) => inner.fn.countAll().as('count'))
        .whereRef('app.operations_incidents.account_id', '=', 'app.trading_accounts.id')
        .where('app.operations_incidents.status', '=', 'open')
        .as('open_incidents'),
      eb
        .selectFrom('app.operations_incidents')
        .select((inner) => inner.fn.countAll().as('count'))
        .whereRef('app.operations_incidents.account_id', '=', 'app.trading_accounts.id')
        .where('app.operations_incidents.status', '=', 'open')
        .where('app.operations_incidents.severity', '=', 'critical')
        .as('critical_incidents'),
      eb
        .selectFrom('app.risk_violations')
        .select((inner) => inner.fn.countAll().as('count'))
        .whereRef('app.risk_violations.account_id', '=', 'app.trading_accounts.id')
        .as('violations'),
      eb
        .selectFrom('app.account_reconciliation_runs')
        .select((inner) => inner.fn.max('executed_at').as('at'))
        .whereRef('app.account_reconciliation_runs.account_id', '=', 'app.trading_accounts.id')
        .where('app.account_reconciliation_runs.status', '=', 'mismatched')
        .as('last_mismatch_at'),
    ])
    .where((eb) =>
      eb.or([
        eb('app.trading_accounts.integrity_hold', '=', true),
        eb.exists(
          eb
            .selectFrom('app.operations_incidents')
            .select('app.operations_incidents.id')
            .whereRef('app.operations_incidents.account_id', '=', 'app.trading_accounts.id')
            .where('app.operations_incidents.status', '=', 'open'),
        ),
        eb.exists(
          eb
            .selectFrom('app.account_reconciliation_runs')
            .select('app.account_reconciliation_runs.id')
            .whereRef('app.account_reconciliation_runs.account_id', '=', 'app.trading_accounts.id')
            .where('app.account_reconciliation_runs.status', '=', 'mismatched'),
        ),
      ]),
    )
    // Integrity holds first — they block the trader and cannot clear while
    // reconciliation fails, so they are the work.
    .orderBy('app.trading_accounts.integrity_hold', 'desc')
    .orderBy('app.trading_accounts.created_at', 'desc')
    .limit(limit)
    .execute();

  return rows.map((row) => ({
    accountId: row.id,
    accountPublicId: row.public_id,
    programType: row.program_type,
    status: row.status,
    integrityHold: row.integrity_hold,
    integrityHoldReason: row.integrity_hold_reason,
    integrityHoldSetAt: row.integrity_hold_set_at,
    openIncidents: Number(row.open_incidents ?? 0),
    criticalIncidents: Number(row.critical_incidents ?? 0),
    violations: Number(row.violations ?? 0),
    lastMismatchAt: row.last_mismatch_at,
  }));
}

export interface RiskInvestigationDetail {
  /** Always present: the minimum identity needed to name the case. */
  identity: {
    accountId: string;
    accountPublicId: string;
    programType: string;
    status: string;
  };
  risk?: {
    integrityHold: boolean;
    integrityHoldReason: string | null;
    integrityHoldSetAt: Date | null;
    violations: readonly {
      ruleCode: string;
      severity: string;
      consequence: string;
      thresholdValue: string | null;
      observedValue: string | null;
      occurredAt: Date;
    }[];
    snapshots: readonly {
      tradingDay: string;
      dailyReference: string;
      maximumLossFloorBefore: string;
      maximumLossFloorAfter: string | null;
      status: string;
    }[];
  };
  reconciliationEvidence?: {
    runs: readonly {
      id: string;
      status: string;
      storedAccountBalance: string;
      reconstructedAccountBalance: string;
      storedProgramEligibleBalance: string;
      reconstructedProgramEligibleBalance: string;
      incidentId: string | null;
      executedAt: Date;
    }[];
  };
  incidentEvidence?: {
    incidents: readonly {
      id: string;
      incidentCode: string;
      severity: string;
      status: string;
      evidence: unknown;
      openedAt: Date;
      resolvedAt: Date | null;
      resolutionReason: string | null;
    }[];
  };
}

export async function loadRiskInvestigation(
  db: Db,
  params: { accountId: string; sections: ReadonlySet<RiskInvestigationSection> },
): Promise<RiskInvestigationDetail | null> {
  const { accountId, sections } = params;

  const account = await db
    .selectFrom('app.trading_accounts')
    // Selected columns are the whole PII boundary: identity enough to name
    // the case, nothing about the person behind it.
    .select([
      'id',
      'public_id',
      'program_type',
      'status',
      'integrity_hold',
      'integrity_hold_reason',
      'integrity_hold_set_at',
    ])
    .where('id', '=', accountId)
    .executeTakeFirst();
  if (!account) return null;

  const detail: RiskInvestigationDetail = {
    identity: {
      accountId: account.id,
      accountPublicId: account.public_id,
      programType: account.program_type,
      status: account.status,
    },
  };

  if (sections.has('risk')) {
    const [violations, snapshots] = await Promise.all([
      db
        .selectFrom('app.risk_violations')
        .select([
          'rule_code',
          'severity',
          'consequence',
          'threshold_value',
          'observed_value',
          'occurred_at',
        ])
        .where('account_id', '=', accountId)
        .orderBy('occurred_at', 'desc')
        .limit(50)
        .execute(),
      db
        .selectFrom('app.account_daily_snapshots')
        .select([
          'trading_day',
          'daily_reference',
          'maximum_loss_floor_before',
          'maximum_loss_floor_after',
          'status',
        ])
        .where('account_id', '=', accountId)
        .orderBy('trading_day', 'desc')
        .limit(10)
        .execute(),
    ]);
    detail.risk = {
      integrityHold: account.integrity_hold,
      integrityHoldReason: account.integrity_hold_reason,
      integrityHoldSetAt: account.integrity_hold_set_at,
      violations: violations.map((row) => ({
        ruleCode: row.rule_code,
        severity: row.severity,
        consequence: row.consequence,
        thresholdValue: row.threshold_value,
        observedValue: row.observed_value,
        occurredAt: row.occurred_at,
      })),
      snapshots: snapshots.map((row) => ({
        tradingDay: row.trading_day,
        dailyReference: row.daily_reference,
        maximumLossFloorBefore: row.maximum_loss_floor_before,
        maximumLossFloorAfter: row.maximum_loss_floor_after,
        status: row.status,
      })),
    };
  }

  if (sections.has('reconciliation_evidence')) {
    const runs = await db
      .selectFrom('app.account_reconciliation_runs')
      .select([
        'id',
        'status',
        'stored_account_balance',
        'reconstructed_account_balance',
        'stored_program_eligible_balance',
        'reconstructed_program_eligible_balance',
        'incident_id',
        'executed_at',
      ])
      .where('account_id', '=', accountId)
      .orderBy('executed_at', 'desc')
      .limit(25)
      .execute();
    detail.reconciliationEvidence = {
      runs: runs.map((row) => ({
        id: row.id,
        status: row.status,
        storedAccountBalance: row.stored_account_balance,
        reconstructedAccountBalance: row.reconstructed_account_balance,
        storedProgramEligibleBalance: row.stored_program_eligible_balance,
        reconstructedProgramEligibleBalance: row.reconstructed_program_eligible_balance,
        incidentId: row.incident_id,
        executedAt: row.executed_at,
      })),
    };
  }

  if (sections.has('incident_evidence')) {
    const incidents = await db
      .selectFrom('app.operations_incidents')
      .select([
        'id',
        'incident_code',
        'severity',
        'status',
        'evidence',
        'opened_at',
        'resolved_at',
        'resolution_reason',
      ])
      .where('account_id', '=', accountId)
      .orderBy('opened_at', 'desc')
      .limit(25)
      .execute();
    detail.incidentEvidence = {
      incidents: incidents.map((row) => ({
        id: row.id,
        incidentCode: row.incident_code,
        severity: row.severity,
        status: row.status,
        evidence: row.evidence,
        openedAt: row.opened_at,
        resolvedAt: row.resolved_at,
        resolutionReason: row.resolution_reason,
      })),
    };
  }

  return detail;
}
