# WARIBA — Phase 3 Gap Contract

**Baseline:** `main` @ `8c061176ecdd521740af06c98c7b74930687133c`
**Companion:** `WARIBA_PHASE_3_SOURCE_AUDIT.md` (evidence for every claim here)

## The question

> What is actually missing before private beta?

Not "what would be nice", and not "what does the brief list". What stands between
this repository and a state where a person who is not the founder can use WARIBA
from their own machine and be supported when it goes wrong.

---

## 1. The answer in one paragraph

WARIBA's **product** is close to beta-ready and its **platform** is not. Nine of
twenty-six audited areas are complete and protected — execution, risk, lifecycle,
realtime, Control, payouts, Product OS, WariX, CI. What is missing clusters into
three groups, and they are not equal: one of them makes the other two moot.

---

## 2. Explicit verification of the brief's checklist

§4 asks each of these to be verified rather than assumed. Every row is proven in
the source audit.

| Capability | Status | Proof |
|---|---|---|
| real support tickets | **MISSING** | No table in `schema.ts` (42 tables, none for tickets) |
| support conversations | **MISSING** | No thread/message table |
| file attachments | **MISSING** | No table, no bucket policy |
| disputes | **MISSING** | No table, no workflow |
| Help article persistence/versioning | **MISSING** | Content embedded in `HelpCenterClient.tsx` (208 lines) |
| operational support queues | **MISSING** | 19 Control routes, none for support |
| server-backed WariX preferences | **MISSING** | `chart-preferences.ts` uses `localStorage` only |
| advanced indicators | **MISSING** | `CHART_INDICATOR_TYPES = ['ema','sma']` |
| external market provider | **ADAPTER READY, UNDEPLOYED** | 6 adapters exist; no environment to run them |
| email provider | **MISSING** | Repo-wide grep matches only display copy |
| payment sandbox provider | **INTERNAL ONLY** | `api/v1/checkout/sandbox-pay` is in-repo |
| KYC sandbox provider | **MISSING / BLOCKED** | `KYC_PROVIDER_INTEGRATED = false` |
| staging deployment | **MISSING** | No manifest of any kind exists |
| realtime deployment | **MISSING** | No Dockerfile / platform config |
| worker deployment | **MISSING** | No Dockerfile / platform config |
| monitoring | **PARTIAL** | Structured logs + `/health`; no aggregation or alerts |
| error tracking | **MISSING** | No Sentry/Bugsnag/Rollbar in any `package.json` |
| backups | **UNPROVEN** | Managed Supabase default; never exercised |
| restore drill | **MISSING** | `test:recovery` is a *realtime restart* test, not a restore |
| beta invite/access flow | **MISSING** | No gating beyond ordinary signup |
| waitlist persistence | **MISSING** | No table, no route |
| public launch analytics | **MISSING** | `trackEvent` writes structured logs only |
| feedback capture | **MISSING** | No table, no route |

**Nothing on this list was found already implemented.** The two closest —
market-data adapters and payment abstractions — have the *boundary* built and no
external counterpart behind it.

---

## 3. The three groups, ranked by what actually blocks beta

### Group A — Externalization. Blocks everything else.

```
No Dockerfile. No vercel.json. No railway config. No fly.toml. No Procfile.
No staging database. No deployed realtime. No deployed worker.
```

Localhost is the only environment this system has ever run in. Until that
changes, *every other Phase 3 deliverable is unreachable by a beta tester* —
a support ticket nobody can file, an indicator nobody can open, a waitlist
nobody can find.

This also means several acceptance rows are not independently achievable:
`REAL_MARKET_PROVIDER_STAGING`, `EMAIL_PROVIDER_STAGING`,
`OBSERVABILITY_READY`, `BACKUP_RESTORE_PROVEN` and `INCIDENT_DRILLS_COMPLETE`
all require Group A first.

### Group B — Supportability. Blocks *responsible* beta.

Tickets, threads, attachments, disputes, help persistence, Control queues.

A tester who hits a breach they disagree with currently has one escalation path:
message the founder. §15's SUPPORT council names that exact condition as the
failure. This is buildable entirely in-repo with no vendor dependency, which
makes it the highest-value work that is *not* blocked.

### Group C — Product completeness. Improves beta; does not gate it.

