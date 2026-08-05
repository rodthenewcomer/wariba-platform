'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { MarketTick, TradableSymbol } from '@wariba/contracts';

/**
 * Prompt 07's own performance requirement ("ne pas rerender toute
 * l'application à chaque tick") — ticks live outside React state entirely.
 * Each consumer subscribes to exactly what it needs via useSyncExternalStore,
 * so a tick on a symbol nobody is watching touches nothing but this store.
 */
export interface TickStore {
  update(tick: MarketTick): void;
  getTick(symbol: TradableSymbol): MarketTick | null;
  subscribe(symbol: TradableSymbol, listener: () => void): () => void;
  subscribeAny(listener: () => void): () => void;
}

export function createTickStore(): TickStore {
  const ticks = new Map<TradableSymbol, MarketTick>();
  const symbolListeners = new Map<TradableSymbol, Set<() => void>>();
  const anyListeners = new Set<() => void>();

  return {
    update(tick) {
      ticks.set(tick.symbol, tick);
      for (const listener of symbolListeners.get(tick.symbol) ?? []) listener();
      for (const listener of anyListeners) listener();
    },
    getTick: (symbol) => ticks.get(symbol) ?? null,
    subscribe(symbol, listener) {
      let set = symbolListeners.get(symbol);
      if (!set) {
        set = new Set();
        symbolListeners.set(symbol, set);
      }
      set.add(listener);
      return () => set.delete(listener);
    },
    subscribeAny(listener) {
      anyListeners.add(listener);
      return () => anyListeners.delete(listener);
    },
  };
}

/** Re-renders the caller only when this one symbol's tick changes. */
export function useTick(store: TickStore, symbol: TradableSymbol): MarketTick | null {
  const subscribe = useCallback(
    (onStoreChange: () => void) => store.subscribe(symbol, onStoreChange),
    [store, symbol],
  );
  const getSnapshot = useCallback(() => store.getTick(symbol), [store, symbol]);
  // The store always starts empty regardless of environment, so the same
  // getSnapshot doubles as getServerSnapshot — required or Next's SSR pass
  // for this client component throws "Missing getServerSnapshot".
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Re-renders the caller on every tick, any symbol — for the one consumer
 * (the open-positions live-PnL panel) whose relevant symbol set is genuinely
 * dynamic (whatever's currently open). React's rules of hooks rule out
 * subscribing to a truly dynamic key set directly; a version counter sidesteps
 * needing a stable multi-symbol snapshot object for useSyncExternalStore.
 * Still isolated to just that one panel — nothing else in the tree pays for it.
 */
export function useAllTicks(store: TickStore): number {
  const versionRef = useRef(0);
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      store.subscribeAny(() => {
        versionRef.current += 1;
        onStoreChange();
      }),
    [store],
  );
  const getSnapshot = useCallback(() => versionRef.current, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
