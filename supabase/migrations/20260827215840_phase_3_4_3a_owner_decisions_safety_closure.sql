-- WARIBA Phase 3.4.3A — owner decisions and safety closure.
-- POLICY-GOV-004 approves the existing 20/15/10 margin caps and adds a
-- canonical gross-exposure cap: 3.00x nominal for ONE/FLEX, 2.00x for
-- INSTANT. The five prior V2 candidates remain immutable history and are
-- retired from new activation; no V1 policy row is modified.

insert into app.margin_profiles
  (profile_code, product_family, account_phase, candidate_margin_cap_rate,
   leverage_by_asset_group, calibration_status, decision_record_id, validated_at)
values
  ('V2-ONE-EVALUATION-APPROVED', 'WARIBA_ONE', 'evaluation', 0.20,
   '{"FX":50,"METALS":20,"INDICES":20,"ENERGY":10}', 'validated', 'POLICY-GOV-004', now()),
  ('V2-ONE-PERFORMANCE-APPROVED', 'WARIBA_ONE', 'performance', 0.15,
   '{"FX":30,"METALS":15,"INDICES":10,"ENERGY":10}', 'validated', 'POLICY-GOV-004', now()),
  ('V2-FLEX-EVALUATION-APPROVED', 'WARIBA_FLEX', 'evaluation', 0.20,
   '{"FX":50,"METALS":20,"INDICES":20,"ENERGY":10}', 'validated', 'POLICY-GOV-004', now()),
  ('V2-FLEX-PERFORMANCE-APPROVED', 'WARIBA_FLEX', 'performance', 0.15,
   '{"FX":30,"METALS":15,"INDICES":10,"ENERGY":10}', 'validated', 'POLICY-GOV-004', now()),
  ('V2-INSTANT-PERFORMANCE-APPROVED', 'WARIBA_INSTANT', 'performance', 0.10,
   '{"FX":30,"METALS":10,"INDICES":10,"ENERGY":5}', 'validated', 'POLICY-GOV-004', now());

insert into app.policy_versions
  (program, product_family, account_phase, semantic_version, status,
   parameters_json, human_document_hash, machine_hash, effective_from,
   decision_record_id, news_calendar_version_id, session_calendar_version_id,
   margin_profile_id)
select
  prior.program,
  prior.product_family,
  prior.account_phase,
  case
    when prior.semantic_version = '2.0.0' then '2.1.0'
    when prior.semantic_version = '2.0.0-one' then '2.1.0-one'
    when prior.semantic_version = '2.0.0-flex' then '2.1.0-flex'
    when prior.semantic_version = '2.0.0-instant' then '2.1.0-instant'
  end,
  'pilot_ready',
  prior.parameters_json || jsonb_build_object(
    'decision_record_id', 'POLICY-GOV-004',
    'margin_calibration_status', 'validated',
    'gross_exposure_max_multiple',
      case when prior.product_family = 'WARIBA_INSTANT' then '2.00' else '3.00' end
  ),
  prior.human_document_hash,
  case
    when prior.product_family = 'WARIBA_ONE' and prior.account_phase = 'evaluation'
      then 'sha256:45854cbeaf63df291ef7a5d8ab930aecebfb4098afce2eddb72083c016f2e862'
    when prior.product_family = 'WARIBA_FLEX' and prior.account_phase = 'evaluation'
      then 'sha256:a4c9b28f08502dc7284af3aca41ef9092f5e64f1e0f9d50b855f65ea90ba7ff8'
    when prior.product_family = 'WARIBA_ONE' and prior.account_phase = 'performance'
      then 'sha256:1f7f85498ed6df454586e3b8b79cc5380c6ff7b523f0cbdde7b6ff5c82adaa5e'
    when prior.product_family = 'WARIBA_FLEX' and prior.account_phase = 'performance'
      then 'sha256:4c570850b8e00cbc7352a5b6d1f6fe2547c7468a78ef1db61b13fdb1c8a8392a'
    when prior.product_family = 'WARIBA_INSTANT' and prior.account_phase = 'performance'
      then 'sha256:d1f368ab61d6009e18a3a57ab6e9089cb15d168c2954826d1e0c3cb6e09bb58a'
  end,
  now(),
  'POLICY-GOV-004',
  prior.news_calendar_version_id,
  prior.session_calendar_version_id,
  margin.id
from app.policy_versions prior
join app.margin_profiles margin
  on margin.product_family = prior.product_family
 and margin.account_phase = prior.account_phase
 and margin.decision_record_id = 'POLICY-GOV-004'
where prior.decision_record_id = 'POLICY-GOV-003'
  and prior.parameters_json ->> 'contract_version' = 'WARIBA_POLICY_V2'
  and prior.semantic_version in ('2.0.0', '2.0.0-one', '2.0.0-flex', '2.0.0-instant');

insert into app.policy_performance_links
  (evaluation_policy_version_id, performance_policy_version_id, decision_record_id)
select evaluation.id, performance.id, 'POLICY-GOV-004'
from app.policy_versions evaluation
join app.policy_versions performance
  on performance.product_family = evaluation.product_family
 and performance.account_phase = 'performance'
 and performance.decision_record_id = 'POLICY-GOV-004'
where evaluation.account_phase = 'evaluation'
  and evaluation.decision_record_id = 'POLICY-GOV-004';

insert into app.product_versions
  (product_id, price_amount, founder_price_amount, price_currency, activation_fee,
   activation_price_amount, total_price_if_success, catalogue_version,
   catalogue_status, purchase_enabled, activation_enabled, gate_reason_code,
   decision_record_id, policy_version_id, feature_flag_key)
select
  prior.product_id,
  prior.price_amount,
  prior.founder_price_amount,
  prior.price_currency,
  prior.activation_fee,
  prior.activation_price_amount,
  prior.total_price_if_success,
  'v2.1.0-candidate',
  'public_candidate',
  false,
  false,
  prior.gate_reason_code,
  'POLICY-GOV-004',
  successor.id,
  prior.feature_flag_key
from app.product_versions prior
join app.products product on product.id = prior.product_id
join app.policy_versions successor
  on successor.product_family = product.product_family
 and successor.decision_record_id = 'POLICY-GOV-004'
 and (
   (product.product_family in ('WARIBA_ONE', 'WARIBA_FLEX') and successor.account_phase = 'evaluation')
   or (product.product_family = 'WARIBA_INSTANT' and successor.account_phase = 'performance')
 )
where prior.catalogue_version = 'v2.0.0-candidate';

insert into app.offer_capability_gates
  (product_version_id, country_code, channel, purchase_enabled,
   activation_enabled, reserve_ready, quota_ready, reason_code)
select
  version.id, '*', 'all', false, false, false, false,
  coalesce(version.gate_reason_code, 'V2_PUBLIC_ACTIVATION_BLOCKED')
from app.product_versions version
where version.catalogue_version = 'v2.1.0-candidate';

update app.product_versions
set retired_at = now(), catalogue_status = 'historical'
where catalogue_version = 'v2.0.0-candidate'
  and retired_at is null;

update app.policy_versions
set status = 'retired', retired_at = now()
where decision_record_id = 'POLICY-GOV-003'
  and parameters_json ->> 'contract_version' = 'WARIBA_POLICY_V2'
  and status = 'pilot_ready';

comment on column app.policy_versions.parameters_json is
  'Immutable machine policy. POLICY-GOV-004 successors carry gross_exposure_max_multiple; prior V2 candidates remain historical.';
