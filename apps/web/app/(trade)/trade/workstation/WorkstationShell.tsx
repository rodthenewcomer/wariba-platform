'use client';

import { memo, type ReactNode } from 'react';
import { UtilityDrawerOverlay } from './UtilityDrawer';

export interface WorkstationShellProps {
  dockHeight: number;
  dockCollapsed: boolean;
  utilityDrawerWidth: number;
  utilityDrawerOpen: boolean;
  utilityDrawerOverlay?: boolean;
  onUtilityDrawerDismiss(): void;
  utilityDrawerResizeHandle: ReactNode;
  rail: ReactNode;
  utilityRail: ReactNode;
  statusBar: ReactNode;
  /** Compact market trigger, mobile only. */
  mobileMarketTrigger: ReactNode;
  chart: ReactNode;
  /** Mobile action surface for Trade, Activity and secondary utilities. */
  mobileExecutionAction: ReactNode;
  utilityDrawer: ReactNode;
  dock: ReactNode;
}

/**
 * WariX geometry only: global navigation, maximum chart, one optional utility
 * drawer, and the persistent right rail. It owns no market or trading state.
 *
 * Desktop columns:
 *
 *     56px product rail │ minmax(0, 1fr) chart │ optional drawer │ 56px utilities
 *
 * The old permanent Market Navigator and Execution tracks no longer exist.
 * Closing the single drawer returns their entire width to the already-mounted
 * chart. In the hybrid band the same drawer floats over the chart so opening a
 * utility cannot crush the plot.
 */
export const WorkstationShell = memo(function WorkstationShell({
  dockHeight,
  dockCollapsed,
  utilityDrawerWidth,
  utilityDrawerOpen,
  utilityDrawerOverlay = false,
  onUtilityDrawerDismiss,
  utilityDrawerResizeHandle,
  rail,
  utilityRail,
  statusBar,
  mobileMarketTrigger,
  chart,
  mobileExecutionAction,
  utilityDrawer,
  dock,
}: WorkstationShellProps) {
  const inlineDrawerOpen = utilityDrawerOpen && !utilityDrawerOverlay;

  return (
    <main
      data-testid="workstation-shell"
      data-workspace-root=""
      data-utility-drawer-open={utilityDrawerOpen ? 'true' : 'false'}
      aria-labelledby="warix-workstation-title"
      className="flex min-h-dvh w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-[color:var(--wariba-component-workstation-surface-sunken)] motion-reduce:transition-none lg:grid lg:h-dvh lg:min-h-0 lg:overflow-hidden lg:transition-[grid-template-columns,grid-template-rows] lg:duration-[var(--wariba-component-workstation-motion-interaction)]"
      style={{
        gridTemplateColumns: `var(--wariba-component-workstation-rail-width) minmax(0, 1fr) ${
          inlineDrawerOpen ? `var(--warix-utility-drawer-width, ${utilityDrawerWidth}px)` : '0px'
        } var(--wariba-component-workstation-utility-rail-width)`,
        gridTemplateRows: `var(--wariba-component-workstation-statusbar-height) minmax(0, 1fr) ${
          dockCollapsed
            ? 'var(--wariba-component-workstation-dock-collapsed-height)'
            : `min(var(--warix-dock-height, ${dockHeight}px), 55dvh)`
        }`,
      }}
    >
      <h1 id="warix-workstation-title" className="sr-only">
        WariX — Poste de travail de trading simulé
      </h1>

      <div className="hidden lg:[grid-area:1/1/3/2] lg:block">{rail}</div>
      <div className="min-w-0 shrink-0 lg:[grid-area:1/2/2/5]">{statusBar}</div>

      <div className="min-w-0 shrink-0 lg:hidden">{mobileMarketTrigger}</div>

      <div
        data-testid="chart-track"
        className="relative flex min-h-[52dvh] min-w-0 flex-1 flex-col lg:min-h-0 lg:[grid-area:2/2/3/3]"
      >
        {chart}
        {utilityDrawerOpen && utilityDrawerOverlay ? (
          <UtilityDrawerOverlay onDismiss={onUtilityDrawerDismiss}>
            {utilityDrawer}
          </UtilityDrawerOverlay>
        ) : null}
      </div>

      <div className="min-w-0 shrink-0 lg:hidden">{mobileExecutionAction}</div>

      {inlineDrawerOpen ? (
        <div
          data-testid="utility-drawer-track"
          className="hidden min-h-0 min-w-0 bg-[color:var(--wariba-component-workstation-surface-module)] lg:[grid-area:2/3/3/4] lg:flex lg:flex-row"
        >
          {utilityDrawerResizeHandle}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {utilityDrawer}
          </div>
        </div>
      ) : null}

      <div className="hidden min-h-0 min-w-0 lg:[grid-area:2/4/3/5] lg:block">{utilityRail}</div>

      <div className="flex max-h-[38dvh] min-h-0 min-w-0 flex-col lg:max-h-none lg:[grid-area:3/1/4/5]">
        {dock}
      </div>
    </main>
  );
});
