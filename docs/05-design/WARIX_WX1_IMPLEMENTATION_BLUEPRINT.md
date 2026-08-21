# WARIX WX1 — Kinetic Workstation Implementation Blueprint

Status: implementation-ready specification; WX1 has **not** started.

## 1. Objective

Transform accepted W5 presentation into the Kinetic Professional Workstation while preserving every W1–W5 behavior and authority boundary. Another engineer should be able to implement WX1 without deciding scope, layout membership, token meaning or evidence requirements.

## 2. Scope

### In scope

- Kinetic semantic tokens and generated CSS/TS;
- owned workbench/module primitives;
- coherent icon wrappers and selective Base UI/Motion pilots if gates pass;
- global instrumentation bar;
- desktop frame tracks: `56 / 244 / 36 / fluid / 236–260`;
- chart module header/toolbar/footer recomposition;
- six-tool desktop drawing rail and context toolbar presentation;
- compact indicator experience;
- Navigator density;
- Execution Center presentation at 236–260 px by viewport;
- intelligent dock geometry and mobile structured activity rows;
- mobile ≤116 px pre-chart chrome and richer Tools sheet;
- keyboard/focus/reduced-motion/contrast/render closure;
- complete visual evidence.

### Out of scope

- database/migrations;
- market, order, risk, payout or authorization behavior;
- indicator math or custom periods;
- drawing model/storage/anchor semantics;
- history contract/provider/backfill behavior;
- full target interval family or view ranges;
- multi-chart, DOM, tape, volume, command palette or execution hotkeys;
- Trader Portal/PX0, Performance Intelligence, Personal Risk Guard, Control redesign.

## 3. Locked product decisions

```text
Navigator default                 244px (220–320 resizable)
Execution default                 260px @1920 / 248px @1440 / 236px @1280–1366
Execution preferred range         224–300px, viewport hard max 260 / 280 / 300px
Empty dock                        48px
Populated dock                    existing preference/default; stable
Desktop top instrumentation       44px
Desktop drawing rail              36px
Mobile pre-chart chrome           <=116px
Mobile bottom actions             61px + safe area
Target chartViewportAreaShare 1366 >=39% viewport area
Target chartViewportAreaShare 390  >=78% viewport area
Target chartShareOfCenterWorkspace TO_BE_PROVEN_BY_WX1_EVIDENCE
```

## 4. Delivery sequence

### B0 — Contract freeze and instrumentation

Files: existing render-ownership tests, chart overlay/geometry tests, WX0 evidence harness.

- snapshot W1–W5 behavioral contracts;
- add development-only render counters/profiler harness if needed, never production debug UI;
- prove current baseline before visual changes.

Acceptance: exact W5 tests green; 25/25/five-edit render budget recorded.

Rollback: remove instrumentation-only test code.

### B1 — Tokens and primitive pilots

Files: `docs/05-design/tokens.json`, generated design-token outputs, `packages/ui` workbench primitives/tests.

- add semantic Kinetic aliases, surfaces, geometry and motion names;
- build `MetricReadout`, `ModuleHeader`, `ToolbarButton`, `ToolRailButton`, `SegmentedControl`, compact `EmptyState`, `MobileStructuredRow`;
- pilot Base UI Popover/Tooltip only if bundle/focus/portal gate passes;
- pilot Lucide behind WARIBA icon exports only;
- keep current native Dialog/BottomSheet until optional Drawer pilot proves parity.

Acceptance: token build deterministic; unit/a11y/SSR tests; no direct app imports of Base UI/Lucide.

Rollback: wrapper underpinnings revert to owned/native implementations without consumer changes.

### B2 — Frame, global bar and product rail

Files: `WorkstationShell`, `WorkstationStatusBar`, `NavRail`, workstation preferences/tokens.

- add drawing-rail slot;
- apply locked tracks and 44 px instrumentation;
- recompose metrics without deriving new values;
- replace icon presentation coherently;
- preserve account switch authorization and tick independence.

Acceptance: 1024/1366/1440/1920 geometry; no overflow; status readable in <3 seconds; 0 tick renders in shell/bar/rail.

Rollback: previous slot wrapper and track tokens.

### B3 — Navigator density

Files: `MarketNavigator`, row/search presentation, preferences tests.

- default 244 px; 36 px data rows; stronger selected state;
- preserve exact symbols, categories, favorites, quote/spread/status/search;
- validate maximum precision and French copy.

Acceptance: 236/244/252 comparison proves 244; no clipping at 1366; unselected ticks remain row-local.

Fallback: 252 px if evidence disproves 244.

### B4 — Chart module and toolbar

Files: `ChartWorkspace`, `TradeChart` chrome only, `ChartToolbar`, `ChartLegend`, new presentation wrappers.

- module context header, grouped toolbar and compact footer;
- current-function controls only;
- move drawings out of desktop `Outils` into rail;
- compact/collapsible legend on mobile;
- preserve renderer, history controller, indicator engine and overlay geometry.

Acceptance: both chart-dominance KPIs reported; viewport-area targets met; center-workspace baseline/candidate evidence reviewed; no dead actions; current timeframe public behavior unchanged; pan/zoom/history tests green.

Rollback: restore existing chrome around unchanged renderer.

### B5 — Drawing rail and context tools

Files: new `DrawingToolRail`, `ChartToolbar`/`TradeChart` presentation, drawing visibility/priority tests.

- six exact tools; tooltip/pressed/focus states;
- new Style/Delete/Done context toolbar presentation;
- mobile remains Tools sheet;
- no lock/hide/undo/redo until semantics are separately approved.

