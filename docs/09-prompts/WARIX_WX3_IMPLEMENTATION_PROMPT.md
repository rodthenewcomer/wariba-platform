# WariX WX3 — Production Market Data & Deep Historical Coverage

## Governing amendment

This repository copy normalizes the authorized WX3 implementation prompt. WX1
(visual workstation) and WX2 (chart market-data architecture) are **closed** and
are not reopened by this phase. The professional interval family is unchanged:

```text
1m  3m  5m  15m  30m  1h  4h  1D  1W  1M
```

`5m` remains the default. `1m` is one minute and `1M` is one calendar month;
where a flag name could confuse the two, the calendar one is written
`TIMEFRAME_1M_CALENDAR`.

## Mission

WariX must open a chart and immediately display genuine historical market data
instead of waiting for its own local observation cache to accumulate. Scrolling
left must retrieve older real data. A restart must preserve what was fetched.
Realtime must attach cleanly, or explicitly refuse to attach.

Nothing may be fabricated to make the chart look full.

This is a market-data, backend and data-pipeline phase. It is not a UI redesign.

## Frozen surfaces

No change to the desktop or mobile shell, rails, destination glyphs, toolbar,
timeframe treatment, indicators UI, preferences, Market Navigator, Execution
Center, activity dock, watermark, price plate, crosshair, chart typography or
colours, drawer and rail materials, SL/TP chip language, position chips,
execution markers, toasts, feedback cards or the accepted motion system.

Minimal wiring to expose truthful data states is permitted. In this phase that
was two `data-*` evidence anchors on the existing history status element and one
field on the history snapshot. Neither renders anything.

## Frozen semantics

No change to Buy/Sell execution, the risk engine, PMJ, PM, DLL/MLL, payout and
evaluation rules, account logic, position P&L, SL/TP side semantics, protection
geometry, order validation, server-authoritative execution, trading session
state, or existing realtime quote semantics.

## Non-negotiable rules applied

1. **No fabricated candles.** Not to fill a gap, not to make a screenshot look
   better, not to reach a bar count.
2. **A capability is true only if documented or probed.** Runtime probe results
   override documentation, and the correction is stated rather than quietly
   applied.
3. **Reject, never repair.** Invalid provider OHLC is quarantined and counted.
4. **Source identity partitions the cache.** Bars from different identities are
   never spliced.
5. **No hidden seam.** When history and ticks come from different vendors, the
   cutover is decided by the server, verified against prices, and stated on the
   wire.
6. **Credentials never enter the repository, a log, a client bundle, or a
   `NEXT_PUBLIC_` variable.**
7. **Derived bars only from complete genuine lower-timeframe data**, with
   provenance recorded.
8. **Historical failure never blocks execution.**

## Implementation order followed

```text
Slice A   provider evaluation → adapter → normalization → DB → EURUSD 5m
Slice B   left pagination against real data
Slice C   1D depth
Slice D   calendar intervals and derived aggregation
Slice E   restart continuity and idempotency
Slice F   mobile
```

## Deliverables

- `docs/06-engineering/WARIX_WX3_PROVIDER_EVALUATION.md` — decision matrix,
  runtime probe results, licensing flags.
- `docs/06-engineering/WARIX_WX3_PRODUCTION_MARKET_DATA.md` — architecture.
- `packages/adapters/src/historical-market-data-provider.ts` — the port.
- `packages/adapters/src/twelve-data-historical-provider.ts` — production
  candidate adapter.
- `packages/adapters/src/oanda-historical-provider.ts` — development adapter,
  refused under `APP_ENV=production` by its own licence.
- `services/realtime/src/market-history-backfill.ts` — orchestrator.
- `services/realtime/src/market-history-aggregation.ts` — derived intervals.
- `services/realtime/src/market-history-gaps.ts` — session-aware classification.
- `services/realtime/src/market-history-depth.ts` — the one depth table.
- `services/realtime/src/market-history-rate-limiter.ts` — pacing and retry.
- `services/realtime/src/provider-market-history-store.ts` — the port the chart
  reads, and the cutover decision.
- `packages/database/src/market-history-coverage.ts` — provider bar persistence,
  coverage, advisory lock.
- `supabase/migrations/20260821231500_wx3_provider_history.sql` — additive.
- `services/realtime/scripts/wx3-history-probe.ts` — the capability probe.

## Testing posture

Focused tests during iteration, not repeated whole-repository certification.
Unit coverage for symbol mapping, capability mapping, response normalization,
OHLC validation, cursor handling, overlap dedupe, idempotent upsert, derived
boundaries, incomplete-bucket rejection, calendar boundaries, gap
classification, repair ranges, source identity and retry classification. One
database integration test against a genuine provider. One targeted end-to-end
workflow. The full certification belongs to a later roadmap phase.

## Stop condition

After implementation and evidence, stop. Do not begin Trader Hub, WX4, or any
redesign. Wait for human review.

```text
WX3_VISUAL_ACCEPTANCE = pending_human_review
```
