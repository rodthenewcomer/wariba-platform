# WX1 — Right execution dock compaction evidence

Captured on 13 August 2026 with Node 24.18.0, the local Supabase stack, the
deterministic mock market feed and the production Next.js build. `before/` is
the immutable 320 px candidate; `after/` is the compact policy.

## Exact geometry deltas

| State | Execution before → after | Chart module before → after | Chart plot before → after |
|---|---:|---:|---:|
| 1920 default | 320 → 260 px (-60) | 1300 → 1360 px (+60) | 1264 → 1324 px (+60) |
| 1440 default | 320 → 248 px (-72) | 820 → 892 px (+72) | 784 → 856 px (+72) |
| 1366 default | 320 → 236 px (-84) | 746 → 830 px (+84) | 710 → 794 px (+84) |
| 1280 default | 320 → 236 px (-84) | 660 → 744 px (+84) | 624 → 708 px (+84) |
| 1440 active position | 320 → 248 px (-72) | 820 → 892 px (+72) | 784 → 856 px (+72) |
| 1440 SL populated | 320 → 248 px (-72) | 820 → 892 px (+72) | 784 → 856 px (+72) |
| 1440 Limit mode | 320 → 248 px (-72) | 820 → 892 px (+72) | 784 → 856 px (+72) |
| 1440 Navigator open | 320 → 248 px (-72) | 820 → 892 px (+72) | 784 → 856 px (+72) |
| 1440 bottom dock open | 320 → 248 px (-72) | 820 → 892 px (+72) | 784 → 856 px (+72) |
| 1440 manual minimum | 304 → 224 px (-80) | 836 → 916 px (+80) | 800 → 880 px (+80) |

## Preservation result

Every state recorded:

- document horizontal overflow: 0 px;
- chart remounted during the transition: false;
- history refetched during the transition: false (0 requests);
- execution draft survived: true;
- drawing survived: true (one real horizontal line).

The manual 224 px preference restored to 224 px after document reload. Reload
intentionally recreates the chart; the persisted drawing restored. The order
draft remains session-scoped by the existing W4 contract and is deliberately
not persisted across a full document reload.

`before/evidence-manifest.json` and `after/evidence-manifest.json` are the
machine-readable source for every figure above. Each folder also contains the
ten requested viewport/state screenshots plus the post-reload screenshot.

## Closure gate

### Preferred versus effective width

| Pane | Wide preference | Responsive effective value | Stored while constrained | Restored effective value |
|---|---:|---:|---:|---:|
| Execution | 280px at 1920 | 260px at 1280 | 280px | 280px at 1920 |
| Navigator | 340px at 1920 | 0px at 900 mobile transition | 340px | 340px at 1920 |

The compact Execution policy leaves enough room for every legal Navigator
preference throughout the desktop bands, so Navigator's temporary constraint is
proven at the mobile transition rather than by inventing a smaller desktop
maximum.

### 224px visual safety

`after/closure-224/` contains Market, Limit, SL, SL+TP, estimate and real server
rejection captures. Every state in `visual-safety-manifest.json` records:

- quote clipped: false;
- protection value clipped: false;
- monetary value wrapped: false;
- order type truncated: false;
- unusable Buy/Sell action: false;
- track, panel and document horizontal overflow: 0px.

The evidence rejected the initial two-column protection rendering at this one
width because a five-decimal input could not remain fully visible. SL and TP now
stack only below 220px of panel content; the 224px dock therefore remains the
legal minimum.

### Resize-engine results

| Gate | Exact result |
|---|---|
| `VERTICAL_DOCK_CHART_PROTECTION` | PASS — 436px dock leaves 420px module / 326px plot |
| `1024_HYBRID_WIDTH_STABILITY` | PASS — module 732→732px; plot 696→696px |
| `1024_HYBRID_HEIGHT_STABILITY` | PASS — module 504→504px; plot 370→370px |
| `VISIBLE_LOGICAL_RANGE_PRESERVATION` | PASS — right edge 802→802; source epoch unchanged |
| `KEYBOARD_RESIZE` | PASS — 8px step follows physical seam direction |
| `SHIFT_ARROW_RESIZE` | PASS — 24px coarse step |
| `DOUBLE_CLICK_RESET` | PASS |
| `CANONICAL_DEFAULT_RESET` | PASS — Execution 260px at 1920, Navigator 244px, dock 220px |
| `PREFERENCE_RESTORE_AFTER_VIEWPORT_REEXPAND` | PASS — Execution 280→260→280; Navigator 340→0→340 |

Chart evidence: logical range `{from: 459.4435261707989, to: 802}` →
`{from: 479.3278236914601, to: 802}`, identical source epoch, 0 history
requests during resize and 0 chart remounts. The wider panel shows fewer bars on
the left; the live right edge stays anchored.

## Reproduction

```bash
WARIX_DOCK_EVIDENCE_PHASE=before pnpm --filter @wariba/web exec playwright test \
  --config=playwright.dock-evidence.config.ts \
  tests/e2e/warix-wx1-dock-compaction-evidence.spec.ts --project=desktop

WARIX_DOCK_EVIDENCE_PHASE=after pnpm --filter @wariba/web exec playwright test \
  --config=playwright.dock-evidence.config.ts \
  tests/e2e/warix-wx1-dock-compaction-evidence.spec.ts --project=desktop

pnpm --filter @wariba/web exec playwright test \
  --config=playwright.dock-evidence.config.ts \
  tests/e2e/warix-wx1-resize-evidence.spec.ts --project=desktop
```

The commands require the repository's documented local Supabase and realtime
environment variables and a healthy mock realtime process on port 4001.
