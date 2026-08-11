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

---

## 4. B1 — LOSSLESS TICK OBSERVATION & CANONICAL CANDLE SEMANTICS

Phase A's §1.G was the blocker: `LIVE_CANDLE_OBSERVES_EVERY_TICK = false`. There
is no point stitching authoritative history onto a live candle that can lose its
own highs, so this was fixed before any transport existed.

**The defect, precisely.** The shipped chart aggregated candles in a React effect
keyed on the `tick` prop. `useSyncExternalStore` re-reads the *latest* snapshot,
so two accepted ticks landing in one React batch produce one render, one effect
run, and the first tick's contribution to high/low disappears.
`apps/web/tests/tick-store-events.test.ts` demonstrates that on the render path,
then shows the event path preserving the true high and low over the same input —
and producing an identical candle whether the batch renders once or four times.

**The fix.** `TickStore.subscribeTickEvents(symbol, listener)` — every accepted
tick, delivered exactly once, with the tick itself. Deliberately imperative and
React-free: a tick reaching this listener reaches no component, so W1/W2 render
ownership is untouched.

**One canonical candle module**, `packages/contracts/src/market-candles.ts`,
because three implementations of "which candle does this tick belong to" is how a
history series and a live series quietly stop describing the same market:

| Concept | Semantics |
|---|---|
| `bucketStartSeconds` | `floor(unixSeconds / D) * D` — UTC epoch-aligned, **left-inclusive** (a tick exactly on a boundary opens the new candle), sub-second input floored because the feed carries second-resolution timestamps |
| `midPrice` | Decimal, rounded to the symbol's precision, returned as a decimal string. The shipped float version is what produced `1.0843699999999998` |
| `createCandleAggregator` | One aggregator for 5s/30s/1m. Finalizes a candle **only** when a later observation proves the stream entered a later bucket — never on a timer, never a flat filler |
| `seed` (added in B5) | Adopts an authoritative snapshot of the in-progress bucket, so hydration can restore a bucket's pre-mount open/high/low and let the next tick *extend* it |

```
W3_LOSSLESS_TICK_OBSERVATION_READY  = true
W3_CANONICAL_CANDLE_AGGREGATOR_READY = true
LIVE_CANDLE_OBSERVES_EVERY_TICK      = true   ← was false in Phase A
```

---

## 5. B2 — OBSERVED-MEMORY HISTORY STORE

### 5.1 The single observation boundary — the architecture rule

This is the rule that is invisible when it is wrong, so it is stated first.

`services/realtime/src/websocket.ts` → **`admitAndFanOutTick()`**

```
MarketDataProvider.subscribe(all symbols)   ← called ONCE for the whole process
        ↓
admitAndFanOutTick:
   MarketTickGate.evaluate            → accepted | duplicate | out_of_order | not_open
   if accepted: history.observeAcceptedTick(tick)      ← ONE observation
   registry.broadcast(market.symbol.X) → N connected sockets
        ↓
caller: queued reductions, SL/TP protection, pending orders, alerts
```

`admitAndFanOutTick` is an exported named function rather than an anonymous
closure specifically so this property is testable. Attaching aggregation
anywhere inside the fan-out — per connected client, per account subscriber, per
WebSocket send, per browser subscription — would look perfectly fine in a
browser until a second trader connects, at which point every tick is folded into
the candle twice and every bar's high/low/close depends on how many people
happen to be watching.

`services/realtime/tests/market-history-observation.test.ts` asserts a **count**,
not a shape: one accepted tick with 0, 1, 2, 5 and 20 connected clients produces
exactly one observation every time, and two stores driven with identical ticks
behind 1 and 12 clients produce byte-identical candles.

```
SERVER_HISTORY_OBSERVATION_POINT       = services/realtime/src/websocket.ts
                                         → admitAndFanOutTick()
SERVER_HISTORY_OBSERVATION_MULTIPLICITY = ONE_PER_ACCEPTED_TICK
SERVER_HISTORY_SINGLE_OBSERVATION       = PASS
```

