# WariX Workstation 2026 — W3: market history, candle hydration & live stitching

Branch `feat/warix-workstation-2026-w3`, from `main` @ `b116ea0` (the W2
merge).

**Status: Phase A complete — decision gate reached, implementation not
started.** W3 §4 requires the audit result and a storage-mode decision to be
written before any history implementation. This document is that gate.

---

## 1. PHASE A — FORENSIC AUDIT (merged main)

Every claim below is from the code on `b116ea0`, not from documentation.

### A. Current realtime source

`services/realtime/src/index.ts:33` loads symbol specs, then
`createMarketDataProvider` (`services/realtime/src/market.ts`) selects a
provider from `MARKET_DATA_PROVIDER`. Local and CI run `mock`.

Ticks are produced **in process** by `MockMarketDataProvider`
(`packages/adapters/src/market-data-provider.ts:79`) on a `setInterval` and
fanned out in `services/realtime/src/websocket.ts:261`:

```
provider.subscribe(all symbols) → MarketTickGate.evaluate → broadcast to market.symbol.<SYM>
```

`MarketTickGate` (`services/realtime/src/tick-gate.ts`) is the **accepted-tick
authority**: it classifies each tick `accepted | duplicate | out_of_order |
not_open`, and only accepted ticks are broadcast.

```
CURRENT_REALTIME_SOURCE = MockMarketDataProvider (in-process, seeded walk),
                          selected by MARKET_DATA_PROVIDER; Replay and FCS
                          adapters also implement the same interface
```

### B. Current provider abstraction

One already exists and must be reused rather than duplicated:

`packages/adapters/src/market-data-provider.ts:30` —

```ts
interface MarketDataProvider {
  providerName; start(); stop();
  getSnapshot(symbol); getMarketStatus(symbol);
  subscribe(symbols, onTick): () => void;
}
```

Implementations: `MockMarketDataProvider`, `ReplayMarketDataProvider`,
`FcsMarketDataProvider`.

```
CURRENT_PROVIDER_ABSTRACTION = MarketDataProvider (packages/adapters) —
                               quote/stream only, no history method
```

### C. Current history capability

A repository-wide search for `candle|ohlc|bar|timeseries|historical|history`
across `packages/contracts`, `packages/adapters`, `services/realtime` and
`apps/web` returns **no market-history code at all**. The only `historical`
hits are `services/realtime/src/snapshot.ts:498`
(`app.account_daily_snapshots` — risk/program state, not market data) and an
unrelated comment in `packages/contracts/src/price-alerts.ts`.

`FcsMarketDataProvider` contains no history endpoint, no candle parsing and no
REST history call — it is a WebSocket quote client only.

```
CURRENT_HISTORY_SOURCE     = none
CURRENT_HISTORY_CAPABILITY = unavailable
```

### D. Simulator reconstruction capability — **unavailable as built**

This is the finding that decides W3's storage mode, so it is worth stating
precisely.

`MockMarketDataProvider` *is* deterministic in one sense: `mulberry32(hash(seed,
symbol))` means a given (seed, symbol) always yields the same **sequence of
steps**. But the price is a function of **step count**, not of time:

- `tick()` mutates `s.mid` by one step and increments `s.sequence`;
- `s.lastTimestamp = now.toISOString()` — wall clock **at emission**;
- nothing maps a timestamp back to a step index.

So the walk is reproducible from step 0 forward, but there is no
`price(symbol, t)` function. Two server runs produce different
time→price mappings, and a timestamp before process start has no price at all.

Reconstruction could be *made* possible by deriving the step index from wall
time — but that changes how live prices are generated for the execution feed,
which is a market-source change outside W3's remit without explicit review.

```
CURRENT_SIMULATOR_RECONSTRUCTION_CAPABILITY = unavailable
  (deterministic per step-count, not per timestamp; no time→price function)
```

### E. Candle price basis

`apps/web/app/(trade)/trade/TradeChart.tsx:409`:

```ts
const mid = (Number(tick.bid) + Number(tick.ask)) / 2;
```

Mid, computed **in the browser, in binary floating point**, from the accepted
tick's decimal-string bid/ask. Fill markers separately use `Number(tick.bid)`
(`:430`), and the context menu recomputes mid to `spec.pricePrecision`
(`:1092`).

```
CANDLE_PRICE_BASIS = MID = (bid + ask) / 2, float, browser-side
```

Any history source must produce the *same* basis, or the series is not
homogeneous (W3 §25).

### F. Bucket semantics

`TradeChart.tsx:128`:

```ts
bucketStart(unixSeconds, tf) = Math.floor(unixSeconds / tf) * tf
```

Epoch-aligned, therefore UTC-aligned with no local-time dependence, and
**left-inclusive**: a tick at exactly `10:00:30.000` with `tf = 30` floors to
`10:00:30`, i.e. it opens the new bucket rather than closing the previous one.
Sub-second precision is discarded before bucketing
(`Math.floor(ms / 1000)`).

```
CURRENT_BUCKET_ALIGNMENT = floor(unixSeconds / tf) * tf — UTC epoch-aligned,
                           left-inclusive, second resolution
```

