-- =========================================================================
-- Commercial pricing v1.1 — five tiers, FCFA primary, founder pricing.
-- DECISION_LOG OFFER-013..022. Status: CANDIDATE_PENDING_ACTUARIAL_MODEL.
--
-- 20260803000000 already applied to the hosted DB with three tiers at the
-- old prices — per project rule, migrations are never edited after being
-- applied, so this widens the schema and supersedes the old product_versions
-- with new ones rather than mutating the original migration or its rows.
-- =========================================================================

-- 1. Widen the code check constraint to admit the two new tiers.
alter table app.products drop constraint products_code_check;
alter table app.products
  add constraint products_code_check check (code in ('5K', '10K', '25K', '50K', '100K'));

-- 2. Founder pricing: nullable, additive. Not yet exposed via the API — no
-- cohort-gating mechanism exists yet (RULESET commercial_constraints.
-- founder_price_must_have_real_cohort), so the application layer must not
-- read this column into any client-facing response until that exists.
alter table app.product_versions
  add column founder_price_amount numeric(14, 2)
    check (founder_price_amount is null or founder_price_amount >= 0);

-- 3. Retire the three old product_versions (price history preserved, never
-- deleted) and insert their v1.1 replacements at the new FCFA prices.
update app.product_versions
set retired_at = now()
where retired_at is null
  and product_id in (select id from app.products where code in ('5K', '10K', '25K'));

insert into app.product_versions
  (product_id, price_amount, founder_price_amount, price_currency, feature_flag_key)
select id, 22500, 16900, 'XOF', null from app.products where code = '5K'
union all
select id, 39900, 34900, 'XOF', null from app.products where code = '10K'
union all
select id, 84900, 74900, 'XOF', 'product_25k_enabled' from app.products where code = '25K';

-- 4. New tiers: 50K and 100K, both commercially disabled by default
-- (RULESET feature_flags.product_50k_enabled / product_100k_enabled = false).
insert into app.products (code, nominal_balance, nominal_currency) values
  ('50K', 50000, 'USD'),
  ('100K', 100000, 'USD');

insert into app.product_versions
  (product_id, price_amount, founder_price_amount, price_currency, feature_flag_key)
select id, 144900, 124900, 'XOF', 'product_50k_enabled' from app.products where code = '50K'
union all
select id, 259900, 229900, 'XOF', 'product_100k_enabled' from app.products where code = '100K';
