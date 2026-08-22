# WariX WX3 — Historical Market Data Provider Evaluation

Status: decision record

Date: 2026-08-21

Depends on: closed WX1 visual workstation, closed WX2 chart market-data foundation

## Why this evaluation exists

WX2 built a durable, source-partitioned candle cache and refused to fabricate
history. That was correct, and it left a verified gap: every provider wired into
the repository (`mock`, `replay`, `fcs`) advertises

```text
historicalBars: false
nativeIntervals: []
pagination: 'none'
volume: false
depth: false
```

so a cold WariX installation owns only the candles its own realtime process has
observed since it started. A trader opening `EURUSD` `1D` on a fresh database
sees one partially-formed daily candle, because one partially-formed daily
candle is the honest truth of what the system has observed.

WX3 fixes that with data, not with beautification. This document selects the
source of that data.

## Evaluation method

Capabilities below come from current official provider documentation or from the
provider's own OpenAPI specification. Nothing here is inferred from a blog post
or assumed from a client library. Where a capability could not be confirmed from
a primary source it is marked `UNVERIFIED` rather than guessed, and where a
commercial or licensing term is material it is marked `LEGAL_REVIEW_REQUIRED`
rather than interpreted.

A live capability probe **was** executed against Twelve Data on 2026-08-21
with a real Basic-plan key, using `services/realtime/scripts/wx3-history-probe.ts`
and a direct endpoint probe. Findings marked `RUNTIME-VERIFIED` below come from
that run and, where they contradict the documentation-derived expectation, the
runtime result wins and the correction is stated rather than quietly applied.

The OANDA probe could **not** be executed: see the infrastructure finding in
that provider's section.

## Candidates considered

| Provider | Considered because | Outcome |
|---|---|---|
| Twelve Data | FX + metals + indices under one symbol model, documented 1min–1month history, documented free tier | **Selected — production candidate** |
| OANDA v20 | Broker-grade FX/metals/index CFD candles, native granularities, free practice token | **Selected — development/staging source** |
| Massive (formerly Polygon.io) | Institutional tick + aggregate FX coverage | Rejected for now — see below |
| FCS | Already wired as a quote adapter | Rejected as historical source — see below |
| Tiingo | 30+ years FX, REST + WebSocket | Held in reserve |
| Finnhub | Broad asset coverage | Rejected — FX candles restricted |
| EODHD | 1-minute and 5-minute intraday history | Held in reserve |
| Dukascopy-derived | Free tick-level archive | Rejected — not an API product |

## Decision matrix

Legend: `YES` documented and required-capable · `PARTIAL` capable with a stated
limit · `NO` documented absent · `PAID` gated behind a higher plan ·
`UNVERIFIED` not confirmable from a primary source.

