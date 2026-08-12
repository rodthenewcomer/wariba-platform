'use client';

import type { TradableSymbol } from '@wariba/contracts';
import {
  MAX_DRAWINGS_PER_SYMBOL,
  parseChartDrawing,
  type ChartDrawing,
} from './chart-drawing-model';

/**
 * Browser-local drawing persistence — W5 §54/§55/§79/§125/§138.
 *
 * **No server, no table, no migration** (§138). Drawings are annotations a
 * trader makes on their own screen; W5 does not create `chart_drawings`, does
 * not sync them and does not claim they follow the trader to another device.
 * That limitation is recorded, not hidden.
 *
 * **Scope: account, then symbol.** Account-scoped is the safer default (§79) —
 * a trader running an evaluation and a funded account should not find one
 * account's analysis drawn over the other's chart without having asked for it.
 * Symbol-scoped because a EURUSD level means nothing on XAUUSD (§76/§114).
 * Deliberately *not* timeframe-scoped: a level is a level whether you look at it
 * on 1m or 3m, and duplicating it per interval would be five copies to maintain
 * by hand (§54/§77).
 *
 * **Writes happen on commit, never on movement** (§73/§125). The store is a
 * plain imperative object with a subscribe seam, so a drag updates chart-local
 * state at pointer speed and touches storage exactly once, when the trader lets
 * go.
 */

export const CHART_DRAWINGS_STORAGE_KEY = 'wariba.warix.chart.drawings';
const VERSION = 1;

/** Guard against a payload that would take a visible amount of time to parse. */
const MAX_STORED_ACCOUNTS = 20;

type SymbolDrawings = Partial<Record<TradableSymbol, ChartDrawing[]>>;

export interface ChartDrawingStore {
  /** Drawings for one symbol, oldest first. Never the internal array. */
  list(symbol: TradableSymbol): ChartDrawing[];
  /** Adds one drawing and persists. Ignored once the symbol is at its ceiling. */
  add(drawing: ChartDrawing): boolean;
  /** Replaces one drawing by id and persists. Used on drag end and style change. */
  replace(drawing: ChartDrawing): void;
  remove(symbol: TradableSymbol, id: string): void;
  subscribe(listener: () => void): () => void;
  /** Monotonic; lets React read a stable snapshot without copying the list. */
  version(): number;
}

interface StoredPayload {
  version: number;
  accounts: Record<string, SymbolDrawings>;
}

/**
 * W5 §55 — fails closed at every level.
 *
 * A malformed *drawing* is dropped and its siblings survive; a malformed
 * *payload* yields an empty store rather than a partially-applied one. Neither
 * throws: chart hydration must never depend on what a previous version of this
 * code, or another tab, happened to leave in storage.
 */
export function parseStoredDrawings(raw: string | null): Record<string, SymbolDrawings> {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null) return {};
  const payload = parsed as Partial<StoredPayload>;
  if (payload.version !== VERSION) return {};
  if (typeof payload.accounts !== 'object' || payload.accounts === null) return {};

  const accounts: Record<string, SymbolDrawings> = {};
  for (const [accountId, bySymbol] of Object.entries(payload.accounts).slice(
    0,
    MAX_STORED_ACCOUNTS,
  )) {
    if (typeof bySymbol !== 'object' || bySymbol === null) continue;
    const symbols: SymbolDrawings = {};
    for (const [symbol, list] of Object.entries(bySymbol as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue;
      const drawings: ChartDrawing[] = [];
      for (const raw of list.slice(0, MAX_DRAWINGS_PER_SYMBOL)) {
        const drawing = parseChartDrawing(raw);
        // The record must also agree with the key it was filed under, or a
        // hand-edited payload could draw XAUUSD levels on EURUSD (§114).
        if (drawing !== null && drawing.symbol === symbol) drawings.push(drawing);
      }
      if (drawings.length > 0) symbols[symbol as TradableSymbol] = drawings;
    }
    accounts[accountId] = symbols;
  }
  return accounts;
}

function readAll(): Record<string, SymbolDrawings> {
  try {
    return parseStoredDrawings(window.localStorage.getItem(CHART_DRAWINGS_STORAGE_KEY));
  } catch {
    // Storage unavailable (private browsing, quota, disabled). An in-memory
    // session is the correct outcome — never block the chart on storage.
    return {};
  }
}

export function createChartDrawingStore(accountId: string): ChartDrawingStore {
  let accounts = typeof window === 'undefined' ? {} : readAll();
  let bySymbol: SymbolDrawings = accounts[accountId] ?? {};
  const listeners = new Set<() => void>();
  let version = 0;

  function persist(): void {
    version += 1;
    accounts = { ...accounts, [accountId]: bySymbol };
    try {
      window.localStorage.setItem(
        CHART_DRAWINGS_STORAGE_KEY,
        JSON.stringify({ version: VERSION, accounts } satisfies StoredPayload),
      );
    } catch {
      // See readAll(): a drawing that cannot be persisted still exists for this
      // session, and the trader is not interrupted mid-analysis to be told so.
    }
    for (const listener of listeners) listener();
  }

  return {
    list: (symbol) => [...(bySymbol[symbol] ?? [])],
    add(drawing) {
      const existing = bySymbol[drawing.symbol] ?? [];
      if (existing.length >= MAX_DRAWINGS_PER_SYMBOL) return false;
      bySymbol = { ...bySymbol, [drawing.symbol]: [...existing, drawing] };
      persist();
      return true;
    },
    replace(drawing) {
      const existing = bySymbol[drawing.symbol] ?? [];
      if (!existing.some((entry) => entry.id === drawing.id)) return;
      bySymbol = {
        ...bySymbol,
        [drawing.symbol]: existing.map((entry) => (entry.id === drawing.id ? drawing : entry)),
      };
      persist();
    },
    remove(symbol, id) {
      const existing = bySymbol[symbol] ?? [];
      const next = existing.filter((entry) => entry.id !== id);
      if (next.length === existing.length) return;
      bySymbol = { ...bySymbol, [symbol]: next };
      persist();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => version,
  };
}
