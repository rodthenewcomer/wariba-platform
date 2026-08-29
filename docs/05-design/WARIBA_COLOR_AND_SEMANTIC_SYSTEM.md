# WARIBA Color and Semantic System 2026

Status: WX0 specification; reconciles with canonical Ink/Bone/Cobalt/Copper tokens.

## 1. Scope and semantic law

The palette and state recipes below govern the **WariX workstation expression**. One color family has one primary meaning in the workstation. Position, label, shape and text must reinforce color; color is never the only channel.

WARIBA-wide surfaces reuse the same token families and semantic meanings, but they are not required to reproduce WariX density or visual austerity.

## 2. Proposed dark workstation palette

| Family | Proposed key | Primary meaning | Contrast on Ink 900 |
|---|---|---|---:|
| Foreground | Ink 50 `#F4F5F7` | primary text | 16.58:1 |
| Muted | Ink 200 `#C0C6D0` | secondary text | 10.53:1 |
| Cobalt | `#6684FF` | focus, selected context, primary action | 5.43:1 |
| Aqua | `#4CC9D7` | selected analytical object, drawing handles | 9.16:1 |
| Violet | `#9B8AFB` | distinct analytics series only | 6.39:1 |
| Emerald | `#36B37E` | buy/profit/success | 6.81:1 |
| Coral | `#E05A5A` | sell/loss/danger | 4.98:1 |
| Amber | `#E2A53A` | warning/approaching risk | 8.33:1 |
| Copper | `#D89A7D` | restrained brand/editorial emphasis | 7.61:1 |

Contrast figures are calculated against Ink 900; final token changes require automated contrast verification across every actual background and state. Filled Buy/Sell buttons require independently selected foreground pairs, not these text ratios alone.

## 3. Meaning assignments

| Visual object | Color rule |
|---|---|
| Buy / positive realized or unrealized state | Emerald |
| Sell / negative / destructive financial state | Coral |
| Approaching limit / recoverable caution | Amber |
| Hard breach / destructive refusal | Coral plus explicit icon/text |
| Information / live context / focus | Cobalt |
| Selected drawing and handles | Aqua |
| Normal drawings | user style with minimum contrast; default Aqua 70% |
| Indicator EMA20 | Aqua |
| Indicator SMA20 | Cobalt |
| Indicator SMA50 | Coral-red analytic variant, not error surface |
| Indicator SMA100 | Ink 100 / light neutral |
| Optional future analytic fifth series | Violet |
| Grid / axis | Ink 700 / Ink 600 |
| Copper | brand accent only; never Buy/Sell/risk |

SMA50 may use a red-family line because its legend names the series and it is confined to analytical geometry. It must never use the exact danger surface token or appear as an alert badge.

## 4. Layer priority

1. trading overlays and their actionable badges;
2. live Bid/Ask and current price;
3. risk state;
4. selected drawing/handles;
5. normal drawings and indicators;
6. grid, crosshair and structure.

When layers collide, higher layers retain opacity/contrast; lower layers reduce opacity but do not change semantic hue. The crosshair remains neutral and distinguishable from default Aqua drawings.

## 5. State recipes

| State | Surface | Edge/icon | Text |
|---|---|---|---|
| selected tool | Ink 700 | Cobalt | Ink 50 |
| selected drawing | transparent | Aqua 2 px + handles | Aqua label |
| warning | deep Amber tint | Amber | Amber light + primary body |
| rejection | deep Coral tint | Coral | Coral light + code in Mono |
| healthy connection | transparent | Emerald dot | explicit `Connecté` |
| stale | Ink 850 | Amber | `Prix obsolète` + timestamp |
| disabled | Ink 800 | Ink 600 | Ink 300; never opacity alone |

## 6. Quote/P&L feedback

The authoritative number changes immediately. A 160 ms background wash may indicate direction, with 500 ms cooldown. Consecutive ticks update the number but do not restart a flash loop. Reduced motion removes the wash and keeps a stable semantic arrow or sign where useful.

## 7. Gradients

### 7.1 Workstation law

- Allowed: a functional static risk/progress meter track within one semantic path and with textual values.
- Forbidden: large decorative gradients, chart background, module surface, nav, execution actions, candles, quote flash, selected tool, sheets and decorative ambience.

### 7.2 WARIBA-wide visual-energy law

Public/Marketing, Authentication, onboarding/activation and selected Trader Portal brand moments may use restrained static gradients or richer visual treatments when they:

- preserve text contrast in every state and viewport;
- do not replace semantic color;
- do not resemble gaming, crypto or neon UI;
- do not create false financial meaning;
- remain tokenized and WARIBA-owned;
- remain subordinate to content, task and authoritative state.

This allowance does not permit a dominant generic gradient or a separate theme system. WARIBA Control remains restrained and evidence-first. Legal/Trust remains free of decorative interference. A future PX0 audit must tune visual energy by product expression instead of applying the WariX workstation skin to every route.

## Coque de marque globale — 3.4.5A

Les surfaces publiques consomment désormais des tokens de rôle déclarés au `:root`
(`--wariba-canvas-*`, `--wariba-surface-*`, `--wariba-brand-*`, `--wariba-seam`,
`--wariba-glow-*`). Ils ne remplacent aucune famille décrite ci-dessus : ils leur donnent un nom
que le composant peut demander, au lieu de le faire choisir parmi neuf `surface-*`.

Une correction est portée par cette phase : `ink-500` ne passe pas AA en corps de texte sur fond
sombre — 2,66:1 sur un module. Le rôle « discret » vaut `ink-300`.

Voir [`WARIBA_GLOBAL_BRAND_SHELL_V1.md`](./WARIBA_GLOBAL_BRAND_SHELL_V1.md) §2.
