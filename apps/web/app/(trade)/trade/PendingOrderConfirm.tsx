'use client';

import { Alert, Button, Dialog, Text } from '@wariba/ui';
import type { MarketTick, PendingOrderType, SymbolSpec, TradableSymbol } from '@wariba/contracts';
import { isPendingOrderCreationPriceValid, pendingOrderDistancePoints } from '@wariba/domain';

export interface PendingOrderConfirmProps {
  open: boolean;
  onClose: () => void;
  symbol: TradableSymbol;
  orderType: PendingOrderType;
  triggerPrice: string;
  quantity: string;
  tick: MarketTick | null;
  spec: SymbolSpec | null;
  stopLoss: string;
  takeProfit: string;
  pending: boolean;
  onConfirm: () => void;
}

const ORDER_TYPE_LABEL: Record<PendingOrderType, string> = {
  buy_limit: 'Achat Limite',
  sell_limit: 'Vente Limite',
  buy_stop: 'Achat Stop',
  sell_stop: 'Vente Stop',
};

/**
 * Prompt 7 Appendix 07-D §8 — shown when a pending-order type is chosen from
 * the chart context menu ("Achat Limite ici" etc.), same one-click-trading
 * gate as QuickOrderConfirm's market-order equivalent
 * (ONE_CLICK_TRADING_DEFAULT = false, apps/web/lib/one-click-trading.ts).
 * Uses the order ticket's own current quantity/SL/TP, same convention as
 * QuickOrderConfirm — nothing about the order changes because it was
 * initiated from the chart instead of the ticket.
 */
export function PendingOrderConfirm({
  open,
  onClose,
  symbol,
  orderType,
  triggerPrice,
  quantity,
  tick,
  spec,
  stopLoss,
  takeProfit,
  pending,
  onConfirm,
}: PendingOrderConfirmProps) {
  const isStale = tick?.marketStatus === 'stale';
  const stillValid =
    tick && !isStale
      ? isPendingOrderCreationPriceValid({
          orderType,
          triggerPrice,
          currentBid: tick.bid,
          currentAsk: tick.ask,
        })
      : false;
  const distancePoints =
    tick && spec
      ? pendingOrderDistancePoints({
          triggerPrice,
          referencePrice: ((Number(tick.bid) + Number(tick.ask)) / 2).toFixed(spec.pricePrecision),
          pricePrecision: spec.pricePrecision,
        })
      : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`${ORDER_TYPE_LABEL[orderType]} — ${symbol}`}
      size="sm"
    >
      <div className="flex flex-col gap-3">
        <Text variant="body-sm" color="secondary" className="wariba-data">
          {symbol} · {ORDER_TYPE_LABEL[orderType]} · {quantity} lot
        </Text>
        <Text variant="body-sm" color="secondary" className="wariba-data">
          Déclenchement à {triggerPrice}
          {distancePoints && ` · ${distancePoints} points du marché`}
        </Text>
        {(stopLoss.trim() || takeProfit.trim()) && (
          <Text variant="body-sm" color="secondary" className="wariba-data">
            {stopLoss.trim() && `SL ${stopLoss.trim()}`}
            {stopLoss.trim() && takeProfit.trim() && ' · '}
            {takeProfit.trim() && `TP ${takeProfit.trim()}`}
          </Text>
        )}
        <Text variant="body-sm" color="tertiary">
          Ordre GTC (valable jusqu’à annulation) — exécuté par le serveur dès que le prix atteint le
          niveau de déclenchement, jamais garanti au prix exact affiché ici.
        </Text>
        {isStale && (
          <Alert level="warning" title="Prix obsolète">
            Le prix pour {symbol} n’est plus à jour — l’ordre sera refusé par le serveur s’il n’est
            pas rafraîchi avant confirmation.
          </Alert>
        )}
        {!isStale && tick && !stillValid && (
          <Alert level="warning" title="Prix de déclenchement invalide">
            Le marché a bougé depuis le clic — ce niveau ne correspond plus à un{' '}
            {ORDER_TYPE_LABEL[orderType].toLowerCase()} valide et sera refusé par le serveur.
          </Alert>
        )}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={pending}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={pending}
            disabled={isStale || !stillValid}
            className="flex-1"
          >
            Confirmer
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
