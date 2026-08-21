'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TRADABLE_SYMBOLS, type TradableSymbol } from '@wariba/contracts';
import {
  DEFAULT_PREFERRED_LAYOUT,
  DOCK_COLLAPSED_HEIGHT,
  DOCK_DEFAULT_POPULATED_HEIGHT,
  DOCK_EMPTY_HEIGHT,
  DOCK_POPULATED_MAX,
  DOCK_POPULATED_MIN,
  EXECUTION_DEFAULT_WIDTH,
  EXECUTION_PREFERRED_MAX,
  EXECUTION_PREFERRED_MIN,
  NAVIGATOR_DEFAULT_WIDTH,
  NAVIGATOR_PREFERRED_MAX,
  NAVIGATOR_PREFERRED_MIN,
  clampToRange,
  executionDockPolicyForWidth,
} from './workspace-layout';

/**
 * The workstation's UI-only layout preferences (W2 §14, extended by the
 * Workspace Layout Engine addendum).
 *
 * Scope is deliberately narrow: this stores **how the workstation is arranged**
 * and nothing about what it displays. No balance, no risk state, no price, no
 * order draft, no position, no alert. A value read from here can change where a
 * panel edge sits; it can never change what the server says is true, and it is
 * never consulted by any command.
 *
 * Every dimension stored here is a **preferred** value — what the trader chose,
 * not what currently fits. `workspace-layout.ts` derives the effective sizes per
 * viewport. Persisting the effective value instead would mean that the first
 * time a window got small, the trader's real preference would be destroyed and
 * would never come back.
 *
 * Storage is browser-local and therefore **not synchronised across devices** —
 * a trader who widens the Navigator on a laptop finds the default on a phone.
 * That is acceptable for layout and is recorded rather than hidden.
 *
 * Every read is defensive. A corrupt, truncated, hand-edited or
 * future-versioned payload yields the defaults rather than a partially-applied
 * layout, and every number is clamped to its usable range on the way in and on
 * the way out.
 */
export const WORKSTATION_PREFERENCES_KEY = 'wariba.workstation.layout';

/**
 * Schema 2 — adds the Execution Center's preferred width, and renames the two
 * existing dimensions to say plainly that they are *preferred*, not effective.
 *
 * Version 1 payloads are migrated rather than discarded: a trader who had
 * already sized their Navigator and dock keeps both, and simply gains an
 * Execution width at its compact baseline. Anything that is neither 1 nor 2 — including
 * a *newer* version written by some future build — fails closed to the
 * defaults, so an unknown shape can never silently become authoritative.
 */
export const LAYOUT_PREFERENCE_SCHEMA_VERSION = 2;

export const NAVIGATOR_WIDTH_MIN = NAVIGATOR_PREFERRED_MIN;
export const NAVIGATOR_WIDTH_MAX = NAVIGATOR_PREFERRED_MAX;
export const NAVIGATOR_WIDTH_DEFAULT = NAVIGATOR_DEFAULT_WIDTH;

export const EXECUTION_WIDTH_MIN = EXECUTION_PREFERRED_MIN;
export const EXECUTION_WIDTH_MAX = EXECUTION_PREFERRED_MAX;
export const EXECUTION_WIDTH_DEFAULT = EXECUTION_DEFAULT_WIDTH;

export const DOCK_HEIGHT_MIN = DOCK_POPULATED_MIN;
/** Hard ceiling; the layout engine additionally derives a per-viewport maximum. */
export const DOCK_HEIGHT_MAX = DOCK_POPULATED_MAX;
export const DOCK_HEIGHT_DEFAULT = DOCK_DEFAULT_POPULATED_HEIGHT;
export { DOCK_COLLAPSED_HEIGHT, DOCK_EMPTY_HEIGHT };

export interface WorkstationPreferences {
  /** Preferred, not effective — see the module note. */
  navigatorPreferredWidth: number;
  executionPreferredWidth: number;
  activityDockPreferredHeight: number;
  navigatorCollapsed: boolean;
  dockCollapsed: boolean;
  favorites: TradableSymbol[];
}

