# WariX Workstation 2026 — W2: Market Navigator, trading dock & responsive density

Branch `feat/warix-workstation-2026-w2`, from `main` @ `a955512` (the W0+W1
merge). W1's seam is preserved throughout: no tick subscription was pulled back
up, and no broad per-tick context was introduced.

W2 turns the two remaining legacy surfaces — `WatchlistPanel` and the
Prompt-08 dock — into mature workstation interfaces, and moves the Payout
Center to its canonical route.

---

## 1. AUDIT FINDINGS THAT CHANGED THE PLAN

Two audit results are worth recording because they contradicted the brief's
stated premises.

**`asset_class` — confirmed as expected.** `app.symbol_specs.asset_class`
already exists, typed in `packages/database/src/schema.ts` as
`'forex_major' | 'metal' | 'index_cfd_simulated'`, with live values
`EURUSD·GBPUSD·USDJPY → forex_major`, `XAUUSD → metal`,
`NAS100 → index_cfd_simulated`. The client contract did not expose it and
`assetClass` appeared nowhere in `services/` or `apps/`. W2 therefore adds a
**read-only presentation-metadata field** to the symbol-spec payload, with no
migration.

**`/payouts` — the brief's premise was wrong.** §16 assumed "a real trader
Payouts route already exists". It did not: `/payouts` was a placeholder
`EmptyState` announcing that the Payout Center "arrive avec Prompt 08", while
the *working* Payout Center had shipped inside the WariX execution dock.
Removing the dock tab as written would have deleted a live capability and
pointed traders at a dead end. This was raised before any code was written and
resolved as **relocation, not removal** — see §5.

---

## 2. MARKET CATALOGUE & CATEGORIES

Recorded as `UX-WARIX-004`.

`MARKET_CATALOG_SOURCE` = the account's received `symbolSpecs` (the
`symbol_specs` websocket payload), **not** `TRADABLE_SYMBOLS`.
`ASSET_CLASS_SOURCE` = `app.symbol_specs.asset_class`, threaded through
`loadSymbolSpecs` → `LoadedSymbolSpec` → the `symbol_specs` DTO.

One mapping, in `market-categories.ts`, and nothing else classifies an
instrument:

| `assetClass` | Category |
|---|---|
| `forex_major` | Forex |
| `metal` | Métaux |
| `index_cfd_simulated` | Indices |
| anything else | **Autres** |

`Autres` is not dead code: the client casts the spec payload rather than
parsing it, so a class added to the database before the mapping is updated
arrives as an unrecognised string at runtime. Filing it visibly under "Autres"
is the honest outcome; filing it under Forex would be a lie about what the
trader is trading.

A category is rendered only when an available instrument belongs to it, so
`ENERGIES_RENDERED = false` and `SPX500_RENDERED = false` — not because they
are filtered out, but because nothing in the account's catalogue produces
them.

`PERCENT_CHANGE_RENDERED = false`. WariX still has no historical market data
(W3 owns it), so there is no valid reference price for a daily/24h/session
change, and no such column, sparkline or high/low is drawn. Rows show only
current-state truth — bid, ask, spread, market status — and an absent tick
renders `— / —` / "Indisponible" rather than a remembered value wearing a live
label.

`PROVIDER_DRIVEN_CATALOG_READY = false`. MARKET-006's provider-driven
discovery remains future work; W2 claims only that the navigator reflects what
this account actually received.

## 3. NAVIGATOR BEHAVIOUR

Search is client-side over the small received catalogue, case-insensitive and
whitespace-trimmed, with an honest empty state; it never mutates the selected
symbol and never issues a server query.

Favorites are a **quick-access projection**, not a reclassification: a
favorited instrument appears under Favoris *and* still under its real
category. They are UI preferences only — they cannot make a symbol tradable,
cannot change a subscription, and a favorite for an instrument this account
has no spec for is discarded rather than rendered.

## 4. LAYOUT PREFERENCES, COLLAPSE & RESIZE

