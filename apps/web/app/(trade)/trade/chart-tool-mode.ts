'use client';

import type { TradableSymbol } from '@wariba/contracts';
import {
  CHART_DRAWING_TYPES,
  DEFAULT_DRAWING_STYLE,
  DRAWING_ANCHOR_COUNT,
  drawingTypeLabel,
  type ChartDrawing,
  type ChartDrawingAnchor,
  type ChartDrawingType,
} from './chart-drawing-model';

/**
 * The chart's tool mode — W5 §131, §49, §58, §78.
 *
 * Chart-local by design: the tool a trader is holding is not workstation state,
 * so it lives beside the chart and never enters a global context. Nothing
 * outside the chart column can observe or change it, which is what keeps a
 * drawing gesture from being visible to the dock, the navigator or the
 * Execution Center.
 */
export const CHART_TOOLS = ['select', ...CHART_DRAWING_TYPES] as const;
export type ChartTool = (typeof CHART_TOOLS)[number];

export const CHART_CURSOR_MODES = ['cross', 'dot', 'arrow', 'eraser'] as const;
export type ChartCursorMode = (typeof CHART_CURSOR_MODES)[number];

export function cursorModeLabel(mode: ChartCursorMode): string {
  switch (mode) {
    case 'cross':
      return 'Croix';
    case 'dot':
      return 'Point';
    case 'arrow':
      return 'Flèche';
    case 'eraser':
      return 'Gomme';
  }
}

export function toolLabel(tool: ChartTool): string {
  return tool === 'select' ? 'Sélection' : drawingTypeLabel(tool);
}

export function toolDrawingType(tool: ChartTool): ChartDrawingType | null {
  return tool === 'select' ? null : tool;
}

/**
 * A drawing being placed: the anchors committed so far, plus the pointer's
 * current position as a preview.
 *
 * Held separately from the drawing store on purpose (§49): a half-created
 * drawing is never persisted, so Escape, a symbol switch or a timeframe switch
 * can discard it and leave nothing behind (§78/§112).
 */
export interface DraftDrawing {
  type: ChartDrawingType;
  symbol: TradableSymbol;
  anchors: ChartDrawingAnchor[];
  preview: ChartDrawingAnchor | null;
}

export function beginDraft(type: ChartDrawingType, symbol: TradableSymbol): DraftDrawing {
  return { type, symbol, anchors: [], preview: null };
}

export type DraftAdvance =
  { status: 'pending'; draft: DraftDrawing } | { status: 'complete'; drawing: ChartDrawing };

/**
 * Adds one anchor, and completes the drawing when the tool has all it needs.
 *
 * Immutable: a new draft is returned rather than the argument being mutated, so
 * a stale render can never observe a half-applied anchor list.
 */
export function advanceDraft(
  draft: DraftDrawing,
  anchor: ChartDrawingAnchor,
  newId: () => string,
  now: () => number,
): DraftAdvance {
  const anchors = [...draft.anchors, anchor];
  if (anchors.length < DRAWING_ANCHOR_COUNT[draft.type]) {
    return { status: 'pending', draft: { ...draft, anchors, preview: null } };
  }
  const timestamp = now();
  return {
    status: 'complete',
    drawing: {
      id: newId(),
      type: draft.type,
      symbol: draft.symbol,
      anchors: anchors.slice(0, DRAWING_ANCHOR_COUNT[draft.type]),
      style: { ...DEFAULT_DRAWING_STYLE },
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
}

/** The anchors to draw for an in-progress draft, including the pointer preview. */
export function draftAnchors(draft: DraftDrawing): ChartDrawingAnchor[] {
  return draft.preview === null ? draft.anchors : [...draft.anchors, draft.preview];
}

/**
 * Moves one anchor of an existing drawing (§51).
 *
 * Returns a new record with a fresh `updatedAt`; the caller decides when that
 * record reaches storage, which is on drag end and never on pointer move
 * (§73/§125).
 */
export function moveAnchor(
  drawing: ChartDrawing,
  index: number,
  anchor: ChartDrawingAnchor,
  now: () => number,
): ChartDrawing {
  if (index < 0 || index >= drawing.anchors.length) return drawing;
  return {
    ...drawing,
    anchors: drawing.anchors.map((existing, position) => (position === index ? anchor : existing)),
    updatedAt: now(),
  };
}

/**
 * Moves a whole drawing vertically to a new price (§51's "drag horizontal line
 * vertically").
 *
 * Price-only: a horizontal line asserts a level, and letting it drift sideways
 * would change its stored time anchor for no visible reason.
 */
export function moveToPrice(drawing: ChartDrawing, price: string, now: () => number): ChartDrawing {
  return {
    ...drawing,
    anchors: drawing.anchors.map((anchor) => ({ ...anchor, price })),
    updatedAt: now(),
  };
}

/**
 * Moves a whole drawing to a new anchor, on the axes that drawing actually
 * asserts.
 *
 * This is the generalisation `moveToPrice` was the first case of, and the axis
 * mask is the reason it is not simply "set both": a horizontal line that drifted
 * sideways on a body drag would rewrite a time anchor for no visible reason,
 * and a vertical line that drifted vertically would do the same to a price. Each
 * one-anchor tool declares what it means, and the drag writes only that.
 */
export function moveToAnchor(
  drawing: ChartDrawing,
  anchor: ChartDrawingAnchor,
  now: () => number,
): ChartDrawing {
  const axes = BODY_DRAG_AXES[drawing.type];
  if (axes === null) return drawing;
  return {
    ...drawing,
    anchors: drawing.anchors.map((existing) => ({
      time: axes.time ? anchor.time : existing.time,
      price: axes.price ? anchor.price : existing.price,
    })),
    updatedAt: now(),
  };
}

/** Which axes a body drag may write, per tool. `null` — this tool has no body drag. */
const BODY_DRAG_AXES: Record<ChartDrawingType, { time: boolean; price: boolean } | null> = {
  horizontal_line: { time: false, price: true },
  horizontal_ray: { time: true, price: true },
  vertical_line: { time: true, price: false },
  cross_line: { time: true, price: true },
  trend_line: null,
  ray: null,
  extended_line: null,
  arrow: null,
  rectangle: null,
  ellipse: null,
  triangle: null,
  parallel_channel: null,
  fibonacci: null,
  price_range: null,
  date_range: null,
  date_price_range: null,
  info_line: null,
  trend_angle: null,
  flat_top_bottom: null,
  disjoint_channel: null,
  fib_extension: null,
  fib_channel: null,
  fib_circles: null,
  arrow_marker: null,
  arrow_mark_up: { time: true, price: true },
  arrow_mark_down: { time: true, price: true },
  arrow_mark_left: { time: true, price: true },
  arrow_mark_right: { time: true, price: true },
  rotated_rectangle: null,
  circle: null,
  arc: null,
  curve: null,
};
