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
  // 0.95, not 0.85: over a dense candle chart the extra 10 % is the difference
  // between a reviewer seeing the geometry and not. Still short of the 1.0 the
  // selected state uses, so selection remains visible as a change.
  const opacity = selected ? 1 : 0.95;

  if (
    drawing.type === 'arrow_mark_up' ||
    drawing.type === 'arrow_mark_down' ||
    drawing.type === 'arrow_mark_left' ||
    drawing.type === 'arrow_mark_right'
  ) {
    const rotation =
      drawing.type === 'arrow_mark_up'
        ? 0
        : drawing.type === 'arrow_mark_right'
          ? 90
          : drawing.type === 'arrow_mark_down'
            ? 180
            : -90;
    return (
      <g transform={`translate(${a.x} ${a.y}) rotate(${rotation})`} opacity={opacity}>
        <path
          d="M0 -12L8 -3H4V11H-4V-3H-8Z"
          fill={stroke}
          fillOpacity={0.18}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      </g>
    );
  }

  if ((drawing.type === 'horizontal_line' || drawing.type === 'horizontal_ray') && b) {
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

  if ((drawing.type === 'vertical_line' || drawing.type === 'cross_line') && b) {
    const horizontal = projected.parallel;
    return (
      <g opacity={opacity}>
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={dash}
        />
        {horizontal && (
          <line
            x1={horizontal[0].x}
            y1={horizontal[0].y}
            x2={horizontal[1].x}
            y2={horizontal[1].y}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={dash}
          />
        )}
      </g>
    );
  }

  if (!b) return null;

  if (drawing.type === 'extended_line') {
    const [start, end] = projected.extendedEnds ?? [a, b];
    return (
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        opacity={opacity}
      />
    );
  }

  /*
   * An arrow is a trend line plus a head, and the head is drawn in *screen*
   * space from the segment's own direction rather than as a fixed marker: an
   * SVG `marker` scales with `strokeWidth`, so a 3px arrow would have grown a
   * head three times the size of a 1px one for no reason a trader asked for.
   */
  if (drawing.type === 'arrow' || drawing.type === 'arrow_marker') {
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const size = 9 + strokeWidth * 1.5;
    const spread = 0.42;
    const wing = (offset: number) => ({
      x: b.x - size * Math.cos(angle - offset),
      y: b.y - size * Math.sin(angle - offset),
    });
    const left = wing(spread);
    const right = wing(-spread);
    return (
      <g opacity={opacity}>
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={dash}
        />
        {drawing.type === 'arrow' ? (
          <polygon
            points={`${b.x},${b.y} ${left.x},${left.y} ${right.x},${right.y}`}
            fill={stroke}
          />
        ) : (
          <polyline
            points={`${left.x},${left.y} ${b.x},${b.y} ${right.x},${right.y}`}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        )}
      </g>
    );
  }

  if (drawing.type === 'info_line' || drawing.type === 'trend_angle') {
    const label =
      drawing.type === 'trend_angle'
        ? `${projected.angleDegrees?.toFixed(1) ?? '—'}°`
        : projected.measure
          ? `${projected.measure.price} · ${projected.measure.percent} · ${projected.measure.duration}`
          : '—';
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const plateWidth = Math.max(48, label.length * 6 + 14);
    return (
      <g opacity={opacity}>
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={dash}
        />
        <rect
          x={midX - plateWidth / 2}
          y={midY - 24}
          width={plateWidth}
          height={18}
          rx={4}
          fill="var(--wariba-component-workstation-surface-popover, #151A25)"
          stroke={stroke}
          strokeWidth={1}
        />
        <text
          x={midX}
          y={midY - 11}
          textAnchor="middle"
          fill={stroke}
          fontSize={10}
          fontFamily="var(--wariba-font-mono, monospace)"
        >
          {label}
        </text>
      </g>
    );
  }

  if (drawing.type === 'ellipse') {
    return (
      <ellipse
        cx={(a.x + b.x) / 2}
        cy={(a.y + b.y) / 2}
        rx={Math.abs(b.x - a.x) / 2}
        ry={Math.abs(b.y - a.y) / 2}
        fill={stroke}
        fillOpacity={0.1}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        opacity={opacity}
      />
    );
  }

  if (drawing.type === 'circle') {
    const radius = Math.hypot(b.x - a.x, b.y - a.y);
    return (
      <circle
        cx={a.x}
        cy={a.y}
        r={radius}
        fill={stroke}
        fillOpacity={0.08}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        opacity={opacity}
      />
    );
  }

  if (drawing.type === 'triangle') {
    const c = points[2];
    if (!c) return null;
    return (
      <polygon
        points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}`}
        fill={stroke}
        fillOpacity={0.1}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        opacity={opacity}
      />
    );
  }

  if (
    drawing.type === 'parallel_channel' ||
    drawing.type === 'flat_top_bottom' ||
    drawing.type === 'disjoint_channel'
  ) {
    const parallel = projected.parallel;
    if (!parallel) return null;
    const [pa, pb] = parallel;
    return (
      <g opacity={opacity}>
        {/* The band between the rails carries the channel's meaning, so it is
            tinted — at the same restraint a rectangle uses, never a saturated
            fill over the candles. */}
        <polygon
          points={`${a.x},${a.y} ${b.x},${b.y} ${pb.x},${pb.y} ${pa.x},${pa.y}`}
          fill={stroke}
          fillOpacity={0.08}
        />
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={strokeWidth} />
        <line
          x1={pa.x}
          y1={pa.y}
          x2={pb.x}
          y2={pb.y}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={dash}
        />
      </g>
    );
  }

  if (drawing.type === 'fib_channel') {
    const levels = projected.channelLevels ?? [];
    if (levels.length === 0) return null;
    return (
      <g opacity={opacity}>
        {levels.map((level) => (
          <g key={level.level}>
            <line
              x1={level.start.x}
              y1={level.start.y}
              x2={level.end.x}
              y2={level.end.y}
              stroke={stroke}
              strokeWidth={level.level === 0 || level.level === 1 ? strokeWidth : 1}
              strokeDasharray={level.level === 0 || level.level === 1 ? dash : '3 3'}
            />
            <text x={level.start.x + 4} y={level.start.y - 3} fill={stroke} fontSize={10}>
              {fibonacciLevelLabel(level.level)}
            </text>
          </g>
        ))}
      </g>
    );
  }

  if (
    drawing.type === 'price_range' ||
    drawing.type === 'date_range' ||
    drawing.type === 'date_price_range'
  ) {
    return (
      <MeasurerShape
        projected={projected}
        a={a}
        b={b}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />
    );
  }

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
        // Enough tint to read as a region, far short of the saturated bands
        // §130 bars.
        fillOpacity={0.12}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        opacity={opacity}
      />
    );
  }

  if (drawing.type === 'rotated_rectangle' && projected.rotatedCorners) {
    return (
      <polygon
        points={projected.rotatedCorners.map((point) => `${point.x},${point.y}`).join(' ')}
        fill={stroke}
        fillOpacity={0.1}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        opacity={opacity}
      />
    );
  }

  if (drawing.type === 'fibonacci' || drawing.type === 'fib_extension') {
    const c = points[2];
    const left =
      drawing.type === 'fib_extension' ? (c?.x ?? Math.min(a.x, b.x)) : Math.min(a.x, b.x);
    const right =
      drawing.type === 'fib_extension'
        ? (projected.extensionEndX ?? Math.max(a.x, b.x))
        : Math.max(a.x, b.x);
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
              strokeWidth={selected ? 1.75 : 1.25}
              strokeDasharray={level.level === 0 || level.level === 1 ? undefined : '3 3'}
              opacity={0.9}
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

  if (drawing.type === 'fib_circles') {
    return (
      <g opacity={opacity}>
        {(projected.circleRadii ?? []).map(({ level, radius }) => (
          <g key={level}>
            <circle
              cx={a.x}
              cy={a.y}
              r={radius}
              fill="none"
              stroke={stroke}
              strokeWidth={level === 1 ? strokeWidth : 1}
              strokeDasharray={level === 1 ? dash : '3 3'}
            />
            <text x={a.x + radius + 3} y={a.y - 3} fill={stroke} fontSize={10}>
              {fibonacciLevelLabel(level)}
            </text>
          </g>
        ))}
      </g>
    );
  }

  if (drawing.type === 'arc') {
    const control = points[2];
    if (!control) return null;
    return (
      <path
        d={`M ${a.x} ${a.y} Q ${control.x} ${control.y} ${b.x} ${b.y}`}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        opacity={opacity}
      />
    );
  }

  if (drawing.type === 'curve') {
    const secondControl = points[2];
    const end = points[3];
    if (!secondControl || !end) return null;
    return (
      <path
        d={`M ${a.x} ${a.y} C ${b.x} ${b.y} ${secondControl.x} ${secondControl.y} ${end.x} ${end.y}`}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        opacity={opacity}
      />
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

/**
 * The measurer tools.
 *
 * All three are one shape with different arrows: a tinted region between the
 * anchors, the axis arrows the measurement runs along, and a plate stating what
 * it found. The plate is drawn rather than left as bare `<text>` because these
 * labels land on top of candles by definition — the trader put them there — and
 * unbacked 10px text over a candle body is unreadable.
 *
 * What it reports is arithmetic on the trader's own two clicks. Nothing here is
 * a market statistic.
 */
function MeasurerShape({
  projected,
  a,
  b,
  stroke,
  strokeWidth,
  opacity,
}: {
  projected: ProjectedDrawing;
  a: ProjectedPoint;
  b: ProjectedPoint;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}) {
  const type = projected.drawing.type;
  const measure = projected.measure;
  const left = Math.min(a.x, b.x);
  const right = Math.max(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const bottom = Math.max(a.y, b.y);
  const midX = (left + right) / 2;
  const midY = (top + bottom) / 2;

  const showPrice = type === 'price_range' || type === 'date_price_range';
  const showDate = type === 'date_range' || type === 'date_price_range';

  const parts: string[] = [];
  if (measure) {
    if (showPrice) parts.push(measure.price, measure.percent);
    if (showDate) parts.push(measure.duration);
  }
  const text = parts.join('   ');
  // 10px in the workstation's mono stack sits very close to 0.6em per glyph.
  const plateWidth = text.length * 6 + 12;
  const plateX = Math.min(Math.max(midX - plateWidth / 2, left), right);
  const plateY = showPrice ? midY - 9 : top - 22;

  const arrow = (x: number, y: number, angle: number) => {
    const size = 6;
    const spread = 0.5;
    const p1 = { x: x - size * Math.cos(angle - spread), y: y - size * Math.sin(angle - spread) };
    const p2 = { x: x - size * Math.cos(angle + spread), y: y - size * Math.sin(angle + spread) };
    return <polygon points={`${x},${y} ${p1.x},${p1.y} ${p2.x},${p2.y}`} fill={stroke} />;
  };

  return (
    <g opacity={opacity}>
      <rect
        x={left}
        y={top}
        width={right - left}
        height={bottom - top}
        fill={stroke}
        fillOpacity={0.1}
        stroke={stroke}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      {showPrice && (
        <g>
          <line
            x1={midX}
            y1={top}
            x2={midX}
            y2={bottom}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          {arrow(midX, top, -Math.PI / 2)}
          {arrow(midX, bottom, Math.PI / 2)}
        </g>
      )}
      {showDate && (
        <g>
          <line
            x1={left}
            y1={bottom}
            x2={right}
            y2={bottom}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          {arrow(left, bottom, Math.PI)}
          {arrow(right, bottom, 0)}
        </g>
      )}
      {text.length > 0 && (
        <g>
          <rect
            x={plateX}
            y={plateY}
            width={plateWidth}
            height={18}
            rx={4}
            fill="var(--wariba-component-workstation-surface-popover, #151A25)"
            stroke={stroke}
            strokeWidth={1}
            opacity={0.95}
          />
          <text
            x={plateX + 6}
            y={plateY + 13}
            fill={stroke}
            fontSize={10}
            fontFamily="var(--wariba-font-mono, monospace)"
          >
            {text}
          </text>
        </g>
      )}
    </g>
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
