import type { SymbolResult } from '@wariba/application';
import { Surface, SurfaceTitle } from '../../../components/hub/Surface';

/**
 * Which instruments actually made the money.
 *
 * A bar per symbol, scaled against the largest absolute contribution so a
 * small loser stays visible beside a large winner. The row also carries the
 * trade count and win rate, because a symbol with one lucky trade and a symbol
 * with forty disciplined ones can show the same total.
 */
export function SymbolBreakdown({ symbols }: { symbols: readonly SymbolResult[] }) {
  if (symbols.length === 0) return null;

  const scale = Math.max(...symbols.map((symbol) => Math.abs(Number.parseFloat(symbol.netPnl))), 1);

  return (
    <Surface className="flex flex-col gap-4 p-5 sm:p-6">
      <SurfaceTitle>Par instrument</SurfaceTitle>
      <ul className="flex list-none flex-col gap-3 p-0">
        {symbols.map((symbol) => {
          const value = Number.parseFloat(symbol.netPnl);
          const width = (Math.abs(value) / scale) * 100;
          const positive = value >= 0;
          return (
            <li key={symbol.symbol} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="wariba-data text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
                  {symbol.symbol}
                </span>
                <span
                  className="wariba-data text-[length:var(--wariba-font-size-label-md)] font-medium"
                  style={{
                    color: positive ? 'var(--wariba-accent-emerald)' : 'var(--wariba-accent-red)',
                  }}
                >
                  {symbol.netPnlFormatted}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--wariba-track)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(width, 2)}%`,
                    background: positive
                      ? 'var(--wariba-accent-emerald)'
                      : 'var(--wariba-accent-red)',
                  }}
                />
              </div>
              <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                {symbol.tradeCount} trade{symbol.tradeCount > 1 ? 's' : ''} ·{' '}
                {symbol.winRatePercent} % de réussite
              </p>
            </li>
          );
        })}
      </ul>
    </Surface>
  );
}
