/**
 * WariX's Workspace Layout Engine.
 *
 * The addendum's core idea is that resizing is not "drag handles on panels": it
 * is a layout *engine* with two distinct kinds of number.
 *
 * - **Preferred** dimensions are what the trader asked for. They are persisted,
 *   they belong to the browser, and nothing but a deliberate resize may change
 *   them.
 * - **Effective** dimensions are what actually fits right now. They are derived
 *   on every render from the preferred values and the viewport, and they are
 *   never written back to storage.
 *
 * Keeping those apart is the whole reason a trader can set a 360px Navigator on
 * a 27" monitor, dock the laptop at 1280 and find WariX quietly rendering it at
 * 278 to protect the chart — and then find their 360 again when they undock.
 * A design that stored the clamped value would have silently destroyed the
 * preference the first time the window got small.
 *
 * This module is pure. It reads no DOM, holds no state and performs no I/O, so
 * every rule below is unit-testable in isolation from React and from storage.
 */

/** Fixed tracks. These are not resizable and are stated here so the maths reads in one place. */
export const PRODUCT_RAIL_WIDTH = 56;
export const DRAWING_RAIL_WIDTH = 36;
export const TOP_INSTRUMENTATION_HEIGHT = 44;

export const NAVIGATOR_DEFAULT_WIDTH = 244;
export const NAVIGATOR_PREFERRED_MIN = 220;
export const NAVIGATOR_PREFERRED_MAX = 360;

export const EXECUTION_DEFAULT_WIDTH = 320;
export const EXECUTION_PREFERRED_MIN = 304;
export const EXECUTION_PREFERRED_MAX = 420;

export const DOCK_DEFAULT_POPULATED_HEIGHT = 220;
export const DOCK_POPULATED_MIN = 112;
export const DOCK_POPULATED_MAX = 560;
/** Header-only dock (W2 §22). */
export const DOCK_COLLAPSED_HEIGHT = 40;
/** WX1's authoritative empty presentation. */
export const DOCK_EMPTY_HEIGHT = 48;

/**
 * The narrowest chart WariX will render on a full desktop before it starts
 * taking width back from the side panes.
 *
 * Read off the rendered evidence rather than chosen for roundness: at 1024 with
 * both panes open the plot measured ~404px and the indicator legend wrapped
 * three lines across the candles, which is where the composition stops being a
 * chart-dominant workstation. 520 is the first width at which the legend, the
 * price scale and a readable run of candles coexist.
 */
export const MIN_FULL_DESKTOP_CHART_WIDTH = 520;

/**
 * The shortest centre workspace (chart module) the dock may leave behind.
 *
 * Same method: below roughly 420px the chart module's own header, toolbar and
 * footer consume enough of the column that the plot stops being the dominant
 * surface on the screen.
 */
export const MIN_CENTER_WORKSPACE_HEIGHT = 420;

/** The desktop grid's floor, and the last width of the hybrid band. */
export const DESKTOP_MINIMUM_WIDTH = 1024;
export const HYBRID_MAXIMUM_WIDTH = 1279;

/**
 * The hybrid band's Navigator is an overlay, so it does not compete with the
 * chart for width — but it must not cover the whole workspace either.
 */
export const HYBRID_NAVIGATOR_MAX = 360;
export const HYBRID_NAVIGATOR_CENTER_SHARE = 0.45;

export type WorkspaceMode = 'mobile' | 'hybrid' | 'full';

export function workspaceModeForWidth(width: number): WorkspaceMode {
  if (width < DESKTOP_MINIMUM_WIDTH) return 'mobile';
  if (width <= HYBRID_MAXIMUM_WIDTH) return 'hybrid';
  return 'full';
}

/** What the trader asked for. Persisted verbatim. */
export interface PreferredWorkspaceLayout {
  navigatorWidth: number;
  executionWidth: number;
  dockHeight: number;
}

export interface WorkspaceConditions {
  viewportWidth: number;
  viewportHeight: number;
  navigatorCollapsed: boolean;
  dockCollapsed: boolean;
  /** The active dock panel has no rows; WX1 renders it at a fixed 48px. */
  dockEmpty: boolean;
}

/** What actually fits right now. Derived every render, never persisted. */
export interface EffectiveWorkspaceLayout {
  mode: WorkspaceMode;
  navigatorWidth: number;
  executionWidth: number;
  dockHeight: number;
  /** The largest value each resizer may currently reach, given the other pane. */
  navigatorMax: number;
  executionMax: number;
  dockMax: number;
  /** Width the chart column actually receives. Reported for evidence. */
  chartWidth: number;
  /** True when the viewport forced any preferred value down. */
  clamped: boolean;
}

export function clampToRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (max < min) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export const DEFAULT_PREFERRED_LAYOUT: PreferredWorkspaceLayout = {
  navigatorWidth: NAVIGATOR_DEFAULT_WIDTH,
  executionWidth: EXECUTION_DEFAULT_WIDTH,
  dockHeight: DOCK_DEFAULT_POPULATED_HEIGHT,
};

/**
 * The dock's dynamic ceiling: whatever is left once the instrumentation bar and
 * a usable centre workspace have been served.
 */
export function effectiveDockMax(viewportHeight: number): number {
  const available = viewportHeight - TOP_INSTRUMENTATION_HEIGHT - MIN_CENTER_WORKSPACE_HEIGHT;
  return Math.max(DOCK_POPULATED_MIN, Math.min(DOCK_POPULATED_MAX, Math.round(available)));
}

/**
 * The hybrid overlay's ceiling. It floats over the chart rather than taking a
 * track, so the constraint is legibility of what it covers, not chart width.
 */