**`accepted`, not merely "not rejected".** The broadcast below the observation
also carries `not_open` ticks so a chart can still show a stale market's last
price, but a stale or closed tick is not market history and must never open or
extend a candle. Tested.

### 5.2 Failure containment

History is display data. A throwing observer is logged
(`realtime.market_history_observe_failed`) and swallowed at the boundary, and the
gate decision still returns `accepted` so nothing downstream is skipped.
Everything after it runs identically: client fan-out, `executeQueuedReductions`,
`triggerPositionProtections`, `triggerPendingOrders`, `evaluateAlerts`. The
observation is synchronous, before the broadcast, and outside any transaction
execution depends on.

```
HISTORY_OBSERVER_FAILURE_EXECUTION_CONTINUES = PASS
```

### 5.3 Store shape

`MemoryMarketHistoryStore` (`services/realtime/src/market-history-store.ts`) —
**one instance per realtime process**, created in `index.ts` at startup. Not one
per WebSocket client, per trader or per account: a market price is market data,
not account-private data. What remains per-account is *authorization* (§7.2), not
storage.

Keyed `(symbol, timeframe)` over 5s/30s/1m — 15 keys for the five available
symbols. One accepted tick produces one canonical mid and feeds all three
aggregators. There is **no raw tick tape** (unbounded storage for data nothing
reads) and **no OHLC arithmetic of its own** — it reuses B1's contracts
aggregator, so a history bar and a live bar cannot drift apart.

### 5.4 Internal sequence metadata

```
StoredFinalizedCandle { candle, firstSequence, lastSequence }
current aggregate      { currentFirstSequence, currentLastSequence }
```

Deliberately **not** fields on the public `MarketCandle`: the candle is the
display contract, and adding transport bookkeeping to it would push a server
concern into every consumer.

### 5.5 `MARKET_TICK_SEQUENCE_SCOPE` — audited, not assumed

`MarketTick.sequence` is produced by the active provider, per symbol:

| Provider | `sequence` |
|---|---|
| `MockMarketDataProvider` | per-symbol counter from 0, `+1` per emitted tick |
| `ReplayMarketDataProvider` | per-symbol counter from 0, `+1` per emitted tick |
| `FcsMarketDataProvider` | `Date.now()` — **not contiguous**, and it can collide within one millisecond |

`MarketTickGate` then guarantees the **accepted** stream is *strictly increasing*
per symbol (equal → `duplicate`, lower sequence or older timestamp →
`out_of_order`, neither is broadcast).

```
MARKET_TICK_SEQUENCE_SCOPE =
  (provider instance, symbol) — strictly monotonic increasing within
  (sourceEpoch, symbol) for accepted ticks; NOT contiguous, NOT comparable
  across symbols, NOT comparable across provider instances or process restarts
```

Therefore only `>` comparisons are used anywhere in W3. `lastSequence + 1` is
never computed, and a test seeds `Date.now()`-shaped sequences to prove
contiguity is not relied on.

### 5.6 `sourceEpoch`

One opaque `randomUUID()`, generated when the store is constructed, i.e. once per
realtime process lifetime. It leaks no hostname, instance id or port. Its purpose
is to distinguish memory generations: a restart or a second realtime node yields
a different value, which is what stops a browser from splicing two unrelated
process memories into one continuous series.

```
HISTORY_SOURCE_EPOCH = PROCESS_LIFETIME_OPAQUE_ID
```

The pair `(sourceEpoch, sequence)` is the cutover namespace. Sequences from
different epochs are never compared as if they belonged to one uninterrupted
stream.

### 5.7 Retention & memory cost

```
SERVER_HISTORY_RETENTION_PER_SYMBOL_TIMEFRAME = 2000
```

