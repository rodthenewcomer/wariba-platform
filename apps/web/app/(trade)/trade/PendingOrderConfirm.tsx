'use client';

import { Button, Text, WariXDialog, WariXInlineStatus } from '@wariba/ui';
import { PENDING_ORDER_TYPE_LABEL as ORDER_TYPE_LABEL } from './trade-labels';
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

/**
 * Prompt 7 Appendix 07-D §8 — shown when a pending-order type is chosen from
 * the chart context menu ("Buy Limit ici" etc.), same one-click-trading
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
  // Dialog (@wariba/ui) keeps its children mounted even while closed
  // (toggled via the native <dialog>'s showModal()/close(), never
  // unmounted) — so this renders on every /trade load regardless of
  // whether a pending-order request is in flight, with triggerPrice as the
  // caller's closed-state default (''). Both domain functions below do
  // `new Decimal(triggerPrice)`, which throws on an empty string — gating
  // on `open` (the only time triggerPrice is ever a real value) avoids
  // calling them with one at all, rather than crashing the whole render tree.
  const stillValid =
    open && tick && !isStale
      ? isPendingOrderCreationPriceValid({
          orderType,
          triggerPrice,
          currentBid: tick.bid,
          currentAsk: tick.ask,
        })
      : false;
  const distancePoints =
    open && tick && spec
      ? pendingOrderDistancePoints({
          triggerPrice,
          referencePrice: ((Number(tick.bid) + Number(tick.ask)) / 2).toFixed(spec.pricePrecision),
          pricePrecision: spec.pricePrecision,
        })
      : null;

  return (
    <WariXDialog
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
          <WariXInlineStatus
            tone="warning"
            title="Cours non actualisé"
            description={`Attendez la reprise du flux de ${symbol} avant de confirmer l’ordre.`}
          />
        )}
        {!isStale && tick && !stillValid && (
          <WariXInlineStatus
            tone="warning"
            title="Prix de déclenchement invalide"
            description={
              <>
                Le marché a bougé depuis le clic. Choisissez un niveau valide pour un ordre{' '}
                {ORDER_TYPE_LABEL[orderType].toLowerCase()}.
              </>
            }
          />
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
    </WariXDialog>
  );
}
