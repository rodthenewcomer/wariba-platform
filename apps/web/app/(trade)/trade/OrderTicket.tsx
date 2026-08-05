'use client';

import { Alert, Button, Input, Text } from '@wariba/ui';
import type { MarketStatus, MarketTick, SymbolSpec, TradableSymbol } from '@wariba/contracts';

export interface OrderRejectionDetail {
  code: string;
  reason: string;
  action: string;
}

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
}

const MARKET_STATUS_LABEL: Record<MarketStatus, string> = {
  open: 'Ouvert',
  stale: 'Prix obsolète',
  closed: 'Fermé',
};

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

      <Text variant="body-sm" color="secondary">
        Type : Market
      </Text>

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
          Buy
        </Button>
        <Button
          variant="secondary"
          loading={pending}
          disabled={submitDisabled}
          onClick={() => onSubmit('sell')}
          className="flex-1"
        >
          Sell
        </Button>
      </div>

      <Text variant="body-sm" color="tertiary">
        Compte simulé. Exécution serveur uniquement — aucun prix client n&apos;est jamais
        autoritaire.
      </Text>
    </div>
  );
}
