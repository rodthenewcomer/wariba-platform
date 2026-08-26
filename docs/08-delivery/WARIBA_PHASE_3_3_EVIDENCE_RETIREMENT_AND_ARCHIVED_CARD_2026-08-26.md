---
version: "1.0"
date: "2026-08-26"
phase: "3.3 — evidence-spec retirement review and the archived Evaluation card"
baseline_sha: "ae5f8fcec2dcf259f337ba48253358d29b021f2a"
entry_candidate_sha: "386cee2"
final_candidate_sha: "1f5ddba75161de954b7a9f505533220b2d21ab12"
branch: "feat/wariba-phase-3-private-beta-completion"
pushed: no
pr_opened: no
deployed: no
phase_3_4_started: no
---

# Phase 3.3 — evidence retirement review, and the archived Evaluation card

## 1. Verdict

```text
PASSED_EVALUATION_ACCOUNT_CARD_TRUTH = PASS
EVIDENCE_SPEC_RETIREMENT             = NOT PERFORMED — premise did not survive
CRITICAL_E2E                         = 29 / 29
PHASE_3_3_FINAL                      = BLOCKED
```

Two things were authorized. One was done. The other was investigated and not
done, because the investigation contradicted the reason for doing it, and the
authorization's own conditions then forbade it.

## 2. The retirement slice: why nothing was deleted

The authorization allowed retiring a WariX evidence spec only when **all five**
conditions held, among them:

> 4. It is **not** the only automated verification of a current
>    business-critical behavior.

and it named a must-not-delete list: trading, risk, account context, WariX
reliability, security, accessibility.

Every candidate was checked against those conditions. **None passed.** The two
largest failing groups turned out not to be outdated generators at all:

### `warix-vx1d-motion` (4) and `warix-vx1a1-polish` (1)

These are the only automated detection of a real, current, unfixed product
defect:

```text
WARIX_PRICE_PLATES_NEVER_RENDER
```

Zero price plates render on a fully hydrated chart. `ChartPriceScalePlates`
returns `null` while `width <= 0`; `priceScaleWidth` initialises to `0` and is
written by a single effect reading `chart.priceScale('right').width()`, keyed on
`[chartVersion, plotSize.width, pricePrecision]`. When that read returns `0` the
gate never opens again. Introduced in `ef39f71` (2026-08-21), an ancestor of the
baseline — pre-existing, not caused by any work in Phase 3.3.

`warix-vx1d-motion` asserts, in its own words, that *the display layer never
changes an authoritative price*. That is the WariX reliability contract on the
must-not-delete list. Deleting these specs would delete the detector and leave
the defect, which is precisely what condition 4 exists to prevent.

### `warix-vx1d1-geometry` (2)

Failed against degraded market data — the chart at 1.167 while the position was
at 1.085, with the banner reading *"Historique disponible · temps réel
indisponible"*. `INFRASTRUCTURE_FAILURE`. Not a stale assertion, and not
something retirement would fix.

The rest of the tail was not reached, because a retirement rule whose first two
groups both fail its own conditions is not a rule that should be applied
faster — it is one whose premise needs revisiting. That is an owner call.

### The honest count

```text
OLD      = 339
RETIRED  = 0
ADDED    = 2   (product-truth.spec.ts — desktop and mobile)
NEW      = 341   (55 files, from `playwright test --list`)
```

No `339/339` is claimed, and none is manufactured. The number went **up**,
because two tests were added and none were removed.

## 3. The archived Evaluation card

`/comptes` drew a finished evaluation as if it were still being traded:
objective progress, daily-loss remaining, maximum-loss remaining, active risk
bars, and a trading CTA. All of it was true-looking and none of it was true —
the account had already passed.

**What it shows now.** `AccountOverviewItem` gained an `archive` view, built in
`accounts-overview.ts` by a short-circuit for `WARIBA_ONE` + `passed`:

```text
WARIBA ONE · Évaluation · 10 000 USD      ✓ Évaluation réussie
Montant du compte   10 000 USD      Terminée le  25 août 2026
RÉSULTAT FINAL      +0 USD
VOTRE COMPTE PERFORMANCE
PERF-10000-5713A445    ● Actif
EVAL-10000-736B3E6D                [ Voir mon compte Performance ]
```

- No objective bar, no risk meters, no `Ouvrir WariX`. Measured:
  `progressbars=0` at 1440 and 390.
- The primary CTA goes to the successor: `/hub?account=<performanceId>`.
- Emerald is reserved for a gain. The sign is decided in the view
  (`finalResultSign: 'positive' | 'flat' | 'negative'`), not by the card
  re-parsing a string it was handed already formatted — a flat `+0 USD` is not
  coloured as an achievement.
- The successor is named once. The old `Compte créé : …` footnote is suppressed
  when the archive block already names it.