export const DEFAULT_WORKSTATION_PREFERENCES: WorkstationPreferences = {
  navigatorPreferredWidth: DEFAULT_PREFERRED_LAYOUT.navigatorWidth,
  executionPreferredWidth: DEFAULT_PREFERRED_LAYOUT.executionWidth,
  activityDockPreferredHeight: DEFAULT_PREFERRED_LAYOUT.dockHeight,
  navigatorCollapsed: false,
  dockCollapsed: false,
  favorites: [],
};

export function clamp(value: number, min: number, max: number): number {
  return clampToRange(value, min, max);
}

function readFavorites(candidate: Record<string, unknown>): TradableSymbol[] {
  const favorites = Array.isArray(candidate.favorites)
    ? candidate.favorites.filter((entry): entry is TradableSymbol =>
        TRADABLE_SYMBOLS.includes(entry as TradableSymbol),
      )
    : [];
  // De-duplicated so a corrupted list cannot render the same row twice.
  return [...new Set(favorites)];
}

function dimension(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' ? clampToRange(value, min, max) : fallback;
}

/**
 * Fails closed: anything that is not a well-formed payload of a version this
 * build understands returns the defaults untouched.
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

  // A future schema is not "mostly compatible" — it is unknown. Fail closed.
  if (candidate.version !== 1 && candidate.version !== LAYOUT_PREFERENCE_SCHEMA_VERSION) {
    return DEFAULT_WORKSTATION_PREFERENCES;
  }

  const isV1 = candidate.version === 1;
  return {
    // v1 called these `navigatorWidth` / `dockHeight` and had no Execution
    // width. Both survive the upgrade; the new dimension starts at its default.
    navigatorPreferredWidth: dimension(
      isV1 ? candidate.navigatorWidth : candidate.navigatorPreferredWidth,
      NAVIGATOR_WIDTH_DEFAULT,
      NAVIGATOR_WIDTH_MIN,
      NAVIGATOR_WIDTH_MAX,
    ),
    executionPreferredWidth: dimension(
      isV1 ? undefined : candidate.executionPreferredWidth,
      EXECUTION_WIDTH_DEFAULT,
      EXECUTION_WIDTH_MIN,
      EXECUTION_WIDTH_MAX,
    ),
    activityDockPreferredHeight: dimension(
      isV1 ? candidate.dockHeight : candidate.activityDockPreferredHeight,
      DOCK_HEIGHT_DEFAULT,
      DOCK_HEIGHT_MIN,
      DOCK_HEIGHT_MAX,
    ),
    navigatorCollapsed: candidate.navigatorCollapsed === true,
    dockCollapsed: candidate.dockCollapsed === true,
    favorites: readFavorites(candidate),
  };
}

function serialize(preferences: WorkstationPreferences): string {
  return JSON.stringify({ version: LAYOUT_PREFERENCE_SCHEMA_VERSION, ...preferences });
}

/** The desktop grid's own floor — below this the shell is the mobile column. */
export const DESKTOP_MINIMUM_WIDTH = 1024;
/** The last width at which the full three-column cockpit starves the chart. */
export const HYBRID_MAXIMUM_WIDTH = 1279;

/**
 * Visual closure §22 and the compact execution-width policy.
 *
 * The hybrid band keeps the chart and Execution persistent and makes the
 * Navigator contextual. Every desktop band also receives its own compact
 * first-run Execution width; stored preferences remain viewport-independent.
 */
export function isHybridWidth(width: number): boolean {
  return width >= DESKTOP_MINIMUM_WIDTH && width <= HYBRID_MAXIMUM_WIDTH;
}

/**
 * First-run layout for a viewport that has no stored preference yet.
 *
 * Kept as the single definition of viewport defaults; `TradeClient` resolves
 * it per render rather than freezing it at mount.
 */
export function defaultWorkstationPreferencesForWidth(width: number): WorkstationPreferences {
  return {
    ...DEFAULT_WORKSTATION_PREFERENCES,
    executionPreferredWidth: executionDockPolicyForWidth(width).preferred,
    navigatorCollapsed: isHybridWidth(width),
  };
}

