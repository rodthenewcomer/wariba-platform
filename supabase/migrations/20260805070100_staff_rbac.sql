-- Prompt 7 Appendix 07-B, gate 4 — /control has been reachable by any
-- authenticated user (middleware only checked "is logged in", never role)
-- since it was scaffolded; this creates the actual staff/role model it was
-- always meant to sit behind. Treat missing server-side RBAC as HIGH until
-- this lands, per the appendix.
--
-- "trader" (any regular WARIBA account holder) is not a row in this table
-- at all — it's the absence of one. Every other role is staff.
create table app.staff_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  role text not null check (role in ('support', 'risk', 'finance', 'admin', 'super_admin')),
  -- Who granted this role, for audit — nullable only for the very first
  -- super_admin ever seeded (nothing grants that one).
  granted_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- One role per person: the five roles are tiers, not independently
-- combinable permission flags (admin/super_admin are supersets of the
-- others in application code, not via multiple rows here).
create unique index staff_members_user_id_key on app.staff_members (user_id);

alter table app.staff_members enable row level security;

-- Self-read only: a staff member can see their own role (needed by
-- middleware, which runs with the user's own session, not service_role) —
-- never another staff member's. Role assignment itself has no
-- insert/update/delete grant for anon/authenticated below, so it can only
-- ever happen via service_role (an ops action), never self-service.
create policy staff_members_select_own on app.staff_members
  for select using (user_id = auth.uid());

grant select on app.staff_members to authenticated;

comment on table app.staff_members is
  'Staff/admin role assignments for /control. No self-service grant path exists — role assignment is service_role-only (ops), by design. Empty on creation: the first super_admin must be seeded manually, see the rollback/seed note below.';

-- Seeding the first super_admin (deliberately not automated here — this
-- migration must not guess a real person's identity):
--   insert into app.staff_members (user_id, role)
--   values ('<the actual auth.users.id of your first ops/admin account>', 'super_admin');
--
-- Rollback:
--   drop table app.staff_members;
-- Non-destructive to any other table — no other table references
-- staff_members, and /control's own authorization check (apps/web) simply
-- fails closed (treats every user as non-staff) if this table doesn't
-- exist, so rolling back does not error, it just re-locks /control to
-- nobody until the table is restored.
