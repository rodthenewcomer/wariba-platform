-- Prompt 7 Appendix 07-C §12 — reducing risk must stay possible even when
-- fresh prices are temporarily unavailable. A partial/full close can never
-- execute against a stale price (packages/database/src/trading.ts already
-- rejects that), so this queue lets the user submit the exact reduction
-- they want while the market is STALE/OUTAGE, to be executed once, against
-- the first fresh price for that symbol — never guessed, never duplicated.
--
-- This table is the queuing/audit trail; execution itself always goes
-- through the existing closePosition() transaction (same idempotency key
-- stored here), so every executed row also produces a normal
-- app.trade_orders/app.fills audit trail identical to a live close — this
-- table adds nothing new to *that* side, it only remembers "not yet".
create table app.position_reduction_queue (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.trading_accounts (id),
  position_id uuid not null references app.positions (id),
  idempotency_key uuid not null,
  mode text not null check (mode in ('partial', 'full')),
  requested_quantity numeric(14, 4),
  status text not null default 'queued' check (status in ('queued', 'executed', 'cancelled', 'failed')),
  queued_at timestamptz not null,
  executed_at timestamptz,
  cancelled_at timestamptz,
  execution_order_id uuid references app.trade_orders (id),
  failure_reason text,
  created_at timestamptz not null default now(),
  constraint position_reduction_queue_quantity_matches_mode check (
    (mode = 'partial' and requested_quantity is not null)
    or (mode = 'full' and requested_quantity is null)
  )
);

-- Idempotent submission: replaying the same client-submitted idempotency
-- key for this account must find the same queued row, never create a
-- second one (appendix §16 — every command idempotent, no duplicate
-- modifications on retry).
create unique index position_reduction_queue_account_idempotency_key
  on app.position_reduction_queue (account_id, idempotency_key);

-- What services/realtime's tick loop scans on every fresh tick: pending
-- rows for a given position, cheaply. Partial index — most rows settle into
-- 'executed'/'cancelled' within seconds and never need this index again.
create index position_reduction_queue_pending
  on app.position_reduction_queue (position_id)
  where status = 'queued';

alter table app.position_reduction_queue enable row level security;
-- No anon/authenticated grant at all, same as app.positions/app.fills/
-- app.trade_orders — this table is only ever read/written by services/
-- realtime's direct Postgres connection (service_role), never by a
-- PostgREST-scoped client. The trader-facing view is
-- AccountSnapshot.queuedReductions, built server-side.

comment on table app.position_reduction_queue is
  'Prompt 7 Appendix 07-C gate: queued SL/TP-reduction/close requests submitted while market data was stale or unavailable, executed once by services/realtime against the first fresh tick for the position''s symbol. Rollback: drop table app.position_reduction_queue — non-destructive to any other table; in-flight queued rows are simply lost (equivalent to the outage never having had a queue at all).';
