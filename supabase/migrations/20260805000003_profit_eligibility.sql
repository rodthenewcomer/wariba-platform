-- =========================================================================
-- PROFIT ELIGIBILITY — Prompt 07B §4: the 60-second minimum profit-eligible
-- duration rule. Recorded per close fill (app.fills.fill_type = 'close')
-- using authoritative server timestamps only (position.opened_at and the
-- closing fill's own occurred_at) — never a browser/client timestamp.
--
-- Any non-positive realized_pnl always counts in full toward
-- eligible_realized_pnl regardless of duration; only a POSITIVE pnl held
-- under 60 seconds is excluded (ineligible_short_duration_profit) — it
-- remains visible on the fill (never hidden), it just does not count
-- toward program_eligible_balance (the sum of eligible_realized_pnl across
-- an account's close fills), which downstream evaluation-target/Daily-Loss/
-- Best-Day/EOD-trailing-floor logic will read once wired (tracked as a
-- follow-up — not yet integrated into packages/database/src/risk.ts).
-- =========================================================================

alter table app.fills
  add column duration_ms bigint check (duration_ms is null or duration_ms >= 0),
  add column is_short_duration_profit boolean not null default false,
  add column eligible_realized_pnl numeric(14, 2),
  add column ineligible_short_duration_profit numeric(14, 2) not null default 0;

comment on column app.fills.duration_ms is
  'Close fills only: closing fill occurred_at minus the position''s opened_at, in milliseconds. Null for open fills.';
comment on column app.fills.is_short_duration_profit is
  'True only for a close fill with positive realized_pnl held under 60000ms (Prompt 07B §4). Never true for open fills or non-positive pnl.';
comment on column app.fills.eligible_realized_pnl is
  'Close fills only: the portion of realized_pnl that counts toward program_eligible_balance. Null for open fills (which always carry realized_pnl = 0 already).';
comment on column app.fills.ineligible_short_duration_profit is
  'The portion of a short-duration positive close excluded from program_eligible_balance — still visible on the fill, just not counted. Zero whenever is_short_duration_profit is false.';

-- Rolling 24h short-duration monitoring (Prompt 07B) reads this directly
-- (count of is_short_duration_profit = true fills per account in the last
-- 24h) rather than a separate counter table, so there is exactly one
-- durable record of the fact instead of two that could drift apart.
--
-- The index itself is built CONCURRENTLY in its own migration file
-- (20260805060701_fills_account_short_duration_idx_concurrently.sql) rather
-- than here: a plain CREATE INDEX takes a lock that blocks every concurrent
-- write to app.fills — the busiest table in the schema — for the build's
-- full duration, and CREATE INDEX CONCURRENTLY cannot run inside the
-- implicit transaction block a multi-statement migration file runs in.
