# WARIBA Phase 3.2 — Support + Contestations

```text
BRANCH   = feat/wariba-phase-3-private-beta-completion
BASELINE = fa6c290 (Phase 3.1A complete)
DATE     = 2026-08-23
SATISFIES = UX-010 LOCKED — « Support et contestation intégrés au produit »
```

The Product OS Master audit put Support at 6 % and Disputes at 0 % — the two
weakest domains in the product, and two of the four `VETO` findings a beta
tester would hit. A trader whose account was terminated could read the evidence
and buy another one. This slice gives them the third path.

---

## 1. What a remote trader can now do

Every step below is a real write to a real table, reachable from a phone.

```text
1. search the help                 /support · shared article set, same answers as /aide
2. open a request                  /support/nouveau · category, owned account, subject, message
3. see their requests              /support · WRB-##### · state · age
4. continue the conversation       /support/demandes/{ref} · append-only thread
5. contest an eligible decision    banner → /support/contestations/nouvelle
6. read the authoritative evidence rule · threshold · observed · policy · transition · order · fills
7. receive an operator response    same thread, no second channel
8. read the outcome                /support/contestations/{ref}
```

None of it requires the founder to open Supabase.

---

## 2. Completion matrix

```text
PHASE_3_2_SUPPORT_DISPUTES_READY = yes

SUPPORT_TICKETS_SCHEMA_READY       = yes   app.support_tickets, 5 statuses, WRB-#####
SUPPORT_MESSAGES_SCHEMA_READY      = yes   app.ticket_messages, append-only by trigger
SUPPORT_RLS_READY                  = yes   select-own policies + no write grant; 6 RLS tests
SUPPORT_TRADER_CREATE_READY        = yes   /support/nouveau + createSupportTicketAction
SUPPORT_TRADER_THREAD_READY        = yes   /support/demandes/{ref} + reply composer
SUPPORT_CONTROL_QUEUE_READY        = yes   /control/support, filters status/category/age/assignment
SUPPORT_OPERATOR_REPLY_READY       = yes   reply + request-information, audited
SUPPORT_OPERATOR_RESOLUTION_READY  = yes   resolve / close, reason required, audited

CONTESTATION_SCHEMA_READY          = yes   app.contestations, CTS-#####
BREACH_CONTESTATION_READY          = yes   Hub banner + risk-detail panel → contestation
CONTESTATION_EVIDENCE_LINK_READY   = yes   identifiers only; figures read live
CONTESTATION_CONTROL_QUEUE_READY   = yes   /control/contestations + full §78 evidence
CONTESTATION_DECISION_READY        = yes   upheld / requires_escalation, reason + audit
ORIGINAL_EVIDENCE_IMMUTABLE        = yes   proven by before/after snapshot in integration test

CROSS_USER_SUPPORT_ACCESS          = 0
CROSS_USER_CONTESTATION_ACCESS     = 0

SUPPORT_MOBILE_390_READY           = yes
SUPPORT_MOBILE_320_READY           = yes   4 routes, 0 horizontal overflow

SUPPORT_ATTACHMENTS                = deferred
HELP_ARTICLE_DATABASE              = deferred / existing static model
NOTIFICATION_CENTER_ADDED          = no

PLACEBO_SUPPORT_ACTIONS            = 0
FAKE_SUPPORT_VALUES                = 0

PRODUCT_OS_REGRESSION              = no    (one pre-existing red test, §7)
WARIX_APPLICATION_FILES_MODIFIED   = 0
```

### How the last four were established, not assumed

**`PLACEBO_SUPPORT_ACTIONS = 0`** — every control rendered performs a real
write. There is no attachment picker, no priority selector, no "annuler la
décision" button, and no disabled control standing in for a missing capability.
The one place an operator might expect an option and not find it — reversing a
breach — carries an `Alert` explaining that no such command exists, rather than
a greyed-out button.

Grepped rather than asserted. Across `app/support/`, `control/support/` and
`control/contestations/`:

```text
type="file" | upload | pièce jointe | attachment   → 4 matches, all doc comments
                                                     explaining the absence
bientôt | coming soon | à venir | prochainement    → 1 match, inside one of them
notification (any case)                             → 0 matches
```

The same shape the audit found for testimonials: the only occurrences are
comments saying why the thing is not there.

**`FAKE_SUPPORT_VALUES = 0`** — no SLA, no response-time estimate, no ticket
counter, no "temps de réponse moyen". Every figure on a support surface is a
timestamp difference or a value read from `app.risk_violations`. The only two
matches for a response-time phrase are the two sentences that state no delay is
published — `OPS-012` (support SLA) is `OPEN` and the copy says so.

**`WARIX_APPLICATION_FILES_MODIFIED = 0`** — `git status` shows zero changes
under `apps/web/app/(trade)`. WariX's help panel already linked to `/support`;
that link now leads to the real system because the route changed, not because
WariX did.

**`PRODUCT_OS_REGRESSION = no`** — the full unit suite, the full integration
suite, the full RLS suite, pgTAP and the Control E2E suite all pass. One test
in `hub.spec.ts` is red and was red before this slice; §7 shows the experiment
that established that.

