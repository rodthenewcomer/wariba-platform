# WARIBA Product OS — Phase 2

Branch `feat/wariba-product-os-phase-1-auth-shell`. **Not merged, not pushed.**

The Trader Hub had three destinations and one page. It now has nine destinations, an
account lifecycle it renders differently in every state, real performance analytics, a
trade journal, a commercial configurator, billing, an identity gate and a payout
lifecycle. 47 captures, every one the running application at a real viewport against a
real database.

## What is new

| Area | Before | Now |
|---|---|---|
| Navigation | 3 flat rows | 9 destinations in 4 groups, with the commercial action given its own treatment |
| Icons | Lucide outline at 26px, reading as 16px | Phosphor `bold` / `fill`, measured 24-28px, filled when selected |
| Lifecycle | `status` conditionals per page | One `deriveAccountLifecycle` projection, 12 states, rendered by every surface |
| Dashboard | Hero + mission + risk | Hero, lifecycle banner, health ring, mission checklist, quick actions, equity curve with thresholds, performance snapshot |
| Performance | — | `/performance` — 12 KPIs, equity curve, daily bars, by instrument, by holding time |
| Journal | — | `/journal` — closed round trips with entry, exit, duration, eligibility |
| Commerce | Public `/offres` only | `/comptes/nouveau` — configurator reading the **published policy**, not a literal |
| Billing | — | `/facturation` — orders, receipts, providers |
| Identity | Boolean nobody could see | `/verification-identite` — the state machine and the gate |
| Payouts | A form | The lifecycle: eligible, blocked and why, KYC required, submitted, paid |
| WariX entry | Generic empty state | A gate that names what is missing and routes to it |
| Motion | None | Entrance stagger, value interpolation, progress travel, sheet physics — all removed under `prefers-reduced-motion` |

## Captures

**Shell and destinations** — `01`–`12`: sidebar expanded at 1440, every destination at
1440, the 1366 collapse comparison, and the 72px rail at real size.

**Lifecycle** — `20`–`26`: evaluation, objective reached, under review, passed, funded
preparing, funded active, breached. Each is a posed QA fixture, each is the real page.

**Gates and absence** — `30`–`35`: payout status, the identity gate, performance and
journal with no data, the no-account dashboard, the WariX gate.

**Mobile** — `40`–`43`: seven surfaces at 390, 375 and 320, plus the Plus sheet.

**Motion** — `50`: reduced motion.

## Second pass — what the source prompt caught that the first pass missed

| Gap | Fixed |
|---|---|
| §14 never answered "how much is available" | The payout panel now leads with the withdrawable excess, the buffer floor it sits above, the realised balance, and Performance Days |
| §25 wanted loading and error states everywhere; only `/hub` had them | Shared `(platform)/loading.tsx` and `error.tsx` — a skeleton shaped like the pages, and a failure that keeps the shell so the trader's way out survives |
| §11's card was missing consistency, sessions and last activity | Added, each dropped rather than zero-filled when the account has no closed session |
| §8E asked for date-range presets on the dashboard chart | The read model caps at 14 snapshots, so a "90 jours" preset there would show 14 days and call it ninety. The chart states its window and links to `/performance`, which queries by date |
| §33 listed route permissions, account filters and French state mapping as untested | All three now tested, plus axe on all eight new destinations |

That last scan found a real structural bug: the account list wrapped each `<li>`
in a motion `<div>`, so the `<ul>` had non-list children and the items had no list
parent. `Stagger` and `StaggerItem` now take an `as` prop and the list stays a list.

## What is asserted, not eyeballed

- every sidebar glyph measures 24-28px and every row clears 44px, in the collapsed rail;
- collapsing reclaims ≥150px of content width at 1366;
- no surface scrolls sideways at 390, 375 or 320 — seven pages × three widths;
- a fresh account renders stated absence, never a zero-filled KPI grid or a flat chart;
- `objective_reached` says the rules still apply, and the account is still tradable;
- `under_review` offers no action, because nothing is required of the trader;
- a breached account has no route into the terminal;
- the identity gate contains no file input and never names a document;
- the Plus sheet traps focus and returns it on Escape;
- reduced motion leaves the hero at opacity 1 and the sidebar with `transition-property: none`;
- every Hub destination redirects an unauthenticated visitor **and carries where they
  were going**, so signing in lands there rather than on the hub;
- an unknown `?etat=` falls back to every account rather than to none — a filter nobody
  chose must never hide a trader's accounts;
- axe reports zero critical and zero serious violations on all eight new destinations;
- the Plus sheet is `aria-modal`, takes focus on open and returns it on Escape.

## Fixtures

`@wariba/test-utils`'s `seedLifecycleFixture` poses an account in a named state by
writing `trading_accounts.status` directly — deliberately bypassing the transition
machine, because walking it for real would need a passing evaluation and a finalised
session to photograph one banner. Three things keep it out of production: it lives in a
package no application depends on, every user it creates is `@wariba-test.invalid`
(RFC 2606, unroutable), and teardown runs from a `finally`.

**No financial data is fabricated.** Balances, fills and snapshots are whatever the real
activation path wrote. What is posed is the status column — a value a WARIBA operator can
also set from Control.

## Provenance

Captured against the **local** Supabase stack (`127.0.0.1:54321` / `:54322`), which is what
`APP_ENV=local` requires without derogation. The hosted project named in `.env.local`
remains unreachable (`tenant/user postgres.<ref> not found`).
