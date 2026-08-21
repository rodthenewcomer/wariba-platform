-- WX3 — genuine provider history in the durable bar cache.
--
-- Additive only. No existing column changes type, no existing row is
-- rewritten, and the WX2 identity (source_id, symbol, interval, open_time)
-- is untouched: a provider bar and an observed bar are distinguished by their
-- source, exactly as WX2 designed, not by a new key.

-- Provenance. WX2 stored only observations, so 'observed' is the correct
-- default for every existing row and the backfill is a pure metadata add.
alter table app.market_bars
  add column origin text not null default 'observed'
    check (origin in ('observed', 'provider_history', 'derived'));

-- Volume, with its semantics attached. Spot FX has no central tape, so a
-- volume number is meaningless without saying whether it counts ticks or
-- exchange trades. Storing the number without the label is how tick volume
-- silently becomes "volume" in an indicator three phases later.
alter table app.market_bars
  add column volume numeric(30, 6) check (volume is null or volume >= 0),
  add column volume_semantics text
    check (volume_semantics is null or volume_semantics in ('tick', 'exchange')),
  add constraint market_bars_volume_semantics_paired check (
    (volume is null and volume_semantics is null)
    or (volume is not null and volume_semantics is not null)
  );

comment on column app.market_bars.origin is
  'WX3 provenance: observed from accepted ticks, fetched from a historical provider, or deterministically derived from complete lower-timeframe bars.';
comment on column app.market_bars.volume is
  'WX3 genuine provider volume. Null when the source does not publish semantically valid volume; never a candle count.';

-- Coverage.
--
-- Deliberately a small table rather than a derived query. earliest/latest are
-- cheaply derivable from market_bars, but `provider_exhausted` is not: it is
-- the record that the provider itself has no data older than
-- `oldest_backfilled_open_time`. Without it, every left-scroll past the start
-- of a provider's archive re-asks the provider the same question and burns the
-- daily credit budget on an answer that will never change.
create table app.market_bar_coverage (
  source_id text not null references app.market_data_sources (id) on delete restrict,
  symbol text not null check (length(btrim(symbol)) between 1 and 32),
  interval text not null check (
    interval in ('1m', '3m', '5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M')
  ),
  earliest_bar timestamptz not null,
  latest_bar timestamptz not null,
  -- False only once the provider has been asked for older data and returned
  -- none. Defaults true so an untested range is never mistaken for an
  -- exhausted one.
  has_more_older boolean not null default true,
  provider_exhausted_at timestamptz,
  last_backfill_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source_id, symbol, interval),
  constraint market_bar_coverage_range_valid check (earliest_bar <= latest_bar),
  constraint market_bar_coverage_exhaustion_consistent check (
    has_more_older or provider_exhausted_at is not null
  )
);

comment on table app.market_bar_coverage is
  'WX3 per-source/symbol/interval record of what history WariX actually holds and whether the provider has more. Display infrastructure only; never execution or risk authority.';

alter table app.market_bar_coverage enable row level security;
revoke all on table app.market_bar_coverage from anon, authenticated;

-- Provider backfill reads whole ranges ascending, which the WX2 descending
-- partial index does not serve. Not partial on is_final: a coverage scan must
-- see every bar the source owns.
create index market_bars_range_scan_idx
  on app.market_bars (source_id, symbol, interval, open_time);