Sized from the read side, not picked round. It is 5× `INITIAL_HISTORY_CANDLE_LIMIT`
(400), so a trader can page left five full pages at any timeframe and W5's
indicators have warm-up headroom, while a single request's ceiling
(`MAX_HISTORY_CANDLE_LIMIT` = 1000) can never drain a whole window.

**Cost at full occupancy** — the figure that matters for a small realtime box:

| | |
|---|---|
| Symbols | 5 |
| Timeframes | 3 |
| Keys | 15 |
| Candles per key | 2 000 |
| **Total candle entries** | **30 000** |
| Per entry | 1 wrapper object + 1 candle object + 4 short decimal strings + 3 numbers ≈ 250–300 B in V8 |
| **Worst case** | **≈ 9 MB**, reached only after hours of uptime |

What that retention *spans* at the mock provider's 1 tick/s: 5s ≈ 2.8 h,
30s ≈ 16.7 h, 1m ≈ 33 h of observation.

Doubling retention to 5 000 would buy ~7 h of 5s history — of little value on a
5-second chart — for ~22 MB. Not worth it.

### 5.8 Gaps are real

A finalized candle exists only after a later accepted tick proves a later bucket.
No timer finalization, no previous-close filler, no interpolation, no simulator
replay. An interval in which the process observed no accepted tick produces **no
candle**, and the chart shows that gap. The visual evidence (§11) contains a real
example: the backgrounded simulator process was suspended by the host for
~15 minutes, and the 1m chart shows the resulting hole rather than inventing
bars across it.

---

## 6. B3 — `MarketHistoryPort`, DTO & WATERMARKS

### 6.1 Placement

The port, the DTO and the validation live in **`packages/contracts/src/market-history.ts`**,
not in `packages/adapters` as §3 of this document originally sketched. Three
reasons, and the deviation is deliberate:

1. the response crosses the WebSocket, so it is a wire contract like every other
   message in `contracts`;
2. the candle semantics it is defined in terms of (bucket, mid basis, the one
   aggregator) already live next door in `market-candles.ts`;
3. `adapters` has no `@wariba/contracts` dependency, and spending a new package
   edge on a source that is **not an external adapter** would be misleading —
   W3's history is the realtime process's own observation of its own accepted
   ticks.

The single W3 implementation is therefore process-local and lives with the
process: `services/realtime/src/market-history-store.ts`.

`MarketHistoryPort` is deliberately **not** folded into `MarketDataProvider`.
Doing that would make every quote provider in `adapters` appear to offer
historical data, which none of them do.

### 6.2 The contract

```ts
interface MarketHistoryPort {
  readonly sourceEpoch: string;
  getCandles(query: { symbol; timeframe; limit; before? }): Promise<MarketHistoryWindow>;
}
```

`Promise`-returning even though the only implementation answers from memory
synchronously: a durable or provider-backed implementation would be async, the
callers are already async message handlers, so nothing is paid now and no
signature has to break later.

**Read-only by construction** — there is no write method on the type. Execution
code cannot reach for it to get a price, a trigger or a recovery decision.

### 6.3 The DTO

```
requestId, symbol, timeframe, source, sourceEpoch, priceBasis,
candles[], currentCandle, finalizedObservedThroughSequence,
currentCandleObservedThroughSequence, historyThrough, hasMore, nextCursor
```

Candle: `startTime` (bucket start, epoch seconds, UTC) + `open/high/low/close` as
**decimal strings**.

- Every field is present on the wire, `null` rather than absent when it has no
  value: `JSON.stringify` drops `undefined`, so an optional field and a missing
  field would be indistinguishable to the receiver. A stable shape is what lets
  the client validate exactly instead of defensively.
- **No `volume`, no trade count, no tick count.** None is observed, so none is
  invented. A test asserts an injected `volume` is stripped rather than passed
  through.

```
HISTORY_SOURCE_TYPE = OBSERVED_MEMORY_CACHE   (wire value: observed_memory_cache)
```

