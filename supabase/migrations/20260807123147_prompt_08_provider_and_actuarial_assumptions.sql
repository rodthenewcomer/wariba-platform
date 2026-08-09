alter table app.payout_requests
  add column provider_idempotency_key text,
  add column provider_status text
    check (provider_status in ('pending', 'processing', 'paid', 'failed', 'returned')),
  add column provider_submission_result jsonb,
  add column provider_submitted_at timestamptz,
  add column provider_reconciliation_result jsonb,
  add column provider_reconciled_at timestamptz,
  add column provider_reconciled_by uuid references auth.users (id);

create unique index payout_requests_provider_idempotency_key_unique
  on app.payout_requests (provider_idempotency_key)
  where provider_idempotency_key is not null;

create unique index payout_requests_provider_reference_unique
  on app.payout_requests (provider, provider_reference)
  where provider is not null and provider_reference is not null;

create table app.actuarial_scenario_assumptions (
  id uuid primary key default gen_random_uuid(),
  scenario_name text not null
    check (scenario_name in ('conservative', 'base', 'aggressive', 'stress')),
  version integer not null default 1 check (version > 0),
  assumptions_json jsonb not null check (jsonb_typeof(assumptions_json) = 'object'),
  change_reason text not null check (length(btrim(change_reason)) > 0),
  is_active boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (scenario_name, version)
);

create unique index actuarial_scenario_assumptions_one_active_per_scenario
  on app.actuarial_scenario_assumptions (scenario_name)
  where is_active;

insert into app.actuarial_scenario_assumptions (
  scenario_name,
  assumptions_json,
  change_reason
)
values
  (
    'conservative',
    jsonb_build_object(
      'evaluationPassRate', '0.05',
      'performanceActivationRate', '0.98',
      'bufferCompletionRate', '0.15',
      'payout1EligibilityRate', '0.60',
      'progressionRates', jsonb_build_array('0.35', '0.25', '0.20', '0.15'),
      'averagePayoutOfCapRate', '0.35',
      'refundRate', '0.03',
      'chargebackRate', '0.01'
    ),
    'Initial seed defaults from Prompt 08 actuarial model'
  ),
  (
    'base',
    jsonb_build_object(
      'evaluationPassRate', '0.08',
      'performanceActivationRate', '0.98',
      'bufferCompletionRate', '0.20',
      'payout1EligibilityRate', '0.65',
      'progressionRates', jsonb_build_array('0.40', '0.30', '0.25', '0.20'),
      'averagePayoutOfCapRate', '0.45',
      'refundRate', '0.04',
      'chargebackRate', '0.015'
    ),
    'Initial seed defaults from Prompt 08 actuarial model'
  ),
  (
    'aggressive',
    jsonb_build_object(
      'evaluationPassRate', '0.12',
      'performanceActivationRate', '0.99',
      'bufferCompletionRate', '0.30',
      'payout1EligibilityRate', '0.70',
      'progressionRates', jsonb_build_array('0.50', '0.40', '0.35', '0.30'),
      'averagePayoutOfCapRate', '0.60',
      'refundRate', '0.05',
      'chargebackRate', '0.02'
    ),
    'Initial seed defaults from Prompt 08 actuarial model'
  ),
  (
    'stress',
    jsonb_build_object(
      'evaluationPassRate', '0.18',
      'performanceActivationRate', '1.00',
      'bufferCompletionRate', '0.40',
      'payout1EligibilityRate', '0.80',
      'progressionRates', jsonb_build_array('0.60', '0.50', '0.45', '0.40'),
      'averagePayoutOfCapRate', '0.80',
      'refundRate', '0.07',
      'chargebackRate', '0.03'
    ),
    'Initial seed defaults from Prompt 08 actuarial model'
  );

alter table app.actuarial_scenario_assumptions enable row level security;
revoke all on table app.actuarial_scenario_assumptions from anon, authenticated;
