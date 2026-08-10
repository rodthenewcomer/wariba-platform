'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BottomSheet, Button } from '@wariba/ui';
import type { PendingOrderType, TradableSymbol } from '@wariba/contracts';
import { useOneClickTrading } from '../../../lib/one-click-trading';
import { ChartWorkspace, type ChartWorkspaceActions } from './ChartWorkspace';
import { ExecutionPanel } from './ExecutionPanel';
import { pendingOrderTypeFor } from './OrderTicket';
import { TradeDialogs, type TradeDialogActions, type TradeDialogState } from './TradeDialogs';
import { WatchlistPanel } from './WatchlistPanel';
import { useTicketDraft } from './ticket-draft';
import { useTradeSession } from './trade-session';
import { MobileMarketBar } from './workstation/MobileMarketBar';
import { NavRail } from './workstation/NavRail';
import { WorkstationDock } from './workstation/WorkstationDock';
import { WorkstationShell } from './workstation/WorkstationShell';
import { WorkstationStatusBar } from './workstation/WorkstationStatusBar';
import type { WorkstationAccountOption } from './workstation/WorkstationAccountSwitcher';

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
 * The composed callbacks below all read `selectedSymbolRef` / `draftRef`
 * rather than capturing render-scoped values, so their identity never
 * changes and neither the chart nor the dock re-renders because someone
 * typed in the quantity field.
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

  const { draft, draftRef, setters } = useTicketDraft();

  const [oneClickTrading] = useOneClickTrading();
  const oneClickTradingRef = useRef(oneClickTrading);
  oneClickTradingRef.current = oneClickTrading;

  const [tab, setTab] = useState('positions');
  const [ticketOpen, setTicketOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
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

  // The Hub's Performance mission view links here as /trade#payout — this
  // page has tabs, not scroll anchors, so the hash needs to actively switch
  // the tab rather than just be a scroll target.
  useEffect(() => {
    if (window.location.hash === '#payout') setTab('payout');
  }, []);

  const submitMarketOrder = useCallback(
    (side: 'buy' | 'sell') => {
      const { quantity, stopLoss, takeProfit } = draftRef.current;
      commands.openPosition({
        symbol: selectedSymbolRef.current,
        side,
        quantity,
        stopLoss,
        takeProfit,
      });
    },
    [commands, draftRef],
  );

  const submitPendingOrder = useCallback(
    (orderType: PendingOrderType, triggerPrice: string) => {
      const { quantity, stopLoss, takeProfit } = draftRef.current;
      commands.createPendingOrder({
        symbol: selectedSymbolRef.current,
        orderType,
        quantity,
        triggerPrice,
        stopLoss,
        takeProfit,
      });
    },
    [commands, draftRef],
  );

  // The ticket's Buy/Sell buttons route to openPosition when orderKind is
  // 'market' and to createPendingOrder otherwise — submitted directly, same
  // as market orders from the ticket, no extra confirmation step (a
  // deliberate multi-field ticket submission is already the confirmation;
  // only the chart's quicker "at this price" shortcut gets
  // PendingOrderConfirm, mirroring QuickOrderConfirm).
  const submitTicket = useCallback(
    (side: 'buy' | 'sell') => {
      const { orderKind, triggerPrice } = draftRef.current;
      if (orderKind === 'market') {
        submitMarketOrder(side);
      } else {
        submitPendingOrder(pendingOrderTypeFor(orderKind, side), triggerPrice.trim());
      }
    },
    [draftRef, submitMarketOrder, submitPendingOrder],
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
  const requestPayout = useCallback(
    () => commands.requestPayout(payoutAmount),
    [commands, payoutAmount],
  );

  const executionPanel = (
    <ExecutionPanel
      store={tickStore}
      symbol={selectedSymbol}
      spec={symbolSpecs[selectedSymbol]}
      accountPublicId={accountPublicId}
      draft={draft}
      setters={setters}
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
            onSelectSymbol={setSelectedSymbol}
          />
        }
        navigator={
          <WatchlistPanel
            store={tickStore}
            symbolSpecs={symbolSpecs}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
          />
        }
        chart={
          <ChartWorkspace
            store={tickStore}
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
          <Button variant="secondary" className="w-full" onClick={() => setTicketOpen(true)}>
            Trader {selectedSymbol}
          </Button>
        }
        execution={executionPanel}
        dock={
          <WorkstationDock
            store={tickStore}
            snapshot={snapshot}
            symbolSpecs={symbolSpecs}
            tab={tab}
            onTabChange={setTab}
            pending={session.pending}
            payoutAmount={payoutAmount}
            payoutAmountError={session.payoutAmountError}
            onPayoutAmountChange={setPayoutAmount}
            onRequestPayout={requestPayout}
            onClosePosition={commands.closePosition}
            onModifyPosition={openModifyPosition}
            onPartialClosePosition={openPartialClose}
            onOpenCloseAll={openCloseAllDialog}
            onManagePendingOrder={openManagePendingOrder}
            onCancelPendingOrder={commands.cancelPendingOrder}
          />
        }
      />

      <BottomSheet
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
        title={`Trader ${selectedSymbol}`}
      >
        {ticketOpen ? executionPanel : null}
      </BottomSheet>

      <TradeDialogs
        store={tickStore}
        snapshot={snapshot}
        symbolSpecs={symbolSpecs}
        selectedSymbol={selectedSymbol}
        accountPublicId={accountPublicId}
        draft={draft}
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
