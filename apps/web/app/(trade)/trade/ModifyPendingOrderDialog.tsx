'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, Input, Text } from '@wariba/ui';
import type { PendingOrderDTO } from '@wariba/contracts';
import type { OrderRejectionDetail } from './OrderTicket';
import { useTick, type TickStore } from './tick-store';

export interface ModifyPendingOrderParams {
  pendingOrderId: string;
  triggerPrice?: string;
  quantity?: string;
  stopLoss?: string | null;
  takeProfit?: string | null;
}

export interface ModifyPendingOrderDialogProps {
  open: boolean;
  onClose: () => void;
  /** Looked up live by id every render — null once the order settles (filled/cancelled/failed) while this dialog is open. */
  order: PendingOrderDTO | null;
  store: TickStore;
  pending: boolean;
  rejection: OrderRejectionDetail | null;
  onSubmit: (params: ModifyPendingOrderParams) => void;
  onCancelOrder: (pendingOrderId: string) => void;
}

const ORDER_TYPE_LABEL: Record<PendingOrderDTO['orderType'], string> = {
  buy_limit: 'Achat Limite',
  sell_limit: 'Vente Limite',
  buy_stop: 'Achat Stop',
  sell_stop: 'Vente Stop',
};

const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

function isValidLevel(value: string): boolean {
  return value.trim() === '' || DECIMAL_PATTERN.test(value.trim());
}

/**
 * Prompt 7 Appendix 07-D §5 — the pending-order counterpart to
 * ModifyPositionDialog. Unlike SL/TP (two independent order types, saved
 * separately), modifyPendingOrder (packages/database/src/pending-orders.ts)
 * is a single version-guarded update covering trigger price, quantity, and
 * attached SL/TP together — so this dialog has one combined "Enregistrer"
 * that only sends the fields the trader actually changed.
 */
export function ModifyPendingOrderDialog({
  open,
  onClose,
  order,
  store,
  pending,
  rejection,
  onSubmit,
  onCancelOrder,
}: ModifyPendingOrderDialogProps) {
  const tick = useTick(store, order?.symbol ?? 'EURUSD');
  const isPriceStale = order !== null && tick?.marketStatus !== 'open';

  const [triggerPriceInput, setTriggerPriceInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('');
  const [stopLossInput, setStopLossInput] = useState('');
  const [takeProfitInput, setTakeProfitInput] = useState('');

  useEffect(() => {
    setTriggerPriceInput(order?.triggerPrice ?? '');
    setQuantityInput(order?.quantity ?? '');
    setStopLossInput(order?.requestedStopLoss ?? '');
    setTakeProfitInput(order?.requestedTakeProfit ?? '');
  }, [
    order?.id,
    order?.triggerPrice,
    order?.quantity,
    order?.requestedStopLoss,
    order?.requestedTakeProfit,
  ]);

  if (!order) {
    return (
      <Dialog open={open} onClose={onClose} title="Modifier l’ordre" size="sm">
        <Text variant="body-sm" color="secondary">
          Cet ordre en attente n’existe plus.
        </Text>
      </Dialog>
    );
  }

  const triggerPriceValid =
    triggerPriceInput.trim() !== '' && DECIMAL_PATTERN.test(triggerPriceInput.trim());
  const quantityValid = quantityInput.trim() !== '' && DECIMAL_PATTERN.test(quantityInput.trim());
  const stopLossValid = isValidLevel(stopLossInput);
  const takeProfitValid = isValidLevel(takeProfitInput);
  const allValid = triggerPriceValid && quantityValid && stopLossValid && takeProfitValid;

  const triggerPriceChanged = triggerPriceInput.trim() !== order.triggerPrice;
  const quantityChanged = quantityInput.trim() !== order.quantity;
  const stopLossChanged = stopLossInput.trim() !== (order.requestedStopLoss ?? '');
  const takeProfitChanged = takeProfitInput.trim() !== (order.requestedTakeProfit ?? '');
  const anyChanged = triggerPriceChanged || quantityChanged || stopLossChanged || takeProfitChanged;

  const submit = () => {
    onSubmit({
      pendingOrderId: order.id,
      ...(triggerPriceChanged ? { triggerPrice: triggerPriceInput.trim() } : {}),
      ...(quantityChanged ? { quantity: quantityInput.trim() } : {}),
      ...(stopLossChanged
        ? { stopLoss: stopLossInput.trim() === '' ? null : stopLossInput.trim() }
        : {}),
      ...(takeProfitChanged
        ? { takeProfit: takeProfitInput.trim() === '' ? null : takeProfitInput.trim() }
        : {}),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Modifier l’ordre — ${ORDER_TYPE_LABEL[order.orderType]} ${order.symbol}`}
      size="sm"
    >
      <div className="flex flex-col gap-4">
        {isPriceStale && (
          <Alert level="warning" title="Prix périmé">
            Le prix pour {order.symbol} n’est plus à jour. Les modifications sont bloquées jusqu’à
            son rafraîchissement.
          </Alert>
        )}

        {rejection && (
          <Alert level="danger" title="Modification refusée">
            <p>{rejection.reason}</p>
            <p>{rejection.action}</p>
            <p className="wariba-data">Code : {rejection.code}</p>
          </Alert>
        )}

        <Input
          label="Prix de déclenchement"
          type="text"
          inputMode="decimal"
          name="modifyTriggerPrice"
          value={triggerPriceInput}
          onChange={(e) => setTriggerPriceInput(e.target.value)}
          {...(!triggerPriceValid ? { errorText: 'Doit être un nombre décimal valide.' } : {})}
        />
        <Input
          label="Quantité (lots)"
          type="text"
          inputMode="decimal"
          name="modifyQuantity"
          value={quantityInput}
          onChange={(e) => setQuantityInput(e.target.value)}
          {...(!quantityValid ? { errorText: 'Doit être un nombre décimal valide.' } : {})}
        />
        <Input
          label="Stop Loss"
          type="text"
          inputMode="decimal"
          name="modifyPendingStopLoss"
          placeholder="Optionnel"
          value={stopLossInput}
          onChange={(e) => setStopLossInput(e.target.value)}
          {...(!stopLossValid ? { errorText: 'Doit être un nombre décimal valide.' } : {})}
        />
        <Input
          label="Take Profit"
          type="text"
          inputMode="decimal"
          name="modifyPendingTakeProfit"
          placeholder="Optionnel"
          value={takeProfitInput}
          onChange={(e) => setTakeProfitInput(e.target.value)}
          {...(!takeProfitValid ? { errorText: 'Doit être un nombre décimal valide.' } : {})}
        />

        <Button
          variant="secondary"
          loading={pending}
          disabled={pending || isPriceStale || !anyChanged || !allValid}
          onClick={submit}
        >
          Enregistrer
        </Button>
        <Button
          variant="ghost"
          loading={pending}
          disabled={pending}
          onClick={() => onCancelOrder(order.id)}
          className="text-[color:var(--wariba-status-danger-text)]"
        >
          Annuler l’ordre
        </Button>

        <Text variant="body-sm" color="tertiary">
          Ordre GTC — exécution serveur uniquement, jamais garantie au prix exact affiché.
        </Text>
      </div>
    </Dialog>
  );
}
