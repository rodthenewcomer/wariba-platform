# WariX Workstation 2026 — W4: the Execution Center

Branch `feat/warix-workstation-2026-w4`, from `main` @ `f77b72c` (the W3
merge). W1's seam is preserved throughout — no tick subscription was pulled
back up, no broad per-tick context introduced — and W4 tightens it: the ticket
draft, the other high-frequency input on this screen, now terminates at the
same boundary the tick does.

W4 merges the Order Ticket and the Guardian panel into one instrument, gives
the quantity field a decimal-safe stepper and quick presets, and makes the
execution surface exist exactly once in the document.

---

## 1. THE DEFECT THIS MILESTONE EXISTS TO FIX

The pre-W4 right column was a stack of independently boxed widgets: up to three
full-width `Alert` cards, then an `OrderTicket` card, then a `Guardian` card,
each with its own border, radius and 16 px padding. Two consequences, both
observable rather than aesthetic:

1. **The trade was below the fold.** On the 320 px column at 1440×900, a single
   monitoring notice pushed Buy and Sell off the bottom. A trader had to scroll
   a *trading panel* to reach the trade.
2. **It read as a dashboard, not an instrument.** Every part announced itself
   as a separate widget, so nothing established that the quantity, the
   protection levels and the margin estimate all described one order.

Three further defects were found while building and are recorded in §9.

---

## 2. WHAT W4 DID **NOT** DO

Stated first, because the constraint shaped everything else.

**No new browser arithmetic.** Every figure the panel shows comes from a
canonical `@wariba/domain` helper or verbatim from the server's risk snapshot.
No margin formula, no P&L formula and no risk limit is expressed in
`apps/web`. This is enforced structurally, not by review — see §5.

**No new order types.** Exactly Market, Limit and Stop, as before. No Stop
Limit, no OCO, no trailing entry, no futures types.

**No second risk engine.** The entry gate mirrors rules the server already
enforces and would reject on its own; it never derives a limit. Relationship
validation of SL/TP against entry stays server-authoritative: no canonical
shared helper expresses it, and inventing one in the browser is precisely what
this milestone forbids.

**No risk-reduction gating.** Closing or reducing a position is available in
every state the gate can produce, including a hard breach.

```
DATABASE_SCHEMA_CHANGED              = false
TRADING_DOMAIN_MATH_CHANGED          = false      (added helpers; changed none)
REALTIME_EXECUTION_SEMANTICS_CHANGED = false
LIGHTWEIGHT_CHARTS_REPLACED          = false
```

`packages/database/*`, `services/realtime/*` and `services/worker/*` are
untouched.

---

## 3. B1 — DECIMAL-SAFE QUANTITY (`packages/domain/execution-quantity.ts`)

### 3.1 Why this lives in the domain package

The stepper and the presets both *produce* quantities. `apps/web` has no
`decimal.js` dependency at all, so a stepper implemented there would have used
binary floats — and `0.1 + 0.2 = 0.30000000000000004` in a lot-size field is a
quantity the server rejects outright as `INVALID_QUANTITY`.

Nothing here is a new trading rule. `isQuantityWithinBounds` (`trading-math.ts`)
remains the single source of truth for whether a quantity is acceptable, and the
server re-runs it under lock on every order. These functions only produce values
that satisfy it — and `deriveQuantityPresets` re-checks its own output against
it rather than assuming.

### 3.2 The lattice

Valid quantities are `minimumQuantity + k × quantityStep` for integer `k ≥ 0`,
capped at `maximumQuantity`. That is exactly what `isQuantityWithinBounds`
accepts: it takes the remainder modulo the step *after* subtracting the minimum.

This is why nothing multiplies the step blindly. When a symbol's minimum is not
itself a whole number of steps, `min × 5` need not be a valid quantity at all.
Every candidate is snapped onto the lattice instead.

| Function | Behaviour |
|---|---|
| `isDecimalQuantityInput` | Plain non-negative decimal literal only. Rejects `1e5`, `NaN`, `Infinity`, `.5`, `1.` — parseable but never what a trader meant to type into a lot field. |
| `quantityDisplayScale` | Meaningful decimals of step *and* minimum, from `Decimal`'s own digit count — `numeric(14,4)` arrives right-padded as `"0.0100"`. |
| `stepQuantity` | Moves to the adjacent lattice point, not "current + step". `floor`/`ceil` rather than `round`, so from an off-lattice value `+` always moves up and `−` always down. Empty, malformed, zero, negative or out-of-range input recovers to the minimum. |
| `deriveQuantityPresets` | 1× / 5× / 10× of the minimum, snapped, deduplicated, dropped if above the maximum, and finally re-validated against `isQuantityWithinBounds`. |

