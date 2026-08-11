'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { isDecimalQuantityInput, isQuantityWithinBounds } from '@wariba/domain';
import type { SymbolSpec } from '@wariba/contracts';
import type { TicketOrderKind } from './execution/execution-contract';

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
  /**
   * W4 §54 — the three absolute-price fields, cleared together when the
   * selected instrument changes. Quantity and order kind survive: a quantity
   * is validated against the new symbol's own bounds and shows an error if it
   * no longer fits, whereas a price carried over from another instrument is
   * both unvalidated client-side and entirely plausible-looking (an EURUSD
   * stop of 1.0850 submitted against NAS100 is not obviously wrong on screen,
   * and the server would accept or reject it on its own terms). Clearing is
   * the narrowest change that removes the silent-plausibility hazard.
   */
  clearPriceLevels(): void;
}

/**
 * The one ticket draft (W4 §11), held outside React state.
 *
 * The pre-W4 draft was `useState` inside `TradeClient`, the composition root.
 * That is correct for ownership and wrong for rendering: every keystroke in
 * the quantity field re-rendered `TradeClient`, which rebuilds the JSX
 * elements it passes as props (`headerAction`, `resizeHandle`,
 * `mobileMarketTrigger`, the dock's `account` object…). Those are fresh
 * objects each time, so `memo` could not hold and the shell, the Market
 * Navigator, the status bar and the dock all reconciled per keystroke —
 * exactly what W4 §68 forbids.
 *
 * So the draft follows the same pattern ticks already use (tick-store.ts): an
 * external store with a stable identity, subscribed to only by the surfaces
 * that genuinely display it. `TradeClient` holds the instance and never
 * re-renders when it changes; the chart's context-menu commands read
 * `getDraft()` at click time exactly as they read the tick store; the two
 * confirmation dialogs subscribe individually, and only while mounted.
 *
 * It is deliberately not a Context: a Context provider re-renders its subtree
 * on every change, which is the problem this store exists to avoid (W1 §3).
 */
export interface TicketDraftStore extends TicketDraftSetters {
  getDraft(): TicketDraft;
  subscribe(listener: () => void): () => void;
}

const INITIAL_DRAFT: TicketDraft = {
  quantity: '0.10',
  stopLoss: '',
  takeProfit: '',
  orderKind: 'market',
  triggerPrice: '',
};

export function createTicketDraftStore(initial: TicketDraft = INITIAL_DRAFT): TicketDraftStore {
  // Replaced wholesale on every change, never mutated: useSyncExternalStore
  // compares snapshots by identity, so an in-place edit would be invisible to
  // React and a fresh object on an unchanged value would loop forever.
  let draft = initial;
  const listeners = new Set<() => void>();

  const commit = (next: TicketDraft): void => {
    draft = next;
    for (const listener of listeners) listener();
  };

  /** No-ops when the value is unchanged, so a repeated set cannot re-render a subscriber. */
  const setField = <K extends keyof TicketDraft>(key: K, value: TicketDraft[K]): void => {
    if (draft[key] === value) return;
    commit({ ...draft, [key]: value });
  };

  return {
    getDraft: () => draft,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setQuantity: (value) => setField('quantity', value),
    setStopLoss: (value) => setField('stopLoss', value),
    setTakeProfit: (value) => setField('takeProfit', value),
    setOrderKind: (kind) => setField('orderKind', kind),
    setTriggerPrice: (value) => setField('triggerPrice', value),
    clearPriceLevels() {
      if (draft.stopLoss === '' && draft.takeProfit === '' && draft.triggerPrice === '') return;
      commit({ ...draft, stopLoss: '', takeProfit: '', triggerPrice: '' });
    },
  };
}

/** Re-renders the caller whenever the draft changes — and nothing above it. */
export function useTicketDraft(store: TicketDraftStore): TicketDraft {
  const subscribe = useCallback((listener: () => void) => store.subscribe(listener), [store]);
  const getSnapshot = useCallback(() => store.getDraft(), [store]);
  // The store's initial draft is identical on server and client, so the same
  // getSnapshot doubles as getServerSnapshot.
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Client-side bounds check for instant feedback — the server
 * (INVALID_QUANTITY, packages/database/src/trading.ts) is the real gate; this
 * only saves a round trip for an obviously-wrong value.
 *
 * The format guard is not cosmetic. `isQuantityWithinBounds` constructs a
 * `Decimal`, and `new Decimal('abc')` *throws* — so before W4 a single letter
 * typed into this free-text field crashed the render. The guard runs first and
 * the canonical bounds check is still the only thing that decides validity.
 */
export function quantityErrorFor(quantity: string, spec: SymbolSpec | undefined): string | null {
  if (!spec || quantity.trim() === '') return null;
  if (!isDecimalQuantityInput(quantity)) return 'Doit être un nombre décimal valide.';
  const withinBounds = isQuantityWithinBounds({
    quantity: quantity.trim(),
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

/**
 * Syntax-only check for the two protection fields.
 *
 * Deliberately *not* a relationship check (SL below entry for a buy, and so
 * on): no canonical shared helper expresses that, the correct comparison
 * depends on a side the ticket has not chosen yet, and W4 §27 is explicit that
 * relationship errors stay server-authoritative rather than becoming a second
 * risk engine in the browser. An empty field is valid — protection is optional.
 */
export function protectionPriceErrorFor(value: string): string | null {
  if (value.trim() === '') return null;
  return /^\d+(\.\d+)?$/.test(value.trim()) ? null : 'Doit être un nombre décimal valide.';
}
