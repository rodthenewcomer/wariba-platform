-- WARIBA Phase 3.4.2 — Canonical Policy Runtime Foundation & P0 closure.
-- Normative source: POLICY-GOV-003 + WARIBA_Canonical_Policy_Contract_V2.md.
-- V2 is additive and fail-closed: historical accounts keep their exact V1
-- policy UUID; all 15 V2 offers are represented but purchase/activation stay
-- disabled while margin/news/session readiness remains open.

-- -------------------------------------------------------------------------
-- Versioned runtime dependencies (server-only, deny by default)
-- -------------------------------------------------------------------------

create table app.margin_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_code text not null unique,
  product_family text not null check (product_family in ('WARIBA_ONE', 'WARIBA_FLEX', 'WARIBA_INSTANT')),
  account_phase text not null check (account_phase in ('evaluation', 'performance')),
  candidate_margin_cap_rate numeric(8, 6) not null check (candidate_margin_cap_rate > 0 and candidate_margin_cap_rate <= 1),
  leverage_by_asset_group jsonb not null,
  calibration_status text not null check (calibration_status in ('calibration_required', 'validated', 'retired')),
  decision_record_id text not null,
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  constraint margin_profile_validation_shape check (
    (calibration_status = 'validated' and validated_at is not null)
    or (calibration_status <> 'validated' and validated_at is null)
  )
);

create table app.news_calendar_versions (
  id uuid primary key default gen_random_uuid(),
  version_code text not null unique,
  provider text,
  status text not null check (status in ('candidate', 'ready', 'retired')),
  source_ready boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint news_calendar_ready_shape check (
    (status = 'ready' and source_ready and provider is not null and published_at is not null)
    or status <> 'ready'
  )
);

create table app.news_events (
  id uuid primary key default gen_random_uuid(),
  calendar_version_id uuid not null references app.news_calendar_versions (id),
  provider_event_id text not null,
  impact text not null check (impact in ('low', 'medium', 'high')),
  affected_asset_groups jsonb not null,
  scheduled_at timestamptz not null,
  window_starts_at timestamptz not null,
  window_ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (calendar_version_id, provider_event_id),
  constraint news_event_window_order check (window_starts_at <= scheduled_at and scheduled_at <= window_ends_at)
);

create table app.session_calendar_versions (
  id uuid primary key default gen_random_uuid(),
  version_code text not null unique,
  provider text,
  status text not null check (status in ('candidate', 'ready', 'retired')),
  source_ready boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint session_calendar_ready_shape check (
    (status = 'ready' and source_ready and provider is not null and published_at is not null)
    or status <> 'ready'
  )
);

create table app.session_closures (
  id uuid primary key default gen_random_uuid(),
  calendar_version_id uuid not null references app.session_calendar_versions (id),
  provider_closure_id text not null,
  affected_asset_groups jsonb not null,
  closes_at timestamptz not null,
  reopens_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (calendar_version_id, provider_closure_id),
  constraint session_closure_window_order check (reopens_at > closes_at)
);

alter table app.margin_profiles enable row level security;
alter table app.news_calendar_versions enable row level security;
alter table app.news_events enable row level security;
alter table app.session_calendar_versions enable row level security;
alter table app.session_closures enable row level security;
revoke all on app.margin_profiles, app.news_calendar_versions, app.news_events,
  app.session_calendar_versions, app.session_closures from anon, authenticated;

insert into app.margin_profiles
  (profile_code, product_family, account_phase, candidate_margin_cap_rate, leverage_by_asset_group, calibration_status, decision_record_id)
values
  ('V2-ONE-EVALUATION-CANDIDATE', 'WARIBA_ONE', 'evaluation', 0.20, '{"FX":50,"METALS":20,"INDICES":20,"ENERGY":10}', 'calibration_required', 'POLICY-GOV-003'),
  ('V2-ONE-PERFORMANCE-CANDIDATE', 'WARIBA_ONE', 'performance', 0.15, '{"FX":30,"METALS":15,"INDICES":10,"ENERGY":10}', 'calibration_required', 'POLICY-GOV-003'),
  ('V2-FLEX-EVALUATION-CANDIDATE', 'WARIBA_FLEX', 'evaluation', 0.20, '{"FX":50,"METALS":20,"INDICES":20,"ENERGY":10}', 'calibration_required', 'POLICY-GOV-003'),
  ('V2-FLEX-PERFORMANCE-CANDIDATE', 'WARIBA_FLEX', 'performance', 0.15, '{"FX":30,"METALS":15,"INDICES":10,"ENERGY":10}', 'calibration_required', 'POLICY-GOV-003'),
  ('V2-INSTANT-PERFORMANCE-CANDIDATE', 'WARIBA_INSTANT', 'performance', 0.10, '{"FX":30,"METALS":10,"INDICES":10,"ENERGY":5}', 'calibration_required', 'POLICY-GOV-003');

