# WariX WX1 visual evidence bundle

This directory is the review bundle for **WX1 — Kinetic Professional Workstation 2026**.
It is intentionally stored in Git so another agent or human reviewer can inspect the same pixels,
measurements, states and accessibility results without access to the local runtime.

## Canonical entry points

- `evidence-manifest.json` — measured geometry, both chart-dominance KPIs, overflow, touch targets,
  dependency decisions, render ownership, contrast samples and Axe results.
- `desktop-*.png` — desktop workstation and interaction states.
- `mobile-*.png` — mobile chart-first, sheet, execution and activity states.
- `tablet-768x1024-workstation.png` — tablet composition.
- `apps/web/tests/e2e/warix-wx1-evidence.spec.ts` — deterministic capture and assertion harness.

Repository-relative location:

```text
docs/04-ux/evidence/warix-wx1-kinetic-workstation/
```

Absolute local location used during WX1:

```text
/Users/rodrigueadebigni/wariba-platform/docs/04-ux/evidence/warix-wx1-kinetic-workstation/
```

## Measured closure

| KPI | WX0 baseline | WX1 candidate |
|---|---:|---:|
| 1366 chart viewport share | 26.50% | 39.39% |
| 1366 chart share of center workspace | 42.44% | 46.66% |
| 390 chart viewport share | 68.29% | 78.91% |
| 390 chart share of center workspace | 78.41% | 90.12% |
| 390 pre-chart chrome | 174 px | 116 px |
| Minimum WARIBA-owned mobile touch target | — | 44 px |

The manifest uses the same chart plot rectangle for both chart KPIs. The center-workspace metric
does not improve by shrinking the activity dock denominator.

## Evidence integrity

- Captures use the production build, the local authenticated Supabase stack and the mock realtime
  provider.
- Market, account, risk and rejection values come from the live sandbox runtime; screenshots do
  not contain fabricated financial metrics.
- Current process-memory history remains truthful and is labelled as such.
- The current timeframe contract remains `5s`, `15s`, `30s`, `1m`, `3m`.
- `capturedCommit` in the manifest identifies the immutable implementation commit rendered by the
  harness. The later evidence-only commit may therefore have a different Git SHA.
- The 35×19 px TradingView attribution link is recorded separately as a third-party licensed
  renderer exception. Every WARIBA-owned mobile action measured by the harness is at least 44 px.

## Review order

1. `desktop-1366x768-default-workstation.png`
2. `desktop-1366x768-limit-order.png`
3. `desktop-1366x768-server-rejection.png`
4. `desktop-1440x900-horizontal-selected.png`
5. `desktop-1440x900-indicators-open.png`
6. `desktop-1920x1080-default-workstation.png`
7. `mobile-320x844-chart-first.png`
8. `mobile-390x844-tools-palette.png`
9. `mobile-390x844-market-execution.png`
10. `mobile-390x844-activity.png`
11. `mobile-430x932-chart-first.png`

Human visual acceptance remains external to this bundle:

```text
WX1_HUMAN_VISUAL_REVIEW = pending
WX1_ACCEPTED = false
```
