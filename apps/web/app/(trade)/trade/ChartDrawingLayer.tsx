'use client';

import { memo } from 'react';
import {
  DRAWING_HANDLE_RADIUS_PX,
  handlePoints,
  type ProjectedDrawing,
  type ProjectedPoint,
} from './chart-drawing-geometry';
import { fibonacciLevelLabel } from './chart-drawing-model';

/**
 * The drawing render layer — W5 §45/§50/§57/§127/§130.
 *
 * An SVG overlay over the lightweight-charts canvas, fed entirely by projected
 * geometry. It imports no chart library and holds no drawing state: it draws
 * what it is handed, which is what keeps the canonical model renderer-independent
 * (§42/§45).
 *
 * **It never captures a pointer.** `pointer-events: none` on the root and on
 * every child, without exception. Hit testing happens in
 * `chart-drawing-geometry.ts` against the same projected points, driven from the
 * chart container's own pointer handler — so an analytical drawing can never sit
 * invisibly on top of a stop-loss handle, a pending-order line or an alert and
 * swallow the gesture that was meant for it (§57/§110). A rectangle's interior
 * is a fill with no events; the drawing is selected by its edges.
 *
 * **Visual hierarchy** (§127). Drawings are quieter than every operational
 * overlay: thin strokes, muted default colour, low-opacity fills. A selected
 * drawing gets handles and a slightly brighter stroke, and that highlight is the
 * loudest a drawing ever becomes — an open position's line still reads first.
 */

export interface ChartDrawingLayerProps {
  projected: readonly ProjectedDrawing[];
  selectedId: string | null;
  /** The in-progress drawing, if any — same geometry, dashed, no handles (§49). */
  draft: ProjectedDrawing | null;
  width: number;
  height: number;
}

function dashFor(style: 'solid' | 'dashed'): string | undefined {
  return style === 'dashed' ? '4 4' : undefined;
}

function Shape({ projected, selected }: { projected: ProjectedDrawing; selected: boolean }) {
  const { drawing, points } = projected;
  const [a, b] = points;
  if (!a) return null;

  const stroke = drawing.style.color;
  const strokeWidth = selected ? drawing.style.width + 1 : drawing.style.width;
  const dash = dashFor(drawing.style.lineStyle);
  const opacity = selected ? 1 : 0.85;

  if (drawing.type === 'horizontal_line' && b) {
    return (
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        opacity={opacity}
      />
    );
  }

  if (!b) return null;

  if (drawing.type === 'ray') {
    const end = projected.rayEnd ?? b;
    return (
      <line
        x1={a.x}
        y1={a.y}
        x2={end.x}
        y2={end.y}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        opacity={opacity}
      />
    );
  }

  if (drawing.type === 'rectangle') {
    return (
      <rect
        x={Math.min(a.x, b.x)}
        y={Math.min(a.y, b.y)}
        width={Math.abs(b.x - a.x)}
        height={Math.abs(b.y - a.y)}
        fill={stroke}
        fillOpacity={0.08}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        opacity={opacity}
      />
    );
  }

  if (drawing.type === 'fibonacci') {
    const left = Math.min(a.x, b.x);
    const right = Math.max(a.x, b.x);
    return (
      <g opacity={opacity}>
        {/* §130 — readable but subtle: hairlines and a label, never saturated
            bands filling the plot. */}
        {(projected.levels ?? []).map((level) => (
          <g key={level.level}>
            <line
              x1={left}
              y1={level.y}
              x2={right}
              y2={level.y}
              stroke={stroke}
              strokeWidth={selected ? 1.5 : 1}
              strokeDasharray={level.level === 0 || level.level === 1 ? undefined : '3 3'}
              opacity={0.75}
            />
            <text x={left + 4} y={level.y - 3} fill={stroke} fontSize={10} opacity={0.9}>
              {fibonacciLevelLabel(level.label)}
            </text>
          </g>
        ))}
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={stroke}
          strokeWidth={1}
          strokeDasharray="2 4"
          opacity={0.45}
        />
      </g>
    );
  }

  return (
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={dash}
      opacity={opacity}
    />
  );
}

function Handles({ points, color }: { points: readonly ProjectedPoint[]; color: string }) {
  return (
    <>
      {points.map((point, index) => (
        <circle
          key={`${point.x}:${point.y}:${index}`}
          cx={point.x}
          cy={point.y}
          r={DRAWING_HANDLE_RADIUS_PX}
          fill="var(--wariba-chart-background, #0B0D12)"
          stroke={color}
          strokeWidth={2}
        />
      ))}
    </>
  );
}

export const ChartDrawingLayer = memo(function ChartDrawingLayer({
  projected,
  selectedId,
  draft,
  width,
  height,
}: ChartDrawingLayerProps) {
  if (width <= 0 || height <= 0) return null;
  return (
    <svg
      data-testid="chart-drawing-layer"
      aria-hidden="true"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="pointer-events-none absolute inset-0"
    >
      {projected.map((entry) => (
        <g key={entry.id} data-drawing-id={entry.id} data-drawing-type={entry.drawing.type}>
          <Shape projected={entry} selected={entry.id === selectedId} />
          {entry.id === selectedId && (
            <Handles points={handlePoints(entry)} color={entry.drawing.style.color} />
          )}
        </g>
      ))}
      {draft && (
        <g data-testid="chart-drawing-draft" opacity={0.7}>
          <Shape projected={draft} selected={false} />
        </g>
      )}
    </svg>
  );
});
