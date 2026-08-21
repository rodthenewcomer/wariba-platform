# WariX WX2 market-data evidence

Captured: 2026-08-21

Viewport baselines: 1440×900 and 390×844

Source: `mock:sandbox:seed-20260804:v1` (explicit sandbox mode)

These are engineering screenshots of observed, persisted sandbox ticks. No
historical candles, volume or depth were synthesized for evidence.

## Captures

- `01-1440-5m-live.png` — durable observed 5m chart and complete interval row.
- `02-1440-1h-live.png` — 1h selection with the same mounted workstation.
- `03-1440-1d-live.png` — UTC daily bucket.
- `04-1440-1w-live.png` — ISO-week bucket.
- `05-1440-1m-live.png` — UTC calendar-month bucket (`1M`).
- `07-1440-reconnect-recovered.png` — live feed recovered after a realtime
  process restart; the existing chart-local status also exposes one genuinely
  unrepairable observation gap rather than hiding it.
- `08-1440-markets-drawer-chart-preserved.png` — Markets drawer open while the
  chart, interval and history remain mounted.
- `09-390-5m-live.png` — 390px chart-first workstation.
- `10-390-timeframe-selector.png` — compact overflow exposes the remaining
  professional intervals and visually distinguishes `1m` from `1M`.
- `11-390-history-after-left-navigation.png` — loaded observed 1m history after
  chart navigation at 390px.

## Intentionally unavailable evidence

`06-1440-history-paginated-left.png` is not present. The verified providers do
not expose native historical bars and this was a freshly initialized durable
cache, so producing a server page older than the 400-bar initial window would
have required fabricated candles. The automatic pagination and viewport shift
are covered by targeted controller/component tests; rendered pagination
evidence must wait for enough genuine observations or a verified historical
provider.

The reconnect capture proves restart continuity and gap visibility, not native
gap repair. With `historicalBars=false`, WariX cannot truthfully reconstruct a
period during which no source process observed ticks.
