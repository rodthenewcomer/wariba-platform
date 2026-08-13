# WX1 — Visual art direction closure evidence

This bundle is the review set for the **WX1 visual product closure**: the pass that took the
accepted WX1 engineering architecture and replaced its visual expression.

It is deliberately separate from `../warix-wx1-kinetic-workstation/`, which is the WX1 evidence
harness output and is regenerated on every run. This directory holds the two things a harness
cannot: an immutable *before* baseline, and the rendered states the art direction was iterated
against.

## Layout

| Directory | What it holds |
|---|---|
| `before/` | The 36 WX1 screenshots exactly as they stood at `9457a7b`, plus that run's manifest. Restored from Git, never regenerated. |
| `checkpoint/` | The rendered states of the final closure, desktop and mobile, produced by `apps/web/tests/e2e/warix-wx1-visual-checkpoint.spec.ts`. |

The regenerated harness bundle in `../warix-wx1-kinetic-workstation/` is the *after* state for every
contractual measurement (geometry, overflow, touch targets, Axe, contrast).

## Direct before / after pairs

Compare these with no annotations:

| State | Before | After |
|---|---|---|
| Desktop 1440 default | `before/desktop-1440x900-default-workstation.png` | `checkpoint/checkpoint-1440x900-default.png` |
| Desktop 1366 default | `before/desktop-1366x768-default-workstation.png` | `checkpoint/checkpoint-1366x768-default.png` |
| Desktop 1920 default | `before/desktop-1920x1080-default-workstation.png` | `checkpoint/checkpoint-1920x1080-default.png` |
| Desktop 2560 default | `before/desktop-2560x1440-default-workstation.png` | `checkpoint/checkpoint-2560x1440-default.png` |
| Execution centre | `before/desktop-1440x900-execution-center.png` | `checkpoint/checkpoint-1440x900-execution.png` |
| Indicators popover | `before/desktop-1440x900-indicators-open.png` | `checkpoint/checkpoint-1440x900-indicators-open.png` |
| Selected drawing | `before/desktop-1440x900-horizontal-selected.png` | `checkpoint/checkpoint-1440x900-drawing-rail-active.png` |
| Mobile chart-first | `before/mobile-390x844-chart-first.png` | `checkpoint/checkpoint-mobile-390x844-chart-first.png` |
| Mobile 320 chart-first | `before/mobile-320x844-chart-first.png` | `checkpoint/checkpoint-mobile-320x844-chart-first.png` |
| Mobile execution | `before/mobile-390x844-market-execution.png` | `checkpoint/checkpoint-mobile-390x844-execution.png` |
| Mobile tools palette | `before/mobile-390x844-tools-palette.png` | `checkpoint/checkpoint-mobile-390x844-tools.png` |
| Mobile activity | `before/mobile-390x844-activity.png` | `checkpoint/checkpoint-mobile-390x844-activity.png` |

## Final-closure states

| State | File |
|---|---|
| Navigator with a non-default instrument selected | `checkpoint/checkpoint-1440x900-navigator-selected.png` |
| Populated dock, one open position | `checkpoint/checkpoint-1440x900-populated-dock.png` |
| 1536 desktop | `checkpoint/checkpoint-1536x864-default.png` |
| Mobile Activity, populated | `checkpoint/checkpoint-mobile-390x844-activity-populated.png` |
| Mobile crosshair over a selected drawing | `checkpoint/checkpoint-mobile-390x844-crosshair-with-drawing.png` |
| Mobile 375 / 430 chart-first | `checkpoint/checkpoint-mobile-{375,430}x844-chart-first.png` |

Server rejection, disconnected/stale, warning, and each of the five drawing types are captured
deterministically by the WX1 evidence harness in `../warix-wx1-kinetic-workstation/`.

## States the closure added, which have no before

These states did not exist as evidence in WX1 and are new here:

- `checkpoint/checkpoint-1024x768-hybrid-default.png` and `checkpoint-1024x768-navigator-open.png` —
  the two compositions the 1024–1279 decision was made from.
- `checkpoint/checkpoint-1280x800-default.png` — the first full-workstation width.
- `checkpoint/checkpoint-1366x768-crosshair.png` and `checkpoint-mobile-390x844-crosshair.png` —
  the themed lightweight-charts crosshair labels.
- `checkpoint/checkpoint-1366x768-tooltip.png` — the corrected dark tooltip primitive.
- `checkpoint/checkpoint-mobile-390x844-limit.png` — the mobile execution sheet with a pending kind,
  both protection levels and the estimate table populated.
- `checkpoint/checkpoint-mobile-390x844-selected-drawing.png` — the contextual bar clear of the
  price scale.

## Workspace Layout Engine

`resize/` holds the addendum's required resize states and `resize-manifest.json`,
every figure in it measured from the rendered workstation rather than computed
from the engine's own constants.

| Claim | Where it is proven |
|---|---|
| Chart floor holds under both panes at maximum | `1366-both-panes-near-maximum.png` — plot measured **520px**, the configured minimum exactly |
| Navigator gives way before Execution | `1280-clamped-preferences.png` — Navigator 340 → **268**, Execution keeps its preferred **400** |
| A clamp never destroys a preference | `resize-manifest.json → preferredWidthRestore`: effective 340 → 268 → **340**, stored preference **340** throughout |
| Opening the hybrid overlay costs no chart width | `hybridChartWidthStable`: **648px** closed and open |
| Resizing is not navigation | `chartStateAcrossResize`: `sourceEpoch` stable, drawings stable, execution draft stable, **0** history requests, **0** chart remounts |
| No horizontal overflow at any sampled state | every sample records `horizontalOverflow: 0` |

Regenerate with:

```bash
pnpm --filter @wariba/web exec playwright test --grep @warix-resize-evidence
```

## How to regenerate

```bash
pnpm --filter @wariba/web exec playwright test --grep @warix-visual-checkpoint
```

`before/` is never regenerated. If it is ever lost, restore it from `9457a7b`:

```bash
git show 9457a7b:docs/04-ux/evidence/warix-wx1-kinetic-workstation/<file>.png > before/<file>.png
```

## Evidence integrity

- Captures use the production build, the local authenticated Supabase stack and the mock realtime
  provider — the same conditions as the WX1 harness.
- Every market, account and risk figure on screen comes from the live sandbox runtime. No value in
  any screenshot is fabricated for visual purposes.
- The before and after runs observed different amounts of history, because history is process-local
  in WX1. Candle counts therefore differ between pairs; the compositions do not depend on them.

## Review status

```text
WX1_HUMAN_VISUAL_REVIEW = pending
WX1_ACCEPTED = false
```