Never `provider_history`, `exchange_history` or `FCS_history`, because no such
source exists — `FcsMarketDataProvider` is a quote WebSocket with no candle
endpoint (Phase A §1.C). Tests reject those values at the schema.

### 6.4 `historyThrough` — metadata, not the cutover mechanism

```
historyThrough = newestFinalized.startTime + timeframeSeconds   (epoch seconds)
               = the instant the next bucket begins
               = null when no finalized candles were returned
```

It is the exclusive upper **time** boundary of the returned finalized window. It
does **not** claim the history is continuous up to that point — W3 permits
genuine gaps (§5.8). The exact live-replay mechanism is the sequence watermark
below, and both are documented as distinct on purpose.

### 6.5 Current-candle seed & the replay watermark

Historical arrays stay finalized-only. But process memory may already hold part
of the **current** bucket before a browser opened or reloaded, and that bucket's
true open — plus any high or low that happened pre-mount — cannot be recovered
from the first post-mount tick. So the response carries a separate
`currentCandle`, which is **not** part of `candles[]`:

```
HISTORICAL_CANDLES_FINALIZED_ONLY = true
CURRENT_CANDLE_SEED_ENABLED       = true
```

The seed is only ever attached to a **live-edge** request (`before` omitted); an
older page is pure finalized history, and attaching a moving bucket to it would
be meaningless.

```
replayAfterSequence =
    currentCandle !== null ? currentCandleObservedThroughSequence
                           : finalizedObservedThroughSequence

only buffered ticks with sequence > replayAfterSequence are replayed
null ⇒ the server represented nothing ⇒ replay the whole buffer
```

The seed already represents everything the finalized window represents plus more,
so when it is present it *is* the boundary.

### 6.6 Validation — rejects, never repairs

`validateHistoryWindow` rejects: misaligned bucket, duplicate timestamp,
non-ascending timestamp, invalid decimal, `high < low`, `high < open`,
`high < close`, `low > open`, `low > close`, more candles than requested, more
than the ceiling, `historyThrough` inconsistent with the newest bucket,
`nextCursor` that is not the oldest returned candle, a `currentCandle` at or
before the newest finalized bucket, and an incoherent `currentCandle`. It
accepts a genuine gap between finalized candles.

Nothing is repaired. A malformed window is a defect upstream, and silently
patching it would turn that defect into a chart the trader is entitled to
believe.

### 6.7 Pagination

`before` is an **exclusive** candle-start cursor in epoch seconds; the store
returns the newest `limit` retained finalized candles with `startTime < before`,
`nextCursor` = the oldest returned candle's `startTime`, and `hasMore` = true iff
older retained candles exist.

Pagination reaches only **what this process still retains**. When the oldest
retained candle is returned, `hasMore` is `false` even though the market plainly
existed before the process started. That is the honest answer, and it is stated
in the DTO's own doc comment.

```
HISTORY_PAGINATION_CONTRACT_READY  = true
AUTOMATIC_PAN_LEFT_BACKFILL_READY  = false   (no chart pan-left loading in W3)
```

---

## 7. B4 — AUTHENTICATED TRANSPORT

### 7.1 Messages

Over the existing realtime connection and the existing envelope — no second HTTP
provider endpoint, and the browser never calls a provider directly.

```
client → server : market_history_request  { requestId, symbol, timeframe, limit, before? }
server → client : market_history_result   { …DTO }
server → client : market_history_error    { requestId, code, message }
```

The request can name a symbol, a timeframe, a count and a cursor and **nothing
else** — no source, no provider URL, no provider parameters, no date SQL. A test
asserts injected `source`/`providerUrl`/`apiKey` fields are ignored and the
answer still says `observed_memory_cache`.

**Why a dedicated error message.** The existing generic `error` envelope carries
no `requestId`, so the chart could not tell which generation had failed and would
sit in `loading` forever. `market_history_error` is correlated by `requestId`,
which is also why the client message union accepts a *loose* request frame and
the handler does the strict validation: a request that fails validation must
still be answerable with its own id.