Recorded as `UX-WARIX-005`. One versioned, fail-closed, browser-local store
(`wariba.workstation.layout`) holding exactly five keys: navigator width and
collapsed, dock height and collapsed, favorites. Nothing financial. **Not
synchronised across devices** — a server preference table would be needed and
W2 does not introduce one.

```
NAVIGATOR_WIDTH_DEFAULT = 280   MIN = 220   MAX = 360
DOCK_HEIGHT_DEFAULT     = 220   MIN = 140   MAX = 560 (additionally clamped to 55dvh)
DOCK_COLLAPSED_HEIGHT   = 40
```

Collapsing genuinely removes the track — the navigator contributes a `0px`
grid column and the dock only its header row, so the space reaches the chart
rather than sitting behind a hidden panel. A labelled restore control appears
in the chart cell whenever the navigator is collapsed, so the surface can
always be brought back.

Both separators are the platform `separator` pattern with orientation and
`aria-valuemin/now/max`, Arrow-key resize (Shift for a coarser step, Home/End
to the bounds), and pointer **capture** rather than document listeners — so a
drag cannot leak a global handler, survive unmount, or keep firing after the
pointer leaves the window. Pointer moves are coalesced to one
`requestAnimationFrame` per frame, because the chart's `ResizeObserver` sits on
the other end of every one of them.

## 5. PAYOUT RELOCATION

Recorded as `UX-PAYOUT-001`.

```
PAYOUT_ROUTE_PRE_W2            = PLACEHOLDER
PAYOUT_WORKING_SURFACE_PRE_W2  = WARIX_DOCK
PAYOUT_RELOCATION_STRATEGY     = EXISTING_CAPABILITY_TO_CANONICAL_ROUTE
PAYOUT_BUSINESS_LOGIC_REBUILT  = false
PAYOUT_DOCK_REMOVAL_ALLOWED_ONLY_AFTER_ROUTE_PARITY = true (respected)
```

The same `PayoutCenterPanel` moved to `/payouts`. Payout semantics were
**extracted, not duplicated**: `apps/web/lib/payout-session.ts` holds the one
`requestPayoutCommand` and the one `applyPayoutResult`, and both WariX and
`/payouts` call them. There is no second payout command path and no second
reading of `payout_result`.

The transport is narrowed rather than reused wholesale. `/payouts` subscribes
to `accountStateChannel` **and** `accountOrdersChannel` — the latter because
`broadcastPayoutResult` publishes there — and to nothing else. No market
channel, no tick store, no fills, no alerts, no order-entry commands. Market
ticks therefore cannot re-render this page because there is no subscription to
re-render from.

> That second channel was found by the parity test, not by reading: the first
> implementation subscribed only to the state channel, received the snapshot
> perfectly, and left every request permanently in flight because the command's
> own reply never arrived.

Account resolution mirrors WariX (UX-NAV-002): server-side, from
`listAccountsForUser`, restricted to the trader's **Performance** accounts,
switched by ordinary anchor. An Evaluation-only trader gets an honest state
pointing at their progression, never a payout form that cannot be submitted.

The Hub's Performance mission action now deep-links to
`/payouts?account=<id>` instead of `/trade#payout`, and the Account dock tab
offers the same link on Performance accounts.

## 6. DOCK

Final membership: **Positions · Orders · Trades · Alerts · Account**.

- **Orders** folds W1's "En attente" and "Ordres" into one destination but two
  views — a pending order is a live instruction awaiting a trigger, a recent
  order is a settled outcome, and merging the rows would invite reading a
  rejection as something still working. Gérer and Annuler are unchanged, and
  every rejection still shows its reason.
- **Trades** is W1's "Historique" reframed, still fill-driven: net P&L,
  eligible P&L and the 60-second classification all arrive already decided by
  the server.
- **Alerts** reuses `useTradeSession`'s own alert state and canonical
  enable/disable/delete commands. Creation stays with the existing
  NotificationCenter/chart workflow — a second creation path would be a second
  place for alert semantics to drift.
- **Account** is a compact read-only summary of authoritative snapshot/risk
  figures, performing no arithmetic.