---

## 3. The invariant this slice turns on

> A contestation MUST NEVER mutate historical financial truth.

`@wariba/domain/state-machines.ts`:

```ts
breached: [],   // terminal — no outbound transition exists
```

There is no authorized corrective command anywhere in the platform, so Phase
3.2 **fails closed**. An operator records one of two outcomes:

| Outcome | What it means | What it changes |
|---|---|---|
| `upheld` | The evidence confirms the decision. | Nothing. |
| `requires_escalation` | Beyond what an operator may decide alone. | Nothing. |

`overturned` exists in the column's check constraint so a future corrective
transition will not need a migration to alter it, and
`recordContestationDecisionInTransaction` **refuses it** with an explicit
message. No UI renders it.

Proven rather than asserted — `packages/database/tests/support.integration.test.ts`
snapshots `app.trading_accounts`, `app.risk_violations`,
`app.account_state_transitions` and `app.trading_ledger_entries` before a
decision and compares them after:

```ts
expect(after.account).toEqual(before.account);
expect(after.violation).toEqual(before.violation);
expect(after.transitions).toEqual(before.transitions);
expect(after.ledger).toEqual(before.ledger);
expect(after.account.status).toBe('breached');
```

Recorded as `UX-SUPPORT-002` `LOCKED`.

---

## 4. Model

```text
app.support_tickets     public_id WRB-#####  · user · account? · category(10)
                        · subject · status(5) · priority (operator-only)
                        · assigned_staff_id · correlation_id · timestamps
                        + constraint: status and resolution timestamps agree

app.ticket_messages     ticket · actor_type(trader|staff|system) · body
                        + constraint: actor columns match actor_type
                        + trigger: UPDATE always refused; DELETE refused while
                          the parent ticket exists

app.contestations       public_id CTS-##### · ticket · account? · target_type
                        · target_id · status(6) · reason_category(5)
                        · trader_statement · decision? · decision_reason?
                        · evidence_ref (identifiers only) · reviewer · timestamps
                        + constraint: a decided contestation carries decision,
                          reason, reviewer and resolved_at, or it is not decided
                        + partial unique index: one live contestation per target
```

Five ticket statuses and six contestation statuses. No status inflation.

### Evidence is referenced, never copied

`evidence_ref` holds seven identifiers and no figures — asserted as an exact
key set in the integration test, because a substring check would pass for a
reference that had quietly grown a `thresholdValue` field. Threshold, observed
value, policy version and timestamps are read live from `app.risk_violations`
and its neighbours on every render, through **one** projection
(`projectContestationEvidence`) shared by the trader's page and Control's. A
dispute where the two sides read different renderings of one event cannot be
settled.

---

## 5. Permissions

```text
support.read     support · admin · super_admin
support.reply    support · admin · super_admin
support.assign   support · admin · super_admin
support.resolve  support · admin · super_admin
dispute.read     support · risk · compliance · admin · super_admin
dispute.review   risk · compliance · admin · super_admin
dispute.resolve  risk · compliance · admin · super_admin
```

Support answers questions; risk and compliance decide disputes. Support can
*read* a contestation — a first-line operator has to be able to say where one
stands — but cannot decide one, which would be marking its own homework.

Constitution §132 is asserted against the real permission table rather than a
list maintained beside it: `support` holds none of `payout.approve`,
`payout.reject`, `payout.settle`, `payout.reverse`, `treasury.modify`,
`actuarial.modify`, `commercial_product.modify`, `integrity_hold.place`,
`integrity_hold.clear`, `sandbox_kyc.modify`, `audit_evidence.view`,
`dispute.review` or `dispute.resolve`. `finance` holds none of the seven new
permissions at all.

---

## 6. Audit events

Written in the same transaction as the mutation they describe, so the trail can
never be missing the event it records.

```text
support_ticket.assigned                 support.assign
support_ticket.replied                  support.reply
support_ticket.information_requested    support.reply
support_ticket.resolved                 support.resolve
support_ticket.closed                   support.resolve
contestation.review_started             dispute.review
contestation.information_requested      dispute.review
contestation.decision_recorded          dispute.resolve
```

Each carries actor, role, permission, target, before, after, reason,
correlation id and timestamp. The decision event's `after` also records
`financialStateMutated: false` — stated in the record rather than inferred by a
later reader.

Message bodies are deliberately **not** copied into audit reasons: the thread is
append-only and is where the words live; duplicating them into a table with
different readers and a different retention posture buys no investigative gain.

---

## 7. Tests — proportional, and what they prove

```text
pnpm test:fast            format · lint · typecheck · boundaries · secrets · unit  PASS
pnpm db:test              pgTAP, 24 assertions (was 18)                            PASS
pnpm test:integration:full 25 files · 210 tests (incl. 15 new support tests)       PASS
pnpm test:rls:full         9 files · 49 tests (incl. 6 new support RLS tests)      PASS
support unit               19 tests                                                PASS
support E2E                5 tests                                                 PASS
control E2E                60 tests — regression on the two new Control areas      PASS
supabase db reset          40 migrations replay from empty                         PASS

pnpm test:e2e:auth         4 passed · 1 FAILED — pre-existing, see below
```

