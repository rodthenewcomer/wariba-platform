import { describe, expect, it } from 'vitest';
import {
  evaluateOperationalAlerts,
  OPERATIONAL_ALERT,
  type OperationalAlertSignals,
} from '../src/operational-alerts';

/** A completely healthy platform — every alert condition false. */
const HEALTHY: OperationalAlertSignals = {
  leaderInstanceId: 'realtime-a',
  standbyReady: true,
  lastTakeoverDurationMs: 3_893,
  takeoverTargetMs: 10_000,
  staleSymbols: [],
  outageSymbols: [],
  reconciliationMismatchCount: 0,
  ledgerImbalanceCount: 0,
  stalledPayoutCount: 0,
  reserveCoverageRatio: '2.4',
  failedDailyFinalizationCount: 0,
};

const codesOf = (signals: OperationalAlertSignals) =>
  evaluateOperationalAlerts(signals).map((alert) => alert.code);

describe('operational alert evaluation', () => {
  it('raises nothing when the platform is healthy', () => {
    expect(evaluateOperationalAlerts(HEALTHY)).toEqual([]);
  });

  it('raises a critical alert when no instance holds the lease', () => {
    const alerts = evaluateOperationalAlerts({ ...HEALTHY, leaderInstanceId: null });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.code).toBe(OPERATIONAL_ALERT.LEADER_LOST);
    expect(alerts[0]?.severity).toBe('critical');
  });

  it('does not also cry "no standby" when there is no leader at all', () => {
    // With no leader, LEADER_LOST is the actionable alert; adding
    // NO_STANDBY_READY would just be noise on the same incident.
    const codes = codesOf({ ...HEALTHY, leaderInstanceId: null, standbyReady: false });
    expect(codes).toEqual([OPERATIONAL_ALERT.LEADER_LOST]);
  });

  it('warns when a leader is running with no ready standby', () => {
    expect(codesOf({ ...HEALTHY, standbyReady: false })).toContain(
      OPERATIONAL_ALERT.NO_STANDBY_READY,
    );
  });

  it('warns only when takeover exceeded its target', () => {
    expect(codesOf({ ...HEALTHY, lastTakeoverDurationMs: 9_999 })).not.toContain(
      OPERATIONAL_ALERT.LEADER_TAKEOVER_SLOW,
    );
    expect(codesOf({ ...HEALTHY, lastTakeoverDurationMs: 10_001 })).toContain(
      OPERATIONAL_ALERT.LEADER_TAKEOVER_SLOW,
    );
  });

  it('reports stale and outage feeds separately, with the symbols as evidence', () => {
    const alerts = evaluateOperationalAlerts({
      ...HEALTHY,
      staleSymbols: ['EURUSD'],
      outageSymbols: ['XAUUSD'],
    });
    const outage = alerts.find((alert) => alert.code === OPERATIONAL_ALERT.MARKET_FEED_OUTAGE);
    const stale = alerts.find((alert) => alert.code === OPERATIONAL_ALERT.MARKET_FEED_STALE);
    expect(outage?.severity).toBe('critical');
    expect(outage?.evidence).toEqual({ symbols: ['XAUUSD'] });
    expect(stale?.severity).toBe('warning');
    expect(stale?.evidence).toEqual({ symbols: ['EURUSD'] });
  });

  it('escalates the reserve zones at 1.5x and 1.2x, never both at once', () => {
    expect(codesOf({ ...HEALTHY, reserveCoverageRatio: '1.6' })).toEqual([]);
    expect(codesOf({ ...HEALTHY, reserveCoverageRatio: '1.4' })).toEqual([
      OPERATIONAL_ALERT.TREASURY_RESERVE_PRUDENCE,
    ]);
    // Below 1.2x is the defensive alert only — an operator sees one row.
    expect(codesOf({ ...HEALTHY, reserveCoverageRatio: '1.1' })).toEqual([
      OPERATIONAL_ALERT.TREASURY_RESERVE_DEFENSIVE,
    ]);
  });

  it('stays silent on reserve when no coverage ratio can be computed', () => {
    expect(codesOf({ ...HEALTHY, reserveCoverageRatio: null })).toEqual([]);
  });

  it('raises the financial-integrity alerts from their counts', () => {
    expect(codesOf({ ...HEALTHY, reconciliationMismatchCount: 1 })).toContain(
      OPERATIONAL_ALERT.RECONCILIATION_MISMATCH,
    );
    expect(codesOf({ ...HEALTHY, ledgerImbalanceCount: 2 })).toContain(
      OPERATIONAL_ALERT.LEDGER_IMBALANCE,
    );
    expect(codesOf({ ...HEALTHY, stalledPayoutCount: 3 })).toContain(
      OPERATIONAL_ALERT.PAYOUT_PROCESSING_STALLED,
    );
    expect(codesOf({ ...HEALTHY, failedDailyFinalizationCount: 4 })).toContain(
      OPERATIONAL_ALERT.DAILY_FINALIZATION_FAILURE,
    );
  });

  it('covers every documented alert condition', () => {
    const everythingWrong = evaluateOperationalAlerts({
      leaderInstanceId: null,
      standbyReady: false,
      lastTakeoverDurationMs: 30_000,
      takeoverTargetMs: 10_000,
      staleSymbols: ['EURUSD'],
      outageSymbols: ['XAUUSD'],
      reconciliationMismatchCount: 1,
      ledgerImbalanceCount: 1,
      stalledPayoutCount: 1,
      reserveCoverageRatio: '0.9',
      failedDailyFinalizationCount: 1,
    }).map((alert) => alert.code);

    // Every code except NO_STANDBY_READY (suppressed by LEADER_LOST) and
    // TREASURY_RESERVE_PRUDENCE (superseded by DEFENSIVE) is reachable here.
    const expected = Object.values(OPERATIONAL_ALERT).filter(
      (code) =>
        code !== OPERATIONAL_ALERT.NO_STANDBY_READY &&
        code !== OPERATIONAL_ALERT.TREASURY_RESERVE_PRUDENCE,
    );
    expect([...everythingWrong].sort()).toEqual([...expected].sort());
  });
});
