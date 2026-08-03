-- =========================================================================
-- Trading Core (Prompt 04) — symbol specs, orders, fills, positions.
--
-- Scope decisions (documented here and in DECISION_LOG TRD-012..020):
--  - Sandbox spec values (precision, contract size, min/max/step quantity,
--    commission, swap, stale threshold) are explicit CANDIDATE placeholders
--    per Prompt 04's own text ("Valeurs sandbox explicites") — RULESET.json
--    leaves these null/open_decision; leverage is the only value RULESET
--    already locks, and this migration must match it exactly.
--  - Hedging position model: every accepted market order opens a NEW
--    position (no same-symbol netting/averaging). Partial/full close orders
--    reduce/zero a specific existing position. This keeps average_open_price
--    trivial (always the single opening fill's price) and avoids
--    direction-flip complexity for V1.
--  - No order-level partial fills: the deterministic sandbox market always
--    has sufficient liquidity, so every accepted market order fills
--    completely in exactly one fill.
--  - No automatic SL/TP execution: TRD-005 (advanced/pending orders) is an
--    OPEN decision, not LOCKED. stop_loss/take_profit are stored,
--    modifiable risk parameters on a position — the sandbox market does not
--    watch for and auto-trigger them in V1.
--  - account_sequence reuses trading_accounts.version (already the
--    row-lock optimistic-concurrency counter): every transactional trading
--    write increments it and stamps the new value onto the rows it creates,
--    giving WebSocket clients a per-account monotonic sequence for gap
--    detection without a separate sequence generator.
-- =========================================================================

-- =========================================================================
-- SYMBOL SPECS — structured detail rows for app.symbol_spec_sets, replacing
-- reliance on its specs_json blob (same versioned-parent/structured-detail
-- pattern as policy_versions). A spec applied to an account via
-- trading_accounts.symbol_spec_set_id is never rewritten retroactively.
-- =========================================================================

create table app.symbol_specs (
  id uuid primary key default gen_random_uuid(),
  symbol_spec_set_id uuid not null references app.symbol_spec_sets (id),
  symbol text not null check (symbol in ('EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'NAS100')),
  asset_class text not null check (asset_class in ('forex_major', 'metal', 'index')),
  price_precision integer not null check (price_precision > 0),
  contract_size numeric(14, 4) not null check (contract_size > 0),
  minimum_quantity numeric(14, 4) not null check (minimum_quantity > 0),
  maximum_quantity numeric(14, 4) not null check (maximum_quantity > minimum_quantity),
  quantity_step numeric(14, 4) not null check (quantity_step > 0),
  leverage_one integer not null check (leverage_one > 0),
  leverage_performance integer not null check (leverage_performance > 0),
  spread_points numeric(10, 4) not null check (spread_points >= 0),
  slippage_points numeric(10, 4) not null check (slippage_points >= 0),
  commission_per_lot numeric(10, 4) not null check (commission_per_lot >= 0),
  swap_long_per_lot numeric(10, 4) not null default 0,
  swap_short_per_lot numeric(10, 4) not null default 0,
  weekend_hold_allowed boolean not null default false,
  overnight_hold_allowed boolean not null default true,
  stale_threshold_ms integer not null check (stale_threshold_ms > 0),
  created_at timestamptz not null default now(),
  unique (symbol_spec_set_id, symbol)
);
create index symbol_specs_set_id_idx on app.symbol_specs (symbol_spec_set_id);

-- =========================================================================
-- POSITIONS — hedging model: one row per opened market order. average_open_price
-- is the single opening fill's price (no order-level partial fills, no netting).
-- =========================================================================

create table app.positions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.trading_accounts (id),
  symbol text not null check (symbol in ('EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'NAS100')),
  side text not null check (side in ('buy', 'sell')),
  opening_quantity numeric(14, 4) not null check (opening_quantity > 0),
  open_quantity numeric(14, 4) not null check (open_quantity >= 0),
  average_open_price numeric(14, 5) not null check (average_open_price > 0),
  realized_pnl numeric(14, 2) not null default 0,
  stop_loss numeric(14, 5),
  take_profit numeric(14, 5),
  status text not null default 'open' check (status in ('open', 'closed')),
  account_sequence bigint not null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  version integer not null default 0,
  check (status = 'closed' or open_quantity > 0),
  check (status = 'open' or open_quantity = 0)
);
create index positions_account_id_idx on app.positions (account_id);
create index positions_account_open_idx on app.positions (account_id) where status = 'open';

-- =========================================================================
-- TRADE ORDERS — every account-mutating trade command. Opening orders create
-- a position; close/modify orders reference an existing one via position_id.
-- =========================================================================

create table app.trade_orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.trading_accounts (id),
  idempotency_key text not null,
  order_type text not null
    check (order_type in ('market_open', 'partial_close', 'full_close', 'modify_sl', 'modify_tp')),
  symbol text not null check (symbol in ('EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'NAS100')),
  side text not null check (side in ('buy', 'sell')),
  position_id uuid references app.positions (id),
  requested_quantity numeric(14, 4) check (requested_quantity > 0),
  filled_quantity numeric(14, 4) not null default 0 check (filled_quantity >= 0),
  requested_stop_loss numeric(14, 5),
  requested_take_profit numeric(14, 5),
  status text not null default 'received'
    check (status in ('received', 'validated', 'accepted', 'filled', 'rejected', 'cancelled')),
  rejection_code text,
  account_sequence bigint,
  received_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  unique (account_id, idempotency_key)
);
create index trade_orders_account_id_idx on app.trade_orders (account_id);
create index trade_orders_position_id_idx on app.trade_orders (position_id);

-- =========================================================================
-- FILLS — immutable execution records. Server-priced only (TRD-006).
-- =========================================================================

create table app.fills (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references app.trade_orders (id),
  account_id uuid not null references app.trading_accounts (id),
  position_id uuid not null references app.positions (id),
  symbol text not null check (symbol in ('EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'NAS100')),
  side text not null check (side in ('buy', 'sell')),
  fill_type text not null check (fill_type in ('open', 'close')),
  quantity numeric(14, 4) not null check (quantity > 0),
  price numeric(14, 5) not null check (price > 0),
  spread_points numeric(10, 4) not null,
  slippage_points numeric(10, 4) not null,
  commission numeric(10, 4) not null default 0,
  realized_pnl numeric(14, 2) not null default 0,
  market_sequence bigint not null,
  account_sequence bigint not null,
  occurred_at timestamptz not null default now()
);
create index fills_order_id_idx on app.fills (order_id);
create index fills_account_id_idx on app.fills (account_id);
create index fills_position_id_idx on app.fills (position_id);

-- =========================================================================
-- RLS — owner-scoped read, no client writes (server-authoritative execution,
-- same pattern as trading_accounts/trading_ledger_entries in Prompt 03).
-- symbol_specs is public reference data (readable via BFF, same as
-- symbol_spec_sets/policy_versions) — no RLS needed.
-- =========================================================================

alter table app.positions enable row level security;
alter table app.trade_orders enable row level security;
alter table app.fills enable row level security;

create policy positions_select_own on app.positions
  for select using (
    exists (
      select 1 from app.trading_accounts ta
      where ta.id = positions.account_id and ta.user_id = auth.uid()
    )
  );

create policy trade_orders_select_own on app.trade_orders
  for select using (
    exists (
      select 1 from app.trading_accounts ta
      where ta.id = trade_orders.account_id and ta.user_id = auth.uid()
    )
  );

create policy fills_select_own on app.fills
  for select using (
    exists (
      select 1 from app.trading_accounts ta
      where ta.id = fills.account_id and ta.user_id = auth.uid()
    )
  );

-- =========================================================================
-- SANDBOX SEED DATA — explicit CANDIDATE spec values (DECISION_LOG TRD-012).
-- Leverage matches RULESET.json symbol_specifications.leverage_by_program
-- exactly (the one value that source already locks); everything else here
-- is a documented sandbox placeholder pending a real market data provider
-- (DATA-007/008, still OPEN).
-- =========================================================================

insert into app.symbol_specs (
  symbol_spec_set_id, symbol, asset_class, price_precision, contract_size,
  minimum_quantity, maximum_quantity, quantity_step,
  leverage_one, leverage_performance,
  spread_points, slippage_points, commission_per_lot,
  swap_long_per_lot, swap_short_per_lot, stale_threshold_ms
)
select id, 'EURUSD', 'forex_major', 5, 100000, 0.01, 10, 0.01, 50, 30, 10, 2, 7.00, -2.50, 0.80, 5000
from app.symbol_spec_sets where set_id = 'WARIBA-SANDBOX-SYMBOLS-1.0.0'
union all
select id, 'GBPUSD', 'forex_major', 5, 100000, 0.01, 10, 0.01, 50, 30, 15, 3, 7.00, -2.80, 0.60, 5000
from app.symbol_spec_sets where set_id = 'WARIBA-SANDBOX-SYMBOLS-1.0.0'
union all
select id, 'USDJPY', 'forex_major', 3, 100000, 0.01, 10, 0.01, 50, 30, 12, 2, 7.00, -1.20, 0.30, 5000
from app.symbol_spec_sets where set_id = 'WARIBA-SANDBOX-SYMBOLS-1.0.0'
union all
select id, 'XAUUSD', 'metal', 2, 100, 0.01, 5, 0.01, 20, 10, 30, 5, 8.00, -4.00, 1.50, 5000
from app.symbol_spec_sets where set_id = 'WARIBA-SANDBOX-SYMBOLS-1.0.0'
union all
select id, 'NAS100', 'index', 1, 1, 0.1, 20, 0.1, 20, 10, 20, 4, 0.00, -3.00, 1.00, 5000
from app.symbol_spec_sets where set_id = 'WARIBA-SANDBOX-SYMBOLS-1.0.0';
