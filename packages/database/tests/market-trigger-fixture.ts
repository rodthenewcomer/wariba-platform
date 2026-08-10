import {
  acquireOrRenewRealtimeLeadership,
  evaluateAlerts,
  executeQueuedReductions,
  triggerPendingOrders,
  triggerPositionProtections,
  type Db,
  type LeadershipToken,
} from '../src/index';

/**
 * Appendix 08-A — market-trigger entry points now require fencing evidence
 * at compile time (see MarketMutationExecution). These integration tests are
 * standing in for the leader's tick loop, so the honest thing is for them to
 * actually hold the lease rather than to weaken the signature.
 *
 * The lease is acquired once per process and renewed on demand: acquiring is
 * idempotent for the same instance id, so repeated calls extend the same
 * epoch instead of forcing a takeover. Tests that deliberately exercise
 * takeover or staleness (realtime-leadership.integration.test.ts) drive the
 * leadership API directly and do not use this helper.
 */
const TEST_LEADER_INSTANCE_ID = 'integration-test-market-trigger';
const LEASE_DURATION_MS = 60_000;

export async function acquireTestLeadership(db: Db): Promise<LeadershipToken> {
  const result = await acquireOrRenewRealtimeLeadership(db, {
    instanceId: TEST_LEADER_INSTANCE_ID,
    leaseDurationMs: LEASE_DURATION_MS,
  });
  if (result.role === 'leader') return result.token;

  // Another instance holds a live lease. In production that is exactly the
  // right answer — a standby must not write. In this suite it only means a
  // sibling test (realtime-leadership.integration.test.ts drives the
  // leadership API directly and leaves node-b holding a short lease) has
  // not expired yet, and every test here owns the database outright. So
  // expire the stale holder and take over rather than failing tests for a
  // reason that has nothing to do with what they assert.
  await db
    .updateTable('app.realtime_leadership')
    .set({ lease_expires_at: new Date(0) })
    .where('service_name', '=', 'market-trigger-writer')
    .execute();
  const retry = await acquireOrRenewRealtimeLeadership(db, {
    instanceId: TEST_LEADER_INSTANCE_ID,
    leaseDurationMs: LEASE_DURATION_MS,
  });
  if (retry.role !== 'leader') {
    throw new Error(
      `Test leadership was not granted after expiring the stale lease (holder: ${retry.state.leaderInstanceId ?? 'unknown'}).`,
    );
  }
  return retry.token;
}

type WithoutFencing<T> = Omit<T, 'fencingToken'>;

export async function triggerPendingOrdersAsLeader(
  db: Db,
  params: WithoutFencing<Parameters<typeof triggerPendingOrders>[1]>,
): Promise<ReturnType<typeof triggerPendingOrders>> {
  return triggerPendingOrders(db, { ...params, fencingToken: await acquireTestLeadership(db) });
}

export async function evaluateAlertsAsLeader(
  db: Db,
  params: WithoutFencing<Parameters<typeof evaluateAlerts>[1]>,
): Promise<ReturnType<typeof evaluateAlerts>> {
  return evaluateAlerts(db, { ...params, fencingToken: await acquireTestLeadership(db) });
}

export async function executeQueuedReductionsAsLeader(
  db: Db,
  params: WithoutFencing<Parameters<typeof executeQueuedReductions>[1]>,
): Promise<ReturnType<typeof executeQueuedReductions>> {
  return executeQueuedReductions(db, { ...params, fencingToken: await acquireTestLeadership(db) });
}

export async function triggerPositionProtectionsAsLeader(
  db: Db,
  params: WithoutFencing<Parameters<typeof triggerPositionProtections>[1]>,
): Promise<ReturnType<typeof triggerPositionProtections>> {
  return triggerPositionProtections(db, {
    ...params,
    fencingToken: await acquireTestLeadership(db),
  });
}