- **No child yet:** *"Votre compte Performance est en préparation. Vous n'avez
  rien à faire pour le moment."* — true, and it does not imply an account that
  does not exist.

Verified at 320 / 375 / 390 / 430 and 1440.

One assertion moved. `evaluation-performance-handoff.spec.ts` proved the
parent names its child by looking for the footnote. It now looks in the archive
block and is **scoped to the evaluation's own card**, so the Performance card's
copy of the same id cannot satisfy it. The invariant is unchanged and the
assertion is strictly narrower than before.

## 4. New finding: the pass is recorded on a different clock from the day

```text
LIFECYCLE_TIMESTAMP_CLOCK_SPLIT — PRODUCT_DEFECT, pre-existing, protected domain
```

The `assertLifecycleOrder` invariant added in Phase 3.3.2 fired in the critical
gate:

```text
ScenarioInvariantError: dailyFinalizedAt (…13.177Z) must not follow passedAt (…13.176Z)
```

It is not a millisecond rounding artifact. Measured directly over fresh
fixtures, the inversion reaches **355 ms** and reproduces in **4 of 6** and
**4 of 10** runs:

```text
delta=+150ms  paramsNow=…08.121  fin=…08.051  passed=…07.901
delta=+355ms  paramsNow=…12.135  fin=…12.133  passed=…11.778
delta=+292ms  paramsNow=…23.793  fin=…23.785  passed=…23.493
```

**Cause.** Within one transaction, two timestamps come from two clocks:

| write | file | source |
| --- | --- | --- |
| `passed.occurred_at` | `risk.ts:295` | column default `now()` — Postgres, transaction start |
| `finalized_at` | `daily-finalization.ts:255` | `params.now` — the Node process |

`risk.ts` is the only transition insert that omits `occurred_at`;
`control-contestations.ts:787` sets it explicitly. The recorded order of "the
account passed" and "the day that justified the pass was finalized" is therefore
decided by the skew between the database host's clock and the application's.

**Why it matters beyond a test.** `evaluation-performance-handoff.ts` builds the
trader-visible timeline from exactly these rows. This is the impossible-ordering
class Phase 3.3.2 set out to close, in the canonical audit trail rather than in
a renderer.

**Not fixed here.** The remedy is one line — add `occurred_at: params.now` to
the insert at `risk.ts:295` — but `risk.ts` is the risk engine, which this slice
was explicitly forbidden to reopen. Reported for authorization, not changed.

## 5. Gates

```text
FAST GATE              pass   typecheck clean
BUILD                  pass   standalone
TARGETED E2E           pass   8 / 8    (product-truth ×2 projects, handoff)
CRITICAL E2E           pass   29 / 29  4.2m — see §6 for the intermittent it hides
EXHAUSTIVE             FAIL   blocked on WARIX_PRICE_PLATES_NEVER_RENDER (§2)
```

## 6. Critical gate: what was measured, and the noise in it

Four runs against this candidate, same command. The last is the one that
counts, and the three before it are reported because the gate is only worth
reading if its noise is named:

```text
run 2   28 passed  1 failed   6.5m   footnote assertion — fixed in 1f5ddba
run 4   26 passed  1 failed   4.3m   LIFECYCLE_TIMESTAMP_CLOCK_SPLIT
run 5   23 passed  4 failed  10.7m   contended machine
run 6   29 passed  0 failed   4.2m   clean machine — final
```

Run 5's extra failures (`handoff`, `operator-closure`, `payout-relocation`) were
all 60 s timeouts, and the run took **2.5× longer** than run 4 on identical
code. An orphaned `next-server` from an earlier harness invocation was found
pinning a core at 98%, load average above 21. Killing it returned the gate to
4.2 m and 29/29. Those three are `INFRASTRUCTURE_FAILURE`, not regressions.

**Run 6 passing does not close §4.** `assertLifecycleOrder` runs in a
`beforeAll`, so one gate run samples the race once; the direct measurement
samples it per fixture and inverts 4 times in 6. A green gate here means the
coin landed the right way, not that the clocks agree.

## 7. Evidence

No evidence bundles were committed. `docs/04-ux/evidence` was removed from the
worktree after every run that regenerated it, and every `git add` in this slice
named explicit paths — no `git add -A`, no `git checkout --` of a retired
bundle.

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
SPECS_DELETED            = 0
PUSHED                   = no
PR_OPENED                = no
DEPLOYED                 = no
PHASE_3_4_STARTED        = no
```

## 9. What needs an owner decision

1. **`WARIX_PRICE_PLATES_NEVER_RENDER`** — a real, pre-existing WariX defect
   currently blocking exhaustive certification. Its detectors are the specs the
   retirement slice was aimed at.
2. **`LIFECYCLE_TIMESTAMP_CLOCK_SPLIT`** — one line in the protected risk
   engine.
3. **The retirement rule itself** — its first two candidate groups both fail its
   own conditions, so the tail should be re-scoped rather than applied.