insert into app.news_calendar_versions (version_code, status, source_ready)
values ('V2-NEWS-PROVIDER-UNRESOLVED', 'candidate', false);
insert into app.session_calendar_versions (version_code, status, source_ready)
values ('V2-SESSIONS-PROVIDER-UNRESOLVED', 'candidate', false);

-- -------------------------------------------------------------------------
-- Policy identity, immutability and exact Evaluation -> Performance links
-- -------------------------------------------------------------------------

alter table app.policy_versions drop constraint policy_versions_program_check;
alter table app.policy_versions
  add constraint policy_versions_program_check
  check (program in ('WARIBA_ONE', 'WARIBA_FLEX', 'WARIBA_PERFORMANCE')) not valid;
alter table app.policy_versions validate constraint policy_versions_program_check;

alter table app.policy_versions drop constraint policy_versions_status_check;
alter table app.policy_versions
  add constraint policy_versions_status_check
  check (status in ('draft', 'reviewed', 'approved', 'pilot_ready', 'published', 'retired')) not valid;
alter table app.policy_versions validate constraint policy_versions_status_check;

alter table app.policy_versions
  add column product_family text check (product_family in ('WARIBA_ONE', 'WARIBA_FLEX', 'WARIBA_INSTANT')),
  add column account_phase text check (account_phase in ('evaluation', 'performance')),
  add column published_at timestamptz,
  add column decision_record_id text,
  add column news_calendar_version_id uuid references app.news_calendar_versions (id),
  add column session_calendar_version_id uuid references app.session_calendar_versions (id),
  add column margin_profile_id uuid references app.margin_profiles (id);

update app.policy_versions
set
  product_family = 'WARIBA_ONE',
  account_phase = case when program = 'WARIBA_PERFORMANCE' then 'performance' else 'evaluation' end,
  published_at = case when status = 'published' then coalesce(effective_from, created_at) else null end,
  decision_record_id = 'V1-HISTORICAL'
where product_family is null;

alter table app.policy_versions
  add constraint policy_versions_identity_complete check (
    product_family is not null and account_phase is not null and decision_record_id is not null
  ) not valid;
alter table app.policy_versions validate constraint policy_versions_identity_complete;

create unique index policy_versions_one_current_v2_publication
  on app.policy_versions (product_family, account_phase)
  where status = 'published'
    and parameters_json ->> 'contract_version' = 'WARIBA_POLICY_V2';

create table app.policy_performance_links (
  evaluation_policy_version_id uuid primary key references app.policy_versions (id),
  performance_policy_version_id uuid not null references app.policy_versions (id),
  decision_record_id text not null,
  created_at timestamptz not null default now(),
  constraint policy_performance_link_not_self check (evaluation_policy_version_id <> performance_policy_version_id)
);
alter table app.policy_performance_links enable row level security;
revoke all on app.policy_performance_links from anon, authenticated;

insert into app.policy_performance_links
  (evaluation_policy_version_id, performance_policy_version_id, decision_record_id)
select evaluation.id, performance.id, 'V1-HISTORICAL-COMPATIBILITY'
from app.policy_versions evaluation
cross join lateral (
  select id
  from app.policy_versions
  where program = 'WARIBA_PERFORMANCE' and status = 'published'
  order by created_at desc
  limit 1
) performance
where evaluation.program = 'WARIBA_ONE' and evaluation.account_phase = 'evaluation'
on conflict (evaluation_policy_version_id) do nothing;

create function app.enforce_policy_version_immutability()
returns trigger
language plpgsql
set search_path = pg_catalog, app
as $$
declare
  is_referenced boolean;
begin
  select
    exists (select 1 from app.trading_accounts where policy_version_id = old.id)
    or exists (select 1 from app.purchase_orders where policy_version_id = old.id)
    or exists (select 1 from app.user_consents where attached_policy_version_id = old.id)
    or exists (select 1 from app.product_versions where policy_version_id = old.id)
    or exists (
      select 1 from app.policy_performance_links
      where evaluation_policy_version_id = old.id or performance_policy_version_id = old.id
    )
    or exists (
      select 1 from app.flex_activation_obligations where performance_policy_version_id = old.id
    )
  into is_referenced;

  if tg_op = 'DELETE' and (old.status = 'published' or is_referenced) then
    raise exception using errcode = '23514', message = 'published or referenced policy versions cannot be deleted';
  end if;
  if tg_op = 'UPDATE' and (old.status = 'published' or is_referenced) and (
    new.program is distinct from old.program
    or new.product_family is distinct from old.product_family
    or new.account_phase is distinct from old.account_phase
    or new.semantic_version is distinct from old.semantic_version
    or new.parameters_json is distinct from old.parameters_json
    or new.human_document_hash is distinct from old.human_document_hash
    or new.machine_hash is distinct from old.machine_hash
    or new.effective_from is distinct from old.effective_from
    or new.decision_record_id is distinct from old.decision_record_id
    or new.news_calendar_version_id is distinct from old.news_calendar_version_id
    or new.session_calendar_version_id is distinct from old.session_calendar_version_id
    or new.margin_profile_id is distinct from old.margin_profile_id
  ) then
    raise exception using errcode = '23514', message = 'published or referenced policy content is immutable; create a new version';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- Created after commerce columns below so every referenced source is visible.

