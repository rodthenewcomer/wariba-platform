'use client';

import { Alert, Button, Input, Text } from '@wariba/ui';
import type {
  MarketStatus,
  MarketTick,
  PendingOrderType,
  SymbolSpec,
  TradableSymbol,
} from '@wariba/contracts';

export interface OrderRejectionDetail {
  code: string;
  reason: string;
  action: string;
}

/** Appendix 07-D §2/§3 — the ticket's own order-type field, extended in place (not a second ticket). */
export type TicketOrderKind = 'market' | 'limit' | 'stop';

export interface OrderTicketProps {
  accountPublicId: string;
  symbol: TradableSymbol;
  spec: SymbolSpec | null;
  tick: MarketTick | null;
  quantity: string;
  onQuantityChange: (value: string) => void;
  quantityError: string | null;
  stopLoss: string;
  onStopLossChange: (value: string) => void;
  takeProfit: string;
  onTakeProfitChange: (value: string) => void;
  onSubmit: (side: 'buy' | 'sell') => void;
  pending: boolean;
  submitDisabled: boolean;
  disabledMessage: string | null;
  rejection: OrderRejectionDetail | null;
  orderKind: TicketOrderKind;
  onOrderKindChange: (kind: TicketOrderKind) => void;
  triggerPrice: string;
  onTriggerPriceChange: (value: string) => void;
  triggerPriceError: string | null;
}

const MARKET_STATUS_LABEL: Record<MarketStatus, string> = {
  open: 'Ouvert',
  stale: 'Prix obsolète',
  closed: 'Fermé',
};

const ORDER_KIND_LABEL: Record<TicketOrderKind, string> = {
  market: 'Market',
  limit: 'Limit',
  stop: 'Stop',
};

/** The ticket has one Buy and one Sell button that each submit the right pending-order type once a non-Market kind is selected. */
export function pendingOrderTypeFor(
  kind: 'limit' | 'stop',
  side: 'buy' | 'sell',
): PendingOrderType {
  return `${side}_${kind}`;
}

/**
 * UX Architecture §22.7 — champs bruts uniquement (compte, symbole, sens,
 * type Market, taille, SL, TP, marge estimée, risque estimé si SL, spread,
 * prix indicatif, statut marché). Design System §48 — ce composant ne fait
 * aucun calcul de risque : la marge et l'impact vivent dans Guardian
 * (adjacent, pas dupliqué ici), le spread est une simple soustraction
 * d'affichage, pas une donnée financière autoritaire.
 */
export function OrderTicket({
  accountPublicId,
  symbol,
  spec,
  tick,
  quantity,
  onQuantityChange,
  quantityError,
  stopLoss,
  onStopLossChange,
  takeProfit,
  onTakeProfitChange,
  onSubmit,
  pending,
  submitDisabled,
  disabledMessage,
  rejection,
  orderKind,
  onOrderKindChange,
  triggerPrice,
  onTriggerPriceChange,
  triggerPriceError,
}: OrderTicketProps) {
  const spread =
    tick && spec ? (Number(tick.ask) - Number(tick.bid)).toFixed(spec.pricePrecision) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <Text variant="label-sm" color="tertiary">
          Order Ticket — {symbol}
        </Text>
        <Text variant="label-sm" color="tertiary" className="wariba-data">
          {accountPublicId}
        </Text>
      </div>

      <div className="flex flex-col gap-1.5">
        <Text variant="body-sm" color="secondary">
          Type
        </Text>
        <div className="flex gap-1" role="radiogroup" aria-label="Type d’ordre">
          {(['market', 'limit', 'stop'] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={orderKind === kind}
              onClick={() => onOrderKindChange(kind)}
              className={`flex-1 rounded-[var(--wariba-radius-sm)] px-2 py-1.5 text-[length:var(--wariba-font-size-body-sm)] ${
                orderKind === kind
                  ? 'bg-[color:var(--wariba-surface-selected)] font-medium text-[color:var(--wariba-theme-text)]'
                  : 'text-[color:var(--wariba-text-secondary)]'
              }`}
            >
              {ORDER_KIND_LABEL[kind]}
            </button>
          ))}
        </div>
      </div>

      {orderKind !== 'market' && (
        <Input
          label="Prix de déclenchement"
          type="text"
          inputMode="decimal"
          name="triggerPrice"
          value={triggerPrice}
          onChange={(e) => onTriggerPriceChange(e.target.value)}
          {...(triggerPriceError ? { errorText: triggerPriceError } : {})}
          {...(spec ? { helperText: `Précision : ${spec.pricePrecision} décimales` } : {})}
        />
      )}

      <Input
        label="Quantité (lots)"
        type="text"
        inputMode="decimal"
        name="quantity"
        value={quantity}
        onChange={(e) => onQuantityChange(e.target.value)}
        {...(quantityError ? { errorText: quantityError } : {})}
        {...(spec
          ? {
              helperText: `Pas ${spec.quantityStep} · Min ${spec.minimumQuantity} · Max ${spec.maximumQuantity}`,
            }
          : {})}
      />

      <div className="flex gap-2">
        <Input
          label="Stop Loss"
          type="text"
          inputMode="decimal"
          name="stopLoss"
          placeholder="Optionnel"
          value={stopLoss}
          onChange={(e) => onStopLossChange(e.target.value)}
        />
        <Input
          label="Take Profit"
          type="text"
          inputMode="decimal"
          name="takeProfit"
          placeholder="Optionnel"
          value={takeProfit}
          onChange={(e) => onTakeProfitChange(e.target.value)}
        />
      </div>

      {tick && (
        <div className="flex flex-col gap-0.5">
          <Text variant="body-sm" color="secondary" className="wariba-data">
            Bid {tick.bid} · Ask {tick.ask} · Spread {spread}
          </Text>
          <Text variant="body-sm" color="secondary">
            État marché : {MARKET_STATUS_LABEL[tick.marketStatus]}
          </Text>
        </div>
      )}

      {rejection && (
        <Alert level="danger" title="Ordre refusé">
          <p>{rejection.reason}</p>
          <p>{rejection.action}</p>
          <p className="wariba-data">Code : {rejection.code}</p>
        </Alert>
      )}

      {disabledMessage && !rejection && (
        <Alert level="warning" title="Ordre indisponible">
          {disabledMessage}
        </Alert>
      )}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          loading={pending}
          disabled={submitDisabled}
          onClick={() => onSubmit('buy')}
          className="flex-1"
        >
          {orderKind === 'market' ? 'Buy' : `Buy ${ORDER_KIND_LABEL[orderKind]}`}
        </Button>
        <Button
          variant="secondary"
          loading={pending}
          disabled={submitDisabled}
          onClick={() => onSubmit('sell')}
          className="flex-1"
        >
          {orderKind === 'market' ? 'Sell' : `Sell ${ORDER_KIND_LABEL[orderKind]}`}
        </Button>
      </div>

      <Text variant="body-sm" color="tertiary">
        Compte simulé. Exécution serveur uniquement — aucun prix client n&apos;est jamais
        autoritaire.
        {orderKind !== 'market' &&
          ' Les ordres en attente sont GTC (valables jusqu’à annulation) — aucune autre durée n’est proposée.'}
      </Text>
    </div>
  );
}
