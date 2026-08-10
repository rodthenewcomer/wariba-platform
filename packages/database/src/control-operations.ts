import { sql } from 'kysely';
import type { Db } from './client';

/**
 * Prompt 09 — read models for the Incidents console and Market Operations.
 *
 * Both are strictly read-only, and the Incidents one deliberately so.
 * Incident resolution already has two authoritative owners:
 * `clearAccountIntegrityHoldInTransaction`, which refuses to close an
 * account incident while reconciliation still fails, and
 * `reconcileOperationalAlerts`, which closes a platform alert the moment its
 * condition clears. A manual "resolve" button in Control would be a third
 * path that knows neither of those rules — it could mark a reconciliation
 * failure resolved while the ledger was still wrong. So the console shows
 * incidents and routes operators to the domain that owns the fix.
 */
export type IncidentScope = 'account' | 'platform';

export interface ControlIncidentRow {
  id: string;
  incidentCode: string;
  severity: string;
  status: string;
  scope: IncidentScope;
  accountId: string | null;
  accountPublicId: string | null;
  payoutRequestId: string | null;
  evidence: unknown;
  openedAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolutionReason: string | null;
}

export interface ControlIncidentPage {
  incidents: readonly ControlIncidentRow[];
  total: number;
  page: number;
  pageSize: number;
  openCount: number;
  criticalOpenCount: number;
}

export interface ControlIncidentFilters {
  status?: 'open' | 'resolved';
  severity?: 'warning' | 'critical';
  incidentCode?: string;
  scope?: IncidentScope;
}

export const CONTROL_INCIDENTS_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function searchControlIncidents(
  db: Db,
  params: { filters?: ControlIncidentFilters; page?: number; pageSize?: number } = {},
): Promise<ControlIncidentPage> {
  const filters = params.filters ?? {};
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.pageSize ?? CONTROL_INCIDENTS_PAGE_SIZE),
  );

  let base = db
    .selectFrom('app.operations_incidents')
    .leftJoin(
      'app.trading_accounts',
      'app.trading_accounts.id',
      'app.operations_incidents.account_id',
    );

  if (filters.status) base = base.where('app.operations_incidents.status', '=', filters.status);
  if (filters.severity) {
    base = base.where('app.operations_incidents.severity', '=', filters.severity);
  }
  if (filters.incidentCode) {
    base = base.where('app.operations_incidents.incident_code', '=', filters.incidentCode);
  }
  if (filters.scope === 'account') {
    base = base.where('app.operations_incidents.account_id', 'is not', null);
  } else if (filters.scope === 'platform') {
    base = base.where('app.operations_incidents.account_id', 'is', null);
  }

  const [rows, totals, open] = await Promise.all([
    base
      .select([
        'app.operations_incidents.id',
        'app.operations_incidents.incident_code',
        'app.operations_incidents.severity',
        'app.operations_incidents.status',
        'app.operations_incidents.account_id',
        'app.trading_accounts.public_id as account_public_id',
        'app.operations_incidents.payout_request_id',
        'app.operations_incidents.evidence',
        'app.operations_incidents.opened_at',
        'app.operations_incidents.resolved_at',
        'app.operations_incidents.resolved_by',
        'app.operations_incidents.resolution_reason',
      ])
      // Open first, then most recent: an operator opening this page is
      // looking for what is still wrong, not for history.
      // Qualified: the join brings a second `status` column into scope.
      .orderBy(sql`case when app.operations_incidents.status = 'open' then 0 else 1 end`)
      .orderBy('app.operations_incidents.opened_at', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute(),
    base.select((eb) => eb.fn.countAll().as('count')).executeTakeFirst(),
    db
      .selectFrom('app.operations_incidents')
      .select((eb) => [
        eb.fn.countAll().as('open_count'),
        sql<string>`count(*) filter (where severity = 'critical')`.as('critical_count'),
      ])
      .where('status', '=', 'open')
      .executeTakeFirst(),
  ]);

  return {
    incidents: rows.map((row) => ({
      id: row.id,
      incidentCode: row.incident_code,
      severity: row.severity,
      status: row.status,
      scope: row.account_id ? 'account' : 'platform',
      accountId: row.account_id,
      accountPublicId: row.account_public_id,
      payoutRequestId: row.payout_request_id,
      evidence: row.evidence,
      openedAt: row.opened_at,
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by,
      resolutionReason: row.resolution_reason,
    })),
    total: Number(totals?.count ?? 0),
    page,
    pageSize,
    openCount: Number(open?.open_count ?? 0),
    criticalOpenCount: Number(open?.critical_count ?? 0),
  };
}

/** Incident codes actually present, so filters offer only what exists. */
export async function loadIncidentCodes(db: Db): Promise<readonly string[]> {
  const rows = await db
    .selectFrom('app.operations_incidents')
    .select('incident_code')
    .distinct()
    .orderBy('incident_code')
    .execute();
  return rows.map((row) => row.incident_code);
}

export interface MarketOperationsState {
  leadership: {
    serviceName: string;
    leaderInstanceId: string | null;
    fencingEpoch: string;
    leaseExpiresAt: Date;
    leaseIsCurrent: boolean;
    acquiredAt: Date | null;
    renewedAt: Date | null;
    previousLeaderInstanceId: string | null;
    takeoverCount: number;
    databaseNow: Date;
  };
  /** Open platform-scoped alerts — the persisted view of feed and HA health. */
  openAlerts: readonly {
    incidentCode: string;
    severity: string;
    evidence: unknown;
    openedAt: Date;
  }[];
}

/**
 * Market Operations reads the durable truth: the leadership lease row and
 * the platform alerts the leader itself persists. Nothing here reaches into
 * a provider or exposes a credential — the realtime service owns its
 * secrets, and Control never sees them.
 */
export async function loadMarketOperationsState(db: Db): Promise<MarketOperationsState> {
  const [lease, alerts] = await Promise.all([
    db
      .selectFrom('app.realtime_leadership')
      .selectAll()
      .select(sql<Date>`current_timestamp`.as('database_now'))
      .where('service_name', '=', 'market-trigger-writer')
      .executeTakeFirstOrThrow(),
    db
      .selectFrom('app.operations_incidents')
      .select(['incident_code', 'severity', 'evidence', 'opened_at'])
      .where('status', '=', 'open')
      .where('account_id', 'is', null)
      .orderBy('opened_at', 'desc')
      .execute(),
  ]);

  // The lease column carries an "already expired" sentinel on a fresh
  // database; coerce defensively so an unreadable value reads as expired
  // rather than as a live leader. Same reasoning as realtime-leadership.ts.
  const leaseExpiresAt =
    lease.lease_expires_at instanceof Date ? lease.lease_expires_at : new Date(0);

  return {
    leadership: {
      serviceName: lease.service_name,
      leaderInstanceId: lease.leader_instance_id,
      fencingEpoch: lease.fencing_epoch,
      leaseExpiresAt,
      leaseIsCurrent: leaseExpiresAt.getTime() > lease.database_now.getTime(),
      acquiredAt: lease.acquired_at,
      renewedAt: lease.renewed_at,
      previousLeaderInstanceId: lease.previous_leader_instance_id,
      takeoverCount: lease.takeover_count,
      databaseNow: lease.database_now,
    },
    openAlerts: alerts.map((row) => ({
      incidentCode: row.incident_code,
      severity: row.severity,
      evidence: row.evidence,
      openedAt: row.opened_at,
    })),
  };
}
