'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { BottomSheet } from '@wariba/ui';
import type { PendingOrderType, TradableSymbol } from '@wariba/contracts';
import { useOneClickTrading } from '../../../lib/one-click-trading';
import { ChartWorkspace, type ChartWorkspaceActions } from './ChartWorkspace';
import { MarketNavigator } from './MarketNavigator';
import { useIsDesktop } from './use-viewport';
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
  DOCK_HEIGHT_MAX,
  DOCK_HEIGHT_MIN,
  NAVIGATOR_WIDTH_MAX,
  NAVIGATOR_WIDTH_MIN,
  useWorkstationPreferences,
} from './workstation/workstation-preferences';

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
  const [mobileDockOpen, setMobileDockOpen] = useState(false);
  const {
    preferences,
    setNavigatorWidth,
    setNavigatorCollapsed,
    setDockHeight,
    setDockCollapsed,
    toggleFavorite,
  } = useWorkstationPreferences();
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

  const workstationDock = (
    <WorkstationDock
      store={tickStore}
      snapshot={snapshot}
      symbolSpecs={symbolSpecs}
      tab={tab}
      onTabChange={setTab}
      collapsed={preferences.dockCollapsed}
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
        isDesktop && !preferences.dockCollapsed ? (
          <ResizeSeparator
            orientation="horizontal"
            label="Hauteur du dock"
            value={preferences.dockHeight}
            min={DOCK_HEIGHT_MIN}
            max={DOCK_HEIGHT_MAX}
            onChange={setDockHeight}
            direction={-1}
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
      accountPublicId={accountPublicId}
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
        navigatorWidth={preferences.navigatorWidth}
        navigatorCollapsed={preferences.navigatorCollapsed}
        dockHeight={preferences.dockHeight}
        dockCollapsed={preferences.dockCollapsed}
        navigatorResizeHandle={
          preferences.navigatorCollapsed ? null : (
            <ResizeSeparator
              orientation="vertical"
              label="Largeur du navigateur de marchés"
              value={preferences.navigatorWidth}
              min={NAVIGATOR_WIDTH_MIN}
              max={NAVIGATOR_WIDTH_MAX}
              onChange={setNavigatorWidth}
              direction={1}
              testId="navigator-resize"
            />
          )
        }
        navigatorRestore={
          <button
            type="button"
            onClick={() => setNavigatorCollapsed(false)}
            aria-label="Afficher le navigateur de marchés"
            data-testid="navigator-restore"
            className="m-1 flex items-center gap-1 rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-component-workstation-seam)] px-2 py-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)] hover:bg-[color:var(--wariba-surface-selected)] hover:text-[color:var(--wariba-theme-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
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
                className="flex h-6 w-6 items-center justify-center rounded-[var(--wariba-radius-sm)] text-[color:var(--wariba-text-secondary)] hover:bg-[color:var(--wariba-surface-selected)] hover:text-[color:var(--wariba-theme-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
            }
          />
        }
        chart={
          <ChartWorkspace
            store={tickStore}
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
            className="flex items-stretch gap-2 border-t border-[color:var(--wariba-component-workstation-seam)] bg-[color:var(--wariba-component-workstation-surface-raised)] px-2 py-2"
          >
            <button
              type="button"
              onClick={() => setTicketOpen(true)}
              className="flex min-h-[var(--wariba-size-touch-target-minimum)] flex-1 items-center justify-center gap-1.5 rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-action-primary)] px-3 text-[color:var(--wariba-action-primary-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
            >
              <span className="text-[length:var(--wariba-font-size-label-md)] font-semibold">
                Trader
              </span>
              <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] font-semibold">
                {selectedSymbol}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileDockOpen(true)}
              data-testid="mobile-dock-trigger"
              className="flex min-h-[var(--wariba-size-touch-target-minimum)] items-center justify-center gap-1.5 rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-component-workstation-seam)] px-3 text-[color:var(--wariba-text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
            >
              <span className="text-[length:var(--wariba-font-size-label-md)] font-medium">
                Activité
              </span>
              {openPositionCount > 0 ? (
                <span
                  aria-label={`${openPositionCount} position ouverte`}
                  className="wariba-data min-w-5 rounded-full bg-[color:var(--wariba-surface-selected)] px-1.5 text-center text-[length:var(--wariba-font-size-data-xs)] font-semibold text-[color:var(--wariba-theme-text)]"
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
