'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { AnimatedNumber, LivePill, ProgressBar } from '../motion/primitives';

/**
 * The product, demonstrated.
 *
 * ## The rule this component exists to obey
 *
 * *The shell does not move. The data inside it lives.*
 *
 * Reference 32 states it in its own caption — "balance, equity and drawdown
 * move as the market does, no refresh" — and the frame around that chart is
 * perfectly still while it does. That is the entire trick. A marketing
 * animation that slides cards around says "we made a website". One where the
 * container is nailed down and only the figures move says "this is a running
 * product", which is the claim a funded-trading homepage actually needs to
 * make.
 *
 * ## What it is not
 *
 * It is not a customer result. Every figure here is a fabricated
 * demonstration and the panel says so, in the header, permanently — not in a
 * footnote. The phase forbids implying a real payout, a real trader, or a
 * real balance, and a plausible-looking dashboard is the easiest place in the
 * product to break that by accident.
 *
 * ## Reduced motion
 *
 * The loop does not run. The panel renders its final frame — five of five
 * performance days, reserve covered, payout available — which is the state
 * that best explains the product. Nothing moves, nothing is lost.
 */

interface Frame {
  balance: number;
  equity: number;
  days: number;
  reservePercent: number;
  eligible: number;
  /** Index into `CURVE` up to which the equity line is drawn. */
  drawn: number;
  payoutReady: boolean;
}

/*
 * A plausible curve rather than a flattering one: it dips before it climbs.
 * A demonstration equity line that only ever rises is the kind of quiet
 * over-promise that erodes trust faster than a bad number ever would.
 */
const CURVE = [
  0, 4, 2, 7, 5, 3, -2, -5, -3, 2, 8, 12, 10, 16, 21, 19, 25, 31, 29, 34, 38, 42,
] as const;

const FRAMES: readonly Frame[] = [
  {
    balance: 10_284,
    equity: 10_301,
    days: 3,
    reservePercent: 62,
    eligible: 284,
    drawn: 12,
    payoutReady: false,
  },
  {
    balance: 10_412,
    equity: 10_438,
    days: 3,
    reservePercent: 78,
    eligible: 412,
    drawn: 15,
    payoutReady: false,
  },
  {
    balance: 10_509,
    equity: 10_496,
    days: 4,
    reservePercent: 91,
    eligible: 509,
    drawn: 18,
    payoutReady: false,
  },
  {
    balance: 10_631,
    equity: 10_654,
    days: 5,
    reservePercent: 100,
    eligible: 631,
    drawn: 22,
    payoutReady: true,
  },
];

const FINAL = FRAMES[FRAMES.length - 1]!;

const XOF = (value: number) => `${Math.round(value).toLocaleString('fr-FR')}`;

