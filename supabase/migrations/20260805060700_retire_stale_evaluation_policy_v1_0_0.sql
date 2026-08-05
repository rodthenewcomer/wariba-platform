-- WARIBA_ONE policy v1.0.0's seeded parameters_json predates the current
-- evaluationOnePolicyParametersSchema (packages/policies/src/schema.ts) —
-- it is missing fields the schema now requires (recognized_profit,
-- daily_loss_action, maximum_loss_model, maximum_loss_floor_formula, etc.)
-- and carries `qualified_days_required: 3` where the schema now requires
-- `null`. parseAndVerifyPolicy has therefore been unable to load this row
-- since the schema was tightened — packages/policies/tests/schema.test.ts
-- explicitly asserts this shape must be rejected, not silently accepted.
--
-- It was already effectively dead: 20260805000001_backfill_policy_machine_hash.sql's
-- own comment and packages/database/src/policy.ts's `loadPublishedPolicy`
-- doc comment both establish that new activations have picked the newest
-- *published* row (ordered by created_at) since 20260804000007, i.e.
-- v1.1.0 and now v1.1.1 — v1.0.0 has not been handed out to any new
-- account since. This migration only marks it 'retired' so it can never be
-- selected again and its true status is documented; it does not (and, from
-- a migration alone, safely cannot) touch any `trading_accounts` row that
-- might still carry a `policy_version_id` FK pointing at it — repinning a
-- live account to different risk/profit-target parameters is a business
-- decision, not something a schema migration should do silently. If any
-- such account exists, packages/database/src/policy.ts's `loadPolicyById`
-- will continue to reject it with a clear, caught (not crashing) error on
-- every trade attempt until it is manually repinned.
update app.policy_versions
set status = 'retired'
where program = 'WARIBA_ONE' and semantic_version = '1.0.0' and status = 'published';