Indicators, server preferences, breach/soft-lock UX closure, homepage proof,
status page, waitlist, feedback.

Valuable, visible, and — with the exception of the lifecycle UX in 3.3 — none of
it prevents a tester from trading safely. 3.3 sits highest in this group because
it closes a *correctness-adjacent* gap: the client-visible window between a
server-side breach and the workstation reflecting it.

---

## 4. Dependency order

```
                    ┌──────────────────────────┐
                    │ 3.0  Audit + contract    │  ← this document
                    └────────────┬─────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
  ┌─────────────┐        ┌──────────────┐        ┌──────────────┐
  │ 3.1 Support │        │ 3.2 WariX    │        │ 3.3 Lifecycle│
  │  + disputes │        │  analytics   │        │  + risk UX   │
  └──────┬──────┘        └──────┬───────┘        └──────┬───────┘
         │                      │                       │
         └──────────┬───────────┴───────────────────────┘
                    ▼
            ┌───────────────┐
            │ 3.4 Public    │
            │  proof        │
            └───────┬───────┘
                    ▼
            ┌───────────────────────────┐
            │ 3.5 Staging + providers   │  ← unblocks the matrix
            └───────────┬───────────────┘
                        ▼
            ┌───────────────────────────┐
            │ 3.6 Security + reliability│  ← certification only
            └───────────────────────────┘
```

3.1–3.4 are independent of each other and of any vendor. 3.5 depends on an ADR
decision. 3.6 depends on 3.5 existing to certify.

## 5. Decisions this contract records

**D1 — Help content becomes database-backed, not a CMS.** §5.1 permits
"database-backed or repository-backed". A table with slug/version/locale/state
plus a seed migration carrying today's embedded content gives operational
editing without building an authoring tool nobody has asked for.

**D2 — Support attachments are deferred within 3.1 unless the ticket model lands
early.** §5.3 is conditional ("if attachments are supported"). Private-storage
policy, MIME allow-listing and malware assumptions are real work, and a beta
tester can describe a problem in text. Tickets and threads first; attachments
only if 3.1 stays coherent.

**D3 — Volume-based indicators are excluded.** §6.1 forbids labelling tick count
as volume. `market_bars` carries no trustworthy centralized volume semantic, so
OBV/VWAP/Volume Profile are out of scope until it does.

**D4 — Indicator output is display-only, enforced structurally.** §6.4 requires
indicators never reach execution, risk, ledger or breach. They live in
`apps/web/app/(trade)/` and the risk engine lives in `packages/database` — the
package boundary already prevents it, and 3.2 must not weaken that.

**D5 — Payments and KYC stay adapter-plus-ADR unless a vendor is chosen.** §9.6
explicitly permits this. Fabricating a provider is worse than declaring the
dependency.

**D6 — `PRIVATE_BETA_READY` cannot be `yes` from in-repo work alone.** Four rows
require an external account WARIBA must own: a hosting platform, a market-data
key, an email provider, and a managed database. This contract states that up
front so the final report is not a surprise.

## 6. What "done" means for each slice

| Slice | Done when |
|---|---|
| 3.0 | Audit + contract committed; plan reconciled against source ✅ |
| 3.1 | A tester can file a ticket, get a reply, and an operator can answer it with evidence |
| 3.2 | Seven indicators compute correctly against hand-checked fixtures, configure through typed validation, render in panes, and survive a device change |
| 3.3 | A breach reaches an open workstation without a refresh, and states its reason persistently |
| 3.4 | The public site proves the product truthfully and captures interest |
| 3.5 | A URL exists that is not localhost, running web + realtime + worker + managed DB |
| 3.6 | Restoration proven, drills recorded, security audited |

## 7. Honest position on the acceptance matrix

Of the 44 rows in §11, this contract expects at completion:

- **~30 achievable in-repo** (support, disputes, indicators, preferences,
  lifecycle UX, public proof, waitlist, feedback, accessibility, no-fake-data)
- **~10 require Group A** and become achievable the moment staging exists
- **4 require a vendor decision** and are honestly `deferred by ADR` unless one
  is made

`PRIVATE_BETA_READY = yes` is reachable, but not without WARIBA provisioning
external accounts. That is a business decision, not an engineering gap, and this
contract will not pretend otherwise.
