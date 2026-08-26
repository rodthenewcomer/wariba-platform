# WARIBA Phase 3.1B — External Account & Credential Checklist

**This is the list you need to provide.** Nothing in 3.1B can start without it,
and nothing in 3.1A needed any of it.

Every row maps to a Decision Log entry that is currently `OPEN`. These are
business selections, not engineering work — Phase 3 cannot close them by writing
code, which is exactly why 3.1B was split out of 3.1A and moved after the
product slices.

---

## How to read the columns

- **Decision** — the `OPEN` Decision Log ID this unblocks. Closing it means
  recording a `LOCKED` entry with the choice.
- **Blocks** — what stays impossible until it exists.
- **Needed for beta?** — whether a private beta can responsibly start without it.

---

## 1. Web hosting — `ARCH-023`

| | |
|---|---|
| **Decision** | `ARCH-023` `OPEN` — « Provider web final. À sélectionner avant staging. » |
| **What I need** | Account + project, or a container registry if you prefer the Docker path |
| **Credentials** | Deploy token / CLI login; custom domain if not using the default |
| **Blocks** | `WEB_STAGING_READY`, `STAGING_DEPLOYED`, every E2E against a real URL |
| **Needed for beta?** | **Yes — hard blocker** |

`apps/web/Dockerfile` (3.1A) means a container platform works. `output: 'standalone'`
does not preclude a managed Next platform building from source instead. **Both
paths stay open** — you are not locked in by 3.1A.

## 2. Container hosting — `ARCH-024`

| | |
|---|---|
| **Decision** | `ARCH-024` `OPEN` — « Provider conteneurs Realtime/Worker. À comparer coût/latence/WebSocket. » |
| **What I need** | Account with **long-lived WebSocket support** and configurable SIGTERM grace |
| **Credentials** | Deploy token; two services (realtime, worker) |
| **Blocks** | `REALTIME_STAGING_READY`, `WORKER_STAGING_READY` |
| **Needed for beta?** | **Yes — hard blocker** |

Two platform requirements the comparison must check, both discovered while
building 3.1A:

1. **WebSocket support with no idle timeout** below the market feed's cadence.
   Some platforms silently close idle connections; WariX would reconnect in a
   loop.
2. **A SIGTERM grace period of ≥ 30 s.** Realtime releases its leadership lease
   on SIGTERM (verified in 3.1A). A platform that sends SIGKILL immediately
   forfeits that and reimposes the full `LEADER_LEASE_DURATION_MS` wait on every
   deploy.

## 3. Supabase staging — (no OPEN decision; provider already `LOCKED`)

| | |
|---|---|
| **Decision** | Supabase is already the chosen database. Only the *staging project* is missing. |
| **What I need** | A **second, separate** Supabase project — never the production one |
| **Credentials** | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (pooled) |
| **Blocks** | `MANAGED_DATABASE_STAGING_READY`, and every other row — all three services need it |
| **Needed for beta?** | **Yes — hard blocker** |

⚠️ **The current `.env.local` points at `ubcolxyjfrqmjtxjkvur`, which no longer
exists** (NXDOMAIN on the DB host, "tenant not found" from the pooler). All work
since has run against local Supabase. A new project is required regardless of
staging.

The 39 migrations apply cleanly to an empty project — verified locally this
session.

## 4. Market data — `DATA-011` / `OPEN-DATA-001`

| | |
|---|---|
| **Decision** | `DATA-011` `OPEN` *BLOCKED BY CREDENTIAL* · `OPEN-DATA-001` display rights |
| **What I need** | An API key for **one** of: FCS, Twelve Data, OANDA — adapters exist for all three |
| **Credentials** | `FCS_API_KEY` **or** `TWELVE_DATA_API_KEY` **or** `OANDA_API_TOKEN` |
| **Blocks** | `REAL_MARKET_PROVIDER_STAGING` |
| **Needed for beta?** | **No** — `replay` is honest and labelled. Required before public. |

**Two separate questions, and the second is the harder one:**

1. *Do we have a key?* — commercial, quick.
2. *Do we have the right to display it to end users?* — `OPEN-DATA-001`. A key
   for backtesting is not a licence to show quotes to traders.

Realtime already ships a safety override (`MARKET_DATA_REPLAY_MODE=true`) that
forces replay regardless of `MARKET_DATA_PROVIDER`, so a real provider can be
configured and reviewed **before** it is allowed to emit. Use it.