### 7.2 Authorization

Market history is global, so there is no foreign-account data to leak. What the
account still governs is **capability**: a connection may only request a symbol
present in the spec set it was actually served (`symbol in symbolSpecs`), so an
unavailable or future instrument stays unavailable. Timeframe ∈ {5s, 30s, 1m},
`1 ≤ limit ≤ 1000`, cursor a non-negative integer — all enforced by schema before
the port is touched.

### 7.3 Abuse control

Per-connection message processing is already serialized (`processingChain`), so
history requests can never run concurrently on one socket, and a memory read is
cheap. What needed bounding is a client looping history requests and spending the
shared 30-messages-per-10s budget that order handling, account snapshots and
subscribes also draw on. So history gets its own fixed window on the same
`ConnectionRegistry` pattern:

```
HISTORY_RATE_LIMIT = 6 requests / 10 s / connection   (shared limit: 30 / 10 s)
```

Six is far above any legitimate pattern — hydrate, switch symbol, switch
timeframe, page left — and refusal is correlated (`rate_limited`).

### 7.4 Limits

```
INITIAL_HISTORY_CANDLE_LIMIT = 400    (≈ 35 KB of JSON)
MAX_HISTORY_CANDLE_LIMIT     = 1000   (≈ 88 KB; half of retention)
```

---

## 8. B5/B6 — CLIENT HYDRATION, CUTOVER & RACES

### 8.1 Where it lives

`apps/web/app/(trade)/trade/chart-history.ts` — a chart-local state machine below
`TradeClient`, wired through `ChartWorkspace` into `TradeChart`. Nothing about
history lives in `WorkstationShell`, `NavRail`, `WorkstationStatusBar`,
`WorkstationAccountSwitcher`, dock chrome or Market Navigator chrome.

Deliberately imperative and React-free. The only thing React subscribes to is a
coarse status snapshot whose object identity is **stable while nothing changes**,
so a candle cannot re-render the workstation. `chart-history-transport.ts` adapts
the session's single `RealtimeClient` to a three-method port the controller can be
tested against.

States: `idle → loading → ready | empty | error`. Identity: symbol + timeframe +
generation + `sourceEpoch` once known.

### 8.2 The decommissioned path

`TradeChart` no longer holds `candlesRef`, a local `Candle` type or its own
`bucketStart`. There is exactly one aggregator in the repository. The component
still takes the `tick` prop — it is the *rendered* latest price for bid/ask lines,
overlays and the context menu — and it now also takes `store`, because those two
are not interchangeable; the prop's own doc comment says why.

```
LIVE_CHART_TICK_SOURCE = TICKSTORE_ACCEPTED_EVENT_STREAM
```

### 8.3 Hydration order — and why

```
1. attach imperative selected-symbol accepted-tick listener
2. create hydration generation
3. begin bounded live buffer
4. send market_history_request
5. keep buffering
6. receive response
7. verify requestId + symbol + timeframe + generation
8. validate payload
9. install finalized history, then the current-candle seed
10. replay only buffered ticks with sequence > watermark
11. clear buffer
12. continue imperative live aggregation
```

Subscribe-then-request is asserted directly by a test rather than trusted. Any
other order leaves a window in which an accepted tick is neither represented by
the response (it happened after the server built the window) nor in the buffer —
lost from the candle forever.

```
CLIENT_HISTORY_HYDRATION_TICK_BUFFER_MAX = 500
```

Unreachable in a healthy hydration (~1–2 ticks at 1 tick/s) and ~100 KB held.
On overflow the hydration **fails loudly** rather than silently discarding
accepted ticks to stay under the bound: a hydration that has not landed in 500
ticks is broken, not slow.

### 8.4 Cutover — proven, not asserted