export function PerformanceShowcase() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(
      () => setStep((current) => (current + 1) % FRAMES.length),
      2200,
    );
    return () => window.clearInterval(timer);
  }, [reduced]);

  const frame = reduced ? FINAL : FRAMES[step]!;

  return (
    <figure
      className="commerce-panel m-0 overflow-hidden"
      data-testid="performance-showcase"
      aria-label="Démonstration du tableau de bord WARIBA"
    >
      {/* The shell. Nothing in this header ever moves. */}
      <div className="flex items-center justify-between gap-3 border-b border-[color:var(--commerce-rule)] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-color-ink-300)]">
            Démonstration · données fictives
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-[color:var(--wariba-color-ink-300)]">
            ONE · 10K · Performance
          </p>
        </div>
        <LivePill />
      </div>

      <div className="px-4 py-5 sm:px-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--wariba-color-ink-300)]">
              Solde
            </p>
            <AnimatedNumber
              value={frame.balance}
              format={XOF}
              className="mt-1 block font-mono text-2xl font-bold tabular-nums text-[color:var(--wariba-color-ink-50)] sm:text-3xl"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--wariba-color-ink-300)]">
              Équité
            </p>
            <AnimatedNumber
              value={frame.equity}
              format={XOF}
              className="mt-1 block font-mono text-2xl font-bold tabular-nums text-[color:var(--wariba-accent-emerald)] sm:text-3xl"
            />
          </div>
        </div>

        <EquityChart drawn={frame.drawn} />

        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-[color:var(--commerce-rule)] pt-4">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--wariba-color-ink-300)]">
              Journées
            </dt>
            <dd className="mt-1 font-mono text-lg font-bold tabular-nums text-[color:var(--wariba-color-ink-50)]">
              {frame.days}
              <span className="text-[color:var(--wariba-color-ink-300)]">/5</span>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--wariba-color-ink-300)]">
              Réserve
            </dt>
            <dd className="mt-1 font-mono text-lg font-bold tabular-nums text-[color:var(--wariba-color-ink-50)]">
              {frame.reservePercent}%
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--wariba-color-ink-300)]">
              Éligible
            </dt>
            <dd className="mt-1 font-mono text-lg font-bold tabular-nums text-[color:var(--wariba-accent-emerald)]">
              +<AnimatedNumber value={frame.eligible} format={XOF} />
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <ProgressBar
            percent={frame.reservePercent}
            label="Couverture de la réserve de sécurité"
            tone={frame.reservePercent >= 100 ? 'emerald' : 'indigo'}
          />
        </div>

        {/*
         * The payout row keeps its height in both states. Letting it appear
         * and disappear would move every element below it — the one thing the
         * shell is not allowed to do.
         */}
        <div className="mt-4 flex min-h-[44px] items-center justify-between gap-3 rounded-[var(--wariba-radius-lg)] border border-[color:var(--commerce-rule)] bg-[color:var(--wariba-color-ink-790)] px-3">
          <span className="text-xs text-[color:var(--wariba-color-ink-300)]">Versement</span>
          <span
            className="inline-flex items-center gap-1.5 font-mono text-xs font-bold transition-colors duration-200"
            style={{
              color: frame.payoutReady
                ? 'var(--wariba-accent-emerald)'
                : 'var(--wariba-color-ink-500)',
            }}
          >
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full"
              style={{
                background: frame.payoutReady
                  ? 'var(--wariba-accent-emerald)'
                  : 'var(--wariba-color-ink-500)',
              }}
            />
            {frame.payoutReady ? 'DISPONIBLE' : 'EN CONSTRUCTION'}
          </span>
        </div>
      </div>
    </figure>
  );
}

/**
 * The equity line.
 *
 * Drawn by clipping a fully-rendered polyline rather than by animating a
 * `strokeDashoffset`: the fill under the curve has to be clipped too, and one
 * animated clip rectangle keeps line and area in step for free.
 */
function EquityChart({ drawn }: { drawn: number }) {
  const width = 420;
  const height = 120;
  const max = Math.max(...CURVE);
  const min = Math.min(...CURVE);
  const span = max - min || 1;

  const point = (value: number, index: number) => {
    const x = (index / (CURVE.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 16) - 8;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  const line = CURVE.map(point).join(' ');
  const area = `0,${height} ${line} ${width},${height}`;
  const clipWidth = (drawn / (CURVE.length - 1)) * width;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-5 h-[110px] w-full sm:h-[130px]"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ps-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#36B37E" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#36B37E" stopOpacity="0" />
        </linearGradient>
        <clipPath id="ps-clip">
          <rect x="0" y="0" width={clipWidth} height={height}>
            <animate
              attributeName="width"
              to={clipWidth}
              dur="0.6s"
              fill="freeze"
              calcMode="spline"
              keySplines="0.22 1 0.36 1"
            />
          </rect>
        </clipPath>
      </defs>

      {/* Gridlines: three, faint, so the curve has something to sit against. */}
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line
          key={ratio}
          x1="0"
          x2={width}
          y1={height * ratio}
          y2={height * ratio}
          stroke="var(--commerce-rule)"
          strokeWidth="1"
        />
      ))}

      <g clipPath="url(#ps-clip)">
        <polygon points={area} fill="url(#ps-area)" />
        <polyline
          points={line}
          fill="none"
          stroke="#36B37E"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