With the shipped spec set this yields `0.01 / 0.05 / 0.10` for forex and gold
and `0.1 / 0.5 / 1.0` for NAS100. A preset the UI offers therefore cannot be a
quantity the server refuses.

### 3.3 A guard that was not cosmetic

`isQuantityWithinBounds` constructs a `Decimal`, and `new Decimal('abc')`
*throws*. Before W4 the ticket handed raw keystrokes straight to it, so a single
stray letter typed into the free-text quantity field threw during render.
`isDecimalQuantityInput` runs first; the canonical bounds check still decides
validity.

---

## 4. B2 — THE EXECUTION CENTER

### 4.1 Shape

`apps/web/app/(trade)/trade/execution/` — twelve files, none over 210 lines:

| File | Role |
|---|---|
| `execution-contract.ts` | Shared vocabulary, no React. `TicketOrderKind`, `ExecutionSide`, `OrderRejectionDetail`, `pendingOrderTypeFor`. |
| `execution-gating.ts` | The entry gate as one pure function. |
| `execution-impact.ts` | Every displayed number, derived from canonical helpers only. |
| `ExecutionSection.tsx` | A seam and a small-caps heading — the primitive that replaces the card. |
| `ExecutionMarketHeader.tsx` | Instrument, market state, bid/spread/ask. |
| `ExecutionStatus.tsx` | Rejection and blocked-entry notices. |
| `OrderTypeSelector.tsx` | Market / Limit / Stop, a real `radiogroup`. |
| `TriggerPriceControl.tsx` | Pending-order threshold + creation-side rule. |
| `QuantityControl.tsx` | Stepper, free text, quick presets. |
| `ProtectionSection.tsx` | SL/TP as absolute prices + per-side preview. |
| `TradeImpactPanel.tsx` | Guardian's data, folded into the flow. |
| `ExecutionActions.tsx` | Sell and Buy. |

`ExecutionPanel.tsx` composes them and owns the two subscriptions.

`OrderTicket.tsx` is **deleted**, not left behind as a type carrier. Moving its
shared types to `execution-contract.ts` is what made that possible: before W4,
`trade-session.ts` and `trade-copy.ts` imported a 237-line React component just
to name a rejection shape.

### 4.2 A seam, not a card

`ExecutionSection` renders a hairline rule plus a small-caps heading. Panel
padding drops from 16 px to 8/12 px, the radius on panel seams goes to 0
(retained on controls), and notices become a 2 px left-edge accent instead of a
rounded box — roughly a quarter of the vertical cost of an `Alert`.

The Buy and Sell actions are the only saturated elements on the surface (W0
§10). Everything else is greyscale with hairline seams, so the two things that
spend money are the two things the eye lands on.

### 4.3 Only the fields scroll

The market header and the status notices are pinned above; the two actions are
pinned below with an opaque background; the sections between them own the
overflow.

This is the structural form of §1's first defect. "Actions last in the reading
order" is not sufficient — the first build of this panel did exactly that and
put the actions at y=1024 in a 900 px viewport, because the panel scrolled as
one block (§9.1). With the overflow confined to the fields, the actions are on
screen at every viewport and in every state, however tall those sections grow.

### 4.4 Sell left, Buy right

