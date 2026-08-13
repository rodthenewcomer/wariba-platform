import { describe, expect, it } from 'vitest';
import {
  DOCK_DEFAULT_POPULATED_HEIGHT,
  DOCK_EMPTY_HEIGHT,
  DOCK_POPULATED_MIN,
  EXECUTION_DEFAULT_WIDTH,
  EXECUTION_PREFERRED_MAX,
  EXECUTION_PREFERRED_MIN,
  MIN_CENTER_WORKSPACE_HEIGHT,
  MIN_FULL_DESKTOP_CHART_WIDTH,
  NAVIGATOR_DEFAULT_WIDTH,
  NAVIGATOR_PREFERRED_MAX,
  NAVIGATOR_PREFERRED_MIN,
  TOP_INSTRUMENTATION_HEIGHT,
  effectiveDockMax,
  resolveWorkspaceLayout,
  sidePaneBudget,
  workspaceModeForWidth,
  type PreferredWorkspaceLayout,
} from '../app/(trade)/trade/workstation/workspace-layout';

/**
 * The Workspace Layout Engine.
 *
 * These assertions are about the *rules*, not about pixels on a screen: the
 * engine is pure, so the chart-protection constraint, the shrink-to-fit
 * priority and the preferred-vs-effective separation can each be stated and
 * checked without React, storage or a browser.
 */

const DEFAULTS: PreferredWorkspaceLayout = {
  navigatorWidth: NAVIGATOR_DEFAULT_WIDTH,
  executionWidth: EXECUTION_DEFAULT_WIDTH,
  dockHeight: DOCK_DEFAULT_POPULATED_HEIGHT,
};

function at(
  viewportWidth: number,
  preferred: Partial<PreferredWorkspaceLayout> = {},
  conditions: Partial<{
    viewportHeight: number;
    navigatorCollapsed: boolean;
    dockCollapsed: boolean;
    dockEmpty: boolean;
  }> = {},
) {
  return resolveWorkspaceLayout(
    { ...DEFAULTS, ...preferred },
    {
      viewportWidth,
      viewportHeight: conditions.viewportHeight ?? 900,
      navigatorCollapsed: conditions.navigatorCollapsed ?? false,
      dockCollapsed: conditions.dockCollapsed ?? false,
      dockEmpty: conditions.dockEmpty ?? false,
    },
  );
}

describe('workspace mode', () => {
  it('splits mobile, hybrid and full desktop at the accepted boundaries', () => {
    expect(workspaceModeForWidth(390)).toBe('mobile');
    expect(workspaceModeForWidth(1023)).toBe('mobile');
    expect(workspaceModeForWidth(1024)).toBe('hybrid');
    expect(workspaceModeForWidth(1279)).toBe('hybrid');
    expect(workspaceModeForWidth(1280)).toBe('full');
  });
});

describe('defaults', () => {
  it('renders the canonical widths untouched when they comfortably fit', () => {
    const layout = at(1920);
    expect(layout.navigatorWidth).toBe(NAVIGATOR_DEFAULT_WIDTH);
    expect(layout.executionWidth).toBe(EXECUTION_DEFAULT_WIDTH);
    expect(layout.dockHeight).toBe(DOCK_DEFAULT_POPULATED_HEIGHT);
    expect(layout.clamped).toBe(false);
  });
});

describe('dynamic chart protection', () => {
  it('never lets the two panes leave the chart below its minimum', () => {
    // Both panes asking for their nominal maximum is exactly the case the
    // addendum calls out: independently legal, jointly ruinous.
    for (const width of [1280, 1366, 1440, 1536, 1920, 2560]) {
      const layout = at(width, {
        navigatorWidth: NAVIGATOR_PREFERRED_MAX,
        executionWidth: EXECUTION_PREFERRED_MAX,
      });
      expect(layout.chartWidth).toBeGreaterThanOrEqual(MIN_FULL_DESKTOP_CHART_WIDTH);
    }
  });

  it('caps each resizer against the other pane, not against its nominal maximum', () => {
    const layout = at(1366, { executionWidth: EXECUTION_PREFERRED_MAX });
    expect(layout.navigatorMax).toBe(sidePaneBudget(1366) - layout.executionWidth);
    // And the cap is genuinely tighter than the nominal one at this width.
    expect(layout.navigatorMax).toBeLessThan(NAVIGATOR_PREFERRED_MAX);
  });

  it('gives the whole budget to Execution when the Navigator is collapsed', () => {
    const layout = at(
      1366,
      { executionWidth: EXECUTION_PREFERRED_MAX },
      { navigatorCollapsed: true },
    );
    expect(layout.navigatorWidth).toBe(0);
    expect(layout.executionWidth).toBe(EXECUTION_PREFERRED_MAX);
    expect(layout.chartWidth).toBeGreaterThanOrEqual(MIN_FULL_DESKTOP_CHART_WIDTH);
  });
});

