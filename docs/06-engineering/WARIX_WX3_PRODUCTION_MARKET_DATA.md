# WariX WX3 — Production Market Data & Deep Historical Coverage

Status: implementation baseline

Date: 2026-08-21

Depends on: closed WX1 visual workstation, closed WX2 chart market-data foundation

Provider decision: `WARIX_WX3_PROVIDER_EVALUATION.md`

## Objective

WX2 built a durable, source-partitioned candle cache and refused to fabricate
history. That was correct, and it left a verified gap: a cold WariX install
owned only what its own realtime process had observed since it started, so
`EURUSD` `1D` on a fresh database showed one partially-formed daily candle.

WX3 closes that with data. A trader opening a symbol now sees genuine market
history immediately, scrolls left into genuinely older bars, and keeps that
history across a restart. Nothing is invented to make the chart look full, and
where a provider genuinely has nothing, the chart says so.

Not in scope: any WX1 visual change, any trading, risk, payout, SL/TP or
pending-order semantic, and any change to where realtime ticks come from.

## 1. Provider selection

```text
PRIMARY_PROVIDER    = twelve-data
HISTORICAL_PROVIDER = twelve-data       (production candidate, runtime-verified)
                      oanda-practice    (dev/staging, full coverage, runtime blocked)
REALTIME_PROVIDER   = unchanged (mock | replay | fcs as configured)
```

Realtime is deliberately untouched. WX3 changes where candles come from, not
where ticks come from; moving both at once would make the historical/realtime
seam unmeasurable, and the tick stream feeds server-authoritative execution.

## 2. Source identity

WX2's rule stands: a source identity partitions the durable cache, and bars from
different identities are never spliced. WX3 adds a second identity to every
running system.

```text
twelve-data:production:history-v1-map-<hash>   historical archive
mock:sandbox:seed-20260804:v1                  realtime observations
oanda:practice:history-v1-practice-map-<hash>  dev-only archive
```

The hash covers the symbol mapping, so re-pointing `EURUSD` at a different
provider ticker produces a different source rather than quietly mixing two
mappings under one identity. Provider bars are written under the provider's id;
observed bars stay under the realtime feed's. They share a table and never a row.

## 3. Historical fetch flow

```text
chart request (symbol, timeframe, limit, before?)
        ↓
ProviderMarketHistoryStore.getCandles
        ↓
MarketHistoryBackfillEngine.ensure
        ↓  cache count ≥ target?  → cache_sufficient, no provider traffic
        ↓  coverage says exhausted? → provider_exhausted, no provider traffic
        ↓
advisory lock (source, symbol, interval)   → not acquired → coalesced
        ↓
rate limiter → provider page → canonical validation → derive if needed
        ↓
idempotent upsert → coverage update
        ↓
durable page read → gap classification → cutover decision → window
```

## 4. Cache flow and pagination

Reads are cache-first by construction: the engine counts what the durable cache
already holds for the requested window before it considers a request. A
left-scroll asks for bars older than a cursor; if the cache already holds them
the provider is never contacted. Switching `5m → 1h → 5m` reuses durable data
in both directions.

Measured on a warm cache, a full timeframe answer costs 3–8 ms against 80–350 ms
cold.

## 5. Initial backfill depth

`services/realtime/src/market-history-depth.ts` is the single table. Intraday
intervals acquire 1000–1500 bars, `1D` 2000, `1W` 520, `1M` 240 — enough that
`1W` and `1M` open on genuine multi-year structure rather than one candle. Left
paging acquires 500 more at a time so the interaction stays immediate.

