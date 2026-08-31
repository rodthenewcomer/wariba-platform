'use client';

import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { motion } from 'motion/react';
import { cx } from '@wariba/ui';
import { AnimatedNumber } from '../../motion/primitives';
import { useHydratedReducedMotion } from '../../motion/useHydratedReducedMotion';
import { KpiTile, RadialGauge, ResultValue, SectionLabel } from './primitives';
import {
  ActivityDots,
  ExpectancyRail,
  MicroSparkline,
  NegativeHistogram,
  ProfitFactorRatio,
} from './MicroVisuals';
import {
  ANALYTICS_BY_RANGE,
  balanceEquitySeries,
  formatCount,
  formatEuro,
  formatFactor,
  formatPercent,
  formatSigned,
  formatSignedPercent,
  type Section07EquityPoint,
  type Section07Range,
} from './section07-data';

const RANGES: readonly Section07Range[] = ['7J', '30J', '90J'];

const CHART_WIDTH = 640;
const CHART_HEIGHT = 220;

/*
 * Module-level, not state: the entrance draw (grid fade, line draw, area
 * reveal, point pop-in) should only play in full the first time a visitor
 * ever lands on Analytics this page load. `ProductOSMockup` unmounts the
 * inactive surface entirely, so every later visit is a fresh mount — this
 * flag is what tells that fresh mount "you've been here before".
 */
let hasPlayedAnalyticsEntrance = false;

/**
 * Analytics — the wow surface. A dense bento of KPI tiles, a win-rate donut,
 * a large interactive cumulative P&L curve and a compact balance/equity
 * read underneath it. Every module is a different visual instrument on
 * purpose — that variety is what makes the surface read as data-rich rather
 * than as six identical cards.
 */
