'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { BottomSheet, WariXCollapseLeftIcon, WariXExpandLeftIcon } from '@wariba/ui';
import type { PendingOrderType, TradableSymbol } from '@wariba/contracts';
import { useOneClickTrading } from '../../../lib/one-click-trading';
import { ChartWorkspace, type ChartWorkspaceActions } from './ChartWorkspace';
import { MarketNavigator } from './MarketNavigator';
import { useIsDesktop, useIsHybridDesktop, useViewportSize } from './use-viewport';
import { ExecutionPanel } from './ExecutionPanel';
import { pendingOrderTypeFor } from './execution/execution-contract';
import { TradeDialogs, type TradeDialogActions, type TradeDialogState } from './TradeDialogs';
import { createTicketDraftStore } from './ticket-draft';
import { useTradeSession } from './trade-session';
import { MobileMarketBar } from './workstation/MobileMarketBar';
import { NavRail } from './workstation/NavRail';
import { ResizeSeparator } from './workstation/ResizeSeparator';
import { WorkstationDock, type DockTab } from './workstation/WorkstationDock';
import { WorkstationShell } from './workstation/WorkstationShell';
import { WorkstationStatusBar } from './workstation/WorkstationStatusBar';
import type { WorkstationAccountOption } from './workstation/WorkstationAccountSwitcher';
import {
  DOCK_HEIGHT_MIN,
  EXECUTION_WIDTH_MIN,
  NAVIGATOR_WIDTH_MIN,
  defaultWorkstationPreferencesForWidth,
  useWorkstationPreferences,
} from './workstation/workstation-preferences';
import { resolveWorkspaceLayout } from './workstation/workspace-layout';

export interface TradeClientProps {
  /** Server-validated: this account belongs to `userId` (see trade/page.tsx). */
  accountId: string;
  /** The account's canonical public identifier — never the internal UUID. */
  accountPublicId: string;
  userId: string;
  wsUrl: string;
  /** Every account this trader owns, for the switcher. Built server-side from `listAccountsForUser`. */
  accounts: readonly WorkstationAccountOption[];
}

/**
 * WariX's composition root.
 *
 * Before W1 this file was the application: 1 709 lines of websocket
 * lifecycle, command orchestration, six dialogs and the entire layout, with
 * `useTick(tickStore, selectedSymbol)` read at the very top so every market
 * tick reconciled all of it. The W0 audit recorded that as the real rerender
 * defect (§3P), and it is the reason the shell had to come after the seam.
 *
 * What is left here is composition and the two pieces of state that genuinely
 * span surfaces — the selected symbol and the ticket draft — plus dialog and
 * dock-tab state. Notably absent, and deliberately so:
 *
 * - **No tick subscription.** Not one. The selected tick is read by
 *   `ChartWorkspace`, `ExecutionPanel`, `MobileMarketBar` and the two
 *   confirmation dialogs, each on its own; the market rows and the positions
 *   panel own theirs as they always did. A tick therefore cannot reach the
 *   nav rail, the status bar, the account switcher, the dock chrome or a
 *   closed dialog — there is no path.
 * - **No giant context.** Commands arrive as one stable object from
 *   `useTradeSession`; everything else is an ordinary prop. A single context
 *   holding tick + snapshot + commands + modal state would have moved this
 *   component's problem rather than fixed it (W1 §3).
 *
 * The composed callbacks below all read `selectedSymbolRef` / `draftStore`
 * rather than capturing render-scoped values, so their identity never
 * changes and neither the chart nor the dock re-renders because someone
 * typed in the quantity field.
 *
 * W4 made that last sentence true rather than merely intended. The draft used
 * to be `useState` here, so every keystroke re-rendered this component, which
 * rebuilds the JSX it passes as props (`headerAction`, `resizeHandle`, the
 * dock's `account` object…) — fresh objects each time, so no `memo` below
 * could hold. It is now an external store (`ticket-draft.ts`) that only the
 * surfaces genuinely displaying the draft subscribe to.
 */
