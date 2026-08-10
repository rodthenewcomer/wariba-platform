import type { ReactNode } from 'react';
import type { StaffRole } from '@wariba/application';
import { requireStaffRole, staffControlAreas } from '../../lib/staff-auth';
import { ControlShell } from './ControlShell';

// Every /control page authenticates via requireStaffRole() (cookies() +
// a direct Postgres lookup), so none of this subtree can be statically
// prerendered — without this, `next build` tries to prerender it anyway
// and fails on missing runtime config (APP_ENV, DATABASE_URL, etc. are
// only present at request time, not at build time). Same pattern as
// hub/page.tsx and trade/page.tsx.
export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<StaffRole, string> = {
  support: 'Support',
  risk: 'Risque',
  finance: 'Finance',
  compliance: 'Conformité',
  admin: 'Admin',
  super_admin: 'Super-admin',
};

/**
 * Server Component on purpose (not 'use client', unlike the sidebar it
 * renders): this is the actual /control authorization boundary — see
 * lib/staff-auth.ts's doc comment for why the check can't live in
 * middleware.ts instead. Any staff role passes here; individual sections
 * layer their own requireStaffRole(specificRole) check on top.
 */
export default async function ControlLayout({ children }: { children: ReactNode }) {
  const session = await requireStaffRole();
  const staffLabel = `${ROLE_LABEL[session.role]} — ${session.email ?? session.userId}`;
  // Role-filtered on the server so the menu never advertises a surface this
  // operator cannot open. Usability only — each page re-checks for itself.
  const areas = await staffControlAreas();

  return (
    <ControlShell
      staffLabel={staffLabel}
      areas={areas.map((area) => ({ href: area.href, label: area.label }))}
    >
      {children}
    </ControlShell>
  );
}
