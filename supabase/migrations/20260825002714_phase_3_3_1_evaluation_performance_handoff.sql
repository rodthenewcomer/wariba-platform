-- WARIBA Phase 3.3.1 — Evaluation -> Performance handoff.
--
-- The Performance account is already created automatically and atomically by
-- the risk/application layer. This table does not activate it and cannot
-- change its policy. It records only that the authenticated owner saw and
-- acknowledged the exact immutable policy version already attached to that
-- account before entering WariX from the onboarding flow.

create table app.performance_rule_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  account_id uuid not null unique references app.trading_accounts (id),
  policy_version_id uuid not null references app.policy_versions (id),
  source text not null check (source = 'performance_onboarding'),
  acknowledged_at timestamptz not null,
  correlation_id uuid not null,
  created_at timestamptz not null default now()
);

create index performance_rule_ack_user_idx
  on app.performance_rule_acknowledgements (user_id, acknowledged_at desc);
create index performance_rule_ack_policy_idx
  on app.performance_rule_acknowledgements (policy_version_id, acknowledged_at desc);

create function app.enforce_performance_rule_acknowledgement()
returns trigger
language plpgsql
set search_path = pg_catalog, app
as $$
declare
  linked_account app.trading_accounts%rowtype;
begin
  if tg_op = 'UPDATE' then
    raise exception using
      errcode = '23514',
      message = 'performance rule acknowledgements are immutable';
  end if;

  select * into linked_account
  from app.trading_accounts
  where id = new.account_id;

  if linked_account.id is null
    or linked_account.user_id <> new.user_id
    or linked_account.program_type <> 'WARIBA_PERFORMANCE'
    or linked_account.status <> 'active'
    or linked_account.policy_version_id <> new.policy_version_id
  then
    raise exception using
      errcode = '23514',
      message = 'acknowledgement must match the active Performance account owner and attached policy';
  end if;

  return new;
end;
$$;

create trigger performance_rule_acknowledgement_guard
before insert or update on app.performance_rule_acknowledgements
for each row execute function app.enforce_performance_rule_acknowledgement();

alter table app.performance_rule_acknowledgements enable row level security;

create policy performance_rule_ack_select_own
  on app.performance_rule_acknowledgements
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- The browser never writes this evidence directly. A BFF command rechecks
-- ownership, account programme/status and the account's attached policy under
-- a row lock before inserting. RLS remains defence in depth for reads.
revoke all on app.performance_rule_acknowledgements from anon, authenticated;

comment on table app.performance_rule_acknowledgements is
  'Phase 3.3.1 proof that the owner acknowledged the immutable Performance policy attached to this account. It is not activation and grants no trading permission by itself.';
comment on column app.performance_rule_acknowledgements.policy_version_id is
  'Resolved server-side from trading_accounts.policy_version_id; never accepted from the browser.';
comment on column app.performance_rule_acknowledgements.source is
  'Fixed provenance for the mandatory first-entry Performance onboarding.';
comment on function app.enforce_performance_rule_acknowledgement() is
  'Rejects forged or rewritten Performance onboarding evidence at the database boundary.';
