'use client';

import { useEffect, useState } from 'react';
import { cx, LivePillHost } from './live-pill-host';
import { useHydratedReducedMotion } from '../../motion/useHydratedReducedMotion';

const CANDLES = [
  [46, 62, 40, 58, 1],
  [58, 70, 54, 66, 1],
  [66, 72, 58, 61, 0],
  [61, 64, 48, 52, 0],
  [52, 68, 50, 65, 1],
  [65, 78, 62, 74, 1],
  [74, 80, 68, 71, 0],
  [71, 88, 69, 85, 1],
  [85, 92, 80, 83, 0],
  [83, 96, 81, 94, 1],
  [94, 104, 90, 101, 1],
  [101, 106, 92, 96, 0],
  [96, 112, 94, 110, 1],
  [110, 118, 106, 115, 1],
] as const;

/**
 * WariX, shown rather than described.
 *
 * ## Why a component and not a screenshot
 *
 * A screenshot of a trading terminal on a marketing page ages the day the
 * terminal changes, renders soft on a retina display, and costs a request on
 * the critical path. This is the terminal's *shape* — chart, ticket, positions,
 * risk ribbon — drawn in DOM and SVG, at a fraction of the weight and with the
 * brand's own tokens rather than whatever the screenshot happened to capture.
 *
 * ## What moves
 *
 * The shell is nailed down. Inside it, the last candle grows, the P&L follows
 * it, and the risk ribbon fills. Nothing slides, nothing rotates, no card
 * enters — the law the whole product runs on, applied to a marketing asset.
 *
 * Every figure is fabricated and the frame says so. A plausible terminal is the
 * easiest place on a public site to imply a real trader's real result.
 */
export function WariXShowcase({ className }: { className?: string }) {
  const reduced = useHydratedReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => setTick((t) => (t + 1) % 4), 2100);
    return () => window.clearInterval(timer);
  }, [reduced]);

  const step = reduced ? 3 : tick;
  const pnl = [284, 412, 509, 631][step]!;
  const lastClose = [110, 113, 115, 118][step]!;
  const riskPercent = [38, 46, 52, 61][step]!;

  return (
    <div
      className={cx(
        'overflow-hidden rounded-[var(--wariba-radius-2xl)] border border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-deep)] shadow-[inset_0_1px_0_var(--wariba-inner-highlight)]',
        className,
      )}
      aria-label="Aperçu du poste de travail WariX"
      role="img"
    >
      {/* ── Barre de compte ── */}
      <div className="flex items-center justify-between gap-3 border-b border-[color:var(--wariba-seam)] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="rounded-md bg-[color:var(--wariba-brand-wash)] px-2 py-1 font-mono text-[11px] font-bold text-[color:var(--wariba-brand-300)]">
            WariX
          </span>
          <span className="truncate font-mono text-[11px] text-[color:var(--wariba-on-dark-dim)]">
            ONE · 25K · Performance
          </span>
        </div>
        <LivePillHost />
      </div>

      <div className="grid gap-px bg-[color:var(--wariba-seam)] sm:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        {/* ── Graphique ── */}
        <div className="bg-[color:var(--wariba-canvas-deep)] p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--wariba-on-dark-dim)]">
              XAUUSD · M5
            </span>
            <span className="wariba-figure text-lg font-bold text-[color:var(--wariba-accent-emerald)]">
              +{pnl.toLocaleString('fr-FR')}
            </span>
          </div>

          <svg viewBox="0 0 320 140" className="mt-3 h-[140px] w-full" aria-hidden="true">
            {[35, 70, 105].map((gy) => (
              <line
                key={gy}
                x1="0"
                y1={gy}
                x2="320"
                y2={gy}
                stroke="var(--wariba-seam)"
                strokeWidth="1"
              />
            ))}
            {CANDLES.map(([o, h, l, c, up], i) => {
              const cx0 = 12 + i * 22;
              const isLast = i === CANDLES.length - 1;
              const close = isLast ? lastClose : c;
              const high = isLast ? Math.max(h, close + 4) : h;
              const scale = (v: number) => 140 - (v / 130) * 128;
              const top = scale(Math.max(o, close));
              const body = Math.max(3, Math.abs(scale(o) - scale(close)));
              return (
                <g key={i}>
                  <line
                    x1={cx0}
                    y1={scale(high)}
                    x2={cx0}
                    y2={scale(l)}
                    stroke={up ? '#36B37E' : '#F46E6E'}
                    strokeWidth="1.5"
                  />
                  <rect
                    x={cx0 - 5}
                    y={top}
                    width="10"
                    height={body}
                    rx="1.5"
                    fill={up ? '#36B37E' : '#F46E6E'}
                    opacity={isLast ? 1 : 0.82}
                    style={{ transition: 'y 700ms ease, height 700ms ease' }}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* ── Ticket, positions, risque ── */}
        <div className="flex flex-col gap-px bg-[color:var(--wariba-seam)]">
          <div className="bg-[color:var(--wariba-canvas-deep)] p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--wariba-on-dark-dim)]">
              Ordre
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <span className="rounded-md bg-[color:color-mix(in_srgb,#36B37E_18%,transparent)] py-2 text-center text-xs font-bold text-[color:var(--wariba-accent-emerald)]">
                Acheter
              </span>
              <span className="rounded-md bg-[color:var(--wariba-surface-2)] py-2 text-center text-xs font-bold text-[color:var(--wariba-on-dark-dim)]">
                Vendre
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between rounded-md bg-[color:var(--wariba-surface-2)] px-2.5 py-2">
              <span className="text-[11px] text-[color:var(--wariba-on-dark-dim)]">Volume</span>
              <span className="wariba-figure text-xs text-[color:var(--wariba-on-dark)]">0,50</span>
            </div>
          </div>

          <div className="bg-[color:var(--wariba-canvas-deep)] p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--wariba-on-dark-dim)]">
              Position
            </p>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-xs text-[color:var(--wariba-on-dark)]">XAUUSD</span>
              <span className="wariba-figure text-xs font-bold text-[color:var(--wariba-accent-emerald)]">
                +{Math.round(pnl * 0.42).toLocaleString('fr-FR')}
              </span>
            </div>
          </div>

          <div className="bg-[color:var(--wariba-canvas-deep)] p-4">
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--wariba-on-dark-dim)]">
                Objectif
              </p>
              <span className="wariba-figure text-xs font-bold text-[color:var(--wariba-brand-300)]">
                {riskPercent}%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color:var(--wariba-track)]">
              <div
                className="h-full rounded-full bg-[color:var(--wariba-brand-500)]"
                style={{ width: `${riskPercent}%`, transition: 'width 700ms ease' }}
              />
            </div>
          </div>
        </div>
      </div>

      <p className="border-t border-[color:var(--wariba-seam)] px-4 py-2 text-[11px] text-[color:var(--wariba-on-dark-dim)]">
        Aperçu de l’interface · données fictives
      </p>
    </div>
  );
}
