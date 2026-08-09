-- Prompt 08 Phase B — a Performance account is spawned from a passed
-- Evaluation account, not from a new purchase order (WARIBA doesn't charge
-- again — the profit split is the "payment"). source_purchase_order_id was
-- `not null unique`, which cannot represent that provenance at all; adding
-- a second, equally-unique provenance column and a check that exactly one
-- of the two is set turns PERF-020 ("une seule relation Performance issue
-- d'une Evaluation réussie") into a real database invariant, not just an
-- application-level assumption — same reasoning the original column's own
-- doc comment (activation.ts) already applies to purchase orders.

alter table app.trading_accounts
  alter column source_purchase_order_id drop not null;

alter table app.trading_accounts
  add column source_evaluation_account_id uuid references app.trading_accounts (id) unique;

alter table app.trading_accounts
  add constraint trading_accounts_source_exactly_one check (
    (source_purchase_order_id is not null and source_evaluation_account_id is null)
    or
    (source_purchase_order_id is null and source_evaluation_account_id is not null)
  );

-- First published WARIBA_PERFORMANCE policy version.
-- Risk parameters mirror WARIBA_ONE's published policy exactly (PERF-032
-- daily_loss, PERF-033 maximum_loss, PERF-034 best_day — "same model as
-- Evaluation", DECISION_LOG.md v1.13's Performance section). No
-- profit_target_rate/recognized_profit/minimum_trading_days/
-- qualified_days_required/activation_fee: a Performance account has no
-- "pass" concept — see packages/policies/src/schema.ts's
-- performancePolicyParametersSchema and risk-engine.ts's
-- RiskPolicyParameters for why that field's mere absence is what keeps a
-- Performance account from ever being recommended into pass_pending.
--
-- machine_hash computed via @wariba/policies' own computeMachineHash over
-- this exact parameters_json (canonical key-sorted JSON, sha256) — verified
-- by parseAndVerifyPolicy's strict mode at every load, same as WARIBA_ONE.

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
  '1.0.0',
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
    'max_payout_cycles_before_review', 5
  ),
  null,
  'sha256:8ef60d024dc00d2a90b4be3b7f2aa5ee381a230ba6a36fb627d59155e1a501a6',
  now()
);
