'use client';

import { TRADABLE_SYMBOLS, type TradableSymbol } from '@wariba/contracts';

/**
 * The canonical chart-drawing model — W5 §41-§44, §54-§56.
 *
 * **Renderer-independent by construction.** This file imports nothing from
 * lightweight-charts, and nothing from it may. W0's ARCH-028 recorded that WariX
 * will eventually isolate renderer-specific code behind a `ChartEngineAdapter`;
 * encoding a trader's trend lines as library primitives would have made that
 * seam impossible to cross without losing their work. A drawing is a
 * `(time, price)` fact about the market; converting it to pixels is the
 * coordinate adapter's job and nobody else's.
 *
 * **Not a trading instruction.** A horizontal line here is an annotation. It is
 * not a price alert, not a pending order, not a stop loss and not a take
 * profit, and no code path turns it into one (§44/§85). Drawing ids and trading
 * overlay ids are separate namespaces, so deleting a drawing cannot cancel an
 * order (§52/§113).
 *
 * **Anchors.** Time is epoch seconds, matching `MarketCandle.startTime`; price
 * is a decimal *string*, matching every other price in this codebase. Neither is
 * ever stored as a screen coordinate — a drawing must survive a zoom, a resize
 * and a timeframe change (§77).
 */

export const CHART_DRAWING_TYPES = [
  'horizontal_line',
  'trend_line',
  'ray',
  'rectangle',
  'fibonacci',
] as const;
export type ChartDrawingType = (typeof CHART_DRAWING_TYPES)[number];

/** How many anchors each tool stores. A horizontal line keeps its click time for ordering only. */
export const DRAWING_ANCHOR_COUNT: Record<ChartDrawingType, number> = {
  horizontal_line: 1,
  trend_line: 2,
  ray: 2,
  rectangle: 2,
  fibonacci: 2,
};

/**
 * W5 §43 — the Fibonacci retracement levels, and only these.
 *
 * Extensions (1.272, 1.618, …) are deliberately absent: they project *beyond*
 * the measured move, which is a different tool with a different reading, and W5
 * does not implement it.
 */
export const FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;

/**
 * W5 §56 — the per-symbol ceiling on stored drawings.
 *
 * Each drawing is a handful of SVG nodes with pointer handlers; a thousand of
 * them is a chart that cannot be panned. 100 is far past deliberate use and far
 * short of a browser problem, and it bounds what a corrupted or hostile storage
 * payload can force the chart to render on hydrate.
 */
export const MAX_DRAWINGS_PER_SYMBOL = 100;

export const DRAWING_COLORS = ['#9AA3B1', '#6684FF', '#E0A458', '#4FA3A5', '#B48EAD'] as const;
export type ChartDrawingColor = (typeof DRAWING_COLORS)[number];

export const DRAWING_LINE_STYLES = ['solid', 'dashed'] as const;
export type ChartDrawingLineStyle = (typeof DRAWING_LINE_STYLES)[number];

export interface ChartDrawingStyle {
  color: ChartDrawingColor;
  width: 1 | 2;
  lineStyle: ChartDrawingLineStyle;
}

export const DEFAULT_DRAWING_STYLE: ChartDrawingStyle = {
  // Quieter than every operational overlay on the chart by default (§127): a
  // trader's own analysis must not compete visually with an open position's line.
  color: '#9AA3B1',
  width: 1,
  lineStyle: 'solid',
};

export interface ChartDrawingAnchor {
  /** Epoch seconds — a candle start time, or the nearest one (§47). */
  time: number;
  /** Decimal string, at the instrument's own precision. */
  price: string;
}

export interface ChartDrawing {
  id: string;
  type: ChartDrawingType;
  symbol: TradableSymbol;
  anchors: ChartDrawingAnchor[];
  style: ChartDrawingStyle;
  createdAt: number;
  updatedAt: number;
}

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

export function isChartDrawingType(value: unknown): value is ChartDrawingType {
  return typeof value === 'string' && (CHART_DRAWING_TYPES as readonly string[]).includes(value);
}