| Criterion | Twelve Data | OANDA v20 | Massive/Polygon | FCS |
|---|---|---|---|---|
| EURUSD | YES | YES (`EUR_USD`) | YES | YES |
| GBPUSD | YES | YES (`GBP_USD`) | YES | YES |
| USDJPY | YES | YES (`USD_JPY`) | YES | YES |
| XAUUSD / metals | **YES — RUNTIME-VERIFIED on Basic** | YES (`XAU_USD`) | PARTIAL | UNVERIFIED |
| NAS100 / indices | PAID — RUNTIME-VERIFIED (`NDX`, Grow/Venture) | YES (`NAS100_USD`) | PARTIAL | UNVERIFIED |
| Historical OHLC | YES | YES | YES | NO (no candle endpoint integrated or verified) |
| 1-minute history | YES — RUNTIME-VERIFIED | YES (`M1`) | YES | NO |
| Multi-year daily | YES (20+ years FX) | YES | YES | NO |
| Weekly / monthly | YES — RUNTIME-VERIFIED, UTC-aligned | YES (`W`, `M` native) | Aggregatable | NO |
| Pagination | `start_date`/`end_date` time-range | `from`/`to` + `count`, `includeFirst` | time-range | NO |
| Max bars / request | 5000 | 5000 | provider-tier dependent | n/a |
| Realtime | YES | YES (streaming) | YES | YES (quotes only, unverified wire protocol) |
| WebSocket | YES (credit-weighted per symbol) | YES | YES | YES |
| Rate limits | 8 credits/min, 800/day (Basic); 55/min (Grow); 610/min (Pro); 2584/min (Ultra) | 120 requests/second | tier dependent | UNVERIFIED |
| Volume | **Absent entirely for FX — RUNTIME-VERIFIED** | Tick volume (`volume`), explicitly not exchange volume | Tick/quote counts | NO |
| Depth / order book | NO | NO | PARTIAL | NO |
| Timezone semantics | UTC for forex/crypto; `timezone` param applies to intraday only | RFC3339 UTC; `dailyAlignment`/`alignmentTimezone`/`weeklyAlignment` configurable | UTC epoch ms | n/a |
| Weekend / session | FX gap over weekend, not documented as a data gap | `complete: false` flag distinguishes forming candles; weekend absence is structural | structural | n/a |
| Display / redistribution | Basic = **internal non-display only**; Grow = internal display; external display `LEGAL_REVIEW_REQUIRED` | **Redistribution and third-party display prohibited without written permission** | commercial terms tier dependent | UNVERIFIED |
| Cost (public, Aug 2026) | Basic free · Grow $29/mo · Pro $99/mo · Ultra $329/mo | Free practice token; live account required for live data | quote-based | existing |
| Sandbox / test access | Free Basic key, no card | Free practice token — **host unreachable, see below** | trial | n/a |
| Production suitability | **7 / 10** | **4 / 10** (licensing) | 6 / 10 | 1 / 10 |
| Development suitability | **10 / 10 — proven** | 10 / 10 on paper, **0 / 10 as reached from here** | 5 / 10 | 1 / 10 |

## Per-candidate findings

### Twelve Data — selected as production candidate

`GET https://api.twelvedata.com/time_series` returns OHLCV for
`1min, 5min, 15min, 30min, 45min, 1h, 2h, 4h, 8h, 1day, 1week, 1month`.
Forex symbols use a slash (`EUR/USD`). `outputsize` accepts 1–5000 and defaults
to 30 when no date parameters are supplied — a default that silently produces a
30-bar chart, so WX3 always sends `outputsize` explicitly. Pagination is by
`start_date` / `end_date` (`2006-01-02` or `2006-01-02T15:04:05`), not by an
opaque cursor, which maps cleanly onto WX3's `before`-cursor window arithmetic.
`order` defaults to `desc`; WX3 requests `asc` and re-sorts defensively anyway.
For forex and crypto the start/end dates are interpreted in UTC, which matches
WariX canonical bucket semantics without a conversion layer. Cost is 1 API
credit per symbol per request.

Coverage is the reason it wins: 2000+ pairs across 140 currencies **plus
precious metals**, 20+ years of history, and indices — one provider, one symbol
model, FX and metals and indices, with both history and realtime WebSocket.
That is the `History + Realtime + FX + Metals + Indices` shape WX3 §60 asks for.

### Runtime probe results — 2026-08-21, Basic key

The probe corrected three expectations that had been formed from documentation
alone. Two of them were pessimistic and one was a genuine defect that would
have shipped a holed chart.

**`XAU/USD` works on the free Basic plan.** The documentation-derived reading of
the pricing page implied metals were gated behind a commodities tier. They are
not, at least for gold spot: a `1day` request returned bars immediately. The
matrix above is corrected accordingly and `XAUUSD` is mapped.

**`NAS100` is not a Twelve Data ticker; `NDX` is, and it is genuinely gated.**
`NAS100` returns a 404 "symbol invalid". `NDX` returns a 404 whose message is
explicit: *"This symbol is available starting with the Grow or Venture plan."*
That is a precise, quotable limitation rather than an assumption, and WariX
reports `NAS100` as provider-unsupported rather than mapping it to a
lookalike index.

