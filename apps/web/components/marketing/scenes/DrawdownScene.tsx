'use client';

import { useReducedMotion } from 'motion/react';
import { cx } from '@wariba/ui';

export interface DrawdownSceneProps {
  /** The family this example belongs to. Never generalise across the three. */
  familyLabel: string;
  sizeLabel: string;
  /** Pre-formatted, server-derived. */
  startBalance: string;
  floorBalance: string;
  maxLossRate: string;
  className?: string;
}

/*
 * An equity path that dips, recovers, and gets close enough to the floor for
 * the floor to matter. A curve that only rises would make the rule look
 * decorative — the whole point is the moment it nearly ends the account.
 */
const PATH: readonly number[] = [
  0, 6, 4, 11, 8, 2, -6, -14, -22, -30, -37, -41, -38, -30, -21, -13, -6, 2, 9, 14, 19, 24,
];

/**
 * The Maximum Loss, drawn.
 *
 * ## Why this section exists
 *
 * The rule that ends accounts is the one people understand last, because every
 * firm states it as a percentage in a table. A percentage in a table is a fact;
 * a line approaching a floor is an understanding. This section is the homepage
 * paying that debt.
 *
 * ## Three bands, and why the middle one is not a rule
 *
 * The floor is a hard edge — cross it and the account is over. Above it sits a
 * warning band, drawn as a wash rather than a line, because it is not a rule:
 * it is the region where the trader should already be paying attention. Giving
 * it its own hard boundary would imply a second threshold that does not exist.
 *
 * ## No generalisation
 *
 * The scene names its family and its size on the face of the chart. ONE, FLEX
 * and INSTANT have different maximum losses — 8, 6 and 5 % — so a drawdown
 * visual without a product label is a false claim with a chart drawn on it.
 */
export function DrawdownScene({
  familyLabel,
  sizeLabel,
  startBalance,
  floorBalance,
  maxLossRate,
  className,
}: DrawdownSceneProps) {
  const reduced = useReducedMotion();
  const width = 720;
  const height = 300;
  const top = 28;
  const bottom = 250;

  const max = Math.max(...PATH);
  const min = Math.min(...PATH);
  /* The floor sits below the deepest point of the path, not at it: a rule the
     example actually breaks is a rule the example gets wrong. */
  const floorValue = min - 8;
  const span = max - floorValue;

  const y = (value: number) => bottom - ((value - floorValue) / span) * (bottom - top);
  const x = (index: number) => (index / (PATH.length - 1)) * width;

  const line = PATH.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `0,${bottom} ${line} ${width},${bottom}`;
  const floorY = y(floorValue);
  const warnY = y(floorValue + span * 0.22);
  const lowIndex = PATH.indexOf(min);

  return (
    <figure className={cx('m-0', className)}>
      <svg
        viewBox={`0 0 ${width} ${height + 26}`}
        className="w-full"
        role="img"
        aria-label={`Exemple de perte maximale sur ${familyLabel} ${sizeLabel}`}
      >
        <defs>
          <linearGradient id="dd-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3157F5" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3157F5" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="dd-warn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F46E6E" stopOpacity="0" />
            <stop offset="100%" stopColor="#F46E6E" stopOpacity="0.18" />
          </linearGradient>
        </defs>

        {/* The warning band — a wash, deliberately without an upper edge. */}
        <rect x="0" y={warnY} width={width} height={floorY - warnY} fill="url(#dd-warn)" />

        {/* The floor. Solid, because it is the only hard edge here. */}
        <line x1="0" y1={floorY} x2={width} y2={floorY} stroke="#F46E6E" strokeWidth="2.5" />
        <text
          x="8"
          y={floorY - 10}
          fontSize="12"
          fontWeight="700"
          letterSpacing="1.2"
          fill="#F46E6E"
        >
          PERTE MAXIMALE · {floorBalance}
        </text>

        {/* The starting balance, dashed: a reference, not a boundary. */}
        <line
          x1="0"
          y1={y(0)}
          x2={width}
          y2={y(0)}
          stroke="#FFFFFF"
          strokeOpacity="0.18"
          strokeWidth="1"
          strokeDasharray="6 6"
        />
        <text x="8" y={y(0) - 10} fontSize="12" fontWeight="600" letterSpacing="1.2" fill="#9AA3B1">
          DÉPART · {startBalance}
        </text>

        <polygon points={area} fill="url(#dd-area)" />
        <polyline
          points={line}
          fill="none"
          stroke="#6684FF"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          className={reduced ? undefined : 'wariba-draw'}
          style={
            reduced
              ? undefined
              : ({
                  strokeDasharray: 1600,
                  ['--wariba-draw-length' as string]: '1600',
                  ['--wariba-draw-duration' as string]: '1.4s',
                } as React.CSSProperties)
          }
        />

        {/* The near miss, marked. This is the moment the rule is about. */}
        <circle
          cx={x(lowIndex)}
          cy={y(min)}
          r="6"
          fill="#0A0A0B"
          stroke="#F46E6E"
          strokeWidth="2.5"
        />
        <line
          x1={x(lowIndex)}
          y1={y(min) + 8}
          x2={x(lowIndex)}
          y2={floorY - 4}
          stroke="#F46E6E"
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeDasharray="3 4"
        />

        <circle cx={width - 4} cy={y(PATH[PATH.length - 1]!)} r="6" fill="#6684FF" />

        <text x="0" y={height + 18} fontSize="12" fill="#9AA3B1">
          Exemple sur {familyLabel} {sizeLabel} · perte maximale {maxLossRate} · ce n’est pas un
          compte réel
        </text>
      </svg>
    </figure>
  );
}
