# WARIBA UI Primitives 2026

Status: WX0 decision record. `@wariba/ui` remains the only public product UI foundation.

## 1. Foundation decisions

```text
UI_FOUNDATION_DECISION = KEEP @wariba/ui AS OWNER; EXTEND SELECTIVELY
BASE_UI_DECISION       = ADOPT SELECTIVELY AFTER PILOT
SHADCN_DECISION        = REFERENCE PATTERNS ONLY; DO NOT INITIALIZE/ADOPT THEME
MOTION_DECISION        = ADOPT SELECTIVELY; ALREADY INSTALLED
ICON_SYSTEM_DECISION   = LUCIDE SELECTIVELY BEHIND @wariba/ui WRAPPERS
```

Base UI is unstyled, tree-shakable and React 17+ compatible, which fits WARIBA's token ownership. Its portal stacking requirement must be reconciled with the chart's existing `isolation:isolate`, and each adopted primitive needs focus/SSR/browser tests ([Base UI quick start](https://base-ui.com/react/overview/quick-start)).

shadcn is not a runtime library decision. Its current output supports React 19/Tailwind 4, but CLI initialization installs utilities and CSS variables and component updates may overwrite files. WARIBA may review recipes but keeps its own APIs and tokens ([shadcn Tailwind 4](https://ui.shadcn.com/docs/tailwind-v4)).

## 2. Existing primitive audit

| Existing primitive | Decision | Finding |
|---|---|---|
| Button/Input | KEEP + REFINE density variants | sound semantics; workstation size/tone variants missing |
| native Select | KEEP for simple forms | strongest low-risk keyboard/mobile behavior; not a searchable symbol chooser |
| Tabs | KEEP + REFINE | keyboard model exists; module-density/overflow API needed |
| Tooltip | PILOT REPLACEMENT UNDERPINNING | current absolute positioning has only top/bottom and no collision/portal behavior |
| Dialog | KEEP | native focus/top-layer behavior and duplicate-close bug already defended |
| BottomSheet | REFINE; Base UI Drawer pilot | current native dialog is correct; gestures/presence/virtual keyboard can improve selectively |
| DataTable | KEEP desktop | mobile needs structured rows, not responsive table contortions |
| EmptyState | KEEP editorial; ADD compact workstation variant | current generic version is too spacious for dock/module empty states |
| Icon wrapper/nav icons | RECOMPOSE source | wrapper is good; handcrafted icon coverage is fragmented |

## 3. Proposed primitive contracts

| Primitive | Use case | Interaction/a11y contract | Desktop / mobile geometry | Dependencies / underpinning |
|---|---|---|---|---|
| `WorkbenchButton` | text action in dense modules | native button; loading/disabled; verb+object | h32 / h44 | existing Button + Kinetic tokens |
| `ToolbarButton` | grouped chart action | `aria-pressed` or menu state; tooltip; roving focus only inside toolbar | 32×32 or label width / 44×44 | native; Base UI Toolbar pilot optional |
| `IconButton` | universal known icon | required accessible name; tooltip desktop; no icon-only dangerous trade action | 32 / 44 | Lucide through WARIBA Icon |
| `Tooltip` | short non-critical help | hover+focus; collision; delay; never sole mobile explanation | max 280 / generally not hover-driven | Base UI Tooltip pilot |
| `Popover` | indicators/preferences | named trigger, Escape, outside click, focus return, collision/portal | min 216 / sheet instead | Base UI Popover pilot |
| `DropdownMenu` | grouped non-financial commands | menu APG, typeahead, focus return; disabled explained | row 32 / row 44 | Base UI Menu pilot |
| `ContextMenu` | chart price actions | pointer + keyboard alternative; exact price context; trade actions remain confirm/gated | row 32 / BottomSheet | existing chart model + Base UI only if equivalent tests pass |
| `Select` | finite form options | native label/help/error | h40 / h44 | native existing |
| `SegmentedControl` | Market/Limit/Stop, interval group | radiogroup, roving tab, text state | h32 / h44 | owned native implementation |
| `StatusChip` | explicit status/count | text+icon, not interactive unless button semantics | h22 / h24 | owned tokens |
| `MetricReadout` | cockpit label/value | `dl/dt/dd`; value never visually unlabeled | h28–36 / h32 | owned; mono numeric |
| `ModuleHeader` | chart/execution/dock identity | heading level, actions named, status text | h32 / h40 | owned layout |
| `ModuleTab` | dock/activity tabs | APG tabs, roving tab, active edge+text | h36 / h44 | refine existing Tabs |
| `TradingActionButton` | Buy/Sell | side text + quote; ≥4.5:1 normal text; disabled reason external | h48 / h48 | owned; never Base/shadcn styling |
| `ToolRailButton` | six drawing tools | `aria-pressed`, tooltip, 32 px focusable target; keyboard selection | 32×32 / not used | Lucide + Tooltip |
| `ContextToolbar` | selected drawing editing | labelled group; Style/Delete/Done; Escape ends selection | h36 / h48 bottom-safe | owned + Popover for style |
| `Toast` | command/status result | stable server code; appropriate live politeness; dismissible | max 360 / inset 12 | current alert infrastructure; Base UI pilot later |
| `Skeleton` | layout loading | `aria-hidden`; adjacent loading status; no fake values | tokenized | existing |
| `DataTable` | desktop financial grids | semantic table; sticky header; keyboard actions | rows 32–40 / not used | existing |
| `MobileStructuredRow` | mobile positions/orders/trades | structured labels, expandable details, ≥44 px actions | not used / min 56 | owned |
| `MetricDelta` | signed display change | sign + semantic text; no animated value interpolation | inline | owned + CSS |
| `ProgressMeter` | target/progress | meter semantics + text | h4–8 | Base UI Meter pilot or native meter after styling audit |
| `RiskMeter` | proximity to DLL/MLL | explicit remaining amount and severity | compact strip / sheet row | owned business-free view |
| compact `EmptyState` | dock/module zero state | named state; action only if real | h32–48 / h44–56 | refine existing |
| `InlineAlert` | field/action warning/rejection | role status/alert by urgency; code in Mono | content | refine existing Alert |
| `BottomSheet` | mobile working surfaces | dialog semantics, safe area, focus trap/return, controlled dismiss | not used / auto or 78–82dvh | native current; Base UI Drawer pilot |
| `CommandMenu` | future non-financial navigation | search/listbox semantics; no trade submit | deferred | DO NOT BUILD WX1 |

## 4. Base UI pilot gate

Pilot only `Popover` + `Tooltip` in an isolated Storybook/test route or direct unit fixture before workstation migration.

Required evidence:

- React 19.2 / Next 15 SSR and hydration;
- Tailwind 4 token styling;
- portal above chart canvas, drawings, trading overlays and native dialog;
- Escape/outside-click/focus return;
- keyboard and screen-reader tests;
- iOS visual viewport and safe-area behavior if Drawer is evaluated;
- bundle analyzer diff for authenticated `/trade`;
- coexistence with native Dialog/BottomSheet;
- rollback by removing wrapper underpinning without consumer API changes.

## 5. Icon policy

One public interface: `@wariba/ui` exports named WARIBA icons and `Icon`. Implementation may wrap named Lucide imports.

- stroke 1.75 px, round caps/joins;
- compact toolbar 16 px;
- default controls 18–20 px;
- navigation 20 px;
- mobile 20–22 px;
- outline by default; filled only for a tiny semantic marker, never mixed within one group;
- no emoji; no icon as the sole meaning for Buy/Sell/risk;
- no direct `lucide-react` imports in app routes.

## 6. Testing implications

Every primitive has unit keyboard/focus tests, exact optional-prop typing, reduced-motion behavior where applicable and an axe-backed composed example. Workstation-specific primitives also receive render-ownership assertions so local visual state cannot create global tick subscriptions.