export interface WorkstationPreferencesController {
  preferences: WorkstationPreferences;
  /**
   * Whether this browser holds a layout the trader actually chose.
   *
   * The hybrid default must never override a decision, and must stay reactive
   * to the viewport until one is made — so the caller needs to know which of the
   * two is in force rather than having it baked in at mount.
   */
  hasStoredLayout: boolean;
  setNavigatorPreferredWidth(width: number): void;
  setExecutionPreferredWidth(width: number): void;
  setDockPreferredHeight(height: number): void;
  setNavigatorCollapsed(collapsed: boolean): void;
  setDockCollapsed(collapsed: boolean): void;
  resetNavigatorWidth(): void;
  resetExecutionWidth(): void;
  resetDockHeight(): void;
  toggleFavorite(symbol: TradableSymbol): void;
}

/**
 * SSR-safe: the server and the first client render both produce the defaults,
 * and stored values are applied after mount — the same hydrate-then-apply shape
 * `useOneClickTrading` already uses.
 */
export function useWorkstationPreferences(viewportWidth: number): WorkstationPreferencesController {
  const [preferences, setPreferences] = useState<WorkstationPreferences>(
    DEFAULT_WORKSTATION_PREFERENCES,
  );
  const [hasStoredLayout, setHasStoredLayout] = useState(false);
  const hasStoredLayoutRef = useRef(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(WORKSTATION_PREFERENCES_KEY);
      if (stored === null) return;
      hasStoredLayoutRef.current = true;
      setPreferences(parseWorkstationPreferences(stored));
      setHasStoredLayout(true);
    } catch {
      // Storage unavailable (private browsing, quota, disabled): the defaults
      // already in state are the correct outcome.
    }
  }, []);

  useEffect(() => {
    if (hasStoredLayoutRef.current) return;
    // Keep the in-memory baseline aligned with the first-run composition. If
    // the trader's first deliberate action is opening the hybrid Navigator,
    // that action must not incidentally promote the global 248px Execution
    // baseline over the 1024 band's rendered 236px default and shrink the chart.
    setPreferences(defaultWorkstationPreferencesForWidth(viewportWidth));
  }, [viewportWidth]);

  const update = useCallback((patch: Partial<WorkstationPreferences>) => {
    // Any deliberate change makes this browser's layout the trader's own.
    hasStoredLayoutRef.current = true;
    setHasStoredLayout(true);
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
      hasStoredLayout,
      setNavigatorPreferredWidth: (width) =>
        update({
          navigatorPreferredWidth: clampToRange(width, NAVIGATOR_WIDTH_MIN, NAVIGATOR_WIDTH_MAX),
        }),
      setExecutionPreferredWidth: (width) =>
        update({
          executionPreferredWidth: clampToRange(width, EXECUTION_WIDTH_MIN, EXECUTION_WIDTH_MAX),
        }),
      setDockPreferredHeight: (height) =>
        update({
          activityDockPreferredHeight: clampToRange(height, DOCK_HEIGHT_MIN, DOCK_HEIGHT_MAX),
        }),
      setNavigatorCollapsed: (navigatorCollapsed) => update({ navigatorCollapsed }),
      setDockCollapsed: (dockCollapsed) => update({ dockCollapsed }),
      resetNavigatorWidth: () => update({ navigatorPreferredWidth: NAVIGATOR_WIDTH_DEFAULT }),
      resetExecutionWidth: () => update({ executionPreferredWidth: EXECUTION_WIDTH_DEFAULT }),
      resetDockHeight: () => update({ activityDockPreferredHeight: DOCK_HEIGHT_DEFAULT }),
      toggleFavorite: (symbol) => {
        // Favorites share this browser-local payload. Mark it stored before the
        // write so a later viewport change cannot replace the newly persisted
        // favorite list with first-run layout defaults.
        hasStoredLayoutRef.current = true;
        setHasStoredLayout(true);
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
        });
      },
    }),
    [preferences, hasStoredLayout, update],
  );
}
