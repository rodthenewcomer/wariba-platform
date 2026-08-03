-- Follow-up to 20260804000000 (trading_core): same gap as
-- 20260803000001 fixed for Prompt 03's first migration — RLS policies were
-- written for app.positions/app.trade_orders/app.fills, but with no
-- table-level GRANT, `authenticated` gets "permission denied for table"
-- before RLS is even evaluated. Safe (fails closed) but non-functional.
-- This migration is purely additive GRANTs; no RLS policy or table changes.
--
-- No INSERT/UPDATE/DELETE grant: execution is server-authoritative only
-- (ENG-002) — all writes go through the BFF/realtime service using
-- service_role, which bypasses RLS by Supabase convention.
-- No grant to anon: matches trading_accounts (owner-scoped, authenticated only).

grant select on app.positions to authenticated;
grant select on app.trade_orders to authenticated;
grant select on app.fills to authenticated;
