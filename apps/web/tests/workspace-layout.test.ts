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
  executionDockPolicyForWidth,
  resolveWorkspaceLayout,
  workspaceModeForWidth,
  type PreferredWorkspaceLayout,
} from '../app/(trade)/trade/workstation/workspace-layout';

/**
 * The Workspace Layout Engine.
 *
 * These assertions are about the *rules*, not about pixels on a screen: the
 * engine is pure, so the chart-protection constraint, viewport hard maxima
 * and the preferred-vs-effective separation can each be stated and
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
    {
      ...DEFAULTS,
      executionWidth: executionDockPolicyForWidth(viewportWidth).preferred,
      ...preferred,
    },
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
  it('applies the compact viewport policy without touching the other tracks', () => {
    for (const [width, expected] of [
      [1920, 260],
      [1440, 248],
      [1366, 236],
      [1280, 236],
    ] as const) {
      const layout = at(width);
      expect(layout.navigatorWidth).toBe(NAVIGATOR_DEFAULT_WIDTH);
      expect(layout.executionWidth).toBe(expected);
      expect(layout.dockHeight).toBe(DOCK_DEFAULT_POPULATED_HEIGHT);
      expect(layout.clamped).toBe(false);
    }
  });

  it('publishes the requested soft ranges and hard maxima', () => {
    expect(executionDockPolicyForWidth(1920)).toEqual({
      preferred: 260,
      softMin: 248,
      softMax: 280,
      hardMax: 300,
    });
    expect(executionDockPolicyForWidth(1440)).toEqual({
      preferred: 248,
      softMin: 236,
      softMax: 264,
      hardMax: 280,
    });
    expect(executionDockPolicyForWidth(1366)).toEqual({
      preferred: 236,
      softMin: 224,
      softMax: 248,
      hardMax: 260,
    });
    expect(executionDockPolicyForWidth(1280)).toEqual(executionDockPolicyForWidth(1366));
  });
});

describe('dynamic chart protection', () => {
  it('never lets the two panes leave the chart below its minimum', () => {
    // Both panes asking for their nominal maximum is the strongest legal case.
    for (const width of [1280, 1366, 1440, 1536, 1920, 2560]) {
      const layout = at(width, {
        navigatorWidth: NAVIGATOR_PREFERRED_MAX,
        executionWidth: EXECUTION_PREFERRED_MAX,
      });
      expect(layout.chartWidth).toBeGreaterThanOrEqual(MIN_FULL_DESKTOP_CHART_WIDTH);
    }
  });

  it('caps Execution at the viewport hard maximum while leaving its preference untouched', () => {
    const preferred = { executionWidth: EXECUTION_PREFERRED_MAX };
    const compact = at(1366, preferred);
    expect(compact.executionWidth).toBe(executionDockPolicyForWidth(1366).hardMax);
    expect(compact.executionMax).toBe(executionDockPolicyForWidth(1366).hardMax);
    expect(preferred.executionWidth).toBe(EXECUTION_PREFERRED_MAX);
  });

  it('gives the whole budget to Execution when the Navigator is collapsed', () => {
    const layout = at(
      1366,
      { executionWidth: EXECUTION_PREFERRED_MAX },
      { navigatorCollapsed: true },
    );
    expect(layout.navigatorWidth).toBe(0);
    expect(layout.executionWidth).toBe(executionDockPolicyForWidth(1366).hardMax);
    expect(layout.chartWidth).toBeGreaterThanOrEqual(MIN_FULL_DESKTOP_CHART_WIDTH);
  });
});

describe('compact range protection', () => {
  it('keeps both panes at their legal maxima at 1280 without starving the chart', () => {
    const layout = at(1280, {
      navigatorWidth: NAVIGATOR_PREFERRED_MAX,
      executionWidth: EXECUTION_PREFERRED_MAX,
    });
    expect(layout.navigatorWidth).toBe(NAVIGATOR_PREFERRED_MAX);
    expect(layout.executionWidth).toBe(executionDockPolicyForWidth(1280).hardMax);
    expect(layout.executionWidth).toBeGreaterThanOrEqual(EXECUTION_PREFERRED_MIN);
    expect(layout.chartWidth).toBeGreaterThanOrEqual(MIN_FULL_DESKTOP_CHART_WIDTH);
  });
});

describe('preferred versus effective', () => {
  it('clamps a wide preference on a narrow viewport without altering the preference', () => {
    const preferred = { navigatorWidth: 340, executionWidth: 300 };
    const narrow = at(1280, preferred);
    expect(narrow.executionWidth).toBe(260);
    expect(narrow.clamped).toBe(true);
    // The engine is pure: it returns effective values and cannot mutate what it
    // was handed. That is what guarantees the stored preference survives.
    expect(preferred.navigatorWidth).toBe(340);
    expect(preferred.executionWidth).toBe(300);
  });

  it('restores the full preference the moment the viewport can afford it', () => {
    const preferred = { navigatorWidth: 340, executionWidth: 300 };
    expect(at(1280, preferred).executionWidth).toBe(260);
    const wide = at(1920, preferred);
    expect(wide.navigatorWidth).toBe(340);
    expect(wide.executionWidth).toBe(300);
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
