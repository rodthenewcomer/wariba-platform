-- Prompt 03 — Identity, Commerce & Activation
-- Non-destructive: additive only, no existing objects altered or dropped.
-- Money: numeric, never float. Instants: timestamptz. Ledger: append-only.

-- =========================================================================
-- IDENTITY
-- =========================================================================

create table app.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text not null check (char_length(last_name) between 1 and 100),
  country text not null check (char_length(country) = 2),
  language text not null default 'fr' check (char_length(language) between 2 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_type text not null check (consent_type in ('terms', 'privacy', 'simulated_account_disclosure')),
  policy_version_id text not null,
  locale text not null,
  accepted_at timestamptz not null default now()
);
create index user_consents_user_id_idx on app.user_consents (user_id);

-- =========================================================================
-- POLICY (minimal — just enough to attach a version to an account;
-- full Policy Engine is Prompt 05 scope)
-- =========================================================================

create table app.policy_versions (
  id uuid primary key default gen_random_uuid(),
  program text not null check (program in ('WARIBA_ONE', 'WARIBA_PERFORMANCE')),
  semantic_version text not null,
  status text not null check (status in ('draft', 'reviewed', 'approved', 'published', 'retired')),
  parameters_json jsonb not null,
  human_document_hash text,
  machine_hash text,
  effective_from timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  unique (program, semantic_version)
);

-- =========================================================================
-- SYMBOL SPEC SETS (minimal reference — full Trading Core is Prompt 04)
-- =========================================================================

create table app.symbol_spec_sets (
  id uuid primary key default gen_random_uuid(),
  set_id text not null unique,
  status text not null check (status in ('sandbox_candidate', 'published', 'retired')),
  specs_json jsonb not null,
  published_at timestamptz not null default now()
);

-- =========================================================================
-- COMMERCE
-- =========================================================================

create table app.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('5K', '10K', '25K')),
  nominal_balance numeric(14, 2) not null check (nominal_balance > 0),
  nominal_currency text not null default 'USD',
  created_at timestamptz not null default now()
);

create table app.product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references app.products (id),
  price_amount numeric(14, 2) not null check (price_amount >= 0),
  price_currency text not null default 'XOF',
  activation_fee numeric(14, 2) not null default 0 check (activation_fee = 0),
  feature_flag_key text,
  effective_from timestamptz not null default now(),
  retired_at timestamptz,
  created_at timestamptz not null default now()
);
create index product_versions_product_id_idx on app.product_versions (product_id);

create table app.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  product_version_id uuid not null references app.product_versions (id),
  idempotency_key text not null,
  status text not null default 'created'
    check (status in ('created', 'pending_payment', 'paid', 'fulfilled', 'payment_failed', 'cancelled', 'refunded')),
  total_amount numeric(14, 2) not null check (total_amount >= 0),
  total_currency text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index purchase_orders_user_id_idx on app.purchase_orders (user_id);

create table app.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references app.purchase_orders (id),
  provider text not null default 'sandbox',
  status text not null default 'initiated'
    check (status in ('initiated', 'pending', 'confirmed', 'failed')),
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null,
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payment_attempts_purchase_order_id_idx on app.payment_attempts (purchase_order_id);

-- Webhook idempotency enforced by a real DB constraint, not application logic.
create table app.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  signature_valid boolean not null,
  purchase_order_id uuid references app.purchase_orders (id),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

create table app.receipts (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references app.purchase_orders (id) unique,
  amount numeric(14, 2) not null,
  currency text not null,
  issued_at timestamptz not null default now()
);

-- =========================================================================
-- TRADING ACCOUNT (Evaluation account creation on activation —
-- full Trading Core is Prompt 04, this is the minimal shape Prompt 03 needs)
-- =========================================================================

create table app.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  user_id uuid not null references auth.users (id),
  source_purchase_order_id uuid not null references app.purchase_orders (id) unique,
  program_type text not null default 'WARIBA_ONE' check (program_type in ('WARIBA_ONE', 'WARIBA_PERFORMANCE')),
  nominal_balance numeric(14, 2) not null check (nominal_balance > 0),
  currency text not null default 'USD',
  status text not null default 'pending_activation'
    check (status in ('pending_activation', 'active', 'soft_locked', 'pass_pending', 'inactive', 'passed', 'breached', 'closed')),
  policy_version_id uuid not null references app.policy_versions (id),
  symbol_spec_set_id uuid not null references app.symbol_spec_sets (id),
  activated_at timestamptz,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trading_accounts_user_id_idx on app.trading_accounts (user_id);

create table app.account_state_transitions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.trading_accounts (id),
  from_status text,
  to_status text not null,
  reason text not null,
  occurred_at timestamptz not null default now()
);
create index account_state_transitions_account_id_idx on app.account_state_transitions (account_id);

-- Append-only ledger — corrections via reversal + new entry, never UPDATE/DELETE.
create table app.trading_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.trading_accounts (id),
  entry_type text not null check (entry_type in ('initial_balance', 'realized_pnl', 'commission', 'swap', 'payout_debit', 'authorized_adjustment', 'reversal')),
  amount numeric(14, 2) not null,
  currency text not null default 'USD',
  reference_type text,
  reference_id uuid,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  reversal_of uuid references app.trading_ledger_entries (id)
);
create index trading_ledger_entries_account_id_idx on app.trading_ledger_entries (account_id);

