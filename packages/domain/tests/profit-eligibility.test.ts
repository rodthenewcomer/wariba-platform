import { describe, expect, it } from 'vitest';
import {
  computeProfitEligibility,
  MINIMUM_PROFIT_ELIGIBLE_DURATION_MS,
  evaluateShortDurationMonitoring,
} from '../src/profit-eligibility';

const OPENED_AT = new Date('2026-08-05T00:00:00.000Z');

function closedAtPlusMs(ms: number): Date {
  return new Date(OPENED_AT.getTime() + ms);
}

describe('computeProfitEligibility — Prompt 07B §4', () => {
  it('keeps a short positive close eligible when a legacy pinned policy disables the threshold', () => {
    const result = computeProfitEligibility({
      openedAt: OPENED_AT,
      closedAt: closedAtPlusMs(1_000),
      realizedPnl: '10.00',
      minimumEligibleDurationMs: 0,
    });
    expect(result.isShortDurationProfit).toBe(false);
    expect(result.eligibleRealizedPnl).toBe('10.00');
  });

  it('is fully eligible for a positive PnL held at exactly the 60s boundary', () => {
    const result = computeProfitEligibility({
      openedAt: OPENED_AT,
      closedAt: closedAtPlusMs(MINIMUM_PROFIT_ELIGIBLE_DURATION_MS),
      realizedPnl: '25.00',
    });
    expect(result.isShortDurationProfit).toBe(false);
    expect(result.eligibleRealizedPnl).toBe('25.00');
    expect(result.ineligibleShortDurationProfit).toBe('0.00');
    expect(result.netRealizedPnl).toBe('25.00');
    expect(result.eligibilityReason).toBe('eligible');
  });

  it('is NOT eligible for a positive PnL held 1ms under the 60s boundary', () => {
    const result = computeProfitEligibility({
      openedAt: OPENED_AT,
      closedAt: closedAtPlusMs(MINIMUM_PROFIT_ELIGIBLE_DURATION_MS - 1),
      realizedPnl: '25.00',
    });
    expect(result.isShortDurationProfit).toBe(true);
    expect(result.eligibleRealizedPnl).toBe('0.00');
    expect(result.ineligibleShortDurationProfit).toBe('25.00');
    expect(result.eligibilityReason).toBe('short_duration_profit');
  });

  it('counts a negative PnL in full regardless of how short the duration is', () => {
    const result = computeProfitEligibility({
      openedAt: OPENED_AT,
      closedAt: closedAtPlusMs(500),
      realizedPnl: '-40.00',
    });
    expect(result.isShortDurationProfit).toBe(false);
    expect(result.eligibleRealizedPnl).toBe('-40.00');
    expect(result.ineligibleShortDurationProfit).toBe('0.00');
    expect(result.eligibilityReason).toBe('loss_counted');
  });

  it('produces no eligible profit for a zero PnL close', () => {
    const result = computeProfitEligibility({
      openedAt: OPENED_AT,
      closedAt: closedAtPlusMs(1000),
      realizedPnl: '0.00',
    });
    expect(result.eligibleRealizedPnl).toBe('0.00');
    expect(result.ineligibleShortDurationProfit).toBe('0.00');
    expect(result.isShortDurationProfit).toBe(false);
    expect(result.eligibilityReason).toBe('breakeven');
  });

  it('is fully eligible for a positive PnL held well over 60s', () => {
    const result = computeProfitEligibility({
      openedAt: OPENED_AT,
      closedAt: closedAtPlusMs(5 * 60_000),
      realizedPnl: '100.00',
    });
    expect(result.isShortDurationProfit).toBe(false);
    expect(result.eligibleRealizedPnl).toBe('100.00');
  });

  it('reports the exact duration in milliseconds', () => {
    const result = computeProfitEligibility({
      openedAt: OPENED_AT,
      closedAt: closedAtPlusMs(12_345),
      realizedPnl: '1.00',
    });
    expect(result.durationMs).toBe(12_345);
  });

  it('uses net PnL after fees, so fees can turn gross profit into a counted loss', () => {
    const result = computeProfitEligibility({
      openedAt: OPENED_AT,
      closedAt: closedAtPlusMs(500),
      realizedPnl: '5.00',
      allocatedFees: '8.00',
    });
    expect(result.netRealizedPnl).toBe('-3.00');
    expect(result.eligibleRealizedPnl).toBe('-3.00');
    expect(result.ineligibleShortDurationProfit).toBe('0.00');
    expect(result.isShortDurationProfit).toBe(false);
    expect(result.eligibilityReason).toBe('loss_counted');
  });
});

describe('evaluateShortDurationMonitoring — Prompt 07B rolling 24h monitoring', () => {
  it('is normal under the warning threshold', () => {
    expect(evaluateShortDurationMonitoring(2).status).toBe('normal');
    expect(evaluateShortDurationMonitoring(2).shouldLogSignal).toBe(false);
  });

  it('warns at exactly 3 in 24h without locking entry', () => {
    const result = evaluateShortDurationMonitoring(3);
    expect(result.status).toBe('warning');
    expect(result.shouldLogSignal).toBe(true);
  });

  it('stays at warning between 3 and 5', () => {
    expect(evaluateShortDurationMonitoring(5).status).toBe('warning');
    expect(evaluateShortDurationMonitoring(5).shouldLogSignal).toBe(false);
  });

  it('locks entry at exactly 6 in 24h — never a permanent breach', () => {
    const result = evaluateShortDurationMonitoring(6);
    expect(result.status).toBe('entry_locked');
    expect(result.shouldLogSignal).toBe(true);
  });

  it('stays entry_locked above 6', () => {
    expect(evaluateShortDurationMonitoring(20).status).toBe('entry_locked');
    expect(evaluateShortDurationMonitoring(20).shouldLogSignal).toBe(false);
  });
});
