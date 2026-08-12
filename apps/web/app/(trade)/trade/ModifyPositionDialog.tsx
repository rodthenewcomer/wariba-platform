'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, Input, Text } from '@wariba/ui';
import type { PositionDTO } from '@wariba/contracts';
import type { OrderRejectionDetail } from './execution/execution-contract';
import { useTick, type TickStore } from './tick-store';

export interface ModifyPositionField {
  positionId: string;
  field: 'stop_loss' | 'take_profit';
  value: string | null;
}

export interface ModifyPositionDialogProps {
  open: boolean;
  onClose: () => void;
  /** Looked up live by id every render — null once the position closes while this dialog is open. */
  position: PositionDTO | null;
  store: TickStore;
  /** Shared with the rest of the ticket — one command in flight at a time, same as everywhere else in WariX. */
  pending: boolean;
  rejection: OrderRejectionDetail | null;
  onSubmit: (params: ModifyPositionField) => void;
}

const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

function isValidLevel(value: string): boolean {
  return value.trim() === '' || DECIMAL_PATTERN.test(value.trim());
}

/**
 * UX Architecture §22.7 / §24.12 — server-authoritative: this dialog never
 * computes or asserts a fill price, it only asks the server to move a
 * threshold. Each field saves independently (packages/database's
 * modify_sl/modify_tp are two distinct, individually idempotent order
 * types) rather than one combined submit — that also means editing SL
 * never has to wait on, or be blocked by, an in-flight TP edit or vice
 * versa beyond the ticket's normal single-command-at-a-time rule.
 *
 * Stale-price protection is enforced twice: this dialog disables submit
 * client-side the moment the position's own symbol goes stale (instant
 * feedback), and packages/database/src/trading.ts's modifyPositionRisk
 * independently re-checks server-side before writing anything — the
 * client-side gate is UX only, never the real boundary.
 *
 * Reconciliation after reconnect: the submitted command reuses
 * TradeClient's existing pendingCommandRef/account.snapshot resync
 * machinery (same as every other order type), so a modify that was
 * in-flight when the connection dropped is confirmed or safely retried
 * against the server's idempotency key once the session resyncs — never
 * silently lost or double-applied.
 */
export function ModifyPositionDialog({
  open,
  onClose,
  position,
  store,
  pending,
  rejection,
  onSubmit,
}: ModifyPositionDialogProps) {
  const tick = useTick(store, position?.symbol ?? 'EURUSD');
  const isPriceStale = position !== null && tick?.marketStatus !== 'open';

  const [stopLossInput, setStopLossInput] = useState('');
  const [takeProfitInput, setTakeProfitInput] = useState('');
  const [submittingField, setSubmittingField] = useState<'stop_loss' | 'take_profit' | null>(null);

  // Re-seed local inputs whenever a (possibly different) position opens, or
  // the committed value changes underneath us — a successful save or a
  // fresh post-reconnect snapshot must always win over stale local edit
  // state once the real value has actually moved.
  useEffect(() => {
    setStopLossInput(position?.stopLoss ?? '');
    setTakeProfitInput(position?.takeProfit ?? '');
  }, [position?.id, position?.stopLoss, position?.takeProfit]);

  useEffect(() => {
    if (!pending) setSubmittingField(null);
  }, [pending]);

  if (!position) {
    return (
      <Dialog open={open} onClose={onClose} title="Modifier SL/TP" size="sm">
        <Text variant="body-sm" color="secondary">
          Cette position n’est plus ouverte.
        </Text>
      </Dialog>
    );
  }

  const stopLossChanged = stopLossInput.trim() !== (position.stopLoss ?? '');
  const takeProfitChanged = takeProfitInput.trim() !== (position.takeProfit ?? '');
  const stopLossValid = isValidLevel(stopLossInput);
  const takeProfitValid = isValidLevel(takeProfitInput);

  const submitField = (field: 'stop_loss' | 'take_profit') => {
    const raw = field === 'stop_loss' ? stopLossInput : takeProfitInput;
    setSubmittingField(field);
    onSubmit({ positionId: position.id, field, value: raw.trim() === '' ? null : raw.trim() });
  };

  return (
    <Dialog open={open} onClose={onClose} title={`Modifier SL/TP — ${position.symbol}`} size="sm">
      <div className="flex flex-col gap-4">
        <Text variant="body-sm" color="secondary" className="wariba-data">
          {position.symbol} · {position.side === 'buy' ? 'Achat' : 'Vente'} · Entrée{' '}
          {position.averageOpenPrice}
        </Text>

        {isPriceStale && (
          <Alert level="warning" title="Prix périmé">
            Le prix pour {position.symbol} n’est plus à jour. Les modifications sont bloquées
            jusqu’à son rafraîchissement.
          </Alert>
        )}

        {rejection && (
          <Alert level="danger" title="Modification refusée">
            <p>{rejection.reason}</p>
            <p>{rejection.action}</p>
            <p className="wariba-data">Code : {rejection.code}</p>
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <Input
            label="Stop Loss"
            type="text"
            inputMode="decimal"
            name="modifyStopLoss"
            value={stopLossInput}
            onChange={(e) => setStopLossInput(e.target.value)}
            placeholder="Optionnel"
            {...(!stopLossValid ? { errorText: 'Doit être un nombre décimal valide.' } : {})}
          />
          <Button
            variant="secondary"
            size="sm"
            loading={pending && submittingField === 'stop_loss'}
            disabled={pending || isPriceStale || !stopLossChanged || !stopLossValid}
            onClick={() => submitField('stop_loss')}
          >
            Enregistrer le Stop Loss
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Input
            label="Take Profit"
            type="text"
            inputMode="decimal"
            name="modifyTakeProfit"
            value={takeProfitInput}
            onChange={(e) => setTakeProfitInput(e.target.value)}
            placeholder="Optionnel"
            {...(!takeProfitValid ? { errorText: 'Doit être un nombre décimal valide.' } : {})}
          />
          <Button
            variant="secondary"
            size="sm"
            loading={pending && submittingField === 'take_profit'}
            disabled={pending || isPriceStale || !takeProfitChanged || !takeProfitValid}
            onClick={() => submitField('take_profit')}
          >
            Enregistrer le Take Profit
          </Button>
        </div>

        <Text variant="body-sm" color="tertiary">
          Exécution serveur uniquement — laissez un champ vide pour retirer le niveau. Un ordre au
          niveau atteint n’est jamais garanti au prix exact.
        </Text>
      </div>
    </Dialog>
  );
}