function parseAnchor(value: unknown): ChartDrawingAnchor | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.time !== 'number' || !Number.isFinite(candidate.time)) return null;
  if (!Number.isInteger(candidate.time) || candidate.time < 0) return null;
  if (typeof candidate.price !== 'string' || !DECIMAL_PATTERN.test(candidate.price)) return null;
  // A price that survives the pattern but not `Number` (an absurd exponent, a
  // 400-digit integer) would poison every coordinate conversion downstream.
  if (!Number.isFinite(Number(candidate.price))) return null;
  return { time: candidate.time, price: candidate.price };
}

function parseStyle(value: unknown): ChartDrawingStyle | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (!(DRAWING_COLORS as readonly unknown[]).includes(candidate.color)) return null;
  if (candidate.width !== 1 && candidate.width !== 2) return null;
  if (!(DRAWING_LINE_STYLES as readonly unknown[]).includes(candidate.lineStyle)) return null;
  return {
    color: candidate.color as ChartDrawingColor,
    width: candidate.width,
    lineStyle: candidate.lineStyle as ChartDrawingLineStyle,
  };
}

/**
 * W5 §55/§104 — parse one untrusted record, discard anything that does not fit.
 *
 * Local storage is shared with every other script on the origin and survives
 * every deploy, so this is a boundary in the same sense an API payload is. There
 * is deliberately no repair path and no free-form text field anywhere in the
 * model (§137), which is what keeps a stored drawing from being an injection
 * surface: nothing here can ever be rendered as markup.
 */
export function parseChartDrawing(value: unknown): ChartDrawing | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;

  if (typeof candidate.id !== 'string' || candidate.id.length === 0 || candidate.id.length > 64) {
    return null;
  }
  if (!isChartDrawingType(candidate.type)) return null;
  if (!TRADABLE_SYMBOLS.includes(candidate.symbol as TradableSymbol)) return null;
  if (!Array.isArray(candidate.anchors)) return null;
  if (candidate.anchors.length !== DRAWING_ANCHOR_COUNT[candidate.type]) return null;

  const anchors: ChartDrawingAnchor[] = [];
  for (const raw of candidate.anchors) {
    const anchor = parseAnchor(raw);
    if (anchor === null) return null;
    anchors.push(anchor);
  }

  const style = parseStyle(candidate.style);
  if (style === null) return null;

  const createdAt = typeof candidate.createdAt === 'number' ? candidate.createdAt : NaN;
  const updatedAt = typeof candidate.updatedAt === 'number' ? candidate.updatedAt : NaN;
  if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) return null;

  return {
    id: candidate.id,
    type: candidate.type,
    symbol: candidate.symbol as TradableSymbol,
    anchors,
    style,
    createdAt,
    updatedAt,
  };
}

/**
 * W5 §109 — the price at each Fibonacci level, for display only.
 *
 * Level 0 sits on the *second* anchor and level 1 on the first, which is what
 * makes a retracement read correctly whichever direction it was drawn in
 * (§109's reverse-direction case): the trader drags from the start of the move
 * to its end, and 0 % is where the move ended.
 *
 * `number` arithmetic, and it never leaves the drawing overlay — these values
 * label a line, they do not price an order (§44).
 */
export function fibonacciLevelPrices(
  anchors: readonly ChartDrawingAnchor[],
): { level: number; price: number }[] {
  const [first, second] = anchors;
  if (!first || !second) return [];
  const from = Number(first.price);
  const to = Number(second.price);
  return FIBONACCI_LEVELS.map((level) => ({ level, price: to + (from - to) * level }));
}

/** `61.8`, `0`, `100` — the label a Fibonacci level carries (§130). */
export function fibonacciLevelLabel(level: number): string {
  const percent = level * 100;
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(1);
}

export function drawingTypeLabel(type: ChartDrawingType): string {
  switch (type) {
    case 'horizontal_line':
      return 'Ligne horizontale';
    case 'trend_line':
      return 'Ligne de tendance';
    case 'ray':
      return 'Demi-droite';
    case 'rectangle':
      return 'Rectangle';
    case 'fibonacci':
      return 'Fibonacci';
  }
}
