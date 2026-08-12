'use client';

import { memo } from 'react';
import type {
  AccountSnapshot,
  AlertNotificationDTO,
  PendingOrderType,
  PriceAlertDTO,
  SymbolSpec,
  TradableSymbol,
} from '@wariba/contracts';
import { CloseAllDialog, type CloseAllOutcome } from './CloseAllDialog';
import {
  ModifyPendingOrderDialog,
  type ModifyPendingOrderParams,
} from './ModifyPendingOrderDialog';
import { ModifyPositionDialog } from './ModifyPositionDialog';
import { NotificationCenter, type CreateAlertParams } from './NotificationCenter';
import { PartialCloseSheet } from './PartialCloseSheet';
import { PendingOrderConfirm } from './PendingOrderConfirm';
import { QuickOrderConfirm } from './QuickOrderConfirm';
import type { OrderRejectionDetail } from './execution/execution-contract';
import { useTicketDraft, type TicketDraftStore } from './ticket-draft';
import { useTick, type TickStore } from './tick-store';

export interface TradeDialogState {
  closeAllOpen: boolean;
  modifyPositionId: string | null;
  quickOrderSide: 'buy' | 'sell' | null;
  partialClosePositionId: string | null;
  pendingOrderRequest: { orderType: PendingOrderType; triggerPrice: string } | null;
  managePendingOrderId: string | null;
  notificationCenterOpen: boolean;
}

export interface TradeDialogActions {
  closeCloseAll(): void;
  confirmCloseAll(): void;
  closeModifyPosition(): void;
  submitPositionRisk(params: {
    positionId: string;
    field: 'stop_loss' | 'take_profit';
    value: string | null;
  }): void;
  closeQuickOrder(): void;
  confirmQuickOrder(): void;
  closePartialClose(): void;
  submitPartialClose(params: { positionId: string; quantity: string }): void;
  submitFullClose(positionId: string): void;
  queueReduction(params: { positionId: string; mode: 'partial' | 'full'; quantity?: string }): void;
  cancelQueuedReduction(queueId: string): void;
  closePendingOrderRequest(): void;
  confirmPendingOrderRequest(): void;
  closeManagePendingOrder(): void;
  submitModifyPendingOrder(params: ModifyPendingOrderParams): void;
  cancelPendingOrder(pendingOrderId: string): void;
  closeNotificationCenter(): void;
  markAllNotificationsRead(): void;
  enableAlert(alertId: string): void;
  disableAlert(alertId: string): void;
  deleteAlert(alertId: string): void;
  createAlert(params: CreateAlertParams): void;
}

export interface TradeDialogsProps {
  store: TickStore;
  snapshot: AccountSnapshot | null;
  symbolSpecs: Partial<Record<TradableSymbol, SymbolSpec>>;
  selectedSymbol: TradableSymbol;
  accountPublicId: string;
  /**
   * The live ticket draft, read only by the two confirmation dialogs that
   * restate it — and only while one of them is mounted (see the hosts below).
   */
  draftStore: TicketDraftStore;
  pending: boolean;
  rejection: OrderRejectionDetail | null;
  closeAllResult: CloseAllOutcome[] | null;
  alerts: PriceAlertDTO[];
  notifications: AlertNotificationDTO[];
  unreadCount: number;
  state: TradeDialogState;
  actions: TradeDialogActions;
}

/**
 * A partial close can be opened for a position on a symbol other than the one
 * currently selected on the chart (e.g. from that position's own row action),
 * so it must track *that* position's symbol — not the chart's.
 */
const PartialCloseSheetHost = memo(function PartialCloseSheetHost({
  store,
  symbol,
  ...rest
}: { store: TickStore; symbol: TradableSymbol } & Omit<
  React.ComponentProps<typeof PartialCloseSheet>,
  'tick'
>) {
  return <PartialCloseSheet {...rest} tick={useTick(store, symbol)} />;
});

/**
 * The two confirmation dialogs restate the ticket the trader is about to send,
 * so they — and only they — subscribe to the draft store. Because
 * `TradeDialogs` mounts each dialog on demand, that subscription exists only
 * while the dialog is open: a keystroke in the quantity field re-renders the
 * Execution Center and, if one is open, the confirmation that quotes it, and
 * nothing else in the document (W4 §68).
 */
const QuickOrderConfirmHost = memo(function QuickOrderConfirmHost({
  store,
  draftStore,
  ...rest
}: { store: TickStore; draftStore: TicketDraftStore } & Omit<
  React.ComponentProps<typeof QuickOrderConfirm>,
  'tick' | 'quantity' | 'stopLoss' | 'takeProfit'
>) {
  const draft = useTicketDraft(draftStore);
  return (
    <QuickOrderConfirm
      {...rest}
      quantity={draft.quantity}
      stopLoss={draft.stopLoss}
      takeProfit={draft.takeProfit}
      tick={useTick(store, rest.symbol)}
    />
  );
});

const PendingOrderConfirmHost = memo(function PendingOrderConfirmHost({
  store,
  draftStore,
  ...rest
}: { store: TickStore; draftStore: TicketDraftStore } & Omit<
  React.ComponentProps<typeof PendingOrderConfirm>,
  'tick' | 'quantity' | 'stopLoss' | 'takeProfit'
>) {
  const draft = useTicketDraft(draftStore);
  return (
    <PendingOrderConfirm
      {...rest}
      quantity={draft.quantity}
      stopLoss={draft.stopLoss}
      takeProfit={draft.takeProfit}
      tick={useTick(store, rest.symbol)}
    />
  );
});

