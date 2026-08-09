-- Prompt 08 Phase C — payout cycles and the WARIBA Review case created
-- after payout #5 (PERF-018/031). A "day" belongs to a cycle purely by
-- date range (trading_day within [opened_at, closed_at or now)) — no
-- separate "consumed" flag on app.account_daily_snapshots, since cycles
-- are strictly sequential and non-overlapping in time; this is the same
-- "derive, don't duplicate" reasoning as the rest of this codebase.
--
-- The partial unique index below is the real invariant: at most one
-- non-closed cycle can ever exist for a given account, enforced by
-- Postgres itself, not just by application code creating exactly one at a
-- time.

create table app.performance_cycles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.trading_accounts (id),
  cycle_number integer not null check (cycle_number between 1 and 5),
  status text not null default 'active' check (status in ('active', 'payout_pending', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint performance_cycles_account_cycle_number unique (account_id, cycle_number),
  constraint performance_cycles_closed_at_matches_status check (
    (status = 'closed' and closed_at is not null)
    or (status != 'closed' and closed_at is null)
  )
);
create unique index performance_cycles_account_one_open
  on app.performance_cycles (account_id)
  where status != 'closed';
create index performance_cycles_account_id_idx on app.performance_cycles (account_id);

alter table app.performance_cycles enable row level security;
-- Same access model as app.position_reduction_queue: no anon/authenticated
-- grant — read only through the server-built account snapshot.

comment on table app.performance_cycles is
  'Prompt 08 Phase C — sequential payout cycles (1-5) for a WARIBA_PERFORMANCE account. At most one non-closed cycle per account (partial unique index). Rollback: drop table app.performance_cycles; non-destructive to any other table.';

create table app.performance_review_cases (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.trading_accounts (id) unique,
  opened_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

alter table app.performance_review_cases enable row level security;

comment on table app.performance_review_cases is
  'Prompt 08 Phase C, PERF-018/031 — created once a Performance account''s 5th payout is paid; no cycle #6 is ever created. Final WARIBA Review criteria and processing delay are PERF-021/022, deliberately left OPEN — this table only records that the case exists and is auditable, not an outcome workflow. Rollback: drop table app.performance_review_cases; non-destructive to any other table.';
