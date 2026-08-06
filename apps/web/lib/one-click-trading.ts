'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Prompt 7 Appendix 07-C §8 — ONE_CLICK_TRADING_DEFAULT = false. A client-only
 * preference (localStorage, this browser/device only — no server-side
 * settings table exists for per-user trading preferences yet) gated behind
 * explicit opt-in + accepting the warning copy every time it's turned on.
 * Never affects server-side validation: with or without one-click trading,
 * every Market Buy/Sell from the chart context menu submits the exact same
 * server-authoritative market_open command (services/realtime/src/
 * order-handler.ts) — this only decides whether QuickOrderConfirm asks for
 * an explicit tap first.
 */
const STORAGE_KEY = 'wariba.oneClickTrading.enabled';

export function isOneClickTradingEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setOneClickTradingEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Storage unavailable (private browsing, quota) — falls back to the
    // safe default (disabled, confirmation always shown) on next read.
  }
}

/** Re-reads from localStorage on mount (SSR-safe: server/first client render both start `false`, then hydrate). */
export function useOneClickTrading(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(isOneClickTradingEnabled());
  }, []);
  const update = useCallback((next: boolean) => {
    setOneClickTradingEnabled(next);
    setEnabled(next);
  }, []);
  return [enabled, update];
}
