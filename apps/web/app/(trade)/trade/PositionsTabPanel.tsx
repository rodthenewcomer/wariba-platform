'use client';

import { memo, useMemo } from 'react';
import { WariXPositionsTable, type WariXPosition } from '@wariba/ui';
import { computeRealizedPnl, quotedPrice } from '@wariba/domain';
import type { PositionDTO, SymbolSpec, TradableSymbol } from '@wariba/contracts';
import { useAllTicks, type TickStore } from './tick-store';

export interface PositionsTabPanelProps {
  store: TickStore;
  openPositions: PositionDTO[];
  symbolSpecs: Partial<Record<TradableSymbol, SymbolSpec>>;
  onClosePosition: (positionId: string) => void;
  onModifyPosition: (positionId: string) => void;
  onPartialClosePosition: (positionId: string) => void;
  onOpenCloseAll: () => void;
  pending: boolean;
}

/**
 * The one part of WariX that genuinely needs "any symbol's tick" (live PnL
 * across every open position, ENG-028/Hub has none by design) — isolated
 * here via useAllTicks so this re-render cost never reaches the rest of the
 * tree (chart, ticket, watchlist, header all stay on their own subscriptions).
 */
export const PositionsTabPanel = memo(function PositionsTabPanel({
  store,
  openPositions,
  symbolSpecs,
  onClosePosition,
  onModifyPosition,
  onPartialClosePosition,
  onOpenCloseAll,
  pending,
}: PositionsTabPanelProps) {
  const tickVersion = useAllTicks(store);

  // WariX's positions table shows live PnL — the same formula
  // services/realtime uses for equity (quotedPrice + close-side
  // computeRealizedPnl against the current tick), recomputed here so the
  // number moves with every tick instead of waiting for the next throttled
  // account.risk_preview push.
  const wariXPositions: WariXPosition[] = useMemo(() => {
    return openPositions.map((position) => {
      const tick = store.getTick(position.symbol);
      const spec = symbolSpecs[position.symbol];
      if (!tick || !spec) {
        return {
          id: position.id,
          symbol: position.symbol,
          sideLabel: position.side === 'buy' ? 'Achat' : 'Vente',
          sideTone: position.side,
          quantityFormatted: position.openQuantity,
          entryPriceFormatted: position.averageOpenPrice,
          currentPriceFormatted: '—',
          livePnlFormatted: '—',
          livePnlTone: 'neutral',
          stopLossFormatted: position.stopLoss ?? '—',
          takeProfitFormatted: position.takeProfit ?? '—',
        };
      }
      const closePrice = quotedPrice({
        bid: tick.bid,
        ask: tick.ask,
        positionSide: position.side,
        action: 'close',
      });
      const unrealized = computeRealizedPnl({
        openPrice: position.averageOpenPrice,
        closePrice,
        quantity: position.openQuantity,
        contractSize: spec.contractSize,
        positionSide: position.side,
      });
      const sign = Number(unrealized) > 0 ? '+' : '';
      return {
        id: position.id,
        symbol: position.symbol,
        sideLabel: position.side === 'buy' ? 'Achat' : 'Vente',
        sideTone: position.side,
        quantityFormatted: position.openQuantity,
        entryPriceFormatted: position.averageOpenPrice,
        currentPriceFormatted: closePrice,
        livePnlFormatted: `${sign}${unrealized} USD`,
        livePnlTone:
          Number(unrealized) > 0 ? 'positive' : Number(unrealized) < 0 ? 'negative' : 'neutral',
        stopLossFormatted: position.stopLoss ?? '—',
        takeProfitFormatted: position.takeProfit ?? '—',
      };
    });
  }, [openPositions, symbolSpecs, store, tickVersion]);

  return (
    <>
      <WariXPositionsTable
        positions={wariXPositions}
        onClose={onClosePosition}
        onModify={onModifyPosition}
        onPartialClose={onPartialClosePosition}
        closeDisabled={pending}
        emptyLabel="Aucune position ouverte"
        emptyHint="Les positions ouvertes apparaîtront ici avec leur P&L en direct."
      />
      {openPositions.length > 0 && (
        /*
         * VX1-B §15 — a bulk action reads as a control, not as a stray sentence
         * under a table. Quiet graphite at rest, coral only under the pointer:
         * closing every position is destructive, and destructive controls in
         * WariX announce themselves when reached rather than sitting red.
         */
        <button
          type="button"
          onClick={onOpenCloseAll}
          disabled={pending}
          data-testid="dock-close-all"
          className="mt-2 flex h-7 items-center rounded-[var(--wariba-component-workstation-radius-control)] bg-[color:var(--wariba-component-workstation-surface-control)] px-2.5 text-[length:var(--wariba-component-workstation-type-label)] font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] text-[color:var(--wariba-component-workstation-text-secondary)] shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-seam-hairline)] transition-[background-color,color,transform] duration-[var(--wariba-component-workstation-motion-quick)] hover:enabled:bg-[color:var(--wariba-component-workstation-wash-sell)] hover:enabled:text-[color:var(--wariba-component-workstation-trading-sell)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] active:enabled:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
        >
          Tout fermer
        </button>
      )}
    </>
  );
});
