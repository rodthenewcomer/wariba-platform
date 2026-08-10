import { describe, expect, it } from 'vitest';
import type { StaffRole } from '@wariba/database';
import {
  ACCOUNT_SECTIONS,
  ACCOUNT_SECTION_PERMISSION,
  authorizedAccountSections,
  canReadAccountSection,
  type AccountSection,
} from '../src/control-account-sections';

const ROLES: readonly StaffRole[] = [
  'support',
  'risk',
  'finance',
  'compliance',
  'admin',
  'super_admin',
];

/**
 * Prompt 09 — the account detail is an aggregation surface, and this is the
 * matrix that stops it becoming a privilege-aggregation surface. Each
 * section is asserted in both directions, because the property that matters
 * is not "risk can see risk evidence" — it is "support cannot".
 */
const EXPECTED_READERS: Record<AccountSection, readonly StaffRole[]> = {
  overview: ['support', 'admin', 'super_admin'],
  trading: ['support', 'admin', 'super_admin'],
  risk: ['risk', 'admin', 'super_admin'],
  payout: ['support', 'finance', 'admin', 'super_admin'],
  audit_evidence: ['compliance', 'admin', 'super_admin'],
  incident_evidence: ['risk', 'finance', 'admin', 'super_admin'],
  reconciliation_evidence: ['risk', 'finance', 'admin', 'super_admin'],
};

describe('account detail section authorization', () => {
  it('covers every declared section', () => {
    expect([...ACCOUNT_SECTIONS].sort()).toEqual(Object.keys(EXPECTED_READERS).sort());
  });

  it('grants each section to exactly the intended roles, and no others', () => {
    for (const [section, allowed] of Object.entries(EXPECTED_READERS) as [
      AccountSection,
      readonly StaffRole[],
    ][]) {
      for (const role of ROLES) {
        expect(
          canReadAccountSection(role, section),
          `${role} reading ${section} should be ${allowed.includes(role)}`,
        ).toBe(allowed.includes(role));
      }
    }
  });

  it('does not let account.view alone reach risk, audit, incident or reconciliation evidence', () => {
    // Support holds account.view and nothing else. Opening an account must
    // not hand it every domain the page happens to aggregate.
    expect(canReadAccountSection('support', 'overview')).toBe(true);
    expect(canReadAccountSection('support', 'trading')).toBe(true);
    expect(canReadAccountSection('support', 'risk')).toBe(false);
    expect(canReadAccountSection('support', 'audit_evidence')).toBe(false);
    expect(canReadAccountSection('support', 'incident_evidence')).toBe(false);
    expect(canReadAccountSection('support', 'reconciliation_evidence')).toBe(false);
  });

  it('gates reconciliation evidence on reconciliation.view — risk and finance, nobody else scoped', () => {
    expect(canReadAccountSection('risk', 'reconciliation_evidence')).toBe(true);
    expect(canReadAccountSection('finance', 'reconciliation_evidence')).toBe(true);
    expect(canReadAccountSection('support', 'reconciliation_evidence')).toBe(false);
    expect(canReadAccountSection('compliance', 'reconciliation_evidence')).toBe(false);
    expect(canReadAccountSection('admin', 'reconciliation_evidence')).toBe(true);
    expect(canReadAccountSection('super_admin', 'reconciliation_evidence')).toBe(true);
    // Named on its own authority, not borrowed from an adjacent domain.
    expect(ACCOUNT_SECTION_PERMISSION.reconciliation_evidence).toBe('reconciliation.view');
  });

  it('never substitutes treasury.view, risk.view or audit_evidence.view for reconciliation.view', () => {
    // Compliance holds audit_evidence.view; finance holds treasury.view.
    // Neither may become a back door into ledger reconstruction, and
    // reconciliation.view must not silently be one of those authorities.
    expect(ACCOUNT_SECTION_PERMISSION.reconciliation_evidence).not.toBe('treasury.view');
    expect(ACCOUNT_SECTION_PERMISSION.reconciliation_evidence).not.toBe('risk.view');
    expect(ACCOUNT_SECTION_PERMISSION.reconciliation_evidence).not.toBe('audit_evidence.view');
    expect(canReadAccountSection('compliance', 'reconciliation_evidence')).toBe(false);
  });

  it('keeps payout evidence separate from payout mutation authority', () => {
    // Support can read the payout section; approving remains finance-only,
    // enforced at the mutation, not here.
    expect(ACCOUNT_SECTION_PERMISSION.payout).toBe('payout.view');
    expect(canReadAccountSection('support', 'payout')).toBe(true);
  });

  it('gates every section on a read authority, never on a mutation authority', () => {
    for (const section of ACCOUNT_SECTIONS) {
      expect(ACCOUNT_SECTION_PERMISSION[section]).toMatch(/\.view$/);
    }
  });

  it('resolves admin and super_admin to every section', () => {
    for (const role of ['admin', 'super_admin'] as const) {
      expect([...authorizedAccountSections(role)].sort()).toEqual([...ACCOUNT_SECTIONS].sort());
    }
  });

  it('resolves each scoped role to exactly its own sections', () => {
    expect([...authorizedAccountSections('support')].sort()).toEqual(
      ['overview', 'payout', 'trading'].sort(),
    );
    expect([...authorizedAccountSections('risk')].sort()).toEqual(
      ['incident_evidence', 'reconciliation_evidence', 'risk'].sort(),
    );
    expect([...authorizedAccountSections('finance')].sort()).toEqual(
      ['incident_evidence', 'payout', 'reconciliation_evidence'].sort(),
    );
    expect([...authorizedAccountSections('compliance')].sort()).toEqual(['audit_evidence']);
  });
});
