# Phase 3.2 — Product OS Master coverage update

```text
SCOPE        = the requirements Phase 3.2 actually touched. Nothing else was
               re-audited, and no row moved without a code change behind it.
MATRIX       = docs/08-delivery/WARIBA_PRODUCT_OS_MASTER_IMPLEMENTATION_MATRIX_2026-08-23.csv
               (updated in place; the pre-3.2 state is the version at 6bff95c)
WEIGHTS      = DONE 1.0 · PARTIAL 0.5 · BACKEND_ONLY 0.5 · UI_ONLY 0.25 ·
               MISSING 0 · DOCUMENTATION_ONLY 0
DENOMINATOR  = 181 (190 audited − 3 INTENTIONALLY_DEFERRED − 1 OBSOLETE −
               1 CANNOT_VERIFY − 4 BLOCKED_EXTERNAL, scored separately)
```

---

## 1. Rows that changed

Six. Each is named with what moved it.

| ID | Requirement | Before | After | What closed it |
|---|---|:--:|:--:|---|
| `POS-06.08` | Route `/support` (public) | UI_ONLY | **DONE** | The route is no longer a static page with nothing behind it. `apps/web/app/support/` serves the marketing explainer to a visitor and the real support system to a signed-in trader, from one canonical route. |
| `POS-06.22` | Route `/support` authentifiée (Hub) | MISSING | **DONE** | The Hub's Support entry reaches the Hub's own surface: Help search, requests, thread, contestations. This was the audit's single `PLACEBO_STATUS_UI`. |
| `POS-44.01` | Recherche + Help Center | UI_ONLY | **PARTIAL** | The article set moved to `apps/web/lib/help-articles.ts`, so `/aide` and authenticated Support search the same source and cannot disagree. Article **persistence and versioning remain absent** — see §3. |
| `POS-44.02` | Tickets | MISSING | **DONE** | `app.support_tickets` + `app.ticket_messages` (append-only by trigger), owner-scoped RLS, trader create/read/reply, Control queue, operator assign / reply / request-information / resolve / close, all audited. |
| `POS-44.04` | Contestations | MISSING | **DONE** | `app.contestations`, evidence linked by identifier, breach → contestation entry on the Hub banner and in the risk-detail panel, Control queue and decision surface. |
| `POS-78.01` | Breach / Dispute Control | PARTIAL | **DONE** | The queue that was missing exists. §78's full evidence set renders on one page: rule, threshold, observed value, timestamp, policy version, risk event, triggering order and fills, correlation ID — plus the trader's statement, labelled as a statement, and the decision panel. |

### Rows deliberately left alone

| ID | Status | Why it did not move |
|---|:--:|---|
| `POS-146.01` | UI_ONLY | Help surfaces still have no persistence and no versioning. Sharing the search does not change that, and the brief is explicit: the Help operational model is not DONE while article persistence is absent. |
| `POS-06.07` | UI_ONLY | Same reason. `/aide` now reads from a shared module rather than an inline array, which is a refactor, not a capability. |
| `POS-44.03` | MISSING | Trader-visible incidents. `app.operations_incidents` is still Control-only. Phase 3.4. |
| `POS-75.01`, `POS-76.01`, `POS-66.01` | MISSING / BACKEND_ONLY | Pass Review and KYC queues. Phase 3.3 — explicitly out of scope here. |
| `POS-06.19` | INTENTIONALLY_DEFERRED | `/notifications`. `ENG-031` + `UX-HUB-010` `LOCKED`. Nothing in this slice touched it. |

---

## 2. Recomputed scores

```text
PRODUCT_OS_REQUIREMENT_COVERAGE_BEFORE_3_2 = 77.1%   (139.50 / 181)
PRODUCT_OS_REQUIREMENT_COVERAGE_AFTER_3_2  = 79.6%   (144.00 / 181)

CRITICAL_PRODUCT_COMPLETENESS_BEFORE_3_2   = 77.4%   (120.00 / 155, P0+P1)
CRITICAL_PRODUCT_COMPLETENESS_AFTER_3_2    = 80.3%   (124.50 / 155, P0+P1)

P0_ONLY_BEFORE_3_2                         = 79.4%   ( 40.50 /  51)
P0_ONLY_AFTER_3_2                          = 87.7%   ( 44.75 /  51)
```

Delta: **+4.50 weighted points**, all of it from the six rows above
(+0.75 · +1.00 · +0.25 · +1.00 · +1.00 · +0.50). Five of the six are P0, which
is why the P0 figure moves furthest — the support gap was concentrated in the
critical band, exactly as the audit said.

Status distribution, before → after:

```text
DONE                   122 → 127
PARTIAL                 30 →  30
MISSING                 19 →  16
UI_ONLY                  6 →   4
BLOCKED_EXTERNAL         4 →   4
INTENTIONALLY_DEFERRED   3 →   3
BACKEND_ONLY             2 →   2
DOCUMENTATION_ONLY       2 →   2
OBSOLETE                 1 →   1
CANNOT_VERIFY            1 →   1
```

---

## 3. What is still open in this domain, said plainly

```text
HELP_ARTICLE_DATABASE   = deferred   POS-44.01 stays PARTIAL, POS-146.01 stays
                                     UI_ONLY. No help_articles table, no
                                     versioning, no CMS.
SUPPORT_ATTACHMENTS     = deferred   SEC-008 (« File uploads privés et validés »)
                                     is LOCKED and unimplemented. No control is
                                     rendered — not a disabled one, not a
                                     "bientôt disponible" badge.
NOTIFICATION_CENTER     = not added  ENG-031 + UX-HUB-010 LOCKED DEFERRED.
SUPPORT_SLA             = unmeasured OPS-012 OPEN. No response time is displayed
                                     anywhere, and the copy says why.
BREACH_REVERSAL         = absent     No corrective command exists; the decision
                                     surface offers `upheld` and
                                     `requires_escalation` only. See DEC-3.2-02.
```

None of these is scored as complete anywhere in the matrix.

---

## 4. Adversarial roles the audit listed, re-checked

Only the ones Phase 3.2 could move.

| # | Role | VETO before | VETO after | Note |
|--:|---|:--:|:--:|---|
| 3 | Prop-firm trader | **yes** | no | A breach can be contested, from the banner where the trader is standing, against the evidence WARIBA recorded. |
| 11 | Customer Support | **yes** | no | A queue, a thread, assignment, resolution and an audit trail exist. |
| 19 | Information Architect | no | no | Resolved rather than merely unblocked: the Hub's Support entry no longer lands on a marketing page. |
| 1 | Founder / CEO | **yes** | **yes** | Unchanged. Deployment (Phase 3.1) is what a tester is blocked on, not support. |
| 6 | Prop-firm Operations | **yes** | **yes** | Pass Review and KYC queues remain absent — Phase 3.3. |
| 7 / 8 / 9 | Payout Ops, Compliance, KYC | **yes** | **yes** | Unchanged; no provider exists. |

`PRIVATE_BETA_PRODUCT_READY` stays **no**. Four VETO roles remain, and none of
them is a support role.