-- =========================================================================
-- OPERATIONS — outbox (transactional) and audit (append-only)
-- =========================================================================

create table app.outbox_events (
  id uuid primary key default gen_random_uuid(),
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  event_version integer not null default 1,
  payload jsonb not null,
  occurred_at timestamptz not null default now(),
  published_at timestamptz,
  attempt_count integer not null default 0,
  next_attempt_at timestamptz,
  last_error text
);
create index outbox_events_unpublished_idx on app.outbox_events (occurred_at) where published_at is null;

create table audit.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('user', 'system', 'staff', 'service')),
  actor_id uuid,
  role text,
  permission text,
  action text not null,
  target_type text not null,
  target_id uuid,
  before_json jsonb,
  after_json jsonb,
  reason text,
  source text not null,
  correlation_id text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index audit_events_target_idx on audit.audit_events (target_type, target_id);

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================

alter table app.user_profiles enable row level security;
alter table app.user_consents enable row level security;
alter table app.purchase_orders enable row level security;
alter table app.payment_attempts enable row level security;
alter table app.receipts enable row level security;
alter table app.trading_accounts enable row level security;
alter table app.account_state_transitions enable row level security;
alter table app.trading_ledger_entries enable row level security;

-- No RLS needed on: policy_versions, symbol_spec_sets, products, product_versions
-- (public reference data, readable via BFF), payment_events/outbox_events/audit_events
-- (server/service-role only, never queried by the browser per System Architecture §21.3).
-- Deny-by-default: RLS enabled with no policies = zero access until granted below.

revoke all on app.payment_events, app.outbox_events, audit.audit_events from anon, authenticated;

-- user_profiles: owner can read/update own row. No client insert (server creates on signup).
create policy user_profiles_select_own on app.user_profiles
  for select using (auth.uid() = user_id);
create policy user_profiles_update_own on app.user_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_consents: owner can read/insert own consent records. Never updated or deleted (audit trail).
create policy user_consents_select_own on app.user_consents
  for select using (auth.uid() = user_id);
create policy user_consents_insert_own on app.user_consents
  for insert with check (auth.uid() = user_id);

-- purchase_orders: owner can read own orders. No client insert/update — server authoritative
-- (price, currency, and status are never client-writable — System Architecture §21.3, ENG-002).
create policy purchase_orders_select_own on app.purchase_orders
  for select using (auth.uid() = user_id);

-- payment_attempts: owner can read own attempts (for checkout status polling). Server-only writes.
create policy payment_attempts_select_own on app.payment_attempts
  for select using (
    exists (
      select 1 from app.purchase_orders po
      where po.id = payment_attempts.purchase_order_id and po.user_id = auth.uid()
    )
  );

-- receipts: owner can read own receipts.
create policy receipts_select_own on app.receipts
  for select using (
    exists (
      select 1 from app.purchase_orders po
      where po.id = receipts.purchase_order_id and po.user_id = auth.uid()
    )
  );

-- trading_accounts: owner can read own accounts. No client writes — server authoritative
-- (AGENTS.md §13.4: "Aucune écriture client directe sur ... comptes").
create policy trading_accounts_select_own on app.trading_accounts
  for select using (auth.uid() = user_id);

-- account_state_transitions: owner can read transitions for their own accounts (evidence trail).
create policy account_state_transitions_select_own on app.account_state_transitions
  for select using (
    exists (
      select 1 from app.trading_accounts ta
      where ta.id = account_state_transitions.account_id and ta.user_id = auth.uid()
    )
  );

-- trading_ledger_entries: owner can read own ledger (transparency — UX-015: metrics open their source).
create policy trading_ledger_entries_select_own on app.trading_ledger_entries
  for select using (
    exists (
      select 1 from app.trading_accounts ta
      where ta.id = trading_ledger_entries.account_id and ta.user_id = auth.uid()
    )
  );

-- =========================================================================
-- SANDBOX SEED DATA (candidate products/prices/policy per Program Rulebook)
-- =========================================================================

insert into app.products (code, nominal_balance, nominal_currency) values
  ('5K', 5000, 'USD'),
  ('10K', 10000, 'USD'),
  ('25K', 25000, 'USD');

insert into app.product_versions (product_id, price_amount, price_currency, feature_flag_key)
select id, 14900, 'XOF', null from app.products where code = '5K'
union all
select id, 27900, 'XOF', null from app.products where code = '10K'
union all
select id, 59900, 'XOF', 'product_25k_enabled' from app.products where code = '25K';

insert into app.policy_versions (program, semantic_version, status, parameters_json, effective_from)
values (
  'WARIBA_ONE', '1.0.0', 'published',
  '{"profit_target_rate":"0.08","daily_loss_rate":"0.04","maximum_loss_rate":"0.08","consistency_max_ratio":"0.40","minimum_trading_days":4,"qualified_days_required":3,"qualified_day_min_rate":"0.0020"}'::jsonb,
  now()
);

insert into app.symbol_spec_sets (set_id, status, specs_json)
values (
  'WARIBA-SANDBOX-SYMBOLS-1.0.0', 'sandbox_candidate',
  '{"symbols":["EURUSD","GBPUSD","USDJPY","XAUUSD","NAS100"]}'::jsonb
);
