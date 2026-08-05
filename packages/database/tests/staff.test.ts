import { describe, expect, it } from 'vitest';
import { staffRoleSatisfies } from '../src/staff';
import type { StaffRole } from '../src/schema';

describe('staffRoleSatisfies', () => {
  it('a role satisfies its own requirement', () => {
    const roles: StaffRole[] = ['support', 'risk', 'finance', 'admin', 'super_admin'];
    for (const role of roles) {
      expect(staffRoleSatisfies(role, role)).toBe(true);
    }
  });

  it('admin and super_admin satisfy every scoped role requirement', () => {
    for (const required of ['support', 'risk', 'finance'] as const) {
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

  it('super_admin does not satisfy an admin-or-higher requirement lower than itself in the wrong direction', () => {
    // admin requirement is satisfied by admin or super_admin...
    expect(staffRoleSatisfies('super_admin', 'admin')).toBe(true);
    // ...but admin does not satisfy a super_admin-only requirement.
    expect(staffRoleSatisfies('admin', 'super_admin')).toBe(false);
  });
});
