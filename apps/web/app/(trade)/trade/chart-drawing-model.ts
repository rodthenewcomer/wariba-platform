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

/**
 * The tools WariX draws.
 *
 * The first five are W5's canonical set and their storage shape is unchanged —
 * an existing stored drawing parses byte-for-byte as it did before. The tools
 * after them are the reopen pass's additions (§10: *prefer a smaller real
 * professional tool library over a fake giant one*), and each was chosen because
 * it needs **no new storage concept**: every one is still one to four
 * `(time, price)` anchors, so the persistence, validation, hit-testing and
 * re-projection machinery all extend rather than fork.
 *
 * Appending only, never reordering: `parseChartDrawing` matches on the string,
 * so the order here is cosmetic, but keeping additions at the end makes a diff
 * against a trader's stored payload trivial to reason about.
 */
export const CHART_DRAWING_TYPES = [
  'horizontal_line',
  'trend_line',
  'ray',
  'rectangle',
  'fibonacci',
  'horizontal_ray',
  'vertical_line',
  'cross_line',
  'extended_line',
  'arrow',
  'ellipse',
  'triangle',
  'parallel_channel',
  'price_range',
  'date_range',
  'date_price_range',
  'info_line',
  'trend_angle',
  'flat_top_bottom',
  'disjoint_channel',
  'fib_extension',
  'fib_channel',
  'fib_circles',
  'arrow_marker',
  'arrow_mark_up',
  'arrow_mark_down',
  'arrow_mark_left',
  'arrow_mark_right',
  'rotated_rectangle',
  'circle',
  'arc',
  'curve',
] as const;
export type ChartDrawingType = (typeof CHART_DRAWING_TYPES)[number];

/** How many anchors each tool stores. A horizontal line keeps its click time for ordering only. */
export const DRAWING_ANCHOR_COUNT: Record<ChartDrawingType, number> = {
  horizontal_line: 1,
  trend_line: 2,
  ray: 2,
  rectangle: 2,
  fibonacci: 2,
  horizontal_ray: 1,
  vertical_line: 1,
  cross_line: 1,
  extended_line: 2,
  arrow: 2,
  ellipse: 2,
  triangle: 3,
  parallel_channel: 3,
  price_range: 2,
  date_range: 2,
  date_price_range: 2,
  info_line: 2,
  trend_angle: 2,
  flat_top_bottom: 3,
  disjoint_channel: 4,
  fib_extension: 3,
  fib_channel: 3,
  fib_circles: 2,
  arrow_marker: 2,
  arrow_mark_up: 1,
  arrow_mark_down: 1,
  arrow_mark_left: 1,
  arrow_mark_right: 1,
  rotated_rectangle: 3,
  circle: 2,
  arc: 3,
  curve: 4,
};

/** Tools whose whole point is the measurement they report between their anchors. */
export const MEASURER_TYPES: readonly ChartDrawingType[] = [
  'price_range',
  'date_range',
  'date_price_range',
];

/**
 * W5 §43 — the Fibonacci retracement levels. The distinct three-anchor
 * extension tool below owns the levels beyond the measured move.
 */
export const FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;

/** Projection levels used by the three-anchor extension tool. */
export const FIBONACCI_EXTENSION_LEVELS = [0, 0.618, 1, 1.272, 1.618] as const;

/**
 * W5 §56 — the per-symbol ceiling on stored drawings.
 *
 * Each drawing is a handful of SVG nodes with pointer handlers; a thousand of
 * them is a chart that cannot be panned. 100 is far past deliberate use and far
 * short of a browser problem, and it bounds what a corrupted or hostile storage
 * payload can force the chart to render on hydrate.
 */
export const MAX_DRAWINGS_PER_SYMBOL = 100;

/**
 * W5 §53/§127 — the drawing palette, chosen against the chart's *operational*
 * colours rather than for variety.
 *
 * Two exact collisions shipped in the first cut and had to go, because a
 * collision at the pixel level defeats the whole hierarchy §127 asks for:
 *
 * - the old default `#9AA3B1` **is** `--wariba-chart-crosshair`, so every
 *   drawing was painted in the crosshair's own colour and a reviewer could not
 *   tell a trend line from the pointer;
 * - `#6684FF` **is** `--wariba-chart-position`, so a drawing could be mistaken
 *   for an open position's line.
 *
 * What every entry now avoids: the crosshair grey, position blue `#6684FF`,
 * stop-loss red `#C94D4D`, take-profit green `#258A61`, bid blue `#3673C9`,
 * ask `#BE6945`, and the indicator whites and blues. Muted on purpose — §126
 * bars neon, and a drawing must still read as quieter than an open position.
 * Grey stays available as a deliberate choice, just never as the default.
 */
export const DRAWING_COLORS = ['#4FA3A5', '#E0A458', '#B48EAD', '#7FA4C4', '#9AA3B1'] as const;
export type ChartDrawingColor = (typeof DRAWING_COLORS)[number];

export const DRAWING_LINE_STYLES = ['solid', 'dashed'] as const;
export type ChartDrawingLineStyle = (typeof DRAWING_LINE_STYLES)[number];

export interface ChartDrawingStyle {
  color: ChartDrawingColor;
  width: 1 | 2;
  lineStyle: ChartDrawingLineStyle;
}

export const DEFAULT_DRAWING_STYLE: ChartDrawingStyle = {
  // Muted teal: unmistakably not the crosshair, unmistakably not an operational
  // level, and quiet enough that a trader's own analysis never competes with an
  // open position's line (§127).
  color: '#4FA3A5',
  // Width 2, not 1. The required hierarchy is
  //   position/SL/TP/pending > bid/ask > alerts > selected drawing > drawing >
  //   indicators > grid,
  // and a 1 px stroke put a trader's own analysis *below* the moving averages —
  // the hierarchy inverted. The operational overlays stay ahead of it on more
  // than stroke weight: they carry labelled HTML chips and badges, which no
  // drawing does.
  width: 2,
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

const DRAWING_TYPE_LABEL: Record<ChartDrawingType, string> = {
  horizontal_line: 'Ligne horizontale',
  trend_line: 'Ligne de tendance',
  ray: 'Demi-droite',
  rectangle: 'Rectangle',
  fibonacci: 'Fibonacci',
  horizontal_ray: 'Demi-droite horizontale',
  vertical_line: 'Ligne verticale',
  cross_line: 'Croix',
  extended_line: 'Droite étendue',
  arrow: 'Flèche',
  ellipse: 'Ellipse',
  triangle: 'Triangle',
  parallel_channel: 'Canal parallèle',
  price_range: 'Amplitude de prix',
  date_range: 'Amplitude de temps',
  date_price_range: 'Amplitude prix et temps',
  info_line: 'Ligne d’information',
  trend_angle: 'Angle de tendance',
  flat_top_bottom: 'Canal haut/bas plat',
  disjoint_channel: 'Canal disjoint',
  fib_extension: 'Extension de Fibonacci',
  fib_channel: 'Canal de Fibonacci',
  fib_circles: 'Cercles de Fibonacci',
  arrow_marker: 'Marqueur flèche',
  arrow_mark_up: 'Flèche vers le haut',
  arrow_mark_down: 'Flèche vers le bas',
  arrow_mark_left: 'Flèche vers la gauche',
  arrow_mark_right: 'Flèche vers la droite',
  rotated_rectangle: 'Rectangle pivoté',
  circle: 'Cercle',
  arc: 'Arc',
  curve: 'Courbe',
};

export function drawingTypeLabel(type: ChartDrawingType): string {
  return DRAWING_TYPE_LABEL[type];
}