-- -------------------------------------------------------------------------
-- Catalogue: programme x size, exact immutable price components, separate gates
-- -------------------------------------------------------------------------

alter table app.products add column product_family text not null default 'WARIBA_ONE';
alter table app.products
  add constraint products_product_family_check
  check (product_family in ('WARIBA_ONE', 'WARIBA_FLEX', 'WARIBA_INSTANT'));
alter table app.products drop constraint products_code_key;
alter table app.products add constraint products_family_code_key unique (product_family, code);

insert into app.products (product_family, code, nominal_balance, nominal_currency)
select family, size_code, nominal, 'USD'
from (values
  ('WARIBA_FLEX', '5K', 5000), ('WARIBA_FLEX', '10K', 10000),
  ('WARIBA_FLEX', '25K', 25000), ('WARIBA_FLEX', '50K', 50000),
  ('WARIBA_FLEX', '100K', 100000), ('WARIBA_INSTANT', '5K', 5000),
  ('WARIBA_INSTANT', '10K', 10000), ('WARIBA_INSTANT', '25K', 25000),
  ('WARIBA_INSTANT', '50K', 50000), ('WARIBA_INSTANT', '100K', 100000)
) offers(family, size_code, nominal)
on conflict (product_family, code) do nothing;

alter table app.product_versions
  add column activation_price_amount numeric(14, 2) not null default 0 check (activation_price_amount >= 0),
  add column total_price_if_success numeric(14, 2),
  add column catalogue_version text not null default 'v1-historical',
  add column catalogue_status text not null default 'historical' check (catalogue_status in ('historical', 'public_candidate', 'public')),
  add column purchase_enabled boolean not null default true,
  add column activation_enabled boolean not null default true,
  add column gate_reason_code text,
  add column decision_record_id text,
  add column policy_version_id uuid references app.policy_versions (id);

update app.product_versions
set
  activation_price_amount = activation_fee,
  total_price_if_success = price_amount + activation_fee,
  decision_record_id = 'V1-HISTORICAL',
  policy_version_id = (
    select id from app.policy_versions
    where program = 'WARIBA_ONE' and status = 'published'
    order by created_at desc limit 1
  )
where total_price_if_success is null;
alter table app.product_versions alter column total_price_if_success set not null;

-- -------------------------------------------------------------------------
-- Exact consent/order/account pinning and immutable provenance
-- -------------------------------------------------------------------------

alter table app.user_consents
  add column attached_policy_version_id uuid references app.policy_versions (id),
  add column policy_machine_hash text,
  add column policy_human_document_hash text,
  add column acceptance_source text not null default 'legacy_checkout';

with resolved_consents as (
  select distinct on (consent.id)
    consent.id as consent_id,
    policy.id as policy_id,
    policy.machine_hash,
    policy.human_document_hash
  from app.user_consents consent
  join app.policy_versions policy
    on policy.semantic_version = consent.policy_version_id
   and policy.product_family = 'WARIBA_ONE'
  where consent.attached_policy_version_id is null
  order by consent.id, policy.created_at desc
)
update app.user_consents consent
set
  attached_policy_version_id = resolved.policy_id,
  policy_machine_hash = resolved.machine_hash,
  policy_human_document_hash = resolved.human_document_hash
from resolved_consents resolved
where consent.id = resolved.consent_id;

create unique index user_consents_exact_policy_acceptance_uidx
  on app.user_consents (user_id, consent_type, attached_policy_version_id, locale)
  where attached_policy_version_id is not null;