- **Payout** left for `/payouts` (§5). **Journal** was a placeholder sentence
  and is deleted outright, not replaced by another "coming soon".

Counts appear only where the number is unambiguous — open positions, live
pending orders, enabled alerts. Trades deliberately carries none: the snapshot
holds a bounded recent window that a number would misrepresent as a lifetime
total.

## 6b. DOCK NAMING

The dock's accessible name is **"Dock de trading"** — for the `section` and the
`TabList` — because it is no longer an account panel: it carries positions,
orders, trades and alerts, with Account as one tab among five. The mobile
trigger reads **"Activité"** and its sheet is titled **"Activité de trading"**.
The internal tab keeps the name **"Account"**.

## 7. MOBILE

The W1 status-bar limitation is closed: at phone widths labels shorten
(`Equity → Eq`, `DLL restant → DLL`), values drop their ` USD` suffix, the
risk-detail trigger becomes "Risque", the connection chip shows its dot with
the state in its accessible name, and Notifications becomes an icon — while
the full labels remain the accessible names at every width.

The dock became a sheet, and — the part that matters — the two presentations
are **never concurrently active**. CSS can hide the desktop dock on a phone but
cannot unmount it, and a hidden `PositionsTabPanel` would still hold a
`useAllTicks` subscription and still recompute live P&L on every tick.
`useIsDesktop()` chooses in JavaScript: inline on desktop, inside the sheet on
mobile.

Stated precisely, because the difference matters for what this milestone
certifies: `useIsDesktop()` renders the SSR-safe desktop assumption first and
resolves `matchMedia` after mount, so on a phone the desktop branch does exist
for the first client paint before being replaced. The certified invariant is
therefore **after viewport resolution, exactly one dock presentation remains
mounted** — not that only one is ever constructed. Redesigning the hook to
resolve before first paint is deliberately out of scope here.

The mobile Markets trigger opens the **same** `MarketNavigator` — same
catalogue, same categories, same favorites, same search. There is no second
mobile market list.

## 8. RENDER OWNERSHIP

W1's proofs re-run unchanged, with W2's surfaces added. 25 selected-symbol
ticks against the real component tree with a fake transport:

```
N_SELECTED_SYMBOL_TICKS                  = 25
WORKSTATION_SHELL_EXTRA_RENDERS          = 0
NAV_RAIL_EXTRA_RENDERS                   = 0
STATUS_BAR_EXTRA_RENDERS                 = 0
ACCOUNT_SWITCHER_EXTRA_RENDERS           = 0
DOCK_CHROME_EXTRA_RENDERS                = 0
CLOSED_DIALOGS_EXTRA_RENDERS             = 0
MARKET_NAVIGATOR_CHROME_EXTRA_RENDERS    = 0
CHART_WORKSPACE_EXTRA_RENDERS            = 25   (legitimate)
EXECUTION_EXTRA_RENDERS                  = 25   (legitimate)
VISIBLE_POSITIONS_CONTENT_EXTRA_RENDERS  = 25   (legitimate — live P&L)
```

A tick on an unselected symbol reaches none of them, and toggling a favorite
opens no new transport: the socket count is unchanged across the interaction,
so a preference can never rebuild the session.

## 8b. HUMAN-REVIEW VISUAL EVIDENCE

Captured by `tests/e2e/warix-w2-review-evidence.spec.ts` (tagged
`@warix-w2-evidence`, in no gate, asserts no pixels) into a directory of its
own so the W0 baseline and the W1 geometry evidence are never overwritten:

```
apps/web/test-results/warix-w2-review/
  1440x900-default-workspace.png
  1440x900-navigator-collapsed.png
  1440x900-dock-expanded-trades.png
  1920x1080-default-workstation.png
  390x844-chart-first-default.png
  390x844-market-navigator-sheet.png
  390x844-trading-dock-sheet.png
```

The capture waits for the account's symbol specs and first ticks before
shooting, not merely for a connected socket: the first version of this spec
fired on connection alone and produced screenshots of an empty navigator and
em-dash metrics, which would have misrepresented the milestone.

