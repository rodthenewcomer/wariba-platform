import { describe, expect, it } from 'vitest';
import { staffCan, staffRoleSatisfies, type ControlPermission } from '../src/staff';
import type { StaffRole } from '../src/schema';

describe('staffRoleSatisfies', () => {
  it('a role satisfies its own requirement', () => {
    const roles: StaffRole[] = ['support', 'risk', 'finance', 'compliance', 'admin', 'super_admin'];
    for (const role of roles) {
      expect(staffRoleSatisfies(role, role)).toBe(true);
    }
  });

  it('admin and super_admin satisfy every scoped role requirement', () => {
    for (const required of ['support', 'risk', 'finance', 'compliance'] as const) {
      expect(staffRoleSatisfies('admin', required)).toBe(true);
      expect(staffRoleSatisfies('super_admin', required)).toBe(true);
    }
  });

  it('a scoped role never satisfies a different scoped role or a higher tier', () => {
    expect(staffRoleSatisfies('support', 'finance')).toBe(false);
    expect(staffRoleSatisfies('finance', 'risk')).toBe(false);
    expect(staffRoleSatisfies('risk', 'support')).toBe(false);
    expect(staffRoleSatisfies('support', 'admin')).toBe(false);
    expect(staffRoleSatisfies('admin', 'super_admin')).toBe(false);
  });

  it('compliance is a distinct tier from finance — neither satisfies the other', () => {
    // Prompt 08 Phase G: compliance verifies KYC/payout-method sandbox
    // flags, finance approves/settles the payout amount — deliberately
    // separate responsibilities, not a hierarchy between the two.
    expect(staffRoleSatisfies('compliance', 'finance')).toBe(false);
    expect(staffRoleSatisfies('finance', 'compliance')).toBe(false);
  });

  it('super_admin does not satisfy an admin-or-higher requirement lower than itself in the wrong direction', () => {
    // admin requirement is satisfied by admin or super_admin...
    expect(staffRoleSatisfies('super_admin', 'admin')).toBe(true);
    // ...but admin does not satisfy a super_admin-only requirement.
    expect(staffRoleSatisfies('admin', 'super_admin')).toBe(false);
  });
});

describe('staffCan — sensitive Control authorization matrix', () => {
  const permissions: ControlPermission[] = [
    'account.view',
    'risk.view',
    'integrity_hold.place',
    'integrity_hold.clear',
    'sandbox_kyc.modify',
    'payout_method.modify',
    'payout.approve',
    'payout.reject',
    'payout.settle',
    'payout.reverse',
    'treasury.modify',
    'actuarial.modify',
    'commercial_product.modify',
    'audit_evidence.view',
    'commercial_product.view',
    'market_operations.view',
    'incident.view',
    'policy.view',
    'treasury.view',
    'actuarial.view',
    'staff_directory.view',
    'payout.view',
    'reconciliation.view',
  ];

  it('keeps support, risk, compliance, and finance duties separated', () => {
    expect(staffCan('support', 'account.view')).toBe(true);
    expect(staffCan('support', 'payout.approve')).toBe(false);
    expect(staffCan('risk', 'integrity_hold.place')).toBe(true);
    expect(staffCan('risk', 'payout.settle')).toBe(false);
    expect(staffCan('compliance', 'sandbox_kyc.modify')).toBe(true);
    expect(staffCan('compliance', 'payout.reverse')).toBe(false);
    expect(staffCan('finance', 'payout.settle')).toBe(true);
    expect(staffCan('finance', 'sandbox_kyc.modify')).toBe(false);
  });

  it('allows admin supersets without allowing silent super-admin elevation', () => {
    for (const permission of permissions) {
      expect(staffCan('super_admin', permission)).toBe(true);
    }
    expect(staffCan('admin', 'commercial_product.modify')).toBe(true);
    expect(staffRoleSatisfies('admin', 'super_admin')).toBe(false);
  });
});
