# WARIBA Phase 3.2 — Support + Contestations

```text
BRANCH        = feat/wariba-phase-3-private-beta-completion
BASELINE_SHA  = fa6c290 (Phase 3.1A complete)
DATE          = 2026-08-23
SCOPE         = UX-010 LOCKED — « Support et contestation intégrés au produit »
```

Written before any code was changed, as the brief requires. It records what the
source already holds, what is genuinely absent, and the decisions that had to be
taken before the first line was written.

---

## 1. Source audit — what already exists

### Support and Help

| Thing | Where | Verdict |
|---|---|---|
| Public `/support` | `apps/web/app/(public)/support/page.tsx` | Real page. Static. Routes to `/aide` and `/login`. No system behind it. |
| Help Center | `apps/web/app/(public)/aide/HelpCenterClient.tsx` | 20 FAQs **hardcoded inside a client component**, client-side filter. |
| Hub Support nav | `(platform)/hub-destinations.tsx` → `/support` | Points at the *public static page*. The audit's single `PLACEBO_STATUS_UI`. |
| `safeSupportReference` | `apps/web/lib/support-reference.ts` | Correlation-id guard for error screens. Reused, not duplicated. |
| Tickets / messages / disputes | — | **Absent.** 0 of 40 tables. |

### Evidence that already exists and must be referenced, never copied

| Evidence | Table | Note |
|---|---|---|
| Breach / risk decision | `app.risk_violations` | rule_code, severity, consequence, threshold_value, observed_value, policy_version_id, account_daily_snapshot_id, account_state_transition_id, trigger_event_type/id, price_snapshot, occurred_at |
| State transition | `app.account_state_transitions` | from/to/reason/occurred_at |
| Day context | `app.account_daily_snapshots` | daily_reference, floors, EOD figures |
| Orders / fills | `app.trade_orders`, `app.fills` | linked through `risk_violations.trigger_event_id` when the trigger was a trade order |
| Operator projection | `packages/database/src/control-risk-investigation.ts` | `loadRiskInvestigation` already assembles this for Control |

### Platform capabilities reused rather than rebuilt

- **RBAC** — `packages/database/src/staff.ts`: `ControlPermission` union +
  `CONTROL_PERMISSION_REQUIREMENTS` + role hierarchy. Extended, not replaced.
- **Control areas** — `packages/application/src/control-navigation.ts`:
  navigation and authorization read from one table. Two rows added.
- **Sensitive-action gate** — `authorizeSensitiveStaffAction` (RBAC + rate
  limit in one call), backed by `app.staff_action_rate_limits`.
- **Audit** — `recordStaffAuditEvent` → `audit.audit_events`
  (actor/role/permission/action/target/before/after/reason/correlation).
- **RLS convention** — `enable row level security` + `select … using (user_id =
  auth.uid())` + `grant select to authenticated`; every write goes through a
  server command on the service connection. Copied verbatim from
  `app.price_alerts`.
- **Boundary** — `apps/web` may not import `@wariba/database`
  (`scripts/check-boundaries.mjs`). All new reads/writes are re-exported through
  `@wariba/application`.

---

## 2. Decisions taken before coding

### DEC-3.2-01 — one `/support` route, two audiences

The Constitution lists `/support` in **both** the Public (§6) and Trader Hub
(§6) canonical route sets. Next.js cannot resolve two pages to one path, so
`(public)/support` and `(platform)/support` cannot both exist.

Resolution: `/support` moves **out of both route groups** to `apps/web/app/support/`
and its layout picks the shell from the session — `PublicChrome` for a visitor,
`HubShell` for a signed-in trader. The public explainer is preserved as a
component and rendered for the anonymous case. One canonical route, both
audiences, no duplicated ticketing.

Sub-routes (`/support/nouveau`, `/support/demandes/*`, `/support/contestations/*`)
are added to `middleware.ts`'s protected prefixes as `/support/` — the trailing
slash keeps `/support` itself public.

### DEC-3.2-02 — no breach reversal exists, so none is offered

`packages/domain/src/state-machines.ts`:

```ts
breached: [],   // terminal — no outbound transition exists
```

There is no authorized corrective command anywhere in the platform. Per the
brief's §5 fail-closed rule, the Phase 3.2 operator decision surface offers
exactly two outcomes:

```text
upheld                 — the original decision stands
requires_escalation    — outside what an operator may decide alone
```

