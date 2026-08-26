import { describe, expect, it } from 'vitest';
import {
  CONTROL_PERMISSIONS,
  staffCan,
  staffRoleSatisfies,
  type ControlPermission,
} from '../src/staff';
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

describe('Phase 3.3 operator capability separation', () => {
  it('allows pass-review visibility without inventing a decision authority', () => {
    expect(staffCan('risk', 'pass_review.read')).toBe(true);
    expect(staffCan('compliance', 'pass_review.read')).toBe(true);
    expect(staffCan('support', 'pass_review.read')).toBe(false);
    expect(staffCan('risk', 'pass_review.review')).toBe(true);
    expect(staffCan('risk', 'pass_review.escalate')).toBe(true);
    expect(staffCan('support', 'pass_review.review')).toBe(false);
    expect(CONTROL_PERMISSIONS).not.toContain('pass_review.decide');
  });

  it('keeps identity operations and internal reasons with compliance', () => {
    expect(staffCan('support', 'identity_review.read')).toBe(false);
    expect(staffCan('support', 'identity_review.assign')).toBe(false);
    expect(staffCan('support', 'identity_review.decide')).toBe(false);
    expect(staffCan('compliance', 'identity_review.assign')).toBe(true);
    expect(staffCan('compliance', 'identity_review.review')).toBe(true);
    expect(staffCan('compliance', 'identity_review.decide')).toBe(true);
    expect(staffCan('risk', 'identity_review.decide')).toBe(false);
  });

  it('keeps cross-role mutations blocked in both directions', () => {
    expect(staffCan('support', 'dispute.resolve')).toBe(false);
    expect(staffCan('support', 'dispute.assign')).toBe(false);
    expect(staffCan('support', 'dispute.correct')).toBe(false);
    expect(staffCan('support', 'dispute.remediate')).toBe(false);
    expect(staffCan('risk', 'dispute.correct')).toBe(true);
    expect(staffCan('compliance', 'dispute.remediate')).toBe(true);
    expect(staffCan('risk', 'support.reply')).toBe(false);
    expect(staffCan('risk', 'support.resolve')).toBe(false);
  });
});

/**
 * Prompt 09 milestone 5 — governance surfaces stay read-only.
 *
 * These are negative assertions on purpose. The Policies, Team Access and
 * Commercial areas each have a schema underneath that *could* support a
 * mutation, and the cheapest way for one to appear is for a permission to be
 * added "for later" and then found by a UI. Naming the permissions that must
 * not exist makes that addition a deliberate, reviewed act.
 */
describe('governance mutation permissions do not exist', () => {
  const FORBIDDEN = [
    // Team Access is read-only in Prompt 09: no role change, invitation,
    // removal, disablement or impersonation.
    'staff.modify',
    'staff.invite',
    'staff.remove',
    'staff.impersonate',
    'staff_directory.modify',
    // A policy lifecycle column is not authorization to drive it from
    // Control. Publication remains a governance act outside the console.
    'policy.publish',
    'policy.approve',
    'policy.retire',
    'policy.modify',
    // No broad catch-all that would make every future surface writable.
    'admin.modify',
  ];

  it.each(FORBIDDEN)('has no %s permission', (permission) => {
    expect(CONTROL_PERMISSIONS).not.toContain(permission);
  });

  it('exposes exactly one policy authority and one staff authority, both reads', () => {
    // Reading a governance surface never implies acting on it.
    expect(CONTROL_PERMISSIONS.filter((name) => name.startsWith('policy.'))).toEqual([
      'policy.view',
    ]);
    expect(CONTROL_PERMISSIONS.filter((name) => name.startsWith('staff'))).toEqual([
      'staff_directory.view',
    ]);
  });
});
