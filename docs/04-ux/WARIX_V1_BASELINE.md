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

Pending-order types are English for the same reason: Buy Limit, Sell Limit,
Buy Stop, Sell Stop.

They were translated when the baseline was first frozen, and the freeze
recorded that as an open vocabulary decision rather than quietly settling it.
It was decided on 2026-08-22 and applied in [#33](https://github.com/rodthenewcomer/wariba-platform/pull/33),
under the explicit-human-decision clause below. The baseline SHA does not move
for it: `7ec0613` remains the freeze point, and this is an amendment to it.

That change also removed four duplicate copies of the label table. The four
words had lived in five files, which is why changing them meant editing five
places and why the chart context menu had already drifted into its own variant.
`trade-labels.ts` is now their only home.

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
