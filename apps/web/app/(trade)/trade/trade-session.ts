'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  accountStateChannel,
  accountOrdersChannel,
  accountPositionsChannel,
  marketSymbolChannel,
  userNotificationsChannel,
  TRADABLE_SYMBOLS,
  type AccountRisk,
  type AccountSnapshot,
  type AlertNotificationDTO,
  type AlertResultMessage,
  type CloseAllMessage,
  type MarketTick,
  type NewAlertNotificationMessage,
  type NotificationsSnapshotMessage,
  type OrderResultMessage,
  type PayoutResultMessage,
  type PendingOrderResultMessage,
  type PendingOrderType,
  type PriceAlertDTO,
  type SubmitOrderMessage,
  type SymbolSpec,
  type TradableSymbol,
} from '@wariba/contracts';
import { RealtimeClient, type RealtimeConnectionState } from '../../../lib/realtime-client';
import { createSupabaseBrowserClient } from '../../../lib/supabase/browser';
import type { CloseAllOutcome } from './CloseAllDialog';
import type { ModifyPendingOrderParams } from './ModifyPendingOrderDialog';
import type { CreateAlertParams } from './NotificationCenter';
import type { OrderRejectionDetail } from './OrderTicket';
import { createTickStore, type TickStore } from './tick-store';
import type { FillMarker } from './TradeChart';
import { ORDER_TYPE_LABEL } from './trade-labels';
import { rejectionDetailFor, rejectionFor } from './trade-copy';
import {
  applyPayoutResult,
  requestPayoutCommand,
  type PayoutSessionEffects,
} from '../../../lib/payout-session';