Buffered ticks 100/101/102 against a server snapshot observed through 101 replay
**exactly 102** — not all three (which double-counts 100/101 into the high) and
not none (which loses the move). This is what makes same-second ticks safe: four
accepted ticks sharing one timestamp second cut over mid-second by sequence, and
all four contribute to high/low/close. Ticks are never deduplicated by timestamp.

The current-candle seed test is the reload case: server ticks 90/91/92 set the
bucket's open, high and low; live tick 93 arrives during hydration; the resulting
bar carries the open from 90, the high from 91, the low from 92 and the close from
93. The open is not re-derived from the first post-mount tick.

### 8.5 Races

A late response for a superseded generation does **nothing at all**: no
`setData`, no error, no viewport move, no buffer clear, no state mutation.
Showing a stale generation's error would be as wrong as showing its data.
Covered for symbol switches, timeframe switches (late 1m/30s cannot touch an
active 5s chart) and epoch changes.

### 8.6 Renderer boundary

`setData` once per hydration, `update` per accepted tick — never a whole series
per tick. `fitContent` once per symbol/timeframe identity, so live ticks never
drag a trader back to the latest candle after a manual pan or zoom, and a
reconnect rehydration does not move the viewport either.

Conversion to `number` happens in exactly one function, `toRendererCandle`, at
the lightweight-charts doorstep. No float becomes canonical history state.

```
CANDLE_PRICE_BASIS = HISTORY_PRICE_BASIS = LIVE_PRICE_BASIS = MID
HISTORY_LIVE_PRICE_BASIS_COMPATIBLE = true   (both call the same midPrice())
LIGHTWEIGHT_CHARTS_REPLACED = false
```

---

## 9. B7 — RECONNECT RECONCILIATION

The browser's own candles do not cover a disconnect: the server kept observing.
So a genuinely new socket triggers rehydration. `RealtimeClient.onSocketOpen`
exists for exactly this — `onStateChange` also emits `'open'` on every message
that advances a channel sequence, so a state listener could never tell a
reconnect from normal traffic.

### 9.1 Same `sourceEpoch`

Finalized candles observed during the disconnect are merged deterministically,
the current candle is replaced from the authoritative server seed, then
post-response buffered ticks replay. Identical repeats dedupe; no duplicate
timestamps; no double replay.

```
RECONNECT_HISTORY_GAP_BACKFILL = SUPPORTED_WITHIN_PROCESS_MEMORY_WINDOW
```

### 9.2 New `sourceEpoch`

```
SOURCE_EPOCH_CHANGE_POLICY = RESET_TO_NEW_SOURCE_TRUTH
```

The process-memory-derived series is discarded, the new source's truth is
installed, and the real temporal gap stays visible. No last-close fill, no
per-minute filling, no interpolation, no bars invented to bridge it, and no old
browser candles kept as if the new process had certified them.

Sequences are never compared across epochs. A test proves a restarted provider's
sequence 2 still replays against epoch B's watermark of 1 rather than being
discarded against epoch A's watermark of 5 000 000.

### 9.3 Merge conflict

Same bucket, different OHLC, one observed source ⇒ an integrity fault, not a
merge input. The local series is discarded and **one** controlled rehydrate is
issued from the same epoch; if the conflict repeats, the chart fails honestly
rather than looping. Never last-write-wins.

---

## 10. B8 — HISTORY UX & ISOLATION

Chart-local, in French, and never a second global workstation banner — history is
a property of the chart, not of the connection or the account. One restrained
`role="status" aria-live="polite"` region for the whole lifecycle, so a
transition is announced once and individual candles never are. The overlay is
`pointer-events-none`, so it cannot intercept a crosshair, a drag or a long press.

| State | Copy |
|---|---|
| `loading` | `Historique…` |
| `empty` | `Historique en cours de constitution.` — the live current candle still renders; the feed is **not** called unavailable |
| `error` | `Historique indisponible. Le flux temps réel continue.` |
| `ready` | no message |

