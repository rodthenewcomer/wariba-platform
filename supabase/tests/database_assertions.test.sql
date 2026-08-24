begin;

select plan(24);

select has_schema('app', 'app schema exists');
select has_table('app', 'trading_accounts', 'trading accounts table exists');
select has_table('app', 'payout_requests', 'payout requests table exists');
select has_table(
  'app',
  'actuarial_scenario_assumptions',
  'editable actuarial assumptions table exists'
);
select has_table('app', 'realtime_leadership', 'durable realtime leadership table exists');
select has_table('app', 'market_data_sources', 'WX2 market data source registry exists');
select has_table('app', 'market_bars', 'WX2 durable market bar cache exists');
select has_pk('app', 'market_bars', 'market bar identity is uniquely constrained');
select is(
  (select relrowsecurity from pg_class where oid = 'app.market_data_sources'::regclass),
  true,
  'market data source registry has RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'app.market_bars'::regclass),
  true,
  'market bar cache has RLS enabled'
);
select has_table(
  'app',
  'account_reconciliation_runs',
  'financial reconstruction evidence table exists'
);
select has_table(
  'app',
  'staff_action_rate_limits',
  'distributed Control abuse counters exist'
);
select has_column(
  'app',
  'trading_accounts',
  'integrity_hold',
  'financial integrity hold is persisted'
);
select has_index(
  'app',
  'alert_notifications',
  'alert_notifications_trigger_identity_unique',
  'alert trigger identity is unique'
);
select has_column(
  'app',
  'payout_requests',
  'provider_idempotency_key',
  'payout provider idempotency reference is persisted'
);
select has_column(
  'app',
  'payout_requests',
  'provider_reconciliation_result',
  'payout provider reconciliation result is persisted'
);
select has_index(
  'app',
  'payout_requests',
  'payout_requests_provider_idempotency_key_unique',
  'provider idempotency reference is unique'
);
select results_eq(
  $$select count(*)::bigint from app.actuarial_scenario_assumptions where is_active$$,
  array[5::bigint],
  'four defaults plus editable custom actuarial scenario are seeded'
);

-- Phase 3.2 — support and contestations (UX-010 LOCKED).
select has_table('app', 'support_tickets', 'support tickets table exists');
select has_table('app', 'ticket_messages', 'support conversation table exists');
select has_table('app', 'contestations', 'contestations table exists');
select is(
  (select relrowsecurity from pg_class where oid = 'app.contestations'::regclass),
  true,
  'contestations have RLS enabled'
);
-- One live contestation per contested decision, enforced by a partial unique
-- index rather than by an application check that a retry could race past.
select has_index(
  'app',
  'contestations',
  'contestations_one_live_per_target',
  'a decision can carry only one live contestation'
);
-- The append-only guarantee is a trigger, not a convention: trader and
-- operator both reach this table through the same privileged connection.
select has_trigger(
  'app',
  'ticket_messages',
  'ticket_messages_append_only',
  'support messages cannot be edited or removed from a live conversation'
);

select * from finish();

rollback;