Under the Bid and Ask they respectively reference in the header, so the price a
trader reads and the button they press are in the same column. Each button
repeats its reference price: a sell opens at the bid and a buy at the ask
(`quotedPrice` — the server's rule, not a re-implementation).

The accessible **name** is the verb alone. The side in French and the reference
price ride on `aria-describedby` with the price span `aria-hidden`. An
`aria-label` carrying all of it would satisfy WCAG 2.5.3 and still be wrong —
it stops the name from *being* the verb, which is what voice control acts on
(§9.1).

### 4.5 The entry gate

One pure function, `deriveExecutionGate`. Precedence is a product decision, not
an implementation detail — a disconnected socket must not be reported as
"quantité invalide":

```
resyncing → disconnected → quote unavailable → market stale → market closed
  → short-duration entry lock → hard breach → soft lock
  → invalid quantity → invalid trigger price → invalid protection
```

Every branch mirrors a rule the server already enforces. `AccountRisk` arrives
already evaluated by `services/realtime`; the gate reads its verdict fields and
never re-derives one from balance or equity. A snapshot reporting an active
account with its daily-loss budget fully consumed but no soft lock triggered is
**not** blocked here — the server owns that verdict.

A field error is shown on its own field and not repeated as a banner; the
entry-lock state keeps its full explanation, including that reducing and
closing stay available and that no permanent violation has been created.

### 4.6 Numbers, and where each comes from

A metric appears only when a canonical, instrument-correct helper already exists
for it, and it is computed by calling that helper.

| Displayed | Source |
|---|---|
| Estimated margin | `estimateRequiredMargin`, at the mid price — the same call Guardian made before W4, so the figure is unchanged by the redesign |
| DLL / maximum-loss remaining | The server's risk snapshot, verbatim |
| Concentration | The server's own used / limit / ratio per bucket |
| Potential SL loss, TP gain | `computeLevelPnlPreview` — the helper the chart's SL/TP drag preview already uses, which itself calls the server's `computeRealizedPnl` |
| R:R | `computeRiskRewardRatio` — a pure price-distance ratio, not a promise of realized P&L |
| Entry reference price | `quotedPrice` |
| Creatable pending sides | `isPendingOrderCreationPriceValid` |

The label is "Marge estimée", never "Marge finale".

**The protection preview is per side, and says so.** Both figures depend on
which side is submitted — a buy opens at the ask, a sell at the bid. One ticket
can be submitted either way, so a single unlabelled number would be ambiguous
exactly where money is involved. The panel renders a Vente column and an Achat
column. Everything is labelled an estimate: the executed fill includes
deterministic adverse slippage the browser does not model, and a stop order may
gap past its trigger entirely.

### 4.7 An invalid trigger side is a note, not a disabled button

`creatableSidesFor` runs the exact rule the server re-runs under lock — but it
runs it against *this browser's* last tick, which is by definition older than
the quote the server will hold at command time. Disabling would turn a
momentarily stale local quote into a hard block on a legitimate order. The note
says what the current market shows; the server still answers, and a genuine
`invalid_trigger_price` rejection surfaces with its own reason and code.

### 4.8 The draft leaves React

The draft was `useState` inside `TradeClient`, the composition root. Correct for
ownership, wrong for rendering: every keystroke re-rendered `TradeClient`, which
rebuilds the JSX it passes as props (`headerAction`, `resizeHandle`, the dock's
`account` object). Those are fresh objects each time, so no `memo` below could
hold — the shell, the Market Navigator, the status bar and the dock all
reconciled per character typed.

It is now an external store (`ticket-draft.ts`) following the pattern ticks
already use, subscribed to only by the surfaces that display it. Deliberately
**not** a Context: a provider re-renders its subtree on every change, which is
the problem the store exists to avoid (W1 §3).

Measured, in `workstation-render-ownership.test.tsx`:

```
TICKET_DRAFT_OWNERSHIP N_KEYSTROKES=5
  WORKSTATION_SHELL_EXTRA_RENDERS=0   NAV_RAIL_EXTRA_RENDERS=0
  STATUS_BAR_EXTRA_RENDERS=0          ACCOUNT_SWITCHER_EXTRA_RENDERS=0
  DOCK_CHROME_EXTRA_RENDERS=0         CLOSED_DIALOGS_EXTRA_RENDERS=0
  MARKET_NAVIGATOR_CHROME_EXTRA_RENDERS=0
  CHART_WORKSPACE_EXTRA_RENDERS=0     EXECUTION_EXTRA_RENDERS=5
```

The two confirmation dialogs subscribe individually, and only while mounted.

### 4.9 Switching instrument clears the price levels

The three absolute-price fields — stop loss, take profit, trigger — are cleared
together when the selected instrument changes. Quantity and order kind survive.

The asymmetry is the point. A quantity *is* validated against the new symbol's
own bounds and shows an inline error when it no longer fits. A price carried
over from another instrument is both unvalidated client-side and entirely
plausible-looking: an EURUSD stop of 1.08500 submitted against NAS100 is not
obviously wrong on screen. Clearing is the narrowest change that removes the
silent-plausibility hazard.

---

## 5. HOW "NO NEW BROWSER ARITHMETIC" IS ENFORCED

Not by review. `tests/execution-impact.test.ts` calls
`estimateRequiredMargin`, `computeLevelPnlPreview`, `computeRiskRewardRatio` and
`quotedPrice` *in its own expectations* and asserts the panel's derivation
agrees.

A hard-coded literal would have been easier and weaker: it keeps passing if
someone reimplements a formula locally with an equal-looking approximation,
which is exactly the drift this rule exists to prevent. Written this way a
second implementation can only pass by being identical to the shared one — at
which point it is not a second implementation.

The other half of the suite asserts *absence*: an unpriced account, a missing
spec, a missing quote or a half-typed field must produce no figure rather than a
plausible-looking placeholder, and must never throw inside `Decimal`.

---

## 6. B3 — ONE EXECUTION TREE

The panel was rendered in the shell's execution column **and** inside the mobile
bottom sheet, the desktop copy merely hidden by CSS below `lg`. Two live trees:
two `useTick` subscriptions, two impact derivations per tick, and every field
twice in the DOM — which is why several assertions in `trade.spec.ts` needed
`.first()` to disambiguate, and why `getByText('Ordre refusé')` matched two
nodes.

It now follows the rule W2 §27 already set for the dock: mounted only in the
active presentation. The same SSR/hydration caveat applies and is stated in
`use-viewport.ts` — what is certified is that *after viewport resolution* exactly
one presentation is mounted.

Because the draft lives outside React, moving between the two presentations
carries the trader's in-progress ticket across intact. Asserted on mobile: fill
the sheet, close it (the panel unmounts entirely — `execution-center` count 0),
reopen it, and the quantity and stop loss are still there.

---

## 7. TEST COVERAGE

| Suite | Count | What it settles |
|---|---|---|
| `packages/domain/tests/execution-quantity.test.ts` | 18 | The lattice, including a 300-step round trip a float accumulator fails |
| `tests/execution-gating.test.ts` | 10 | Gate precedence; reduction never gated; no limit re-derived |
| `tests/execution-impact.test.ts` | 14 | Agreement with canonical helpers; absence over placeholders |
| `tests/execution-controls.test.tsx` | 25 | Stepper, presets, typing never rewritten, roving radiogroup, notice roles |
| `tests/ticket-draft.test.ts` | 7 | Snapshot identity; no-op on unchanged set; price clearing |
| `tests/workstation-render-ownership.test.tsx` | +3 | §4.8's numbers; single mount; symbol-change clearing through the real tree |
| `tests/e2e/warix-w4.spec.ts` | 17 | Server acceptance, order book, rejection persistence, keyboard, axe, mobile |

Web unit tests: 198 → 257. `@trade` E2E: 42 → 59, all green on desktop and
mobile, including four full-page axe scans.

Two E2E assertions are worth naming because they test the *server*, not the
panel: a quantity produced by three stepper presses (`0.13`) reaching the
positions table as `0.1300`, and a preset submitting with no rejection — a
preset the UI offers cannot be one the server refuses.

A third asserts §4.3 as a gate rather than a screenshot: the panel is driven
into its tallest state (trigger price, both protection fields with the
two-column preview, impact populated, a real server rejection pinned above) and
both buttons must be fully in the viewport.

Two states are deliberately **not** E2E-tested, for the reason `trade.spec.ts`
already records: this sandbox cannot force a symbol's feed stale on demand.
Those branches are unit-tested exhaustively instead.

---

## 8. VISUAL EVIDENCE

`tests/e2e/warix-w4-evidence.spec.ts` — explicitly run, never a gate:

```
pnpm --filter @wariba/web exec playwright test \
  tests/e2e/warix-w4-evidence.spec.ts --project=desktop
```

W3 §86's integrity rule applies unchanged: a connected socket is not a hydrated
workstation, so every shot waits for connection → symbol specs → a real quote. A
screenshot of an Execution Center whose bid still reads "—" would misrepresent
the milestone.

The blocked-entry state is **produced, not caught** — the account snapshot's
risk verdict is rewritten on the wire, exactly as W3's evidence spec withholds a
history frame. Waiting for a real breach to happen is not a test, it is a hope.
The rejection is the one exception: it is genuinely provoked by asking for 1.00
lot against the 0.60 forex exposure bucket, because a real server refusal with a
real code is better evidence than a synthesised one.

The manifest records two numbers a screenshot cannot answer:

```json
"actionsWithinFirstScreen": {
  "default":                    { "bottom": 672, "viewport": 900 },
  "limitWithProtectionPreview": { "bottom": 672, "viewport": 900 },
  "withServerRejectionNotice":  { "bottom": 672, "viewport": 900 }
},
"sideActionContrast": { "buy": 5.79, "sell": 6.05 }
```

Contrast is measured from the live DOM, not asserted from the token file.

---

## 9. FAILURES INVESTIGATED, NOT RETRIED

### 9.1 Defects the gates caught

- **Contrast 3.1:1 on the Sell action.** The side buttons used
  `--wariba-action-primary-text`, which is `#0B0D12` under a dark theme —
  correct on the bright cobalt primary button, failing WCAG AA on a saturated
  red or green. Now `--wariba-action-destructive-text`, the token already paired
  with `#A73C3C` and `#FFFFFF` in every theme. The 11 px price line also lost an
  `opacity-90` that alone was enough to drop it under the minimum.

  Worth recording *how* this was found: this milestone's own axe scan was scoped
  to the panel and passed, while the repo's existing full-page gates failed. The
  scoped scan has been widened to match the rest of the suite. A scan narrowed to
  the thing you just built is the tempting thing to write and the wrong thing to
  trust.

- **The accessible name stopped being the verb.** An `aria-label` carrying the
  side and price made the button's name "Buy Acheter à l'Ask 1.08518". WCAG 2.5.3
  was satisfied and the control was still worse: `warix-w3.spec.ts`'s
  `{ name: 'Buy', exact: true }` failed, and so would a voice-control user. Moved
  to `aria-describedby` (§4.4).

- **The actions were below the fold — again.** Caught by this milestone's own
  evidence manifest, at y=1024 and y=1433 in a 900 px viewport. Root cause in
  §4.3; now a gate, not a screenshot.

- **A misleading measurement in the evidence itself.** The contrast readings were
  first taken after the blocked-entry capture — i.e. on *disabled* buttons, whose
  palette WCAG exempts. The number looked alarming (2.11) and meant nothing. Now
  taken while the actions are enabled.

### 9.2 A latent gap in the shared E2E fixture

`deleteFixtureAccount` never deleted `app.pending_orders` or
`app.position_reduction_queue`. Every `account_id` foreign key to
`app.trading_accounts` is `NO ACTION`, not `ON DELETE CASCADE`, so a row left
behind fails the account delete rather than being swept with it. No test had
left an un-triggered pending order before; W4's does.

Fixed in the fixture rather than in the test. An un-triggered pending order and
a still-queued reduction are ordinary end states, not leaks, and requiring every
future test to cancel what it created would push a teardown concern into every
scenario.

### 9.3 Stale assertions, corrected rather than worked around

The `ORDER TICKET — {symbol}` copy is gone; three specs now assert the execution
market header contains the symbol. The `.first()` disambiguation that existed
only because the panel rendered twice is no longer needed and its explanatory
comments were rewritten rather than deleted, so the reason the duplication
existed stays on the record.

---

## 10. W4 FLAGS

```
W4_EXECUTION_CENTER_READY     = true      W4_DECIMAL_QUANTITY_READY     = true
W4_TICKET_GUARDIAN_MERGED     = true      W4_QUANTITY_PRESETS_READY     = true
W4_ORDER_TYPES_READY          = true      W4_PROTECTION_PREVIEW_READY   = true
W4_TRIGGER_PRICE_READY        = true      W4_TRADE_IMPACT_READY         = true
W4_ENTRY_GATE_READY           = true      W4_REJECTION_PERSISTENCE_READY= true
W4_SINGLE_EXECUTION_TREE      = true      W4_MOBILE_SHEET_READY         = true
W4_DRAFT_STORE_READY          = true      W4_SYMBOL_CHANGE_CLEAR_READY  = true
W4_RENDER_OWNERSHIP_READY     = true      W4_ACTIONS_ABOVE_FOLD_READY   = true
W4_KEYBOARD_READY             = true      W4_ACCESSIBILITY_READY        = true
W4_TRADE_E2E_READY            = true      W4_VISUAL_EVIDENCE_READY      = true

W4_ACCEPTED = true   (pending human review + merge)

ORDER_TICKET_DELETED                 = true
DATABASE_SCHEMA_CHANGED              = false
TRADING_DOMAIN_MATH_CHANGED          = false
REALTIME_EXECUTION_SEMANTICS_CHANGED = false
LIGHTWEIGHT_CHARTS_REPLACED          = false
WORKSPACE_PRESETS_STARTED            = false
W5_STARTED                           = false
```

W4 gates nothing in W5 (indicators and drawings sit on the chart's own overlay
boundary, which W3 established). It does supply the section primitive and the
draft-store pattern that W6's Performance surface and W7's Personal Risk Guard
will both reuse.