alter table app.purchase_orders
  add column policy_version_id uuid references app.policy_versions (id),
  add column policy_machine_hash text,
  add column policy_human_document_hash text,
  add column product_family text check (product_family in ('WARIBA_ONE', 'WARIBA_FLEX', 'WARIBA_INSTANT')),
  add column order_kind text not null default 'initial_purchase' check (order_kind in ('initial_purchase', 'flex_activation')),
  add column parent_purchase_order_id uuid references app.purchase_orders (id),
  add column source_evaluation_account_id uuid references app.trading_accounts (id),
  add column upfront_price_snapshot numeric(14, 2),
  add column activation_price_snapshot numeric(14, 2),
  add column total_price_if_success_snapshot numeric(14, 2),
  add column activation_due_at timestamptz;

with order_policy_ids as (
  select
    purchase_order.id as purchase_order_id,
    coalesce(
      (
        select policy.id
        from app.user_consents consent
        join app.policy_versions policy
          on policy.semantic_version = consent.policy_version_id
         and policy.product_family = 'WARIBA_ONE'
        where consent.user_id = purchase_order.user_id
          and consent.accepted_at <= purchase_order.created_at
        order by consent.accepted_at desc, policy.created_at desc
        limit 1
      ),
      version.policy_version_id
    ) as policy_version_id,
    product.product_family,
    version.price_amount,
    version.activation_price_amount,
    version.total_price_if_success
  from app.purchase_orders purchase_order
  join app.product_versions version on version.id = purchase_order.product_version_id
  join app.products product on product.id = version.product_id
), resolved_orders as (
  select order_policy_ids.*, policy.machine_hash, policy.human_document_hash
  from order_policy_ids
  left join app.policy_versions policy on policy.id = order_policy_ids.policy_version_id
)
update app.purchase_orders purchase_order
set
  policy_version_id = resolved.policy_version_id,
  policy_machine_hash = resolved.machine_hash,
  policy_human_document_hash = resolved.human_document_hash,
  product_family = resolved.product_family,
  upfront_price_snapshot = resolved.price_amount,
  activation_price_snapshot = resolved.activation_price_amount,
  total_price_if_success_snapshot = resolved.total_price_if_success
from resolved_orders resolved
where purchase_order.id = resolved.purchase_order_id;

create unique index purchase_orders_one_flex_activation_per_evaluation
  on app.purchase_orders (source_evaluation_account_id)
  where order_kind = 'flex_activation';

alter table app.trading_accounts drop constraint trading_accounts_program_type_check;
alter table app.trading_accounts
  add constraint trading_accounts_program_type_check
  check (program_type in ('WARIBA_ONE', 'WARIBA_FLEX', 'WARIBA_PERFORMANCE')) not valid;
alter table app.trading_accounts validate constraint trading_accounts_program_type_check;
alter table app.trading_accounts
  add column product_family text not null default 'WARIBA_ONE'
  check (product_family in ('WARIBA_ONE', 'WARIBA_FLEX', 'WARIBA_INSTANT'));

create function app.enforce_account_policy_pin()
returns trigger
language plpgsql
set search_path = pg_catalog, app
as $$
begin
  if new.policy_version_id is distinct from old.policy_version_id then
    raise exception using errcode = '23514', message = 'trading account policy pin is immutable';
  end if;
  if new.product_family is distinct from old.product_family then
    raise exception using errcode = '23514', message = 'trading account product provenance is immutable';
  end if;
  return new;
end;
$$;
create trigger trading_accounts_policy_pin_guard
before update on app.trading_accounts
for each row execute function app.enforce_account_policy_pin();

create trigger policy_versions_immutable_guard
before update or delete on app.policy_versions
for each row execute function app.enforce_policy_version_immutability();

-- -------------------------------------------------------------------------
-- Risk-adjusted daily projection: payout debit remains financial, never risk
-- -------------------------------------------------------------------------

alter table app.account_daily_snapshots
  add column risk_sod_balance numeric(14, 2),
  add column risk_eod_balance numeric(14, 2),
  add column highest_risk_eod_balance_after numeric(14, 2),
  add column risk_adjusted_realized_net_profit_for_day numeric(14, 2);
update app.account_daily_snapshots
set
  risk_sod_balance = program_sod_balance,
  risk_eod_balance = program_eod_balance,
  highest_risk_eod_balance_after = highest_program_eod_balance_after,
  risk_adjusted_realized_net_profit_for_day = eligible_realized_net_profit_for_day;
alter table app.account_daily_snapshots alter column risk_sod_balance set not null;

create function app.default_risk_snapshot_projection()
returns trigger
language plpgsql
set search_path = pg_catalog, app
as $$
begin
  new.risk_sod_balance := coalesce(new.risk_sod_balance, new.program_sod_balance);
  new.risk_eod_balance := coalesce(new.risk_eod_balance, new.program_eod_balance);
  new.highest_risk_eod_balance_after := coalesce(
    new.highest_risk_eod_balance_after,
    new.highest_program_eod_balance_after
  );
  new.risk_adjusted_realized_net_profit_for_day := coalesce(
    new.risk_adjusted_realized_net_profit_for_day,
    new.eligible_realized_net_profit_for_day
  );
  return new;
