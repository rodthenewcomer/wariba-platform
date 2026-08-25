-- Phase 3.3 product-decision closure.
--
-- ONE-025 keeps Evaluation -> Performance automatic. The table below stores
-- only the post-result operational review; it is deliberately not referenced
-- by the account lifecycle or the risk engine.
create table app.pass_review_operator_states (
  account_id uuid primary key references app.trading_accounts (id),
  status text not null check (status in ('reviewed', 'integrity_escalated')),
  assigned_staff_id uuid not null references auth.users (id),
  reason text not null check (char_length(btrim(reason)) between 10 and 1000),
  reviewed_at timestamptz not null,
  version integer not null default 1 check (version > 0),
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pass_review_operator_states_status_reviewed_idx
  on app.pass_review_operator_states (status, reviewed_at desc);
create index pass_review_operator_states_assignee_status_idx
  on app.pass_review_operator_states (assigned_staff_id, status, reviewed_at desc);

alter table app.pass_review_operator_states enable row level security;
revoke all on table app.pass_review_operator_states from anon, authenticated;

comment on table app.pass_review_operator_states is
  'Phase 3.3 ONE-025. Post-result operational audit only: reviewed or integrity_escalated. It cannot approve, reject, delay or recalculate an Evaluation pass. Rollback: drop this table; automatic Evaluation -> Performance remains unchanged.';

-- UX-SUPPORT-004 gives a replacement account a third, mutually exclusive
-- provenance. The UNIQUE constraint is the database-level idempotency guard:
-- one contestation can issue at most one replacement account.
alter table app.trading_accounts
  add column source_contestation_id uuid unique references app.contestations (id);

alter table app.trading_accounts
  drop constraint trading_accounts_source_exactly_one,
  add constraint trading_accounts_source_exactly_one check (
    num_nonnulls(
      source_purchase_order_id,
      source_evaluation_account_id,
      source_contestation_id
    ) = 1
  );

comment on column app.trading_accounts.source_contestation_id is
  'Phase 3.3 UX-SUPPORT-004. Unique provenance for a no-cost replacement account issued by an authorized compensating contestation. Never points back by mutating the original account.';

drop index app.contestations_one_live_per_target;

alter table app.contestations
  drop constraint contestations_status_check,
  add constraint contestations_status_check check (
    status in (
      'open',
      'under_review',
      'needs_information',
      'upheld',
      'overturned',
      'closed',
      'correction_required',
      'decision_corrected',
      'finance_compliance_review'
    )
  ),
  drop constraint contestations_decision_check,
  add constraint contestations_decision_check check (
    decision in (
      'upheld',
      'overturned',
      'requires_escalation',
      'correction_required',
      'decision_corrected',
      'finance_compliance_review'
    )
  ),
  drop constraint contestations_decision_shape,
  add constraint contestations_decision_shape check (
    (
      status in ('open', 'under_review', 'needs_information')
      and decision is null
      and decision_reason is null
      and resolved_at is null
    )
    or (
      status in ('correction_required', 'finance_compliance_review')
      and decision = status
      and length(btrim(decision_reason)) > 0
      and reviewed_at is not null
      and reviewed_by is not null
      and resolved_at is null
    )
    or (
      status in ('upheld', 'overturned', 'closed', 'decision_corrected')
      and decision is not null
      and length(btrim(decision_reason)) > 0
      and resolved_at is not null
      and reviewed_by is not null
    )
  );

create unique index contestations_one_live_per_target
  on app.contestations (target_type, target_id)
  where status in (
    'open',
    'under_review',
    'needs_information',
    'correction_required',
    'finance_compliance_review'
  );

comment on column app.contestations.decision is
  'Phase 3.3 outcomes. correction_required confirms a WARIBA error without changing evidence; decision_corrected records completion of the unique replacement-account action; finance_compliance_review fails closed when money or Performance is involved.';
