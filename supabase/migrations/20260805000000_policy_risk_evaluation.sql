-- Prompt 05 — Policy, Risk & Evaluation.
-- Non-destructive: additive only, no existing objects altered or dropped.
-- Money: numeric, never float. Instants: timestamptz. Evidence/snapshots: append-only.

-- =========================================================================
-- ACCOUNT DAILY SNAPSHOTS
-- One row per (account_id, trading_day). The 'open' row for "today" carries
-- the live daily_reference/maximum_loss_floor_before the risk engine reads
-- on every evaluation. Finalizing it (services/worker's daily-finalization
-- job, at the next UTC boundary) fills in the eod_* columns and computes the
-- next Maximum Loss floor (ONE-021: EOD-trailing, never decreases).
-- unique(account_id, trading_day) is the daily-finalization idempotency key
-- (same shape as payment_attempts.attempt_key in 20260804000004).
-- =========================================================================

create table app.account_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.trading_accounts (id),
  trading_day date not null,
  policy_version_id uuid not null references app.policy_versions (id),
  status text not null default 'open' check (status in ('open', 'finalized')),
  sod_balance numeric(14, 2) not null,
  sod_equity numeric(14, 2) not null,
  daily_reference numeric(14, 2) not null,
  maximum_loss_floor_before numeric(14, 2) not null,
  eod_balance numeric(14, 2),
  eod_equity numeric(14, 2),
  maximum_loss_floor_after numeric(14, 2),
  highest_eod_balance_after numeric(14, 2),
  realized_net_profit_for_day numeric(14, 2),
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  unique (account_id, trading_day)
);
create index account_daily_snapshots_account_id_idx on app.account_daily_snapshots (account_id);
create index account_daily_snapshots_open_idx on app.account_daily_snapshots (account_id) where status = 'open';

-- =========================================================================
-- RISK VIOLATIONS
-- Append-only evidence per Prompt 05's "EVIDENCE" requirement: rule code,
-- policy version, threshold, observed, event refs, price snapshot,
-- calculation version, occurredAt, consequence. rule_code values are the
-- exact reason_codes strings from docs/02-program/WARIBA_RULESET_v1.1.json.
-- The unique constraint makes re-processing the same trigger event a no-op
-- rather than a duplicate row — matches the idempotency pattern already
-- used by trade_orders.idempotency_key and payment_attempts.attempt_key.
-- =========================================================================

create table app.risk_violations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.trading_accounts (id),
  rule_code text not null check (rule_code in (
    'RISK_DAILY_LOSS_LOCK', 'RISK_MAXIMUM_LOSS_BREACH', 'RISK_CONSISTENCY_NON_COMPLIANT',
    'RISK_TARGET_NOT_REALIZED', 'RISK_OPEN_POSITIONS_BLOCK_TRANSITION',
    'RISK_PENDING_ORDERS_BLOCK_TRANSITION'
  )),
  severity text not null check (severity in ('information', 'warning', 'critical')),
  consequence text not null check (consequence in ('soft_lock', 'hard_breach', 'blocks_pass', 'none')),
  policy_version_id uuid not null references app.policy_versions (id),
  threshold_value numeric(14, 4),
  observed_value numeric(14, 4),
  account_daily_snapshot_id uuid references app.account_daily_snapshots (id),
  account_state_transition_id uuid references app.account_state_transitions (id),
  trigger_event_type text not null check (trigger_event_type in ('trade_order', 'daily_finalization', 'manual_review')),
  trigger_event_id uuid,
  price_snapshot jsonb,
  calculation_version text not null default 'risk-engine-v1',
  occurred_at timestamptz not null default now(),
  unique (trigger_event_type, trigger_event_id, rule_code)
);
create index risk_violations_account_id_idx on app.risk_violations (account_id);

-- =========================================================================
-- RLS — owner can read own snapshots/violations. No client writes: both
-- tables are server-authoritative only (ENG-002), written exclusively by
-- packages/database/src/risk.ts and daily-finalization.ts under service_role.
-- =========================================================================

alter table app.account_daily_snapshots enable row level security;
alter table app.risk_violations enable row level security;

create policy account_daily_snapshots_select_own on app.account_daily_snapshots
  for select using (
    exists (
      select 1 from app.trading_accounts ta
      where ta.id = account_daily_snapshots.account_id and ta.user_id = auth.uid()
    )
  );

create policy risk_violations_select_own on app.risk_violations
  for select using (
    exists (
      select 1 from app.trading_accounts ta
      where ta.id = risk_violations.account_id and ta.user_id = auth.uid()
    )
  );

-- Table-level GRANT is required in addition to the RLS policy above —
-- without it, `authenticated` gets "permission denied for table" before RLS
-- is even evaluated (same gap 20260804000003_trading_rls_grants.sql fixed
-- for positions/trade_orders/fills). No INSERT/UPDATE/DELETE grant:
-- execution is server-authoritative only, via service_role, which bypasses
-- RLS by Supabase convention. No grant to anon: owner-scoped, authenticated only.
grant select on app.account_daily_snapshots to authenticated;
grant select on app.risk_violations to authenticated;
