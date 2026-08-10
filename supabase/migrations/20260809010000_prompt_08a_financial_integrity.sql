create table app.operations_incidents (
  id uuid primary key default gen_random_uuid(),
  incident_code text not null,
  severity text not null check (severity in ('warning', 'critical')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  account_id uuid references app.trading_accounts (id),
  payout_request_id uuid references app.payout_requests (id),
  evidence jsonb not null check (jsonb_typeof(evidence) = 'object'),
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id),
  resolution_reason text,
  constraint operations_incidents_resolution_matches_status check (
    (status = 'open' and resolved_at is null and resolved_by is null)
    or
    (status = 'resolved' and resolved_at is not null and resolved_by is not null and length(btrim(resolution_reason)) > 0)
  )
);

create unique index operations_incidents_one_open_account_code
  on app.operations_incidents (account_id, incident_code)
  where status = 'open' and account_id is not null;

alter table app.trading_accounts
  add column integrity_hold boolean not null default false,
  add column integrity_hold_reason text,
  add column integrity_hold_set_at timestamptz,
  add column integrity_hold_incident_id uuid references app.operations_incidents (id),
  add constraint trading_accounts_integrity_hold_fields check (
    (not integrity_hold and integrity_hold_reason is null and integrity_hold_set_at is null and integrity_hold_incident_id is null)
    or
    (integrity_hold and length(btrim(integrity_hold_reason)) > 0 and integrity_hold_set_at is not null and integrity_hold_incident_id is not null)
  );

create table app.account_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.trading_accounts (id),
  status text not null check (status in ('matched', 'mismatched')),
  stored_account_balance numeric(20, 8) not null,
  reconstructed_account_balance numeric(20, 8) not null,
  stored_program_eligible_balance numeric(20, 8) not null,
  reconstructed_program_eligible_balance numeric(20, 8) not null,
  breakdown jsonb not null check (jsonb_typeof(breakdown) = 'object'),
  incident_id uuid references app.operations_incidents (id),
  executed_by uuid references auth.users (id),
  executed_at timestamptz not null default now(),
  constraint account_reconciliation_incident_matches_status check (
    (status = 'matched' and incident_id is null)
    or (status = 'mismatched' and incident_id is not null)
  )
);

create index account_reconciliation_runs_history_idx
  on app.account_reconciliation_runs (account_id, executed_at desc);

alter table app.payout_requests
  drop constraint payout_requests_status_check,
  add constraint payout_requests_status_check
    check (status in ('pending_review', 'needs_information', 'approved', 'rejected', 'processing', 'paid', 'failed', 'cancelled', 'reversed')),
  add column eligibility_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(eligibility_snapshot) = 'object'),
  add column calculation_timestamp timestamptz,
  add column reversed_at timestamptz,
  add column reversed_by uuid references auth.users (id),
  add column reversal_reason text,
  add column reversal_evidence jsonb,
  add column reversal_ledger_entry_id uuid references app.trading_ledger_entries (id),
  add constraint payout_requests_reversal_fields_match_status check (
    (status = 'reversed'
      and reversed_at is not null
      and reversed_by is not null
      and length(btrim(reversal_reason)) > 0
      and jsonb_typeof(reversal_evidence) = 'object'
      and reversal_ledger_entry_id is not null)
    or
    (status != 'reversed'
      and reversed_at is null
      and reversed_by is null
      and reversal_reason is null
      and reversal_evidence is null
      and reversal_ledger_entry_id is null)
  );

create unique index trading_ledger_entries_one_payout_debit
  on app.trading_ledger_entries (reference_id)
  where entry_type = 'payout_debit' and reference_type = 'payout_request';

create unique index trading_ledger_entries_one_reversal_per_entry
  on app.trading_ledger_entries (reversal_of)
  where reversal_of is not null;

alter table app.operations_incidents enable row level security;
alter table app.account_reconciliation_runs enable row level security;
revoke all on table app.operations_incidents, app.account_reconciliation_runs from anon, authenticated;

comment on table app.account_reconciliation_runs is
  'Appendix 08-A — immutable evidence comparing ledger-projected balances with independently reconstructed fills, payouts and compensating entries.';
