-- Built CONCURRENTLY, in its own single-statement migration file: this
-- statement must not run inside a transaction block, and a multi-statement
-- migration file runs as one. See
-- 20260805060651_prompt_07b_program_eligibility.sql for the column/index's
-- purpose.
create index concurrently if not exists fills_opening_fill_id_idx
  on app.fills (opening_fill_id)
  where opening_fill_id is not null;