**Spot FX rows carry no `volume` field at all.** Not zero, not null — the key is
simply absent; a row is exactly `datetime, open, high, low, close`. The earlier
`volume: false` decision was reasoned from the absence of documentation; it is
now verified from the wire. Nothing is invented to fill it.

**`4h` bars are not UTC-epoch aligned and are therefore not used.** This is the
defect the probe caught. Twelve Data's FX four-hour bars open at 01:00, 05:00,
09:00, 13:00, 17:00 and 21:00 UTC — anchored to the New York session. Roughly
half the year that offset coincides with `bucketStartSeconds` and the rest of
the year it does not, so accepting them produces a series that is silently holed
for months at a time. WariX's canonical validation gate rejected 72 bars per
page rather than storing them, which is precisely what it exists for. `4h` is
now derived from complete genuine `1h` bars, which *are* epoch-aligned at this
vendor. `1D`, `1W` and `1M` were each verified aligned to UTC midnight, ISO
Monday and calendar month-start respectively, with zero rejections.

Measured cold-start depth for `EURUSD` on one Basic key:

```text
1m    1500 bars   2026-08-20 → 2026-08-21     provider_history
3m    1000 bars   2026-08-19 → 2026-08-21     derived from 1m
5m    1500 bars   2026-08-16 → 2026-08-21     provider_history
15m   1200 bars   2026-08-09 → 2026-08-21     provider_history
30m   1000 bars   2026-08-01 → 2026-08-21     provider_history
1h    1200 bars   2026-07-03 → 2026-08-21     provider_history
4h    1000 bars   2026-03-08 → 2026-08-21     derived from 1h
1D    2000 bars   2019-04-25 → 2026-08-22     provider_history
1W     520 bars   2016-09-05 → 2026-08-17     provider_history
1M     240 bars   2006-09-01 → 2026-08-01     provider_history
```

Two limits must still be stated rather than hidden:

1. **Indices need a paid plan.** `NDX` requires Grow or Venture. On a Basic key
   WariX reports `NAS100` as provider-unsupported rather than substituting a
   similar instrument.
2. **The Basic plan is documented as internal non-display usage.** Grow adds
   *internal* display access. A customer-facing WariX chart is external display.
   `LEGAL_REVIEW_REQUIRED` — a commercial plan almost certainly applies before
   WariX shows this data to a funded-account customer.

### OANDA v20 — selected as development / staging source

Technically the strongest candidate in this evaluation. From OANDA's own
published OpenAPI specification (`v20_instrument.json`, v3.0.25),
`GET /v3/instruments/{instrument}/candles` supports granularities
`S5 S10 S15 S30 M1 M2 M4 M5 M10 M15 M30 H1 H2 H3 H4 H6 H8 H12 D W M`, a `count`
of up to 5000, `from`/`to` RFC3339 or Unix time-range pagination, `price` in any
combination of mid/bid/ask, and `includeFirst` — a parameter that exists
precisely so a caller can page forward from the last completed candle without
re-receiving it. Candles carry a `complete` flag separating a forming candle
from a closed one, and `volume` is honest tick volume rather than exchange
volume. `dailyAlignment` / `alignmentTimezone` / `weeklyAlignment` make the
`1D` and `1W` boundary question explicit rather than implicit: WariX pins them
to UTC alignment to match `bucketStartSeconds`.

Coverage includes `EUR_USD`, `GBP_USD`, `USD_JPY`, `XAU_USD` and `NAS100_USD`
— every WariX symbol, on a **free practice account** whose personal access
token does not expire unless revoked, at 120 requests/second.

It is nevertheless **not** the production selection. OANDA's API License
Agreement prohibits transmitting, publishing, disseminating, duplicating,
displaying or otherwise providing FXTrade rates to any third party, and permits
internal use only. A prop-firm workstation showing those candles to its
customers is third-party display. `LEGAL_REVIEW_REQUIRED`, and the plain
reading is unfavourable. WX3 therefore wires OANDA as a full-coverage
development and staging source under a source identity that can never be
confused with a production one, and
`assertOandaEnvironmentAllowed` refuses to construct it at all under
`APP_ENV=production`.

