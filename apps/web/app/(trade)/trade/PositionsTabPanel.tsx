'use client';

import { memo, useMemo } from 'react';
import { Button, WariXPositionsTable, type WariXPosition } from '@wariba/ui';
import { computeRealizedPnl, quotedPrice } from '@wariba/domain';
import type { PositionDTO, SymbolSpec, TradableSymbol } from '@wariba/contracts';
import { useAllTicks, type TickStore } from './tick-store';

export interface PositionsTabPanelProps {
  store: TickStore;
  openPositions: PositionDTO[];
  symbolSpecs: Partial<Record<TradableSymbol, SymbolSpec>>;
  onClosePosition: (positionId: string) => void;
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
        closeDisabled={pending}
        emptyLabel="Aucune position ouverte."
      />
      {openPositions.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={onOpenCloseAll}
          disabled={pending}
        >
          Tout fermer
        </Button>
      )}
    </>
  );
});
