-- Appendix 08-A: multi-node-safe rate protection for sensitive Control mutations.
-- This table is private to server-side database clients and stores no request body,
-- secret, or destination data.

create table app.staff_action_rate_limits (
  actor_id text not null,
  action text not null,
  window_start timestamptz not null,
  attempt_count integer not null default 1 check (attempt_count > 0),
  last_attempt_at timestamptz not null,
  primary key (actor_id, action, window_start)
);

create index staff_action_rate_limits_cleanup_idx
  on app.staff_action_rate_limits (window_start);

alter table app.staff_action_rate_limits enable row level security;
revoke all on table app.staff_action_rate_limits from anon, authenticated;

comment on table app.staff_action_rate_limits is
  'Private fixed-window counters for abuse protection on sensitive staff mutations. No secrets or payloads.';