**Runtime status: blocked by infrastructure, not by credential.** A practice
token was issued and the adapter was pointed at
`https://api-fxpractice.oanda.com`. Every `/v3/*` request returned HTTP 520 —
a Cloudflare origin error — including `GET /v3/accounts` **with no
`Authorization` header at all**, which rules out the token, the request shape
and the adapter as causes. The same request against `api-fxtrade.oanda.com`
returned a well-formed `401 {"errorMessage":"Insufficient authorization..."}`,
proving the client, the network path and the TLS handshake all work and that it
is specifically the practice origin that is unreachable from this environment.
The live host was not used: it serves real-money account data and the licensing
decision above confines OANDA to non-production regardless.

```text
OANDA_RUNTIME_STATUS = blocked_by_infrastructure
OANDA_PRACTICE_HOST  = api-fxpractice.oanda.com → HTTP 520 (unauthenticated too)
OANDA_LIVE_HOST      = api-fxtrade.oanda.com → HTTP 401 JSON (host healthy)
```

The adapter is therefore shipped complete, unit-tested against its documented
wire format, and honestly marked as never having executed against the live
service. It must not be reported as verified until that probe succeeds.

### Massive (formerly Polygon.io) — rejected for now

Genuine institutional FX coverage with tick and aggregate history, 1000+ pairs,
and a documented aggregates endpoint. Rejected only because the company
rebranded from Polygon.io in early 2026 and current plan pricing, FX-specific
tier boundaries and display terms could not be confirmed from a primary source
during this evaluation. Worth revisiting when WariX needs institutional depth
or genuine tick data; the WX3 provider abstraction makes adding it a new adapter
rather than a rewrite.

### FCS — rejected as a historical source

The existing `FcsMarketDataProvider` is a quote WebSocket adapter whose own
source comment states its wire protocol is unverified because no key ever
existed to test against. It advertises `historicalBars: false`. WX3 does not
promote an unverified quote adapter into a historical authority. FCS remains
exactly what it is until a credential-backed protocol test closes DATA-011.

### Tiingo, Finnhub, EODHD — held or rejected

Tiingo offers 30+ years of FX across 140+ pairs with REST and WebSocket and
intraday `resampleFreq` resampling, and is a credible reserve. Its licensing is
explicitly not a blanket redistribution grant. Finnhub is rejected because FX
candle access is restricted on the tiers relevant here. EODHD documents 1-minute
and 5-minute intraday history and is a credible reserve, with a shallower
intraday window than Twelve Data. None of the three adds coverage that Twelve
Data plus OANDA does not already provide for WX3's scope.

### Dukascopy-derived — rejected

A free historical tick archive, not an API product, with no supported service
contract and licensing that is unclear for commercial display. Not appropriate
as the market-data foundation of a platform intended to carry funded accounts.

## Decision

```text
PRIMARY_PROVIDER    = twelve-data
HISTORICAL_PROVIDER = twelve-data          (production candidate)
                      oanda-practice       (development / staging, full symbol coverage)
REALTIME_PROVIDER   = unchanged for WX3 (mock | replay | fcs as configured)
```

`RATIONALE` — Twelve Data is the only evaluated provider that can plausibly
carry WariX's full instrument set for both history and realtime under a single
coherent symbol and market-data model, at a cost that is knowable in advance,
with a free tier real enough to develop against. It is selected as the
production historical provider subject to a commercial plan for external
display.

OANDA is selected alongside it, not instead of it, for one honest reason: it is
the only source in this evaluation that can exercise `XAUUSD` and `NAS100`
without a paid subscription, and WX3 must not ship metal and index code paths
that have never executed against real data. It is confined to non-production
source identities by its own licence.

Realtime is deliberately left on the existing configured provider. WX3 is a
historical-depth phase; moving the realtime feed at the same time would change
two sources at once and make the historical/realtime seam unmeasurable.

## Cutover contract (two sources present)