export function TradeClient({
  accountId,
  accountPublicId,
  userId,
  wsUrl,
  accounts,
}: TradeClientProps) {
  const session = useTradeSession({ accountId, userId, wsUrl });
  const { commands, tickStore, snapshot, symbolSpecs } = session;

  const [selectedSymbol, setSelectedSymbol] = useState<TradableSymbol>('EURUSD');
  const selectedSymbolRef = useRef(selectedSymbol);
  selectedSymbolRef.current = selectedSymbol;

  // Created once and never re-read here during render — see ticket-draft.ts
  // for why the draft is an external store rather than this component's state.
  const draftStore = useMemo(() => createTicketDraftStore(), []);

  /**
   * W4 §54 — switching instrument clears the three absolute-price fields.
   *
   * A stop of 1.08500 carried from EURUSD onto NAS100 is not visibly wrong on
   * screen, is not caught by any client-side check (the fields validate syntax,
   * not instrument range), and would be submitted verbatim. Quantity and order
   * kind survive on purpose: a quantity *is* validated against the new symbol's
   * own bounds and says so inline when it no longer fits.
   */
  const selectSymbol = useCallback(
    (next: TradableSymbol) => {
      if (next === selectedSymbolRef.current) return;
      draftStore.clearPriceLevels();
      setSelectedSymbol(next);
    },
    [draftStore],
  );

  const [oneClickTrading] = useOneClickTrading();
  const oneClickTradingRef = useRef(oneClickTrading);
  oneClickTradingRef.current = oneClickTrading;

  const [tab, setTab] = useState<DockTab>('positions');
  // The switcher option for the loaded account — the server already resolved
  // its program, phase, size and status, so the Account dock tab reuses those
  // rather than deriving them a second time.
  const activeAccount = accounts.find((option) => option.id === accountId);
  // The two dock presentations are never concurrently active — see
  // use-viewport.ts for the SSR/hydration caveat on "one tree".
  const isDesktop = useIsDesktop();
  // §22 — at 1024–1279 an opened Navigator floats over the chart rather than
  // taking 244px from it. The band still renders the full desktop grid.
  const isHybridDesktop = useIsHybridDesktop();
  const [mobileDockOpen, setMobileDockOpen] = useState(false);
  const [mobileMarketOpen, setMobileMarketOpen] = useState(false);
  const viewport = useViewportSize();
  const {
    preferences,
    hasStoredLayout,
    setNavigatorPreferredWidth,
    setExecutionPreferredWidth,
    setDockPreferredHeight,
    setNavigatorCollapsed,
    setDockCollapsed,
    resetNavigatorWidth,
    resetDockHeight,
    toggleFavorite,
  } = useWorkstationPreferences(viewport.width);
  /*
   * Viewport defaults are resolved here, per render, not frozen at mount.
   *
   * A trader who has never touched the layout gets the hybrid band's Navigator
   * state and the active desktop band's compact Execution width. Resizing
   * across either boundary therefore applies the right first-run composition.
   * The moment the trader changes a pane, `hasStoredLayout` flips and their
   * preferred value wins, subject only to the active viewport's hard maximum.
   */
  const viewportDefaults = defaultWorkstationPreferencesForWidth(viewport.width);
  const navigatorCollapsed = hasStoredLayout
    ? preferences.navigatorCollapsed
    : viewportDefaults.navigatorCollapsed;
  /** Stable identity: the overlay's effect re-runs whenever this changes. */
  const collapseNavigator = useCallback(() => setNavigatorCollapsed(true), [setNavigatorCollapsed]);

  const [ticketOpen, setTicketOpen] = useState(false);
  const [dialogs, setDialogs] = useState<TradeDialogState>({
    closeAllOpen: false,
    modifyPositionId: null,
    quickOrderSide: null,
    partialClosePositionId: null,
    pendingOrderRequest: null,
    managePendingOrderId: null,
    notificationCenterOpen: false,
  });

  const dialogsRef = useRef(dialogs);
  dialogsRef.current = dialogs;

  const patchDialogs = useCallback((patch: Partial<TradeDialogState>) => {
    setDialogs((prev) => ({ ...prev, ...patch }));
  }, []);

  const submitMarketOrder = useCallback(
    (side: 'buy' | 'sell') => {
      const { quantity, stopLoss, takeProfit } = draftStore.getDraft();
      commands.openPosition({
        symbol: selectedSymbolRef.current,
        side,
        quantity,
        stopLoss,
        takeProfit,
      });
    },
    [commands, draftStore],
  );

  const submitPendingOrder = useCallback(
    (orderType: PendingOrderType, triggerPrice: string) => {
      const { quantity, stopLoss, takeProfit } = draftStore.getDraft();
      commands.createPendingOrder({
        symbol: selectedSymbolRef.current,
        orderType,
        quantity,
        triggerPrice,
        stopLoss,
        takeProfit,
      });
    },
    [commands, draftStore],
  );

  // The ticket's Buy/Sell buttons route to openPosition when orderKind is
  // 'market' and to createPendingOrder otherwise — submitted directly, same
  // as market orders from the ticket, no extra confirmation step (a
  // deliberate multi-field ticket submission is already the confirmation;
  // only the chart's quicker "at this price" shortcut gets
  // PendingOrderConfirm, mirroring QuickOrderConfirm).
  const submitTicket = useCallback(
    (side: 'buy' | 'sell') => {
      const { orderKind, triggerPrice } = draftStore.getDraft();
      if (orderKind === 'market') {
        submitMarketOrder(side);
      } else {
        submitPendingOrder(pendingOrderTypeFor(orderKind, side), triggerPrice.trim());
      }
    },
    [draftStore, submitMarketOrder, submitPendingOrder],
  );

  // Chart context menu's Market Buy/Sell (Appendix 07-C §7/§8) — same
  // command and same current ticket draft as the Order Ticket's own Buy/Sell
  // buttons; the only difference is whether a confirmation is required first
  // (one-click trading preference).
  const chartActions = useMemo<ChartWorkspaceActions>(
    () => ({
      onCommitLevel: commands.modifyPositionRisk,
      onOpenManage: (positionId) => patchDialogs({ modifyPositionId: positionId }),
      onClosePosition: commands.closePosition,
      onMarketOrderRequest: (side) => {
        if (oneClickTradingRef.current) submitMarketOrder(side);
        else patchDialogs({ quickOrderSide: side });
      },
      onOpenPartialClose: (positionId) => patchDialogs({ partialClosePositionId: positionId }),
      onModifyPendingOrderTrigger: commands.modifyPendingOrder,
      onOpenManagePendingOrder: (id) => patchDialogs({ managePendingOrderId: id }),
      onCancelPendingOrder: commands.cancelPendingOrder,
      onModifyAlertThreshold: commands.modifyAlertThreshold,
      onOpenManageAlert: () => patchDialogs({ notificationCenterOpen: true }),
      onDeleteAlert: commands.deleteAlert,
      onPendingOrderRequest: (params) => {
        if (oneClickTradingRef.current) submitPendingOrder(params.orderType, params.triggerPrice);
        else patchDialogs({ pendingOrderRequest: params });
      },
      // No ticket fields to reuse (an alert has no quantity/SL/TP), so this
      // picks a direction from which side of the current market the clicked
      // price falls on. Reads the tick from the store rather than a
      // subscription — this callback needs the value once, at click time.
      onCreateAlertHere: (thresholdPrice) => {
        const symbol = selectedSymbolRef.current;
        const tick = tickStore.getTick(symbol);
        if (!tick) return;
        const mid = (Number(tick.bid) + Number(tick.ask)) / 2;
        commands.createAlert({
          symbol,
          direction: Number(thresholdPrice) >= mid ? 'cross_above' : 'cross_below',
          thresholdPrice,
          source: 'mid',
          recurrence: 'once',
        });
      },
    }),
    [commands, patchDialogs, submitMarketOrder, submitPendingOrder, tickStore],
  );

  const dialogActions = useMemo<TradeDialogActions>(
    () => ({
      closeCloseAll: () => patchDialogs({ closeAllOpen: false }),
      confirmCloseAll: commands.closeAll,
      closeModifyPosition: () => patchDialogs({ modifyPositionId: null }),
      submitPositionRisk: commands.modifyPositionRisk,
      closeQuickOrder: () => patchDialogs({ quickOrderSide: null }),
      // Reads the pending side from a ref, never from inside a state
      // updater: an updater must be pure, and React may invoke it twice
      // (StrictMode, or a re-entrant render) — which for a market order
      // would mean submitting it twice.
      confirmQuickOrder: () => {
        const side = dialogsRef.current.quickOrderSide;
        if (!side) return;
        submitMarketOrder(side);
        patchDialogs({ quickOrderSide: null });
      },
      closePartialClose: () => patchDialogs({ partialClosePositionId: null }),
      submitPartialClose: (params) => {
        commands.partialClose(params);
        patchDialogs({ partialClosePositionId: null });
      },
      submitFullClose: (positionId) => {
        commands.closePosition(positionId);
        patchDialogs({ partialClosePositionId: null });
      },
      queueReduction: (params) => {
        commands.queueReduction(params);
        patchDialogs({ partialClosePositionId: null });
      },
      cancelQueuedReduction: commands.cancelQueuedReduction,
      closePendingOrderRequest: () => patchDialogs({ pendingOrderRequest: null }),
      // Same reasoning as confirmQuickOrder above — a pure updater, and the
      // command issued outside it.
      confirmPendingOrderRequest: () => {
        const request = dialogsRef.current.pendingOrderRequest;
        if (!request) return;
        submitPendingOrder(request.orderType, request.triggerPrice);
        patchDialogs({ pendingOrderRequest: null });
      },
      closeManagePendingOrder: () => patchDialogs({ managePendingOrderId: null }),
      submitModifyPendingOrder: (params) => {
        commands.modifyPendingOrder(params);
        patchDialogs({ managePendingOrderId: null });
      },
      cancelPendingOrder: (pendingOrderId) => {
        commands.cancelPendingOrder(pendingOrderId);
        patchDialogs({ managePendingOrderId: null });
      },
      closeNotificationCenter: () => patchDialogs({ notificationCenterOpen: false }),
      markAllNotificationsRead: commands.markAllNotificationsRead,
      enableAlert: commands.enableAlert,
      disableAlert: commands.disableAlert,
      deleteAlert: commands.deleteAlert,
      createAlert: commands.createAlert,
    }),
    [commands, patchDialogs, submitMarketOrder, submitPendingOrder],
  );

  const { clearCloseAllResult } = session;
  const openCloseAllDialog = useCallback(() => {
    clearCloseAllResult();
    patchDialogs({ closeAllOpen: true });
  }, [clearCloseAllResult, patchDialogs]);

  const openNotifications = useCallback(
    () => patchDialogs({ notificationCenterOpen: true }),
    [patchDialogs],
  );
  const openModifyPosition = useCallback(
    (positionId: string) => patchDialogs({ modifyPositionId: positionId }),
    [patchDialogs],
  );
  const openPartialClose = useCallback(
    (positionId: string) => patchDialogs({ partialClosePositionId: positionId }),
    [patchDialogs],
  );
  const openManagePendingOrder = useCallback(
    (pendingOrderId: string) => patchDialogs({ managePendingOrderId: pendingOrderId }),
    [patchDialogs],
  );

  const openPositionCount = snapshot?.openPositions.length ?? 0;
  const dockHasContent =
    tab === 'positions'
      ? openPositionCount > 0
      : tab === 'orders'
        ? (snapshot?.pendingOrders.length ?? 0) > 0 || (snapshot?.recentOrders.length ?? 0) > 0
        : tab === 'trades'
          ? (snapshot?.recentFills ?? []).some((fill) => fill.fillType === 'close')
          : tab === 'alerts'
            ? session.alerts.length > 0 || session.notifications.length > 0
            : true;
  /*
   * The Workspace Layout Engine, applied.
   *
   * Preferred dimensions come from storage and change only when the trader
   * resizes; effective dimensions are derived here on every render from those
   * preferences and the live viewport. Nothing below ever writes an effective
   * value back — that separation is what lets a 360px Navigator survive a spell
   * at 1280 and come back when the window widens.
   */
  const layout = resolveWorkspaceLayout(
    {
      navigatorWidth: preferences.navigatorPreferredWidth,
      executionWidth: hasStoredLayout
        ? preferences.executionPreferredWidth
        : viewportDefaults.executionPreferredWidth,
      dockHeight: preferences.activityDockPreferredHeight,
    },
    {
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      navigatorCollapsed,
      dockCollapsed: preferences.dockCollapsed,
      dockEmpty: !dockHasContent,
    },
  );

  const workstationDock = (
    <WorkstationDock
      store={tickStore}
      snapshot={snapshot}
      symbolSpecs={symbolSpecs}
      tab={tab}
      onTabChange={setTab}
      collapsed={preferences.dockCollapsed}
      empty={!dockHasContent}
      compact={!isDesktop}
      onToggleCollapsed={() => setDockCollapsed(!preferences.dockCollapsed)}
      pending={session.pending}
      onClosePosition={commands.closePosition}
      onModifyPosition={openModifyPosition}
      onPartialClosePosition={openPartialClose}
      onOpenCloseAll={openCloseAllDialog}
      onManagePendingOrder={openManagePendingOrder}
      onCancelPendingOrder={commands.cancelPendingOrder}
      alerts={session.alerts}
      notifications={session.notifications}
      onEnableAlert={commands.enableAlert}
      onDisableAlert={commands.disableAlert}
      onDeleteAlert={commands.deleteAlert}
      onManageAlerts={openNotifications}
      account={{
        accountId,
        accountPublicId,
        programLabel: activeAccount?.programLabel ?? '—',
        phaseLabel: activeAccount?.phaseLabel ?? '—',
        accountStatusLabel: activeAccount?.statusLabel ?? '—',
        nominalFormatted: activeAccount?.nominalFormatted ?? '—',
      }}
      resizeHandle={
        // The dock is only resizable where it is a grid track.
        isDesktop && !preferences.dockCollapsed && dockHasContent ? (
          <ResizeSeparator
            orientation="horizontal"
            label="Hauteur du dock"
            value={layout.dockHeight}
            min={DOCK_HEIGHT_MIN}
            max={layout.dockMax}
            onCommit={setDockPreferredHeight}
            onReset={resetDockHeight}
            direction={-1}
            cssVariable="--warix-dock-height"
            testId="dock-resize"
          />
        ) : null
      }
    />
  );

  const executionPanel = (
    <ExecutionPanel
      store={tickStore}
      draftStore={draftStore}
      symbol={selectedSymbol}
      spec={symbolSpecs[selectedSymbol]}
      equity={snapshot?.equity ?? null}
      risk={session.risk}
      connectionOk={session.connectionOk}
      isResyncing={session.isResyncing}
      pending={session.pending}
      rejection={session.rejection}
      onSubmit={submitTicket}
    />
  );

  return (
    <>
      {/* Appendix 07-C §15 — one shared aria-live region announcing every
          settled command, whatever entry point issued it. */}
      <div aria-live="polite" className="sr-only">
        {session.statusAnnouncement}
      </div>

      <WorkstationShell
        navigatorWidth={layout.navigatorWidth}
        executionWidth={layout.executionWidth}
        navigatorCollapsed={navigatorCollapsed}
        navigatorOverlay={isHybridDesktop}
        onNavigatorOverlayDismiss={collapseNavigator}
        dockHeight={layout.dockHeight}
        dockCollapsed={preferences.dockCollapsed}
        navigatorResizeHandle={
          navigatorCollapsed || isHybridDesktop ? null : (
            <ResizeSeparator
              orientation="vertical"
              label="Largeur du navigateur de marchés"
              value={layout.navigatorWidth}
              min={NAVIGATOR_WIDTH_MIN}
              max={layout.navigatorMax}
              onCommit={setNavigatorPreferredWidth}
              onReset={resetNavigatorWidth}
              direction={1}
              cssVariable="--warix-navigator-width"
              testId="navigator-resize"
            />
          )
        }
        executionResizeHandle={
          isDesktop ? (
            <ResizeSeparator
              orientation="vertical"
              label="Largeur du centre d’exécution"
              value={layout.executionWidth}
              min={EXECUTION_WIDTH_MIN}
              max={layout.executionMax}
              onCommit={setExecutionPreferredWidth}
              onReset={() => setExecutionPreferredWidth(viewportDefaults.executionPreferredWidth)}
              // The pane grows as the pointer moves *left*: its edge is the
              // leading one, between the chart and the panel.
              direction={-1}
              cssVariable="--warix-execution-width"
              testId="execution-resize"
            />
          ) : null
        }
        navigatorRestore={
          <button
            type="button"
            onClick={() => setNavigatorCollapsed(false)}
            aria-label="Afficher le navigateur de marchés"
            data-testid="navigator-restore"
            className="m-1 flex items-center gap-1.5 rounded-[7px] bg-[color:var(--wariba-component-workstation-surface-control)] px-2 py-1 text-[length:var(--wariba-component-workstation-type-label)] font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] text-[color:var(--wariba-component-workstation-text-secondary)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-hairline)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]"
          >
            <WariXExpandLeftIcon />
            Marchés
          </button>
        }
        rail={<NavRail currentPath="/trade" />}
        statusBar={
          <WorkstationStatusBar
            accounts={accounts}
            activeAccountId={accountId}
            balanceFormatted={snapshot ? `${snapshot.balance} USD` : '—'}
            equityFormatted={snapshot ? `${snapshot.equity} USD` : '—'}
            risk={session.risk}
            connectionOk={session.connectionOk}
            isResyncing={session.isResyncing}
            unreadCount={session.unreadCount}
            onOpenNotifications={openNotifications}
          />
        }
        mobileMarketTrigger={
          <MobileMarketBar
            store={tickStore}
            symbolSpecs={symbolSpecs}
            selectedSymbol={selectedSymbol}
            favorites={preferences.favorites}
            onSelectSymbol={selectSymbol}
            onToggleFavorite={toggleFavorite}
            open={mobileMarketOpen}
            onOpenChange={setMobileMarketOpen}
          />
        }
        navigator={
          <MarketNavigator
            store={tickStore}
            symbolSpecs={symbolSpecs}
            selectedSymbol={selectedSymbol}
            favorites={preferences.favorites}
            onSelectSymbol={selectSymbol}
            onToggleFavorite={toggleFavorite}
            headerAction={
              <button
                type="button"
                onClick={() => setNavigatorCollapsed(true)}
                aria-label="Replier le navigateur de marchés"
                data-testid="navigator-collapse"
                className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[color:var(--wariba-component-workstation-text-tertiary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]"
              >
                <WariXCollapseLeftIcon />
              </button>
            }
          />
        }
        chart={
          <ChartWorkspace
            store={tickStore}
            accountId={accountId}
            historyTransport={session.historyTransport}
            symbol={selectedSymbol}
            spec={symbolSpecs[selectedSymbol]}
            snapshot={snapshot}
            fills={session.fills}
            alerts={session.alerts}
            connectionState={session.connectionState}
            pendingRiskAction={session.pendingRiskAction}
            pendingOrderAction={session.pendingOrderAction}
            rejectedOrderAction={session.rejectedOrderAction}
            commandPending={session.pending}
            actions={chartActions}
            onOpenMobileMarkets={() => setMobileMarketOpen(true)}
          />
        }
        mobileExecutionAction={
          /*
           * Visual closure §15 — an action rail, not two loose buttons.
           *
           * The pair sat on the page background with a gap between them, which
           * is why it read as generic chrome rather than as part of the
           * workstation. It is now one seamed bar on the workstation surface,
           * with the primary action carrying the instrument it will trade and
           * the secondary one carrying its own open-position count. Still two
           * plain buttons underneath — no new navigation row, and nothing here
           * can submit an order (both only open a sheet).
           */
          <div
            data-testid="mobile-action-rail"
            className="flex items-stretch gap-2 border-t border-[color:var(--wariba-component-workstation-border-strong)] bg-[color:var(--wariba-component-workstation-surface-raised)] px-2.5 py-2 shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light)]"
          >
            {/*
             * Visual closure §16 / mobile gate §5 — an action rail of two keys.
             *
             * WX1 drew "Trader EURUSD" across the full width in the lightest
             * cobalt the palette has (`action-primary` is cobalt-400 in the dark
             * theme), which made a control that only *opens a sheet* the single
             * loudest object on a chart-first screen. Four changes, no
             * functionality touched:
             *
             * - The instrument leaves the visible label. It is already stated
             *   directly above the chart in the market-context strip and again
             *   in the sheet's own title, so repeating it here was the third
             *   time. It stays in the accessible name, which is what actually
             *   owes the context — so the control still announces "Trader
             *   EURUSD" and every existing selector still resolves.
             * - Cobalt-600 with white text instead of cobalt-400 with ink:
             *   7.3:1, unmistakably the primary action, and no longer a pale
             *   lavender slab competing with the candles.
             * - Both keys take the desktop decision-key physique — rim light,
             *   2px key shadow, and a press that bottoms out — so the rail reads
             *   as two instruments rather than a CTA beside a ghost link.
             * - The chevron says the sheet arrives from below, which is the
             *   discoverability the shorter label gives up.
             */}
            <button
              type="button"
              onClick={() => setTicketOpen(true)}
              aria-label={`Trader ${selectedSymbol}`}
              className="flex min-h-11 flex-[3] items-center justify-center gap-2 rounded-[10px] bg-[color:var(--wariba-color-cobalt-600)] px-3 text-[color:var(--wariba-color-white)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_2px_0_0_rgba(5,7,12,0.55)] transition-[transform,box-shadow,filter] duration-[var(--wariba-component-workstation-motion-interaction)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] active:translate-y-0.5 active:brightness-90 active:shadow-[inset_0_2px_3px_0_rgba(5,7,12,0.45)]"
            >
              <span aria-hidden="true" className="text-[9px] leading-none opacity-75">
                ▲
              </span>
              <span
                aria-hidden="true"
                className="text-[length:var(--wariba-font-size-label-md)] font-bold tracking-[var(--wariba-component-workstation-tracking-decision)]"
              >
                Trader
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileDockOpen(true)}
              data-testid="mobile-dock-trigger"
              className="flex min-h-11 flex-[2] items-center justify-center gap-1.5 rounded-[10px] bg-[color:var(--wariba-component-workstation-surface-control)] px-3 text-[color:var(--wariba-component-workstation-text-secondary)] shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light-strong),0_2px_0_0_rgba(5,7,12,0.45)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-hairline)] transition-[transform,box-shadow,color] duration-[var(--wariba-component-workstation-motion-interaction)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] active:translate-y-0.5 active:shadow-[inset_0_2px_3px_0_rgba(5,7,12,0.45)]"
            >
              <span className="text-[length:var(--wariba-font-size-label-md)] font-semibold">
                Activité
              </span>
              {openPositionCount > 0 ? (
                <span
                  aria-label={`${openPositionCount} position ouverte`}
                  className="wariba-data min-w-5 rounded-full bg-[color:var(--wariba-component-workstation-wash-selected-strong)] px-1.5 text-center text-[length:var(--wariba-component-workstation-type-meta)] font-bold tabular-nums text-[color:var(--wariba-component-workstation-interaction-selected-text)]"
                >
                  {openPositionCount}
                </span>
              ) : null}
            </button>
          </div>
        }
        // W4 §69/§70 — the Execution Center exists exactly once in the
        // document, following the rule W2 §27 already set for the dock. Before
        // W4 it was rendered here *and* inside the mobile sheet: the desktop
        // copy was merely `hidden` by CSS on a phone, so both trees held a
        // `useTick` subscription, both re-derived margin and impact on every
        // tick, and every field appeared twice in the DOM — which is why the
        // E2E suite had to reach for `.first()` and why "Ordre refusé" matched
        // two nodes. (After viewport resolution; see use-viewport.ts.)
        execution={isDesktop ? executionPanel : null}
        // W2 §27 — same rule for the dock: a hidden Positions panel would
        // still hold a useAllTicks subscription and still recompute live P&L
        // per tick.
        dock={isDesktop ? workstationDock : null}
      />

      <BottomSheet
        open={!isDesktop && mobileDockOpen}
        onClose={() => setMobileDockOpen(false)}
        title="Activité de trading"
      >
        {/* The sheet now owns its own height ceiling and scrolling, so the
            dock no longer needs a second, smaller one of its own. */}
        {!isDesktop && mobileDockOpen ? (
          <div className="flex min-h-0 flex-col">{workstationDock}</div>
        ) : null}
      </BottomSheet>

      {/* The mobile presentation of the same panel — the sheet is the only
          place it is mounted below `lg`, and the desktop column the only place
          above it. The draft itself lives in `draftStore`, outside React, so
          moving between the two presentations carries the trader's in-progress
          ticket across intact. */}
      <BottomSheet
        open={!isDesktop && ticketOpen}
        onClose={() => setTicketOpen(false)}
        title={`Trader ${selectedSymbol}`}
        // The panel's own ModuleHeader is the sheet's visible header — see
        // `hideTitle` on BottomSheet for why the instrument is not named twice.
        hideTitle
        // Visual closure §3 — a working height, not a content hug: the market
        // header, order type, quantity and the sticky Sell/Buy footer must all
        // be reachable without the sheet swallowing the status context above
        // it. `flush` hands the box to the panel so its own seams run edge to
        // edge and its own sticky footer is the sheet's footer.
        size="tall"
        flush
      >
        {!isDesktop && ticketOpen ? executionPanel : null}
      </BottomSheet>

      <TradeDialogs
        store={tickStore}
        snapshot={snapshot}
        symbolSpecs={symbolSpecs}
        selectedSymbol={selectedSymbol}
        accountPublicId={accountPublicId}
        draftStore={draftStore}
        pending={session.pending}
        rejection={session.rejection}
        closeAllResult={session.closeAllResult}
        alerts={session.alerts}
        notifications={session.notifications}
        unreadCount={session.unreadCount}
        state={dialogs}
        actions={dialogActions}
      />
    </>
  );
}
