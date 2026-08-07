-- Prompt 08 Phase E — TREASURY-001: the payout reserve is separate from
-- operating cash. No real payment processor exists in this build, so this
-- figure cannot be derived from anything else in this database — it is a
-- real, externally-tracked treasury number staff must input and maintain
-- (Control, Phase G). Append-only, same reasoning as
-- app.trading_ledger_entries: corrections are new compensating entries,
-- never UPDATE/DELETE, so "what did we believe the reserve was on date X"
-- stays reconstructable.

create table app.treasury_reserve_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in ('deposit', 'withdrawal', 'adjustment')),
  amount numeric(14, 2) not null,
  currency text not null default 'USD',
  reason text not null,
  created_by uuid not null references auth.users (id),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index treasury_reserve_entries_occurred_at_idx on app.treasury_reserve_entries (occurred_at);

alter table app.treasury_reserve_entries enable row level security;
-- No anon/authenticated grant — Control-only (Phase G RBAC: finance/admin/super_admin),
-- same access model as every other server-only table in this schema.

comment on table app.treasury_reserve_entries is
  'Prompt 08 Phase E, TREASURY-001 — the payout reserve, kept separate from operating cash and from every trading_accounts balance. Current reserve = sum(amount) where deposit/adjustment are positive and withdrawal is negative, by convention (same signed-amount convention as app.trading_ledger_entries). Rollback: drop table app.treasury_reserve_entries; non-destructive to any other table.';
