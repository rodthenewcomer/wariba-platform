'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_CANDLE_TIMEFRAME,
  isCandleTimeframe,
  type CandleTimeframe,
} from '@wariba/contracts';
import {
  DEFAULT_CHART_INDICATORS,
  normalizeChartIndicators,
  parseChartIndicator,
  type ChartIndicator,
} from './chart-indicator-model';
import {
  DEFAULT_CHART_SETTINGS,
  parseChartSettings,
  type ChartDisplaySettings,
} from './chart-settings-model';

/**
 * Chart-analysis preferences — W5 §16/§40/§71/§79/§124/§139.
 *
 * What is stored: the last selected timeframe and the indicator configuration.
 * Nothing else. This is **not financial state** — no balance, no risk, no order,
 * no position, no price — and no command reads it, which is the same contract
 * `workstation-preferences.ts` states for layout (UX-WARIX-005).
 *
 * Account-scoped, matching the drawing store next door (§79). Browser-local and
 * therefore not synchronised across devices, which is recorded rather than
 * hidden. Explicitly *not* a workspace preset system: there are no named
 * layouts, no saved workspaces and no multi-chart grids in W5 (§139).
 *
 * Because it is shared chart state rather than per-breakpoint state, resizing
 * from desktop to mobile keeps the same timeframe and the same indicators
 * (§71) — there is deliberately no second, mobile-only configuration.
 *
 * Writes happen on a configuration action, never on a tick (§124).
 */

export const CHART_PREFERENCES_STORAGE_KEY = 'wariba.warix.chart.analysis';
const VERSION = 1;

export interface ChartAnalysisPreferences {
  timeframe: CandleTimeframe;
  indicators: ChartIndicator[];
  /**
   * Display settings — the reopen pass's Settings modal.
   *
   * Added to the *existing* v1 payload rather than behind a version bump, and
   * that is deliberate: a bump would have made `parseChartPreferences` fail
   * closed on every trader's stored file and silently reset their timeframe and
   * their indicator lines. An absent `settings` key is not corruption, it
   * is a payload written before this feature existed, and it resolves to the
   * shipped defaults exactly as it should.
   */
  settings: ChartDisplaySettings;
  /** Tool and indicator ids a trader has starred. Order is the trader's own. */
  favorites: string[];
}

export const DEFAULT_CHART_PREFERENCES: ChartAnalysisPreferences = {
  timeframe: DEFAULT_CANDLE_TIMEFRAME,
  indicators: [...DEFAULT_CHART_INDICATORS],
  settings: DEFAULT_CHART_SETTINGS,
  favorites: [],
};

/** A stored favourite id is opaque here; the catalogue decides what resolves. */
const MAX_FAVORITES = 64;
const MAX_FAVORITE_ID_LENGTH = 64;

function parseFavorites(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    if (entry.length === 0 || entry.length > MAX_FAVORITE_ID_LENGTH) continue;
    seen.add(entry);
    if (seen.size >= MAX_FAVORITES) break;
  }
  return [...seen];
}

/**
 * Adds newly shipped, disabled presets to an older account-local registry.
 *
 * Existing entries always win, including their enabled state and styling. This
 * is a catalogue migration, not a chart reset: adding EMA 200 to WariX must make
 * the row discoverable for an existing trader without switching a new line on,
 * replacing their colour, or discarding a custom valid instance.
 */
export function mergeShippedChartIndicators(
  indicators: readonly ChartIndicator[],
): ChartIndicator[] {
  const known = new Set(indicators.map((indicator) => indicator.id));
  return normalizeChartIndicators([
    ...indicators,
    ...DEFAULT_CHART_INDICATORS.filter((indicator) => !known.has(indicator.id)).map(
      (indicator) => ({
        ...indicator,
        enabled: false,
      }),
    ),
  ]);
}

interface StoredAccountEntry {
  timeframe?: unknown;
  indicators?: unknown;
  settings?: unknown;
  favorites?: unknown;
}

interface StoredPayload {
  version: number;
  accounts: Record<string, StoredAccountEntry>;
}

/**
 * Fails closed at every level (§16/§40).
 *
 * A stored timeframe this build no longer supports falls back to the default
 * rather than being passed to a `timeframeSeconds` lookup that has no entry for
 * it. An indicator list whose records do not all validate keeps the ones that
 * do — a single corrupt entry should not cost a trader their other three lines —
 * but an empty or absent list yields the shipped preset, not a blank chart the
 * trader has no obvious way to explain. Older valid lists gain new shipped
 * presets in the disabled state through `mergeShippedChartIndicators`.
 */
