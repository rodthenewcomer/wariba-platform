'use client';

import { memo, useEffect, useMemo, useState } from 'react';

export type ChartScaleMode = 'normal' | 'percentage' | 'logarithmic';

interface Horizon {
  id: string;
  label: string;
  seconds: number;
}

const HORIZONS: readonly Horizon[] = [
  { id: '1y', label: '1 an', seconds: 365 * 24 * 60 * 60 },
  { id: '3mo', label: '3 m', seconds: 90 * 24 * 60 * 60 },
  { id: '1mo', label: '1 m', seconds: 30 * 24 * 60 * 60 },
  { id: '5d', label: '5 j', seconds: 5 * 24 * 60 * 60 },
  { id: '3d', label: '3 j', seconds: 3 * 24 * 60 * 60 },
  { id: '1d', label: '1 j', seconds: 24 * 60 * 60 },
];

export interface ChartBottomBarProps {
  timezone: 'utc' | 'local';
  historyCoverageSeconds: number;
  canLoadOlder?: boolean;
  onSelectHorizon(seconds: number): void;
  scaleMode: ChartScaleMode;
  onScaleModeChange(mode: ChartScaleMode): void;
  autoScale: boolean;
  onAutoScaleChange(enabled: boolean): void;
}

function zoneLabel(timezone: ChartBottomBarProps['timezone'], date: Date): string {
  if (timezone === 'utc') return 'UTC';
  const offset = -date.getTimezoneOffset();
  if (offset === 0) return 'UTC';
  const sign = offset >= 0 ? '+' : '-';
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  return `UTC${sign}${hours}${minutes === 0 ? '' : `:${String(minutes).padStart(2, '0')}`}`;
}

function clockLabel(timezone: ChartBottomBarProps['timezone'], date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    ...(timezone === 'utc' ? { timeZone: 'UTC' } : {}),
  }).format(date);
}

const UTILITY_BUTTON =
  'h-7 min-w-7 rounded-[4px] px-1.5 text-[length:var(--wariba-component-workstation-type-label)] font-medium text-[color:var(--wariba-component-workstation-text-secondary)] transition-colors hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]';

/**
 * The chart's lower utility strip.
 *
 * Horizon controls only become actionable when the history already held by the
 * chart covers that duration. They never pretend to load a year from a bounded
 * WX1 process-memory window. Percentage, logarithmic and autoscale controls are
 * real lightweight-charts scale modes and do not change market data.
 */
export const ChartBottomBar = memo(function ChartBottomBar({
  timezone,
  historyCoverageSeconds,
  canLoadOlder = false,
  onSelectHorizon,
  scaleMode,
  onScaleModeChange,
  autoScale,
  onAutoScaleChange,
}: ChartBottomBarProps) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const time = useMemo(
    () => (now ? `${clockLabel(timezone, now)} ${zoneLabel(timezone, now)}` : '—:—:— UTC'),
    [now, timezone],
  );

  return (
    <div
      data-testid="chart-bottom-bar"
      className="hidden h-8 shrink-0 items-center justify-between border-t border-[color:var(--wariba-component-workstation-border-hairline)] bg-[color:var(--wariba-chart-background)] px-2 lg:flex"
    >
      <div className="flex items-center gap-0.5" aria-label="Horizons du graphique">
        {HORIZONS.map((horizon) => {
          const loaded = historyCoverageSeconds >= horizon.seconds;
          const available = loaded || canLoadOlder;
          return (
            <button
              key={horizon.id}
              type="button"
              disabled={!available}
              title={
                available
                  ? loaded
                    ? `Afficher ${horizon.label} d’historique chargé`
                    : `Charger puis afficher ${horizon.label} d’historique`
                  : `${horizon.label} indisponible avec l’historique chargé`
              }
              onClick={() => onSelectHorizon(horizon.seconds)}
              className={`${UTILITY_BUTTON} disabled:cursor-not-allowed disabled:opacity-45`}
            >
              {horizon.label}
            </button>
          );
        })}
        <span
          aria-label="Sélection de date indisponible"
          title="Sélection de date indisponible"
          className="ml-1 flex h-7 w-7 items-center justify-center border-l border-[color:var(--wariba-component-workstation-border-hairline)] pl-1 text-[color:var(--wariba-component-workstation-text-tertiary)]"
        >
          <span aria-hidden="true" className="text-base leading-none">
            ▣
          </span>
        </span>
      </div>

      <div className="flex items-center gap-0.5" aria-label="Échelle et session du graphique">
        <span
          data-testid="chart-clock"
          className="wariba-data mr-1 tabular-nums text-[length:var(--wariba-component-workstation-type-label)] text-[color:var(--wariba-component-workstation-text-secondary)]"
        >
          {time}
        </span>
        <button
          type="button"
          aria-label="Échelle en pourcentage"
          aria-pressed={scaleMode === 'percentage'}
          onClick={() => onScaleModeChange(scaleMode === 'percentage' ? 'normal' : 'percentage')}
          className={`${UTILITY_BUTTON} ${scaleMode === 'percentage' ? 'bg-[color:var(--wariba-component-workstation-wash-selected-strong)] text-[color:var(--wariba-component-workstation-interaction-selected-text)]' : ''}`}
        >
          %
        </button>
        <button
          type="button"
          aria-label="Échelle logarithmique"
          aria-pressed={scaleMode === 'logarithmic'}
          onClick={() => onScaleModeChange(scaleMode === 'logarithmic' ? 'normal' : 'logarithmic')}
          className={`${UTILITY_BUTTON} ${scaleMode === 'logarithmic' ? 'bg-[color:var(--wariba-component-workstation-wash-selected-strong)] text-[color:var(--wariba-component-workstation-interaction-selected-text)]' : ''}`}
        >
          log
        </button>
        <button
          type="button"
          aria-label="Ajustement automatique de l’échelle"
          aria-pressed={autoScale}
          onClick={() => onAutoScaleChange(!autoScale)}
          className={`${UTILITY_BUTTON} ${autoScale ? 'text-[color:var(--wariba-component-workstation-interaction-selected-text)]' : ''}`}
        >
          auto
        </button>
      </div>
    </div>
  );
});