Because history and realtime can come from different providers, the seam is
explicit rather than implied. It is specified in
`WARIX_WX3_PRODUCTION_MARKET_DATA.md` and enforced by source identity: bars
from different source identities are never spliced into one series, and a chart
generation validates the source identity of every response it accepts. There is
no hidden provider seam because there is no cross-source concatenation at all.

## Licensing and commercial flags

```text
LEGAL_REVIEW_REQUIRED — Twelve Data Basic is documented as internal non-display
                        usage. A customer-facing WariX chart is external
                        display and is not covered by the free tier.
LEGAL_REVIEW_REQUIRED — Twelve Data Grow grants internal display access.
                        Whether external customer display requires Pro,
                        Business or Enterprise must be confirmed with the
                        provider in writing before capital réel.
LEGAL_REVIEW_REQUIRED — OANDA's API License Agreement prohibits third-party
                        display and redistribution of FXTrade rates without
                        written permission. WX3 confines OANDA to development
                        and staging source identities on that basis. It must
                        not be promoted to a production source without an
                        explicit written licence from OANDA.
LEGAL_REVIEW_REQUIRED — Index CFD data (NAS100) may carry separate exchange
                        licensing obligations independent of the API contract.
UNVERIFIED            — Twelve Data spot-FX volume semantics. Stored as absent
                        rather than presented with unknown meaning.
```

No legal conclusion is drawn here. These are flags for a human with the
authority to accept them.

## Known limitations carried into WX3

- `NAS100` has no historical data on a Twelve Data Basic key. The correct ticker
  is `NDX` and it requires Grow or Venture. WariX reports the symbol as
  provider-unsupported rather than mapping it to a similar index.
- `XAUUSD` **is** available on Basic — runtime-verified, and mapped.
- Twelve Data publishes no volume for spot FX. `volume: false` is verified from
  the wire, not assumed, and nothing is stored for it.
- Twelve Data's `4h` is anchored to the New York session, so WariX derives `4h`
  from `1h` instead. `3m` has no native bar at either vendor and is derived from
  `1m`. Both are recorded with `origin = 'derived'` in the durable cache.
- Twelve Data documents no opaque pagination cursor; deep history is walked by
  descending time windows, which costs one credit per window.
- Neither selected provider offers order-book depth. `depth: false` remains
  correct and WX3 does not attempt to synthesise it.
- Twelve Data Basic allows 800 credits/day and 8/minute. A full cold backfill is
  bounded by `INITIAL_HISTORY_DEPTH_BARS` and `MAX_PROVIDER_REQUESTS_PER_BACKFILL`;
  a ten-timeframe cold start for one symbol measured 11 provider requests.
- Intraday depth is shallower than the daily archive — `1m` reaches roughly one
  day back, `5m` roughly five days — because the vendor's intraday retention is
  bounded. Deeper intraday history is a paid-tier question, not a WariX one.
- OANDA has never executed against its live service from this environment; its
  practice host returns HTTP 520 even unauthenticated. Its capabilities remain
  documentation-derived and must not be reported as verified.
- Calendar-boundary alignment is a provider setting, not an assumption. WX3
  validates every returned bar against `bucketStartSeconds` and rejects
  misaligned bars rather than trusting the interval label — which is exactly how
  the `4h` defect above was caught.

## Sources

- Twelve Data API documentation — https://twelvedata.com/docs
- Twelve Data individual pricing — https://twelvedata.com/pricing
- Twelve Data forex coverage — https://twelvedata.com/forex
- Twelve Data credits support article — https://support.twelvedata.com/en/articles/5615854-credits
- OANDA v20 OpenAPI specification — https://github.com/oanda/v20-openapi/blob/master/json/separate/v20_instrument.json
- OANDA v20 developer documentation — https://developer.oanda.com/rest-live-v20/introduction/
- OANDA API License Agreement — https://www.oanda.com/assets/documents/714/API_License_Agreement_OAP.pdf
- Tiingo forex documentation — https://www.tiingo.com/documentation/forex
- EODHD API — https://eodhd.com/
