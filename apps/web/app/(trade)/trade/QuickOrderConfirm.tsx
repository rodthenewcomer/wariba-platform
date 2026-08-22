'use client';

import { Button, Text, WariXDialog, WariXInlineStatus } from '@wariba/ui';
import type { MarketTick, SymbolSpec, TradableSymbol } from '@wariba/contracts';
import { estimateRequiredMargin } from '@wariba/domain';

export interface QuickOrderConfirmProps {
  open: boolean;
  onClose: () => void;
  symbol: TradableSymbol;
  side: 'buy' | 'sell';
  quantity: string;
  tick: MarketTick | null;
  spec: SymbolSpec | null;
  stopLoss: string;
  takeProfit: string;
  pending: boolean;
  onConfirm: () => void;
}

const SIDE_LABEL: Record<'buy' | 'sell', string> = { buy: 'Achat', sell: 'Vente' };

/**
 * Prompt 7 Appendix 07-C §8 — shown when Market Buy/Sell is chosen from the
 * chart context menu and one-click trading is off (the default —
 * ONE_CLICK_TRADING_DEFAULT = false, apps/web/lib/one-click-trading.ts).
 * Uses the order ticket's own current quantity/SL/TP ("using the current
 * order quantity") rather than a separate quantity input, and submits
 * through the exact same submitMarketOrder(side) command every other Buy/
 * Sell path in this app already uses — nothing about the underlying order
 * changes because it was opened from the chart instead of the ticket.
 */
export function QuickOrderConfirm({
  open,
  onClose,
  symbol,
  side,
  quantity,
  tick,
  spec,
  stopLoss,
  takeProfit,
  pending,
  onConfirm,
}: QuickOrderConfirmProps) {
  const executablePrice = tick ? (side === 'buy' ? tick.ask : tick.bid) : null;
  const spread =
    tick && spec ? (Number(tick.ask) - Number(tick.bid)).toFixed(spec.pricePrecision) : null;
  const margin =
    executablePrice && spec
      ? estimateRequiredMargin({
          quantity,
          price: executablePrice,
          contractSize: spec.contractSize,
          leverage: spec.leverage,
        })
      : null;
  const isStale = tick?.marketStatus === 'stale';

  return (
    <WariXDialog
      open={open}
      onClose={onClose}
      title={`${SIDE_LABEL[side]} au marché — ${symbol}`}
      size="sm"
    >
      <div className="flex flex-col gap-3">
        <Text variant="body-sm" color="secondary" className="wariba-data">
          {symbol} · {SIDE_LABEL[side]} · {quantity} lot
        </Text>
        {executablePrice && (
          <Text variant="body-sm" color="secondary" className="wariba-data">
            Prix exécutable actuel : {executablePrice}
            {spread && ` · Écart ${spread}`}
          </Text>
        )}
        {margin && (
          <Text variant="body-sm" color="secondary" className="wariba-data">
            Marge estimée : {margin} USD
          </Text>
        )}
        {(stopLoss.trim() || takeProfit.trim()) && (
          <Text variant="body-sm" color="secondary" className="wariba-data">
            {stopLoss.trim() && `SL ${stopLoss.trim()}`}
            {stopLoss.trim() && takeProfit.trim() && ' · '}
            {takeProfit.trim() && `TP ${takeProfit.trim()}`}
          </Text>
        )}
        {isStale && (
          <WariXInlineStatus
            tone="warning"
            title="Cours non actualisé"
            description={`Attendez la reprise du flux de ${symbol} avant de confirmer l’ordre.`}
          />
        )}
        <Text variant="body-sm" color="tertiary">
          Exécution serveur uniquement — le prix affiché est indicatif, jamais garanti.
        </Text>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={pending}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={pending}
            disabled={isStale}
            className="flex-1"
          >
            Confirmer {SIDE_LABEL[side].toLowerCase()}
          </Button>
        </div>
      </div>
    </WariXDialog>
  );
}