## 9. TESTS

| Gate | Result |
|---|---|
| Web unit / component (`test:unit`) | **135 passed** (19 files) |
| Trade E2E incl. `@mobile`, `@accessibility` (`test:e2e:trade`) | **35 passed** |
| Payout E2E incl. relocation parity (`test:e2e:payout`) | **5 passed** |
| Auth / Hub E2E (`test:e2e:auth`) | **5 passed** |
| Realtime functional + account isolation (`realtime test:e2e:full`) | **10 passed** |
| PR Fast Gate (`test:fast`) | see PR |

New suites: `tests/market-navigator.test.tsx` (catalogue, categories, search,
favorites, preference parsing), `tests/e2e/warix-w2.spec.ts` (navigator, dock
membership, collapse/resize/persistence, a11y, mobile overflow and sheets),
`tests/e2e/payout-relocation.spec.ts` (capability parity and account
isolation on the relocated route).

### 9.1 Failures investigated, not retried

- **`payout_result` never arrived on `/payouts`.** Root cause: the server
  broadcasts it on `accountOrdersChannel`, not the state channel, so the first
  narrow subscription received snapshots but never the command's own reply.
  Fixed by subscribing to both account channels — still no market channel.
- **A parity assertion that could pass vacuously.** `expect(relocated) ===
  expect(dock)` would have been satisfied by "both disabled"; changed to
  assert both are genuinely submittable against an eligible fixture.
- **Mobile status bar still overflowed at 320–430.** Diagnosed by making the
  test name the offending element and each bar child's width, which showed the
  account identity as a constant 157 px. Fixed by showing the program code on
  phones with the canonical public id from `sm` upward and always in the
  accessible name — no truncation, nothing hidden without a path to it.
- **`getByText('Connecté')` became ambiguous.** The compressed chip rendered
  the label twice (screen-reader copy plus visible copy). Collapsed to one
  node with the state on `aria-label`.
- **Legacy specs clicking `Ordres` / `Historique` / the Payout tab.** These are
  the intended consequence of §15/§18/§19, not regressions; re-anchored to
  Orders → Récents, Trades, and `/payouts`.

## 10. W2 FLAGS

```
W2_MARKET_NAVIGATOR_READY      = true      W2_DOCK_MEMBERSHIP_READY       = true
W2_MARKET_SEARCH_READY         = true      W2_DOCK_COLLAPSE_READY         = true
W2_FAVORITES_READY             = true      W2_DOCK_RESIZE_READY           = true
W2_ASSET_CLASS_SOURCE_READY    = true      W2_ORDERS_READY                = true
W2_RUNTIME_CATALOG_TRUTH_READY = true      W2_TRADES_READY                = true
W2_NAVIGATOR_COLLAPSE_READY    = true      W2_ALERTS_READY                = true
W2_NAVIGATOR_RESIZE_READY      = true      W2_ACCOUNT_TAB_READY           = true
                                           W2_PAYOUT_RELOCATED            = true
W2_MOBILE_STATUS_DENSITY_READY = true      W2_JOURNAL_PLACEHOLDER_REMOVED = true
W2_MOBILE_NAVIGATOR_READY      = true
W2_MOBILE_DOCK_READY           = true      W2_RENDER_OWNERSHIP_READY      = true
W2_MOBILE_OVERFLOW_READY       = true      W2_ACCESSIBILITY_READY         = true
                                           W2_TRADE_E2E_READY             = true

W2_ACCEPTED = true   (pending human review + merge)

DATABASE_SCHEMA_CHANGED            = false
TRADING_DOMAIN_MATH_CHANGED        = false
REALTIME_EXECUTION_SEMANTICS_CHANGED = false
LIGHTWEIGHT_CHARTS_REPLACED        = false
WORKSPACE_PRESETS_STARTED          = false
W3_STARTED                         = false
```

`packages/domain/*`, `packages/database/*` and `services/worker/*` are
untouched. `services/realtime/*` changes are confined to selecting and mapping
one already-existing read-only column; no execution, risk or pricing path
reads it.
