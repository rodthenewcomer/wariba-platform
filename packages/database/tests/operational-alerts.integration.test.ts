import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import {
  OPERATIONAL_ALERT,
  reconcileOperationalAlerts,
  loadDatabaseAlertSignals,
  type OperationalAlertSignals,
} from '../src/operational-alerts';

const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

const HEALTHY: OperationalAlertSignals = {
  leaderInstanceId: 'realtime-a',
  standbyReady: true,
  lastTakeoverDurationMs: 1_000,
  takeoverTargetMs: 10_000,
  staleSymbols: [],
  outageSymbols: [],
  reconciliationMismatchCount: 0,
  ledgerImbalanceCount: 0,
  stalledPayoutCount: 0,
  reserveCoverageRatio: '2.5',
  failedDailyFinalizationCount: 0,
};

describeIfDb('operational alerts — real database', () => {
  let db: Db;

  const openSystemIncidents = async () =>
    db
      .selectFrom('app.operations_incidents')
      .select(['incident_code', 'severity'])
      .where('status', '=', 'open')
      .where('account_id', 'is', null)
      .orderBy('incident_code')
      .execute();

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
  }, 15000);

  /**
   * P09-QA-FLAKE-001. These assertions describe transitions from a known
   * state, so they have to *establish* that state rather than assume it.
   *
   * Platform alerts are opened by a real writer: OperationalAlertMonitor in
   * the realtime service, which runs during the E2E, recovery and failover
   * suites. A single instance legitimately reports NO_STANDBY_READY, and a
   * sandbox with no reserve entries legitimately reports
   * TREASURY_RESERVE_DEFENSIVE. Whichever of those were still open when this
   * file started were then correctly auto-resolved by the first reconcile
   * here — turning a healthy-platform assertion red for a reason that had
   * nothing to do with the code under test, and only when a realtime service
   * had run earlier in the same session.
   *
   * Cleaning before as well as after makes the starting state explicit
   * instead of inherited.
   */
  beforeEach(async () => {
    await db.deleteFrom('app.operations_incidents').where('account_id', 'is', null).execute();
  });

  afterEach(async () => {
    await db.deleteFrom('app.operations_incidents').where('account_id', 'is', null).execute();
  });

  afterAll(async () => {
    await db.destroy();
  }, 15000);

  it('opens one incident per firing condition and none when healthy', async () => {
    expect(await reconcileOperationalAlerts(db, { signals: HEALTHY, now: new Date() })).toEqual({
      opened: [],
      stillOpen: [],
      resolved: [],
    });
    expect(await openSystemIncidents()).toEqual([]);

    const degraded = { ...HEALTHY, leaderInstanceId: null, reserveCoverageRatio: '1.1' };
    const result = await reconcileOperationalAlerts(db, { signals: degraded, now: new Date() });
    expect([...result.opened].sort()).toEqual(
      [OPERATIONAL_ALERT.LEADER_LOST, OPERATIONAL_ALERT.TREASURY_RESERVE_DEFENSIVE].sort(),
    );
    expect(await openSystemIncidents()).toEqual([
      { incident_code: OPERATIONAL_ALERT.LEADER_LOST, severity: 'critical' },
      { incident_code: OPERATIONAL_ALERT.TREASURY_RESERVE_DEFENSIVE, severity: 'critical' },
    ]);
  }, 30000);

  it('is idempotent — a condition that stays true does not open a second incident', async () => {
    const degraded = { ...HEALTHY, standbyReady: false };
    const first = await reconcileOperationalAlerts(db, { signals: degraded, now: new Date() });
    expect(first.opened).toEqual([OPERATIONAL_ALERT.NO_STANDBY_READY]);

    const second = await reconcileOperationalAlerts(db, { signals: degraded, now: new Date() });
    expect(second.opened).toEqual([]);
    expect(second.stillOpen).toEqual([OPERATIONAL_ALERT.NO_STANDBY_READY]);
    expect(await openSystemIncidents()).toHaveLength(1);
  }, 30000);

  it('auto-resolves an alert once its condition clears, with a reason and no operator', async () => {
    await reconcileOperationalAlerts(db, {
      signals: { ...HEALTHY, outageSymbols: ['EURUSD'] },
      now: new Date(),
    });
    expect(await openSystemIncidents()).toHaveLength(1);

    const recovered = await reconcileOperationalAlerts(db, {
      signals: HEALTHY,
      now: new Date(),
    });
    expect(recovered.resolved).toEqual([OPERATIONAL_ALERT.MARKET_FEED_OUTAGE]);
    expect(await openSystemIncidents()).toEqual([]);

    const resolved = await db
      .selectFrom('app.operations_incidents')
      .select(['status', 'resolved_by', 'resolution_reason'])
      .where('incident_code', '=', OPERATIONAL_ALERT.MARKET_FEED_OUTAGE)
      .executeTakeFirstOrThrow();
    expect(resolved.status).toBe('resolved');
    // Null resolved_by is the documented marker for platform resolution.
    expect(resolved.resolved_by).toBeNull();
    expect(resolved.resolution_reason).toContain('automatically');
  }, 30000);

  it('reads its financial-integrity signals from real tables', async () => {
    const signals = await loadDatabaseAlertSignals(db);
    expect(signals.reconciliationMismatchCount).toBeGreaterThanOrEqual(0);
    expect(signals.ledgerImbalanceCount).toBeGreaterThanOrEqual(0);
    expect(signals.stalledPayoutCount).toBeGreaterThanOrEqual(0);
  }, 30000);
});
