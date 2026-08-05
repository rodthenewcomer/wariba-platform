import type { ReactNode } from 'react';
import type { StaffRole } from '@wariba/application';
import { requireStaffRole } from '../../lib/staff-auth';
import { ControlShell } from './ControlShell';

const ROLE_LABEL: Record<StaffRole, string> = {
  support: 'Support',
  risk: 'Risque',
  finance: 'Finance',
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

  return <ControlShell staffLabel={staffLabel}>{children}</ControlShell>;
}