`overturned` exists in the check constraint so the future corrective transition
does not need to alter it, and the command layer **rejects it explicitly** with
`No authorized corrective command exists…`. No button renders it. A contestation
never writes to `trading_accounts`, `risk_violations`, `trading_ledger_entries`
or any snapshot — the decision is recorded beside the evidence, never over it.

### DEC-3.2-03 — evidence is referenced, never copied

`app.contestations` stores `target_type` + `target_id` and an
`evidence_ref` jsonb holding **identifiers only** (risk violation id, policy
version id, snapshot id, transition id, correlation id). Every figure a trader
or an operator sees is read live from the authoritative row at render time. The
trader's `trader_statement` is stored as what it is — a statement, labelled as
such in both UIs, never as evidence.

### DEC-3.2-04 — messages are append-only in the database, not by convention

`app.ticket_messages` carries a trigger that rejects every `UPDATE`, and rejects
a `DELETE` while the parent ticket still exists. A cascade from deleting the
ticket itself is allowed (test teardown), because at that point there is no
conversation left to falsify. This holds against the service connection too, so
"staff cannot silently rewrite a trader message" is a database guarantee rather
than a code review.

### DEC-3.2-05 — Help stays repository-backed

The FAQ set moves from inside `HelpCenterClient.tsx` to
`apps/web/lib/help-articles.ts` so `/aide` and Support search read the same
source. No `help_articles` table, no CMS.

```text
HELP_ARTICLE_DATABASE = deferred (existing static model, now shared)
```

### DEC-3.2-06 — deferrals honoured

```text
SUPPORT_ATTACHMENTS   = deferred   (private storage policy, MIME enforcement,
                                    scanning, abuse surface — SEC-008 is LOCKED
                                    and unimplemented; no fake button rendered)
NOTIFICATION_CENTER   = not added  (ENG-031 + UX-HUB-010 LOCKED DEFERRED)
```

Ticket state is visible inside Support and nowhere else. No bell, no counter, no
`/notifications`.

---

## 3. Ownership map

```text
/support (anonymous)     explainer → /aide, → /login
/support (authenticated) Help search · Nouvelle demande · Mes demandes ·
                         Contestations
/support/demandes/{ref}  conversation + next action
/support/contestations   contestation detail + live authoritative evidence
/control/support         operator ticket queue + detail
/control/contestations   operator contestation queue + evidence + decision
WariX                    unchanged — contextual help only, links out to /support
```

---

## 4. Model

```text
app.support_tickets      public_id WRB-#####, user, optional account, category,
                         subject, status(5), priority, assignment, correlation
app.ticket_messages      append-only, actor_type trader|staff|system
app.contestations        public_id CTS-#####, ticket, target_type/target_id,
                         reason_category, trader_statement, evidence_ref,
                         decision, decision_reason, reviewer, correlation
```

Statuses — five for tickets (`open`, `waiting_for_user`, `under_review`,
`resolved`, `closed`), six for contestations (`open`, `under_review`,
`needs_information`, `upheld`, `overturned`, `closed`). No status inflation.

A partial unique index enforces one live contestation per target:

```sql
unique (target_type, target_id) where status in ('open','under_review','needs_information')
```

---

## 5. Permissions added

```text
support.read     support · admin · super_admin
support.reply    support · admin · super_admin
support.assign   support · admin · super_admin
support.resolve  support · admin · super_admin
dispute.read     support · risk · compliance · admin · super_admin
dispute.review   risk · compliance · admin · super_admin
dispute.resolve  risk · compliance · admin · super_admin
```

Support answers tickets; it does not decide contestations. Neither permission
grants payout approval, ledger mutation, policy editing or risk override —
verified by a test that asserts the *absence* of those grants for the support
role.

---

## 6. Test plan (proportional)

Targeted only. No full certification run.

- RLS: cross-user read of tickets, messages, contestations; anon read; write
  attempt from `authenticated`.
- Integration: create, read, reply, status gating, operator assignment,
  resolve, contestation creation, duplicate prevention, evidence linkage,
  operator decision, `overturned` rejected, original evidence unchanged
  before/after a decision.
- Unit: status/category label maps, thread permission rules, query parsing.
- E2E: trader creates → sees → staff sees in Control → staff replies → trader
  sees reply → breached trader opens contestation → Control opens the same
  evidence → another trader gets 404 → mobile 390 flow → 320 no-overflow.
