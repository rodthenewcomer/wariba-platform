import { staffCan, type ControlPermission, type StaffRole } from '@wariba/database';

/**
 * Prompt 09 — section-level authorization for the account detail page.
 *
 * An account detail is an *aggregation surface*: it gathers evidence from
 * domains that are individually secured everywhere else in Control. Opening
 * it is one authorization decision; reading each domain of evidence is a
 * separate one. Treating `account.view` as a key to all of them would turn
 * several narrowly-held authorities into a single over-permissive page —
 * exactly the privilege aggregation Control must not create.
 *
 * The map is used *before* retrieval, never after. A read model that fetched
 * everything and let the page hide sections would still have put the data on
 * the wire, in the render tree, and in any log or error report that captured
 * it. So the loader takes the operator's role, resolves this map, and simply
 * never issues the queries for sections the role cannot read.
 *
 * The role is the only input. Sections are not selectable from the URL or a
 * query parameter, so there is nothing an operator can manipulate to widen
 * what the server returns.
 */
export type AccountSection =
  | 'overview'
  | 'trading'
  | 'risk'
  | 'payout'
  | 'audit_evidence'
  | 'incident_evidence'
  | 'reconciliation_evidence';

export const ACCOUNT_SECTION_PERMISSION: Record<AccountSection, ControlPermission> = {
  // Identity and ordinary operational summary — the reason support opens
  // an account at all.
  overview: 'account.view',
  // Ordinary trading evidence: what was ordered, filled, rejected and when.
  // Risk *investigation* evidence is not here, even though it originates
  // from trading events.
  trading: 'account.view',
  // Loss floors, consistency, rule violations, integrity holds.
  risk: 'risk.view',
  // Cycles, buffer, eligibility, approval history. Reading payout evidence
  // never implies authority to approve, reject, settle or reverse — those
  // stay on their own permissions, checked at the mutation.
  payout: 'payout.view',
  audit_evidence: 'audit_evidence.view',
  incident_evidence: 'incident.view',
  // See staff.ts — a cross-domain financial-integrity authority, held by
  // risk and finance, and deliberately not derived from treasury or audit.
  reconciliation_evidence: 'reconciliation.view',
};

export const ACCOUNT_SECTIONS = Object.keys(
  ACCOUNT_SECTION_PERMISSION,
) as readonly AccountSection[];

export function canReadAccountSection(role: StaffRole, section: AccountSection): boolean {
  return staffCan(role, ACCOUNT_SECTION_PERMISSION[section]);
}

/** The sections this role may read. The loader queries these and nothing else. */
export function authorizedAccountSections(role: StaffRole): ReadonlySet<AccountSection> {
  return new Set(ACCOUNT_SECTIONS.filter((section) => canReadAccountSection(role, section)));
}