A history failure is **not** a stale market, **not** a closed market and **not** a
locked account, so the copy says so rather than letting the trader infer that
trading is down.

### 10.1 Execution isolation — tested behaviourally

The chart is the only component holding both a history series and the execution
callbacks, so the question worth answering is behavioural rather than type-level.
A history window whose candles sweep straight through a position's stop loss and
take profit, a pending order's trigger price and an alert threshold fires **no**
callback at all — and neither does a locally aggregated candle crossing the same
levels. Only fresh accepted realtime ticks execute, and they do so on the server.

```
HISTORY_CANNOT_EXECUTE                        = PASS
HISTORY_FAILURE_LIVE_EXECUTION_CONTINUES      = PASS
HISTORY_OBSERVER_FAILURE_EXECUTION_CONTINUES  = PASS
```

---

## 11. TEST RESULTS & VISUAL EVIDENCE

### 11.1 Suites

| Suite | Result |
|---|---|
| `packages/contracts` (candles + history contract) | 79 passed |
| `services/realtime` (store, single observation, transport, gate) | 83 passed |
| `apps/web` unit (controller, isolation, render ownership, sizing) | 198 passed |
| `pnpm test:fast` (format, lint, typecheck, boundaries, secrets, all unit) | 16/16 tasks |
| W3 E2E, desktop + mobile projects | 7 passed |
| Trade E2E gate (`--grep @trade`) | see PR |

Correctness evidence, all `PASS`: React batching independence · multi-tick high
preserved · multi-tick low preserved · 5s/30s/1m bucket boundaries · server
history single observation · sequence cutover · current-candle seed · same-second
multiple ticks · history/live race · symbol switch race · timeframe switch race ·
source epoch race · reconnect same epoch · reconnect new epoch honest gap ·
history cannot execute · history failure live execution continues · history
observer failure execution continues · reload with process memory.

### 11.2 Visual evidence

