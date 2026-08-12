# WARIBA Visual Evidence Standard

Status: WX0 assurance standard; subordinate to Security, QA & Operations.

## 1. Evidence rule

A screenshot proves only what is visible at one viewport/state/time. It does not prove authority, data origin, accessibility, render ownership, responsiveness or command outcome. Every visual claim pairs image evidence with a manifest and the relevant behavioral test.

## 2. Immutable capture identity

Every review bundle records:

- commit SHA and dirty-worktree flag;
- branch and PR;
- capture timestamp/timezone;
- app, realtime and data-source configuration without secrets;
- viewport, device scale, color scheme and reduced-motion mode;
- account fixture class and real/sandbox label;
- history source/basis/epoch when the chart is visible;
- exact state/readiness gate;
- image path, dimensions and SHA-256;
- document overflow and core component rectangles.

Evidence from a dirty or unknown SHA can inform diagnosis but cannot certify release readiness.

## 3. Readiness gates

Before capturing WariX:

1. authenticated authorized account;
2. WebSocket state `open` or the explicitly requested disconnected state;
3. symbol specs received;
4. selected quote is not a dash unless testing empty/unavailable;
5. history state is `ready`, `empty` or the explicitly requested error;
6. current `sourceEpoch` present for memory history;
7. fonts loaded and layout stable;
8. transient layer/state explicitly produced, not caught by timing luck.

Sparse history is valid evidence when identified. Fabricating candles to make a screenshot attractive is forbidden.

## 4. Baseline versus target

- **Baseline**: accepted product before the milestone, immutable and never overwritten.
- **Candidate**: current implementation SHA.
- **Reference**: external benchmark image, stored or linked with provenance/license context.
- **Diff/comparison**: reference and candidate shown at comparable crop/viewport/state.

External references never count as WARIBA acceptance evidence. A target wireframe is not a candidate screenshot.

## 5. Required WariX WX1 matrix

### Desktop viewports

1366×768, 1440×900, 1536×864, 1920×1080, 2560×1440.

States: default empty, one position, many dock rows, indicators, each drawing tool at least once, drawing selected, Market, Limit, Stop, warning, server rejection, risk blocked, stale, reconnecting/disconnected, history loading/empty/error, Navigator collapsed/resized, dock collapsed/resized, keyboard focus and reduced motion.

### Mobile/tablet viewports

320×844, 360×800, 375×812, 390×844, 412×915, 430×932, 768×1024.

States: chart-first, Market sheet, Tools sheet, drawing selected, execution Market/Limit/Stop, rejection/risk blocked, Activity empty/populated, safe-area/virtual keyboard, reduced motion and large text/zoom checks.

### Compact desktop

1024×768 is mandatory for track/toolbar overflow and chart minimum geometry.

## 6. Measurement manifest

For each viewport:

```json
{
  "viewport": { "width": 1366, "height": 768 },
  "document": { "scrollWidth": 1366, "clientWidth": 1366 },
  "globalBar": { "height": 44 },
  "navigator": { "width": 244 },
  "drawingRail": { "width": 36 },
  "centerWorkspace": { "x": 56, "y": 44, "width": 1310, "height": 676 },
  "plot": { "x": 336, "y": 112, "width": 710, "height": 584 },
  "execution": { "width": 320 },
  "dock": { "height": 48, "state": "empty" },
  "preChartChrome": 112,
  "chartViewportAreaSharePercent": 39.5,
  "chartShareOfCenterWorkspacePercent": null,
  "chartShareOfCenterWorkspaceTarget": "TO_BE_PROVEN_BY_WX1_EVIDENCE",
  "minimumTouchTarget": 44,
  "toolbarOverflow": false
}
```

Values are examples from the target budget and must be replaced with runtime values in candidate evidence.

Every WX1 manifest must calculate both chart-dominance KPIs from measured rectangles:

- `chartViewportAreaShare = chartPlotArea / viewportArea`;
- `chartShareOfCenterWorkspace = chartPlotArea / centerWorkspaceArea`.

On desktop, `centerWorkspace` is the principal workstation content rectangle below global instrumentation and above the activity dock, from the right edge of global product navigation to the viewport right; it includes Navigator, drawing rail, chart and Execution Center. On mobile, it spans full width below the global account bar and above the bottom action rail, including market/tools chrome and plot. Overlaying sheets are excluded. The plot rectangle and viewport/state must be identical across both calculations and baseline/candidate comparison. The center-workspace target remains `TO_BE_PROVEN_BY_WX1_EVIDENCE`; reducing dock height alone is not evidence of improved normalized dominance.

## 7. Visual review checklist

- chart is the dominant module;
- both chart-dominance KPIs are present and use the documented rectangles;
- module seams align; no accidental card gaps;
- no clipped labels/prices/axes;
- bid/ask, Buy/Sell and risk meanings remain distinct;
- drawing/crosshair/indicator/trading overlay hierarchy is legible;
- selected/focus/disabled states do not rely on color alone;
- every transient is anchored and inside viewport;
- sheet safe areas and sticky actions are correct;
- typography, weight, border and radius match tokens;
- no unsupported/fake data is visible;
- mobile is not a shrunk desktop table/layout;
- empty/error states preserve workstation hierarchy.

The reviewer must open the saved images, not only trust test completion.

## 8. Behavioral pairing

| Visual state | Required non-visual proof |
|---|---|
| quote/execution | real accepted tick and server command test |
| rejection | genuine server refusal or explicitly documented wire-state fixture |
| risk blocked | authoritative snapshot/gating test |
| history | candle contract/source/gap/cutover tests |
| drawing | stored record, projected visible geometry, stacking and priority test |
| mobile sheet | single mounted tree, focus/return and draft persistence |
| empty dock | authoritative count and stable resize behavior |
| motion | reduced-motion and render-ownership profile |

## 9. WX0 baseline bundle

Path: [`../04-ux/evidence/warix-wx0-kinetic-workstation/`](../04-ux/evidence/warix-wx0-kinetic-workstation/)

The bundle contains 17 PNG images and `evidence-manifest.json` covering all required WX0 desktop/mobile viewports and states. It was captured from W5 merge commit `715010163cafca56561f71e396c0c7f5d58c63a6`. The harness is `apps/web/tests/e2e/warix-wx0-evidence.spec.ts` and is evidence-only, not a product gate.

## 10. Acceptance

Visual evidence is accepted only after:

- exact spec passes;
- images manually inspected;
- geometry/overflow manifest reviewed;
- relevant axe/keyboard/touch/render tests pass;
- candidate SHA is clean and CI for that SHA is green;
- human review marks the milestone accepted.

WX0 documentation closure has human review `PASS`; `WX0_ACCEPTED=true`. This acceptance does not authorize WX1 implementation or weaken the immutable-SHA/CI requirements for future milestones.
