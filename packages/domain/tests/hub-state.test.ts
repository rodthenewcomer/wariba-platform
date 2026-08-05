import { describe, expect, it } from 'vitest';
import {
  deriveHubDisplayState,
  isInAttentionZone,
  isHubStateReadOnly,
  type HubAttentionSignal,
} from '../src/hub-state';
import type { EvaluationAccountStatus } from '../src/state-machines';

const NORMAL_SIGNAL: HubAttentionSignal = {
  dailyLossFloor: '300.00',
  dailyLossUsed: '50.00',
  maximumLossRemaining: '900.00',
  maximumLossBudget: '1000.00',
};

describe('isInAttentionZone', () => {
  it('is false when both budgets are well within limits', () => {
    expect(isInAttentionZone(NORMAL_SIGNAL)).toBe(false);
  });

  it('flips on at exactly 70% of the daily loss budget used', () => {
    expect(isInAttentionZone({ ...NORMAL_SIGNAL, dailyLossUsed: '209.99' })).toBe(false);
    expect(isInAttentionZone({ ...NORMAL_SIGNAL, dailyLossUsed: '210.00' })).toBe(true);
  });

  it('flips on at exactly 30% of the maximum-loss budget remaining', () => {
    expect(isInAttentionZone({ ...NORMAL_SIGNAL, maximumLossRemaining: '300.01' })).toBe(false);
    expect(isInAttentionZone({ ...NORMAL_SIGNAL, maximumLossRemaining: '300.00' })).toBe(true);
  });

  it('never divides by zero when the daily loss floor is exhausted', () => {
    expect(
      isInAttentionZone({ ...NORMAL_SIGNAL, dailyLossFloor: '0.00', dailyLossUsed: '0.00' }),
    ).toBe(false);
  });
});

describe('deriveHubDisplayState', () => {
  const STRAIGHT_MAPPINGS: [EvaluationAccountStatus, ReturnType<typeof deriveHubDisplayState>][] = [
    ['pending_activation', 'pending_activation'],
    ['inactive', 'inactive'],
    ['closed', 'closed'],
    ['passed', 'passed'],
    ['breached', 'breached'],
    ['soft_locked', 'soft_locked'],
    ['pass_pending', 'target_waiting'],
  ];

  it.each(STRAIGHT_MAPPINGS)('maps DB status %s to display state %s', (accountStatus, expected) => {
    expect(deriveHubDisplayState({ accountStatus, attention: NORMAL_SIGNAL })).toBe(expected);
  });

  it('splits "active" into active vs attention using the risk signal, never the DB alone', () => {
    expect(deriveHubDisplayState({ accountStatus: 'active', attention: NORMAL_SIGNAL })).toBe(
      'active',
    );
    expect(
      deriveHubDisplayState({
        accountStatus: 'active',
        attention: { ...NORMAL_SIGNAL, dailyLossUsed: '250.00' },
      }),
    ).toBe('attention');
  });
});

describe('isHubStateReadOnly', () => {
  it('is true only for breached and closed', () => {
    expect(isHubStateReadOnly('breached')).toBe(true);
    expect(isHubStateReadOnly('closed')).toBe(true);
    expect(isHubStateReadOnly('active')).toBe(false);
    expect(isHubStateReadOnly('passed')).toBe(false);
    expect(isHubStateReadOnly('soft_locked')).toBe(false);
  });
});
