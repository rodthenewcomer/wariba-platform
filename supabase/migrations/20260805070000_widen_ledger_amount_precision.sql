-- Prompt 7 Appendix 07-B, gate 3 — widen app.trading_ledger_entries.amount
-- from numeric(14,2) to numeric(20,8).
--
-- Why: computeCommission (packages/domain/src/trading-math.ts) rounded to
-- 2 decimals even though its own inputs — commission_per_lot
-- (numeric(10,4)) and app.fills.commission (numeric(10,4)) — already carry
-- 4 decimal places. That gap meant a genuinely fractional per-lot
-- commission rate (e.g. 0.375) would compute a correct 4-decimal fill
-- commission but a needlessly-truncated 2-decimal ledger entry — the
-- fill's own stored evidence and the amount actually deducted from the
-- account's real balance could silently diverge. This migration removes
-- the ceiling that made that possible; the accompanying application change
-- (computeCommission now rounds to 4 decimals, matching what the column it
-- writes into has always supported) is what actually starts using it.
--
-- Scope is deliberately narrow: only this column widens. app.fills and
-- app.positions' own realized_pnl/commission columns are unchanged and
-- out of scope — realized_pnl's 2-decimal precision is this system's
-- deliberate, consistent money model everywhere except this one ledger
-- column, not an artificial cap like commission's was.
--
-- Lock-safety note: unlike a CHECK constraint, a column TYPE change has no
-- NOT VALID/VALIDATE split — ALTER COLUMN ... TYPE requires ACCESS
-- EXCLUSIVE for the full rewrite regardless. Increasing scale (2 -> 8
-- decimals) on an already-populated table is not lossy (every existing
-- value remains exactly representable), but it is still a table rewrite.
-- Safe today because this schema has no production data yet; if this
-- table ever holds meaningful live volume before this migration has run,
-- prefer the shadow-column pattern instead (add amount_v2 numeric(20,8),
-- backfill in batches, swap, drop the old column in a later migration)
-- rather than running this as-is against a hot table.
--
-- Rollback: numeric(20,8) -> numeric(14,2) is lossy only if any stored
-- value already exceeds 2 decimal places or 14 total digits — neither is
-- possible before this migration's own application-code change ships, so
-- a straight reverse ALTER is safe until that point:
--   alter table app.trading_ledger_entries alter column amount type numeric(14, 2);
-- After the application change ships and real 4-decimal commission
-- entries could exist, reverting requires deciding how to re-round those
-- rows (round(amount, 2)) before narrowing the column — a data decision,
-- not just a schema one, so it is deliberately not automated here.

alter table app.trading_ledger_entries
  alter column amount type numeric(20, 8);

comment on column app.trading_ledger_entries.amount is
  'Widened to numeric(20,8) (was numeric(14,2)) so a fractional per-lot commission is never truncated below what app.fills.commission (numeric(10,4)) already stores. Every other ledger entry type (realized_pnl, initial_balance, etc.) still writes at 2 decimals by convention — the wider column has headroom, not a new requirement.';
