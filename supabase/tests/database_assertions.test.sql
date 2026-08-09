begin;

select plan(8);

select has_schema('app', 'app schema exists');
select has_table('app', 'trading_accounts', 'trading accounts table exists');
select has_table('app', 'payout_requests', 'payout requests table exists');
select has_table(
  'app',
  'actuarial_scenario_assumptions',
  'editable actuarial assumptions table exists'
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
  array[4::bigint],
  'all four editable actuarial scenarios are seeded'
);

select * from finish();

rollback;
