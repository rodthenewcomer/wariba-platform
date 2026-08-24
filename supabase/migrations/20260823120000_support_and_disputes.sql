-- Phase 3.2 — UX-010 `LOCKED`: « Support et contestation intégrés au produit ».
--
-- Before this migration a trader's only recourse was to write to the founder,
-- and a trader who disagreed with a recorded breach had no recourse at all.
-- The evidence for that breach already existed (app.risk_violations,
-- app.account_state_transitions, app.account_daily_snapshots); what was missing
-- was somewhere to say "I contest this" and someone able to answer.
--
-- Three tables, in the order they depend on each other: a ticket, its
-- append-only conversation, and a contestation — which is deliberately NOT a
-- ticket category. A support request is a question; a contestation challenges
-- an authoritative WARIBA decision, carries its own state, and points at the
-- evidence that decision was made from.
--
-- What this migration deliberately does not do: touch a single financial table.
-- No column on app.trading_accounts, app.risk_violations,
-- app.trading_ledger_entries or app.account_daily_snapshots changes here, and
-- nothing below is capable of writing to them. Contesting a decision records a
-- dispute beside the evidence, never over it.

-- =========================================================================
-- RATE LIMITING — one store, widened rather than duplicated
-- =========================================================================
--
-- app.staff_action_rate_limits was introduced for Control's sensitive staff
-- actions, but its shape (actor_id, action, window_start, attempt_count) has
-- never been staff-specific. Phase 3.2 needs a limit on trader ticket and
-- message creation, and standing up a second table with identical columns
-- would give the platform two answers to "how many times has this actor done
-- this". The name is kept — renaming it would touch every existing Control
-- action for no behavioural gain — and its meaning is recorded here instead.
comment on table app.staff_action_rate_limits is
  'Fixed-window action counter, keyed (actor_id, action, window_start). Phase 3.2 widened it beyond staff: trader support actions (support.ticket.create, support.message.create, support.contestation.create) are counted here too. The table name predates that and is kept to avoid renaming a table every Control action already writes to.';

-- =========================================================================
-- SUPPORT TICKETS
-- =========================================================================

-- Human-readable, short, and read aloud over a phone by someone who is
-- already frustrated: WRB-01042 survives that, a uuid does not. Enumerable by
-- construction, which costs nothing — RLS decides what a request may read, and
-- an identifier has never been an authorization mechanism here (Constitution
-- §131: « Un identifiant étranger ne révèle jamais l'existence de l'objet »).
create sequence app.support_ticket_reference_seq start with 1042;

create table app.support_tickets (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique
    default 'WRB-' || lpad(nextval('app.support_ticket_reference_seq')::text, 5, '0'),
  user_id uuid not null references auth.users (id),
  -- Null for a request that is not about one account (billing, identity, a
  -- general question). Never a free-text account reference: the server
  -- resolves it from the accounts this user owns, so an account belonging to
  -- someone else cannot be named here even by a crafted request.
  account_id uuid references app.trading_accounts (id),
  category text not null check (
    category in (
      'general', 'account', 'trading', 'risk', 'breach',
      'performance', 'payout', 'billing', 'identity', 'technical'
    )
  ),
  subject text not null check (char_length(btrim(subject)) between 3 and 160),
  -- Five states, not fifteen. Each one changes what the trader should do next:
  -- open (we have it), waiting_for_user (you are the blocker),
  -- under_review (we are), resolved (answered, still reopenable by replying),
  -- closed (finished). A queue with twenty statuses is a queue nobody triages.
  status text not null default 'open' check (
    status in ('open', 'waiting_for_user', 'under_review', 'resolved', 'closed')
  ),
  -- Operator-set only. A trader cannot raise their own priority; there is no
  -- product surface that offers it and no grant that would permit it.
  priority text not null default 'normal' check (
    priority in ('low', 'normal', 'high', 'urgent')
  ),
  assigned_staff_id uuid references auth.users (id),
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  -- The timestamps and the status cannot disagree. A "resolved" row with no
  -- resolved_at is the kind of quiet inconsistency that makes an SLA figure
  -- meaningless six months later.
  constraint support_tickets_resolution_shape check (
    (status = 'resolved' and resolved_at is not null and closed_at is null)
    or (status = 'closed' and closed_at is not null)
    or (status in ('open', 'waiting_for_user', 'under_review')
        and resolved_at is null and closed_at is null)
  )
);

create index support_tickets_user_idx
  on app.support_tickets (user_id, created_at desc);
create index support_tickets_status_idx
  on app.support_tickets (status, created_at);
