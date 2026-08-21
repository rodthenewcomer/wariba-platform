begin;

select plan(18);

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

select * from finish();

rollback;
