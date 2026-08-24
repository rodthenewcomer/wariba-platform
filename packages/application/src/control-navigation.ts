import { staffCan, type ControlPermission, type StaffRole } from '@wariba/database';

/**
 * Prompt 09 — the single declaration of WARIBA Control's operating areas.
 *
 * Navigation and authorization read from the same table on purpose. A menu
 * built from one list and pages guarded by another is how a surface ends up
 * visible to someone who cannot open it, or — far worse — openable by
 * someone who cannot see it. Declaring both here means the two cannot
 * drift.
 *
 * This is emphatically *not* the security boundary. `visibleControlAreas`
 * only decides what a menu renders; every page still calls the server-side
 * guard itself, because a Server Action and a direct URL are both reachable
 * without ever consulting a menu.
 *
 * `read` is the authority to open an area. Acting inside one always demands
 * its own, separate permission (payout.approve, integrity_hold.place,
 * treasury.modify …) checked at the point of the mutation — being able to
 * see the payout queue has never implied being able to approve from it.
 */
export type ControlAreaId =
  | 'overview'
  | 'users'
  | 'accounts'
  | 'trading'
  | 'risk'
  | 'payouts'
  | 'support'
  | 'contestations'
  | 'market-operations'
  | 'incidents'
  | 'treasury'
  | 'actuarial'
  | 'policies'
  | 'commercial'
  | 'audit'
  | 'team';

export interface ControlArea {
  id: ControlAreaId;
  href: string;
  label: string;
  /**
   * Permission required to open the area, or null for "any staff member".
   * Only the Overview is null: it is the landing surface every operator
   * reaches, and each of its panels is gated by its own permission rather
   * than the page as a whole.
   */
  read: ControlPermission | null;
}

export const CONTROL_AREAS: readonly ControlArea[] = [
  { id: 'overview', href: '/control', label: 'Overview', read: null },
  { id: 'users', href: '/control/users', label: 'Users', read: 'account.view' },
  { id: 'accounts', href: '/control/accounts', label: 'Accounts', read: 'account.view' },
  { id: 'trading', href: '/control/trading', label: 'Trading', read: 'account.view' },
  { id: 'risk', href: '/control/integrity', label: 'Risk & Integrity', read: 'risk.view' },
  { id: 'payouts', href: '/control/payouts', label: 'Payouts', read: 'payout.view' },
  // Phase 3.2. Two areas rather than one: answering a question and deciding a
  // dispute over a recorded breach are different jobs with different
  // authorities, and a single "Support" menu entry would have put a risk
  // reviewer's queue behind a support operator's permission.
  { id: 'support', href: '/control/support', label: 'Support', read: 'support.read' },
  {
    id: 'contestations',
    href: '/control/contestations',
    label: 'Contestations',
    read: 'dispute.read',
  },
  {
    id: 'market-operations',
    href: '/control/market-operations',
    label: 'Market Ops',
    read: 'market_operations.view',
  },
  { id: 'incidents', href: '/control/incidents', label: 'Incidents', read: 'incident.view' },
  { id: 'treasury', href: '/control/treasury', label: 'Treasury', read: 'treasury.view' },
  { id: 'actuarial', href: '/control/actuarial', label: 'Actuarial', read: 'actuarial.view' },
  { id: 'policies', href: '/control/policies', label: 'Policies', read: 'policy.view' },
  {
    id: 'commercial',
    href: '/control/commercial',
    label: 'Commercial',
    read: 'commercial_product.view',
  },
  { id: 'audit', href: '/control/audit', label: 'Audit', read: 'audit_evidence.view' },
  { id: 'team', href: '/control/team', label: 'Team Access', read: 'staff_directory.view' },
];

const AREAS_BY_ID = new Map(CONTROL_AREAS.map((area) => [area.id, area]));

export function controlArea(id: ControlAreaId): ControlArea {
  const area = AREAS_BY_ID.get(id);
  if (!area) throw new Error(`Unknown Control area: ${id}`);
  return area;
}

/** Whether `role` may open this area. The same predicate the page guard uses. */
export function canReadControlArea(role: StaffRole, id: ControlAreaId): boolean {
  const { read } = controlArea(id);
  return read === null || staffCan(role, read);
}

/** Areas to render in the menu for `role`. Usability only — never a gate. */
export function visibleControlAreas(role: StaffRole): readonly ControlArea[] {
  return CONTROL_AREAS.filter((area) => canReadControlArea(role, area.id));
}
