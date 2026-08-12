'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TRADABLE_SYMBOLS, type TradableSymbol } from '@wariba/contracts';

/**
 * The workstation's UI-only layout preferences (W2 §14).
 *
 * Scope is deliberately narrow: this stores **how the workstation is arranged**
 * and nothing about what it displays. No balance, no risk state, no price, no
 * order draft, no position, no alert. A value read from here can change where a
 * panel edge sits; it can never change what the server says is true, and it is
 * never consulted by any command.
 *
 * Storage is browser-local and therefore **not synchronised across devices** —
 * a trader who resizes the navigator on a laptop finds the default on a phone.
 * That is acceptable for layout and is recorded rather than hidden; making it
 * cross-device would mean a server-side preference table, which W2 does not
 * introduce.
 *
 * Every read is defensive. A corrupt, truncated, hand-edited or
 * future-versioned payload yields the defaults rather than a partially-applied
 * layout, and every number is clamped to its usable range on the way in and on
 * the way out.
 */
export const WORKSTATION_PREFERENCES_KEY = 'wariba.workstation.layout';
const VERSION = 1;

export const NAVIGATOR_WIDTH_MIN = 220;
export const NAVIGATOR_WIDTH_MAX = 320;
export const NAVIGATOR_WIDTH_DEFAULT = 244;

export const DOCK_HEIGHT_MIN = 112;
/** Hard ceiling; the shell additionally clamps to 55dvh so a short viewport cannot be swallowed. */
export const DOCK_HEIGHT_MAX = 560;
export const DOCK_HEIGHT_DEFAULT = 220;
/** Header-only dock (W2 §22). */
export const DOCK_COLLAPSED_HEIGHT = 40;
/** WX1 authoritative empty presentation; it never overwrites the populated preference. */
export const DOCK_EMPTY_HEIGHT = 48;

export interface WorkstationPreferences {
  navigatorWidth: number;
  navigatorCollapsed: boolean;
  dockHeight: number;
  dockCollapsed: boolean;
  favorites: TradableSymbol[];
}

export const DEFAULT_WORKSTATION_PREFERENCES: WorkstationPreferences = {
  navigatorWidth: NAVIGATOR_WIDTH_DEFAULT,
  navigatorCollapsed: false,
  dockHeight: DOCK_HEIGHT_DEFAULT,
  dockCollapsed: false,
  favorites: [],
};

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Fails closed: anything that is not a well-formed payload of the current
 * version returns the defaults untouched.
 */
export function parseWorkstationPreferences(raw: string | null): WorkstationPreferences {
  if (!raw) return DEFAULT_WORKSTATION_PREFERENCES;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_WORKSTATION_PREFERENCES;
  }
  if (typeof parsed !== 'object' || parsed === null) return DEFAULT_WORKSTATION_PREFERENCES;
  const candidate = parsed as Record<string, unknown>;
  if (candidate.version !== VERSION) return DEFAULT_WORKSTATION_PREFERENCES;

  const favorites = Array.isArray(candidate.favorites)
    ? candidate.favorites.filter((entry): entry is TradableSymbol =>
        TRADABLE_SYMBOLS.includes(entry as TradableSymbol),
      )
    : [];

  return {
    navigatorWidth:
      typeof candidate.navigatorWidth === 'number'
        ? clamp(candidate.navigatorWidth, NAVIGATOR_WIDTH_MIN, NAVIGATOR_WIDTH_MAX)
        : NAVIGATOR_WIDTH_DEFAULT,
    navigatorCollapsed: candidate.navigatorCollapsed === true,
    dockHeight:
      typeof candidate.dockHeight === 'number'
        ? clamp(candidate.dockHeight, DOCK_HEIGHT_MIN, DOCK_HEIGHT_MAX)
        : DOCK_HEIGHT_DEFAULT,
    dockCollapsed: candidate.dockCollapsed === true,
    // De-duplicated so a corrupted list cannot render the same row twice.
    favorites: [...new Set(favorites)],
  };
}

function serialize(preferences: WorkstationPreferences): string {
  return JSON.stringify({ version: VERSION, ...preferences });
}

export interface WorkstationPreferencesController {
  preferences: WorkstationPreferences;
  setNavigatorWidth(width: number): void;
  setNavigatorCollapsed(collapsed: boolean): void;
  setDockHeight(height: number): void;
  setDockCollapsed(collapsed: boolean): void;
  toggleFavorite(symbol: TradableSymbol): void;
}

/**
 * SSR-safe: the server and the first client render both produce the defaults,
 * and stored values are applied after mount — the same hydrate-then-apply shape
 * `useOneClickTrading` already uses.
 */
export function useWorkstationPreferences(): WorkstationPreferencesController {
  const [preferences, setPreferences] = useState<WorkstationPreferences>(
    DEFAULT_WORKSTATION_PREFERENCES,
  );

  useEffect(() => {
    try {
      setPreferences(
        parseWorkstationPreferences(window.localStorage.getItem(WORKSTATION_PREFERENCES_KEY)),
      );
    } catch {
      // Storage unavailable (private browsing, quota, disabled): the defaults
      // already in state are the correct outcome.
    }
  }, []);

  const update = useCallback((patch: Partial<WorkstationPreferences>) => {
    setPreferences((previous) => {
      const next = { ...previous, ...patch };
      try {
        window.localStorage.setItem(WORKSTATION_PREFERENCES_KEY, serialize(next));
      } catch {
        // A layout preference that cannot be persisted still applies for this
        // session — never block the interaction on storage.
      }
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      preferences,
      setNavigatorWidth: (width) =>
        update({ navigatorWidth: clamp(width, NAVIGATOR_WIDTH_MIN, NAVIGATOR_WIDTH_MAX) }),
      setNavigatorCollapsed: (navigatorCollapsed) => update({ navigatorCollapsed }),
      setDockHeight: (height) =>
        update({ dockHeight: clamp(height, DOCK_HEIGHT_MIN, DOCK_HEIGHT_MAX) }),
      setDockCollapsed: (dockCollapsed) => update({ dockCollapsed }),
      toggleFavorite: (symbol) =>
        setPreferences((previous) => {
          const favorites = previous.favorites.includes(symbol)
            ? previous.favorites.filter((entry) => entry !== symbol)
            : [...previous.favorites, symbol];
          const next = { ...previous, favorites };
          try {
            window.localStorage.setItem(WORKSTATION_PREFERENCES_KEY, serialize(next));
          } catch {
            // See update() above.
          }
          return next;
        }),
    }),
    [preferences, update],
  );
}
