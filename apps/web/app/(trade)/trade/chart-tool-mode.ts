'use client';

import type { TradableSymbol } from '@wariba/contracts';
import {
  DEFAULT_DRAWING_STYLE,
  DRAWING_ANCHOR_COUNT,
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
export const CHART_TOOLS = [
  'select',
  'horizontal_line',
  'trend_line',
  'ray',
  'rectangle',
  'fibonacci',
] as const;
export type ChartTool = (typeof CHART_TOOLS)[number];

export function toolLabel(tool: ChartTool): string {
  switch (tool) {
    case 'select':
      return 'Sélection';
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
