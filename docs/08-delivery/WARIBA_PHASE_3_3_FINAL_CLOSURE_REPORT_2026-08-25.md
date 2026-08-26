---
version: "1.0"
date: "2026-08-25"
phase: "3.3 — final closure (WariX accessibility, exhaustive classification, mobile evidence)"
baseline_sha: "ae5f8fcec2dcf259f337ba48253358d29b021f2a"
previous_candidate_sha: "105eacd98e84041be37754a26bd38eca8189fbb3"
navigation_candidate_sha: "0b9208ec8b2b3fcee4fa94d84e15d07669188cbf"
final_candidate_sha: "9175dfbf9458277b8051dc9d6347d2f7852bab0b"
branch: "fix/wariba-phase-3-3-3-navigation-reliability"
pushed: no
pr_opened: no
deployed: no
phase_3_4_started: no
---

# Phase 3.3 — final closure

## 1. Verdict

```text
PHASE_3_3_BLOCKED
```

The three blockers this slice was authorized to close are closed and measured.
Exhaustive certification is not, and the reason is precise: a tail of
historical WariX evidence specs asserts a workstation that later approved
passes replaced. None of their failures is a product defect. Retiring or
rewriting them is an owner decision, not something to do quietly inside an
accessibility slice — particularly now that the evidence they generate has
itself been retired.

## 2. Accessibility

### A11Y-001 — `aria-prohibited-attr`

```text
rule        aria-prohibited-attr (serious)
component   apps/web/app/(trade)/trade/ChartBottomBar.tsx
element     <span aria-label="Sélection de date indisponible" title="…">
role        none — a span with no role computes as `generic`
axe message aria-label attribute cannot be used on a span with no valid role
state       every desktop state; the element is always rendered
```

The date-picker affordance is permanently unavailable — there is no date
selection to offer yet. ARIA drops `aria-label` on a generic element, so a
sighted trader saw a greyed glyph with a tooltip and a screen-reader user met
an empty box.

It is a disabled `<button>` now. That is what it is: a control that exists and
cannot be operated, named and announced as such, and it is what every horizon
button beside it already becomes when its range is unavailable. No role was
invented to satisfy the rule.

### A11Y-002 — `color-contrast`

```text
rule        color-contrast (serious), 2 nodes
component   apps/web/app/(trade)/trade/workstation/WorkstationStatusBar.tsx
nodes       the P&L latent label, and its value
measured    #9aa3b1 on #1d443f = 4.22:1   (label)
            #e05a5a on #1d443f = 2.96:1   (value)
required    4.5:1
state       an open position, while the value-roll flash is showing
```

Two causes, both real.

The workstation kept the red the Hub retired. `--wariba-accent-red` was raised
to `#F46E6E` in Phase 2.5.1 after measuring 4.32:1 as text, and that change was
recorded as "verified safe for WariX — the workstation runs its own `--warix-*`
palette and references `--wariba-accent-red` nowhere." True, and the reason the
failing value survived: WariX has its own copy of the same red, and only the
Hub's was fixed. Measured on the surfaces it is actually painted on, `#E05A5A`
gives 4.00:1 on the negative metric tile's own sell wash and 3.71:1 on a buy
wash. `coral.300` (`#F46E6E`) is now the text role; `coral.400` stays the sell
identity and the down-candle, where the colour is a fill and the contrast that
matters is white on top of it.

The flash made it worse while it showed. At `0.28` alpha the value-roll tint
dropped *every* foreground below AA — the negative figure to 2.96:1, its own
label to 4.22:1, even the positive green to 4.05:1. Emphasis that hides the
number it is emphasising is not emphasis. `0.18` is the measured point where
the worst pairing clears 4.5:1, and it stays visibly stronger than the `0.16`
resting wash.

`METRIC_TONE_CLASS.critical` also stopped borrowing the sell *identity* token
as a foreground; a metric reporting a breached budget is a number, so it takes
the token the other numbers take.

```text
WARIX_INVALID_ARIA            = 0
ACCESSIBILITY_CRITICAL        = 0
ACCESSIBILITY_SERIOUS         = 0
```

Verified with axe on: desktop default, desktop with the Orders tab open,
desktop with a real open position, and 390px.

## 3. The five WariX failures

| ID | Classification | Runs | Result | Product changed | Test changed |
|---|---|---:|---|---|---|
| WFX-001 Close All | TEST_DEFECT | 3 | closed | no | yes |
| WFX-002 Reconnexion | TEST_DEFECT | 3 | closed | no | yes |
| WFX-003 Watchlist XAUUSD | TEST_DEFECT | 3 | closed | no | yes |
| WFX-004 Context menu A | TEST_DEFECT | 5 | closed | no | yes |
| WFX-005 Context menu B | TIMING_OBSERVABILITY_DEFECT | 5 → 5 | closed | no | yes |

```text
WARIX_UNCLASSIFIED_FAILURES = 0
```

**WFX-001/003** — the catalogue moved into the Markets drawer, which is closed
until asked for. A bare `getByText('GBPUSD')` then resolved to a span in another
panel and hung waiting for it to become clickable.

**WFX-002** — the test required the words `Reconnexion…` and `Connecté` to be
seen. VX1-C.1 removed them deliberately and said what replaces them:
"`data-connection` keeps exactly the three values it has always published, so
every existing check still reads the same state it did before." It also asked
for something a fast reconnect can outrun; the account losing and regaining a
healthy feed is the fact worth asserting.