`apps/web/test-results/warix-w3-review/` (gitignored, as W2's was), spec
`tests/e2e/warix-w3-evidence.spec.ts`, tag `@warix-w3-evidence` — outside every
gate, no pixel assertions.

W3 §86 is the rule W2 got wrong, so every hydrated shot waits for connection →
symbol specs → a resolved history request → **a named finalized-candle floor**,
and an `evidence-manifest.json` records the depth each shot actually contained so
a reviewer can tell a real chart from one that merely reached `ready`. The first
capture attempt was rejected for exactly this reason: it was technically hydrated
yet showed a single 1m bar filling the viewport on a two-minute-old process.

| Shot | Finalized candles |
|---|---|
| `1920x1080-full-workstation-hydrated` (5s) | 110 |
| `390x844-chart-first-hydrated` (5s) | 111 |
| `1440x900-xauusd-30s-hydrated` | 20 |
| `1440x900-eurusd-1m-hydrated` | 10 |
| `390x844-history-loading-live-feed-healthy` | `market_history_result` withheld on the wire; ticks pass through |
| `390x844-history-error-live-feed-healthy` | `market_history_result` rewritten to `market_history_error`; ticks pass through |

The loading and error states are **produced, not caught**: `page.routeWebSocket`
withholds or rewrites only the history frame while every other frame including
market ticks passes through, so the states are deterministic and the same
screenshot shows live quotes and an open connection alongside the failure.

The 1m shot contains a genuine multi-minute gap. That is not a rendering
artefact: the backgrounded simulator process was suspended by the host, so no
accepted tick existed for those buckets and therefore no candle does either
(§5.8). Metrics confirm it — 2 465 accepted ticks against ~6 900 expected for the
uptime, with zero duplicate, out-of-order or non-open rejections.

---

## 12. KNOWN LIMITATIONS

Stated plainly, because each is a real product gap rather than an oversight:

1. **Not durable.** History lives in the realtime process's memory. A restart or
   a deploy loses it, and a freshly started server has no history until it has
   observed ticks. `PROCESS_RESTART_HISTORY_CONTINUITY_READY = false`.
2. **Depth is bounded by uptime**, not by retention. Retention caps the ceiling;
   uptime sets the actual depth. A 1m chart on a ten-minute-old process has ten
   bars, and that is the honest answer.
3. **Process-local.** Two realtime nodes each maintain their own epoch and their
   own observation. Their histories are not claimed to be byte-identical.
   `MULTI_NODE_SHARED_HISTORY_READY = false`.
4. **No provider history.** No REST candle API was invented or wired.
   `REAL_MARKET_HISTORY_PROVIDER_READY = false`,
   `REAL_MARKET_DATA_PROVIDER_READY = false`.
5. **No pan-left backfill.** The pagination contract exists and is tested; the
   chart does not yet call it on pan.
6. **Legitimate gaps.** An interval with no accepted tick has no candle. This is
   correct and deliberate, and it will look like a gap to a trader.
7. **Not public-production ready.** `PUBLIC_PRODUCTION_HISTORY_READY = false`.
   `TICK_CHARTS_READY = false`.

The database persistence recommendation of §2 stands unchanged and
**unimplemented**: `W3_DATABASE_PERSISTENCE_RECOMMENDED = true`,
`DATABASE_PERSISTENCE_DECISION_LOCKED = false`, `DATABASE_SCHEMA_CHANGED = false`.

---

## 13. DECISION LOG — W3

Recorded here alongside the reasoning; no duplicate identifiers.

| # | Decision | Status | Why |
|---|---|---|---|
| W3-D1 | Market history is **observed process memory**, aggregated from the accepted-tick stream the execution path already uses | LOCKED for W3 | The only truthful option available: no provider history exists, the simulator is not time-reconstructable, and durable storage was not authorised. Price basis is compatible by construction |
| W3-D2 | Exactly **one history observation per accepted market tick**, at `admitAndFanOutTick` above the client fan-out | LOCKED | Aggregating inside the fan-out multiplies one market tick by the number of connected traders. Enforced by a count-based test, not by convention |
| W3-D3 | `sourceEpoch` (opaque per-process UUID) **scopes** process-memory history | LOCKED | Sequence numbers are only meaningful within one provider instance; without an epoch, two process memories could be spliced into one false series |
| W3-D4 | The **sequence watermark** drives cutover; `historyThrough` is temporal metadata only | LOCKED | Timestamps are second-resolution and several accepted ticks can share one second. Only a sequence boundary makes the stitch exact |
| W3-D5 | Historical arrays are **finalized-only**, plus a separate **current-candle seed** | LOCKED | Without the seed a mount or reload loses the current bucket's true open and its pre-mount high/low until the bucket rolls over |
| W3-D6 | A **new `sourceEpoch` resets** process-memory-derived client history, leaving an honest gap | LOCKED | Fabricating continuity across a restart would present invented bars as observed market data |
| W3-D7 | A same-bucket **OHLC conflict forces a controlled rehydrate**, never last-write-wins | LOCKED | For a single observed source a conflict is an integrity fault; silently picking a winner would hide a real defect |
| W3-D8 | `MarketHistoryPort` + DTO live in **`contracts`**, not `adapters`, and are **not** folded into `MarketDataProvider` | LOCKED | It is a wire contract defined in terms of candle semantics already in `contracts`; folding it into the provider interface would imply history capability no quote provider has |
| W3-D9 | Retention **2 000** candles per (symbol, timeframe) ≈ 9 MB at full occupancy | LOCKED for W3 | 5× the initial hydration limit gives five left-pages at every timeframe and indicator headroom; 5 000 costs ~22 MB for 5s depth of little value |
| W3-D10 | Database persistence remains **recommended but undecided** | CANDIDATE | It is the gap that would close limitations 1–3. Requires explicit human approval, a retention policy, a leader-only write path and a licensing answer before a real provider |
