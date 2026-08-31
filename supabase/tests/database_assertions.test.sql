begin;

select plan(48);

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

-- Phase 3.4.2 — canonical V2 runtime foundation.
select has_table('app', 'margin_profiles', 'versioned margin profiles exist');
select has_table('app', 'news_calendar_versions', 'versioned news calendar contract exists');
select has_table('app', 'news_events', 'news event evidence exists');
select has_table('app', 'session_calendar_versions', 'versioned session calendar contract exists');
select has_table('app', 'session_closures', 'session closure evidence exists');
select has_table('app', 'policy_performance_links', 'exact Evaluation to Performance policy links exist');
select has_table('app', 'flex_activation_obligations', 'FLEX activation obligations exist');
select has_table('app', 'offer_capability_gates', 'catalogue capability gates exist separately');
select has_column('app', 'policy_versions', 'product_family', 'policy product family is explicit');
select has_column('app', 'purchase_orders', 'policy_version_id', 'purchase order pins exact policy UUID');
select has_column('app', 'account_daily_snapshots', 'risk_sod_balance', 'risk-adjusted balance is persisted separately');
select has_trigger('app', 'policy_versions', 'policy_versions_immutable_guard', 'published/referenced policy content is immutable');
select has_trigger('app', 'trading_accounts', 'trading_accounts_policy_pin_guard', 'account policy pin is immutable');
select results_eq(
  $$select count(*)::bigint from app.product_versions where catalogue_version = 'v2.0.0-candidate'$$,
  array[15::bigint],
  'all fifteen original V2 catalogue offers remain as history'
);
select results_eq(
  $$
    select count(*)::bigint
    from pg_class
    where oid in (
      'app.margin_profiles'::regclass,
      'app.news_calendar_versions'::regclass,
      'app.news_events'::regclass,
      'app.session_calendar_versions'::regclass,
      'app.session_closures'::regclass,
      'app.policy_performance_links'::regclass,
      'app.flex_activation_obligations'::regclass,
      'app.offer_capability_gates'::regclass
    )
      and relrowsecurity
  $$,
  array[8::bigint],
  'all eight V2 private tables have RLS enabled'
);
select results_eq(
  $$
    select count(*)::bigint
    from information_schema.role_table_grants
    where table_schema = 'app'
      and table_name in (
        'margin_profiles',
        'news_calendar_versions',
        'news_events',
        'session_calendar_versions',
        'session_closures',
        'policy_performance_links',
        'flex_activation_obligations',
        'offer_capability_gates'
      )
      and grantee in ('anon', 'authenticated')
  $$,
  array[0::bigint],
  'browser roles have no direct privilege on V2 private tables'
);

-- Phase 3.4.3A — successor policies, approved margin caps and gross exposure.
select results_eq(
  $$select count(*)::bigint from app.product_versions where catalogue_version = 'v2.1.0-candidate'$$,
  array[15::bigint],
  'all fifteen successor V2 catalogue offers exist'
);
select results_eq(
  $$select count(*)::bigint from app.product_versions where catalogue_version = 'v2.0.0-candidate' and retired_at is not null$$,
  array[15::bigint],
  'all original never-activated V2 offers are retired without deletion'
);
select results_eq(
  $$select count(*)::bigint from app.policy_versions where decision_record_id = 'POLICY-GOV-004'$$,
  array[5::bigint],
  'five POLICY-GOV-004 successor policies exist'
);
select results_eq(
  $$select count(*)::bigint from app.policy_versions where decision_record_id = 'POLICY-GOV-003' and parameters_json ->> 'contract_version' = 'WARIBA_POLICY_V2' and status = 'retired'$$,
  array[5::bigint],
  'five original V2 policies remain as immutable retired history'
);
select results_eq(
  $$select count(*)::bigint from app.policy_versions where decision_record_id = 'POLICY-GOV-004' and parameters_json ->> 'gross_exposure_max_multiple' = '3.00'$$,
  array[4::bigint],
  'ONE and FLEX successor phases use a 3.00x gross cap'
);
select results_eq(
  $$select count(*)::bigint from app.policy_versions where decision_record_id = 'POLICY-GOV-004' and parameters_json ->> 'gross_exposure_max_multiple' = '2.00'$$,
  array[1::bigint],
  'INSTANT successor policy uses a 2.00x gross cap'
);
select results_eq(
  $$select count(*)::bigint from app.margin_profiles where decision_record_id = 'POLICY-GOV-004' and calibration_status = 'validated'$$,
  array[5::bigint],
  'all five approved margin profiles are validated'
);
select results_eq(
  $$select count(*)::bigint from app.product_versions where catalogue_version = 'v2.1.0-candidate' and not purchase_enabled and not activation_enabled$$,
  array[15::bigint],
  'all successor V2 offers remain publicly disabled'
);

select * from finish();

rollback;