end;
$$;
create trigger account_daily_snapshots_risk_projection_default
before insert on app.account_daily_snapshots
for each row execute function app.default_risk_snapshot_projection();

-- -------------------------------------------------------------------------
-- FLEX activation obligation and capability gates
-- -------------------------------------------------------------------------

create table app.flex_activation_obligations (
  id uuid primary key default gen_random_uuid(),
  evaluation_account_id uuid not null unique references app.trading_accounts (id),
  activation_order_id uuid not null unique references app.purchase_orders (id),
  performance_policy_version_id uuid not null references app.policy_versions (id),
  status text not null default 'activation_due' check (status in ('activation_due', 'paid', 'fulfilled', 'expired')),
  amount_snapshot numeric(14, 2) not null check (amount_snapshot > 0),
  currency_snapshot text not null,
  due_at timestamptz not null,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flex_activation_status_shape check (
    (status = 'activation_due' and paid_at is null and fulfilled_at is null)
    or (status = 'paid' and paid_at is not null and fulfilled_at is null)
    or (status = 'fulfilled' and paid_at is not null and fulfilled_at is not null)
    or (status = 'expired' and fulfilled_at is null)
  )
);
alter table app.flex_activation_obligations enable row level security;
revoke all on app.flex_activation_obligations from anon, authenticated;

create table app.offer_capability_gates (
  id uuid primary key default gen_random_uuid(),
  product_version_id uuid not null references app.product_versions (id),
  country_code text not null default '*',
  channel text not null default 'all',
  purchase_enabled boolean not null default false,
  activation_enabled boolean not null default false,
  reserve_ready boolean not null default false,
  quota_ready boolean not null default false,
  reason_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_version_id, country_code, channel)
);
alter table app.offer_capability_gates enable row level security;
revoke all on app.offer_capability_gates from anon, authenticated;

-- -------------------------------------------------------------------------
-- Five exact V2 policies. pilot_ready is not public activation: every row
-- remains blocked by calibration and unresolved calendar sources.
-- -------------------------------------------------------------------------

insert into app.policy_versions
  (program, product_family, account_phase, semantic_version, status, parameters_json,
   machine_hash, effective_from, decision_record_id, news_calendar_version_id,
   session_calendar_version_id, margin_profile_id)
