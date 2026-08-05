-- Built CONCURRENTLY, in its own single-statement migration file: this
-- statement must not run inside a transaction block, and a multi-statement
-- migration file runs as one. See 20260805000003_profit_eligibility.sql for
-- the column/index's purpose.
create index concurrently if not exists fills_account_short_duration_idx
  on app.fills (account_id, occurred_at)
  where is_short_duration_profit = true;