export function AnalyticsMockup({ onInteract }: { onInteract: () => void }) {
  const reduced = useHydratedReducedMotion();
  const [firstVisit] = useState(() => {
    const first = !hasPlayedAnalyticsEntrance;
    hasPlayedAnalyticsEntrance = true;
    return first;
  });
  const skipEntrance = reduced || !firstVisit;
  const [range, setRange] = useState<Section07Range>('30J');
  const frame = ANALYTICS_BY_RANGE[range];
  const lastIndex = frame.points.length - 1;
  const [selectedIndex, setSelectedIndex] = useState(lastIndex);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [equityHoverIndex, setEquityHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setSelectedIndex(frame.points.length - 1);
    setHoverIndex(null);
    setEquityHoverIndex(null);
  }, [range, frame.points.length]);

  function indexFromClientX(clientX: number): number {
    const svg = svgRef.current;
    if (!svg) return selectedIndex;
    const rect = svg.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(ratio * (frame.points.length - 1));
  }

  /*
   * Clamped at render time, not just in the reset effect: a range change and
   * a stale `selectedIndex` from the previous range's longer point array can
   * land in the same render (the effect below only fixes it a tick later),
   * and an out-of-bounds index here throws in the child chart.
   */
  const activeIndex = Math.min(hoverIndex ?? selectedIndex, lastIndex);
  const activePoint = frame.points[activeIndex]!;
  const equitySeries = balanceEquitySeries(frame);
  const latestEquity = equitySeries[equitySeries.length - 1]!;
  const equityActiveIndex = Math.min(
    equityHoverIndex ?? equitySeries.length - 1,
    equitySeries.length - 1,
  );
  const equityActivePoint = equitySeries[equityActiveIndex]!;

  return (
    <div className="min-w-0">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <motion.div layoutId="section07-focus-figure">
          <KpiTile
            label="TOTAL P&L"
            value={
              <AnimatedNumber
                value={frame.netPnl}
                format={(value) => formatSigned(value)}
                className={
                  frame.netPnl >= 0
                    ? 'text-[color:var(--wariba-accent-emerald)]'
                    : 'text-[color:var(--wariba-accent-red)]'
                }
              />
            }
            valueClassName="text-[clamp(1.4rem,3.2vw,2.1rem)]"
            delta={frame.netPnlDeltaLabel}
          />
        </motion.div>
        <KpiTile
          label="GAIN MOYEN"
          value={<AnimatedNumber value={frame.averageWinValue} format={formatSigned} />}
        >
          <MicroSparkline
            points={[0.58, 0.72, 0.64, 0.9, 0.8, 1].map((ratio) => frame.averageWinValue * ratio)}
            reduced={skipEntrance}
          />
        </KpiTile>
        <KpiTile
          label="PROFIT FACTOR"
          value={<AnimatedNumber value={frame.profitFactorValue} format={formatFactor} />}
        >
          <ProfitFactorRatio value={frame.profitFactorValue} reduced={skipEntrance} />
        </KpiTile>

        <div
          className="wariba-visual-card flex min-w-0 flex-col items-center justify-center gap-1 p-3 sm:p-4"
          data-variant="panel"
        >
          <RadialGauge
            percent={frame.winRatePercent}
            label="Taux de réussite"
            reduced={reduced}
            size={92}
            thickness={9}
            gradientFrom="var(--wariba-brand-400)"
            gradientTo="var(--wariba-accent-cyan)"
            showTicks
            headDot
          >
            <AnimatedNumber
              value={frame.winRatePercent}
              format={(value) => formatPercent(value)}
              className="font-mono text-lg font-bold text-[color:var(--wariba-on-dark)]"
            />
          </RadialGauge>
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[color:var(--wariba-on-dark-dim)]">
            Taux de réussite
          </p>
          <p className="text-[0.65rem] text-[color:var(--wariba-on-dark-dim)]">
            <span className="text-[color:var(--wariba-accent-emerald)]">
              <AnimatedNumber value={frame.winsCount} format={formatCount} /> gagnants
            </span>
            {' · '}
            <span className="text-[color:var(--wariba-accent-red)]">
              <AnimatedNumber value={frame.lossesCount} format={formatCount} /> perdants
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2.15fr)_minmax(0,1fr)]">
        <div className="wariba-visual-card min-w-0 p-4 sm:p-5" data-variant="panel">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>P&amp;L CUMULÉ</SectionLabel>
            <div
              role="group"
              aria-label="Période d’analyse"
              className="inline-flex items-center gap-1 rounded-full border border-[color:var(--wariba-seam)] bg-[color:var(--wariba-surface-1)] p-1"
            >
              {RANGES.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={option === range}
                  onClick={() => {
                    onInteract();
                    setRange(option);
                  }}
                  className={cx(
                    'rounded-full px-2.5 py-1 font-mono text-[0.65rem] font-bold tracking-[0.06em] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-brand-400)]',
                    option === range
                      ? 'bg-[color:var(--wariba-brand-500)] text-white'
                      : 'text-[color:var(--wariba-on-dark-dim)] hover:text-[color:var(--wariba-on-dark-muted)]',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mt-3">
            <AnalyticsChart
              key={range}
              points={frame.points}
              activeIndex={activeIndex}
              svgRef={svgRef}
              reduced={reduced}
              skipEntrance={skipEntrance}
              onHover={setHoverIndex}
              onSelect={(index) => {
                onInteract();
                setSelectedIndex(index);
              }}
              indexFromClientX={indexFromClientX}
            />

            <motion.div
              className="pointer-events-none absolute top-0 rounded-lg border border-[color:var(--wariba-seam-strong)] bg-[color:var(--wariba-surface-2)] px-3.5 py-2.5 shadow-[0_16px_34px_-16px_rgb(0_0_0_/_65%)] transition-[left] duration-200"
              style={{
                left: `${(activeIndex / Math.max(1, frame.points.length - 1)) * 100}%`,
                /*
                 * `x` here, not a plain CSS `transform` — this is a
                 * `motion.div`, so Motion owns the `transform` property once
                 * anything animates on it (the entrance `y` below). A raw
                 * `transform: translateX(...)` in `style` gets silently
                 * overwritten by Motion's own generated matrix; `x` is the
                 * Motion-aware equivalent, composed together with `y`.
                 */
                x: activeIndex === 0 ? '0%' : activeIndex === lastIndex ? '-100%' : '-50%',
                boxShadow:
                  '0 16px 34px -16px rgb(0 0 0 / 65%), inset 0 1px 0 0 color-mix(in srgb, white 6%, transparent)',
              }}
              initial={skipEntrance ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: skipEntrance ? 0 : 0.3,
                delay: skipEntrance ? 0 : 1.1,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <p className="font-mono text-[0.6rem] font-semibold tracking-[0.1em] text-[color:var(--wariba-on-dark-dim)]">
                {activePoint.label.toUpperCase()}
              </p>
              <div className="mt-1.5 flex items-center gap-3.5">
                <span>
                  <span className="block text-[0.58rem] uppercase tracking-[0.08em] text-[color:var(--wariba-on-dark-dim)]">
                    P&amp;L
                  </span>
                  <ResultValue
                    label={formatSigned(activePoint.value)}
                    positive={activePoint.value >= 0}
                    className="wariba-figure whitespace-nowrap text-base"
                  />
                </span>
                <span
                  className="h-7 w-px shrink-0 bg-[color:var(--wariba-seam)]"
                  aria-hidden="true"
                />
                <span>
                  <span className="block text-[0.58rem] uppercase tracking-[0.08em] text-[color:var(--wariba-on-dark-dim)]">
                    Trades
                  </span>
                  <span className="wariba-figure text-sm font-semibold text-[color:var(--wariba-on-dark)]">
                    {activePoint.trades}
                  </span>
                </span>
                <span>
                  <span className="block text-[0.58rem] uppercase tracking-[0.08em] text-[color:var(--wariba-on-dark-dim)]">
                    Réussite
                  </span>
                  <span className="wariba-figure text-sm font-semibold text-[color:var(--wariba-on-dark)]">
                    {activePoint.winRatePercent.toFixed(0)}%
                  </span>
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="wariba-visual-card min-w-0 p-4 sm:p-5" data-variant="panel">
          <SectionLabel>SOLDE VS ÉQUITÉ</SectionLabel>
          <div className="mt-2 flex items-end gap-5">
            <div>
              <p className="text-[0.58rem] uppercase tracking-[0.08em] text-[color:var(--wariba-on-dark-dim)]">
                Solde
              </p>
              <AnimatedNumber
                value={latestEquity.balance}
                format={formatEuro}
                className="wariba-figure mt-0.5 block text-lg font-bold text-[color:var(--wariba-on-dark)]"
              />
            </div>
            <div>
              <p className="text-[0.58rem] uppercase tracking-[0.08em] text-[color:var(--wariba-on-dark-dim)]">
                Équité
              </p>
              <AnimatedNumber
                value={latestEquity.equity}
                format={formatEuro}
                className="wariba-figure mt-0.5 block text-lg font-bold text-[color:var(--wariba-accent-cyan)]"
              />
            </div>
          </div>

          <BalanceEquityChart
            key={range}
            series={equitySeries}
            skipEntrance={skipEntrance}
            activeIndex={equityActiveIndex}
            onHover={setEquityHoverIndex}
          />

          <div className="mt-2 flex items-center gap-4 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-[color:var(--wariba-on-dark-dim)]">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-[2px] w-3 rounded-full bg-[color:var(--wariba-brand-400)]"
              />
              Solde
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-[2px] w-3 rounded-full bg-[color:var(--wariba-accent-cyan)]"
              />
              Équité
            </span>
            <span className="inline-flex items-center gap-1.5 opacity-70">
              <span
                aria-hidden="true"
                className="h-[2px] w-3 rounded-full border-t border-dashed border-[color:var(--wariba-accent-amber)]"
              />
              Drawdown
            </span>
          </div>

          <div className="mt-3 rounded-lg border border-[color:var(--wariba-seam)] bg-[color:var(--wariba-surface-1)] px-3 py-2">
            <p className="font-mono text-[0.55rem] font-semibold tracking-[0.1em] text-[color:var(--wariba-on-dark-dim)]">
              {equityActivePoint.label.toUpperCase()}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem]">
              <span className="wariba-figure font-semibold text-[color:var(--wariba-on-dark)]">
                Solde {formatEuro(equityActivePoint.balance)}
              </span>
              <span className="wariba-figure font-semibold text-[color:var(--wariba-accent-cyan)]">
                Équité {formatEuro(equityActivePoint.equity)}
              </span>
              <span
                className={cx(
                  'wariba-figure font-semibold',
                  equityActivePoint.drawdownPercent < 0
                    ? 'text-[color:var(--wariba-accent-amber)]'
                    : 'text-[color:var(--wariba-on-dark-dim)]',
                )}
              >
                Drawdown {formatSignedPercent(equityActivePoint.drawdownPercent)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          label="MEILLEUR JOUR"
          value={<AnimatedNumber value={frame.bestDayValue} format={formatSigned} />}
        >
          <MicroSparkline
            points={[0.3, 0.45, 0.4, 0.65, 0.55, 0.8, 1].map((ratio) => frame.bestDayValue * ratio)}
            reduced={skipEntrance}
          />
        </KpiTile>
        <KpiTile
          label="PERTE MOYENNE"
          value={<AnimatedNumber value={frame.averageLossValue} format={formatSigned} />}
        >
          <NegativeHistogram
            bars={[0.55, 0.85, 0.65, 1, 0.7].map(
              (ratio) => Math.abs(frame.averageLossValue) * ratio,
            )}
            reduced={skipEntrance}
          />
        </KpiTile>
        <KpiTile
          label="TRADES"
          value={<AnimatedNumber value={frame.tradesCount} format={formatCount} />}
        >
          <ActivityDots
            weights={Array.from(
              { length: 8 },
              (_, index) => (Math.sin((frame.tradesCount + index) * 1.3) + 1) / 2,
            )}
            reduced={skipEntrance}
          />
        </KpiTile>
        <KpiTile
          label="EXPECTANCY"
          value={<AnimatedNumber value={frame.expectancyValue} format={formatSigned} />}
        >
          <ExpectancyRail positive={frame.expectancyValue >= 0} reduced={skipEntrance} />
        </KpiTile>
      </div>
    </div>
  );
}

function AnalyticsChart({
  points,
  activeIndex,
  svgRef,
  reduced,
  skipEntrance,
  onHover,
  onSelect,
  indexFromClientX,
}: {
  points: readonly { label: string; value: number; trades: number }[];
  activeIndex: number;
  svgRef: RefObject<SVGSVGElement | null>;
  reduced: boolean;
  skipEntrance: boolean;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
  indexFromClientX: (clientX: number) => number;
}) {
  const max = Math.max(...points.map((point) => point.value), 0);
  const min = Math.min(...points.map((point) => point.value), 0);
  const span = max - min || 1;

  const coordinate = (value: number, index: number) => {
    const x = (index / (points.length - 1 || 1)) * CHART_WIDTH;
    const y = CHART_HEIGHT - ((value - min) / span) * (CHART_HEIGHT - 24) - 12;
    return { x, y };
  };

  const zeroY = CHART_HEIGHT - ((0 - min) / span) * (CHART_HEIGHT - 24) - 12;
  const linePoints = points.map((point, index) => coordinate(point.value, index));
  const linePath = linePoints
    .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `0,${CHART_HEIGHT} ${linePath} ${CHART_WIDTH},${CHART_HEIGHT}`;
  const active = linePoints[activeIndex]!;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      preserveAspectRatio="none"
      className="h-[180px] w-full cursor-pointer sm:h-[240px]"
      onPointerMove={(event) => onHover(indexFromClientX(event.clientX))}
      onPointerLeave={() => onHover(null)}
      onClick={(event) => onSelect(indexFromClientX(event.clientX))}
      role="img"
      aria-label={`Courbe de P&L cumulé sur la période, de ${points[0]!.label} à ${points[points.length - 1]!.label}, terminant à ${formatSigned(points[points.length - 1]!.value)}.`}
    >
      <defs>
        <linearGradient id="s07-analytics-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--wariba-brand-400)" stopOpacity="0.36" />
          <stop offset="55%" stopColor="var(--wariba-brand-400)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--wariba-brand-400)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="s07-analytics-head-glow">
          <stop offset="0%" stopColor="var(--wariba-color-cobalt-300)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--wariba-color-cobalt-300)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <motion.g
        initial={skipEntrance ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: skipEntrance ? 0 : 0.3 }}
      >
        {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            x2={CHART_WIDTH}
            y1={CHART_HEIGHT * ratio}
            y2={CHART_HEIGHT * ratio}
            stroke="var(--wariba-seam)"
            strokeWidth="1"
            shapeRendering="crispEdges"
          />
        ))}
        <line
          x1="0"
          x2={CHART_WIDTH}
          y1={zeroY}
          y2={zeroY}
          stroke="var(--wariba-seam-strong)"
          strokeWidth="1"
          strokeDasharray="3 4"
          shapeRendering="crispEdges"
        />
      </motion.g>

      <motion.polygon
        points={areaPath}
        fill="url(#s07-analytics-area)"
        initial={skipEntrance ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: skipEntrance ? 0 : 0.55, delay: skipEntrance ? 0 : 0.55 }}
      />
      <motion.polyline
        points={linePath}
        fill="none"
        stroke="var(--wariba-brand-400)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        shapeRendering="geometricPrecision"
        initial={skipEntrance ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: skipEntrance ? 0 : 0.8,
          delay: skipEntrance ? 0 : 0.2,
          ease: [0.22, 1, 0.36, 1],
        }}
      />
      <motion.circle
        r={13}
        fill="url(#s07-analytics-head-glow)"
        initial={
          skipEntrance
            ? { opacity: 1, cx: active.x, cy: active.y }
            : { opacity: 0, cx: active.x, cy: active.y }
        }
        animate={{ opacity: 1, cx: active.x, cy: active.y }}
        transition={{
          duration: reduced ? 0 : 0.3,
          delay: skipEntrance ? 0 : 1,
          ease: [0.22, 1, 0.36, 1],
        }}
      />
      <motion.circle
        r={5}
        fill="var(--wariba-color-cobalt-300)"
        stroke="var(--wariba-color-carbon-980)"
        strokeWidth="2"
        initial={
          skipEntrance
            ? { opacity: 1, scale: 1, cx: active.x, cy: active.y }
            : { opacity: 0, scale: 0.4, cx: active.x, cy: active.y }
        }
        animate={{ opacity: 1, scale: 1, cx: active.x, cy: active.y }}
        transition={{
          duration: reduced ? 0 : 0.3,
          delay: skipEntrance ? 0 : 1,
          ease: [0.22, 1, 0.36, 1],
        }}
      />
    </svg>
  );
}

