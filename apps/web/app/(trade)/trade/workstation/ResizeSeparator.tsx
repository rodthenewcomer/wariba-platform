'use client';

import { useCallback, useEffect, useRef } from 'react';

export interface ResizeSeparatorProps {
  orientation: 'vertical' | 'horizontal';
  label: string;
  /** The pane's current *effective* size — what is on screen right now. */
  value: number;
  min: number;
  /** The dynamic ceiling for this pane, already resolved against the other pane. */
  max: number;
  /** Commits the trader's new *preferred* size. Called once, on release. */
  onCommit: (value: number) => void;
  /** Restores this pane's canonical default. Bound to double-click. */
  onReset?: () => void;
  /**
   * Maps a pointer delta (px) to a value delta. The navigator grows as the
   * pointer moves right (+1); the dock grows as the pointer moves *up* (-1).
   */
  direction: 1 | -1;
  /**
   * The custom property this separator drives while dragging, e.g.
   * `--warix-navigator-width`. Written on the workspace root so CSS grid
   * relayouts without React participating.
   */
  cssVariable: string;
  step?: number;
  testId?: string;
}

const DEFAULT_STEP = 8;
const COARSE_STEP_MULTIPLIER = 3;
/** The element the custom properties are written on. */
const WORKSPACE_ROOT_SELECTOR = '[data-workspace-root]';

/**
 * A draggable, keyboard-operable panel edge — the Workspace Layout Engine's
 * only interactive surface.
 *
 * **Dragging renders nothing.** The naive implementation lifts every pointer
 * move into React state, which re-renders the shell, the panel, and everything
 * the panel owns, sixty times a second, with the chart's `ResizeObserver` on the
 * far end of each one. Instead a move writes one CSS custom property on the
 * workspace root inside a `requestAnimationFrame`; the grid relayouts, the
 * chart's observer sees a size change, and React is not involved at all. Only
 * the release commits a value — one state update and one storage write per
 * resize, rather than per pixel.
 *
 * The variable is also what makes the drag feel immediate: the seam is not
 * waiting on a React commit to know where it is.
 *
 * Accessibility is the platform's `separator` pattern: the element carries its
 * orientation and its min/now/max, so a screen-reader user is told what they are
 * moving and how far it can go. Arrows move it in 8px steps, Shift+Arrow in 24,
 * Home and End jump to the minimum and to the *dynamic* maximum — the one that
 * already accounts for the other pane — and a double-click restores the
 * canonical default. Resizing is never mouse-only.
 *
 * Two details that are easy to get wrong and matter here:
 *
 * - **Pointer capture, not global listeners.** The drag is bound to the
 *   separator element via `setPointerCapture`, so it cannot leak a `pointermove`
 *   handler onto the document, cannot survive unmount, and cannot keep firing
 *   after the pointer leaves the window. It also means the chart never receives
 *   the drag, so resizing a pane can never start a drawing.
 * - **No text selection while dragging.** `touch-action: none` plus
 *   `preventDefault` on pointerdown stops the drag from selecting the
 *   surrounding panel text, which otherwise makes the whole workstation look
 *   like it is being highlighted.
 */
export function ResizeSeparator({
  orientation,
  label,
  value,
  min,
  max,
  onCommit,
  onReset,
  direction,
  cssVariable,
  step = DEFAULT_STEP,
  testId,
}: ResizeSeparatorProps) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ origin: number; startValue: number; latest: number } | null>(null);
  const frameRef = useRef<number | null>(null);

  const clamp = useCallback(
    (next: number) => Math.min(max, Math.max(min, Math.round(next))),
    [min, max],
  );

  /** The grid owner. Resolved from the DOM so no ref has to be threaded through the shell. */
  const workspaceRoot = useCallback(
    (): HTMLElement | null =>
      nodeRef.current?.closest<HTMLElement>(WORKSPACE_ROOT_SELECTOR) ?? null,
    [],
  );

  const paint = useCallback(
    (next: number) => {
      workspaceRoot()?.style.setProperty(cssVariable, `${next}px`);
    },
    [cssVariable, workspaceRoot],
  );

  /**
   * Hands layout authority back to React.
   *
   * The property must be cleared in the same commit that applies the new
   * preferred value, or the stale inline pixel value would win over the freshly
   * derived effective one and the pane would appear to ignore a viewport clamp.
   */
  const releaseVariable = useCallback(() => {
    workspaceRoot()?.style.removeProperty(cssVariable);
  }, [cssVariable, workspaceRoot]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      // A separator that unmounts mid-drag (a breakpoint change, say) must not
      // leave the workspace pinned to a pixel value nothing owns any more.
      releaseVariable();
    },
    [releaseVariable],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      origin: orientation === 'vertical' ? event.clientX : event.clientY,
      startValue: value,
      latest: value,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const current = orientation === 'vertical' ? event.clientX : event.clientY;
    const next = clamp(drag.startValue + (current - drag.origin) * direction);
    drag.latest = next;
    // One paint per frame: a pointer emits far more events than the workstation
    // needs to relayout, and the chart's ResizeObserver is on the other end.
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      paint(drag.latest);
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    releaseVariable();
    if (drag.latest !== drag.startValue) onCommit(drag.latest);
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
    onCommit(clamp(next));
  };

  /*
   * A 1px seam with a ~9px hit zone, per the addendum: the visible line stays a
   * hairline in the workstation's own border tone, and the target that catches
   * the pointer is the invisible padding around it. A chunky permanent handle
   * would be easier to build and would read as a prototype.
   */
  const isVertical = orientation === 'vertical';
  return (
    <div
      ref={nodeRef}
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
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      className={[
        'group relative z-10 shrink-0 touch-none',
        isVertical ? 'w-[9px] cursor-col-resize' : 'h-[9px] cursor-row-resize',
        // The hit zone is transparent; only the inner hairline is drawn.
        'before:absolute before:bg-[color:var(--wariba-component-workstation-border-hairline)]',
        'before:transition-colors before:duration-[var(--wariba-component-workstation-motion-interaction)]',
        isVertical
          ? 'before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2'
          : 'before:inset-x-0 before:top-1/2 before:h-px before:-translate-y-1/2',
        'hover:before:bg-[color:var(--wariba-component-workstation-interaction-selected)]',
        'focus-visible:outline-none focus-visible:before:bg-[color:var(--wariba-component-workstation-interaction-selected)]',
        isVertical ? 'focus-visible:before:w-[3px]' : 'focus-visible:before:h-[3px]',
      ].join(' ')}
    />
  );
}
