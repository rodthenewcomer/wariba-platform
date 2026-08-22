# WariX V1 — frozen visual and market-data baseline

Date: 2026-08-22

```text
WARIX_V1_BASELINE_SHA        = 7ec0613f2665773ffe272783249655978f77515b
WARIX_V1_VISUAL_BASELINE     = FROZEN
```

## What landed, and where

| Phase | PR | Merge SHA |
|---|---|---|
| WX2 — professional chart + market-data foundation | [#29](https://github.com/rodthenewcomer/wariba-platform/pull/29) | `4696974b42a7c7d5fabceba1cfdada9d227a0429` |
| WX3 + WX3.1 — production historical market data | [#30](https://github.com/rodthenewcomer/wariba-platform/pull/30) | `b87dbc201f0c19930f27518890e3ffbfd1da7d52` |
| VX1-F.1 — product coherence visual baseline | [#31](https://github.com/rodthenewcomer/wariba-platform/pull/31) | `7ec0613f2665773ffe272783249655978f77515b` |

The repository uses no release or baseline tag convention, so the SHA above is
the record. No new tagging scheme was invented for this freeze.

## Frozen areas

**Workstation shell** — desktop and mobile chart workspaces, rails, drawers,
docks and the layout engine behind them.

**Iconography and material (VX1-F.1)** — the destination symbol family, rail
geometry (56px rails, 42px tool targets, glyphs at 28/30/28 with
per-silhouette optical compensation), the material hierarchy, and the semantic
colour assignments.

**Instrument identity** — the paired-currency and index marks, and the single
component that produces them.

**Markets presentation** — mini-card rows, grouping, selection material, and
the market display-state resolver that decides what a row says.

**Chart interaction** — drawing foundation, overlays, crosshair, SL/TP
geometry, execution markers and the motion foundation.

**Market-data architecture** — the historical provider port and adapters, the
durable cache, backfill, left-scroll pagination, the historical/realtime
cutover including both the attached and the refusal paths, reconnect gap
repair, session and instrument provenance, and the presentation states that
report them.

## Trading vocabulary

Buy, Sell, Stop Loss and Take Profit stay in English. They are the terms
French-speaking traders use, and translating them makes the platform read as
less professional to the people it is for. The rest of the interface is French.

One item is deliberately left open: `trade-labels.ts` has carried
"Achat Limite" and "Vente Stop" since before this baseline, so pending-order
type names are still translated. That is a product copy decision, not a
regression introduced here, and it belongs to whoever owns the vocabulary.

## What may change a frozen area

1. an actual bug or regression;
2. an approved Product OS semantic-shell migration;
3. an approved new feature;
4. an explicit human visual review.

Nothing else. No opportunistic polish, no incidental restyling while working
nearby, and no "while I was in there" size adjustments — the rail geometry in
particular was rejected twice before it was accepted, and it is not a knob.

## Commercial gate still open

```text
WX3_PRODUCTION_DISPLAY_LICENSE_STATUS = requires_human_commercial_clearance
```

Freezing the baseline does not clear a production market-data display licence.
