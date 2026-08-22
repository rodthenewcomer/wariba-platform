# WARIBA Product OS — Phase 1.1 Premium Closure

Branch `feat/wariba-product-os-phase-1-auth-shell`. **Not merged.** Awaiting human visual review.

Phase 1 proved these surfaces worked. This pass exists because *works* and *finished*
are different claims, and the second one was failing. Every image below is the running
application at a real viewport — `pnpm build && pnpm start`, no mock, no device frame,
no retouching.

## What changed and why

| # | Decision | What it replaced |
|---|---|---|
| 1 | Fluid content column, 32px gutter, 1240px reading limit | A fixed ~770px ribbon that ignored the sidebar collapse entirely |
| 2 | WariX leaves the desktop sidebar, stays in the phone tab bar | A separate product shell listed as if it were a page of this one |
| 3 | `publicId` and the rule version demoted to a footnote row | A database key rendered as the dashboard's headline |
| 4 | Chart drawn only when the read model says there is a series | A 220px auto-scaled flat line reading 9 999,95 / 10 000,00 / 10 000,05 |
| 5–7 | Hero: program, phase, size, state, objective, next action | Metadata and an empty chart above the mission |
| 8–9 | Mobile recomposition; 70px tab bar; content reserves its height | A first viewport spent on metadata; a fixed bar over the last row |
| 10–11 | Identity ladder: image → real initials → silhouette | `E2`, two characters sliced off the fixture's e-mail address |
| 12–14 | 58/42 split, 440px column, 48px controls, anchored eye | 55/45, 40px controls, an eye floating beside the password hints |
| 15–16 | Status mark on outcomes; compact semantic notice | Empty confirmations; a workstation-sized alert on a one-field form |
| 17 | System states as a composition with brand ownership | Centred text on a black viewport |
| 18 | Session expiry says why before it says what to do | "Reconnectez-vous pour continuer." alone |

## Captures

### Auth
| File | Viewport |
|---|---|
| `auth-01-login-1440.png` | 1440×900 |
| `auth-02-login-1366.png` | 1366×768 |
| `auth-03-login-390.png` | 390×844 |
| `auth-04-login-320.png` | 320×568 |
| `auth-05-signup-390.png` | 390×844 — brand-to-form gap, measured < 80px |
| `auth-06-password-field.png` | The visibility control inside the field it belongs to |
| `auth-07-signup-1440.png` | Country of residence: a visible selector with nothing preselected |
| `auth-08-verification.png` | An outcome screen opening on a status mark, address masked |

### Hub
| File | What it proves |
|---|---|
| `hub-01-1440-expanded.png` / `hub-02-1440-collapsed.png` | **The comparison.** Collapsing hands ≥ 90px back to the content, not to the margin |
| `hub-03-1366-expanded.png` / `hub-04-1366-collapsed.png` | Same at laptop width, where the gain is ≥ 150px |
| `hub-05-1366-fold.png` | `Ouvrir WariX` inside the first viewport |
| `hub-06-390-fold.png` / `hub-07-320-fold.png` | Same on a phone and on the smallest supported screen |
| `hub-08-320-objective-before-chart.png` | Objective and action above any performance visualisation at 320px |
| `hub-09-user-menu.png` | Compact menu; no fixture identity |
| `hub-10-390-bottom-nav.png` / `hub-11-320-bottom-nav.png` | 70px bar, 44px targets, content clear of it |

### System states
`sys-01-404` · `sys-02-403` · `sys-03-500` · `sys-04-offline` · `sys-05-maintenance` ·
`sys-06-session-expired` · `sys-07-500-reference` · `sys-08-auth-error` · `sys-09-reduced-motion`

## What is asserted rather than eyeballed

The suite measures the things a screenshot can be wrong about:

- the width the content column actually reclaims on collapse, at 1440 and 1366;
- the pixel at which the primary action stops being reachable without scrolling, at
  1366, 390 and 320;
- that exactly one of chart / stated-absence renders — never both, never neither, and
  never a seeded sparkline;
- that the public reference renders at ≤ 13px, and that "nominal non détenu" is gone
  while "Compte simulé" remains;
- that the visibility toggle's centre lies inside the input's box;
- that the brand side of the auth screen contains **no digit at all**;
- that `/erreur?ref=` renders an opaque digest and refuses a sentence.

## Verification alongside these captures

| Suite | Result |
|---|---|
| `wariba-product-os-phase1` + `phase11` (desktop + mobile) | **24/24** |
| `hub.spec.ts` — including an axe scan of the recomposed dashboard | **5/5**, zero critical/serious |
| `payout.spec.ts` · `control.spec.ts` · `payout-relocation.spec.ts` | **65/65** |
| `warix-w4.spec.ts` (`@smoke`) — the Execution Center mounts exactly once | **pass** |
| `pnpm typecheck` · `lint` · `format:check` · `test:unit` · `secrets:scan` · `boundaries:check` | all green (16/16 tasks each) |

### The four WariX order tests that did not run

`trade.spec.ts`'s order-lifecycle, rejection, stop-loss and partial-close tests place a
live order. They were run on **Saturday 22 August 2026**, when the forex market is
closed, and WariX correctly refuses: `test-failed-1.png` in the trace shows the
workstation fully rendered — real candles, indicators, execution panel — with
**« Marché fermé »** and *« Ordre indisponible — Marché fermé pour cet instrument »*, and
Buy/Sell disabled.

That is the designed behaviour, not a regression, and it is reported as *not run* rather
than as a pass. What it does positively evidence is that WariX mounts, draws its history
and gates execution correctly with this branch applied.

## Provenance

Captured against the **local** Supabase stack (`127.0.0.1:54321` / `:54322`), which is
also what `APP_ENV=local` requires without any derogation. The hosted project named in
`.env.local` is unreachable — the pooler answers
`tenant/user postgres.<ref> not found` and the API host does not resolve — so no remote
data plane was written to.

No file under `app/(trade)`, `packages/design-tokens` or `packages/ui/src/icons/warix`
was modified.