create index support_tickets_assigned_idx
  on app.support_tickets (assigned_staff_id, status);
create index support_tickets_account_idx
  on app.support_tickets (account_id) where account_id is not null;

alter table app.support_tickets enable row level security;
create policy support_tickets_select_own on app.support_tickets
  for select using (user_id = auth.uid());
grant select on app.support_tickets to authenticated;
-- Creation, replies, assignment, priority and resolution are all server
-- commands on the service connection — same grant shape as app.price_alerts.
-- A browser can read its own tickets and nothing else; it cannot write one,
-- which is why "trader sets their own priority" is structurally impossible
-- rather than merely absent from the UI.

comment on table app.support_tickets is
  'Phase 3.2, UX-010 — trader support requests. Rollback: drop table app.support_tickets cascade (cascades app.ticket_messages and app.contestations); non-destructive to every financial table — nothing outside this migration references it.';

-- =========================================================================
-- TICKET MESSAGES — append-only
-- =========================================================================

create table app.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references app.support_tickets (id) on delete cascade,
  actor_type text not null check (actor_type in ('trader', 'staff', 'system')),
  actor_user_id uuid references auth.users (id),
  actor_staff_id uuid references auth.users (id),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  correlation_id uuid not null,
  -- The actor columns and actor_type cannot disagree: a message attributed to
  -- staff carries a staff identity, a trader message carries the trader's, and
  -- a system message carries neither. Without this, "who said this" degrades
  -- into an application-layer promise.
  constraint ticket_messages_actor_shape check (
    (actor_type = 'trader' and actor_user_id is not null and actor_staff_id is null)
    or (actor_type = 'staff' and actor_staff_id is not null and actor_user_id is null)
    or (actor_type = 'system' and actor_user_id is null and actor_staff_id is null)
  )
);

create index ticket_messages_ticket_idx
  on app.ticket_messages (ticket_id, created_at);

/*
 * Append-only, enforced here rather than promised in code.
 *
 * The requirement is that a trader cannot edit a staff message and staff
 * cannot silently rewrite a trader's. Both reach this table through the same
 * privileged service connection, so a check that lives in application code
 * protects nothing an application bug could not undo. A trigger does.
 *
 * UPDATE is refused unconditionally. DELETE is refused while the conversation
 * it belongs to still exists — a cascade from deleting the ticket itself is
 * allowed, because at that point there is no thread left to falsify, and test
 * teardown needs it. Correcting a message means posting another one, the same
 * way app.trading_ledger_entries corrects an entry with a compensating one.
 */
create function app.reject_ticket_message_mutation() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'app.ticket_messages is append-only: a message cannot be edited.'
      using errcode = 'restrict_violation';
  end if;

  if exists (select 1 from app.support_tickets where id = old.ticket_id) then
    raise exception 'app.ticket_messages is append-only: a message cannot be removed from a live conversation.'
      using errcode = 'restrict_violation';
  end if;

  return old;
end;
$$;

create trigger ticket_messages_append_only
  before update or delete on app.ticket_messages
  for each row execute function app.reject_ticket_message_mutation();

alter table app.ticket_messages enable row level security;
-- A trader reads the conversation of a ticket they own. The join is the whole
-- policy: without it a message id would be readable by anyone who guessed it.
create policy ticket_messages_select_own on app.ticket_messages
  for select using (
    exists (
      select 1
      from app.support_tickets t
      where t.id = app.ticket_messages.ticket_id
        and t.user_id = auth.uid()
    )
  );
grant select on app.ticket_messages to authenticated;

comment on table app.ticket_messages is
  'Phase 3.2 — append-only support conversation. UPDATE always refused, DELETE refused while the parent ticket exists (see app.reject_ticket_message_mutation). Rollback: drop trigger, drop function, drop table.';

-- =========================================================================
-- CONTESTATIONS
-- =========================================================================

create sequence app.contestation_reference_seq start with 1001;

/*
 * A contestation is not a support category.
 *
 * "I do not understand why my order was rejected" is a question — a ticket
 * answers it. "I contest this recorded breach decision" is a challenge to an
 * authoritative decision WARIBA made, and it needs its own state, its own
 * reviewer authority and a fixed link to the evidence the decision came from.
 * Collapsing the two turns every complaint into a financial dispute and every
 * dispute into a message nobody has to answer.
 *
 * Every contestation still carries a ticket_id: the conversation belongs to
 * the support thread, so a trader has one place to read and one place to
 * reply. What lives here is the decision record.
 */
