-- Rules v1.1 — immutable Evaluation policy + symbol spec set + aggregate exposure limits.
-- Existing accounts keep their pinned 1.0 policy/spec IDs. New sandbox activations
-- select the latest published policy and latest sandbox symbol spec set.

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
  '1.1.0',
  'published',
  jsonb_build_object(
    'profit_target_rate', '0.10',
    'recognized_profit', 'realized_net_profit_only',
    'daily_loss_rate', '0.03',
    'daily_loss_action', 'soft_lock',
    'maximum_loss_rate', '0.10',
    'maximum_loss_model', 'eod_trailing',
    'maximum_loss_floor_formula', 'min(nominal_balance, max(previous_floor, highest_eod_balance - nominal_balance * 0.10))',
    'maximum_loss_floor_never_decreases', true,
    'maximum_loss_locks_at_nominal', true,
    'best_day_max_ratio', '0.50',
    'best_day_breach_capable', false,
    'minimum_trading_days', 0,
    'qualified_days_required', null,
    'overnight_allowed', true,
    'weekend_allowed', false,
    'news_allowed', true,
    'activation_fee', '0'
  ),
  'sha256:191ff589394ccb604c4a53b817fb463b25fcc46c58f7b89ac621fb45c89c4ac0',
  'sha256:29f988ad91f191d345029ab8361c5056c352f3552c970d3b5a0ffa4db29d1be0',
  '2026-08-03T00:00:00Z'
);

insert into app.symbol_spec_sets (set_id, status, specs_json, published_at)
values (
  'WARIBA-SANDBOX-SYMBOLS-1.1.0',
  'sandbox_candidate',
  jsonb_build_object(
    'version', '1.1.0',
    'symbols', jsonb_build_array('EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'NAS100'),
    'leverage', jsonb_build_object(
      'forex', jsonb_build_object('maximum', '100', 'model', 'fixed'),
      'xauusd', jsonb_build_object('maximum', '50', 'model', 'dynamic_by_aggregate_exposure'),
      'nas100', jsonb_build_object('maximum', '20', 'model', 'fixed_or_tiered')
    ),
    'maximum_margin_usage', jsonb_build_object('evaluation', '0.30', 'performance', '0.25')
  ),
  '2026-08-03T00:00:00Z'
);

insert into app.symbol_specs (
  symbol_spec_set_id, symbol, asset_class, price_precision, contract_size,
  minimum_quantity, maximum_quantity, quantity_step,
  leverage_one, leverage_performance,
  spread_points, slippage_points, commission_per_lot,
  swap_long_per_lot, swap_short_per_lot, stale_threshold_ms
)
select id, 'EURUSD', 'forex_major', 5, 100000, 0.01, 10, 0.01, 100, 100, 10, 2, 7.00, -2.50, 0.80, 5000
from app.symbol_spec_sets where set_id = 'WARIBA-SANDBOX-SYMBOLS-1.1.0'
union all
select id, 'GBPUSD', 'forex_major', 5, 100000, 0.01, 10, 0.01, 100, 100, 15, 3, 7.00, -2.80, 0.60, 5000
from app.symbol_spec_sets where set_id = 'WARIBA-SANDBOX-SYMBOLS-1.1.0'
union all
select id, 'USDJPY', 'forex_major', 3, 100000, 0.01, 10, 0.01, 100, 100, 12, 2, 7.00, -1.20, 0.30, 5000
from app.symbol_spec_sets where set_id = 'WARIBA-SANDBOX-SYMBOLS-1.1.0'
union all
select id, 'XAUUSD', 'metal', 2, 100, 0.01, 5, 0.01, 50, 50, 30, 5, 8.00, -4.00, 1.50, 5000
from app.symbol_spec_sets where set_id = 'WARIBA-SANDBOX-SYMBOLS-1.1.0'
union all
select id, 'NAS100', 'index_cfd_simulated', 1, 1, 0.1, 20, 0.1, 20, 20, 20, 4, 0.00, -3.00, 1.00, 5000
from app.symbol_spec_sets where set_id = 'WARIBA-SANDBOX-SYMBOLS-1.1.0';

create table app.account_exposure_limits (
  id uuid primary key default gen_random_uuid(),
  symbol_spec_set_id uuid not null references app.symbol_spec_sets (id),
  nominal_balance numeric(14, 2) not null check (nominal_balance > 0),
  forex_lots numeric(14, 4) not null check (forex_lots > 0),
  xauusd_lots numeric(14, 4) not null check (xauusd_lots > 0),
  nas100_contracts numeric(14, 4) not null check (nas100_contracts > 0),
  evaluation_max_margin_rate numeric(5, 4) not null check (evaluation_max_margin_rate > 0 and evaluation_max_margin_rate <= 1),
  performance_max_margin_rate numeric(5, 4) not null check (performance_max_margin_rate > 0 and performance_max_margin_rate <= 1),
  created_at timestamptz not null default now(),
  unique (symbol_spec_set_id, nominal_balance)
);
create index account_exposure_limits_spec_set_idx
  on app.account_exposure_limits (symbol_spec_set_id);

insert into app.account_exposure_limits (
  symbol_spec_set_id,
  nominal_balance,
  forex_lots,
  xauusd_lots,
  nas100_contracts,
  evaluation_max_margin_rate,
  performance_max_margin_rate
)
select id, 5000, 0.30, 0.05, 1, 0.30, 0.25 from app.symbol_spec_sets where set_id = 'WARIBA-SANDBOX-SYMBOLS-1.1.0'
union all
select id, 10000, 0.60, 0.10, 2, 0.30, 0.25 from app.symbol_spec_sets where set_id = 'WARIBA-SANDBOX-SYMBOLS-1.1.0'
union all
select id, 25000, 1.50, 0.25, 5, 0.30, 0.25 from app.symbol_spec_sets where set_id = 'WARIBA-SANDBOX-SYMBOLS-1.1.0'
union all
select id, 50000, 3.00, 0.50, 10, 0.30, 0.25 from app.symbol_spec_sets where set_id = 'WARIBA-SANDBOX-SYMBOLS-1.1.0'
union all
select id, 100000, 6.00, 1.00, 20, 0.30, 0.25 from app.symbol_spec_sets where set_id = 'WARIBA-SANDBOX-SYMBOLS-1.1.0';

comment on table app.account_exposure_limits is
  'Versioned server-side aggregate exposure and margin reference limits for Rules v1.1.';

