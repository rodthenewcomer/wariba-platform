'use client';

import { memo, useCallback } from 'react';
import { BottomSheet } from '@wariba/ui';
import type { SymbolSpec, TradableSymbol } from '@wariba/contracts';
import { MarketNavigator } from '../MarketNavigator';
import { useTick, type TickStore } from '../tick-store';

export interface MobileMarketBarProps {
  store: TickStore;
  symbolSpecs: Partial<Record<TradableSymbol, SymbolSpec>>;
  selectedSymbol: TradableSymbol;
  favorites: readonly TradableSymbol[];
  onSelectSymbol: (symbol: TradableSymbol) => void;
  onToggleFavorite: (symbol: TradableSymbol) => void;
  open: boolean;
  onOpenChange(open: boolean): void;
}

/**
 * The mobile market entry point (W1 §18).
 *
 * At W0 the watchlist was a full-width 395px block sitting *above* the chart,
 * which is what pushed the chart to y=751 on an 844px viewport — below the
 * fold, on the surface the trader opened the app for. The same list now lives
 * behind this ~36px trigger, in an already-certified BottomSheet, so the
 * chart starts immediately under the status bar.
 *
 * The sheet holds the same `MarketNavigator` the desktop column does — same
 * catalogue, same categories, same favorites, same search (W2 §26). There is
 * deliberately no second mobile market list to keep in step.
 *
 * This trigger shows the selected symbol's live quote, so it subscribes to
 * that one tick (a legitimate consumer under §16 — it is the selected
 * market's quote presentation on mobile).
 */
export const MobileMarketBar = memo(function MobileMarketBar({
  store,
  symbolSpecs,
  selectedSymbol,
  favorites,
  onSelectSymbol,
  onToggleFavorite,
  open,
  onOpenChange,
}: MobileMarketBarProps) {
  const tick = useTick(store, selectedSymbol);

  const select = useCallback(
    (symbol: TradableSymbol) => {
      onSelectSymbol(symbol);
      onOpenChange(false);
    },
    [onOpenChange, onSelectSymbol],
  );

  return (
    <>
      <div
        data-testid="mobile-market-context"
        className="flex h-[var(--wariba-component-workstation-mobile-market-height)] w-full items-center justify-between gap-2 border-b border-[color:var(--wariba-component-workstation-border-hairline)] bg-[color:var(--wariba-component-workstation-surface-module)] px-2"
      >
        <span className="flex items-center gap-2">
          <span className="wariba-data text-[12px] font-bold text-[color:var(--wariba-component-workstation-text-primary)]">
            {selectedSymbol}
          </span>
          <span className="wariba-data text-[11px] tabular-nums text-[color:var(--wariba-component-workstation-text-secondary)]">
            <span className="text-[color:var(--wariba-component-workstation-trading-live-bid)]">
              {tick?.bid ?? '—'}
            </span>
            {' / '}
            <span className="text-[color:var(--wariba-component-workstation-trading-live-ask)]">
              {tick?.ask ?? '—'}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--wariba-component-workstation-text-tertiary)]">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              tick?.marketStatus === 'open'
                ? 'bg-[color:var(--wariba-component-workstation-trading-buy)]'
                : tick?.marketStatus === 'stale'
                  ? 'bg-[color:var(--wariba-component-workstation-trading-warning)]'
                  : 'bg-[color:var(--wariba-component-workstation-text-tertiary)]'
            }`}
          />
          {tick?.marketStatus === 'open'
            ? 'Ouvert'
            : tick?.marketStatus === 'stale'
              ? 'Périmé'
              : tick?.marketStatus === 'closed'
                ? 'Fermé'
                : 'Indisponible'}
        </span>
      </div>

      <BottomSheet open={open} onClose={() => onOpenChange(false)} title="Marchés">
        {/* The same navigator as desktop — same catalogue, same categories,
            same favorites, same search. There is no second mobile market
            list to keep in step (W2 §26). */}
        {open ? (
          <div className="max-h-[70dvh] min-h-0">
            <MarketNavigator
              store={store}
              symbolSpecs={symbolSpecs}
              selectedSymbol={selectedSymbol}
              favorites={favorites}
              onSelectSymbol={select}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        ) : null}
      </BottomSheet>
    </>
  );
});
