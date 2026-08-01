-- WARIBA foundation migration (Prompt 01).
-- Non-destructive: creates schemas only, no business tables.
-- See WARIBA System Architecture v1.0 §21.2 for the intended schema layout.
--
-- `auth` and `storage` are managed by Supabase itself and are not created here.
-- `app` (business data), `audit` (append-only events) and `private`
-- (secrets/integration data) are created now so RLS and ownership can be
-- established before any table is added.

create schema if not exists app;
create schema if not exists audit;
create schema if not exists private;

comment on schema app is 'WARIBA business domain tables (identity, commerce, trading, policy-risk, performance-payout, support, operations).';
comment on schema audit is 'Append-only audit events. No update/delete grants are issued to application roles.';
comment on schema private is 'Server-only secrets and integration data. Never exposed via PostgREST.';

-- Deny-by-default posture (AGENTS.md §20.1, Security/QA/Ops Standard §2.1):
-- revoke the default PUBLIC privileges on these schemas so nothing is
-- reachable until an explicit grant is added alongside the table that needs it.
revoke all on schema app from public;
revoke all on schema audit from public;
revoke all on schema private from public;
