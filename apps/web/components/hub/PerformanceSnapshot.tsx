import type { PerformanceKpis } from '@wariba/application';
import { KpiTile } from './KpiTile';

/**
 * The trader's record, as tiles.
 *
 * Shared by the dashboard and `/performance` so the two can never disagree
 * about what a win rate is — the dashboard shows the first row, the
 * performance page shows all of them, and both read the same read model.
 *
 * ## Every `null` is deliberate
 *
 * A win rate with no trades is not 0 %; a profit factor with no losing trade
 * is not infinity. `KpiTile` renders those as an em dash. Filling them with
 * zeros would be the most quietly damaging thing on the page: a trader
 * comparing "0 % win rate" against a real one has been handed a fabricated
 * comparison.
 */

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return `${Math.round(ms / 1000)} s`;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}

function formatUsd(amount: string | null): string | null {
  if (amount === null) return null;
  const value = Number.parseFloat(amount);
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;
}

export function PerformanceSnapshot({
  kpis,
  variant = 'full',
}: {
  kpis: PerformanceKpis;
  /** `compact` shows the five figures worth a dashboard slot. */
  variant?: 'compact' | 'full';
}) {
  const netPnlValue = Number.parseFloat(kpis.netPnl);

  const compactTiles = [
    {
      label: 'P&L net',
      value: kpis.tradeCount > 0 ? kpis.netPnlFormatted : null,
      sentiment: 'auto' as const,
      numericValue: netPnlValue,
      hint: `${kpis.tradeCount} trade${kpis.tradeCount > 1 ? 's' : ''}`,
    },
    {
      label: 'Taux de réussite',
      value: kpis.winRatePercent === null ? null : `${kpis.winRatePercent} %`,
      hint: kpis.tradeCount > 0 ? `${kpis.wins} gagnants · ${kpis.losses} perdants` : null,
    },
    {
      label: 'Facteur de profit',
      value: kpis.profitFactor === null ? null : kpis.profitFactor.toFixed(2),
      hint: kpis.profitFactor === null && kpis.tradeCount > 0 ? 'Aucune perte' : null,
    },
    {
      label: 'Gain moyen',
      value: formatUsd(kpis.averageWin),
      sentiment: 'positive' as const,
    },
    {
      label: 'Perte moyenne',
      value: formatUsd(kpis.averageLoss),
      sentiment: 'negative' as const,
    },
  ];

  const extraTiles = [
    {
      label: 'Ratio gain/perte',
      value: kpis.winLossRatio === null ? null : kpis.winLossRatio.toFixed(2),
    },
    {
      label: 'Espérance par trade',
      value: formatUsd(kpis.expectancy),
      sentiment: 'auto' as const,
      numericValue: kpis.expectancy === null ? null : Number.parseFloat(kpis.expectancy),
    },
    {
      label: 'Meilleure journée',
      value: kpis.bestDay?.netPnlFormatted ?? null,
      sentiment: 'positive' as const,
      hint: kpis.bestDay?.date ?? null,
    },
    {
      label: 'Pire journée',
      value: kpis.worstDay?.netPnlFormatted ?? null,
      sentiment: 'negative' as const,
      hint: kpis.worstDay?.date ?? null,
    },
    {
      label: 'Journées tradées',
      value: kpis.tradingDays > 0 ? String(kpis.tradingDays) : null,
    },
    {
      label: 'Durée moyenne',
      value: kpis.averageDurationMs === null ? null : formatDuration(kpis.averageDurationMs),
    },
    {
      label: 'Série en cours',
      value:
        kpis.currentStreak === 0
          ? null
          : `${Math.abs(kpis.currentStreak)} ${kpis.currentStreak > 0 ? 'gain' : 'perte'}${
              Math.abs(kpis.currentStreak) > 1 ? 's' : ''
            }`,
      sentiment: 'auto' as const,
      numericValue: kpis.currentStreak,
    },
  ];

  const tiles = variant === 'compact' ? compactTiles : [...compactTiles, ...extraTiles];

  return (
    <div
      data-testid="performance-snapshot"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
    >
      {tiles.map((tile) => (
        <KpiTile
          key={tile.label}
          label={tile.label}
          value={tile.value}
          {...('hint' in tile ? { hint: tile.hint } : {})}
          {...('sentiment' in tile ? { sentiment: tile.sentiment } : {})}
          {...('numericValue' in tile ? { numericValue: tile.numericValue } : {})}
          compact
        />
      ))}
    </div>
  );
}
