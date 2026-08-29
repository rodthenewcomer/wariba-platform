'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * The WARIBA Market Field.
 *
 * ## What it is for
 *
 * The hero has to say *trading, movement, technology, precision, energy*
 * without saying any of it in words and without showing the product. WariX has
 * its own section further down and gets its own product WOW; a terminal in the
 * hero would spend that moment early and leave the section below with nothing
 * new to show. So the hero's visual is atmosphere, not product.
 *
 * ## Seven layers, and the budget each one gets
 *
 * 1. **Canvas** — true carbon. Painted by the section, not here.
 * 2. **Data grid** — two CSS gradients, 3.5 % white. Meant to be felt, not
 *    seen. It carries a perspective fade so the field has a horizon.
 * 3. **Market paths** — three thin curves. Not a chart: no axes, no scale,
 *    nothing a reader could mistake for a real instrument.
 * 4. **Signals** — four points travelling the paths. Four, not forty. A
 *    particle storm is the single most common way a dark hero becomes a
 *    template.
 * 5. **Pulse** — six micro-ticks fading in and out. Two carry emerald and red
 *    because a market has both; the rest are cobalt, because the brand does.
 * 6. **Localised light** — one bloom, anchored right of the text. Not a
 *    page-wide radial pretending to be depth.
 * 7. **Depth** — the paths thin and dim as they recede. That is the whole
 *    third dimension; a starfield would be a different product.
 *
 * ## Where the movement is allowed to happen
 *
 * All of it lives right of centre. The headline sits on the left third and the
 * field is masked to near-nothing there — the most active pixel on the page
 * must never be behind a thin letterform.
 *
 * ## Why the animation mounts rather than renders
 *
 * The static scene is server-rendered: grid, paths, bloom. The moving parts
 * are added in an effect after mount. That gives three correct outcomes from
 * one code path — no JavaScript renders a complete, composed hero; reduced
 * motion renders the same; and everyone else gets the loop. It also removes
 * any chance of a hydration mismatch from reading a media query during render.
 */
export function WaribaMarketField() {
  const reduced = useReducedMotion();
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (reduced) return;
    setAnimated(true);
  }, [reduced]);

  return (
    <div
      aria-hidden="true"
      className="wariba-market-field"
      data-animated={animated ? 'true' : 'false'}
    >
      {/* Layer 2 — the grid, in CSS. Cheaper than 40 SVG lines and it fades
          with a mask rather than with 40 opacity values. */}
      <div className="wariba-mf-grid" />

      {/* Layer 6 — one bloom, right of the text column. */}
      <div className="wariba-mf-bloom" />

      {/* Layers 3, 4, 5 — one SVG, sixteen elements. */}
      <svg
        viewBox="0 0 1440 820"
        preserveAspectRatio="xMidYMid slice"
        className="wariba-mf-svg"
        focusable="false"
      >
        <defs>
          {/* Each path fades in from the left so it never appears to start at a
              hard edge behind the headline. */}
          <linearGradient id="mf-near" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3157F5" stopOpacity="0" />
            <stop offset="34%" stopColor="#3157F5" stopOpacity="0.5" />
            <stop offset="72%" stopColor="#6684FF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#6684FF" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="mf-mid" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1E39AE" stopOpacity="0" />
            <stop offset="46%" stopColor="#3157F5" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#3157F5" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="mf-far" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1E39AE" stopOpacity="0" />
            <stop offset="60%" stopColor="#1E39AE" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#1E39AE" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Layer 7 — depth. The far path is thinner, dimmer and flatter; the
            near one has the most travel. Three lines, one horizon. */}
        <path id="mf-path-far" d={FAR} fill="none" stroke="url(#mf-far)" strokeWidth="1" />
        <path id="mf-path-mid" d={MID} fill="none" stroke="url(#mf-mid)" strokeWidth="1.4" />
        <path id="mf-path-near" d={NEAR} fill="none" stroke="url(#mf-near)" strokeWidth="2" />

        {/* Layer 5 — the pulse. Present in the static scene at rest opacity,
            breathing once animated. */}
        {TICKS.map((tick) => (
          <rect
            key={`${tick.x}-${tick.y}`}
            className="wariba-mf-tick"
            x={tick.x}
            y={tick.y}
            width="2"
            height={tick.h}
            rx="1"
            fill={tick.tone}
            style={{ ['--mf-delay' as string]: `${tick.delay}s` }}
          />
        ))}

        {/* Layer 4 — the signals. Rendered only once mounted: a dot parked at
            the start of a path is a bug, an absent one is a static scene. */}
        {animated
          ? SIGNALS.map((signal) => (
              <circle key={signal.href + signal.begin} r={signal.r} fill={signal.fill}>
                <animateMotion
                  dur={`${signal.dur}s`}
                  begin={`${signal.begin}s`}
                  repeatCount="indefinite"
                  keyPoints="0;1"
                  keyTimes="0;1"
                  calcMode="linear"
                >
                  <mpath href={`#${signal.href}`} />
                </animateMotion>
                <animate
                  attributeName="opacity"
                  values="0;1;1;0"
                  keyTimes="0;0.12;0.8;1"
                  dur={`${signal.dur}s`}
                  begin={`${signal.begin}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))
          : null}
      </svg>

      {/* The quiet zone. The field is masked away under the text column so the
          most active pixel on the page is never behind a thin letterform. */}
      <div className="wariba-mf-quiet" />
    </div>
  );
}

/*
 * Three trajectories, not a chart.
 *
 * They rise left to right because the page is about progression, and they
 * cross once — a single crossing reads as a market, a dozen reads as a
 * spirograph. None carries a scale, an axis or a label, so nothing here can be
 * mistaken for a real instrument or a real result.
 */
const NEAR =
  'M-60 612 C 220 596, 360 540, 520 508 S 760 470, 900 392 S 1150 300, 1300 214 S 1420 168, 1520 140';
const MID = 'M-60 700 C 240 690, 420 650, 600 632 S 900 596, 1060 520 S 1300 430, 1520 372';
const FAR = 'M-60 486 C 260 476, 470 452, 690 428 S 1040 386, 1240 344 S 1440 312, 1520 296';

const SIGNALS = [
  { href: 'mf-path-near', r: 3.5, fill: '#9DB4FF', dur: 13, begin: 0 },
  { href: 'mf-path-near', r: 2.5, fill: '#6684FF', dur: 13, begin: 5.5 },
  { href: 'mf-path-mid', r: 2.5, fill: '#6684FF', dur: 17, begin: 2.5 },
  { href: 'mf-path-far', r: 2, fill: '#3157F5', dur: 21, begin: 8 },
] as const;

/*
 * Six ticks, right of the text column. Two carry the semantic colours because
 * a market has both directions; the other four stay cobalt, because the brand
 * does and the palette is not the place to be literal.
 */
const TICKS = [
  { x: 812, y: 300, h: 26, tone: '#3157F5', delay: 0 },
  { x: 906, y: 356, h: 18, tone: '#6684FF', delay: 2.4 },
  { x: 1004, y: 262, h: 30, tone: '#36B37E', delay: 4.1 },
  { x: 1096, y: 330, h: 20, tone: '#3157F5', delay: 6.8 },
  { x: 1198, y: 218, h: 24, tone: '#F46E6E', delay: 8.9 },
  { x: 1292, y: 286, h: 16, tone: '#6684FF', delay: 11.2 },
] as const;
