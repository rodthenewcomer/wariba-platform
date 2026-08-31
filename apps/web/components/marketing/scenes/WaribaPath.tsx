'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { DESKTOP_CORRIDOR, MOBILE_CORRIDOR } from './wariba-path-geometry';

/**
 * The WARIBA PATH.
 *
 * ## Why the rising curve had to go
 *
 * The field this replaces was competent and its silhouette was a diagonal
 * climbing left to right — the single most common image in fintech, crypto and
 * analytics. More ticks, more glow and more pulses could not fix that, because
 * the problem was the shape. It was also, read uncharitably, a promise: a line
 * that only ever rises says "this goes up".
 *
 * ## What replaces it
 *
 * A corridor. Two thin boundaries define a space; a signal travels inside it.
 * The corridor widens, tightens around x≈950, then reopens — space, constraint,
 * passage, space — and the signal is at its brightest crossing the narrow part.
 *
 * That shape says *you are moving inside something visible*, which is what the
 * headline above it says in words. It is also specific to WARIBA in a way a
 * curve is not: the product is a path through limits.
 *
 * ## What it deliberately is not
 *
 * Not the risk section. No percentage, no threshold, no red floor, no green
 * zone, no label. The boundaries are abstract and carry no number, because the
 * page has a section further down whose whole job is to explain the maximum
 * loss, and a hero that half-explains it steals that moment and teaches it
 * badly.
 *
 * ## Geometry
 *
 * Centreline and boundaries come from one system — see
 * `wariba-path-geometry.ts`. The boundaries *are* `centre ∓ halfWidth`, and the
 * waist *is* the narrowest sample. Nothing is stated twice, so nothing can
 * drift; the previous field had markers floating where its curves did not
 * actually cross, twice.
 *
 * ## No JavaScript, reduced motion, hydration
 *
 * The static composition is server-rendered: boundaries, path, waist marker,
 * stations. Only the moving parts mount in an effect. One code path, three
 * correct outcomes.
 */
export function WaribaPath() {
  const reduced = useReducedMotion();
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setAnimated(reduced === false);
  }, [reduced]);

  return (
    <div aria-hidden="true" className="wariba-path" data-animated={animated ? 'true' : 'false'}>
      <div className="wariba-path-grid" />

      <svg
        viewBox="0 0 1440 820"
        preserveAspectRatio="xMidYMid slice"
        className="wariba-path-svg"
        focusable="false"
      >
        <defs>
          <linearGradient id="wp-bound" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3157F5" stopOpacity="0" />
            <stop offset="30%" stopColor="#3157F5" stopOpacity="0.22" />
            <stop offset="62%" stopColor="#6684FF" stopOpacity="0.5" />
            <stop offset="88%" stopColor="#6684FF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6684FF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wp-centre" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3157F5" stopOpacity="0" />
            <stop offset="34%" stopColor="#3157F5" stopOpacity="0.34" />
            <stop offset="66%" stopColor="#9DB4FF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#6684FF" stopOpacity="0.18" />
          </linearGradient>
          <radialGradient id="wp-waist" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#9DB4FF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#9DB4FF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── DESKTOP ── */}
        <g className="wariba-path-desktop">
          {/* BACK — the corridor's own faint fill, so the space between the
              boundaries reads as a space rather than as a gap. */}
          <path d={DESKTOP_CORRIDOR.band} fill="#6684FF" fillOpacity="0.018" />

          {/* MID — the two boundaries. Thin, dim, and the only structural
              elements: everything else is an event inside them. */}
          <g className="wariba-path-bounds">
            <path
              d={DESKTOP_CORRIDOR.upper}
              fill="none"
              stroke="url(#wp-bound)"
              strokeWidth="1.4"
            />
            <path
              d={DESKTOP_CORRIDOR.lower}
              fill="none"
              stroke="url(#wp-bound)"
              strokeWidth="1.4"
            />
          </g>

          {/* The waist. One pooled light and one bracket pair — the signature
              moment marked without a word. */}
          <circle
            cx={DESKTOP_CORRIDOR.waist.x}
            cy={DESKTOP_CORRIDOR.waist.y}
            r="120"
            fill="url(#wp-waist)"
          />
          <g stroke="#9DB4FF" strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round">
            <path
              d={`M${DESKTOP_CORRIDOR.waist.x - 16} ${DESKTOP_CORRIDOR.waist.y - DESKTOP_CORRIDOR.waistHalfWidth} h32`}
            />
            <path
              d={`M${DESKTOP_CORRIDOR.waist.x - 16} ${DESKTOP_CORRIDOR.waist.y + DESKTOP_CORRIDOR.waistHalfWidth} h32`}
            />
          </g>

          {/* FRONT — the path itself. */}
          <path
            id="wp-track"
            d={DESKTOP_CORRIDOR.centre}
            fill="none"
            stroke="url(#wp-centre)"
            strokeWidth="2.2"
          />

          {/* Stations: small precise markers where the path passes a control
              point. Derived from the same samples as the curve, so they sit on
              it by construction rather than by estimate. */}
          {DESKTOP_CORRIDOR.stations.map((station) => (
            <circle
              key={`${station.x}-${station.y}`}
              cx={station.x}
              cy={station.y}
              r="2.5"
              fill="#B9CBFF"
              fillOpacity="0.7"
            />
          ))}

          {/* Market ticks, secondary by design: they sit beside the path, not
              on it, and never form a candle. Two carry a direction because a
              market has both; the rest are cobalt. */}
          {TICKS.map((tick) => (
            <rect
              key={`${tick.x}-${tick.y}`}
              className="wariba-path-tick"
              x={tick.x}
              y={tick.y - tick.h / 2}
              width="1.8"
              height={tick.h}
              rx="0.9"
              fill={tick.tone}
              style={{ ['--wp-delay' as string]: `${tick.delay}s` }}
            />
          ))}

          {/* One pulse, at the waist, timed to the signal's passage. */}
          <circle
            className="wariba-path-pulse"
            cx={DESKTOP_CORRIDOR.waist.x}
            cy={DESKTOP_CORRIDOR.waist.y}
            r="5"
            fill="none"
            stroke="#B9CBFF"
            strokeWidth="1.5"
            style={{
              ['--wp-delay' as string]: `${14 * DESKTOP_CORRIDOR.waistProgress}s`,
              ['--wp-duration' as string]: '14s',
            }}
          />

          {animated ? (
            <Signal
              href="wp-track"
              dur={14}
              begin={0}
              r={4}
              emphasisAt={DESKTOP_CORRIDOR.waistProgress}
            />
          ) : null}
        </g>

        {/* ── MOBILE ── */}
        <g className="wariba-path-mobile">
          <g className="wariba-path-bounds">
            <path d={MOBILE_CORRIDOR.upper} fill="none" stroke="url(#wp-bound)" strokeWidth="1.4" />
            <path d={MOBILE_CORRIDOR.lower} fill="none" stroke="url(#wp-bound)" strokeWidth="1.4" />
          </g>
          <circle
            cx={MOBILE_CORRIDOR.waist.x}
            cy={MOBILE_CORRIDOR.waist.y}
            r="96"
            fill="url(#wp-waist)"
          />
          <path
            id="wp-track-mobile"
            d={MOBILE_CORRIDOR.centre}
            fill="none"
            stroke="url(#wp-centre)"
            strokeWidth="2.4"
          />
          <circle
            cx={MOBILE_CORRIDOR.waist.x}
            cy={MOBILE_CORRIDOR.waist.y}
            r="2.5"
            fill="#B9CBFF"
            fillOpacity="0.7"
          />
          <circle
            className="wariba-path-pulse"
            cx={MOBILE_CORRIDOR.waist.x}
            cy={MOBILE_CORRIDOR.waist.y}
            r="5"
            fill="none"
            stroke="#B9CBFF"
            strokeWidth="1.5"
            style={{
              ['--wp-delay' as string]: `${12 * MOBILE_CORRIDOR.waistProgress}s`,
              ['--wp-duration' as string]: '12s',
            }}
          />
          {animated ? (
            <Signal
              href="wp-track-mobile"
              dur={12}
              begin={0}
              r={4}
              emphasisAt={MOBILE_CORRIDOR.waistProgress}
            />
          ) : null}
        </g>
      </svg>

      <div className="wariba-path-quiet" />
    </div>
  );
}

