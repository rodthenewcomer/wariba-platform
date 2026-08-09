import { sql } from 'kysely';
import type { Db } from './client';

export const MARKET_TRIGGER_WRITER_SERVICE = 'market-trigger-writer';

export interface LeadershipToken {
  serviceName: typeof MARKET_TRIGGER_WRITER_SERVICE;
  instanceId: string;
  fencingEpoch: string;
  leaseExpiresAt: Date;
}

export interface RealtimeLeadershipState {
  serviceName: string;
  leaderInstanceId: string | null;
  fencingEpoch: string;
  leaseExpiresAt: Date;
  acquiredAt: Date | null;
  renewedAt: Date | null;
  previousLeaderInstanceId: string | null;
  takeoverCount: number;
  databaseNow: Date;
}

export class StaleLeadershipError extends Error {
  constructor(message = 'Realtime leadership fencing token is stale.') {
    super(message);
    this.name = 'StaleLeadershipError';
  }
}

function toState(row: {
  service_name: string;
  leader_instance_id: string | null;
  fencing_epoch: string;
  lease_expires_at: Date;
  acquired_at: Date | null;
  renewed_at: Date | null;
  previous_leader_instance_id: string | null;
  takeover_count: number;
  database_now: Date;
}): RealtimeLeadershipState {
  return {
    serviceName: row.service_name,
    leaderInstanceId: row.leader_instance_id,
    fencingEpoch: row.fencing_epoch,
    leaseExpiresAt: row.lease_expires_at,
    acquiredAt: row.acquired_at,
    renewedAt: row.renewed_at,
    previousLeaderInstanceId: row.previous_leader_instance_id,
    takeoverCount: row.takeover_count,
    databaseNow: row.database_now,
  };
}

async function loadLeadershipRow(db: Db, forUpdate: boolean) {
  let query = db
    .selectFrom('app.realtime_leadership')
    .selectAll()
    .select(sql<Date>`current_timestamp`.as('database_now'))
    .where('service_name', '=', MARKET_TRIGGER_WRITER_SERVICE);
  if (forUpdate) query = query.forUpdate();
  return query.executeTakeFirstOrThrow();
}

export async function loadRealtimeLeadership(db: Db): Promise<RealtimeLeadershipState> {
  return toState(await loadLeadershipRow(db, false));
}

export async function acquireOrRenewRealtimeLeadership(
  db: Db,
  params: { instanceId: string; leaseDurationMs: number },
): Promise<
  | { role: 'leader'; token: LeadershipToken; state: RealtimeLeadershipState }
  | { role: 'standby'; token: null; state: RealtimeLeadershipState }
> {
  if (!params.instanceId.trim()) throw new Error('INSTANCE_ID is required.');
  if (params.leaseDurationMs < 1000) throw new Error('Leader lease must be at least 1000ms.');

  return db.transaction().execute(async (trx) => {
    const current = await loadLeadershipRow(trx, true);
    const leaseIsCurrent = current.lease_expires_at.getTime() > current.database_now.getTime();
    if (leaseIsCurrent && current.leader_instance_id !== params.instanceId) {
      return { role: 'standby' as const, token: null, state: toState(current) };
    }

    const renewingCurrentLease = leaseIsCurrent && current.leader_instance_id === params.instanceId;
    const nextEpoch = renewingCurrentLease
      ? current.fencing_epoch
      : (BigInt(current.fencing_epoch) + 1n).toString();
    const leaseExpiresAt = new Date(current.database_now.getTime() + params.leaseDurationMs);
    const next = await trx
      .updateTable('app.realtime_leadership')
      .set({
        leader_instance_id: params.instanceId,
        fencing_epoch: nextEpoch,
        lease_expires_at: leaseExpiresAt,
        acquired_at: renewingCurrentLease ? current.acquired_at : current.database_now,
        renewed_at: current.database_now,
        previous_leader_instance_id: renewingCurrentLease
          ? current.previous_leader_instance_id
          : current.leader_instance_id,
        takeover_count: renewingCurrentLease
          ? current.takeover_count
          : current.takeover_count + (current.leader_instance_id === null ? 0 : 1),
      })
      .where('service_name', '=', MARKET_TRIGGER_WRITER_SERVICE)
      .returningAll()
      .executeTakeFirstOrThrow();
    const state = toState({ ...next, database_now: current.database_now });
    return {
      role: 'leader' as const,
      token: {
        serviceName: MARKET_TRIGGER_WRITER_SERVICE,
        instanceId: params.instanceId,
        fencingEpoch: nextEpoch,
        leaseExpiresAt,
      },
      state,
    };
  });
}

export async function assertCurrentLeadershipInTransaction(
  trx: Db,
  token: LeadershipToken,
): Promise<void> {
  const current = await loadLeadershipRow(trx, true);
  if (
    token.serviceName !== MARKET_TRIGGER_WRITER_SERVICE ||
    current.leader_instance_id !== token.instanceId ||
    current.fencing_epoch !== token.fencingEpoch ||
    current.lease_expires_at.getTime() <= current.database_now.getTime()
  ) {
    throw new StaleLeadershipError();
  }
}

/**
 * Appendix 08-A — the execution-context boundary for financial mutations.
 *
 * A position mutation reaches the database from exactly two directions, and
 * they have opposite leadership requirements:
 *
 * - `trader_command` — a human submitted an order over their own WebSocket
 *   session. Any node may serve it; leadership is irrelevant and requiring
 *   a fencing token would break trading on every standby.
 * - `market_trigger` — leader-only tick processing decided to move money
 *   (pending order filled, SL/TP hit, queued reduction executed, alert
 *   fired). This MUST prove it still holds the lease, or a partitioned
 *   former leader could execute against a stale view of the world.
 *
 * Modelling this as a discriminated union rather than an optional token is
 * what makes the guarantee compile-time: `market_trigger` cannot be
 * constructed without a `fencingToken`, so a tick-driven caller cannot omit
 * fencing by simply forgetting a field — it has to declare itself a trader
 * command in writing, which is a reviewable lie rather than a silent hole.
 */
export type MarketMutationExecution =
  { source: 'trader_command' } | { source: 'market_trigger'; fencingToken: LeadershipToken };

/** The trader-initiated context. Named so call sites read as a decision. */
export const TRADER_COMMAND_EXECUTION: MarketMutationExecution = { source: 'trader_command' };

/** Validates leadership for `market_trigger`; a no-op for `trader_command`. */
export async function assertExecutionLeadershipInTransaction(
  trx: Db,
  execution: MarketMutationExecution,
): Promise<void> {
  if (execution.source === 'market_trigger') {
    await assertCurrentLeadershipInTransaction(trx, execution.fencingToken);
  }
}

export async function expireRealtimeLeadership(db: Db, token: LeadershipToken): Promise<boolean> {
  const result = await db
    .updateTable('app.realtime_leadership')
    .set({ lease_expires_at: sql<Date>`current_timestamp` })
    .where('service_name', '=', token.serviceName)
    .where('leader_instance_id', '=', token.instanceId)
    .where('fencing_epoch', '=', token.fencingEpoch)
    .executeTakeFirst();
  return Number(result.numUpdatedRows) === 1;
}
