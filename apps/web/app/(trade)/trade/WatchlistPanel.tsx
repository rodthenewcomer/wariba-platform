'use client';

import { memo } from 'react';
import { Text } from '@wariba/ui';
import { TRADABLE_SYMBOLS, type SymbolSpec, type TradableSymbol } from '@wariba/contracts';
import { useTick, type TickStore } from './tick-store';

const MARKET_STATUS_LABEL = {
  open: 'Ouvert',
  stale: 'Périmé',
  closed: 'Fermé',
} as const;

interface WatchlistRowProps {
  store: TickStore;
  symbol: TradableSymbol;
  spec: SymbolSpec | undefined;
  selected: boolean;
  onSelect: (symbol: TradableSymbol) => void;
}

/** Subscribes to exactly this symbol's tick — a tick on any other symbol never re-renders this row. */
const WatchlistRow = memo(function WatchlistRow({
  store,
  symbol,
  spec,
  selected,
  onSelect,
}: WatchlistRowProps) {
  const tick = useTick(store, symbol);
  const spread = tick ? (Number(tick.ask) - Number(tick.bid)).toFixed(spec?.pricePrecision ?? 5) : null;
  return (
    <button
      type="button"
      onClick={() => onSelect(symbol)}
      className={`flex flex-col gap-0.5 rounded-[var(--wariba-radius-sm)] px-2 py-2 text-left ${
        selected ? 'bg-[color:var(--wariba-surface-selected)]' : ''
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-theme-text)]">
          {symbol}
        </span>
        <span
          className={`text-[length:var(--wariba-font-size-label-sm)] ${
            tick?.marketStatus === 'stale'
              ? 'text-[color:var(--wariba-status-warning-text)]'
              : 'text-[color:var(--wariba-text-secondary)]'
          }`}
        >
          {tick ? MARKET_STATUS_LABEL[tick.marketStatus] : '—'}
        </span>
      </span>
      <span className="flex items-center justify-between gap-2">
        <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
          {tick ? `${tick.bid} / ${tick.ask}` : '— / —'}
        </span>
        <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
          {spread ?? '—'}
        </span>
      </span>
    </button>
  );
});

export interface WatchlistPanelProps {
  store: TickStore;
  symbolSpecs: Partial<Record<TradableSymbol, SymbolSpec>>;
  selectedSymbol: TradableSymbol;
  onSelectSymbol: (symbol: TradableSymbol) => void;
}

export const WatchlistPanel = memo(function WatchlistPanel({
  store,
  symbolSpecs,
  selectedSymbol,
  onSelectSymbol,
}: WatchlistPanelProps) {
  return (
    <aside className="flex flex-col gap-1 border-b border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)] lg:w-[var(--wariba-size-trade-watchlist-max)] lg:border-b-0 lg:border-r">
      <Text variant="label-sm" color="tertiary" className="mb-1">
        Watchlist
      </Text>
      {TRADABLE_SYMBOLS.map((symbol) => (
        <WatchlistRow
          key={symbol}
          store={store}
          symbol={symbol}
          spec={symbolSpecs[symbol]}
          selected={symbol === selectedSymbol}
          onSelect={onSelectSymbol}
        />
      ))}
    </aside>
  );
});