### The one red test, and why it is not this slice

`hub.spec.ts:21` — « shows account state, mission, and risk within a few
seconds of loading » — fails on:

```ts
await expect(page.getByText(/Perte quotidienne restante/).first()).toBeVisible();
```

That string exists in exactly one file in the repository,
`apps/web/app/(platform)/comptes/AccountCard.tsx`, which renders on `/comptes`.
The Hub dashboard labels the same figure « Risque jour restant » (the telemetry
strip) and « Perte quotidienne » (the risk meter). The assertion and the label
drifted apart in an earlier slice.

Established rather than argued: the three Hub files Phase 3.2 touches
(`page.tsx`, `LifecycleBanner.tsx`, `HubRiskDetail.tsx`) were stashed and the
test re-run against the baseline — **it fails identically**. `hub.spec.ts` is
unmodified by this slice, and none of the components that could render the
string is touched.

Deliberately **not** fixed here. It is a one-line assertion belonging to the
Hub's own slice, and folding an unrelated repair into the Phase 3.2 commit
would misattribute it. It is a real red gate and should be picked up next.

The brief's required coverage, mapped to where it lives:

| Required | Where |
|---|---|
| create own ticket | `support.integration` — creates a ticket with its opening message |
| read own ticket | same |
| cannot read another trader's ticket | `support.integration` + `support-rls` + E2E |
| append message | `support.integration` — the trader reply that reopens a request |
| cannot mutate another trader's thread | `support.integration` — `SupportOwnershipError`, message count unchanged |
| operator assignment | `support.integration` — `open` → `under_review` |
| resolve ticket | `support.integration` — full assign → reply → answer → resolve |
| create breach contestation | `support.integration` + E2E |
| duplicate contestation prevented | `support.integration` — `DuplicateContestationError`; E2E shows the locked option |
| evidence linkage | `support.integration` — exact `evidence_ref` key set; live figures |
| operator decision | `support.integration` |
| decision does not rewrite original evidence | `support.integration` — before/after snapshot of four financial tables |
| RLS isolation | `support-rls` — 6 tests including anon refusal and every write path |

E2E, one narrative rather than one suite per surface:

```text
1  trader creates a support request               ✓
2  trader sees it in My Requests                  ✓
3  staff sees it in Control                       ✓
4  staff replies                                  ✓
5  trader sees the reply (as "WARIBA Support")    ✓
6  breached trader opens a contestation           ✓
7  Control opens the identical evidence           ✓  threshold string compared across both pages
8  another trader cannot access either            ✓
9  mobile 390 support flow                        ✓
10 mobile 320 no-overflow across 4 routes         ✓
```

---

## 8. Visual evidence

`docs/04-ux/evidence/wariba-phase-3-2-support/`

```text
support-home-390            support-ticket-390         support-320
support-desktop             support-ticket-desktop
breach-contestation-entry   contestation-detail-trader
control-support-queue       control-ticket-detail      control-contestation-detail
```

Ten captures, taken by the E2E run rather than by hand.

---

## 9. Coverage

```text
PRODUCT_OS_REQUIREMENT_COVERAGE_AFTER_3_2 = 79.6%   (was 77.1%)
CRITICAL_PRODUCT_COMPLETENESS_AFTER_3_2   = 80.3%   (was 77.4%)
P0_ONLY_AFTER_3_2                         = 87.7%   (was 79.4%)
```

Six requirement rows changed. Full derivation, including the rows deliberately
left alone, in `WARIBA_PHASE_3_2_COVERAGE_UPDATE.md`.

`PRIVATE_BETA_PRODUCT_READY` stays **no** — four VETO roles remain, none of
them a support role.

---

## 10. What is deliberately still missing

```text
SUPPORT_ATTACHMENTS   deferred   SEC-008 (« File uploads privés et validés »)
                                 is LOCKED and unimplemented. No control is
                                 rendered — not a disabled one, not a badge.
HELP_ARTICLE_DATABASE deferred   No help_articles table, no versioning, no CMS.
                                 POS-44.01 is PARTIAL and POS-146.01 stays
                                 UI_ONLY because of it.
NOTIFICATION_CENTER   not added  ENG-031 + UX-HUB-010 LOCKED DEFERRED. No bell,
                                 no counter, no /notifications. Ticket state is
                                 visible inside Support and nowhere else.
SUPPORT_SLA           unmeasured OPS-012 OPEN. No response time is displayed.
STAFF_INTERNAL_NOTES  absent     A note attached to a support thread is a second,
                                 invisible conversation about a person. When one
                                 is needed it should be a modelled, audited
                                 object, not a text column added quietly.
BREACH_REVERSAL       absent     See §3.
```

---

```text
PHASE_3_2_SUPPORT_DISPUTES_READY = yes
NEXT_RECOMMENDED_SLICE = 3.3 Operator Closure
```
