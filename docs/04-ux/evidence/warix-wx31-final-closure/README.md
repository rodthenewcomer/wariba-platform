# WariX WX3.1 — final market-data closure evidence

Captured: 2026-08-22 · Branch `feat/warix-workstation-2026-wx3-production-history`

Producer: `apps/web/tests/e2e/warix-wx31-closure.spec.ts`
via `apps/web/playwright.wx31-closure.config.ts`

## Run configuration

```text
MARKET_HISTORY_PROVIDER = twelve-data   history archive
MARKET_DATA_PROVIDER    = twelve-data   quotes — same vendor, so the cutover can attach
MARKET_HISTORY_CUTOVER  = verified      the price check decides, no widened tolerance
MARKET_HISTORY_DISPLAY_RIGHTS = unknown
history source  = twelve-data:production:history-v1-map-e6d7f50d
realtime source = twelve-data:production:quotes-v1-map-1a65473f
```

## 1 — The intraday anomaly: `01` and `02`

**Root cause: the provider genuinely publishes those values, at a time when the
market is shut.** Median 1m EURUSD range is 1.00 pip before 21:00 UTC on Friday
and 3.40 pips after, with individual bars reaching 16.5, and Twelve Data keeps
emitting minute bars through Saturday morning. 21:00 UTC in August is 17:00 in
New York: the weekly close. Thin post-close liquidity is what those wicks are.

A standing integration test now asserts stored OHLC equals published OHLC digit
for digit, so this can never be reattributed to a normalization or
serialization defect without that test failing first.

What was wrong was WariX's own inconsistency: it drew those bars as ordinary
history while its gap classifier simultaneously called that window closed. Bars
are now classified at write time and the default visible series is
regular-session data. Measured on the live cache:

```text
1m    1192 regular   314 out_of_session
5m    1437 regular    65 out_of_session
1D    1941 regular    60 out_of_session   (Saturday daily bars)
4h     745 regular   255 out_of_session
1W/1M     all regular
```

Image `01` shows `1m` running 14:30 → 21:00 UTC with ordinary candle geometry.
No price was rewritten and no row was deleted; the out-of-session rows remain
cached with their classification.

## 2 — The attached cutover: `03`

`manifest-cutover.json`:

```text
timeframe             5m
candles               800
realtimeContinuation  attached
gaps                  0
```

Both sources are Twelve Data quoting EURUSD, the measured divergence is inside
tolerance, and the server permits the continuation. The tolerance was not
changed to get here — the previous refusal is still reproduced by a regression
test at the 717 bps the sandbox feed actually produced.

The positive path exposed a real defect on its first run. A provider archive
includes the bucket that is still forming, so on `1D`/`1W`/`1M` the newest row
and the live candle occupied the same timestamp and the client refused the
whole window with *"Historique indisponible"*. The in-progress bucket now
belongs to the live series and the provider's partial row is withheld from the
finalized window — cached, not deleted, and authoritative again once the bucket
closes.

**Caveat.** The `bidAsk` capability of the quote adapter is `false`. Twelve
Data's Basic plan publishes one price; bid and ask are WariX's own configured
dealing spread applied around a genuine mid, exactly as the sandbox provider
already works. The price *level* is real; the spread is simulated.

## 3 — Reconnect gap repair: no screenshot, and why

`manifest-gap-repair.json` carries the measurement. A simulated outage was
created by deleting rows that had genuinely been fetched and moving coverage
back to match — nothing was injected — and the service was restarted:

```text
before restart   1040 bars, newest 2026-08-20T12:00Z
after restart    1440 bars, newest 2026-08-22T02:35Z
events           history.gap.detected   missingBars=400
                 history.gap.repaired   barsWritten=400 providerRequests=1
```

An earlier restart at 02:36 UTC on a Saturday measured a range lying entirely
inside the weekend closure and declined all twenty series — the guard working,
not a failure.

`04` and `05` are **omitted deliberately**. The chart's own cold-start path
fetches missing depth on the first request, so it closes the hole before any
screenshot can be taken. Photographing a gap would have required disabling that
path — turning off a real safety net to produce evidence — which is worse than
having one fewer image. The repair is proved by the numbers above and by ten
unit tests, including the regression that made the first wired attempt a no-op:
a repair must ask the provider even when the cache holds plenty of *older* bars.

## 4 — EURUSD historical boundary: `06`

`manifest-boundary.json`:

```text
oldest visible bar   2003-12-01     (> 1999-01-04, the euro's first trading day)
candles              272
continuation         attached
```

The vendor's archive reaches 1984. Those rows are still cached, recorded as
`history_provenance = 'synthetic_prehistory'`, and are simply not part of the
default visible series. The rule lives in `packages/contracts/src/instrument-history.ts`,
not in the chart.

## 5 — Display rights

Startup emits the assessment. In this local run:

```text
history.display_license.development_only
  displayRights: unknown
  status: requires_human_commercial_clearance
  customerFacing: false
```

In a customer-facing environment the same condition logs at **error** level. It
blocks nothing — coupling market-data licensing to execution would turn a
commercial question into an outage — and it draws no legal conclusion.

## 7 — Mobile

`07-mobile-history-regression.png`, 390×844: same port, same durable rows, same
source epoch. No mobile-specific dataset.

## Not captured

- `05-after-gap-repair.png` — see section 3.
- No motion clips: WX3.1 changed no visual or motion surface.