Two ceilings bound the cost: `MAX_PROVIDER_PAGE_BARS` (5000, both vendors' cap)
and `MAX_PROVIDER_REQUESTS_PER_BACKFILL` (8), the latter being a stop condition
that does not depend on the provider behaving correctly.

## 6. Concurrency and rate limiting

Two layers, deliberately the smallest that work:

- **In-process coalescing** — one promise per `(symbol, timeframe, cursor)`, so
  twenty browsers on one node produce one provider conversation.
- **`pg_try_advisory_xact_lock`** — one backfill per `(source, symbol, interval)`
  across processes. Transaction-scoped, so it cannot outlive a crashed backfill.
  A caller that does not get the lock is answered from cache, not queued.

Pacing is a rolling-window limiter (Twelve Data measures "8 credits per minute",
which is a window, not a refill rate). Retries use full jitter and honour a
provider `Retry-After`; only `rate_limited`, `timeout` and `transport` are
retryable — an authentication failure retried with backoff is how a key gets
suspended.

## 7. Canonical validation

Every provider bar passes `normalizeProviderBars` before it can be stored. It
**rejects rather than repairs**: bucket misalignment, `high < low`,
`high < open|close`, `low > open|close`, non-positive prices, cursor-bound
violations, duplicate buckets with conflicting OHLC, and volume whose semantics
are unknown. Rejected bars are counted, logged and reported on the page.

This is not defensive decoration. It is what caught Twelve Data's `4h` bars
being anchored to the New York session rather than the UTC epoch — a defect that
would otherwise have shipped a `4h` series silently holed for half of each year.

## 8. Native versus derived intervals

```text
NATIVE   1m 5m 15m 30m 1h 1D 1W 1M      (Twelve Data, verified aligned)
DERIVED  3m ← 1m                        (no three-minute bar exists)
         4h ← 1h                        (vendor 4h is session-anchored)
```

A derived bucket is emitted only when the fetched window fully contains it, so a
bucket that straddles the edge of what was actually retrieved is skipped rather
than assembled from partial data. Inside a covered window a missing lower
timeframe bar means the market produced no trade in that period, which is an
absence of activity, not of data — no fill-forward, no guessed open, no
synthetic high or low. Volume sums only when every contributing bar carries
volume with the same semantics. Provenance is stored as `origin = 'derived'`.

OANDA's `H4` honours the UTC `dailyAlignment` WariX requests, so it stays native
there. Derivation is a per-provider consequence of `supportsTimeframe`, not a
global assumption.

## 9. Calendar semantics

Unchanged from WX2 and enforced, not trusted: `1D` is the UTC day, `1W` the ISO
week from Monday 00:00 UTC, `1M` the calendar month from day 1. `1M` is never 30
days. OANDA requests pin `dailyAlignment=0`, `alignmentTimezone=UTC` and
`weeklyAlignment=Monday` because its defaults align the day to 17:00 New York.

## 10. Gap detection and repair

Gaps are classified rather than merely counted:

```text
expected_session_gap      the FX weekend — not a data problem
recoverable_history_gap   a real hole a provider can fill
provider_data_gap         older than the provider's archive
unrecoverable_gap         a real hole with no historical provider configured
```

`quality.gapsDetected` now means "holes a trader should care about"; expected
closures are reported separately so the signal stops firing every Saturday. The
weekend window is deliberately wide (Friday 21:00 → Sunday 22:00 UTC) so
daylight-saving drift under-reports rather than crying wolf. Calendar intervals
are never explained away as session closures.

`reconnectRepairRange` bounds a repair to seven days so a service that was down
for a month does not turn its first request into a month-long backfill on the
hot path.

## 11. Historical to realtime cutover

This is the seam WX2 never had to have, and it is explicit.

```text
historical source   provider archive
realtime source     configured tick feed
precedence          provider bars are authoritative for finalized buckets
dedupe              canonical key (source, symbol, interval, open_time)
overlap             none — the two never write the same row
transition          the server decides and states it on the wire
```

`realtimeContinuation` on every history result is one of:

```text
attached                    live ticks may extend this series
refused_by_config           MARKET_HISTORY_CUTOVER=never
refused_source_mismatch     no comparable live price to verify against
refused_price_divergence    the two sources describe different markets
```

Under `verified` (the default) the same vendor for both needs no check;
different vendors are joined only if the live mid sits within
`MARKET_HISTORY_CUTOVER_TOLERANCE_BPS` (50 bps) of the newest provider close.
A sandbox feed walking around a fixed base price fails that check by an enormous
margin, which is exactly the point: it stops a synthetic price being drawn onto
a genuine series.

A refusal is not an error. The chart shows genuine history and stops there;
execution, the price plate and every risk control keep using the live feed
untouched. Historical-data availability and execution availability are separate
concerns and are not coupled.

## 12. Failure behaviour

```text
cache present + provider down   → serve cache, log, chart unaffected
no cache + provider down        → WX2's honest empty window
rate limited                    → backoff, Retry-After honoured, cache served
authentication failure          → terminal, logged, no retry storm
unsupported symbol/timeframe    → fall back to the observed source, stated
malformed provider data         → quarantined and counted, never stored
```

A provider failure never crashes the workstation and never blocks trading.

## 13. Security

Credentials live only in the environment. Both adapters throw
`MarketDataProviderBlockedError` at construction when their key is absent rather
than degrading to a mock — there is no code path where a missing credential
produces candles. Keys are never logged: telemetry carries the non-secret source
id, provider, environment and mode. `assertOandaEnvironmentAllowed` refuses to
construct the OANDA adapter under `APP_ENV=production` because its licence
prohibits third-party display.

Both durable tables stay server-only: RLS enabled, direct privileges revoked
from `anon` and `authenticated`.

## 14. Mobile

Mobile receives the same durable truth from the same port — there is no
mobile-specific dataset, no lighter payload and no separate code path. The
bounded page size that makes the desktop chart responsive is what makes the
390px chart responsive.

## 15. Observability

```text
history.cache.hit / history.cache.miss
history.provider.request / history.provider.page
history.provider.rate_limited / history.provider.bars_rejected
history.backfill.completed / history.backfill.failed / history.backfill.coalesced
history.derived.incomplete_skipped
history.cutover.refused_price_divergence
history.provider.symbol_unsupported / history.provider.unavailable_no_cache
```

Structured, per-backfill rather than per-tick, and never carrying a credential.

## 16. Limitations

- Intraday archive depth is bounded by the vendor: `1m` reaches roughly one day
  back on a Basic key, `5m` roughly five days. Daily and above reach years.
- `NAS100` needs a paid Twelve Data plan (`NDX`, Grow or Venture) and is
  reported unsupported until then.
- Twelve Data publishes no volume for spot FX, so WariX stores none.
- No provider here offers order-book depth; `depth: false` remains correct.
- OANDA's practice host was unreachable from this environment (HTTP 520 even
  unauthenticated), so its adapter has never executed against the live service.
- `hasMoreOlder` from Twelve Data is inferred from a full page, not stated by
  the vendor; the durable coverage record is what ultimately stops the walk.