async function getAccessToken(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export interface PendingRiskAction {
  positionId: string;
  field: 'stop_loss' | 'take_profit';
}

export interface PendingOrderAction {
  kind: 'pending_order' | 'alert';
  id: string;
}

export interface OpenPositionParams {
  symbol: TradableSymbol;
  side: 'buy' | 'sell';
  quantity: string;
  stopLoss: string;
  takeProfit: string;
}

export interface CreatePendingOrderParams {
  symbol: TradableSymbol;
  orderType: PendingOrderType;
  quantity: string;
  triggerPrice: string;
  stopLoss: string;
  takeProfit: string;
}

/**
 * Every server-facing command WariX can issue. The object identity is stable
 * for the lifetime of an account connection — it closes over refs, never over
 * render-scoped values — so passing it through the workstation tree never
 * makes a consumer re-render.
 *
 * Symbol / quantity / SL / TP are explicit parameters rather than captured
 * state: the ticket draft lives in the market workspace (W1 §3), and a command
 * layer that captured it would have to be rebuilt on every keystroke.
 */
export interface TradeCommands {
  openPosition(params: OpenPositionParams): void;
  createPendingOrder(params: CreatePendingOrderParams): void;
  modifyPendingOrder(params: ModifyPendingOrderParams): void;
  cancelPendingOrder(pendingOrderId: string): void;
  closePosition(positionId: string): void;
  partialClose(params: { positionId: string; quantity: string }): void;
  modifyPositionRisk(params: {
    positionId: string;
    field: 'stop_loss' | 'take_profit';
    value: string | null;
  }): void;
  closeAll(): void;
  queueReduction(params: { positionId: string; mode: 'partial' | 'full'; quantity?: string }): void;
  cancelQueuedReduction(queueId: string): void;
  createAlert(params: CreateAlertParams): void;
  modifyAlertThreshold(params: { alertId: string; thresholdPrice: string }): void;
  enableAlert(alertId: string): void;
  disableAlert(alertId: string): void;
  deleteAlert(alertId: string): void;
  markAllNotificationsRead(): void;
  requestPayout(amount: string): void;
}

export interface TradeSession {
  tickStore: TickStore;
  connectionState: RealtimeConnectionState;
  connectionOk: boolean;
  isResyncing: boolean;
  snapshot: AccountSnapshot | null;
  risk: AccountRisk | null;
  symbolSpecs: Partial<Record<TradableSymbol, SymbolSpec>>;
  fills: FillMarker[];
  pending: boolean;
  orderError: string | null;
  rejection: OrderRejectionDetail | null;
  pendingRiskAction: PendingRiskAction | null;
  pendingOrderAction: PendingOrderAction | null;
  rejectedOrderAction: PendingOrderAction | null;
  closeAllResult: CloseAllOutcome[] | null;
  clearCloseAllResult(): void;
  statusAnnouncement: string;
  alerts: PriceAlertDTO[];
  notifications: AlertNotificationDTO[];
  unreadCount: number;
  payoutAmountError: string | null;
  setPayoutAmountError(message: string | null): void;
  commands: TradeCommands;
}

/**
 * WariX's transport + authoritative-state controller.
 *
 * Extracted from TradeClient in W1 Phase A as a behaviour-preserving move: the
 * websocket effect, the idempotency/replay bookkeeping and every command
 * handler below are the certified Prompt 07/08 implementations, relocated
 * rather than rewritten. What changed is ownership — this hook no longer knows
 * anything about layout, dialogs, the selected symbol or the ticket draft, and
 * it deliberately subscribes to **no** market tick, so a tick can never reach
 * the workstation's chrome through it.
 */
export function useTradeSession({
  accountId,
  userId,
  wsUrl,
}: {
  accountId: string;
  userId: string;
  wsUrl: string;
}): TradeSession {
  const clientRef = useRef<RealtimeClient | null>(null);
  const pendingCommandRef = useRef<
    | { kind: 'order'; payload: SubmitOrderMessage }
    | { kind: 'close_all'; payload: CloseAllMessage }
    | null
  >(null);
  // Keyed by the sub-order's own id (not pushed to an array) — a
  // resubscribe-triggered retry (see the account.snapshot handler below) can
  // replay the same idempotent close_all outcome, and this must converge to
  // the true position count rather than double-count a replay.
  const closeAllTrackerRef = useRef<{
    idempotencyKey: string;
    expectedCount: number;
    outcomes: Map<string, CloseAllOutcome>;
  } | null>(null);
  // Ticks live outside React state — see tick-store.ts's doc comment. A
  // stable, lazily-created store instance for this connection's lifetime.
  const [tickStore] = useState(() => createTickStore());
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('connecting');
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [symbolSpecs, setSymbolSpecs] = useState<Partial<Record<TradableSymbol, SymbolSpec>>>({});
  const [pending, setPending] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [pendingRiskAction, setPendingRiskAction] = useState<PendingRiskAction | null>(null);
  const [pendingOrderAction, setPendingOrderAction] = useState<PendingOrderAction | null>(null);
  const [rejectedOrderAction, setRejectedOrderAction] = useState<PendingOrderAction | null>(null);
  const rejectedOrderActionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState('');
  const [closeAllResult, setCloseAllResult] = useState<CloseAllOutcome[] | null>(null);
  const [fills, setFills] = useState<FillMarker[]>([]);
  const [alerts, setAlerts] = useState<PriceAlertDTO[]>([]);
  const [notifications, setNotifications] = useState<AlertNotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [payoutAmountError, setPayoutAmountError] = useState<string | null>(null);

  // WariX's side of the shared payout semantics (lib/payout-session.ts). Held
  // in a ref so both the once-per-connection message handler and the stable
  // command object can reach it without either being rebuilt.
  const payoutEffectsRef = useRef<PayoutSessionEffects>({
    setPending,
    setPayoutAmountError,
    announce: setStatusAnnouncement,
    // WariX shares one `orderError` channel across every command, and issuing
    // a payout has always cleared it.
    clearCommandError: () => setOrderError(null),
  });

  // Refs the stable command layer reads instead of capturing render-scoped
  // state — same reasoning as pendingCommandRef, applied to the two values
  // (open-position count, unread notifications) a command needs at call time.
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;
  // The WS message handler below lives inside a useEffect that only runs
  // once per connection (see clientRef.current = client below), so it reads
  // pendingOrderAction through this ref rather than the state directly —
  // same reasoning as pendingCommandRef elsewhere in this file.
  const pendingOrderActionRef = useRef(pendingOrderAction);
  useEffect(() => {
    pendingOrderActionRef.current = pendingOrderAction;
  }, [pendingOrderAction]);

  // Appendix 07-D acceptance gate 4 — "server rejected and reverted": shown
  // for a fixed window, then cleared, rather than left to linger until some
  // other interaction happens to reset it.
  const flashRejectedOrderAction = useCallback((kind: 'pending_order' | 'alert') => {
    const current = pendingOrderActionRef.current;
    if (!current || current.kind !== kind) return;
    if (rejectedOrderActionTimeoutRef.current) clearTimeout(rejectedOrderActionTimeoutRef.current);
    setRejectedOrderAction(current);
    rejectedOrderActionTimeoutRef.current = setTimeout(() => setRejectedOrderAction(null), 2500);
  }, []);

  useEffect(() => {
    const client = new RealtimeClient(wsUrl, getAccessToken);
    clientRef.current = client;

    const offState = client.onStateChange(setConnectionState);
    const offMessage = client.onMessage((envelope) => {
      if (envelope.type === 'account.snapshot') {
        const nextSnapshot = envelope.payload as AccountSnapshot;
        setSnapshot(nextSnapshot);
        // Merge, don't replace: recentFills is close-only, so a full replace
        // would erase any 'open' marker order_result just added — every
        // resubscribe-triggered snapshot (the order_result branch below fires
        // one after *every* order_result) would otherwise wipe the
        // just-opened position's marker within one round trip.
        setFills((prev) => {
          const localOpens = prev.filter((fill) => fill.effect === 'open');
          const serverCloses = nextSnapshot.recentFills.map((fill) => ({
            id: fill.id,
            symbol: fill.symbol,
            time: Math.floor(new Date(fill.occurredAt).getTime() / 1_000),
            price: Number(fill.price),
            side: fill.side,
            effect: fill.fillType,
          }));
          const closeIds = new Set(serverCloses.map((fill) => fill.id));
          return [...localOpens.filter((fill) => !closeIds.has(fill.id)), ...serverCloses];
        });
        const pendingCommand = pendingCommandRef.current;
        if (pendingCommand) {
          const key = pendingCommand.payload.idempotencyKey;
          if (pendingCommand.kind === 'close_all') {
            // The close-all *master* order commits (and appears in
            // recentOrders) before any of its N sub-orders' order_result
            // broadcasts go out — matching on the master row alone (as a
            // single-order command's key does below) would treat the batch
            // as "processed" after zero sub-results, orphaning
            // closeAllTrackerRef before it ever reaches expectedCount and
            // leaving the dialog's spinner off with no result shown. Count
            // actual sub-orders (idempotencyKey prefixed `${key}:`) instead,
            // and reconstruct the tracker's outcomes from them so a
            // reconnect-triggered resync can still resolve the dialog even
            // if the original order_result broadcasts were missed.
            const subOrders = nextSnapshot.recentOrders.filter((order) =>
              order.idempotencyKey.startsWith(`${key}:`),
            );
            const tracker = closeAllTrackerRef.current;
            if (tracker) {
              for (const order of subOrders) {
                tracker.outcomes.set(order.id, {
                  symbol: order.symbol,
                  status: order.status === 'filled' ? 'filled' : 'rejected',
                  rejectionCode: order.rejectionCode,
                });
              }
              if (tracker.outcomes.size >= tracker.expectedCount) {
                pendingCommandRef.current = null;
                setPending(false);
                setCloseAllResult([...tracker.outcomes.values()]);
                closeAllTrackerRef.current = null;
              } else {
                clientRef.current?.closeAll(pendingCommand.payload);
              }
            }
          } else {
            const wasProcessed = nextSnapshot.recentOrders.some(
              (order) => order.idempotencyKey === key || order.idempotencyKey.startsWith(`${key}:`),
            );
            if (wasProcessed) {
              pendingCommandRef.current = null;
              setPending(false);
            } else {
              clientRef.current?.submitOrder(pendingCommand.payload);
            }
          }
        }
      } else if (envelope.type === 'market.tick') {
        tickStore.update(envelope.payload as MarketTick);
      } else if (envelope.type === 'symbol_specs') {
        // Static for the session (services/realtime sends this once, right
        // after account.snapshot on the initial state-channel subscribe).
        const { specs } = envelope.payload as { specs: SymbolSpec[] };
        setSymbolSpecs(
          Object.fromEntries(specs.map((spec) => [spec.symbol, spec])) as Partial<
            Record<TradableSymbol, SymbolSpec>
          >,
        );
      } else if (envelope.type === 'account.risk_preview') {
        // Throttled server push (services/realtime) — only equity/risk change
        // here, positions/orders/balance stay whatever the last real
        // account.snapshot said (see accountRiskPreviewMessageSchema's doc
        // comment for why this is a separate, untracked message type).
        const preview = envelope.payload as {
          accountId: string;
          equity: string;
          risk: AccountRisk | null;
        };
        setSnapshot((prev) =>
          prev && prev.accountId === preview.accountId
            ? { ...prev, equity: preview.equity, risk: preview.risk }
            : prev,
        );
      } else if (envelope.type === 'order_result') {
        const result = envelope.payload as OrderResultMessage;
        const pendingCommand = pendingCommandRef.current;
        const tracker = closeAllTrackerRef.current;
        const isCloseAllResult =
          pendingCommand?.kind === 'close_all' &&
          pendingCommand.payload.idempotencyKey === result.idempotencyKey &&
          tracker !== null &&
          Boolean(result.order);

        if (isCloseAllResult && result.order) {
          tracker.outcomes.set(result.order.id, {
            symbol: result.order.symbol,
            status: result.status,
            rejectionCode: result.rejectionCode,
          });
          if (tracker.outcomes.size >= tracker.expectedCount) {
            pendingCommandRef.current = null;
            setPending(false);
            setCloseAllResult([...tracker.outcomes.values()]);
            closeAllTrackerRef.current = null;
          }
        } else {
          if (pendingCommand?.payload.idempotencyKey === result.idempotencyKey) {
            pendingCommandRef.current = null;
            setPending(false);
          }
          if (result.status === 'rejected') {
            setOrderError(result.rejectionCode ?? 'unknown_error');
            setStatusAnnouncement(`Refusé : ${rejectionDetailFor(result.rejectionCode).reason}`);
          } else {
            setOrderError(null);
            if (result.order) {
              setStatusAnnouncement(`${ORDER_TYPE_LABEL[result.order.orderType]} confirmé.`);
            }
          }
        }
        if (result.fill) {
          const fill = result.fill;
          // A resubscribe-triggered retry (the account.snapshot handler
          // above) can resend an already-processed order — the server
          // replays the same idempotent outcome, fill included, so dedupe
          // on the fill's own id rather than blindly appending.
          setFills((prev) =>
            prev.some((f) => f.id === fill.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: fill.id,
                    symbol: fill.symbol,
                    time: Math.floor(new Date(fill.occurredAt).getTime() / 1000),
                    price: Number(fill.price),
                    side: fill.side,
                    effect: fill.fillType,
                  },
                ],
          );
        }
        // Server always answers a (re)subscribe with a fresh full snapshot —
        // simplest correct way to pick up the new position/order/balance.
        client.resync([accountStateChannel(accountId)]);
      } else if (envelope.type === 'queue_reduction_result') {
        // Prompt 7 Appendix 07-C §12 — submit/cancel response for the
        // stale-market reduction queue. No pendingCommandRef tracking here
        // (unlike order_result): the server already dedupes a queue
        // submission by idempotency key on its own, so a dropped connection
        // before this arrives just means the user retries manually, same as
        // any other unacknowledged action before that machinery existed —
        // never a double-execution risk (closePosition's own quantity/status
        // checks still apply at execution time regardless of how many queue
        // rows point at the same position).
        setPending(false);
        const result = envelope.payload as { status: string; rejectionCode: string | null };
        if (result.status === 'rejected') {
          setOrderError(result.rejectionCode ?? 'unknown_error');
          setStatusAnnouncement(`Refusé : ${rejectionDetailFor(result.rejectionCode).reason}`);
        } else {
          setOrderError(null);
          setStatusAnnouncement(
            result.status === 'cancelled'
              ? 'Demande en attente annulée.'
              : 'Réduction mise en file d’attente, en attente d’un prix à jour.',
          );
        }
        client.resync([accountStateChannel(accountId)]);
      } else if (envelope.type === 'pending_order_result') {
        // No pendingCommandRef/resubscribe-replay tracking here — same
        // reasoning as queue_reduction_result above: createPendingOrder's
        // own idempotency key already makes a client-side double-send safe
        // server-side, so a dropped connection just means a manual retry,
        // never a silent double order. The updated pending-order list
        // itself arrives on the next account.snapshot (pendingOrders field).
        setPending(false);
        const result = envelope.payload as PendingOrderResultMessage;
        if (result.status === 'rejected') {
          setOrderError(result.rejectionCode ?? 'unknown_error');
          setStatusAnnouncement(`Refusé : ${rejectionDetailFor(result.rejectionCode).reason}`);
          flashRejectedOrderAction('pending_order');
        } else {
          setOrderError(null);
          setStatusAnnouncement('Ordre en attente mis à jour.');
        }
        client.resync([accountStateChannel(accountId)]);
      } else if (envelope.type === 'alert_result') {
        // Re-subscribing for a fresh notifications.snapshot (rather than
        // upserting `result.alert` into local state) sidesteps an otherwise
        // real bug: deletePriceAlert's own result also carries the
        // (now-deleted) alert's last-known data, so a naive upsert would
        // resurrect a just-deleted alert in the UI. Same "resubscribe for
        // truth" convention order_result/queue_reduction_result already use.
        setPending(false);
        const result = envelope.payload as AlertResultMessage;
        if (result.status === 'rejected') {
          setOrderError(result.rejectionCode ?? 'unknown_error');
          setStatusAnnouncement(`Refusé : ${rejectionDetailFor(result.rejectionCode).reason}`);
          flashRejectedOrderAction('alert');
        } else {
          setOrderError(null);
          setStatusAnnouncement('Alerte mise à jour.');
        }
        client.resync([userNotificationsChannel(userId)]);
      } else if (envelope.type === 'payout_result') {
        // One canonical reading of payout_result, shared with /payouts
        // (W2 §16) — see lib/payout-session.ts.
        applyPayoutResult(
          client,
          accountId,
          envelope.payload as PayoutResultMessage,
          payoutEffectsRef.current,
        );
      } else if (envelope.type === 'notifications.snapshot') {
        const notificationsSnapshot = envelope.payload as NotificationsSnapshotMessage;
        setAlerts(notificationsSnapshot.alerts);
        setNotifications(notificationsSnapshot.notifications);
        setUnreadCount(notificationsSnapshot.unreadCount);
      } else if (envelope.type === 'notification.new') {
        const { notification } = envelope.payload as NewAlertNotificationMessage;
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((count) => count + 1);
        setStatusAnnouncement(
          `Alerte déclenchée : ${notification.symbol} à ${notification.triggeringPrice}.`,
        );
      } else if (envelope.type === 'error') {
        pendingCommandRef.current = null;
        setPending(false);
        const payload = envelope.payload as { code: string; message: string };
        setOrderError(payload.code);
      }
    });

    void client.connect().then(() => {
      client.subscribe([
        accountStateChannel(accountId),
        accountOrdersChannel(accountId),
        accountPositionsChannel(accountId),
        userNotificationsChannel(userId),
        ...TRADABLE_SYMBOLS.map((s) => marketSymbolChannel(s)),
      ]);
    });

    return () => {
      offState();
      offMessage();
      client.close();
    };
  }, [accountId, userId, wsUrl, tickStore, flashRejectedOrderAction]);

  // Settles (success or rejection) the same instant `pending` itself does.
  // pendingRiskAction / pendingOrderAction drive the PENDING_SERVER marker on
  // exactly the handle the command came from (Appendix 07-C/07-D), so they
  // must clear on the same edge as the command itself.
  useEffect(() => {
    if (!pending) {
      setPendingRiskAction(null);
      setPendingOrderAction(null);
    }
  }, [pending]);

  useEffect(
    () => () => {
      if (rejectedOrderActionTimeoutRef.current)
        clearTimeout(rejectedOrderActionTimeoutRef.current);
    },
    [],
  );

  const commands = useMemo<TradeCommands>(() => {
    const begin = () => {
      setPending(true);
      setOrderError(null);
    };
    const trackedOrder = (command: SubmitOrderMessage) => {
      pendingCommandRef.current = { kind: 'order', payload: command };
      clientRef.current?.submitOrder(command);
    };

    return {
      openPosition({ symbol, side, quantity, stopLoss, takeProfit }) {
        if (!clientRef.current) return;
        begin();
        trackedOrder({
          orderType: 'market_open',
          accountId,
          idempotencyKey: crypto.randomUUID(),
          symbol,
          side,
          quantity,
          ...(stopLoss.trim() ? { stopLoss: stopLoss.trim() } : {}),
          ...(takeProfit.trim() ? { takeProfit: takeProfit.trim() } : {}),
        });
      },
      createPendingOrder({ symbol, orderType, quantity, triggerPrice, stopLoss, takeProfit }) {
        if (!clientRef.current) return;
        begin();
        clientRef.current.createPendingOrder({
          accountId,
          idempotencyKey: crypto.randomUUID(),
          symbol,
          orderType,
          quantity,
          triggerPrice,
          ...(stopLoss.trim() ? { stopLoss: stopLoss.trim() } : {}),
          ...(takeProfit.trim() ? { takeProfit: takeProfit.trim() } : {}),
        });
      },
      modifyPendingOrder(params) {
        if (!clientRef.current) return;
        begin();
        setPendingOrderAction({ kind: 'pending_order', id: params.pendingOrderId });
        clientRef.current.modifyPendingOrder({ accountId, ...params });
      },
      cancelPendingOrder(pendingOrderId) {
        if (!clientRef.current) return;
        begin();
        clientRef.current.cancelPendingOrder({ accountId, pendingOrderId });
      },
      closePosition(positionId) {
        if (!clientRef.current) return;
        setPending(true);
        trackedOrder({
          orderType: 'full_close',
          accountId,
          idempotencyKey: crypto.randomUUID(),
          positionId,
        });
      },
      partialClose({ positionId, quantity }) {
        if (!clientRef.current) return;
        begin();
        trackedOrder({
          orderType: 'partial_close',
          accountId,
          idempotencyKey: crypto.randomUUID(),
          positionId,
          quantity,
        });
      },
      modifyPositionRisk({ positionId, field, value }) {
        if (!clientRef.current) return;
        begin();
        setPendingRiskAction({ positionId, field });
        trackedOrder(
          field === 'stop_loss'
            ? {
                orderType: 'modify_sl',
                accountId,
                idempotencyKey: crypto.randomUUID(),
                positionId,
                stopLoss: value,
              }
            : {
                orderType: 'modify_tp',
                accountId,
                idempotencyKey: crypto.randomUUID(),
                positionId,
                takeProfit: value,
              },
        );
      },
      closeAll() {
        const current = snapshotRef.current;
        if (!clientRef.current || !current || current.openPositions.length === 0) return;
        const command: CloseAllMessage = { accountId, idempotencyKey: crypto.randomUUID() };
        closeAllTrackerRef.current = {
          idempotencyKey: command.idempotencyKey,
          expectedCount: current.openPositions.length,
          outcomes: new Map(),
        };
        setCloseAllResult(null);
        setPending(true);
        pendingCommandRef.current = { kind: 'close_all', payload: command };
        clientRef.current.closeAll(command);
      },
      queueReduction({ positionId, mode, quantity }) {
        if (!clientRef.current) return;
        begin();
        clientRef.current.queueReduction({
          accountId,
          idempotencyKey: crypto.randomUUID(),
          positionId,
          mode,
          ...(quantity !== undefined ? { quantity } : {}),
        });
      },
      cancelQueuedReduction(queueId) {
        if (!clientRef.current) return;
        begin();
        clientRef.current.cancelQueuedReduction({ accountId, queueId });
      },
      createAlert(params) {
        if (!clientRef.current) return;
        begin();
        clientRef.current.createPriceAlert({ ...params, idempotencyKey: crypto.randomUUID() });
      },
      modifyAlertThreshold(params) {
        if (!clientRef.current) return;
        begin();
        setPendingOrderAction({ kind: 'alert', id: params.alertId });
        clientRef.current.modifyPriceAlert(params);
      },
      enableAlert(alertId) {
        if (!clientRef.current) return;
        begin();
        clientRef.current.enablePriceAlert({ alertId });
      },
      disableAlert(alertId) {
        if (!clientRef.current) return;
        begin();
        clientRef.current.disablePriceAlert({ alertId });
      },
      deleteAlert(alertId) {
        if (!clientRef.current) return;
        begin();
        clientRef.current.deletePriceAlert({ alertId });
      },
      // No server broadcast follows mark_notifications_read (unlike every
      // other command here) — it's a pure read-state update with no financial
      // or execution effect, so the client applies it optimistically rather
      // than waiting on a round trip; a fresh notifications.snapshot on the
      // next resubscribe/reconnect is still the eventual source of truth.
      markAllNotificationsRead() {
        if (!clientRef.current) return;
        const unreadIds = notificationsRef.current
          .filter((n) => n.readAt === null)
          .map((n) => n.id);
        if (unreadIds.length === 0) return;
        const now = new Date().toISOString();
        clientRef.current.markNotificationsRead({ notificationIds: unreadIds });
        setNotifications((prev) =>
          prev.map((n) => (n.readAt === null ? { ...n, readAt: now } : n)),
        );
        setUnreadCount(0);
      },
      // The trader picks the amount (Prompt 08 §5) — this only rejects a
      // non-positive figure client-side, the same shortcut
      // invalid_requested_amount guards against server-side. Everything else
      // (buffer/days/consistency/open position/pending order/KYC/payout
      // method) is PayoutCenterPanel's own proactive disable via
      // performanceProgress, never re-checked here.
      requestPayout(amount) {
        requestPayoutCommand(clientRef.current, accountId, amount, payoutEffectsRef.current);
      },
    };
  }, [accountId]);

  const clearCloseAllResult = useCallback(() => setCloseAllResult(null), []);

  return {
    tickStore,
    connectionState,
    connectionOk: connectionState === 'open',
    isResyncing: connectionState === 'resyncing',
    snapshot,
    risk: snapshot?.risk ?? null,
    symbolSpecs,
    fills,
    pending,
    orderError,
    rejection: rejectionFor(orderError),
    pendingRiskAction,
    pendingOrderAction,
    rejectedOrderAction,
    closeAllResult,
    clearCloseAllResult,
    statusAnnouncement,
    alerts,
    notifications,
    unreadCount,
    payoutAmountError,
    setPayoutAmountError,
    commands,
  };
}
