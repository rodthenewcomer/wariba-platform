import { describe, expect, it } from 'vitest';
import type { AccountSummaryDTO } from '@wariba/application';
import { resolveWorkstationAccount } from '../app/(trade)/trade/account-selection';

function account(overrides: Partial<AccountSummaryDTO> & { id: string }): AccountSummaryDTO {
  return {
    publicId: `PUB-${overrides.id}`,
    programType: 'WARIBA_ONE',
    productFamily: 'WARIBA_ONE',
    accountPhase: 'evaluation',
    nominalBalance: '10000.00',
    nominalCurrency: 'USD',
    status: 'active',
    policyVersionId: '00000000-0000-0000-0000-000000000001',
    policyVersion: '1.0.0',
    policyStatus: 'published',
    createdAt: '2026-01-01T00:00:00.000Z',
    kycSandboxVerified: false,
    payoutMethodConfigured: false,
    sourceEvaluationAccountId: null,
    sourceEvaluationPublicId: null,
    performanceAccountId: null,
    performanceAccountPublicId: null,
    ...overrides,
  };
}

/**
 * W1 §5/§26 — the account a `/trade` request resolves to.
 *
 * The list handed to this function is always `listAccountsForUser(userId)`
 * for the authenticated session, so "trader B's account" is modelled the only
 * way it can actually occur: an id that is not in the list.
 */
describe('resolveWorkstationAccount', () => {
  const a1 = account({ id: 'A1' });
  const a2 = account({ id: 'A2', programType: 'WARIBA_PERFORMANCE' });
  const own = [a1, a2];

  it('returns the requested account when the trader owns it', () => {
    expect(resolveWorkstationAccount(own, 'A2')).toBe(a2);
  });

  it('returns each owned account in turn — switching A1 → A2 → A1', () => {
    expect(resolveWorkstationAccount(own, 'A1')).toBe(a1);
    expect(resolveWorkstationAccount(own, 'A2')).toBe(a2);
    expect(resolveWorkstationAccount(own, 'A1')).toBe(a1);
  });

  it('refuses a foreign account id and falls back to the trader’s own default', () => {
    // B1 belongs to another trader, so it is absent from this list by
    // construction — there is no branch that can return it.
    const resolved = resolveWorkstationAccount(own, 'B1');
    expect(resolved).toBe(a1);
    expect(resolved?.id).not.toBe('B1');
  });

  it('falls back to the canonical first account for an unknown or malformed id', () => {
    expect(resolveWorkstationAccount(own, '')).toBe(a1);
    expect(resolveWorkstationAccount(own, '../../etc/passwd')).toBe(a1);
    expect(resolveWorkstationAccount(own, undefined)).toBe(a1);
  });

  it('uses the list’s existing attention-first ordering as the default, not its own rule', () => {
    // listAccountsForUser already sorts breached/soft-locked first; the
    // default must be that ordering's head, never a second "latest" rule.
    const breachedFirst = [account({ id: 'A3', status: 'breached' }), a1, a2];
    expect(resolveWorkstationAccount(breachedFirst, undefined)?.id).toBe('A3');
  });

  it('returns null only when the trader has no accounts', () => {
    expect(resolveWorkstationAccount([], undefined)).toBeNull();
    expect(resolveWorkstationAccount([], 'A1')).toBeNull();
  });
});
