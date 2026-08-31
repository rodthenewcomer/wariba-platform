'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { cx } from '@wariba/ui';
import { useHydratedReducedMotion } from '../../motion/useHydratedReducedMotion';
import { DirectionTag, ResultValue, SectionLabel } from './primitives';
import { JOURNAL_TRADES, formatSigned, type Section07Trade } from './section07-data';

function formatPrice(value: number): string {
  if (value >= 1000) return value.toFixed(1);
  if (value >= 10) return value.toFixed(2);
  return value.toFixed(4);
}

/**
 * Journal — trade review, not a table. A rail of trades on the left, a real
 * trade-path visual in the center (entry, stop, target, exit), the setup's
 * metadata and note on the right.
 */
export function JournalMockup({ onInteract }: { onInteract: () => void }) {
  const reduced = useHydratedReducedMotion();
  const [selectedId, setSelectedId] = useState(JOURNAL_TRADES[0]!.id);
  const trade = JOURNAL_TRADES.find((candidate) => candidate.id === selectedId) ?? JOURNAL_TRADES[0]!;
  const positive = trade.resultValue >= 0;

  function select(id: string) {
    onInteract();
    setSelectedId(id);
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,0.62fr)_minmax(0,1.05fr)_minmax(0,0.62fr)]">
      <div className="min-w-0">
        <SectionLabel>TRADES RÉCENTS</SectionLabel>
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {JOURNAL_TRADES.map((row) => {
            const selected = row.id === selectedId;
            return (
              <li key={row.id} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => select(row.id)}
                  className={cx(
                    'flex w-full min-w-[13rem] items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-brand-400)] lg:min-w-0',
                    selected
                      ? 'border-[color:var(--wariba-brand-edge)] bg-[color:var(--wariba-surface-2)]'
                      : 'border-[color:var(--wariba-seam)] bg-[color:var(--wariba-surface-1)] hover:border-[color:var(--wariba-seam-strong)]',
                  )}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <DirectionTag direction={row.direction} />
                      <span className="truncate font-mono text-xs font-semibold text-[color:var(--wariba-on-dark)]">
                        {row.instrument}
                      </span>
                    </span>
                    <span className="mt-1 block text-[0.65rem] text-[color:var(--wariba-on-dark-dim)]">
                      {row.dateLabel} · {row.timeLabel}
                    </span>
                  </span>
                  <ResultValue
                    label={formatSigned(row.resultValue)}
                    positive={row.resultValue >= 0}
                    className="shrink-0 text-xs"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <motion.div
        key={trade.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="wariba-visual-card min-w-0 p-5 sm:p-6"
        data-variant="panel"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <DirectionTag direction={trade.direction} />
              <p className="font-mono text-lg font-bold text-[color:var(--wariba-on-dark)]">
                {trade.instrument}
              </p>
            </div>
            <p className="mt-1 text-xs text-[color:var(--wariba-on-dark-dim)]">
              {trade.dateLabel} · {trade.timeLabel} · {trade.session}
            </p>
          </div>
          <motion.div layoutId="section07-focus-figure" className="text-right">
            <ResultValue
              label={formatSigned(trade.resultValue)}
              positive={positive}
              className="text-2xl sm:text-3xl"
            />
          </motion.div>
        </div>

        <TradePathChart key={trade.id} trade={trade} positive={positive} reduced={reduced} />

        <div className="mt-4 flex items-center justify-between border-t border-[color:var(--wariba-seam)] pt-3 text-xs">
          <span className="text-[color:var(--wariba-on-dark-dim)]">
            ENTRÉE{' '}
            <span className="wariba-figure font-semibold text-[color:var(--wariba-on-dark)]">
              {formatPrice(trade.entryPrice)}
            </span>
          </span>
          <span className="text-[color:var(--wariba-on-dark-dim)]">
            SORTIE{' '}
            <span
              className={cx(
                'wariba-figure font-semibold',
                positive
                  ? 'text-[color:var(--wariba-accent-emerald)]'
                  : 'text-[color:var(--wariba-accent-red)]',
              )}
            >
              {formatPrice(trade.exitPrice)}
            </span>
          </span>
        </div>
      </motion.div>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="wariba-visual-card p-5 sm:p-6" data-variant="panel">
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-[0.6rem] uppercase tracking-[0.08em] text-[color:var(--wariba-on-dark-dim)]">
                Setup
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[color:var(--wariba-on-dark)]">
                {trade.setup}
              </dd>
            </div>
            <div>
              <dt className="text-[0.6rem] uppercase tracking-[0.08em] text-[color:var(--wariba-on-dark-dim)]">
                Durée
              </dt>
              <dd className="wariba-figure mt-1 text-sm font-semibold text-[color:var(--wariba-on-dark)]">
                {trade.durationLabel}
              </dd>
            </div>
          </dl>

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[color:var(--wariba-seam)] pt-4">
            <div>
              <dt className="text-[0.6rem] uppercase tracking-[0.08em] text-[color:var(--wariba-on-dark-dim)]">
                Résultat
              </dt>
              <dd
                className={cx(
                  'wariba-figure mt-1 text-lg font-bold',
                  positive
                    ? 'text-[color:var(--wariba-accent-emerald)]'
                    : 'text-[color:var(--wariba-accent-red)]',
                )}
              >
                {trade.outcomeLabel}
              </dd>
            </div>
            <div>
              <dt className="text-[0.6rem] uppercase tracking-[0.08em] text-[color:var(--wariba-on-dark-dim)]">
                Session
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[color:var(--wariba-on-dark)]">
                {trade.session}
              </dd>
            </div>
          </div>
        </div>

        <div className="wariba-visual-card p-5 sm:p-6" data-variant="panel">
          <SectionLabel>CONTEXTE</SectionLabel>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
            {trade.note}
          </p>
        </div>
      </div>
    </div>
  );
}

const CHART_WIDTH = 420;
const CHART_HEIGHT = 150;

/** The trade's price path — entry, the road it took, stop/target context, and exit. */
function TradePathChart({
  trade,
  positive,
  reduced,
}: {
  trade: Section07Trade;
  positive: boolean;
  reduced: boolean;
}) {
  const isLong = trade.direction === 'LONG';
  const values = trade.path;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const padding = Math.max((max - min) * 0.35, 1);
  const top = max + padding;
  const bottom = min - padding;
  const span = top - bottom || 1;

  const coordinate = (value: number, index: number) => {
    const x = (index / (values.length - 1 || 1)) * CHART_WIDTH;
    const y = CHART_HEIGHT - ((value - bottom) / span) * CHART_HEIGHT;
    return { x, y };
  };

  const linePoints = values.map((value, index) => coordinate(value, index));
  const linePath = linePoints.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const entry = linePoints[0]!;
  const exit = linePoints[linePoints.length - 1]!;

  /* Stop sits opposite the favourable direction, target the same side as it —
     illustrative boundaries, not a literal risk/reward computation. */
  const stopY = isLong ? CHART_HEIGHT - 6 : 6;
  const targetY = isLong ? 6 : CHART_HEIGHT - 6;
  const exitColor = positive ? 'var(--wariba-accent-emerald)' : 'var(--wariba-accent-red)';

  return (
    <div className="relative mt-4">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-[130px] w-full sm:h-[150px]"
        role="img"
        aria-label={`Trajectoire du trade ${trade.instrument} : entrée à ${formatPrice(trade.entryPrice)}, sortie à ${formatPrice(trade.exitPrice)}, résultat ${trade.outcomeLabel}.`}
      >
        <motion.line
          x1="0"
          x2={CHART_WIDTH}
          y1={targetY}
          y2={targetY}
          stroke="var(--wariba-accent-emerald)"
          strokeOpacity="0.4"
          strokeWidth="1"
          strokeDasharray="4 4"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
        <motion.line
          x1="0"
          x2={CHART_WIDTH}
          y1={stopY}
          y2={stopY}
          stroke="var(--wariba-accent-red)"
          strokeOpacity="0.4"
          strokeWidth="1"
          strokeDasharray="4 4"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />

        <motion.polyline
          points={linePath}
          fill="none"
          stroke="var(--wariba-brand-400)"
          strokeWidth="2.25"
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduced ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
        />

        <motion.circle
          cx={entry.x}
          cy={entry.y}
          r={5}
          fill="var(--wariba-color-carbon-980)"
          stroke="var(--wariba-brand-300)"
          strokeWidth="2"
          initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduced ? 0 : 0.25, delay: reduced ? 0 : 0.1 }}
        />
        <motion.circle
          cx={exit.x}
          cy={exit.y}
          r={5}
          fill={exitColor}
          stroke="var(--wariba-color-carbon-980)"
          strokeWidth="2"
          initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduced ? 0 : 0.25, delay: reduced ? 0 : 0.45 }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.06em] text-[color:var(--wariba-on-dark-dim)]">
        <span>Entrée</span>
        <span>Sortie</span>
      </div>
    </div>
  );
}