values
  ('WARIBA_ONE', 'WARIBA_ONE', 'evaluation', '2.0.0', 'pilot_ready',
   '{"profit_target_rate":"0.08","recognized_profit":"realized_net_profit_only","daily_loss_rate":"0.03","daily_loss_action":"soft_lock","maximum_loss_rate":"0.08","maximum_loss_model":"eod_trailing","maximum_loss_floor_formula":"min(nominal_balance, max(previous_floor, highest_risk_adjusted_eod_balance - nominal_balance * maximum_loss_rate))","maximum_loss_floor_never_decreases":true,"maximum_loss_locks_at_nominal":true,"best_day_max_ratio":"0.35","best_day_breach_capable":false,"minimum_trading_days":0,"qualified_days_required":null,"overnight_allowed":true,"weekend_allowed":true,"news_allowed":true,"activation_fee":"0","program_eligible_balance_enabled":true,"minimum_profit_eligible_duration_ms":60000,"contract_version":"WARIBA_POLICY_V2","decision_record_id":"POLICY-GOV-003","product_family":"WARIBA_ONE","account_phase":"evaluation","inactivity_warning_days":21,"inactivity_close_days":30,"payout_debit_risk_neutral":true,"weekend_new_exposure_cutoff_minutes":30,"weekend_minimum_closure_minutes":120,"news_policy":"evaluation_unrestricted","session_calendar_required":true,"news_calendar_required":false,"margin_calibration_status":"calibration_required","leverage_profile_status":"candidate","leverage_by_asset_group":{"FX":50,"METALS":20,"INDICES":20,"ENERGY":10},"candidate_margin_cap_rate":"0.20"}',
   'sha256:2df974ac9d497d9b928d61725f8539e492f5514f51b6510dfc43796c2dd09fb6', now(), 'POLICY-GOV-003', null,
   (select id from app.session_calendar_versions where version_code = 'V2-SESSIONS-PROVIDER-UNRESOLVED'),
   (select id from app.margin_profiles where profile_code = 'V2-ONE-EVALUATION-CANDIDATE')),
  ('WARIBA_FLEX', 'WARIBA_FLEX', 'evaluation', '2.0.0', 'pilot_ready',
   '{"profit_target_rate":"0.04","recognized_profit":"realized_net_profit_only","daily_loss_rate":"0.03","daily_loss_action":"soft_lock","maximum_loss_rate":"0.06","maximum_loss_model":"eod_trailing","maximum_loss_floor_formula":"min(nominal_balance, max(previous_floor, highest_risk_adjusted_eod_balance - nominal_balance * maximum_loss_rate))","maximum_loss_floor_never_decreases":true,"maximum_loss_locks_at_nominal":true,"best_day_max_ratio":"0.35","best_day_breach_capable":false,"minimum_trading_days":0,"qualified_days_required":null,"overnight_allowed":true,"weekend_allowed":true,"news_allowed":true,"activation_fee":"0","program_eligible_balance_enabled":true,"minimum_profit_eligible_duration_ms":60000,"contract_version":"WARIBA_POLICY_V2","decision_record_id":"POLICY-GOV-003","product_family":"WARIBA_FLEX","account_phase":"evaluation","inactivity_warning_days":21,"inactivity_close_days":30,"payout_debit_risk_neutral":true,"weekend_new_exposure_cutoff_minutes":30,"weekend_minimum_closure_minutes":120,"news_policy":"evaluation_unrestricted","session_calendar_required":true,"news_calendar_required":false,"margin_calibration_status":"calibration_required","leverage_profile_status":"candidate","leverage_by_asset_group":{"FX":50,"METALS":20,"INDICES":20,"ENERGY":10},"candidate_margin_cap_rate":"0.20"}',
   'sha256:f3a2347cf9beaffaf9293fc39158da74b05aa5eaba1f650ed59e5bcadfc89051', now(), 'POLICY-GOV-003', null,
   (select id from app.session_calendar_versions where version_code = 'V2-SESSIONS-PROVIDER-UNRESOLVED'),
   (select id from app.margin_profiles where profile_code = 'V2-FLEX-EVALUATION-CANDIDATE')),
  ('WARIBA_PERFORMANCE', 'WARIBA_ONE', 'performance', '2.0.0-one', 'pilot_ready',
   '{"daily_loss_rate":"0.03","daily_loss_action":"soft_lock","maximum_loss_rate":"0.08","maximum_loss_model":"eod_trailing","maximum_loss_floor_formula":"min(nominal_balance, max(previous_floor, highest_risk_adjusted_eod_balance - nominal_balance * maximum_loss_rate))","maximum_loss_floor_never_decreases":true,"maximum_loss_locks_at_nominal":true,"best_day_max_ratio":"0.35","best_day_breach_capable":false,"overnight_allowed":true,"weekend_allowed":true,"news_allowed":false,"program_eligible_balance_enabled":true,"minimum_profit_eligible_duration_ms":60000,"permanent_buffer_rate":"0.02","performance_day_threshold_rate":"0.005","performance_days_required_per_payout":5,"trader_split_rate_default":"0.80","trader_split_rate_final_cycle":"0.90","max_payout_cycles_before_review":5,"payout_caps_by_nominal_balance":{"5000.00":["250","250","350","350","500"],"10000.00":["400","400","600","600","800"],"25000.00":["900","900","1250","1250","1750"],"50000.00":["1500","1500","2200","2200","3000"],"100000.00":["2500","2500","3500","3500","5000"]},"payout_split_schedule":["0.80","0.80","0.85","0.85","0.90"],"contract_version":"WARIBA_POLICY_V2","decision_record_id":"POLICY-GOV-003","product_family":"WARIBA_ONE","account_phase":"performance","inactivity_warning_days":21,"inactivity_close_days":30,"payout_debit_risk_neutral":true,"weekend_new_exposure_cutoff_minutes":30,"weekend_minimum_closure_minutes":120,"news_policy":"performance_high_impact_t2_reduce_close_only","session_calendar_required":true,"news_calendar_required":true,"margin_calibration_status":"calibration_required","leverage_profile_status":"candidate","leverage_by_asset_group":{"FX":30,"METALS":15,"INDICES":10,"ENERGY":10},"candidate_margin_cap_rate":"0.15"}',
   'sha256:248f59456d036513f59f6a8809e73f5c74af5460e7275f074b6785a583e1f098', now(), 'POLICY-GOV-003',
   (select id from app.news_calendar_versions where version_code = 'V2-NEWS-PROVIDER-UNRESOLVED'),
   (select id from app.session_calendar_versions where version_code = 'V2-SESSIONS-PROVIDER-UNRESOLVED'),
   (select id from app.margin_profiles where profile_code = 'V2-ONE-PERFORMANCE-CANDIDATE')),
  ('WARIBA_PERFORMANCE', 'WARIBA_FLEX', 'performance', '2.0.0-flex', 'pilot_ready',
   '{"daily_loss_rate":"0.03","daily_loss_action":"soft_lock","maximum_loss_rate":"0.06","maximum_loss_model":"eod_trailing","maximum_loss_floor_formula":"min(nominal_balance, max(previous_floor, highest_risk_adjusted_eod_balance - nominal_balance * maximum_loss_rate))","maximum_loss_floor_never_decreases":true,"maximum_loss_locks_at_nominal":true,"best_day_max_ratio":"0.35","best_day_breach_capable":false,"overnight_allowed":true,"weekend_allowed":true,"news_allowed":false,"program_eligible_balance_enabled":true,"minimum_profit_eligible_duration_ms":60000,"permanent_buffer_rate":"0.03","performance_day_threshold_rate":"0.005","performance_days_required_per_payout":5,"trader_split_rate_default":"0.80","trader_split_rate_final_cycle":"0.90","max_payout_cycles_before_review":5,"payout_caps_by_nominal_balance":{"5000.00":["250","250","350","350","500"],"10000.00":["400","400","600","600","800"],"25000.00":["900","900","1250","1250","1750"],"50000.00":["1500","1500","2200","2200","3000"],"100000.00":["2500","2500","3500","3500","5000"]},"payout_split_schedule":["0.80","0.80","0.85","0.85","0.90"],"contract_version":"WARIBA_POLICY_V2","decision_record_id":"POLICY-GOV-003","product_family":"WARIBA_FLEX","account_phase":"performance","inactivity_warning_days":21,"inactivity_close_days":30,"payout_debit_risk_neutral":true,"weekend_new_exposure_cutoff_minutes":30,"weekend_minimum_closure_minutes":120,"news_policy":"performance_high_impact_t2_reduce_close_only","session_calendar_required":true,"news_calendar_required":true,"margin_calibration_status":"calibration_required","leverage_profile_status":"candidate","leverage_by_asset_group":{"FX":30,"METALS":15,"INDICES":10,"ENERGY":10},"candidate_margin_cap_rate":"0.15"}',
   'sha256:f42d637e6ba2714b94e3ff9aee13410a50deda2e56664c0850d302ddea3c05e6', now(), 'POLICY-GOV-003',
   (select id from app.news_calendar_versions where version_code = 'V2-NEWS-PROVIDER-UNRESOLVED'),
   (select id from app.session_calendar_versions where version_code = 'V2-SESSIONS-PROVIDER-UNRESOLVED'),
   (select id from app.margin_profiles where profile_code = 'V2-FLEX-PERFORMANCE-CANDIDATE')),
  ('WARIBA_PERFORMANCE', 'WARIBA_INSTANT', 'performance', '2.0.0-instant', 'pilot_ready',
   '{"daily_loss_rate":"0.02","daily_loss_action":"soft_lock","maximum_loss_rate":"0.05","maximum_loss_model":"eod_trailing","maximum_loss_floor_formula":"min(nominal_balance, max(previous_floor, highest_risk_adjusted_eod_balance - nominal_balance * maximum_loss_rate))","maximum_loss_floor_never_decreases":true,"maximum_loss_locks_at_nominal":true,"best_day_max_ratio":"0.30","best_day_breach_capable":false,"overnight_allowed":true,"weekend_allowed":true,"news_allowed":false,"program_eligible_balance_enabled":true,"minimum_profit_eligible_duration_ms":60000,"permanent_buffer_rate":"0.03","performance_day_threshold_rate":"0.005","performance_days_required_per_payout":5,"trader_split_rate_default":"0.80","trader_split_rate_final_cycle":"0.90","max_payout_cycles_before_review":5,"payout_caps_by_nominal_balance":{"5000.00":["250","250","350","350","500"],"10000.00":["400","400","600","600","800"],"25000.00":["900","900","1250","1250","1750"],"50000.00":["1500","1500","2200","2200","3000"],"100000.00":["2500","2500","3500","3500","5000"]},"payout_split_schedule":["0.80","0.80","0.85","0.85","0.90"],"contract_version":"WARIBA_POLICY_V2","decision_record_id":"POLICY-GOV-003","product_family":"WARIBA_INSTANT","account_phase":"performance","inactivity_warning_days":21,"inactivity_close_days":30,"payout_debit_risk_neutral":true,"weekend_new_exposure_cutoff_minutes":30,"weekend_minimum_closure_minutes":120,"news_policy":"performance_high_impact_t2_reduce_close_only","session_calendar_required":true,"news_calendar_required":true,"margin_calibration_status":"calibration_required","leverage_profile_status":"candidate","leverage_by_asset_group":{"FX":30,"METALS":10,"INDICES":10,"ENERGY":5},"candidate_margin_cap_rate":"0.10"}',
   'sha256:f1e8b4413af408f3c914822566dd0ea88c25c7301be7d48510ec0527867f89b4', now(), 'POLICY-GOV-003',
   (select id from app.news_calendar_versions where version_code = 'V2-NEWS-PROVIDER-UNRESOLVED'),
   (select id from app.session_calendar_versions where version_code = 'V2-SESSIONS-PROVIDER-UNRESOLVED'),
   (select id from app.margin_profiles where profile_code = 'V2-INSTANT-PERFORMANCE-CANDIDATE'));