const MINI_WIDTH = 280;
const MINI_HEIGHT = 128;

function BalanceEquityChart({
  series,
  skipEntrance,
  activeIndex,
  onHover,
}: {
  series: readonly Section07EquityPoint[];
  skipEntrance: boolean;
  activeIndex: number;
  onHover: (index: number | null) => void;
}) {
  const values = series.flatMap((entry) => [entry.balance, entry.equity]);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;

  const yFor = (value: number) => MINI_HEIGHT - ((value - min) / span) * (MINI_HEIGHT - 20) - 10;
  const xFor = (index: number) => (index / (series.length - 1 || 1)) * MINI_WIDTH;

  const linePath = (key: 'balance' | 'equity') =>
    series
      .map((entry, index) => `${xFor(index).toFixed(1)},${yFor(entry[key]).toFixed(1)}`)
      .join(' ');
  const areaPath = `0,${MINI_HEIGHT} ${linePath('equity')} ${MINI_WIDTH},${MINI_HEIGHT}`;

  /* Drawdown rides its own compact band along the chart's floor — always ≤
     0, so a min-of-0 scale keeps it low-hierarchy without a second axis. */
  const drawdownMin = Math.min(...series.map((entry) => entry.drawdownPercent), -0.01);
  const drawdownBandHeight = MINI_HEIGHT * 0.22;
  const drawdownPath = series
    .map((entry, index) => {
      const ratio = entry.drawdownPercent / drawdownMin;
      const y = MINI_HEIGHT - ratio * drawdownBandHeight;
      return `${xFor(index).toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const active = series[activeIndex]!;
  const activeX = xFor(activeIndex);

  function handlePointer(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    onHover(Math.round(ratio * (series.length - 1)));
  }

  return (
    <svg
      viewBox={`0 0 ${MINI_WIDTH} ${MINI_HEIGHT}`}
      preserveAspectRatio="none"
      className="mt-3 h-[112px] w-full cursor-pointer sm:h-[128px]"
      role="img"
      aria-label={`Solde et équité sur la période, terminant à ${formatEuro(series[series.length - 1]!.balance)} de solde et ${formatEuro(series[series.length - 1]!.equity)} d’équité.`}
      onPointerMove={handlePointer}
      onPointerLeave={() => onHover(null)}
    >
      <defs>
        <linearGradient id="s07-equity-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--wariba-accent-cyan)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--wariba-accent-cyan)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <motion.polygon
        points={areaPath}
        fill="url(#s07-equity-area)"
        initial={skipEntrance ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: skipEntrance ? 0 : 0.5, delay: skipEntrance ? 0 : 0.45 }}
      />

      <motion.polyline
        points={drawdownPath}
        fill="none"
        stroke="var(--wariba-accent-amber)"
        strokeOpacity="0.4"
        strokeWidth="1"
        strokeDasharray="2 3"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={skipEntrance ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.4 }}
        transition={{
          duration: skipEntrance ? 0 : 0.6,
          delay: skipEntrance ? 0 : 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
      />

      <motion.polyline
        points={linePath('equity')}
        fill="none"
        stroke="var(--wariba-accent-cyan)"
        strokeWidth="1.75"
        strokeDasharray="3 3"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={skipEntrance ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          duration: skipEntrance ? 0 : 0.7,
          delay: skipEntrance ? 0 : 0.3,
          ease: [0.22, 1, 0.36, 1],
        }}
      />
      <motion.polyline
        points={linePath('balance')}
        fill="none"
        stroke="var(--wariba-brand-400)"
        strokeWidth="2.25"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={skipEntrance ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: skipEntrance ? 0 : 0.7,
          delay: skipEntrance ? 0 : 0.15,
          ease: [0.22, 1, 0.36, 1],
        }}
      />

      <line
        x1={activeX}
        x2={activeX}
        y1="0"
        y2={MINI_HEIGHT}
        stroke="var(--wariba-seam)"
        strokeWidth="1"
      />
      <circle
        cx={activeX}
        cy={yFor(active.equity)}
        r={3}
        fill="var(--wariba-accent-cyan)"
        stroke="var(--wariba-color-carbon-980)"
        strokeWidth="1.5"
      />
      <circle
        cx={activeX}
        cy={yFor(active.balance)}
        r={3}
        fill="var(--wariba-brand-400)"
        stroke="var(--wariba-color-carbon-980)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
