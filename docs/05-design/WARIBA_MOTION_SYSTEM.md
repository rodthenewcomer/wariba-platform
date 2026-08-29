# WARIBA Motion System 2026

Status: WX0 specification; no workstation animation changed in WX0.

## 1. Tokens

| Token | Duration | Easing | Use |
|---|---:|---|---|
| instant | 80 ms | standard | press/focus visual response |
| interaction | 140 ms | standard | hover, selected tool, color transition |
| popover | 180 ms | enter/exit | opacity + 4 px translate |
| sheet | 240 ms | enter/exit | mobile sheet presence |
| layout | 220 ms | standard | explicit user-requested dock/track resize only |
| reduced | 1 ms | none | reduced-motion replacement |

Existing 80/120/180/280 tokens remain compatible; WX1 may add semantic aliases rather than duplicate raw values.

## 2. CSS versus Motion

Use CSS for hover, focus, press, color, border, icon rotation and simple opacity. Use installed Motion selectively for presence exit, sheet gesture orchestration and explicit layout transitions whose interrupted state must remain correct.

Motion imports stay in client components. Prefer `LazyMotion` or scoped `motion/react` imports and measure the authenticated-route chunk before/after. Do not pull marketing animation wrappers into WariX.

## 3. Event recipes

| Event | Trigger | Animation | Cooldown |
|---|---|---|---:|
| quote up/down | accepted displayed value changes direction | 160 ms semantic background wash; value immediate | 500 ms |
| P&L sign change | server/live computed display crosses zero | 180 ms text tone only | none |
| tool select | local selection | 80 ms edge/surface | none |
| popover | user opens/closes | 180 ms opacity + 4 px | none |
| bottom sheet | user opens/closes | 240 ms translate + backdrop | none |
| tab panel | explicit tab switch | 120 ms opacity; no lateral carousel | none |
| dock resize | pointer/keyboard resize | direct during gesture; 140 ms settle only on keyboard step | none |
| connection change | state transition | 120 ms tone; copy immediate | none |
| toast/status | authoritative event arrives | 180 ms presence; no delayed content | none |

## 4. Forbidden motion

- interpolation or rolling animation of authoritative prices;
- decorative candle entry/growth;
- continuous quote flashing or healthy-connection pulsing;
- execution delay, celebratory order animation or profit confetti;
- warning/risk copy fading in after the state is already active;
- spring/bounce on Buy/Sell;
- auto-moving chart viewport without a market/history reason;
- layout animation during drawing, pan, zoom or trading-overlay drag.

## 5. Reduced motion

`prefers-reduced-motion` changes spatial motion to immediate presence and preserves final opacity/color. Quote direction uses stable sign/color without a wash. Focus, state copy and urgency are never removed.

## 6. Render ownership

Motion state must be local to the visual component and independent of `TickStore`. Quote wash may be implemented inside the existing selected quote consumer; it must not lift state into `TradeClient`, toolbar, shell or rail. Twenty-five ticks must still cause zero renders in shell/nav/status chrome/toolbar/closed transients.

## 7. Verification

- reduced-motion E2E captures;
- interrupted open/close and Escape focus return;
- no animation frame or React render in tick-independent components;
- no client bundle regression without explicit measured acceptance;
- sheet stays within safe area and reaches final state after rapid reversal.

## Vocabulaire de la coque publique — 3.4.5A

Les durées ci-dessus restent canoniques. La coque publique les expose sous cinq noms de rôle —
`micro`, `state`, `panel`, `enter`, `ambient` — pour qu'un composant demande « un panneau » plutôt
que de se souvenir de 240 ms.

Voir [`WARIBA_GLOBAL_BRAND_SHELL_V1.md`](./WARIBA_GLOBAL_BRAND_SHELL_V1.md) §3.
