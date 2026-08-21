# WariX WX2 — Professional Chart + Market Data Foundation

## Governing amendment

This repository copy normalizes the authorized WX2 implementation prompt. It
supersedes every shorter timeframe list in earlier prompt text with:

```text
1m
3m
5m
15m
30m
1h
4h
1D
1W
1M
```

The addition of `1m` and `3m` is explicit and mandatory. `5m` is the default.
Existing sub-minute sandbox intervals may remain internal but are not displayed
as the WX2 professional interval family. Tick charts stay disabled.

## Mission

Implement the complete chart and market-data foundation behind the accepted
WariX WX1 workstation:

1. canonical professional timeframe architecture;
2. durable historical market bars;
3. provider/source identity and explicit capabilities;
4. historical cache with idempotent persistence;
5. fetch-more-on-scroll-left cursor pagination;
6. restart continuity;
7. historical-to-realtime cutover without duplicate bars, gaps, timestamp
   conflicts or phantom candles;
8. range presets and viewport restoration;
9. capability groundwork for bid/ask, volume and depth only where a provider
   genuinely supports them;
10. source/data-quality observability and focused verification evidence.

## Immutable boundary

Do not redesign or polish the WX1 workstation. Preserve its rails, proprietary
symbols, icon sizing, active material, semantic micro-motion, reduced motion,
mobile navigation, SL/TP geometry, invalid-preview behavior, chips, price
plates, chart toolbar, drawing rail, header and feed treatment.

Lightweight Charts remains the renderer. Trading, risk, policy, payout,
execution pricing and server authority remain unchanged.

## Truthfulness rules

- Never fabricate historical bars to make a chart look complete.
- Never fabricate provider volume, exchange trades, depth or order book data.
- A provider capability must be explicit and test-backed.
- The current `mock`, `replay` and `fcs` adapters do not have verified native
  historical bars at the start of WX2.
- Persisted observed bars are a durable cache, not a claim of provider-native
  history.
- Preserve DATA-003: do not retain every UI tick indefinitely.

## Required implementation

### Intervals

Use one canonical shared contract for the ten professional intervals. Support
fixed UTC buckets plus UTC day, ISO week and calendar month boundaries. Keep
the UI label separate from the wire value where casing differs.

### Source identity and capabilities

Extend the provider boundary with stable source identity, environment/mode,
seed or recording version where relevant, and explicit realtime, bid/ask,
history, pagination, volume, depth and native-interval capabilities.

### Durable cache

Create private PostgreSQL source and bar tables with RLS, browser-role denial,
numeric OHLC, final/non-final state, sequence watermarks and unique canonical
bar identity. Upsert idempotently. Use bounded/coalesced write-behind so chart
persistence does not block execution; flush safely on shutdown.

### Read/pagination path

Serve ordered unique pages from the durable store, merging only the compatible
current live candle. Preserve a stable source identity across process restart.
Return an opaque cursor, `hasMore`, watermarks and data-quality status.

### Cutover/reconnect

Hydrate history, buffer live ticks, replay only ticks newer than the watermark,
then continue the existing single subscription. On reconnect, backfill the
missing window before live continuation. Reject stale generation, wrong source,
timestamp conflicts and sequence regression.

### Viewport/ranges

Keep existing left-pagination compensation. Never call `fitContent()` after a
prepend, reconnect backfill or live update. Persist versioned browser-local
range/viewport preferences scoped by account, symbol and interval. Range
presets fetch enough history before applying the requested view.

### Observability

Add structured source/cache/history/gap/backfill/reconnect metrics and logs
without credentials or sensitive payloads. A history-cache failure may degrade
the chart but must not weaken execution safety.

## Verification

Run focused unit, integration, RLS, realtime and browser tests for:

- all interval boundaries and OHLC aggregation;
- idempotent upsert and pagination;
- restart continuity;
- history/live cutover and dedupe;
- reconnect gap backfill;
- rapid symbol/interval switching;
- viewport preservation and `fitContent()` discipline;
- a single subscription/remount-free chart;
- explicit unsupported volume/depth/native history;
- no secrets or generated junk.

Do not launch an unrelated legacy certification campaign. Classify any failure
as product, test or infrastructure; fix the root cause in WX2 scope and preserve
documented pre-existing debt.

## Completion report

Report exact implemented intervals, migration/store paths, provider capability
status, tests executed, exact failures, runtime evidence and remaining external
gates. Do not claim provider-native historical readiness while DATA-011 remains
unverified.
