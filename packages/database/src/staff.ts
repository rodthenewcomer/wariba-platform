import type { Db } from './client';
import type { StaffRole } from './schema';

/**
 * Prompt 7 Appendix 07-B, gate 4. Returns null for a regular trader (no
 * app.staff_members row) — that is the normal, expected case for the vast
 * majority of authenticated users, not an error. Callers that need to gate
 * access must treat both "no row" and any query failure as "not staff":
 * fail closed, never assume access on an unexpected error.
 */
export async function getStaffRole(db: Db, userId: string): Promise<StaffRole | null> {
  const row = await db
    .selectFrom('app.staff_members')
    .select('role')
    .where('user_id', '=', userId)
    .executeTakeFirst();
  return row?.role ?? null;
}

// admin/super_admin are treated as supersets of every scoped role — see
// StaffRole's own doc comment in schema.ts. Kept here (not in schema.ts)
// since this is authorization *policy*, not a schema fact.
const ROLE_HIERARCHY: Record<StaffRole, readonly StaffRole[]> = {
  support: ['support', 'admin', 'super_admin'],
  risk: ['risk', 'admin', 'super_admin'],
  finance: ['finance', 'admin', 'super_admin'],
  admin: ['admin', 'super_admin'],
  super_admin: ['super_admin'],
};

/** True if `role` satisfies a requirement of `required` (equal, or a superset role like admin/super_admin). */
export function staffRoleSatisfies(role: StaffRole, required: StaffRole): boolean {
  return ROLE_HIERARCHY[required].includes(role);
}