/**
 * The travelling signal.
 *
 * Mounted rather than server-rendered: a dot parked at a path's origin is a
 * bug, an absent one is a still composition. It brightens as it crosses the
 * waist, which is the only place in the loop where the eye is asked to go.
 */
function Signal({
  href,
  dur,
  begin,
  r,
  emphasisAt,
}: {
  href: string;
  dur: number;
  begin: number;
  r: number;
  emphasisAt: number;
}) {
  const emphasisStart = Math.max(0, emphasisAt - 0.11);
  const emphasisEnd = Math.min(1, emphasisAt + 0.11);
  const emphasisTimes = `0;${emphasisStart};${emphasisAt};${emphasisEnd};1`;

  return (
    <circle r={r} fill="#EAF0FF">
      <animateMotion
        dur={`${dur}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
        keyPoints="0;1"
        keyTimes="0;1"
        calcMode="linear"
      >
        <mpath href={`#${href}`} />
      </animateMotion>
      <animate
        attributeName="opacity"
        values="0;0.55;1;0.55;0"
        keyTimes={emphasisTimes}
        dur={`${dur}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
      />
      <animate
        attributeName="r"
        values={`${r * 0.7};${r * 0.7};${r * 1.35};${r * 0.7};${r * 0.7}`}
        keyTimes={emphasisTimes}
        dur={`${dur}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
      />
    </circle>
  );
}

/*
 * Ticks sit beside the corridor rather than on the path, so they read as
 * ambient prints rather than as data points belonging to the line. Eight
 * cobalt, one emerald, one coral — enough to say a market has two directions,
 * few enough that neither reads as a signal to act on.
 */
const TICKS = [
  { x: 372, y: 424, h: 16, tone: '#3157F5', delay: 0 },
  { x: 470, y: 540, h: 12, tone: '#6684FF', delay: 1.9 },
  { x: 604, y: 452, h: 18, tone: '#36B37E', delay: 3.4 },
  { x: 712, y: 540, h: 11, tone: '#3157F5', delay: 4.8 },
  { x: 858, y: 402, h: 20, tone: '#6684FF', delay: 6.2 },
  { x: 1002, y: 458, h: 13, tone: '#3157F5', delay: 7.6 },
  { x: 1136, y: 358, h: 17, tone: '#F46E6E', delay: 9.1 },
  { x: 1268, y: 400, h: 12, tone: '#6684FF', delay: 10.5 },
  { x: 1360, y: 250, h: 15, tone: '#3157F5', delay: 11.9 },
  { x: 1420, y: 352, h: 10, tone: '#6684FF', delay: 13.2 },
] as const;
