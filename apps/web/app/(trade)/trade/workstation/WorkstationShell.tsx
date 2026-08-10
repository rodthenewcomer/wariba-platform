'use client';

import { memo, type ReactNode } from 'react';

export interface WorkstationShellProps {
  rail: ReactNode;
  statusBar: ReactNode;
  /** Compact market trigger, mobile only — opens the navigator sheet. */
  mobileMarketTrigger: ReactNode;
  navigator: ReactNode;
  chart: ReactNode;
  /** Execution entry action, mobile only — opens the execution sheet. */
  mobileExecutionAction: ReactNode;
  execution: ReactNode;
  dock: ReactNode;
}

/**
 * WariX's geometry, and nothing else (W1 §8/§9).
 *
 * This component owns no state, subscribes to no tick, and knows nothing
 * about accounts, orders or symbols — it places slots. That is the whole
 * point of the W1 seam: the surface that decides where things go must not
 * also be the surface that decides what they say.
 *
 * **Desktop (≥1024px)** is a CSS grid sized to the viewport:
 *
 *     columns: 56px │ navigator │ minmax(0, 1fr) │ execution
 *     rows:    48px │ minmax(0, 1fr) │ dock
 *
 * `minmax(0, 1fr)` on the chart column *and* the middle row is the entire
 * fix for the W0 defect: a bare `1fr` floors at the content's min-content
 * size, so the chart could grow but never shrink, and the page scrolled
 * instead. With `minmax(0, …)` — plus `min-w-0`/`min-h-0` on every nested
 * flex owner down to the canvas — the centre cell takes exactly the space
 * the fixed tracks leave, at every resolution. Nothing is clipped and no
 * financial data is hidden: panels that outgrow their cell scroll inside it.
 *
 * **Mobile (<1024px)** is a flex column whose first screen is exactly one
 * viewport tall: status bar, market trigger, chart, execution action. The
 * chart is the dominant surface and the dock follows below it, capped so it
 * can never squeeze the chart back off-screen the way the full-width
 * watchlist block did at W0 (chart started at y=751 of an 844px viewport).
 *
 * The document itself never scrolls horizontally at any width — internal
 * tables and the dock's tab strip own their own `overflow-x`.
 */
export const WorkstationShell = memo(function WorkstationShell({
  rail,
  statusBar,
  mobileMarketTrigger,
  navigator,
  chart,
  mobileExecutionAction,
  execution,
  dock,
}: WorkstationShellProps) {
  return (
    <div
      data-testid="workstation-shell"
      className={[
        'flex min-h-dvh w-full min-w-0 max-w-full flex-col overflow-x-hidden',
        'bg-[color:var(--wariba-component-workstation-surface-sunken)]',
        'lg:grid lg:h-dvh lg:min-h-0 lg:overflow-hidden',
        // W0 §9's breakpoint table, as tokens rather than magic numbers. The
        // 1024–1279 band keeps the full navigator: collapsing it to icons is
        // W2's job, and a half-built collapse would be worse than none.
        '[--workstation-nav-w:var(--wariba-component-workstation-nav-width-compact)]',
        '[--workstation-exec-w:var(--wariba-component-workstation-exec-width-compact)]',
        '[--workstation-dock-h:var(--wariba-component-workstation-dock-height-compact)]',
        '2xl:[--workstation-nav-w:var(--wariba-component-workstation-nav-width)]',
        '2xl:[--workstation-exec-w:var(--wariba-component-workstation-exec-width)]',
        '2xl:[--workstation-dock-h:var(--wariba-component-workstation-dock-height)]',
        '3xl:[--workstation-nav-w:var(--wariba-component-workstation-nav-width-wide)]',
        '3xl:[--workstation-exec-w:var(--wariba-component-workstation-exec-width-wide)]',
        '3xl:[--workstation-dock-h:var(--wariba-component-workstation-dock-height-wide)]',
      ].join(' ')}
      // Ignored while the shell is a flex column (<1024px); the grid tracks
      // below only take effect once `lg:grid` switches display.
      style={{
        gridTemplateColumns:
          'var(--wariba-component-workstation-rail-width) var(--workstation-nav-w) minmax(0, 1fr) var(--workstation-exec-w)',
        gridTemplateRows:
          'var(--wariba-component-workstation-statusbar-height) minmax(0, 1fr) var(--workstation-dock-h)',
      }}
    >
      <div className="hidden lg:[grid-area:1/1/3/2] lg:block">{rail}</div>

      <div className="min-w-0 shrink-0 lg:[grid-area:1/2/2/5]">{statusBar}</div>

      <div className="min-w-0 shrink-0 lg:hidden">{mobileMarketTrigger}</div>

      <div className="hidden min-h-0 min-w-0 border-r border-[color:var(--wariba-component-workstation-seam)] lg:[grid-area:2/2/3/3] lg:flex lg:flex-col">
        {navigator}
      </div>

      <div className="flex min-h-[40dvh] min-w-0 flex-1 flex-col lg:min-h-0 lg:[grid-area:2/3/3/4]">
        {chart}
      </div>

      <div className="min-w-0 shrink-0 px-[var(--wariba-component-workstation-panel-padding)] pb-2 lg:hidden">
        {mobileExecutionAction}
      </div>

      <div className="hidden min-h-0 min-w-0 border-l border-[color:var(--wariba-component-workstation-seam)] p-[var(--wariba-component-workstation-panel-padding)] lg:[grid-area:2/4/3/5] lg:flex lg:flex-col">
        {execution}
      </div>

      <div className="flex max-h-[38dvh] min-h-0 min-w-0 flex-col lg:max-h-none lg:[grid-area:3/1/4/5]">
        {dock}
      </div>
    </div>
  );
});