Acceptance: every tool visible, selectable and stored; selected handles; trading > drawing > chart priority; no pointer obstruction.

Rollback: desktop `Outils` popover remains compatible with unchanged analysis controller.

### B6 — Execution recomposition

Files: `ExecutionPanel` and existing execution subcomponents; no command/domain files.

- quote deck, compact segmented order types, quantity/protection groups, canonical impact strip, fixed bilateral actions;
- preserve every warning, error code, Decimal step and side validity rule;
- maintain one mobile execution tree and external draft store.

Acceptance: Market/Limit/Stop lifecycle; real server rejection; hard-block; keyboard; 44 px; full-page axe; 1366 first-screen actions.

Rollback: old presentation wrappers around identical subcomponent props.

### B7 — Dock and activity

Files: `WorkstationDock`, dock panels, new mobile row primitives, workstation preferences.

- implement 48 px authoritative empty state;
- one deliberate expansion when first row arrives; stable populated height;
- desktop tables remain; mobile structured rows replace table presentation;
- active panel remains sole mount.

Acceptance: zero/one/many states, manual resize, mobile sheets, `useAllTicks` only in visible Positions.

Rollback: disable intelligent-empty policy and restore preference height.

### B8 — Mobile composition and motion

Files: `MobileMarketBar`, `WorkstationStatusBar` mobile variant, `TradeChart` mobile chrome, Tools/Execution/Activity sheets.

- achieve 40+32+44 pre-plot bands;
- full-width plot; preserve bottom actions;
- richer tools palette and safe-area sheets;
- selectively add presence motion; no tick animation.

Acceptance: six phone widths + 768 tablet, virtual keyboard, Escape/focus return, reduced motion, no duplicate trees, ≥78% chart share at 390.

Rollback: token/presentation-level; state controllers unchanged.

### B9 — Assurance and evidence

Run exact test → classify → root fix → exact test → affected group → full requested gate once.

Required:

- `pnpm test:fast`;
- build;
- relevant `@trade`, mobile, accessibility and evidence specs;
- render ownership;
- visual matrix in `WARIBA_VISUAL_EVIDENCE_STANDARD.md`;
- `chartViewportAreaShare` and `chartShareOfCenterWorkspace` from the documented rectangles;
- manual image inspection and same-viewport baseline comparisons;
- clean candidate SHA and PR CI.

## 5. Likely files

Production scope is limited to:

- `docs/05-design/tokens.json` and generated `packages/design-tokens` outputs;
- `packages/ui/src/{primitives,components,icons,wariba}` and tests;
- `apps/web/app/(trade)/trade/workstation/**`;
- `apps/web/app/(trade)/trade/{TradeChart,ChartToolbar,ChartLegend,ExecutionPanel,PositionsTabPanel}.tsx`;
- `apps/web/app/(trade)/trade/execution/**` presentation only;
- dock presentation files and E2E/unit/evidence tests.

No migrations. No adapter/provider/domain/policy/risk/payout modification.

## 6. Acceptance criteria

1. W1–W5 functional suites remain green.
2. `chartViewportAreaShare` is ≥39% at 1366 empty and ≥78% at 390 chart-first; `chartShareOfCenterWorkspace` is reported for the same baseline/candidate states with target `TO_BE_PROVEN_BY_WX1_EVIDENCE`.
3. Navigator 244 px and compact execution 236–260 px pass content/precision checks.
4. Empty dock 48 px; populated dock stable and preference-owned.
5. Mobile pre-chart chrome ≤116 px.
6. Toolbar contains no dead or WX2-only control.
7. Desktop six-tool rail and mobile palette operate the same drawing controller.
8. Server warnings/rejections and order authority are unchanged.
9. No serious/critical axe findings; keyboard/focus return/reduced motion pass.
10. Render budget does not regress.
11. No document overflow at the full matrix.
12. Evidence bundle is immutable, complete and manually reviewed.

## 7. Risk register

| Risk | Prevention | Compensation |
|---|---|---|
| plot loses width to drawing rail | recover Navigator/Execution widths first | fall back Navigator 252 only if necessary; never hide rail controls |
| density hides warnings | preservation checklist + richest-state tests | expand local section, not whole module |
| Base UI portal/focus regression | isolated pilot and wrapper API | retain native/current primitive |
| Motion adds tick work/bundle | local presence only + analyzer/render tests | CSS/no motion fallback |
| icon migration changes meaning | named WARIBA wrapper and snapshot review | keep existing icon until exact replacement accepted |
| dock height jitters | authoritative state + settle window + populated preference | disable auto-empty transition |
| mobile duplicate subscriptions | mount exclusivity tests | revert to accepted single-tree presentation |
| interval UI implies unregistered or insufficient-depth data | WX1 current intervals only | WX2 owns canonical registration/exposure and professional history depth |

## 8. WX2 handoff contract

WX1 must leave chart module/toolbar interval inputs typed from current contracts, not hardcode the future family. The generic duration-driven candle aggregator already exists; WX2 registers target intervals in the canonical list/duration map, propagates the contract, and adds provider-backed history, cache, durable source identity, restart continuity, live cutover, sufficient depth, range presets and fit-content correction in one separately auditable milestone.

## 9. Definition of done

WX1 is done only when implementation, tests, build, permissions, errors, mobile, critical accessibility, docs, evidence, PR review and CI are green on one immutable SHA. Human visual acceptance remains required; a green fast gate alone is insufficient.