insert into app.policy_performance_links
  (evaluation_policy_version_id, performance_policy_version_id, decision_record_id)
select evaluation.id, performance.id, 'POLICY-GOV-003'
from app.policy_versions evaluation
join app.policy_versions performance
  on performance.product_family = evaluation.product_family
 and performance.account_phase = 'performance'
 and performance.parameters_json ->> 'contract_version' = 'WARIBA_POLICY_V2'
where evaluation.account_phase = 'evaluation'
  and evaluation.parameters_json ->> 'contract_version' = 'WARIBA_POLICY_V2'
on conflict (evaluation_policy_version_id) do nothing;

insert into app.product_versions
  (product_id, price_amount, activation_price_amount, total_price_if_success,
   price_currency, activation_fee, catalogue_version, catalogue_status,
   purchase_enabled, activation_enabled, gate_reason_code, decision_record_id,
   policy_version_id, feature_flag_key)
select
  product.id,
  price.upfront,
  price.activation,
  price.total,
  'XOF',
  0,
  'v2.0.0-candidate',
  'public_candidate',
  false,
  false,
  case
    when product.product_family = 'WARIBA_INSTANT' and product.code in ('50K', '100K')
      then 'INSTANT_DEDICATED_RESERVE_REQUIRED'
    else 'V2_PUBLIC_ACTIVATION_BLOCKED'
  end,
  'POLICY-GOV-003',
  policy.id,
  null
