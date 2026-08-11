import { describe, expect, it, vi } from 'vitest';
import { createTicketDraftStore } from '../app/(trade)/trade/ticket-draft';

/**
 * W4 §11/§54/§68 — the ticket draft as an external store.
 *
 * Two behaviours here are load-bearing for the whole surface, and neither is
 * visible from a component test:
 *
 * - **Snapshot identity.** `useSyncExternalStore` compares snapshots by
 *   reference. Mutating the draft in place would leave React unable to see the
 *   change; returning a fresh object for an unchanged value would re-render
 *   forever. The store must therefore replace on change and return the *same*
 *   object otherwise — which is also what makes a repeated `setQuantity` with
 *   an identical value cost nothing (§68).
 * - **Clearing prices on instrument change.** A stop of 1.08500 carried from
 *   EURUSD onto NAS100 passes every client-side check the fields apply (they
 *   validate syntax, not instrument range) and looks entirely plausible on
 *   screen. Quantity survives because it *is* re-validated against the new
 *   symbol's own bounds.
 */

describe('createTicketDraftStore', () => {
  it('starts on a market order with a valid default quantity and no price levels', () => {
    const draft = createTicketDraftStore().getDraft();
    expect(draft.orderKind).toBe('market');
    expect(draft.quantity).toBe('0.10');
    expect(draft.stopLoss).toBe('');
    expect(draft.takeProfit).toBe('');
    expect(draft.triggerPrice).toBe('');
  });

  it('replaces the snapshot on change rather than mutating it', () => {
    const store = createTicketDraftStore();
    const before = store.getDraft();
    store.setQuantity('0.25');

    expect(store.getDraft()).not.toBe(before);
    expect(store.getDraft().quantity).toBe('0.25');
    // The old snapshot is untouched — a React render holding it still sees
    // what it rendered, which is the whole point of replacing over mutating.
    expect(before.quantity).toBe('0.10');
  });

  it('notifies subscribers exactly once per real change', () => {
    const store = createTicketDraftStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setQuantity('0.25');
    store.setStopLoss('1.08000');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('does nothing at all when a setter is called with the value already held', () => {
    const store = createTicketDraftStore();
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getDraft();

    store.setQuantity(before.quantity);
    store.setOrderKind(before.orderKind);
    store.setStopLoss(before.stopLoss);

    expect(listener).not.toHaveBeenCalled();
    // Identical snapshot identity: nothing downstream re-renders.
    expect(store.getDraft()).toBe(before);
  });

  it('stops notifying once a subscriber unsubscribes', () => {
    const store = createTicketDraftStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setQuantity('0.25');
    unsubscribe();
    store.setQuantity('0.50');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('clears the three absolute-price fields together, and keeps quantity and kind', () => {
    const store = createTicketDraftStore();
    store.setOrderKind('limit');
    store.setTriggerPrice('1.07000');
    store.setStopLoss('1.06500');
    store.setTakeProfit('1.09000');
    store.setQuantity('0.25');

    store.clearPriceLevels();

    const draft = store.getDraft();
    expect(draft.stopLoss).toBe('');
    expect(draft.takeProfit).toBe('');
    expect(draft.triggerPrice).toBe('');
    expect(draft.quantity).toBe('0.25');
    expect(draft.orderKind).toBe('limit');
  });

  it('does not notify when clearing a draft that carries no price levels', () => {
    const store = createTicketDraftStore();
    store.setQuantity('0.25');
    const listener = vi.fn();
    store.subscribe(listener);

    store.clearPriceLevels();

    expect(listener).not.toHaveBeenCalled();
  });
});
