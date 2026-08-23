import { describe, expect, it } from 'vitest';
import { ACCOUNT_STATUS_LABEL, accountStatusLabel } from '../src/account-status-labels';

/**
 * The eight statuses `app.trading_accounts.status` can hold. If a migration
 * adds a ninth, this test is where the omission surfaces — rather than on a
 * trader's activity feed, which is where the last one surfaced.
 */
const DB_STATUSES = [
  'pending_activation',
  'active',
  'soft_locked',
  'pass_pending',
  'inactive',
  'passed',
  'breached',
  'closed',
] as const;

describe('account status labels', () => {
  it('speaks French for every status the schema can hold', () => {
    for (const status of DB_STATUSES) {
      const label = accountStatusLabel(status);
      expect(label).not.toBe(status);
      expect(label).not.toMatch(/_/);
    }
    expect(Object.keys(ACCOUNT_STATUS_LABEL)).toHaveLength(DB_STATUSES.length);
  });

  it('shows an unknown status as itself rather than guessing', () => {
    // Ugly and unmistakable beats a plausible label that hides a schema change.
    expect(accountStatusLabel('quantum_superposition')).toBe('quantum_superposition');
  });
});
