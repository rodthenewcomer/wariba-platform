-- WX3.1 — session and instrument provenance on cached bars.
--
-- Additive. No existing row is rewritten and no provider row is deleted: the
-- archive stays exactly as fetched, and what changes is that WariX now records
-- what each bar *is* instead of treating every row as equivalent.

-- Which side of the spot-FX trading week a bar sits on.
--
-- An audit of genuine EURUSD 1m bars found the median range tripling at the
-- Friday 17:00 New York close, with the vendor continuing to publish minute
-- bars through Saturday. Those quotes are real, and they are not session data.
-- Recording which is which is what lets the chart show a trading week without
-- anyone rewriting a price.
alter table app.market_bars
  add column session_state text not null default 'regular'
    check (session_state in ('regular', 'out_of_session'));

-- Whether a bar is the instrument's own history or a vendor reconstruction of
-- a period before the instrument existed (pre-1999 EURUSD, rebuilt from the
-- legacy currency basket).
alter table app.market_bars
  add column history_provenance text not null default 'instrument'
    check (history_provenance in ('instrument', 'synthetic_prehistory'));

comment on column app.market_bars.session_state is
  'WX3.1 — regular session data, or genuine vendor quotes published while spot FX was closed. Never used to rewrite a price.';
comment on column app.market_bars.history_provenance is
  'WX3.1 — the instrument''s own history, or a vendor reconstruction of a period before the instrument existed.';

-- The default visible series is regular-session instrument history, so that is
-- what the hot read path is indexed for.
create index market_bars_visible_history_idx
  on app.market_bars (source_id, symbol, interval, open_time desc)
  where is_final and session_state = 'regular' and history_provenance = 'instrument';
