-- Prompt 08 Phase G — WARIBA Control needs to distinguish "verifies KYC and
-- payout-method sandbox flags" from "approves/settles the payout amount"
-- (finance). Adding a role is a check-constraint replacement, not a table
-- change: staff_members' own structure (one role per person) is unaffected.
alter table app.staff_members drop constraint staff_members_role_check;
alter table app.staff_members
  add constraint staff_members_role_check
  check (role in ('support', 'risk', 'finance', 'compliance', 'admin', 'super_admin'));

comment on table app.staff_members is
  'Staff/admin role assignments for /control. No self-service grant path exists — role assignment is service_role-only (ops), by design. Empty on creation: the first super_admin must be seeded manually, see the seed note in 20260805070100_staff_rbac.sql.';

-- Rollback:
--   alter table app.staff_members drop constraint staff_members_role_check;
--   alter table app.staff_members add constraint staff_members_role_check
--     check (role in ('support', 'risk', 'finance', 'admin', 'super_admin'));
-- Only safe if no row currently has role = 'compliance'.
