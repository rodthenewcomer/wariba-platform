# WariX WX2 — Professional Chart + Market Data Foundation

Status: implementation baseline

Date: 2026-08-21

Depends on: accepted and frozen WX1 visual workstation

## Objective

WX2 gives WariX a durable, provider-aware chart data foundation without
changing the accepted WX1 visual system or any trading, risk, payout, SL/TP,
pending-order, alert or mobile-shell semantics.

The professional interval family is:

```text
1m  3m  5m  15m  30m  1h  4h  1D  1W  1M
```

`5m` is the default professional interval. Wire values are canonical and UI
labels are presentation only. Tick charts remain disabled.

## Audited starting point

- One admitted tick currently feeds the in-memory candle store, WebSocket
  clients and server-authoritative execution triggers.
- `MemoryMarketHistoryStore` is process-local, capped, and loses its candles on
  restart.
- The browser already buffers ticks during hydration, uses a sequence watermark,
  rejects stale generations, paginates left with one request in flight, merges
  by bar time and compensates the logical range after prepend.
- The chart is created once and receives history through an imperative sink;
  it does not require a React render for each tick.
- `mock`, `replay` and `fcs` expose realtime provider behavior only. No
  provider-native historical endpoint is integrated and verified.

## Canonical interval semantics

Fixed intervals use epoch-aligned UTC buckets. Calendar intervals use:

- `1D`: UTC day, 00:00:00 through the next UTC day;
- `1W`: ISO week, Monday 00:00:00 UTC;
- `1M`: UTC calendar month beginning on day 1.

Open, high, low and close use decimal strings at all contracts and `numeric` in
PostgreSQL. A quote-derived candle uses the mid price. Volume remains absent
unless the source explicitly provides a semantically valid volume field.

## Provider/source contract

Every running provider exposes a stable source identity and capabilities:

```text
provider
environment
mode: sandbox | replay | live
source version / recording / seed identity
realtime quotes
bid/ask
native historical bars
native intervals
pagination mode
volume
depth
```

The same provider name with a different seed, recording or environment is a
different source. History from incompatible source identities is never spliced.
FCS remains unverified until a credential-backed protocol test closes DATA-011.

## Durable storage

`app.market_data_sources` records source identity and capabilities.
`app.market_bars` records one canonical candle per:

```text
(source_id, symbol, interval, open_time)
```

Upserts are idempotent. The cache stores the current observed candle as
non-final and replaces it as new admitted ticks arrive; rollover finalizes the
previous candle. A bounded write-behind queue coalesces updates per key so the
execution path never waits for routine chart persistence. Graceful shutdown
drains both an active SQL batch and any coalesced batch queued behind it.

Both tables are private server infrastructure. RLS is enabled and direct
privileges are revoked from `anon` and `authenticated`. Retention applies to
cache bars only and must never cascade into fill/violation evidence.

## History service

The history port queries persisted finalized bars using cursor pagination,
then merges the compatible in-process current candle. Responses include:

- stable source identity;
- requested symbol and interval;
- ordered unique candles;
- current candle when available;
- first/last accepted sequence watermark;
- `historyThrough`;
- `hasMore` and opaque `nextCursor`;
- data quality status and detected gaps.

A cold installation returns the observations it actually owns. It does not
invent a year of market history. Provider-native backfill is enabled only by a
verified capability implementation.

Provider-local counters are normalized to a monotone WariX sequence per source
and symbol. Startup reads the highest persisted watermark, so a provider or
process counter reset cannot regress the canonical sequence or invalidate an
active candle after restart.

## Historical to realtime cutover

The client owns one controller per chart generation:

1. request durable history;
2. buffer accepted live ticks while the request is in flight;
3. validate source identity and response generation;
4. hydrate ordered unique bars;
5. replay only buffered ticks newer than the response watermark;
6. continue the existing single live subscription.

On reconnect, the client rehydrates durable history before applying buffered
live ticks. Duplicate bars collapse by canonical key. A timestamp conflict,
source change or sequence regression requests resync rather than silently
drawing a phantom candle. Genuine missing buckets are counted and shown through
the existing chart-local status grammar. They can be repaired only when the
provider advertises and implements verified historical bars; otherwise the gap
stays explicit.

## Pagination and viewport

Only one older-page request may be in flight for a chart generation. Prepending
`N` genuinely new bars shifts the saved logical range by exactly `N`. It never
calls `fitContent()`. Initial hydration may call `fitContent()` once when no
valid saved viewport exists.

Range presets request enough older pages before setting the range. The selected
preset and viewport are browser-local, versioned, account/symbol/interval scoped
preferences and have no authority over financial or market state.

## Observability

Structured logs and metrics include source identity (without credentials),
mode, symbol, interval, cache hit/miss, rows returned, query/write latency,
coalesced writes, gaps, paginated history reads, reconnects and persistence
failures. Health separates chart-history degradation from execution safety.

## Verification matrix

- exact bucket boundaries for all ten intervals;
- OHLC aggregation and decimal serialization;
- idempotent concurrent upsert;
- ordered cursor pagination without overlap;
- history/live dedupe and sequence watermark cutover;
- stale response and source mismatch rejection;
- reconnect backfill before live continuation;
- restart continuity from persisted bars;
- viewport preservation after prepend;
- no `fitContent()` after prepend/reconnect/live update;
- one upstream tick admission and one chart subscription;
- RLS/direct privilege denial for browser roles;
- explicit unsupported state for native history, volume and depth.

## Non-scope

- redesigning any WX1 rail, glyph, chip, plate, modal, toolbar or mobile shell;
- changing execution, risk, policy, payout or financial math;
- inventing provider history, exchange volume, trade semantics or depth;
- adding Redis, Kafka, a market-data microservice or a new chart renderer;
- enabling capital réel or a provider without licensing and verification.