## 5. Transactional email — `ARCH-027`

| | |
|---|---|
| **Decision** | `ARCH-027` `OPEN` — « Provider email. À choisir avant bêta réaliste. » |
| **What I need** | Account + **verified sending domain** (this takes DNS time — start early) |
| **Credentials** | API key; `EMAIL_FROM` address; SPF/DKIM records on `wariba.app` |
| **Blocks** | Beta invitations, support ticket notifications, lifecycle emails |
| **Needed for beta?** | **Yes, in practice** — see below |

Auth email (verification, password recovery) already works through Supabase
Auth. What has no path today is **everything else**: a support reply nobody is
told about is a support system that does not work.

**Domain verification is the long pole.** DNS propagation and provider review
can take 24–72 h. If you start one item on this list today, start this one.

## 6. Payment sandbox — `OPEN-PAYMENT-001`

| | |
|---|---|
| **Decision** | `OPEN-PAYMENT-001` — Production PSP |
| **What I need** | A **sandbox** account only. No production PSP, no real money. |
| **Credentials** | Sandbox public + secret key; webhook signing secret |
| **Blocks** | `PAYMENT_SANDBOX_READY` |
| **Needed for beta?** | **No** — §9.6 permits ADR-deferral, and the in-repo sandbox works |

The adapter boundary (`packages/adapters/src/payment-provider.ts`), webhook
verification and idempotency all exist. For a West-Africa-first product the
realistic candidates are mobile-money-capable (Paystack, Flutterwave,
CinetPay) — worth choosing on **market fit**, not on integration ease, because
swapping later means re-testing the whole checkout path.

## 7. KYC sandbox — `OPEN-KYC-001`

| | |
|---|---|
| **Decision** | `OPEN-KYC-001` — Real KYC provider |
| **What I need** | Sandbox account with **African document coverage** |
| **Credentials** | API key; webhook secret; verification-flow ID |
| **Blocks** | `KYC_SANDBOX_READY`, the first financially-eligible payout (D7) |
| **Needed for beta?** | **No** — beta testers will not reach a payout |

`KYC_PROVIDER_INTEGRATED = false` and **no adapter file exists** — this is the
one provider with no abstraction yet, so it is more work than the others.

Document coverage is the selection criterion that matters: a provider strong on
EU/US passports and weak on Ivorian, Senegalese or Cameroonian national IDs is
the wrong provider for this market regardless of price.

## 8. Payout provider — `OPEN-PAYOUT-001`

| | |
|---|---|
| **Decision** | `OPEN-PAYOUT-001` · also `OPS-014` (real treasury/ledger process) |
| **What I need** | **Nothing yet** |
| **Credentials** | — |
| **Blocks** | Real payouts only |
| **Needed for beta?** | **No — and deliberately so** |

`PROD-003` is `LOCKED`: WARIBA Performance stays **simulated in V1**. A beta
tester cannot reach a real payout by design. `OPS-014` (real treasury process)
is `OPEN` and gates this anyway.

**Recommendation: defer by ADR.** Wiring a payout rail before the accounting
process exists is the highest-risk, lowest-value integration on this list.

---

## Also `OPEN`, needed before the 3.7 gate — not before 3.1B

| Capability | Decision | Note |
|---|---|---|
| Observability / error tracking | `ARCH-026` `OPEN` | « à choisir avant bêta » — needed for 3.7 |
| Analytics | `ARCH-025` `OPEN` | Needed for 3.6 funnels |
| Status page | `OPS-011` `OPEN` | `OPS-010` `LOCKED` requires the page before public |

---

## Minimum set to start 3.1B

```text
1. Supabase staging project        (URL + anon + service_role + DATABASE_URL)
2. Web hosting account             (ARCH-023)
3. Container hosting account       (ARCH-024)  ← WebSocket + SIGTERM grace ≥ 30s
4. Transactional email             (ARCH-027)  ← start the DNS today
```

Those four make staging real. Market data can stay on `replay`, payments on the
in-repo sandbox, and KYC and payouts deferred by ADR — all three are honest
states that a beta tester will not encounter as a lie.

## What I explicitly do NOT need

- Production PSP, production KYC, real payout rails
- A market-data **display-rights** contract (only for public launch)
- A domain beyond `wariba.app`
- Any production secret — staging must never reuse one
