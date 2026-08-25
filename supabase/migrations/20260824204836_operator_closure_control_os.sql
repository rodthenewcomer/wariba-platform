-- WARIBA Phase 3.3 — Operator Closure / Control OS.
--
-- This migration is deliberately additive. It gives existing operational
-- cases an explicit owner and an optimistic-concurrency token, then adds the
-- smallest legitimate identity-review record supported by the private-beta
-- decisions. It does not add a KYC provider, document storage, biometric
-- data, a pass-approval transition, or any write path to risk/ledger history.

-- =========================================================================
-- SUPPORT / CONTESTATION OWNERSHIP AND CONCURRENCY
-- =========================================================================

alter table app.support_tickets
  add column assigned_at timestamptz,
  add column version integer not null default 1 check (version > 0);

update app.support_tickets
set assigned_at = updated_at
where assigned_staff_id is not null;

alter table app.support_tickets
  add constraint support_tickets_assignment_shape check (
    (assigned_staff_id is null and assigned_at is null)
    or (assigned_staff_id is not null and assigned_at is not null)
  );

-- Existing status/assignment indexes support the queue. The additional
-- update-order index is justified by the Overview's recent-activity query.
create index support_tickets_recent_activity_idx
  on app.support_tickets (updated_at desc, id);

alter table app.contestations
  add column assigned_staff_id uuid references auth.users (id),
  add column assigned_at timestamptz,
  add column version integer not null default 1 check (version > 0);

-- Phase 3.2 used reviewed_by as both assignee and decision actor. Preserve
-- that operational ownership while separating the concepts for future writes.
update app.contestations
set assigned_staff_id = reviewed_by,
    assigned_at = reviewed_at
where reviewed_by is not null;

alter table app.contestations
  add constraint contestations_assignment_shape check (
    (assigned_staff_id is null and assigned_at is null)
    or (assigned_staff_id is not null and assigned_at is not null)
  );

create index contestations_assigned_queue_idx
  on app.contestations (assigned_staff_id, status, opened_at);
create index contestations_recent_activity_idx
  on app.contestations (updated_at desc, id);

comment on column app.support_tickets.version is
  'Phase 3.3 optimistic-concurrency token. Every operator mutation requires the version the operator opened and increments it atomically.';
comment on column app.contestations.version is
  'Phase 3.3 optimistic-concurrency token. Every operator mutation requires the version the operator opened and increments it atomically.';
comment on column app.contestations.assigned_staff_id is
  'Current operational owner. Deliberately separate from reviewed_by, which records who performed the latest review or decision.';

-- =========================================================================
-- IDENTITY REVIEW — PRIVATE-BETA OPERATIONAL RECORD, NO PROVIDER/DOCUMENTS
-- =========================================================================

create sequence app.identity_review_reference_seq start with 1001;

create table app.identity_review_cases (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique
    default 'IDV-' || lpad(nextval('app.identity_review_reference_seq')::text, 5, '0'),
  user_id uuid not null references auth.users (id),
  account_id uuid not null references app.trading_accounts (id),
  reason text not null check (reason in ('first_payout')),
  status text not null default 'requested' check (
    status in (
      'requested', 'under_review', 'needs_information',
      'verified', 'unable_to_verify', 'closed'
    )
  ),
  assigned_staff_id uuid references auth.users (id),
  assigned_at timestamptz,
  -- A reference to out-of-band evidence, never a document, URL containing a
  -- secret, image, selfie, biometric template, or copied identity payload.
  evidence_reference text check (
    evidence_reference is null
    or char_length(btrim(evidence_reference)) between 3 and 200
  ),
  -- Control-only justification. The trader-facing sentence is a separate,
  -- explicit field so internal reasoning cannot leak through an overloaded
  -- "note" column.
  decision_reason text check (
    decision_reason is null
    or char_length(btrim(decision_reason)) between 10 and 1000
  ),
  trader_message text check (
    trader_message is null
    or char_length(btrim(trader_message)) between 10 and 1000
  ),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  resolved_at timestamptz,
  version integer not null default 1 check (version > 0),
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint identity_review_assignment_shape check (
    (assigned_staff_id is null and assigned_at is null)
    or (assigned_staff_id is not null and assigned_at is not null)
  ),
  constraint identity_review_resolution_shape check (
    (status in ('requested', 'under_review', 'needs_information') and resolved_at is null)
    or (status in ('verified', 'unable_to_verify', 'closed') and resolved_at is not null)
  )
);

create index identity_review_queue_idx
  on app.identity_review_cases (status, requested_at, id);
create index identity_review_assignment_idx
  on app.identity_review_cases (assigned_staff_id, status, requested_at);
create index identity_review_user_idx
  on app.identity_review_cases (user_id, requested_at desc);
create index identity_review_account_idx
  on app.identity_review_cases (account_id, requested_at desc);
create unique index identity_review_one_live_per_account
  on app.identity_review_cases (account_id)
  where status in ('requested', 'under_review', 'needs_information');

alter table app.identity_review_cases enable row level security;
create policy identity_review_cases_select_own on app.identity_review_cases
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Browser roles receive no table grant. Trader reads go through a BFF query
-- that selects only public state/message fields and rechecks ownership. RLS is
-- defense in depth, not a substitute for that boundary.
revoke all on app.identity_review_cases from anon, authenticated;

comment on table app.identity_review_cases is
  'Phase 3.3 private-beta identity operations. Stores workflow state, operator ownership, a result and an out-of-band evidence reference only. No provider integration and no identity documents, selfies, biometrics or copied evidence. Rollback: drop table and sequence; existing trading_accounts.kyc_sandbox_verified remains authoritative.';
comment on column app.identity_review_cases.evidence_reference is
  'Opaque human reference to evidence kept outside WARIBA. Never identity-document content or a secret-bearing URL.';
