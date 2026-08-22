-- WX2 — durable, source-partitioned chart history.
--
-- This is a reconstructible display cache. It is deliberately separate from
-- execution/risk evidence and never replaces the authoritative tick snapshots
-- tied to fills or violations (DATA-004/DATA-017).

create table app.market_data_sources (
  id text primary key check (length(btrim(id)) between 1 and 200),
  provider text not null check (length(btrim(provider)) between 1 and 80),
  environment text not null check (length(btrim(environment)) between 1 and 80),
  mode text not null check (mode in ('sandbox', 'replay', 'live')),
  source_version text not null check (length(btrim(source_version)) between 1 and 160),
  capabilities jsonb not null check (jsonb_typeof(capabilities) = 'object'),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table app.market_bars (
  source_id text not null references app.market_data_sources (id) on delete restrict,
  symbol text not null check (length(btrim(symbol)) between 1 and 32),
  interval text not null check (
    interval in ('1m', '3m', '5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M')
  ),
  open_time timestamptz not null,
  open numeric(30, 12) not null check (open > 0),
  high numeric(30, 12) not null check (high > 0),
  low numeric(30, 12) not null check (low > 0),
  close numeric(30, 12) not null check (close > 0),
  is_final boolean not null default false,
  first_observed_sequence bigint check (first_observed_sequence is null or first_observed_sequence >= 0),
  observed_through_sequence bigint check (observed_through_sequence is null or observed_through_sequence >= 0),
  observed_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (source_id, symbol, interval, open_time),
  constraint market_bars_ohlc_valid check (
    high >= low and high >= open and high >= close and low <= open and low <= close
  ),
  constraint market_bars_sequence_order_valid check (
    first_observed_sequence is null
    or observed_through_sequence is null
    or first_observed_sequence <= observed_through_sequence
  )
);

create index market_bars_history_lookup_idx
  on app.market_bars (source_id, symbol, interval, open_time desc)
  where is_final;

create index market_bars_retention_idx
  on app.market_bars (updated_at);

alter table app.market_data_sources enable row level security;
alter table app.market_bars enable row level security;

revoke all on table app.market_data_sources, app.market_bars from anon, authenticated;

comment on table app.market_data_sources is
  'WX2 stable non-secret provider/source identities and explicit market-data capabilities. Server-only; no browser grants.';
comment on table app.market_bars is
  'WX2 reconstructible observed candle cache. Idempotent identity: source, symbol, interval, open_time. Never execution or risk authority.';
