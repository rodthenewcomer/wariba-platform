# WariX WX3 — production history evidence

Captured: 2026-08-21/22 · Branch `feat/warix-workstation-2026-wx3-production-history`

Producer: `apps/web/tests/e2e/warix-wx3-history.spec.ts`
via `apps/web/playwright.wx3-history.config.ts`

## What these images are

Real EURUSD market history, fetched from Twelve Data at runtime, persisted to
PostgreSQL, and served to the mounted WariX chart over the existing WebSocket
history contract.

Nothing here is seeded. No candle was constructed in Playwright, injected into
local state, or written to the database by the test. Every number below was read
off the product's own `data-*` surface during the run and written into the
manifests next to these images; none of it is asserted by hand.

## Run configuration

```text
MARKET_HISTORY_PROVIDER = twelve-data          (Basic plan key)
MARKET_DATA_PROVIDER    = mock                 (unchanged — WX3 does not move the tick feed)
MARKET_HISTORY_CUTOVER  = verified
database                = local Supabase, migrations applied from empty
history source          = twelve-data:production:history-v1-map-e6d7f50d
realtime source         = mock:sandbox:seed-20260804:v1
```

## The cutover reads `refused_price_divergence` everywhere, and that is correct

Every manifest entry records `realtimeContinuation: refused_price_divergence`.

That is the WX3 §12 contract doing its job, not a defect. History here is genuine
EURUSD around 1.1676; the configured tick feed is the sandbox generator walking
around 1.0845. The server measured the two **717.4 bps apart**, well outside the
50 bps tolerance, and refused to append live candles to the provider series.

So these charts show real history that simply stops at the last genuine bar
rather than continuing into a synthetic price. Execution, the price plate and
every risk control kept using the live feed throughout — historical-data
availability and execution availability are separate concerns and stay separate.

Pointing `MARKET_DATA_PROVIDER` at a feed that quotes the same market as the
archive is what turns this into `attached`.

## Desktop — 1440 × 900

| # | File | Timeframe | Candles | Range | Older available |
|---|---|---|---|---|---|
| 01 | `01-1440-1m-deep-history.png` | `1m` | 800 | 2026-08-21 → 2026-08-22 | yes |
| 02 | `02-1440-5m-deep-history.png` | `5m` | 400 | 2026-08-20 → 2026-08-22 | yes |
| 03 | `03-1440-1d-production-history.png` | `1D` | 400 | 2025-06-18 → 2026-08-22 | yes |
| 04 | `04-1440-1w-production-history.png` | `1W` | 400 | 2018-12-24 → 2026-08-17 | yes |
| 05 | `05-1440-1M-calendar-month-history.png` | `1M` (calendar month) | 400 | 1984-01-01 → 2026-08-01 | yes |

Image 05 is the **calendar month** interval, not one minute. It shows roughly
four decades of monthly structure — the 2008 peak near 1.60, the 2014 decline,
the 2022 approach to parity.

**Provider caveat on `1M`.** The archive extends back to 1984, before the euro
existed. Twelve Data serves a synthetic pre-1999 EUR/USD series derived from
legacy European currency baskets. That is the vendor's data, not a WariX
construction, and WariX stores it exactly as received — but it should not be
read as observed euro market history. Flagged rather than trimmed, because
silently truncating a provider's series is its own kind of dishonesty.

All bars in these windows carry `origin = 'provider_history'` except `3m` and
`4h`, which are `origin = 'derived'` (see the architecture document).

## Left pagination — `06` and `07`

`manifest-pagination.json`, measured on `1D`:

```text
                candles   oldest bar     newest bar    source epoch
before            800     2023-12-01     2026-08-20    twelve-data:…e6d7f50d
after            1200     2022-05-20     2026-08-20    twelve-data:…e6d7f50d
```

400 genuinely older bars were prepended and the left edge moved back roughly
eighteen months into real market history. The source epoch is identical across
the two samples, so the series was extended rather than resynchronised.

Viewport, read from the chart's own time scale:

```text
before   from 400.00  to 799.00     width 399.00
after    from 447.63  to 846.63     width 399.00
```

The window kept its width exactly and shifted position within the now-longer
series. It did not snap to the live edge, and `fitContent()` was not called.

## Chart continuity — `10`

`10-1440-markets-drawer-history-preserved.png` — the Market Navigator opened
over a hydrated `1D` chart. Source epoch and candle count were re-read after the
drawer opened and were unchanged, so the chart was not remounted.

## Mobile — 390 × 844

| # | File | Timeframe | Candles | Range |
|---|---|---|---|---|
| 11 | `11-390-5m-deep-history.png` | `5m` | 800 | 2026-08-19 → 2026-08-22 |
| 12 | `12-390-1d-history.png` | `1D` | 400 | 2025-06-18 → 2026-08-22 |
| 13 | `13-390-after-left-pagination.png` | `1D` after paging | 800 | 2023-12-01 → 2026-08-20 |

Same port, same durable rows, same source epoch as desktop. There is no
mobile-specific dataset and no lighter payload.

The mobile toolbar exposes `1m 3m 5m` as radios and moves the rest behind an
"Autres intervalles" overflow. That is the accepted WX1 mobile design; the test
adapts to it rather than asking for it to change.

## Gaps

The status chip reports holes that are genuinely missing data. Expected FX
weekly closures are classified separately and are not counted.

An earlier capture of image 03 read *"Historique incomplet · 29 lacunes
détectées"* on a daily series with no missing trading day, and image 07 read
*191*. Both were weekends: the daily rule was probing hourly and tripping over
the Sunday 22:00 reopen, and the browser was running its own timeframe-naive
counter alongside the server's. The classifier now lives in `@wariba/contracts`
so the server and the chart answer the same question the same way, and `1D`
reports `0`. Image 05 reports `1`, which is a genuine hole in the monthly
archive.

## Not captured

- `08` restart continuity and `09` reconnect gap repair are absent by design.
  Restart continuity is proved in
  `services/realtime/tests/market-history-backfill.integration.test.ts` against
  the live provider. Reconnect gap repair is **not** shipped wired: the range
  calculation exists and is unit-tested, but nothing calls it on reconnect, so
  there is nothing honest to photograph.
- No OANDA evidence exists. Its practice host returned HTTP 520 from this
  environment even unauthenticated, so the adapter has never executed against
  the live service.