describe('shrink-to-fit priority', () => {
  it('takes width from the Navigator before it touches Execution', () => {
    // 1280 is the tightest full-desktop width, so both preferences cannot hold.
    const layout = at(1280, {
      navigatorWidth: NAVIGATOR_PREFERRED_MAX,
      executionWidth: EXECUTION_PREFERRED_MAX,
    });
    expect(layout.navigatorWidth).toBeLessThan(NAVIGATOR_PREFERRED_MAX);
    // Execution is the more operationally critical pane and gives way second.
    expect(layout.executionWidth).toBe(EXECUTION_PREFERRED_MAX);
  });

  it('only then shrinks Execution, and never past its minimum', () => {
    const layout = at(1280, {
      navigatorWidth: NAVIGATOR_PREFERRED_MIN,
      executionWidth: EXECUTION_PREFERRED_MAX,
    });
    expect(layout.navigatorWidth).toBe(NAVIGATOR_PREFERRED_MIN);
    expect(layout.executionWidth).toBeGreaterThanOrEqual(EXECUTION_PREFERRED_MIN);
    expect(layout.executionWidth).toBeLessThanOrEqual(EXECUTION_PREFERRED_MAX);
  });
});

describe('preferred versus effective', () => {
  it('clamps a wide preference on a narrow viewport without altering the preference', () => {
    const preferred = { navigatorWidth: 340, executionWidth: 390 };
    const narrow = at(1280, preferred);
    expect(narrow.navigatorWidth).toBeLessThan(340);
    expect(narrow.clamped).toBe(true);
    // The engine is pure: it returns effective values and cannot mutate what it
    // was handed. That is what guarantees the stored preference survives.
    expect(preferred.navigatorWidth).toBe(340);
  });

  it('restores the full preference the moment the viewport can afford it', () => {
    const preferred = { navigatorWidth: 340, executionWidth: 390 };
    expect(at(1280, preferred).navigatorWidth).toBeLessThan(340);
    const wide = at(1920, preferred);
    expect(wide.navigatorWidth).toBe(340);
    expect(wide.executionWidth).toBe(390);
    expect(wide.clamped).toBe(false);
  });
});

describe('activity dock', () => {
  it('derives its ceiling from the viewport height, protecting the centre workspace', () => {
    expect(effectiveDockMax(900)).toBe(
      900 - TOP_INSTRUMENTATION_HEIGHT - MIN_CENTER_WORKSPACE_HEIGHT,
    );
    const layout = at(1440, { dockHeight: 9999 }, { viewportHeight: 900 });
    expect(layout.dockHeight).toBe(effectiveDockMax(900));
    expect(layout.dockHeight).toBeLessThan(9999);
  });

  it('never proposes a ceiling below its own populated minimum on a short screen', () => {
    expect(effectiveDockMax(500)).toBe(DOCK_POPULATED_MIN);
  });

  it('keeps the compact height when empty, and preserves the populated preference', () => {
    const preferred = { dockHeight: 320 };
    const empty = at(1440, preferred, { dockEmpty: true });
    expect(empty.dockHeight).toBe(DOCK_EMPTY_HEIGHT);
    // The populated preference is untouched and returns as soon as rows exist.
    expect(at(1440, preferred).dockHeight).toBe(320);
  });
});

describe('hybrid band', () => {
  it('does not spend chart width on the Navigator, because it overlays', () => {
    const closed = at(1100, {}, { navigatorCollapsed: true });
    const open = at(1100, {}, { navigatorCollapsed: false });
    expect(open.chartWidth).toBe(closed.chartWidth);
  });

  it('clamps the overlay to a share of the centre rather than to the full nominal max', () => {
    const layout = at(1100, { navigatorWidth: NAVIGATOR_PREFERRED_MAX });
    expect(layout.navigatorMax).toBeLessThanOrEqual(NAVIGATOR_PREFERRED_MAX);
    expect(layout.navigatorWidth).toBeLessThanOrEqual(layout.navigatorMax);
    expect(layout.navigatorWidth).toBeGreaterThanOrEqual(NAVIGATOR_PREFERRED_MIN);
  });
});

describe('mobile isolation', () => {
  it('ignores desktop pane widths entirely and leaves the preferences alone', () => {
    const layout = at(390, { navigatorWidth: 340, executionWidth: 400 });
    expect(layout.navigatorWidth).toBe(0);
    expect(layout.executionWidth).toBe(0);
    expect(layout.clamped).toBe(false);
    // The dock preference still resolves — the mobile sheet uses it.
    expect(layout.dockHeight).toBe(DOCK_DEFAULT_POPULATED_HEIGHT);
  });
});
