---
version: "1.0"
date: "2026-08-25"
phase: "3.3.2 — Product Truth + Certification Closure"
baseline_sha: "ae5f8fcec2dcf259f337ba48253358d29b021f2a"
candidate_sha: "c74366eaa2e41767b44a7143804afe90a4b392e5"
pushed: no
pr_opened: no
merged: no
deployed: no
---

# WARIBA Phase 3.3.2 — Product Truth + Certification Closure

## 1. Verdict

```text
PHASE_3_3_2_READY = PASS WITH ACTIONS
```

Every P0 in the brief is closed and measured. Two findings remain open and are
named in §7; neither is a financial-truth or authorization defect, and neither
was introduced by this slice.

## 2. What was actually wrong

The engine was never the problem. Three separate surfaces divided the realised
balance by the buffer floor and printed the result as payout progress, so a
Performance account that had never placed an order read **91 %**. The
integration suite did not miss it — it *asserted* it, with a comment explaining
that a fresh account is "already ~90.9 % of the way to the floor before a
single trade". Correct arithmetic, wrong product.

The rest of the trader-facing list was the same shape: a bar labelled
"Objectif" on a programme whose policy publishes no objective; a timeline that
read the latest finalized snapshot rather than the one that closed the
objective's day, so "Journée clôturée 24 août" could sit above "Objectif
atteint 25 août"; a finished evaluation still rendering live risk budgets; the
one control the ready screen exists for sitting 2 000 px below the fold;
"plancher" meaning both the level that ends an account and the level that
gates a payout; "WARIBA Review" naming both a programme state and the routine
review of a request; and an identity card telling a trader to trigger a
verification that was already under review.

## 3. Changes

**Financial truth.** `computeBufferBuildProgress` (domain) owns the calculation:
built = max(0, realised − nominal), required = floor − nominal, clamped. The
Hub, the accounts list, the Payout Center and the payout lifecycle all read it,
so they cannot drift. The bar carries its label and the two figures it came
from. The WARIBA ONE mission title reads its objective from the attached policy
instead of spelling out "10 %". (PERF-037)

**Lifecycle truth.** The handoff takes the finalization at or after the
objective and shows nothing when no such day has closed; every stamp names UTC;
a passed evaluation renders as an archive with its result and its successor;
the Performance account becomes the default context. (UX-HUB-012)

**Terminology.** "Plancher" is the Maximum Loss level and nothing else; the
payout level is "seuil du buffer". "WARIBA Review" is the programme state after
N payouts; a request's review is "Examen de la demande".

**Identity.** The trader's state reads the open case. A positive verification
requires an external reference — it sets the flag every payout gate reads.
(ENG-034)

**Actuarial.** The mutation returns the canonical row it wrote and the panel
renders that. No timer, no optimistic value.

**Accessibility.** The "serious" contrast violation was the entry animation
measured mid-fade: axe composites opacity, so `--wariba-color-bone-50` (14:1 at
rest) read as `#272a33` at 1.26:1. No token change could have fixed it. Reduced
motion now zeroes animation *delays* as well as durations — a 275 ms wait on
invisible text is motion by another name — and the axe passes measure the
resting state.

## 4. Certification infrastructure

`pnpm preflight` fails closed on a wrong Node major or an unhealthy Supabase and
prints `INFRASTRUCTURE_FAILURE`, so a thirty-minute run cannot end by blaming
product code for a contended machine. A campaign builds once and serves once,
from the real standalone server a container would run. Three tiers:
`test:gate`, `test:certification:product`, `test:certification:exhaustive`.

## 5. Test architecture

The Support suite is three: functional, RBAC, visual. The RBAC half runs in
14 s with no screenshots; all three together take ~65 s where the single
narrative timed out at 300 s. **SUPPORT_PRODUCT_REGRESSION = 0** — the product
worked the whole time.

`scenario-invariants.ts` refuses to hand a test an impossible account, and
`product-truth.spec.ts` reads the canonical figures first, then asserts the
screen agrees.

## 6. Results

```text
PREFLIGHT                     pass    Node 24, DB 22ms, Auth 22ms, Realtime 21ms
FAST GATE                     pass    format, lint, typecheck, boundaries, secrets, unit
UNIT                          pass    1 284 tests
DB ASSERTIONS                 pass    24
INTEGRATION (full)            pass    270
RLS (full)                    pass    68
E2E @critical                 pass    24 / 24
RECOVERY                      pass    (flaked once, passed on rerun)
FAILOVER                      pass    takeover 4 435 ms
LOAD                          pass    snapshot p95 534 ms
```

## 7. Open findings

**WARIBA_CLIENT_NAVIGATION — client-side navigation intermittently not
applied.** A Server Action redirect to the same path with a query added was
applied about one time in three; a queue link's soft navigation aborts and
leaves the router unable to make the next one either. The write always lands
and a reload always shows the right state, so no data is wrong — but a trader
sees nothing happen. Worked around where it was trader-visible (the
acknowledgement now redirects to a different route, measured 4/4) and asserted
around in tests via `clickThrough`. **Root cause not established.** It reproduces
on `next start` as well as the standalone server, so it is not the harness.

**EXHAUSTIVE_CERTIFICATION not run.** Level 3 — the full Playwright suite and
every screenshot campaign — was not executed in this slice. Evidence was not
regenerated from the candidate SHA.

## 8. Not reopened

Risk math, daily-finalization authority, Maximum Loss mechanics, EOD trailing,
provisioning idempotency, parent/child uniqueness, RLS, RBAC, breach
immutability, compensating correction, WariX execution. No migrations. No
database changes.

```text
DATABASE_CHANGES = none
```