export function parseChartPreferences(
  raw: string | null,
  accountId: string,
): ChartAnalysisPreferences {
  if (!raw) return DEFAULT_CHART_PREFERENCES;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_CHART_PREFERENCES;
  }
  if (typeof parsed !== 'object' || parsed === null) return DEFAULT_CHART_PREFERENCES;
  const payload = parsed as Partial<StoredPayload>;
  if (payload.version !== VERSION) return DEFAULT_CHART_PREFERENCES;
  if (typeof payload.accounts !== 'object' || payload.accounts === null) {
    return DEFAULT_CHART_PREFERENCES;
  }

  const entry = payload.accounts[accountId];
  if (typeof entry !== 'object' || entry === null) return DEFAULT_CHART_PREFERENCES;

  const timeframe = isCandleTimeframe(entry.timeframe) ? entry.timeframe : DEFAULT_CANDLE_TIMEFRAME;

  const indicators: ChartIndicator[] = [];
  if (Array.isArray(entry.indicators)) {
    for (const raw of entry.indicators) {
      const indicator = parseChartIndicator(raw);
      if (indicator !== null) indicators.push(indicator);
    }
  }

  return {
    timeframe,
    indicators:
      indicators.length === 0
        ? [...DEFAULT_CHART_INDICATORS]
        : mergeShippedChartIndicators(indicators),
    settings: parseChartSettings(entry.settings),
    favorites: parseFavorites(entry.favorites),
  };
}

export interface ChartPreferencesController {
  preferences: ChartAnalysisPreferences;
  /**
   * False until the stored payload has been read.
   *
   * The chart waits for this before its first history request. Without it the
   * SSR-safe hydrate-then-apply shape would fire one hydration at the default
   * interval, then immediately throw it away and fire another at the trader's
   * actual one — a wasted round trip and a visible flash of the wrong chart on
   * every page load. Layout preferences can afford that; a market history
   * request should not pay it.
   */
  loaded: boolean;
  setTimeframe(timeframe: CandleTimeframe): void;
  setIndicators(indicators: readonly ChartIndicator[]): void;
  setSettings(settings: ChartDisplaySettings): void;
  toggleFavorite(id: string): void;
}

/**
 * SSR-safe: the server and the first client render both produce the defaults,
 * and the stored payload is applied after mount — the same hydrate-then-apply
 * shape `useWorkstationPreferences` uses.
 */
export function useChartPreferences(accountId: string): ChartPreferencesController {
  const [preferences, setPreferences] =
    useState<ChartAnalysisPreferences>(DEFAULT_CHART_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    try {
      setPreferences(
        parseChartPreferences(
          window.localStorage.getItem(CHART_PREFERENCES_STORAGE_KEY),
          accountId,
        ),
      );
    } catch {
      // Storage unavailable — the defaults already in state are correct, and
      // the chart must still hydrate, so this is `loaded` all the same.
    }
    setLoaded(true);
  }, [accountId]);

  const update = useCallback(
    (patch: Partial<ChartAnalysisPreferences>) => {
      setPreferences((previous) => {
        const next = { ...previous, ...patch };
        try {
          const raw = window.localStorage.getItem(CHART_PREFERENCES_STORAGE_KEY);
          let accounts: Record<string, unknown> = {};
          if (raw) {
            const parsed: unknown = JSON.parse(raw);
            if (typeof parsed === 'object' && parsed !== null) {
              const payload = parsed as Partial<StoredPayload>;
              if (payload.version === VERSION && typeof payload.accounts === 'object') {
                accounts = { ...payload.accounts };
              }
            }
          }
          accounts[accountId] = {
            timeframe: next.timeframe,
            indicators: next.indicators,
            settings: next.settings,
            favorites: next.favorites,
          };
          window.localStorage.setItem(
            CHART_PREFERENCES_STORAGE_KEY,
            JSON.stringify({ version: VERSION, accounts }),
          );
        } catch {
          // A preference that cannot be persisted still applies for this session.
        }
        return next;
      });
    },
    [accountId],
  );

  return useMemo(
    () => ({
      preferences,
      loaded,
      setTimeframe: (timeframe) => update({ timeframe }),
      setIndicators: (indicators) => update({ indicators: normalizeChartIndicators(indicators) }),
      setSettings: (settings) => update({ settings }),
      toggleFavorite: (id) =>
        update({
          favorites: preferences.favorites.includes(id)
            ? preferences.favorites.filter((entry) => entry !== id)
            : [...preferences.favorites, id].slice(0, MAX_FAVORITES),
        }),
    }),
    [preferences, loaded, update],
  );
}
