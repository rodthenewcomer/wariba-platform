'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * The WARIBA Market Field.
 *
 * ## What changed in 3.4.5B.1.1
 *
 * The first version was judged, correctly, as "a grid, two cobalt curves, a few
 * ticks and a big blue halo" — a grammar findable on dozens of fintech landing
 * pages. Three things were wrong with it.
 *
 * **The halo had become a wash.** A 44rem radial at 26 % turned the right half
 * of the hero into a navy field, which is the exact law this system exists to
 * enforce inverted: black is the canvas, cobalt is the energy. It is now a
 * 26rem bloom at 15 %, plus three small pooled lights anchored to actual
 * objects. Roughly 40 % less blue overall, and more places where cobalt is
 * genuinely bright.
 *
 * **Everything sat on one plane.** There are now three, and depth comes from
 * their relationship rather than from any 3D: `back` is a hairline at 22 %
 * opacity, `mid` carries the market curves, `front` holds the events. Nothing
 * parallaxes — the planes simply differ in weight, contrast and how much they
 * are allowed to move, which is how a still image acquires depth.
 *
 * **The curves said "lines", not "market".** Three signatures fix that:
 * market ticks clustered where a path is steep, pulse nodes that expand once
 * and fade, and markers at the points where a secondary path crosses a main
 * one. None of them is a candle, an axis or a number a reader could mistake
 * for a result.
 *
 * ## Mobile
 *
 * At 767px and below the back plane and most events are dropped and one main
 * trajectory sweeps the lower third of the hero, behind the space between the
 * copy and the disclosure. One path, two signals, one pulse. The point is not
 * to show the field — it is that something is alive behind the page.
 *
 * ## No JavaScript, reduced motion, and hydration
 *
 * The static scene is server-rendered: grid, every path, every marker, the
 * bloom. Only the moving parts mount in an effect. One code path, three
 * correct outcomes — no JS renders a complete composed field, reduced motion
 * renders the same, everyone else gets the loop.
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
      <div className="wariba-mf-grid" />
      <div className="wariba-mf-bloom" />

      <svg
        viewBox="0 0 1440 820"
        preserveAspectRatio="xMidYMid slice"
        className="wariba-mf-svg"
        focusable="false"
      >
        <defs>
          <linearGradient id="mf-g-main" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3157F5" stopOpacity="0" />
            <stop offset="26%" stopColor="#3157F5" stopOpacity="0.42" />
            <stop offset="62%" stopColor="#6684FF" stopOpacity="1" />
            <stop offset="100%" stopColor="#B9CBFF" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="mf-g-second" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1E39AE" stopOpacity="0" />
            <stop offset="42%" stopColor="#3157F5" stopOpacity="0.34" />
            <stop offset="86%" stopColor="#6684FF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#6684FF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="mf-g-back" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1E39AE" stopOpacity="0" />
            <stop offset="58%" stopColor="#1E39AE" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1E39AE" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="mf-g-mobile" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3157F5" stopOpacity="0" />
            <stop offset="34%" stopColor="#3157F5" stopOpacity="0.5" />
            <stop offset="78%" stopColor="#6684FF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6684FF" stopOpacity="0.1" />
          </linearGradient>
          <radialGradient id="mf-pool" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6684FF" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#6684FF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── BACK ──
            A hairline and a whisper. Present so the mid plane has something to
            be in front of; never legible on its own. */}
        <g className="wariba-mf-back">
          <path d={BACK_A} fill="none" stroke="url(#mf-g-back)" strokeWidth="1" />
          <path d={BACK_B} fill="none" stroke="url(#mf-g-back)" strokeWidth="1" opacity="0.7" />
        </g>

        {/* ── MID ──
            The market. The main path crosses the whole composition rather than
            living in the right half, so the hero reads as one canvas; the quiet
            zone takes care of legibility under the headline. */}
        <g className="wariba-mf-mid">
          <path id="mf-path-main" d={MAIN} fill="none" stroke="url(#mf-g-main)" strokeWidth="2.6" />
          <path
            id="mf-path-second"
            d={SECOND}
            fill="none"
            stroke="url(#mf-g-second)"
            strokeWidth="1.5"
            className="wariba-mf-second"
          />
        </g>

        {/* ── FRONT ── */}
        <g className="wariba-mf-front">
          {/* Pooled light on objects rather than on the page. Three small ones
              replace a third of the old page-wide halo. */}
          {POOLS.map((pool) => (
            <circle
              key={`${pool.cx}-${pool.cy}`}
              cx={pool.cx}
              cy={pool.cy}
              r={pool.r}
              fill="url(#mf-pool)"
            />
          ))}

          {/* Signature 3 — intersections. Where the secondary path crosses the
              main one, a marker. Two rings, no label: a number here would be a
              result claim with a decoration around it. */}
          {CROSSINGS.map((point) => (
            <g key={`${point.x}-${point.y}`} className="wariba-mf-cross">
              <circle
                cx={point.x}
                cy={point.y}
                r="9"
                fill="none"
                stroke="#6684FF"
                strokeOpacity="0.35"
                strokeWidth="1"
              />
              <circle cx={point.x} cy={point.y} r="3" fill="#9DB4FF" />
            </g>
          ))}

          {/* Signature 1 — market ticks. Clustered where the path climbs, the
              way prints cluster where a market moves. Mostly cobalt; one
              emerald, one coral, because a market has both directions and two
              is enough to say so. */}
          {TICKS.map((tick) => (
            <rect
              key={`${tick.x}-${tick.y}`}
              className="wariba-mf-tick"
              x={tick.x}
              /* Straddling the path, not sitting above it: `y` is the measured
                 point on the curve and the mark is centred on it. */
              y={tick.y - tick.h / 2}
              width="2"
              height={tick.h}
              rx="1"
              fill={tick.tone}
              style={{ ['--mf-delay' as string]: `${tick.delay}s` }}
            />
          ))}

          {/* Signature 2 — pulse nodes. One expansion at a time, seven seconds
              apart. A radar sweep would be science fiction; a single ring that
              opens once and fades is a market print. */}
          {PULSES.map((pulse) => (
            <circle
              key={`${pulse.cx}-${pulse.cy}`}
              className="wariba-mf-pulse"
              cx={pulse.cx}
              cy={pulse.cy}
              r="6"
              fill="none"
              stroke="#9DB4FF"
              strokeWidth="1.5"
              style={{ ['--mf-delay' as string]: `${pulse.delay}s` }}
            />
          ))}

          {/* The travelling signals. Mounted, never server-rendered: a dot
              parked at a path's origin is a bug, an absent one is a still. */}
          {animated
            ? SIGNALS.map((signal) => (
                <circle
                  key={signal.href + signal.begin}
                  className={signal.mobile ? 'wariba-mf-signal-m' : 'wariba-mf-signal'}
                  r={signal.r}
                  fill={signal.fill}
                >
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
                    keyTimes="0;0.1;0.82;1"
                    dur={`${signal.dur}s`}
                    begin={`${signal.begin}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))
            : null}
        </g>

        {/* ── MOBILE ──
            One trajectory across the lower third, drawn only below 768px. It
            passes behind the gap between the copy and the disclosure, which is
            the only place on a phone where a line can be seen without
            competing with a word. */}
        <g className="wariba-mf-mobile-plane">
          <path
            id="mf-path-mobile"
            d={MOBILE}
            fill="none"
            stroke="url(#mf-g-mobile)"
            strokeWidth="2.5"
          />
          <circle cx="1090" cy="720" r="70" fill="url(#mf-pool)" />
          <circle
            className="wariba-mf-pulse"
            cx="1090"
            cy="720"
            r="7"
            fill="none"
            stroke="#9DB4FF"
            strokeWidth="1.5"
            style={{ ['--mf-delay' as string]: '3s' }}
          />
        </g>
      </svg>

      <div className="wariba-mf-quiet" />
    </div>
  );
}

/*
 * Five trajectories, none of them a chart.
 *
 * The main path enters left of the headline and climbs across the entire
 * frame, so the hero is one canvas rather than "content left, graphic right".
 * The secondary path descends, crosses it at (720, 477), then climbs back over
 * it at (1306, 197). Two crossings, both measured, both inside the frame. No
 * axis, no scale, no label.
 */
const MAIN =
  'M-80 636 C 180 620, 330 574, 470 540 S 700 500, 860 414 S 1120 300, 1290 206 S 1420 156, 1530 126';
const SECOND = 'M-80 300 C 150 322, 320 372, 500 420 S 780 486, 940 470 S 1230 396, 1530 262';
const BACK_A = 'M-80 470 C 240 462, 460 440, 690 416 S 1050 372, 1260 330 S 1450 298, 1530 282';
const BACK_B = 'M-80 716 C 260 706, 470 676, 660 656 S 980 612, 1180 552 S 1420 470, 1530 424';
/*
 * The mobile trajectory sits *below* the disclosure, not through it.
 *
 * The first placement swept y≈640–700, which on a 390px frame runs straight
 * across "Le trading est entièrement simulé…" — the one paragraph on the page
 * that may never be made harder to read. It now runs along the bottom edge, in
 * the empty band under the copy, where a line can be seen without competing
 * with a word.
 */
const MOBILE = 'M-80 792 C 200 784, 380 766, 560 750 S 880 764, 1060 728 S 1320 648, 1530 588';

const SIGNALS = [
  { href: 'mf-path-main', r: 3.5, fill: '#B9CBFF', dur: 15, begin: 0, mobile: false },
  { href: 'mf-path-main', r: 2.5, fill: '#6684FF', dur: 15, begin: 7.5, mobile: false },
  { href: 'mf-path-second', r: 2.5, fill: '#6684FF', dur: 19, begin: 4, mobile: false },
  { href: 'mf-path-mobile', r: 3.5, fill: '#B9CBFF', dur: 13, begin: 0, mobile: true },
  { href: 'mf-path-mobile', r: 2.5, fill: '#6684FF', dur: 13, begin: 6.5, mobile: true },
] as const;

/* Small pooled lights, anchored to objects. They replace roughly a third of the
   old page-wide halo with light that has a reason to be where it is. */
const POOLS = [
  { cx: 720, cy: 477, r: 76 },
  { cx: 1306, cy: 197, r: 92 },
  { cx: 1010, cy: 340, r: 58 },
] as const;

/*
 * Ticks cluster where the main path climbs hardest — between x≈820 and
 * x≈1330 — because that is where a market prints most. Eight cobalt, one
 * emerald, one coral.
 */
const TICKS = [
  { x: 813, y: 438, h: 22, tone: '#6684FF', delay: 0 },
  { x: 872, y: 408, h: 14, tone: '#3157F5', delay: 1.7 },
  { x: 932, y: 377, h: 26, tone: '#36B37E', delay: 3.2 },
  { x: 992, y: 348, h: 16, tone: '#6684FF', delay: 4.6 },
  { x: 1053, y: 321, h: 20, tone: '#3157F5', delay: 6.1 },
  { x: 1112, y: 295, h: 13, tone: '#6684FF', delay: 7.4 },
  { x: 1172, y: 267, h: 24, tone: '#F46E6E', delay: 8.8 },
  { x: 1231, y: 237, h: 15, tone: '#3157F5', delay: 10.2 },
  { x: 1291, y: 205, h: 21, tone: '#6684FF', delay: 11.6 },
  { x: 1352, y: 173, h: 12, tone: '#6684FF', delay: 13.1 },
] as const;

/*
 * The two points where the secondary path actually crosses the main one.
 *
 * Measured with `getPointAtLength` rather than estimated. The first version
 * placed these by eye at (500, 429) and (940, 470); the paths cross at neither,
 * so two markers and two pooled lights floated in empty space while the real
 * crossing went unmarked. A curve's geometry is not something to guess at —
 * and the second path was reshaped so both crossings land inside the frame,
 * because one that happens at x=1469 is not a crossing anyone sees.
 */
const CROSSINGS = [
  { x: 720, y: 477 },
  { x: 1306, y: 197 },
] as const;

/*
 * The pulses are derived from the crossings, not written beside them.
 *
 * They were a second hand-typed copy of the same coordinates, and when the
 * paths were remeasured the crossings moved and the pulses did not — leaving a
 * ring expanding in empty canvas. Two lists that must agree will eventually
 * disagree; one list cannot.
 *
 * Seven seconds apart, so only one is ever open.
 */
const PULSES = CROSSINGS.map((point, index) => ({
  cx: point.x,
  cy: point.y,
  delay: 1 + index * 7,
}));
