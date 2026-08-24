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
  compliance: ['compliance', 'admin', 'super_admin'],
  admin: ['admin', 'super_admin'],
  super_admin: ['super_admin'],
};

/** True if `role` satisfies a requirement of `required` (equal, or a superset role like admin/super_admin). */
export function staffRoleSatisfies(role: StaffRole, required: StaffRole): boolean {
  return ROLE_HIERARCHY[required].includes(role);
}

export type ControlPermission =
  | 'account.view'
  | 'risk.view'
  | 'integrity_hold.place'
  | 'integrity_hold.clear'
  | 'sandbox_kyc.modify'
  | 'payout_method.modify'
  | 'payout.approve'
  | 'payout.reject'
  | 'payout.settle'
  | 'payout.reverse'
  | 'treasury.modify'
  | 'actuarial.modify'
  | 'commercial_product.modify'
  | 'commercial_product.view'
  | 'audit_evidence.view'
  | 'payout.view'
  | 'reconciliation.view'
  | 'market_operations.view'
  | 'incident.view'
  | 'policy.view'
  | 'treasury.view'
  | 'actuarial.view'
  | 'staff_directory.view'
  // Phase 3.2 — support and contestations. Granular on purpose: answering a
  // question and deciding a dispute over a breach are different authorities
  // held by different people, and neither is "admin".
  | 'support.read'
  | 'support.reply'
  | 'support.assign'
  | 'support.resolve'
  | 'dispute.read'
  | 'dispute.review'
  | 'dispute.resolve';

const CONTROL_PERMISSION_REQUIREMENTS: Record<ControlPermission, readonly StaffRole[]> = {
  'account.view': ['support'],
  'risk.view': ['risk'],
  'integrity_hold.place': ['risk'],
  'integrity_hold.clear': ['risk'],
  'sandbox_kyc.modify': ['compliance'],
  'payout_method.modify': ['compliance'],
  'payout.approve': ['finance'],
  'payout.reject': ['finance'],
  'payout.settle': ['finance'],
  'payout.reverse': ['finance'],
  'treasury.modify': ['finance'],
  'actuarial.modify': ['risk', 'finance'],
  'commercial_product.modify': ['admin'],
  'audit_evidence.view': ['compliance'],
  // Prompt 09 — read authorities for the operating areas Control gained.
  // Each names the authority to *see* a surface, deliberately separate from
  // the authority to change it: reusing a `.modify` permission as a read
  // gate would conflate the two and make a future "finance can read the
  // treasury but only a treasurer can move it" split impossible to express.
  // None of these grants any write.
  'commercial_product.view': ['admin'],
  // Reading the payout queue is its own authority: support inspects it for
  // first-line questions and finance acts on it, so gating it on
  // `account.view` (support-only) would have locked finance out of the
  // queue it exists to work. Acting still demands payout.approve/reject/
  // settle/reverse — finance-only — checked at the mutation itself.
  'payout.view': ['support', 'finance'],
  // Account financial reconciliation is a cross-domain integrity capability,
  // not a treasury one: it reconstructs an individual account's ledger
  // (stored vs reconstructed balances, realized P/L, commissions, swaps,
  // payout debits, adjustments, reversals), whereas treasury concerns
  // WARIBA's own reserve and funding. Risk needs it because a mismatch opens
  // a critical incident and an integrity hold that cannot be cleared while
  // reconciliation still fails; finance needs it to inspect ledger integrity
  // around payouts. Support does not need the reconstruction, and compliance
  // does not inherit it merely by holding audit_evidence.view. Read only —
  // Control authorizes no reconciliation write and no manual correction.
  'reconciliation.view': ['risk', 'finance'],
  'market_operations.view': ['risk'],
  // Incidents span integrity *and* money — payout processing and reserve
  // zones open incidents too, so finance needs them as much as risk does.
  'incident.view': ['risk', 'finance'],
  'policy.view': ['risk', 'compliance'],
  'treasury.view': ['finance'],
  'actuarial.view': ['risk', 'finance'],
  // The staff roster is an access-control surface: admin only, and read
  // only — Prompt 09 authorizes no staff-role mutation at all.
  'staff_directory.view': ['admin'],

  // Phase 3.2 — the support queue belongs to support. Constitution §132:
  // « Support peut lire résumé, tickets et escalader. Ne peut pas approuver
  // payout ni modifier règle. » Nothing here grants payout approval, ledger
  // mutation, policy editing or a risk override, and a test asserts that
  // absence against the real permission table rather than a list beside it.
  'support.read': ['support'],
  'support.reply': ['support'],
  'support.assign': ['support'],
  'support.resolve': ['support'],

  /*
   * Contestations split read from decide, and the split is the point.
   *
   * Support reads them because a trader asks about theirs on the phone and a
   * first-line operator has to be able to say where it stands. Deciding one is
   * a different job: a contestation challenges a risk decision made from a
   * published policy, so the authority to review and resolve belongs to risk
   * and compliance. Support escalating is the intended path — support
   * resolving a dispute over its own tickets would be marking its own homework.
   */
  'dispute.read': ['support', 'risk', 'compliance'],
  'dispute.review': ['risk', 'compliance'],
  'dispute.resolve': ['risk', 'compliance'],
};

/**
 * Every permission that exists, at runtime.
 *
 * Derived from the requirements table rather than restated, so a test can
 * assert what is *absent* — "Control has no policy.publish" is only a real
 * guarantee if it is checked against the actual set rather than a list
 * someone maintains alongside it.
 */
export const CONTROL_PERMISSIONS = Object.keys(
  CONTROL_PERMISSION_REQUIREMENTS,
) as readonly ControlPermission[];

export function staffCan(role: StaffRole, permission: ControlPermission): boolean {
  return CONTROL_PERMISSION_REQUIREMENTS[permission].some((required) =>
    staffRoleSatisfies(role, required),
  );
}
