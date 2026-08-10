'use client';

import { memo, useCallback, useState } from 'react';
import { BottomSheet } from '@wariba/ui';
import type { SymbolSpec, TradableSymbol } from '@wariba/contracts';
import { WatchlistPanel } from '../WatchlistPanel';
import { useTick, type TickStore } from '../tick-store';

export interface MobileMarketBarProps {
  store: TickStore;
  symbolSpecs: Partial<Record<TradableSymbol, SymbolSpec>>;
  selectedSymbol: TradableSymbol;
  onSelectSymbol: (symbol: TradableSymbol) => void;
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
 * The list itself is the existing `WatchlistPanel`, unchanged: no search, no
 * favorites, no categories — those are W2's, and adding them here would mean
 * building the navigator twice.
 *
 * This trigger shows the selected symbol's live quote, so it subscribes to
 * that one tick (a legitimate consumer under §16 — it is the selected
 * market's quote presentation on mobile).
 */
export const MobileMarketBar = memo(function MobileMarketBar({
  store,
  symbolSpecs,
  selectedSymbol,
  onSelectSymbol,
}: MobileMarketBarProps) {
  const [open, setOpen] = useState(false);
  const tick = useTick(store, selectedSymbol);

  const select = useCallback(
    (symbol: TradableSymbol) => {
      onSelectSymbol(symbol);
      setOpen(false);
    },
    [onSelectSymbol],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="mobile-market-trigger"
        className="flex min-h-[var(--wariba-size-touch-target-minimum)] w-full items-center justify-between gap-2 border-b border-[color:var(--wariba-component-workstation-seam)] bg-[color:var(--wariba-component-workstation-surface-raised)] px-3 py-1.5 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] font-semibold text-[color:var(--wariba-theme-text)]">
            {selectedSymbol}
          </span>
          <span className="wariba-data text-[length:var(--wariba-font-size-data-xs)] text-[color:var(--wariba-text-secondary)]">
            {tick ? `${tick.bid} / ${tick.ask}` : '— / —'}
          </span>
        </span>
        <span className="flex items-center gap-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
          Marchés
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Marchés">
        {open ? (
          <WatchlistPanel
            store={store}
            symbolSpecs={symbolSpecs}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={select}
          />
        ) : null}
      </BottomSheet>
    </>
  );
});
