-- Prompt 07B / TRD-033..035 — complete the program-eligible accounting
-- projection without changing any previously-applied migration.

alter table app.fills
  add column opening_fill_id uuid references app.fills (id),
  add column allocated_open_commission numeric(14, 2) not null default 0
    check (allocated_open_commission >= 0),
  add column net_realized_pnl numeric(14, 2),
  add column eligibility_reason text
    check (eligibility_reason is null or eligibility_reason in (
      'eligible', 'short_duration_profit', 'loss_counted', 'breakeven'
    ));

-- Built CONCURRENTLY in its own migration file
-- (20260805060702_fills_opening_fill_id_idx_concurrently.sql) — see that
-- file's comment for why (same reasoning as fills_account_short_duration_idx
-- in 20260805000003_profit_eligibility.sql).

comment on column app.fills.allocated_open_commission is
  'Close fills only: deterministic pro-rata allocation of the opening commission to this closed portion.';
comment on column app.fills.net_realized_pnl is
  'Close fills only: gross realized_pnl less closing commission and allocated opening commission.';
comment on column app.fills.eligibility_reason is
  'Close-fill program eligibility classification used by WariX history and program calculations.';
comment on column app.fills.opening_fill_id is
  'Close fills only: immutable link to the authoritative opening execution for this hedged position.';

-- Reconcile any close fills created by the preceding eligibility migration.
-- Existing data uses a deterministic proportional allocation. New writes use
-- a remainder-safe allocation in packages/database/src/trading.ts.
with opening_fills as (
  select distinct on (position_id)
    id,
    position_id,
    commission,
    quantity
  from app.fills
  where fill_type = 'open'
  order by position_id, occurred_at asc, id asc
), allocations as (
  select
    close_fill.id,
    opening_fills.id as opening_fill_id,
    round(
      coalesce(opening_fills.commission, 0)
      * close_fill.quantity
      / nullif(opening_fills.quantity, 0),
      2
    ) as allocated_open_commission
  from app.fills close_fill
  left join opening_fills on opening_fills.position_id = close_fill.position_id
  where close_fill.fill_type = 'close'
)
update app.fills close_fill
set
  opening_fill_id = allocations.opening_fill_id,
  allocated_open_commission = coalesce(allocations.allocated_open_commission, 0)
from allocations
where close_fill.id = allocations.id;

-- Earlier close fills predate the duration columns. Both timestamps are
-- authoritative server values, so their historical duration is recoverable.
update app.fills close_fill
set duration_ms = greatest(
  0,
  floor(extract(epoch from (close_fill.occurred_at - position.opened_at)) * 1000)::bigint
)
from app.positions position
where close_fill.position_id = position.id
  and close_fill.fill_type = 'close'
  and close_fill.duration_ms is null;

-- Existing accounts retain their pinned pre-1.1.1 behavior: historical
-- closes are net-of-fees but remain fully eligible. Only fills created under
-- the new published policy can receive short_duration_profit below.
update app.fills
set
  net_realized_pnl = round(realized_pnl - commission - allocated_open_commission, 2),
  is_short_duration_profit = false,
  eligible_realized_pnl = round(realized_pnl - commission - allocated_open_commission, 2),
  ineligible_short_duration_profit = 0,
  eligibility_reason = case
    when round(realized_pnl - commission - allocated_open_commission, 2) > 0 then 'eligible'
    when round(realized_pnl - commission - allocated_open_commission, 2) < 0 then 'loss_counted'
    else 'breakeven'
  end
where fill_type = 'close';

-- NOT VALID + a separate VALIDATE CONSTRAINT (below) instead of a plain ADD
-- CONSTRAINT: an unvalidated ADD CONSTRAINT only needs ACCESS EXCLUSIVE for
-- a fast metadata-only change, but a validating one holds that same
-- ACCESS EXCLUSIVE lock — blocking every read and write on app.fills, the
-- busiest table in the schema — for as long as the full-table scan takes.
-- VALIDATE CONSTRAINT does the scan separately under SHARE UPDATE EXCLUSIVE,
-- which is compatible with concurrent reads/writes.
--
-- The `duration_ms < 60000` clause a prior version of this constraint had
-- is deliberately absent: minimum_profit_eligible_duration_ms is a
-- per-policy-version parameter (packages/policies/src/schema.ts), not a
-- fixed constant, so hardcoding one specific value here would reject a
-- perfectly valid close the moment any future policy publishes a different
-- threshold. This constraint only enforces the shape/consistency between
-- eligibility_reason, is_short_duration_profit, net_realized_pnl,
-- eligible_realized_pnl and ineligible_short_duration_profit — the actual
-- duration threshold is enforced once, in application code
-- (packages/domain/src/profit-eligibility.ts), against the fill's own
-- pinned policy.
alter table app.fills
  add constraint fills_program_eligibility_shape_check check (
    (
      fill_type = 'open'
      and opening_fill_id is null
      and duration_ms is null
      and allocated_open_commission = 0
      and net_realized_pnl is null
      and eligible_realized_pnl is null
      and eligibility_reason is null
      and is_short_duration_profit = false
      and ineligible_short_duration_profit = 0
    )
    or
    (
      fill_type = 'close'
      and opening_fill_id is not null
      and duration_ms is not null
      and net_realized_pnl is not null
      and eligible_realized_pnl is not null
      and eligibility_reason is not null
      and ineligible_short_duration_profit >= 0
      and (
        (eligibility_reason = 'short_duration_profit'
          and is_short_duration_profit = true
          and net_realized_pnl > 0
          and eligible_realized_pnl = 0
          and ineligible_short_duration_profit = net_realized_pnl)
        or
        (eligibility_reason <> 'short_duration_profit'
          and is_short_duration_profit = false
          and eligible_realized_pnl = net_realized_pnl
          and ineligible_short_duration_profit = 0
          and (
            (eligibility_reason = 'eligible' and net_realized_pnl > 0)
            or (eligibility_reason = 'loss_counted' and net_realized_pnl < 0)
            or (eligibility_reason = 'breakeven' and net_realized_pnl = 0)
          ))
      )
    )
  ) not valid;

