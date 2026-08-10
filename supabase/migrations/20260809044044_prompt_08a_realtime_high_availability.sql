create table app.realtime_leadership (
  service_name text primary key,
  leader_instance_id text,
  fencing_epoch bigint not null default 0 check (fencing_epoch >= 0),
  lease_expires_at timestamptz not null default '-infinity',
  acquired_at timestamptz,
  renewed_at timestamptz,
  previous_leader_instance_id text,
  takeover_count integer not null default 0 check (takeover_count >= 0),
  constraint realtime_leadership_lease_fields check (
    (leader_instance_id is null and acquired_at is null and renewed_at is null)
    or
    (leader_instance_id is not null and acquired_at is not null and renewed_at is not null)
  )
);

insert into app.realtime_leadership (service_name)
values ('market-trigger-writer');

alter table app.realtime_leadership enable row level security;
revoke all on table app.realtime_leadership from anon, authenticated;

alter table app.alert_notifications
  add column trigger_identity text;

update app.alert_notifications
set trigger_identity = 'legacy:' || id::text
where trigger_identity is null;

alter table app.alert_notifications
  alter column trigger_identity set not null;

create unique index alert_notifications_trigger_identity_unique
  on app.alert_notifications (trigger_identity);

-- The old two-transaction trigger flow could leave this transient state
-- behind after a process crash. The new flow settles trigger + fill in one
-- transaction, so any pre-migration transient claim is safe to re-evaluate.
update app.pending_orders
set status = 'active', triggered_at = null, updated_at = now()
where status = 'triggered' and execution_order_id is null;

comment on table app.realtime_leadership is
  'Appendix 08-A — durable PostgreSQL lease and monotonically increasing fencing epoch for leader-only market-trigger financial mutations.';