export function effectiveHybridNavigatorMax(viewportWidth: number): number {
  const available = viewportWidth - PRODUCT_RAIL_WIDTH - DRAWING_RAIL_WIDTH;
  return Math.max(
    NAVIGATOR_PREFERRED_MIN,
    Math.min(HYBRID_NAVIGATOR_MAX, Math.round(available * HYBRID_NAVIGATOR_CENTER_SHARE)),
  );
}

/**
 * The side-pane budget: everything the two panes may share once the fixed rails
 * and the chart's own minimum have been taken out.
 */
export function sidePaneBudget(viewportWidth: number): number {
  const availableCenterWidth = viewportWidth - PRODUCT_RAIL_WIDTH - DRAWING_RAIL_WIDTH;
  return availableCenterWidth - MIN_FULL_DESKTOP_CHART_WIDTH;
}

/**
 * Resolve preferred dimensions against the viewport.
 *
 * **Shrink-to-fit priority — Navigator first, then Execution.** Not arbitrary:
 * the chart's authority is non-negotiable, the Execution Center is the more
 * operationally critical of the two panes, and the Navigator already has a
 * collapse and a contextual presentation to fall back on. So when the budget is
 * short the surface with somewhere else to go gives way first.
 *
 * If both panes reach their minimum and the chart still cannot be served, the
 * caller is below the full-desktop band and belongs in the hybrid composition —
 * this function still returns the minima rather than negative widths, so a
 * mis-sized caller degrades to "cramped but coherent" rather than to a broken
 * grid.
 */
export function resolveWorkspaceLayout(
  preferred: PreferredWorkspaceLayout,
  conditions: WorkspaceConditions,
): EffectiveWorkspaceLayout {
  const mode = workspaceModeForWidth(conditions.viewportWidth);
  const dockMax = effectiveDockMax(conditions.viewportHeight);
  const dockHeight = conditions.dockCollapsed
    ? DOCK_COLLAPSED_HEIGHT
    : conditions.dockEmpty
      ? DOCK_EMPTY_HEIGHT
      : clampToRange(preferred.dockHeight, DOCK_POPULATED_MIN, dockMax);

  if (mode === 'mobile') {
    // Phones ignore desktop pane dimensions entirely — the column layout has no
    // side panes to size, and the stored preferences must survive untouched.
    return {
      mode,
      navigatorWidth: 0,
      executionWidth: 0,
      dockHeight,
      navigatorMax: NAVIGATOR_PREFERRED_MAX,
      executionMax: EXECUTION_PREFERRED_MAX,
      dockMax,
      chartWidth: conditions.viewportWidth,
      clamped: false,
    };
  }

  if (mode === 'hybrid') {
    const hybridMax = effectiveHybridNavigatorMax(conditions.viewportWidth);
    const navigatorWidth = clampToRange(
      preferred.navigatorWidth,
      NAVIGATOR_PREFERRED_MIN,
      hybridMax,
    );
    const executionWidth = clampToRange(
      preferred.executionWidth,
      EXECUTION_PREFERRED_MIN,
      EXECUTION_PREFERRED_MAX,
    );
    return {
      mode,
      navigatorWidth,
      executionWidth,
      dockHeight,
      navigatorMax: hybridMax,
      executionMax: EXECUTION_PREFERRED_MAX,
      dockMax,
      // The overlay floats, so the chart keeps the whole centre either way.
      chartWidth:
        conditions.viewportWidth - PRODUCT_RAIL_WIDTH - DRAWING_RAIL_WIDTH - executionWidth,
      clamped:
        navigatorWidth !== preferred.navigatorWidth || executionWidth !== preferred.executionWidth,
    };
  }

  const budget = sidePaneBudget(conditions.viewportWidth);
  let navigator = conditions.navigatorCollapsed
    ? 0
    : clampToRange(preferred.navigatorWidth, NAVIGATOR_PREFERRED_MIN, NAVIGATOR_PREFERRED_MAX);
  let execution = clampToRange(
    preferred.executionWidth,
    EXECUTION_PREFERRED_MIN,
    EXECUTION_PREFERRED_MAX,
  );

  let overflow = navigator + execution - budget;
  if (overflow > 0 && navigator > 0) {
    const give = Math.min(overflow, navigator - NAVIGATOR_PREFERRED_MIN);
    navigator -= give;
    overflow -= give;
  }
  if (overflow > 0) {
    const give = Math.min(overflow, execution - EXECUTION_PREFERRED_MIN);
    execution -= give;
    overflow -= give;
  }

  /*
   * Each resizer's ceiling is the budget minus whatever the *other* pane is
   * currently taking. That is what makes a drag feel governed rather than
   * arbitrary: widening the Navigator stops exactly where the Execution Center
   * plus the chart's minimum begin, instead of either pane independently
   * reaching a nominal maximum that together would crush the plot.
   */
  const navigatorMax = conditions.navigatorCollapsed
    ? NAVIGATOR_PREFERRED_MAX
    : clampToRange(budget - execution, NAVIGATOR_PREFERRED_MIN, NAVIGATOR_PREFERRED_MAX);
  const executionMax = clampToRange(
    budget - navigator,
    EXECUTION_PREFERRED_MIN,
    EXECUTION_PREFERRED_MAX,
  );

  return {
    mode,
    navigatorWidth: navigator,
    executionWidth: execution,
    dockHeight,
    navigatorMax,
    executionMax,
    dockMax,
    chartWidth:
      conditions.viewportWidth - PRODUCT_RAIL_WIDTH - DRAWING_RAIL_WIDTH - navigator - execution,
    clamped:
      (!conditions.navigatorCollapsed && navigator !== preferred.navigatorWidth) ||
      execution !== preferred.executionWidth ||
      (!conditions.dockCollapsed && !conditions.dockEmpty && dockHeight !== preferred.dockHeight),
  };
}
