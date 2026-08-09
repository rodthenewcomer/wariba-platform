-- Prompt 08 Phase D — the payout request itself, and the caps grid (PERF-030,
-- CANDIDATE) it needs. Adding payout_caps_by_nominal_balance as a *required*
-- field on performancePolicyParametersSchema makes the seeded WARIBA_PERFORMANCE
-- 1.0.0 row (Phase B) unloadable — same reasoning, same precedent, as
-- 20260805060700_retire_stale_evaluation_policy_v1_0_0.sql: no live Performance
-- account has ever been pinned to 1.0.0 yet (Phase C is the first thing that
-- created any), so retiring it here is safe, not a live repin.

update app.policy_versions
set status = 'retired'
where program = 'WARIBA_PERFORMANCE' and semantic_version = '1.0.0' and status = 'published';

insert into app.policy_versions (
  program,
  semantic_version,
  status,
  parameters_json,
  human_document_hash,
  machine_hash,
  effective_from
)
values (
  'WARIBA_PERFORMANCE',
  '1.1.0',
  'published',
  jsonb_build_object(
    'daily_loss_rate', '0.03',
    'daily_loss_action', 'soft_lock',
    'maximum_loss_rate', '0.10',
    'maximum_loss_model', 'eod_trailing',
    'maximum_loss_floor_formula', 'min(nominal_balance, max(previous_floor, highest_eod_balance - nominal_balance * 0.10))',
    'maximum_loss_floor_never_decreases', true,
    'maximum_loss_locks_at_nominal', true,
    'best_day_max_ratio', '0.50',
    'best_day_breach_capable', false,
    'overnight_allowed', true,
    'weekend_allowed', false,
    'news_allowed', true,
    'program_eligible_balance_enabled', true,
    'minimum_profit_eligible_duration_ms', 60000,
    'permanent_buffer_rate', '0.10',
    'performance_day_threshold_rate', '0.005',
    'performance_days_required_per_payout', 5,
    'trader_split_rate_default', '0.85',
    'trader_split_rate_final_cycle', '0.90',
    'max_payout_cycles_before_review', 5,
    'payout_caps_by_nominal_balance', jsonb_build_object(
      '5000.00', jsonb_build_array('250', '350', '500', '750', '1000'),
      '10000.00', jsonb_build_array('500', '750', '1000', '1500', '2000'),
      '25000.00', jsonb_build_array('1000', '1500', '2000', '2500', '3000'),
      '50000.00', jsonb_build_array('2000', '2500', '3000', '4000', '5000'),
      '100000.00', jsonb_build_array('3000', '4000', '5000', '6000', '8000')
    )
  ),
  null,
  'sha256:7d0c2201da2be49f31e2413509e258b9a05ffbc3f9521365a00e282804fd73fc',
  now()
);

-- KYC/payout-method are explicitly sandbox in V1 (no real identity or
-- payout-rail integration exists) — a staff-set flag only, per Control
-- (Phase G). Defaulting to false means a Performance account is never
-- accidentally payout-eligible just because these columns exist.
alter table app.trading_accounts
  add column kyc_sandbox_verified boolean not null default false;
alter table app.trading_accounts
  add column payout_method_sandbox_configured boolean not null default false;

create table app.payout_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.trading_accounts (id),
  cycle_id uuid not null references app.performance_cycles (id),
  cycle_number integer not null,
  idempotency_key uuid not null,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'needs_information', 'approved', 'rejected', 'processing', 'paid', 'failed', 'cancelled')),
  requested_net_trader_cash numeric(14, 2) not null check (requested_net_trader_cash > 0),
  requested_gross_base numeric(14, 2) not null,
  trader_split_rate numeric(6, 4) not null,
  cap_applied numeric(14, 2) not null,
  buffer_floor_at_request numeric(14, 2) not null,
  eligible_excess_at_request numeric(14, 2) not null,
  approved_gross_base numeric(14, 2),
  trader_net_cash numeric(14, 2),
  wariba_share numeric(14, 2),
  rejection_code text,
  provider text,
  provider_reference text,
  currency text not null default 'USD',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id),
  paid_at timestamptz,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payout_requests_review_fields_match_status check (
    (status = 'pending_review' and reviewed_at is null and rejection_code is null)
    or (status != 'pending_review')
  ),
  constraint payout_requests_rejection_needs_code check (
    (status = 'rejected' and rejection_code is not null) or (status != 'rejected')
  ),
  constraint payout_requests_paid_needs_amounts check (
    (status = 'paid' and approved_gross_base is not null and trader_net_cash is not null and paid_at is not null)
    or (status != 'paid')
  )
);

-- Idempotent submission (PERF-013's own idempotency key, distinct from the
-- provider idempotency key `wariba-payout:{payout_request_id}`, which needs
-- no separate column — the request's own id already is that key).
create unique index payout_requests_account_idempotency_key
  on app.payout_requests (account_id, idempotency_key);

-- PERF-013/CONCURRENCY — the real guard against a double request or a
-- second request while one is already processing: at most one row in a
-- non-terminal status per cycle, enforced by Postgres itself.
create unique index payout_requests_cycle_one_active
  on app.payout_requests (cycle_id)
  where status in ('pending_review', 'needs_information', 'approved', 'processing');

create index payout_requests_account_id_idx on app.payout_requests (account_id);

alter table app.payout_requests enable row level security;
-- Same access model as app.performance_cycles: no anon/authenticated
-- grant — trader-facing reads go through the server-built snapshot,
-- Control (Phase G) reads/writes through its own RBAC-gated routes.

comment on table app.payout_requests is
  'Prompt 08 Phase D — a single payout request per Performance cycle, from creation through Control review through provider settlement. Rollback: drop table app.payout_requests; non-destructive to any other table.';
