'use client';

import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import type { WorkstationIconSize } from '../workstation-icons';

/**
 * WARIBA's charting icon foundry.
 *
 * Every glyph in this family is drawn in-house on one 24-unit grid. That is a
 * deliberate break from the rest of `@wariba/ui`, which wraps a general-purpose
 * icon library: a charting workstation's tool rail is not general-purpose UI.
 * A trend line, a pitchfork and a Fibonacci retracement have *industry-standard
 * silhouettes* that traders read without labels, and substituting an app-style
 * approximation — a "trending up" arrow for a trend line, a bar-chart glyph for
 * Fibonacci — costs the one thing the rail is for. So the meaning, the
 * silhouette and the affordance are reproduced; the geometry is WARIBA's own.
 *
 * The grammar every glyph obeys, so seventy icons read as one set:
 *
 * - **24×24 box, ~3 units of padding.** Marks live inside 3…21.
 * - **Stroke, not fill.** `currentColor`, round caps and joins, so a glyph
 *   inherits its state colour from the button that holds it.
 * - **1.5 units at rest.** Structure lines carry the weight; anchor dots are
 *   drawn at 1.35 so a two-point tool reads as line-plus-handles rather than as
 *   three equal marks.
 * - **Anchors are hollow.** An open 1.6-radius circle is the drawing-tool
 *   convention for "you place this point", and it is what separates a trend
 *   line from a plain diagonal at 18px.
 *
 * `strokeWidth` is expressed in user units and scales with the box, so an
 * 18px rail glyph and a 22px mobile glyph have the same optical weight — a
 * fixed pixel stroke would make the small one look heavy.
 */

export interface ChartingIconProps {
  size?: WorkstationIconSize;
  /** Supplies an accessible name. Omitted, the glyph is decorative. */
  label?: string;
  className?: string;
}

const PIXELS: Record<WorkstationIconSize, number> = {
  toolbar: 16,
  rail: 20,
  nav: 20,
  mobile: 22,
};

/** Structure weight. */
export const STROKE = 1.4;
/** Anchor-dot and detail weight — deliberately lighter than structure. */
export const HAIR = 1.2;
/** The radius every placement anchor is drawn at. */
export const ANCHOR_R = 1.6;

export function createChartingIcon(draw: ReactNode) {
  return function ChartingIcon({ size = 'rail', label, className }: ChartingIconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={PIXELS[size]}
        height={PIXELS[size]}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cx('shrink-0', className)}
        role={label ? 'img' : 'presentation'}
        aria-hidden={label ? undefined : true}
        aria-label={label}
      >
        {draw}
      </svg>
    );
  };
}

/** A hollow placement anchor. */
export function Anchor({ cx: x, cy: y }: { cx: number; cy: number }) {
  return <circle cx={x} cy={y} r={ANCHOR_R} strokeWidth={HAIR} />;
}

/** A solid marker — used where the tool has one fixed origin rather than a handle. */
export function Dot({ cx: x, cy: y, r = 1.4 }: { cx: number; cy: number; r?: number }) {
  return <circle cx={x} cy={y} r={r} fill="currentColor" stroke="none" />;
}
