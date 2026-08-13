'use client';

import { memo, type ReactNode } from 'react';

export interface WorkstationShellProps {
  /**
   * Desktop layout dimensions (W2 §12/§13/§22/§23). The shell applies them and
   * nothing else — it still owns no state, reads no data and subscribes to no
   * tick. Collapsing genuinely removes the track rather than hiding a panel
   * inside a track that still occupies space.
   */
  navigatorWidth: number;
  navigatorCollapsed: boolean;
  /**
   * Visual closure §22 — in the 1024–1279 hybrid band an explicitly-opened
   * Navigator floats over the chart instead of taking a grid track from it.
   *
   * The shell still owns only geometry: the navigator track simply contributes
   * 0px and the same `navigator` slot is placed absolutely inside the chart
   * cell. Nothing about what the Navigator *is* changes — same component, same
   * subscriptions, same collapse control — so the trade-off is confined to
   * where the box sits, which is exactly this component's remit.
   */
  navigatorOverlay?: boolean;
  dockHeight: number;
  dockCollapsed: boolean;
  navigatorResizeHandle: ReactNode;
  /** Shown in the chart cell while the navigator is collapsed, so it can always be brought back. */
  navigatorRestore: ReactNode;
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
  navigatorWidth,
  navigatorCollapsed,
  navigatorOverlay = false,
  dockHeight,
  dockCollapsed,
  navigatorResizeHandle,
  navigatorRestore,
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
    <main
      data-testid="workstation-shell"
      aria-labelledby="warix-workstation-title"
      className={[
        'flex min-h-dvh w-full min-w-0 max-w-full flex-col overflow-x-hidden',
        'bg-[color:var(--wariba-component-workstation-surface-sunken)]',
        'lg:grid lg:h-dvh lg:min-h-0 lg:overflow-hidden lg:transition-[grid-template-rows] lg:duration-[var(--wariba-component-workstation-motion-interaction)] motion-reduce:transition-none',
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
        // A collapsed navigator contributes a 0px track — the width is gone,
        // not merely invisible, so the chart column actually receives it.
        gridTemplateColumns: `var(--wariba-component-workstation-rail-width) ${
          navigatorCollapsed || navigatorOverlay ? '0px' : `${navigatorWidth}px`
        } minmax(0, 1fr) var(--workstation-exec-w)`,
        // Same for the dock: collapsed leaves only its header row.
        gridTemplateRows: `var(--wariba-component-workstation-statusbar-height) minmax(0, 1fr) ${
          dockCollapsed
            ? 'var(--wariba-component-workstation-dock-collapsed-height)'
            : `min(${dockHeight}px, 55dvh)`
        }`,
      }}
    >
      <h1 id="warix-workstation-title" className="sr-only">
        WariX — Poste de travail de trading simulé
      </h1>
      <div className="hidden lg:[grid-area:1/1/3/2] lg:block">{rail}</div>

      <div className="min-w-0 shrink-0 lg:[grid-area:1/2/2/5]">{statusBar}</div>

      <div className="min-w-0 shrink-0 lg:hidden">{mobileMarketTrigger}</div>

      {/* Collapsed unmounts the navigator rather than hiding it: its rows each
          hold a per-symbol tick subscription, and an invisible panel has no
          business paying for them. */}
      {navigatorCollapsed || navigatorOverlay ? null : (
        <div
          data-testid="market-navigator-track"
          className="hidden min-h-0 min-w-0 border-r border-[color:var(--wariba-component-workstation-border-hairline)] bg-[color:var(--wariba-component-workstation-surface-module)] lg:[grid-area:2/2/3/3] lg:flex lg:flex-row"
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{navigator}</div>
          {navigatorResizeHandle}
        </div>
      )}

      {/*
       * Visual closure §14 — the chart takes the height the phone actually has.
       *
       * `min-h-[40dvh]` only guaranteed a floor; with the status bar, market
       * trigger and action rail all being `shrink-0`, the chart was left with
       * whatever remained and rendered noticeably empty. `flex-1` plus a real
       * minimum means it claims the space between the fixed rows instead —
       * roughly 55–60dvh on a 390×844 phone — without inventing a single
       * candle: the same observed history simply gets a taller box.
       */}
      <div
        data-testid="chart-track"
        className="relative flex min-h-[52dvh] min-w-0 flex-1 flex-col lg:min-h-0 lg:[grid-area:2/3/3/4]"
      >
        {navigatorCollapsed ? (
          <div className="hidden shrink-0 lg:block">{navigatorRestore}</div>
        ) : null}
        {chart}
        {/*
         * §22 — the hybrid overlay. The chart keeps its full width underneath,
         * so opening and closing the Navigator at 1024–1279 never reflows the
         * plot: the trader's candles do not move because they went looking for
         * an instrument. Deliberately no scrim — this is a desktop panel beside
         * a live market, not a modal, and dimming the chart to choose a symbol
         * would be the opposite of the point.
         */}
        {navigatorOverlay && !navigatorCollapsed ? (
          <div
            data-testid="market-navigator-overlay"
            style={{ width: `${navigatorWidth}px` }}
            className="absolute inset-y-0 left-0 z-30 hidden min-h-0 min-w-0 border-r border-[color:var(--wariba-component-workstation-border-strong)] bg-[color:var(--wariba-component-workstation-surface-module)] shadow-[var(--wariba-component-workstation-elevation-popover)] lg:flex lg:flex-col"
          >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{navigator}</div>
          </div>
        ) : null}
      </div>

      {/* The rail owns its own seam and padding (§15/§16), so the shell gives
          it the full width rather than insetting it on the page background. */}
      <div className="min-w-0 shrink-0 lg:hidden">{mobileExecutionAction}</div>

      <div
        data-testid="execution-track"
        className="hidden min-h-0 min-w-0 border-l border-[color:var(--wariba-component-workstation-border-hairline)] bg-[color:var(--wariba-component-workstation-surface-module)] lg:[grid-area:2/4/3/5] lg:flex lg:flex-col"
      >
        {execution}
      </div>

      <div className="flex max-h-[38dvh] min-h-0 min-w-0 flex-col lg:max-h-none lg:[grid-area:3/1/4/5]">
        {dock}
      </div>
    </main>
  );
});
