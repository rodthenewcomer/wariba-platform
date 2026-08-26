import { describe, expect, it } from 'vitest';
import type { StaffRole } from '@wariba/database';
import {
  CONTROL_AREAS,
  canReadControlArea,
  controlArea,
  visibleControlAreas,
  type ControlAreaId,
} from '../src/control-navigation';

const ROLES: readonly StaffRole[] = [
  'support',
  'risk',
  'finance',
  'compliance',
  'admin',
  'super_admin',
];

/**
 * Prompt 09 — the read-authorization matrix for every Control operating
 * area, asserted in both directions: the roles that may open an area, and
 * the roles that must not. A permissive drift in CONTROL_AREAS or in the
 * permission requirements will fail here rather than silently widening who
 * can see an operations surface.
 */
const EXPECTED_READERS: Record<ControlAreaId, readonly StaffRole[]> = {
  // Every operator lands here; individual panels carry their own gate.
  overview: ['support', 'risk', 'finance', 'compliance', 'admin', 'super_admin'],
  users: ['support', 'admin', 'super_admin'],
  accounts: ['support', 'admin', 'super_admin'],
  trading: ['support', 'admin', 'super_admin'],
  risk: ['risk', 'admin', 'super_admin'],
  'pass-reviews': ['risk', 'compliance', 'admin', 'super_admin'],
  'identity-reviews': ['compliance', 'admin', 'super_admin'],
  payouts: ['support', 'finance', 'admin', 'super_admin'],
  // Phase 3.2. Support answers tickets; risk and compliance decide disputes.
  // The two are listed separately here because the whole point of splitting
  // them is that a support operator can read a contestation without being
  // able to decide one, and a risk reviewer can decide one without inheriting
  // the ticket queue.
  support: ['support', 'admin', 'super_admin'],
  contestations: ['support', 'risk', 'compliance', 'admin', 'super_admin'],
  'market-operations': ['risk', 'admin', 'super_admin'],
  incidents: ['risk', 'finance', 'admin', 'super_admin'],
  treasury: ['finance', 'admin', 'super_admin'],
  actuarial: ['risk', 'finance', 'admin', 'super_admin'],
  policies: ['risk', 'compliance', 'admin', 'super_admin'],
  commercial: ['admin', 'super_admin'],
  audit: ['compliance', 'admin', 'super_admin'],
  team: ['admin', 'super_admin'],
};

describe('Control area read authorization', () => {
  it('declares exactly the operating areas Control owns', () => {
    expect(CONTROL_AREAS.map((area) => area.id).sort()).toEqual(
      Object.keys(EXPECTED_READERS).sort(),
    );
  });

  it('grants each area to exactly the intended roles, and to no others', () => {
    for (const [id, allowed] of Object.entries(EXPECTED_READERS) as [
      ControlAreaId,
      readonly StaffRole[],
    ][]) {
      for (const role of ROLES) {
        expect(
          canReadControlArea(role, id),
          `${role} reading ${id} should be ${allowed.includes(role)}`,
        ).toBe(allowed.includes(role));
      }
    }
  });

  it('never lets a scoped role reach another scope’s area', () => {
    // The negative half stated explicitly, because this is the property that
    // actually matters: support must not reach money or integrity surfaces,
    // and finance must not reach the staff roster.
    expect(canReadControlArea('support', 'treasury')).toBe(false);
    expect(canReadControlArea('support', 'risk')).toBe(false);
    expect(canReadControlArea('support', 'audit')).toBe(false);
    expect(canReadControlArea('support', 'market-operations')).toBe(false);
    expect(canReadControlArea('finance', 'users')).toBe(false);
    expect(canReadControlArea('finance', 'team')).toBe(false);
    expect(canReadControlArea('finance', 'risk')).toBe(false);
    expect(canReadControlArea('risk', 'treasury')).toBe(false);
    expect(canReadControlArea('compliance', 'treasury')).toBe(false);
    expect(canReadControlArea('compliance', 'users')).toBe(false);
  });

  it('gives no role a write authority through an area declaration', () => {
    // Area declarations gate reading only. Anything that mutates state must
    // demand its own permission at the point of the mutation, so no `read`
    // may ever name a `.modify` / `.approve` / `.place` / `.reply` style
    // authority.
    //
    // Two read suffixes exist: Prompt 09's areas use `.view`, and Phase 3.2's
    // support/contestation permissions use `.read` (the vocabulary UX-010 and
    // the Phase 3.2 brief name). Both are read authorities; the assertion
    // widened rather than the permissions being renamed, because the invariant
    // under test is "no write authority gates an area", not the suffix.
    for (const area of CONTROL_AREAS) {
      if (area.read === null) continue;
      expect(area.read).toMatch(/\.(view|read)$/);
    }
  });

  it('the staff roster and commercial gates stay admin-only', () => {
    for (const role of ['support', 'risk', 'finance', 'compliance'] as const) {
      expect(canReadControlArea(role, 'team')).toBe(false);
      expect(canReadControlArea(role, 'commercial')).toBe(false);
    }
  });

  it('visible navigation matches what the guard would allow, for every role', () => {
    for (const role of ROLES) {
      const visible = visibleControlAreas(role).map((area) => area.id);
      const allowed = CONTROL_AREAS.filter((area) => canReadControlArea(role, area.id)).map(
        (area) => area.id,
      );
      // Menu and guard read the same table — a mismatch means a surface is
      // advertised that cannot be opened, or hidden but reachable.
      expect(visible).toEqual(allowed);
    }
  });

  it('every area has a unique, /control-scoped route', () => {
    const hrefs = CONTROL_AREAS.map((area) => area.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of hrefs) expect(href.startsWith('/control')).toBe(true);
  });

  it('rejects an unknown area rather than defaulting to permitted', () => {
    expect(() => controlArea('nope' as ControlAreaId)).toThrow(/Unknown Control area/);
  });
});
