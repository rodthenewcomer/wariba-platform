-- Follow-up to 20260803000000: Prompt 01's migration deliberately revokes
-- default PUBLIC grants on schema `app` (deny-by-default, AGENTS.md §20.1) —
-- its own comment says the next migration to touch a table must add the
-- grant "alongside the table that needs it". The first Prompt 03 migration
-- didn't do that: RLS policies were written, but with no schema USAGE and
-- no table-level GRANT, `anon`/`authenticated` cannot reach any of these
-- tables regardless of policy — safe (fails closed), but non-functional.
-- This migration is purely additive GRANTs; no RLS policy or table changes.
--
-- service_role is intentionally untouched: it bypasses RLS by Supabase
-- convention and already has full access, matching "server authoritative"
-- (ENG-002) — all writes to purchase_orders/payment_attempts/trading_accounts/
-- audit/outbox go through the BFF using service_role, never client grants.

grant usage on schema app to anon, authenticated;

-- Public reference data — no per-row ownership, so table-level GRANT is the
-- correct control (RLS intentionally stays off, per the previous migration).
grant select on app.products to anon, authenticated;
grant select on app.product_versions to anon, authenticated;
grant select on app.policy_versions to anon, authenticated;
grant select on app.symbol_spec_sets to anon, authenticated;

-- Owner-scoped tables — grant only what each RLS policy already allows.
-- user_profiles: no INSERT grant — profile row is created server-side on
-- signup fulfillment (see policy comment "server creates on signup").
grant select, update on app.user_profiles to authenticated;
grant select, insert on app.user_consents to authenticated;
grant select on app.purchase_orders to authenticated;
grant select on app.payment_attempts to authenticated;
grant select on app.receipts to authenticated;
grant select on app.trading_accounts to authenticated;
grant select on app.account_state_transitions to authenticated;
grant select on app.trading_ledger_entries to authenticated;