alter table app.fills validate constraint fills_program_eligibility_shape_check;

alter table app.account_daily_snapshots
  add column program_sod_balance numeric(14, 2),
  add column program_eod_balance numeric(14, 2),
  add column highest_program_eod_balance_after numeric(14, 2),
  add column eligible_realized_net_profit_for_day numeric(14, 2);

-- Before Prompt 07B, actual and program-eligible balances were identical.
-- This backfill keeps every already-finalized snapshot deterministic; later
-- finalizations write the explicit projection from source ledger/fill rows.
update app.account_daily_snapshots
set
  program_sod_balance = sod_balance,
  program_eod_balance = eod_balance,
  highest_program_eod_balance_after = highest_eod_balance_after,
  eligible_realized_net_profit_for_day = realized_net_profit_for_day;

alter table app.account_daily_snapshots
  alter column program_sod_balance set not null;

comment on column app.account_daily_snapshots.program_sod_balance is
  'Program-eligible balance at the UTC start of day; actual balance less cumulative ineligible short-duration profit.';
comment on column app.account_daily_snapshots.program_eod_balance is
  'Program-eligible balance at finalized UTC EOD, used for the EOD-trailing floor.';
comment on column app.account_daily_snapshots.highest_program_eod_balance_after is
  'Highest finalized program-eligible EOD balance through this day.';
comment on column app.account_daily_snapshots.eligible_realized_net_profit_for_day is
  'Program-eligible net PnL for this finalized UTC day, used by target and Best Day calculations.';

-- Same NOT VALID + VALIDATE CONSTRAINT split as app.fills above — this table
-- grows unbounded (one row per violation event) so the same lock-duration
-- risk compounds over the system's lifetime even though today's volume is
-- small.
alter table app.risk_violations
  drop constraint risk_violations_rule_code_check,
  add constraint risk_violations_rule_code_check check (rule_code in (
    'RISK_DAILY_LOSS_LOCK', 'RISK_MAXIMUM_LOSS_BREACH', 'RISK_CONSISTENCY_NON_COMPLIANT',
    'RISK_TARGET_NOT_REALIZED', 'RISK_OPEN_POSITIONS_BLOCK_TRANSITION',
    'RISK_PENDING_ORDERS_BLOCK_TRANSITION', 'RISK_SHORT_DURATION_WARNING',
    'RISK_SHORT_DURATION_ENTRY_LOCK'
  )) not valid,
  drop constraint risk_violations_consequence_check,
  add constraint risk_violations_consequence_check check (consequence in (
    'soft_lock', 'hard_breach', 'blocks_pass', 'entry_lock', 'none'
  )) not valid;

alter table app.risk_violations validate constraint risk_violations_rule_code_check;
alter table app.risk_violations validate constraint risk_violations_consequence_check;

-- Published as a new immutable policy. Existing accounts remain pinned to
-- v1.1.0; activation selects this later created published row for new accounts.
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
  'WARIBA_ONE',
  '1.1.1',
  'published',
  jsonb_build_object(
    'profit_target_rate', '0.10',
    'recognized_profit', 'realized_net_profit_only',
    'daily_loss_rate', '0.03',
    'daily_loss_action', 'soft_lock',
    'maximum_loss_rate', '0.10',
    'maximum_loss_model', 'eod_trailing',
    'maximum_loss_floor_formula', 'min(nominal_balance, max(previous_floor, highest_program_eligible_eod_balance - nominal_balance * 0.10))',
    'maximum_loss_floor_never_decreases', true,
    'maximum_loss_locks_at_nominal', true,
    'best_day_max_ratio', '0.50',
    'best_day_breach_capable', false,
    'minimum_trading_days', 0,
    'qualified_days_required', null,
    'overnight_allowed', true,
    'weekend_allowed', false,
    'news_allowed', true,
    'activation_fee', '0',
    'program_eligible_balance_enabled', true,
    'minimum_profit_eligible_duration_ms', 60000,
    'short_duration_warning_count', 3,
    'short_duration_entry_lock_count', 6
  ),
  'sha256:02039d1fca571b238678eae725f5672bb7072ed715bdd41c5b8f1fc2c2db1b78',
  'sha256:e43931914d0fb69e7af53e9bad05cf0187be4e363628a29192ff35f7a6593e0a',
  '2026-08-05T00:00:00Z'
);
