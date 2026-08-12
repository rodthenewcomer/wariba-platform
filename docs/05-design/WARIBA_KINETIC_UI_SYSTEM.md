# WARIBA Kinetic UI System

Status: WX0 specification; tokens are proposed for WX1 and are not active in production.

## 1. Purpose

Kinetic UI is the interaction and visual layer that makes WARIBA feel operationally alive while preserving Quiet Financial Authority. It extends the canonical Design System; it does not replace Manrope, IBM Plex Mono, Ink, Bone, Cobalt or Copper.

## 2. Surface architecture

| Token concept | Proposed dark value | Use |
|---|---:|---|
| `kinetic.canvas` | Ink 950 `#0B0D12` | workstation background/plot |
| `kinetic.module` | Ink 900 `#121620` | chart/execution/activity modules |
| `kinetic.raised` | Ink 850 `#161A24` | toolbar, popover, sheet body |
| `kinetic.control` | Ink 800 `#1A1F2B` | inputs/segmented controls |
| `kinetic.selected` | Ink 700 `#272D3A` + Cobalt edge | selected rows/tools |
| `kinetic.seam` | Ink 700 `#272D3A` | one-pixel module boundary |
| `kinetic.focus` | Cobalt 400 `#6684FF` | 2 px focus ring |

Large panels are separated by tone and hairline seams. Shadows are reserved for floating layers. A module is not a rounded card.

## 3. Geometry

| Element | Radius | Height |
|---|---:|---:|
| compact toolbar control | 6 px | 32 px desktop / 44 px mobile |
| field / segmented control | 8 px | 36–40 px |
| popover | 10 px | content-driven |
| execution/chart module | 0–8 px only at external corners | track-driven |
| bottom sheet | 16 px top corners | ≤82dvh working surface |
| semantic pill | full | status/count only |

Pills are not general buttons. Module headers, table rows and tool rails remain square or subtly rounded.

## 4. Spacing and density

The 4 px base grid remains canonical. Workstation compositions prefer `4, 8, 12, 16`. Marketing spaces `24+` are not imported into operational surfaces.

- module inset: 8 px compact, 12 px comfortable;
- toolbar group gap: 4 px; separator margin: 6 px;
- label/value gap: 4 px;
- dense table cell vertical padding: 8 px;
- sheet content inset: 16 px;
- pointer desktop icon button: 32×32 px only with adequate separation;
- touch control: minimum 44×44 px.

## 5. Type hierarchy

| Role | Font | Size/line | Weight |
|---|---|---|---|
| account/program | Manrope | 11/14 | 600 |
| symbol/module title | Manrope | 13/16 | 700 |
| major quote | IBM Plex Mono | 24/28 desktop, 22/26 mobile | 600 |
| metric value | IBM Plex Mono | 13/16 | 500–600 |
| minor quote/axis | IBM Plex Mono | 11/14 | 400–500 |
| toolbar | Manrope | 12/16 | 600 |
| section label | Manrope uppercase | 10/14, 0.06em | 600 |
| table body | Manrope/Mono by field | 12/16 | 400–500 |
| warning/rejection | Manrope | 12/17 | 500 |

Core numbers never use proportional figures. Price precision is never visually rounded outside `SymbolSpec` rules.

## 6. Workbench components

Kinetic UI introduces presentation contracts, owned by `@wariba/ui`:

- `WorkbenchButton`, `ToolbarButton`, `IconButton`;
- `ModuleHeader`, `ModuleTab`, `MetricReadout`, `StatusChip`;
- `SegmentedControl`, `ToolRailButton`, `ContextToolbar`;
- `TradingActionButton`, `MetricDelta`, `RiskMeter`;
- `MobileStructuredRow`, compact `EmptyState`, `InlineAlert`.

Business math and server state remain inputs. None of these components subscribe to ticks or import database/application internals.

## 7. Live energy

- Quote direction: background wash only, 160 ms, once per accepted direction change, 500 ms cooldown; text updates immediately.
- P&L tone: 180 ms color transition when sign changes, no rolling/interpolated number.
- Connection: one 120 ms color transition and textual state; no pulse while healthy.
- Risk: severity changes immediately; optional 180 ms border/tone transition does not delay copy.
- Selected tool: immediate Cobalt edge/surface, 120 ms hover/press transition.

All effects become instantaneous under reduced motion. No glow, bounce, confetti or continuous flash.

## 8. Gradients

Allowed only for a functional, static meter fill that encodes monotonic progression within one semantic family, such as warning-to-danger risk proximity. The meter must also have text and stops.

Forbidden on modules, backgrounds, buttons, chart plot, candles, tool selection, execution confirmation and marketing-like decoration inside the workstation.

## 9. Performance contract

Kinetic state lives at the lowest rendering owner. CSS handles hover, press, focus and simple color transitions. Motion handles only presence/layout/gesture in isolated transient components. No animation hook receives tick data. Toolbar, nav, shell and closed transient layers remain at zero renders for 25 selected-symbol ticks.