from app.products product
join (values
  ('WARIBA_ONE', '5K', 19900, 0, 19900), ('WARIBA_ONE', '10K', 34900, 0, 34900),
  ('WARIBA_ONE', '25K', 69900, 0, 69900), ('WARIBA_ONE', '50K', 119900, 0, 119900),
  ('WARIBA_ONE', '100K', 199900, 0, 199900), ('WARIBA_FLEX', '5K', 9900, 25900, 35800),
  ('WARIBA_FLEX', '10K', 14900, 39900, 54800), ('WARIBA_FLEX', '25K', 24900, 109900, 134800),
  ('WARIBA_FLEX', '50K', 34900, 184900, 219800), ('WARIBA_FLEX', '100K', 44900, 269900, 314800),
  ('WARIBA_INSTANT', '5K', 39900, 0, 39900), ('WARIBA_INSTANT', '10K', 59900, 0, 59900),
  ('WARIBA_INSTANT', '25K', 99900, 0, 99900), ('WARIBA_INSTANT', '50K', 169900, 0, 169900),
  ('WARIBA_INSTANT', '100K', 279900, 0, 279900)
) price(family, size_code, upfront, activation, total)
  on price.family = product.product_family and price.size_code = product.code
join app.policy_versions policy
  on policy.product_family = product.product_family
 and policy.parameters_json ->> 'contract_version' = 'WARIBA_POLICY_V2'
 and (
   (product.product_family in ('WARIBA_ONE', 'WARIBA_FLEX') and policy.account_phase = 'evaluation')
   or (product.product_family = 'WARIBA_INSTANT' and policy.account_phase = 'performance')
 );

insert into app.offer_capability_gates
  (product_version_id, country_code, channel, purchase_enabled, activation_enabled, reserve_ready, quota_ready, reason_code)
select id, '*', 'all', false, false, false, false, coalesce(gate_reason_code, 'V2_PUBLIC_ACTIVATION_BLOCKED')
from app.product_versions
where catalogue_version = 'v2.0.0-candidate';

comment on table app.policy_performance_links is
  'Exact immutable Evaluation-to-Performance policy compatibility; never resolve a child by latest global policy.';
comment on table app.flex_activation_obligations is
  'FLEX pass keeps its acquired right while the frozen activation price is payable for 30 days; exactly one obligation/order per Evaluation.';
comment on column app.product_versions.purchase_enabled is
  'Internal checkout capability only. It never controls whether the offer belongs to the public catalogue.';
comment on column app.account_daily_snapshots.risk_sod_balance is
  'Program-eligible balance with authorized payout debit/reversal effects neutralized for Daily/Maximum-Loss only.';