**WFX-004** — the alert item carries the clicked price (§19), so it is named
`Créer une alerte @ …`.

**WFX-005** — the only one that was intermittent: 4 passes and 1 failure in five
isolated runs. The context menu is price-anchored, and
`handleContextMenuEvent` returns without opening when the chart cannot yet give
a price. Right-clicking before the price scale is populated therefore opens
nothing — which is correct behaviour, not a defect: a menu offering "Achat au
marché @ —" would be worse. The test now waits for `chart-ohlc-legend`, which
renders on exactly the condition the price lookup needs. 25/25 across five
isolated runs afterwards.

## 4. Mobile evidence

`page.goto` resolves on `load`, and these routes stream behind skeletons — so
the document was "loaded" while the only thing on screen was a promise. Two
captures were taken in that window.

`Skeleton` now carries `data-skeleton`. It had no marker of any kind, so
nothing could tell a placeholder from an answer. Two helpers wait for the thing
being certified — the account's own identifier, its figures, both cards of the
parent/child relationship — and then assert no placeholder is left anywhere.
No sleeps were added.

```text
MOBILE_390_SCREENSHOT_LOADING_STATE = 0
MOBILE_390_CRITICAL_READY           = yes
MOBILE_320_CRITICAL_READY           = yes
```

## 5. Gates

```text
PREFLIGHT              pass   Node 24 · DB 15ms · Auth 25ms · Realtime 21ms
FAST GATE              pass   format, lint, typecheck, boundaries, secrets
UNIT                   pass   1 543
DB SQL                 pass   24 / 24
DATABASE INTEGRATION   pass   213 / 213
APPLICATION INTEGRATION pass  56 / 56
WORKER INTEGRATION     pass   1 / 1
RLS FULL               pass   68 / 68
CRITICAL E2E           pass   27 / 27
RECOVERY               pass   intermittent: 1 failure, then 2 passes
FAILOVER               pass   takeover 4 623 ms
LOAD                   pass   snapshot p95 340 ms
EXHAUSTIVE             FAIL   see §6
```

## 6. The remaining blocker

```text
EXHAUSTIVE_CERTIFICATION = FAIL
```

A first full run measured 39 failures across 284 of 339 before it was stopped.
The repairs in this slice closed the behavioural specs — `trade`, `warix-w1`,
`warix-w2`, `warix-w3`, `warix-w4`, `wariba-product-os-phase2`,
`wariba-product-os-phase11` — and a second run against the final candidate
reached 240/339 with 16 failures before it was stopped — every one of them in
the historical evidence specs, and two of those (`wariba-product-os-phase25`,
`warix-phase25-regression`) in Phase-2.5-era files of the same kind.

Measured on the second run:

```text
warix-vx1d-motion               4
warix-vx1d1-geometry            2
warix-vx1c1-icons               1
warix-vx1c-evidence             1
warix-vx1b-evidence             1
warix-vx1a1-polish              1
warix-vx1-right-rail-symbols    1
warix-symbol-final-human-review 1
warix-round2-shots              1
warix-reopen-shots              1
warix-phase25-regression        1
wariba-product-os-phase25       1
```

Those specs exist
to regenerate screenshots for design passes that are closed. They assert a
catalogue that has since been split, testids that no longer exist, and price
plates that render only under conditions those tests no longer create. They are
not protecting current behaviour — `trade`, `warix-w1/w2/w4/w5` and
`control.spec` do that.

They are also the generators of exactly the evidence bundles that were retired
this week as outdated. The consistent next step is to retire the generators too,
or rewrite the few whose subject still exists. That is a scoped decision with a
real blast radius, and it is the owner's.

## 7. Residual findings, not fixed here

**A passed evaluation still shows live risk budgets on its accounts-list card.**
The Hub renders the archive correctly, but `/comptes` still draws "Objectif de
profit", "Perte quotidienne restante 100 %" and a progress bar for a finished
evaluation. Visible in `24-accounts-parent-child-390.png`. It is the same
Phase 3.3.2 truth issue, on a surface that slice did not reach, and outside this
slice's authorized scope.

**`seedLifecycleFixture` poses Performance accounts with no parent.** It flips
`program_type` on the evaluation row, producing an account the schema's own
`trading_accounts_source_exactly_one` says cannot exist. The Hub fails closed on
it, correctly. An attempt to seed a real parent inside this slice destabilised a
fixture eight suites share and was reverted; the affected assertion now states
what the product does and names the defect behind it.

**Recovery is intermittently flaky** — a 26 s process-restart test, 1 failure in
3 runs. Unchanged from the previous slice.

## 8. Not touched

Risk engine, daily loss, maximum loss, Best Day, payout formulas, buffer
semantics, Evaluation and Performance lifecycles, EOD finalization authority,
provisioning, parent/child uniqueness, acknowledgement immutability, RBAC, RLS,
breach immutability, trade execution semantics. No migrations.

```text
RISK_ENGINE_MODIFIED     = no
PAYOUT_MATH_REGRESSION   = 0
RLS_REGRESSION           = 0
RBAC_REGRESSION          = 0
DATABASE_CHANGES         = none
PHASE_3_4_STARTED        = no
```
