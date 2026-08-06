-- Prompt 7 Appendix 07-D — server-authoritative pending orders (Buy/Sell
-- Limit/Stop) and price alerts.
--
-- No leader-election/fencing/active-standby model exists anywhere in this
-- codebase (services/realtime is a single process; packages/database has
-- no distributed-coordination primitives at all) — safety here comes from
-- the same mechanism every other command in this system already relies on:
-- a single authoritative writer, Postgres row locks, and idempotency keys.
-- A triggered pending order becomes a position through the *existing*
-- openPosition() transaction unchanged (packages/database/src/trading.ts) —
-- this migration adds the queue/trigger bookkeeping around it, not a new
-- financial execution path. See DECISION_LOG.md TRADING-ORDER-001..005 and
-- the Appendix 07-D final report for what genuine multi-node failover would
-- additionally require.
create table app.pending_orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.trading_accounts (id),
  symbol text not null check (symbol in ('EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'NAS100')),
  side text not null check (side in ('buy', 'sell')),
  order_type text not null check (order_type in ('buy_limit', 'sell_limit', 'buy_stop', 'sell_stop')),
  quantity numeric(14, 4) not null check (quantity > 0),
  trigger_price numeric(14, 5) not null check (trigger_price > 0),
  requested_stop_loss numeric(14, 5),
  requested_take_profit numeric(14, 5),
  time_in_force text not null default 'GTC' check (time_in_force in ('GTC')),
  status text not null default 'active' check (
    status in ('active', 'triggered', 'filled', 'cancelled', 'rejected', 'suspended_market_data', 'failed')
  ),
  version integer not null default 0,
  idempotency_key uuid not null,
  rejection_code text,
  -- Set once triggered — the app.trade_orders row openPosition() created for
  -- the resulting fill (order_type 'market_open' there; this table is what
  -- distinguishes "a market order the trader placed directly" from "a
  -- market order created by a pending order triggering", not a new
  -- trade_orders.order_type value).
  execution_order_id uuid references app.trade_orders (id),
  trigger_market_sequence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  triggered_at timestamptz,
  filled_at timestamptz,
  cancelled_at timestamptz,
  unique (account_id, idempotency_key)
);
create index pending_orders_account_id_idx on app.pending_orders (account_id);
-- What services/realtime's tick loop scans on every fresh tick — active
-- orders for a given symbol, cheaply, without a full table scan settling
-- into 'filled'/'cancelled' rows that never need this index again.
create index pending_orders_active_symbol_idx on app.pending_orders (symbol) where status = 'active';

alter table app.pending_orders enable row level security;
-- No select policy and no anon/authenticated grant at all — RLS enabled
-- with zero policies denies every non-bypassing role outright, matching
-- app.position_reduction_queue's precedent exactly (app.positions/
-- app.trade_orders/app.fills, by contrast, DO grant authenticated select
-- via their own select_own policies — this table is deliberately stricter:
-- only ever read/written by services/realtime's direct, RLS-bypassing
-- Postgres connection, never PostgREST).

comment on table app.pending_orders is
  'Prompt 7 Appendix 07-D — Buy/Sell Limit/Stop orders. GTC only. Rollback: drop table app.pending_orders; non-destructive to any other table (execution_order_id is the only FK pointing out, and trade_orders itself is untouched by dropping this).';

-- =========================================================================
-- PRICE ALERTS — server-side crossing evaluation, never client-side.
-- =========================================================================
create table app.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  symbol text not null check (symbol in ('EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'NAS100')),
  direction text not null check (direction in ('cross_above', 'cross_below')),
  threshold_price numeric(14, 5) not null check (threshold_price > 0),
  source text not null default 'mid' check (source in ('bid', 'ask', 'mid')),
  recurrence text not null check (recurrence in ('once', 'every_crossing')),
  enabled boolean not null default true,
  -- null until the first evaluation after creation/re-enable — see
  -- shouldTriggerAlert's doc comment (packages/domain/src/price-alerts.ts)
  -- for why a null baseline never fires on its own.
  last_observed_side_above boolean,
  last_triggered_at timestamptz,
  trigger_count integer not null default 0,
  version integer not null default 0,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index price_alerts_user_id_idx on app.price_alerts (user_id);
create index price_alerts_active_symbol_idx on app.price_alerts (symbol) where enabled = true;

alter table app.price_alerts enable row level security;
create policy price_alerts_select_own on app.price_alerts
  for select using (user_id = auth.uid());
grant select on app.price_alerts to authenticated;
-- Mutation (create/modify/enable/disable/delete) is service_role-only via
-- services/realtime's direct connection, same reasoning as
-- app.staff_members's grant shape — the client only ever reads its own
-- rows for display; every mutation goes through a validated server command.

comment on table app.price_alerts is
  'Prompt 7 Appendix 07-D — server-evaluated price alerts. Rollback: drop table app.price_alerts (cascades app.alert_notifications via FK below); non-destructive to any other table.';

create table app.alert_notifications (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references app.price_alerts (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  symbol text not null,
  direction text not null,
  threshold_price numeric(14, 5) not null,
  triggering_price numeric(14, 5) not null,
  source text not null,
  read_at timestamptz,
  occurred_at timestamptz not null default now()
);
create index alert_notifications_user_id_idx on app.alert_notifications (user_id, occurred_at desc);

alter table app.alert_notifications enable row level security;
create policy alert_notifications_select_own on app.alert_notifications
  for select using (user_id = auth.uid());
grant select on app.alert_notifications to authenticated;

comment on table app.alert_notifications is
  'Prompt 7 Appendix 07-D — persistent in-app notification history for triggered price alerts, one row per crossing event (never a duplicate for the same crossing — shouldTriggerAlert only returns true once per transition).';