create table app.contestations (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique
    default 'CTS-' || lpad(nextval('app.contestation_reference_seq')::text, 5, '0'),
  user_id uuid not null references auth.users (id),
  ticket_id uuid not null references app.support_tickets (id) on delete cascade,
  account_id uuid references app.trading_accounts (id),
  -- Only what the platform can actually produce evidence for today. KYC and
  -- provider contestations are absent because no provider exists to contest —
  -- inventing the workflow would be inventing the decision it challenges.
  target_type text not null check (
    target_type in ('account_breach', 'risk_decision', 'payout_decision')
  ),
  target_id uuid not null,
  status text not null default 'open' check (
    status in ('open', 'under_review', 'needs_information', 'upheld', 'overturned', 'closed')
  ),
  reason_category text not null check (
    reason_category in (
      'rule_misapplied',
      'market_data_disputed',
      'execution_error',
      'evidence_incomplete',
      'other'
    )
  ),
  -- The trader's account of what happened. Labelled as a statement in every
  -- surface that renders it, because it is not evidence and must never be
  -- mistaken for it.
  trader_statement text not null check (
    char_length(btrim(trader_statement)) between 20 and 4000
  ),
  /*
   * decision — what an operator concluded.
   *
   * `overturned` exists in this constraint so that the future corrective
   * transition does not have to alter it. It is NOT reachable in this build:
   * @wariba/domain's evaluation_account machine gives `breached` no outbound
   * transition, so no authorized corrective command exists, and the command
   * layer refuses `overturned` explicitly rather than recording an outcome the
   * platform cannot carry out. Phase 3.2 operators decide `upheld` or
   * `requires_escalation`.
   */
  decision text check (decision in ('upheld', 'overturned', 'requires_escalation')),
  decision_reason text,
  /*
   * Identifiers, never values.
   *
   * The threshold, the observed value, the policy version and the timestamps
   * are read live from app.risk_violations and its neighbours every time this
   * contestation is rendered. Copying them here would create a second,
   * editable version of a financial fact — and the first time the two
   * disagreed, nobody could say which was true.
   */
  evidence_ref jsonb not null default '{}'::jsonb,
  opened_at timestamptz not null default now(),
  reviewed_at timestamptz,
  resolved_at timestamptz,
  reviewed_by uuid references auth.users (id),
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A resolved contestation carries the decision, its reason and its reviewer,
  -- or it is not resolved. "Upheld, no reason given" is not an outcome a trader
  -- can be handed.
  constraint contestations_decision_shape check (
    (status in ('open', 'under_review', 'needs_information')
      and decision is null and decision_reason is null and resolved_at is null)
    or (status in ('upheld', 'overturned', 'closed')
      and decision is not null
      and length(btrim(decision_reason)) > 0
      and resolved_at is not null
      and reviewed_by is not null)
  )
);

create index contestations_user_idx
  on app.contestations (user_id, opened_at desc);
create index contestations_status_idx
  on app.contestations (status, opened_at);
-- One contestation per support thread, and the index is the guarantee rather
-- than a convention `openContestation` happens to follow. Both the trader's
-- request list and Control's queue LEFT JOIN this table onto a ticket; without
-- uniqueness a second contestation would silently duplicate every row in both.
create unique index contestations_ticket_unique
  on app.contestations (ticket_id);
create index contestations_account_idx
  on app.contestations (account_id) where account_id is not null;

-- One live contestation per decision. A trader who submits twice gets told the
-- first one is already open rather than splitting the same dispute across two
-- reviewers who each see half the story. A decided contestation releases the
-- lock, so a genuinely new dispute over the same target stays possible.
create unique index contestations_one_live_per_target
  on app.contestations (target_type, target_id)
  where status in ('open', 'under_review', 'needs_information');

alter table app.contestations enable row level security;
create policy contestations_select_own on app.contestations
  for select using (user_id = auth.uid());
grant select on app.contestations to authenticated;
-- No insert/update grant of any kind. A trader opens a contestation through a
-- server command that verifies account ownership and that the contested
-- decision actually exists; nobody sets their own status, reviewer or decision.

comment on table app.contestations is
  'Phase 3.2, UX-010 — a challenge to an authoritative WARIBA decision. References evidence by id (evidence_ref, target_id) and never copies a financial value. Records a decision beside the original evidence, never over it: no path here writes to app.trading_accounts, app.risk_violations, app.account_daily_snapshots or app.trading_ledger_entries. Rollback: drop table app.contestations; non-destructive to every financial table.';

comment on column app.contestations.decision is
  'Phase 3.2 authorizes upheld and requires_escalation only. overturned is present for a future corrective transition and is refused by the command layer while app.trading_accounts has no exit from breached.';