/**
 * Every WariX dialog, in one place, **mounted only while open**.
 *
 * That conditional mount is the point, not a detail. Before W1 all six
 * dialogs were rendered unconditionally inside TradeClient, and two of them
 * (`ModifyPositionDialog`, `ModifyPendingOrderDialog`) call
 * `useTick(store, position?.symbol ?? 'EURUSD')` — so a closed dialog held a
 * live EURUSD subscription and re-rendered on every tick of a symbol its
 * trader might not even be looking at. Mounting on demand removes the
 * subscription along with the dialog, which is what W1 §17 means by closed
 * dialogs not re-rendering: no `memo()` can fix a subscription that should
 * not exist.
 *
 * The confirmation flows themselves (PartialCloseSheet, CloseAllDialog,
 * ModifyPositionDialog, ModifyPendingOrderDialog, QuickOrderConfirm,
 * PendingOrderConfirm) are untouched — W0's preserve list.
 */
export const TradeDialogs = memo(function TradeDialogs({
  store,
  snapshot,
  symbolSpecs,
  selectedSymbol,
  accountPublicId,
  draftStore,
  pending,
  rejection,
  closeAllResult,
  alerts,
  notifications,
  unreadCount,
  state,
  actions,
}: TradeDialogsProps) {
  const partialClosePosition =
    snapshot?.openPositions.find((p) => p.id === state.partialClosePositionId) ?? null;

  return (
    <>
      {state.closeAllOpen ? (
        <CloseAllDialog
          open
          onClose={actions.closeCloseAll}
          onConfirm={actions.confirmCloseAll}
          positionCount={snapshot?.openPositions.length ?? 0}
          accountPublicId={accountPublicId}
          pending={pending}
          result={closeAllResult}
        />
      ) : null}

      {state.modifyPositionId !== null ? (
        <ModifyPositionDialog
          open
          onClose={actions.closeModifyPosition}
          position={snapshot?.openPositions.find((p) => p.id === state.modifyPositionId) ?? null}
          store={store}
          pending={pending}
          rejection={rejection}
          onSubmit={actions.submitPositionRisk}
        />
      ) : null}

      {state.quickOrderSide !== null ? (
        <QuickOrderConfirmHost
          store={store}
          draftStore={draftStore}
          open
          onClose={actions.closeQuickOrder}
          symbol={selectedSymbol}
          side={state.quickOrderSide}
          spec={symbolSpecs[selectedSymbol] ?? null}
          pending={pending}
          onConfirm={actions.confirmQuickOrder}
        />
      ) : null}

      {/* Rendered on the id alone, not on the position being found: a
          position can close (SL/TP hit, Close All) while its sheet is open,
          and the sheet's own null branch tells the trader "cette position
          n'est plus ouverte" instead of silently vanishing. The tick falls
          back to the selected symbol in that window, exactly as the pre-W1
          `partialCloseTick` did. */}
      {state.partialClosePositionId !== null ? (
        <PartialCloseSheetHost
          store={store}
          symbol={partialClosePosition?.symbol ?? selectedSymbol}
          open
          onClose={actions.closePartialClose}
          position={partialClosePosition}
          spec={partialClosePosition ? (symbolSpecs[partialClosePosition.symbol] ?? null) : null}
          pending={pending}
          rejection={rejection}
          queuedReductions={snapshot?.queuedReductions ?? []}
          onSubmitPartialClose={actions.submitPartialClose}
          onSubmitFullClose={actions.submitFullClose}
          onQueueReduction={actions.queueReduction}
          onCancelQueuedReduction={actions.cancelQueuedReduction}
        />
      ) : null}

      {state.pendingOrderRequest !== null ? (
        <PendingOrderConfirmHost
          store={store}
          draftStore={draftStore}
          open
          onClose={actions.closePendingOrderRequest}
          symbol={selectedSymbol}
          orderType={state.pendingOrderRequest.orderType}
          triggerPrice={state.pendingOrderRequest.triggerPrice}
          spec={symbolSpecs[selectedSymbol] ?? null}
          pending={pending}
          onConfirm={actions.confirmPendingOrderRequest}
        />
      ) : null}

      {state.managePendingOrderId !== null ? (
        <ModifyPendingOrderDialog
          open
          onClose={actions.closeManagePendingOrder}
          order={snapshot?.pendingOrders.find((o) => o.id === state.managePendingOrderId) ?? null}
          store={store}
          pending={pending}
          rejection={rejection}
          onSubmit={actions.submitModifyPendingOrder}
          onCancelOrder={actions.cancelPendingOrder}
        />
      ) : null}

      {state.notificationCenterOpen ? (
        <NotificationCenter
          open
          onClose={actions.closeNotificationCenter}
          symbol={selectedSymbol}
          notifications={notifications}
          unreadCount={unreadCount}
          alerts={alerts}
          pending={pending}
          rejection={rejection}
          onMarkAllRead={actions.markAllNotificationsRead}
          onEnableAlert={actions.enableAlert}
          onDisableAlert={actions.disableAlert}
          onDeleteAlert={actions.deleteAlert}
          onCreateAlert={actions.createAlert}
        />
      ) : null}
    </>
  );
});
