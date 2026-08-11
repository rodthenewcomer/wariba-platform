'use client';

import { useCallback, useEffect, useRef } from 'react';

export interface ResizeSeparatorProps {
  orientation: 'vertical' | 'horizontal';
  label: string;
  value: number;
  min: number;
  max: number;
  /** Called with the next clamped value. */
  onChange: (value: number) => void;
  /**
   * Maps a pointer delta (px) to a value delta. The navigator grows as the
   * pointer moves right (+1); the dock grows as the pointer moves *up* (-1).
   */
  direction: 1 | -1;
  step?: number;
  testId?: string;
}

const DEFAULT_STEP = 16;
const COARSE_STEP_MULTIPLIER = 4;

/**
 * A draggable, keyboard-operable panel edge (W2 §13/§23).
 *
 * Accessibility is the platform's `separator` pattern: the element carries its
 * orientation and its min/now/max, so a screen-reader user is told what they
 * are moving and how far it can go, and Arrow keys move it without a pointer.
 *
 * Two details that are easy to get wrong and matter here:
 *
 * - **Pointer capture, not global listeners.** The drag is bound to the
 *   separator element via `setPointerCapture`, so it cannot leak a `mousemove`
 *   handler onto the document, cannot survive unmount, and cannot keep firing
 *   after the pointer leaves the window. `pointerup`/`pointercancel` both end it.
 * - **No text selection while dragging.** `touch-action: none` plus
 *   `preventDefault` on pointerdown stops the drag from selecting the
 *   surrounding panel text, which otherwise makes the whole workstation look
 *   like it is being highlighted.
 *
 * The component reports values only; the caller owns clamping policy and
 * persistence, so resizing never writes anything but a layout number.
 */
export function ResizeSeparator({
  orientation,
  label,
  value,
  min,
  max,
  onChange,
  direction,
  step = DEFAULT_STEP,
  testId,
}: ResizeSeparatorProps) {
  const dragRef = useRef<{ origin: number; startValue: number } | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const clamp = useCallback(
    (next: number) => Math.min(max, Math.max(min, Math.round(next))),
    [min, max],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      origin: orientation === 'vertical' ? event.clientX : event.clientY,
      startValue: value,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const current = orientation === 'vertical' ? event.clientX : event.clientY;
    const delta = (current - drag.origin) * direction;
    // One update per frame: a pointer can emit far more events than the
    // workstation needs to relayout, and the chart's ResizeObserver is on the
    // other end of every one of them.
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      onChange(clamp(drag.startValue + delta));
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const decreaseKey = orientation === 'vertical' ? 'ArrowLeft' : 'ArrowDown';
    const increaseKey = orientation === 'vertical' ? 'ArrowRight' : 'ArrowUp';
    let next: number | null = null;
    const magnitude = event.shiftKey ? step * COARSE_STEP_MULTIPLIER : step;
    if (event.key === decreaseKey) next = value - magnitude;
    if (event.key === increaseKey) next = value + magnitude;
    if (event.key === 'Home') next = min;
    if (event.key === 'End') next = max;
    if (next === null) return;
    event.preventDefault();
    onChange(clamp(next));
  };

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
      data-testid={testId}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
      className={
        orientation === 'vertical'
          ? 'group relative z-[var(--wariba-z-base)] w-1 shrink-0 cursor-col-resize touch-none bg-[color:var(--wariba-component-workstation-seam)] hover:bg-[color:var(--wariba-theme-action)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-border-focus)]'
          : 'group relative z-[var(--wariba-z-base)] h-1 shrink-0 cursor-row-resize touch-none bg-[color:var(--wariba-component-workstation-seam)] hover:bg-[color:var(--wariba-theme-action)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-border-focus)]'
      }
    />
  );
}
