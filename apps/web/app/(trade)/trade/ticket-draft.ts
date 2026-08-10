'use client';

import { useMemo, useRef, useState } from 'react';
import { isQuantityWithinBounds } from '@wariba/domain';
import type { SymbolSpec } from '@wariba/contracts';
import type { TicketOrderKind } from './OrderTicket';

export interface TicketDraft {
  quantity: string;
  stopLoss: string;
  takeProfit: string;
  orderKind: TicketOrderKind;
  triggerPrice: string;
}

export interface TicketDraftSetters {
  setQuantity(value: string): void;
  setStopLoss(value: string): void;
  setTakeProfit(value: string): void;
  setOrderKind(kind: TicketOrderKind): void;
  setTriggerPrice(value: string): void;
}

export interface TicketDraftController {
  draft: TicketDraft;
  /**
   * Always the current draft, readable from a stable callback. The chart's
   * context-menu commands need the ticket's quantity/SL/TP at click time but
   * must never re-subscribe to it — a chart that re-rendered on every
   * keystroke in the ticket is exactly the coupling W1 removes.
   */
  draftRef: React.RefObject<TicketDraft>;
  setters: TicketDraftSetters;
}

const INITIAL_QUANTITY = '0.10';

export function useTicketDraft(): TicketDraftController {
  const [quantity, setQuantity] = useState(INITIAL_QUANTITY);
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [orderKind, setOrderKind] = useState<TicketOrderKind>('market');
  const [triggerPrice, setTriggerPrice] = useState('');

  const draft = useMemo<TicketDraft>(
    () => ({ quantity, stopLoss, takeProfit, orderKind, triggerPrice }),
    [quantity, stopLoss, takeProfit, orderKind, triggerPrice],
  );

  const draftRef = useRef(draft);
  draftRef.current = draft;

  // useState setters are referentially stable for the component's lifetime,
  // so this object never changes identity either.
  const setters = useMemo<TicketDraftSetters>(
    () => ({ setQuantity, setStopLoss, setTakeProfit, setOrderKind, setTriggerPrice }),
    [],
  );

  return { draft, draftRef, setters };
}

/**
 * Client-side bounds check for instant feedback — the server
 * (INVALID_QUANTITY, packages/database/src/trading.ts) is the real gate; this
 * only saves a round trip for an obviously-wrong value.
 */
export function quantityErrorFor(quantity: string, spec: SymbolSpec | undefined): string | null {
  if (!spec || quantity.trim() === '') return null;
  const withinBounds = isQuantityWithinBounds({
    quantity,
    minimumQuantity: spec.minimumQuantity,
    maximumQuantity: spec.maximumQuantity,
    quantityStep: spec.quantityStep,
  });
  return withinBounds
    ? null
    : `Doit être entre ${spec.minimumQuantity} et ${spec.maximumQuantity}, par pas de ${spec.quantityStep}.`;
}

/**
 * Client-side sanity check for instant feedback — createPendingOrder's own
 * isPendingOrderCreationPriceValid re-check (packages/database/src/
 * pending-orders.ts) is the real gate; this only catches an empty/malformed
 * value before a round trip.
 */
export function triggerPriceErrorFor(
  orderKind: TicketOrderKind,
  triggerPrice: string,
): string | null {
  if (orderKind === 'market') return null;
  if (triggerPrice.trim() === '') return 'Requis pour un ordre en attente.';
  return /^\d+(\.\d+)?$/.test(triggerPrice.trim()) ? null : 'Doit être un nombre décimal valide.';
}
