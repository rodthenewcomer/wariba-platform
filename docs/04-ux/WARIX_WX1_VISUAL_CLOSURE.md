# WariX WX1 — Visual Closure

Date: 2026-08-21
Status: human approved

```text
WX1_VISUAL_ACCEPTANCE = accepted
WX1_VISUAL_REFERENCE = warix-symbol-final-human-review
WX1_FROZEN = true
```

The immutable visual regression reference is:

```text
docs/04-ux/evidence/warix-symbol-final-human-review/
```

These screenshots and the motion clip record the accepted WX1 workstation. Future work must
treat them as regression references, not as inspiration for another visual redesign. WX2 may
change chart and market-data foundations only; it must preserve the accepted rails, symbols,
chips, price plates, toolbar, mobile shell, header/feed treatment, SL/TP geometry, invalid-preview
behavior, and reduced-motion behavior unless a functional regression is proven.

## Preserved out-of-scope verification debt

The accepted visual baseline does not reclassify existing repository harness debt as WX1 scope:

- the standard Next build currently reaches successful compilation, then stops on pre-existing
  ESLint findings in `ChartPositionOverlay.tsx`, `ChartToolbar.tsx`, `use-value-flash.ts`, and
  `WorkstationFeedback.tsx`;
- broader unit discovery still includes stale workstation assertions and Lightweight Charts mocks
  that do not expose `addBarSeries`;
- the production visual candidate builds and type-checks with Next lint disabled, and the targeted
  WX1 symbol, overlay, Search semantics, browser, reduced-motion, and rendered-evidence checks pass.

No database migration, realtime provider change, trading-rule change, or WX2 implementation is
part of this closure.