### G. Tick delivery guarantee — **the correctness blocker**

The live candle is built inside a React effect keyed on the `tick` **prop**:

```
tick-store (imperative) → useTick / useSyncExternalStore → ChartWorkspace render
  → TradeChart `tick` prop → useEffect → candle update
```

`useSyncExternalStore` re-reads the *latest* snapshot. If two accepted ticks
land in one React batch, the component renders once with the second, the
effect runs once, and the first tick's contribution to **high/low is silently
lost**. Nothing in this path guarantees per-tick observation.

The store does expose an imperative `subscribe(symbol, listener)`
(`tick-store.ts`), so the fix is available without new infrastructure — but as
merged, the invariant does not hold.

```
LIVE_CANDLE_OBSERVES_EVERY_TICK = false   ← must be fixed before any
                                            production-quality stitching
LIVE_CHART_TICK_SOURCE          = tick-store, fed only by accepted ticks
                                  (MarketTickGate filters upstream)
```

---

## 2. DECISION GATE — storage mode

```
MARKET_HISTORY_STORAGE_MODE = MEMORY_CACHE
                              (server-side, in the realtime process)
```

**Why not the alternatives.**

| Mode | Verdict |
|---|---|
| `PROVIDER_DIRECT` | No provider history exists. The FCS adapter is a quote WebSocket with no candle endpoint, and no real provider is configured or certified (W3 §48). |
| `SIMULATOR_RECONSTRUCTION` | Impossible as built — §1.D. Would require making the simulator a pure function of time, changing live price generation for the execution feed. |
| `DATABASE_PERSISTENCE` | Not authorised. W0 reserved this for human approval, and it is **not required** to satisfy W3's acceptance criteria. |
| `UNAVAILABLE` | Would be untrue: the server already observes every accepted tick for every symbol. |

**Why MEMORY_CACHE is truthful and sufficient.** `websocket.ts:261` already
receives every accepted tick for all five symbols in a long-lived process.
Aggregating finalized candles there produces **genuinely observed** market
history — not reconstruction, not interpolation — from exactly the same
accepted-tick stream the execution path uses, so the price basis is compatible
by construction. It requires no migration, no provider credentials, and no
second market-data stack.

**Its honest limitation, stated up front:** history depth is bounded by the
realtime process's uptime. A freshly started server has no history until it has
observed ticks, and history is lost on restart. That is a real product
limitation, and it is exactly the gap durable persistence would close.

```
W3_DATABASE_PERSISTENCE_RECOMMENDED = true (as a FUTURE milestone, not now)
```

Recommendation for a later, separately-approved decision — recorded here so the
gap is visible, **not** implemented in W3:

- *Why*: survive realtime restarts and deploys; provide depth beyond process
  uptime; enable indicators (W5) that need more bars than uptime provides.
- *Schema concept*: one narrow append-only table keyed
  `(symbol, timeframe, bucket_start)` with decimal OHLC and a source column;
  no volume unless a source genuinely provides one.
- *Retention*: bounded per timeframe (e.g. 5s far shorter than 1m); a retention
  job, not unbounded growth.
- *Write path*: the realtime leader only, reusing the existing leadership /
  fencing so two nodes cannot double-write.
- *Volume*: 5 symbols × 3 timeframes; at 1 tick/s the 5s series is ~17k
  rows/day/symbol — small, but the retention policy is what keeps it small.
- *Licensing*: storing a real provider's history is a licensing question, not
  only a technical one. Must be answered before a real provider is wired.
- *Operational*: backfill on restart, gap detection, and a defined answer for
  "what does the chart show for a period the server was down".

---

## 3. WHAT THIS MEANS FOR W3 SCOPE

With the mode chosen, the remaining W3 work is well-defined and unblocked:

1. **Fix `LIVE_CANDLE_OBSERVES_EVERY_TICK`** — move live aggregation onto the
   store's imperative per-tick subscription. This is a prerequisite, not a
   nicety: stitching authoritative history onto a live candle that can lose
   highs is not worth doing.
2. **One canonical candle aggregator + bucket function**, shared by server
   aggregation, history validation and live aggregation (W3 §24).
3. **`MarketHistoryPort`** at the adapters boundary, with the server-side
   memory aggregator as its first implementation and a deterministic fake for
   tests (§63).
4. **Server-mediated transport** over the existing `RealtimeClient` message
   conventions — authenticated, bounded, symbol/timeframe validated,
   request-correlated, read-only.
5. **Canonical candle DTO** with decimal-string OHLC, `priceBasis`,
   `historyThrough`, converted to `number` only at the Lightweight Charts
   boundary.
6. **Buffer-first cutover**: subscribe/buffer live → request history →
   validate → `setData` once → replay buffered ticks past the boundary →
   incremental `update`.
7. **Generation-keyed requests** so late symbol/timeframe responses are
   ignored.
8. **Failure isolation**: history failure never blocks execution, never feeds
   any trigger engine.

<!-- Sections 4+ (port, transport, DTO, race protocol, merge rules, tests,
     evidence) are written as each is implemented. -->
