'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Badge,
  BottomSheet,
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  Guardian,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  type BadgeVariant,
  type GuardianConcentrationBucket,
  type RiskRibbonStatus,
} from '@wariba/ui';
import {
  computeDailyLossUsedRatio,
  estimateRequiredMargin,
  isQuantityWithinBounds,
} from '@wariba/domain';
import {
  accountStateChannel,
  accountOrdersChannel,
  accountPositionsChannel,
  marketSymbolChannel,
  userNotificationsChannel,
  TRADABLE_SYMBOLS,
  type AccountRisk,
  type AccountSnapshot,
  type MarketStatus,
  type MarketTick,
  type OrderResultMessage,
  type SubmitOrderMessage,
  type CloseAllMessage,
  type TradableSymbol,
  type SymbolSpec,
  type PositionDTO,
  type FillDTO,
  type OrderDTO,
  type OrderType,
  type PendingOrderDTO,
  type PendingOrderType,
  type PendingOrderResultMessage,
  type PriceAlertDTO,
  type AlertNotificationDTO,
  type AlertResultMessage,
  type NotificationsSnapshotMessage,
  type NewAlertNotificationMessage,
} from '@wariba/contracts';
import { RealtimeClient, type RealtimeConnectionState } from '../../../lib/realtime-client';
import { createSupabaseBrowserClient } from '../../../lib/supabase/browser';
import { useOneClickTrading } from '../../../lib/one-click-trading';
import {
  OrderTicket,
  pendingOrderTypeFor,
  type OrderRejectionDetail,
  type TicketOrderKind,
} from './OrderTicket';
import { CloseAllDialog, type CloseAllOutcome } from './CloseAllDialog';
import { ModifyPositionDialog } from './ModifyPositionDialog';
import { QuickOrderConfirm } from './QuickOrderConfirm';
import { PendingOrderConfirm } from './PendingOrderConfirm';
import {
  ModifyPendingOrderDialog,
  type ModifyPendingOrderParams,
} from './ModifyPendingOrderDialog';
import { NotificationCenter, type CreateAlertParams } from './NotificationCenter';
import { PartialCloseSheet } from './PartialCloseSheet';
import { TradeHeaderPanel } from './TradeHeaderPanel';
import { WatchlistPanel } from './WatchlistPanel';
import { PositionsTabPanel } from './PositionsTabPanel';
import { createTickStore, useTick } from './tick-store';
import type { FillMarker } from './TradeChart';

// lightweight-charts touches the DOM/canvas directly and has no useful
// server-rendered output — Prompt 07's own performance requirement ("chart
// lazy-loaded"), and avoids paying its bundle cost before it's needed.
const TradeChart = dynamic(() => import('./TradeChart').then((m) => m.TradeChart), {
  ssr: false,
});

const MARKET_STATUS_LABEL: Record<MarketStatus, string> = {
  open: 'Ouvert',
  stale: 'Périmé',
  closed: 'Fermé',
};

// UX Architecture §23.3: normal < attention < near-limit < soft-lock, an
// early warning before the actual soft-lock gate (softLockTriggered/status)
// fires. Thresholds aren't specified numerically anywhere in the docs — 50%
// and 80% of today's daily-loss budget used are this component's own choice,
// not a rule figure.
const ATTENTION_THRESHOLD = '0.5';
const NEAR_LIMIT_THRESHOLD = '0.8';

const CONCENTRATION_BUCKET_LABEL: Record<string, string> = {
  forex: 'Forex (EUR/USD, GBP/USD, USD/JPY)',
  xauusd: 'Or (XAUUSD)',
  nas100: 'Indices (NAS100)',
};

// UX Architecture §22.10 — every rejection needs a reason, a code, and a
// possible action, never an ambiguous loss. These are the only rejection
// codes packages/database/src/trading.ts actually produces (REJECTION
// const in trading.ts) — no fabricated codes.
const REJECTION_DETAIL: Record<string, { reason: string; action: string }> = {
  account_not_active: {
    reason:
      'Votre compte n’est plus actif pour trader (blocage temporaire, dépassement de limite, ou statut inactif).',
    action: 'Consultez le Hub pour connaître le statut exact de votre compte.',
  },
  stale_market_data: {
    reason:
      'Le prix pour ce symbole n’était plus à jour au moment où le serveur a traité votre ordre.',
    action: 'Réessayez une fois le prix rafraîchi.',
  },
  invalid_quantity: {
    reason: 'La taille demandée est en dehors des bornes autorisées pour ce symbole.',
    action: 'Ajustez la quantité selon le pas et les bornes indiqués dans le ticket.',
  },
  unknown_symbol_spec: {
    reason: 'Ce symbole n’est pas configuré pour votre compte.',
    action: 'Contactez le support si le problème persiste.',
  },
  exposure_limit_exceeded: {
    reason: 'Cet ordre dépasserait votre exposition maximale autorisée sur ce groupe de symboles.',
    action: 'Réduisez la taille ou fermez une position existante sur ce groupe.',
  },
  short_duration_entry_locked: {
    reason:
      'Les nouvelles ouvertures sont temporairement suspendues après six clôtures profitables sous 60 secondes sur 24 h.',
    action:
      'Vous pouvez réduire ou fermer vos positions. Le verrou se lève lorsque le compteur glissant sur 24 h repasse sous six ; le signal reste disponible pour revue.',
  },
  position_not_found: {
    reason: 'La position visée n’existe plus.',
    action: 'Rafraîchissez vos positions ouvertes.',
  },
  position_already_closed: {
    reason: 'Cette position est déjà fermée.',
    action: 'Rafraîchissez vos positions ouvertes.',
  },
  market_not_stale: {
    reason:
      'Le prix de ce symbole est à jour — la mise en file n’est utile que si le prix est obsolète.',
    action: 'Utilisez la clôture partielle ou totale immédiate à la place.',
  },
  queue_entry_not_found: {
    reason: 'Cette demande en attente n’existe plus.',
    action: 'Rafraîchissez vos positions ouvertes.',
  },
  queue_entry_already_settled: {
    reason: 'Cette demande a déjà été exécutée ou annulée — elle ne peut plus être annulée.',
    action: 'Consultez l’historique pour voir le résultat.',
  },
  invalid_trigger_price: {
    reason:
      'Ce prix de déclenchement ne correspond pas à un ordre en attente valide par rapport au marché actuel.',
    action: 'Ajustez le prix selon le type d’ordre (Limite ou Stop) et le sens choisi.',
  },
  invalid_price_precision: {
    reason: 'Ce prix ne respecte pas la précision décimale de ce symbole.',
    action: 'Ajustez le prix selon la précision indiquée.',
  },
  pending_order_not_found: {
    reason: 'Cet ordre en attente n’existe plus.',
    action: 'Rafraîchissez vos ordres en attente.',
  },
  pending_order_already_settled: {
    reason: 'Cet ordre en attente a déjà été déclenché, exécuté ou annulé.',
    action: 'Consultez l’historique pour voir le résultat.',
  },
  alert_not_found: {
    reason: 'Cette alerte n’existe plus.',
    action: 'Rafraîchissez vos alertes.',
  },
};
const UNKNOWN_REJECTION_DETAIL = {
  reason: 'Le serveur a refusé cet ordre.',
  action: 'Réessayez, ou contactez le support si le problème persiste.',
};

const PENDING_ORDER_TYPE_LABEL: Record<PendingOrderType, string> = {
  buy_limit: 'Achat Limite',
  sell_limit: 'Vente Limite',
  buy_stop: 'Achat Stop',
  sell_stop: 'Vente Stop',
};

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  market_open: 'Ouverture',
  partial_close: 'Clôture partielle',
  full_close: 'Clôture',
  close_all: 'Tout fermer',
  modify_sl: 'Modif. SL',
  modify_tp: 'Modif. TP',
};

const ORDER_STATUS_LABEL: Record<OrderDTO['status'], string> = {
  received: 'Reçu',
  validated: 'Validé',
  accepted: 'Accepté',
  filled: 'Exécuté',
  rejected: 'Rejeté',
  cancelled: 'Annulé',
};

const ORDER_STATUS_BADGE_VARIANT: Record<OrderDTO['status'], BadgeVariant> = {
  received: 'neutral',
  validated: 'neutral',
  accepted: 'information',
  filled: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

const ELIGIBILITY_LABEL: Record<NonNullable<FillDTO['eligibilityReason']>, string> = {
  eligible: 'Éligible',
  short_duration_profit: 'Profit < 60 s',
  loss_counted: 'Perte comptée',
  breakeven: 'Neutre',
};

const ELIGIBILITY_BADGE_VARIANT: Record<NonNullable<FillDTO['eligibilityReason']>, BadgeVariant> = {
  eligible: 'success',
  short_duration_profit: 'warning',
  loss_counted: 'information',
  breakeven: 'neutral',
};

// UTC throughout WariX (RiskRibbon's "Reset 00:00 UTC", TradeChart's explicit
// UTC axis) — the History tab keeps that same reference timezone rather than
// silently switching to the browser's local time.
function formatOrderTimestamp(iso: string): string {
  return `${new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(iso))} UTC`;
}

function formatDuration(durationMs: string | null): string {
  if (durationMs === null) return '—';
  const totalSeconds = Math.max(0, Math.floor(Number(durationMs) / 1_000));
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} min ${seconds.toString().padStart(2, '0')} s`;
}

function deriveRiskRibbonStatus(params: {
  risk: AccountRisk | null;
  isStale: boolean;
  isResyncing: boolean;
}): RiskRibbonStatus {
  if (params.isStale || params.isResyncing) return 'stale';
  if (!params.risk) return 'normal';
  if (params.risk.status === 'breached') return 'hard-breach';
  if (params.risk.status === 'soft_locked' || params.risk.dailyLoss.softLockTriggered) {
    return 'soft-lock';
  }
  const usedRatio = computeDailyLossUsedRatio(params.risk.dailyLoss);
  if (Number(usedRatio) >= Number(NEAR_LIMIT_THRESHOLD)) return 'near-limit';
  if (Number(usedRatio) >= Number(ATTENTION_THRESHOLD)) return 'attention';
  return 'normal';
}

async function getAccessToken(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function TradeClient({
  accountId,
  userId,
  wsUrl,
}: {
  accountId: string;
  userId: string;
  wsUrl: string;
}) {
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
  const [selectedSymbol, setSelectedSymbol] = useState<TradableSymbol>('EURUSD');
  const [quantity, setQuantity] = useState('0.10');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [pending, setPending] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [tab, setTab] = useState('positions');
  const [ticketOpen, setTicketOpen] = useState(false);
  const [closeAllDialogOpen, setCloseAllDialogOpen] = useState(false);
  const [modifyPositionId, setModifyPositionId] = useState<string | null>(null);
  // Prompt 7 Appendix 07-C — which position/field the chart's SL/TP drag or
  // chip just submitted, so TradeChart can show PENDING_SERVER on exactly
  // that handle rather than a generic global spinner. Cleared as soon as
  // `pending` goes false (success or rejection) — mirrors
  // ModifyPositionDialog's own local submittingField pattern, just lifted
  // here since the chart is a second, independent entry point to the same
  // command.
  const [pendingRiskAction, setPendingRiskAction] = useState<{
    positionId: string;
    field: 'stop_loss' | 'take_profit';
  } | null>(null);
  // Prompt 7 Appendix 07-C §8 — Market Buy/Sell chosen from the chart
  // context menu. one-click trading off (the default) shows this
  // confirmation before submitting; on, it submits immediately (see
  // handleMarketOrderRequest below).
  const [oneClickTrading] = useOneClickTrading();
  const [quickOrderSide, setQuickOrderSide] = useState<'buy' | 'sell' | null>(null);
  const [partialClosePositionId, setPartialClosePositionId] = useState<string | null>(null);
  // Prompt 7 Appendix 07-C §15 — "status announcements for accepted,
  // rejected and pending commands". A single visually-hidden aria-live
  // region announces every settled command (order or queued reduction),
  // covering every entry point (chart drag, chips, context menu, dialogs,
  // row actions) through one shared place rather than duplicating
  // announcement logic per component.
  const [statusAnnouncement, setStatusAnnouncement] = useState('');
  const [closeAllResult, setCloseAllResult] = useState<CloseAllOutcome[] | null>(null);
  // §22.6 "historique d'exécution" — AccountSnapshot.recentFills only ever
  // contains close fills (services/realtime/src/snapshot.ts), so an 'open'
  // marker exists solely in this local, session-only list, added the
  // instant order_result reports one; 'close' markers are re-hydrated from
  // the server's recentFills on every snapshot. See the account.snapshot
  // handler below for why a plain full replace would silently erase every
  // open marker moments after it appears.
  const [fills, setFills] = useState<FillMarker[]>([]);
  // Appendix 07-D — the ticket's own order-type field, extended in place
  // (not a second ticket). 'market' keeps the existing Buy/Sell behavior
  // unchanged; 'limit'/'stop' route the same Buy/Sell buttons through
  // createPendingOrder instead of openPosition.
  const [orderKind, setOrderKind] = useState<TicketOrderKind>('market');
  const [triggerPrice, setTriggerPrice] = useState('');
  // Chart context-menu-initiated pending-order placement — same
  // one-click-trading gate as quickOrderSide's market-order equivalent.
  const [pendingOrderRequest, setPendingOrderRequest] = useState<{
    orderType: PendingOrderType;
    triggerPrice: string;
  } | null>(null);
  const [managePendingOrderId, setManagePendingOrderId] = useState<string | null>(null);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [alerts, setAlerts] = useState<PriceAlertDTO[]>([]);
  const [notifications, setNotifications] = useState<AlertNotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
        // resubscribe-triggered snapshot (line ~381 below fires one after
        // *every* order_result) would otherwise wipe the just-opened
        // position's marker within one round trip.
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
            const detail = REJECTION_DETAIL[result.rejectionCode ?? ''] ?? UNKNOWN_REJECTION_DETAIL;
            setStatusAnnouncement(`Refusé : ${detail.reason}`);
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
        client.subscribe([accountStateChannel(accountId)]);
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
          const detail = REJECTION_DETAIL[result.rejectionCode ?? ''] ?? UNKNOWN_REJECTION_DETAIL;
          setStatusAnnouncement(`Refusé : ${detail.reason}`);
        } else {
          setOrderError(null);
          setStatusAnnouncement(
            result.status === 'cancelled'
              ? 'Demande en attente annulée.'
              : 'Réduction mise en file d’attente, en attente d’un prix à jour.',
          );
        }
        client.subscribe([accountStateChannel(accountId)]);
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
          const detail = REJECTION_DETAIL[result.rejectionCode ?? ''] ?? UNKNOWN_REJECTION_DETAIL;
          setStatusAnnouncement(`Refusé : ${detail.reason}`);
        } else {
          setOrderError(null);
          setStatusAnnouncement('Ordre en attente mis à jour.');
        }
        client.subscribe([accountStateChannel(accountId)]);
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
          const detail = REJECTION_DETAIL[result.rejectionCode ?? ''] ?? UNKNOWN_REJECTION_DETAIL;
          setStatusAnnouncement(`Refusé : ${detail.reason}`);
        } else {
          setOrderError(null);
          setStatusAnnouncement('Alerte mise à jour.');
        }
        client.subscribe([userNotificationsChannel(userId)]);
      } else if (envelope.type === 'notifications.snapshot') {
        const snapshot = envelope.payload as NotificationsSnapshotMessage;
        setAlerts(snapshot.alerts);
        setNotifications(snapshot.notifications);
        setUnreadCount(snapshot.unreadCount);
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
  }, [accountId, userId, wsUrl, tickStore]);

  // The only tick this component itself subscribes to — the selected
  // symbol's, needed by the chart/ticket/guardian below. Every other
  // symbol's ticks only ever reach WatchlistPanel's own rows.
  const selectedTick = useTick(tickStore, selectedSymbol);
  const isStale = selectedTick?.marketStatus === 'stale';
  const partialClosePosition =
    snapshot?.openPositions.find((p) => p.id === partialClosePositionId) ?? null;
  // A partial close can be opened for a position on a symbol other than the
  // one currently selected on the chart (e.g. from that position's own row
  // action) — this must track *that* position's own symbol's tick, not
  // necessarily selectedTick.
  const partialCloseTick = useTick(tickStore, partialClosePosition?.symbol ?? selectedSymbol);
  const connectionOk = connectionState === 'open';
  const isResyncing = connectionState === 'resyncing';
  const risk = snapshot?.risk ?? null;
  const riskRibbonStatus = deriveRiskRibbonStatus({ risk, isStale, isResyncing });
  const isShortDurationEntryLocked = risk?.shortDurationMonitoring.status === 'entry_locked';
  const isRiskLocked =
    riskRibbonStatus === 'soft-lock' ||
    riskRibbonStatus === 'hard-breach' ||
    isShortDurationEntryLocked;
  const symbolPositions: PositionDTO[] = useMemo(
    () => snapshot?.openPositions.filter((p) => p.symbol === selectedSymbol) ?? [],
    [snapshot, selectedSymbol],
  );
  const symbolFills = useMemo(
    () => fills.filter((f) => f.symbol === selectedSymbol),
    [fills, selectedSymbol],
  );
  const symbolPendingOrders: PendingOrderDTO[] = useMemo(
    () => snapshot?.pendingOrders.filter((o) => o.symbol === selectedSymbol) ?? [],
    [snapshot, selectedSymbol],
  );
  const symbolAlerts: PriceAlertDTO[] = useMemo(
    () => alerts.filter((a) => a.symbol === selectedSymbol && a.enabled),
    [alerts, selectedSymbol],
  );

  // Guardian (UX Architecture §22.8) — impact potentiel of the current
  // Order Ticket draft. Side-agnostic on purpose: the exposure gate
  // (isAggregateExposureAllowed) sums raw quantities regardless of buy/sell,
  // so margin/exposure impact don't depend on a chosen side either. Null
  // until a symbol spec + a live tick + a priced account exist — no
  // fabricated numbers before then.
  const guardianProps = useMemo(() => {
    const spec = symbolSpecs[selectedSymbol];
    if (!spec || !selectedTick || !risk) return null;
    const midPrice = ((Number(selectedTick.bid) + Number(selectedTick.ask)) / 2).toFixed(
      spec.pricePrecision,
    );
    const marginEstimated = estimateRequiredMargin({
      quantity,
      price: midPrice,
      contractSize: spec.contractSize,
      leverage: spec.leverage,
    });
    const concentration: GuardianConcentrationBucket[] = risk.concentration.map((bucket) => ({
      bucket: bucket.bucket,
      label: CONCENTRATION_BUCKET_LABEL[bucket.bucket] ?? bucket.bucket,
      usedFormatted: bucket.usedQuantity,
      limitFormatted: bucket.limitQuantity,
      usedRatioPercent: Number(bucket.usedRatio) * 100,
    }));
    return {
      symbol: selectedSymbol,
      quantityFormatted: quantity,
      marginEstimatedFormatted: `${marginEstimated} USD`,
      dailyLossRemainingFormatted: `${risk.dailyLoss.remaining} USD`,
      maximumLossRemainingFormatted: `${risk.maximumLoss.remaining} USD`,
      concentration,
      isPriceStale: selectedTick.marketStatus === 'stale',
    };
  }, [symbolSpecs, selectedSymbol, selectedTick, risk, quantity]);

  const submitMarketOrder = useCallback(
    (side: 'buy' | 'sell') => {
      if (!clientRef.current) return;
      setPending(true);
      setOrderError(null);
      const command: SubmitOrderMessage = {
        orderType: 'market_open',
        accountId,
        idempotencyKey: crypto.randomUUID(),
        symbol: selectedSymbol,
        side,
        quantity,
        ...(stopLoss.trim() ? { stopLoss: stopLoss.trim() } : {}),
        ...(takeProfit.trim() ? { takeProfit: takeProfit.trim() } : {}),
      };
      pendingCommandRef.current = { kind: 'order', payload: command };
      clientRef.current.submitOrder(command);
    },
    [accountId, selectedSymbol, quantity, stopLoss, takeProfit],
  );

  // Chart context menu's Market Buy/Sell (§7/§8) — same command, same
  // current ticket quantity/SL/TP as the Order Ticket's own Buy/Sell
  // buttons; the only difference is whether a confirmation is required
  // first (one-click trading preference).
  const requestMarketOrderFromChart = useCallback(
    (side: 'buy' | 'sell') => {
      if (oneClickTrading) {
        submitMarketOrder(side);
      } else {
        setQuickOrderSide(side);
      }
    },
    [oneClickTrading, submitMarketOrder],
  );

  const confirmQuickOrder = useCallback(() => {
    if (!quickOrderSide) return;
    submitMarketOrder(quickOrderSide);
    setQuickOrderSide(null);
  }, [quickOrderSide, submitMarketOrder]);

  // Appendix 07-D — createPendingOrder, using the ticket's own current
  // quantity/SL/TP, same convention submitMarketOrder already uses.
  const submitPendingOrder = useCallback(
    (orderType: PendingOrderType, price: string) => {
      if (!clientRef.current) return;
      setPending(true);
      setOrderError(null);
      clientRef.current.createPendingOrder({
        accountId,
        idempotencyKey: crypto.randomUUID(),
        symbol: selectedSymbol,
        orderType,
        quantity,
        triggerPrice: price,
        ...(stopLoss.trim() ? { stopLoss: stopLoss.trim() } : {}),
        ...(takeProfit.trim() ? { takeProfit: takeProfit.trim() } : {}),
      });
    },
    [accountId, selectedSymbol, quantity, stopLoss, takeProfit],
  );

  // Chart context menu's "Achat/Vente Limite/Stop ici" — same
  // one-click-trading gate as requestMarketOrderFromChart.
  const requestPendingOrderFromChart = useCallback(
    (params: { orderType: PendingOrderType; triggerPrice: string }) => {
      if (oneClickTrading) {
        submitPendingOrder(params.orderType, params.triggerPrice);
      } else {
        setPendingOrderRequest(params);
      }
    },
    [oneClickTrading, submitPendingOrder],
  );

  const confirmPendingOrderRequest = useCallback(() => {
    if (!pendingOrderRequest) return;
    submitPendingOrder(pendingOrderRequest.orderType, pendingOrderRequest.triggerPrice);
    setPendingOrderRequest(null);
  }, [pendingOrderRequest, submitPendingOrder]);

  // Shared by the chart's trigger-price drag commit and
  // ModifyPendingOrderDialog's combined save — both produce the same
  // ModifyPendingOrderMessage shape.
  const submitModifyPendingOrder = useCallback(
    (params: ModifyPendingOrderParams) => {
      if (!clientRef.current) return;
      setPending(true);
      setOrderError(null);
      clientRef.current.modifyPendingOrder({ accountId, ...params });
    },
    [accountId],
  );

  const cancelPendingOrderRequest = useCallback(
    (pendingOrderId: string) => {
      if (!clientRef.current) return;
      setPending(true);
      setOrderError(null);
      clientRef.current.cancelPendingOrder({ accountId, pendingOrderId });
    },
    [accountId],
  );

  const openManagePendingOrder = useCallback((pendingOrderId: string) => {
    setManagePendingOrderId(pendingOrderId);
  }, []);

  const closeManagePendingOrder = useCallback(() => {
    setManagePendingOrderId(null);
  }, []);

  const submitModifyAlertThreshold = useCallback(
    (params: { alertId: string; thresholdPrice: string }) => {
      if (!clientRef.current) return;
      setPending(true);
      setOrderError(null);
      clientRef.current.modifyPriceAlert(params);
    },
    [],
  );

  const createAlert = useCallback((params: CreateAlertParams) => {
    if (!clientRef.current) return;
    setPending(true);
    setOrderError(null);
    clientRef.current.createPriceAlert({ ...params, idempotencyKey: crypto.randomUUID() });
  }, []);

  // Chart context menu's "Créer une alerte ici" — no ticket fields to reuse
  // (an alert has no quantity/SL/TP), so this picks a direction from
  // which side of the current market the clicked price falls on: above
  // today's price naturally reads as "tell me when it climbs up to here",
  // below as "tell me when it drops down to here".
  const createAlertHereFromChart = useCallback(
    (thresholdPrice: string) => {
      if (!selectedTick) return;
      const mid = (Number(selectedTick.bid) + Number(selectedTick.ask)) / 2;
      const direction = Number(thresholdPrice) >= mid ? 'cross_above' : 'cross_below';
      createAlert({
        symbol: selectedSymbol,
        direction,
        thresholdPrice,
        source: 'mid',
        recurrence: 'once',
      });
    },
    [selectedTick, selectedSymbol, createAlert],
  );

  const enableAlertRequest = useCallback((alertId: string) => {
    if (!clientRef.current) return;
    setPending(true);
    setOrderError(null);
    clientRef.current.enablePriceAlert({ alertId });
  }, []);

  const disableAlertRequest = useCallback((alertId: string) => {
    if (!clientRef.current) return;
    setPending(true);
    setOrderError(null);
    clientRef.current.disablePriceAlert({ alertId });
  }, []);

  const deleteAlertRequest = useCallback((alertId: string) => {
    if (!clientRef.current) return;
    setPending(true);
    setOrderError(null);
    clientRef.current.deletePriceAlert({ alertId });
  }, []);

  const openManageAlert = useCallback(() => {
    setNotificationCenterOpen(true);
  }, []);

  // No server broadcast follows mark_notifications_read (unlike every other
  // command here) — it's a pure read-state update with no financial or
  // execution effect, so the client applies it optimistically rather than
  // waiting on a round trip; a fresh notifications.snapshot on the next
  // resubscribe/reconnect is still the eventual source of truth.
  const markAllNotificationsRead = useCallback(() => {
    if (!clientRef.current) return;
    const unreadIds = notifications.filter((n) => n.readAt === null).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const now = new Date().toISOString();
    clientRef.current.markNotificationsRead({ notificationIds: unreadIds });
    setNotifications((prev) => prev.map((n) => (n.readAt === null ? { ...n, readAt: now } : n)));
    setUnreadCount(0);
  }, [notifications]);

  const openPartialClose = useCallback((positionId: string) => {
    setPartialClosePositionId(positionId);
  }, []);

  const closePartialClose = useCallback(() => {
    setPartialClosePositionId(null);
  }, []);

  const submitPartialClose = useCallback(
    (params: { positionId: string; quantity: string }) => {
      if (!clientRef.current) return;
      setPending(true);
      setOrderError(null);
      const command: SubmitOrderMessage = {
        orderType: 'partial_close',
        accountId,
        idempotencyKey: crypto.randomUUID(),
        positionId: params.positionId,
        quantity: params.quantity,
      };
      pendingCommandRef.current = { kind: 'order', payload: command };
      clientRef.current.submitOrder(command);
    },
    [accountId],
  );

  const queueReductionRequest = useCallback(
    (params: { positionId: string; mode: 'partial' | 'full'; quantity?: string }) => {
      if (!clientRef.current) return;
      setPending(true);
      setOrderError(null);
      clientRef.current.queueReduction({
        accountId,
        idempotencyKey: crypto.randomUUID(),
        positionId: params.positionId,
        mode: params.mode,
        ...(params.quantity !== undefined ? { quantity: params.quantity } : {}),
      });
    },
    [accountId],
  );

  const cancelQueuedReductionRequest = useCallback(
    (queueId: string) => {
      if (!clientRef.current) return;
      setPending(true);
      setOrderError(null);
      clientRef.current.cancelQueuedReduction({ accountId, queueId });
    },
    [accountId],
  );

  // Client-side bounds check for instant feedback — the server (INVALID_QUANTITY,
  // packages/database/src/trading.ts) is the real gate; this only saves a
  // round trip for an obviously-wrong value.
  const quantityError = useMemo(() => {
    const spec = symbolSpecs[selectedSymbol];
    if (!spec || quantity.trim() === '') return null;
    const withinBounds = isQuantityWithinBounds({
      quantity,
      minimumQuantity: spec.minimumQuantity,
      maximumQuantity: spec.maximumQuantity,
      quantityStep: spec.quantityStep,
    });
    return withinBounds
      ? null
      : `Doit être entre ${spec.minimumQuantity} et ${spec.maximumQuantity}, par pas de ${spec.quantityStep}.`;
  }, [symbolSpecs, selectedSymbol, quantity]);

  // Client-side sanity check for instant feedback — createPendingOrder's own
  // isPendingOrderCreationPriceValid re-check (packages/database/src/
  // pending-orders.ts) is the real gate; this only catches an empty/
  // malformed value before a round trip.
  const triggerPriceError = useMemo(() => {
    if (orderKind === 'market') return null;
    if (triggerPrice.trim() === '') return 'Requis pour un ordre en attente.';
    return /^\d+(\.\d+)?$/.test(triggerPrice.trim()) ? null : 'Doit être un nombre décimal valide.';
  }, [orderKind, triggerPrice]);

  const submitDisabled =
    !connectionOk ||
    isStale ||
    isRiskLocked ||
    Boolean(quantityError) ||
    Boolean(triggerPriceError);

  const disabledMessage = !connectionOk
    ? 'Connexion au serveur en cours…'
    : isStale
      ? 'Les nouvelles positions sont bloquées tant que le marché n’est pas à jour.'
      : isRiskLocked
        ? isShortDurationEntryLocked
          ? 'Les nouvelles ouvertures sont suspendues pour revue après six profits sous 60 secondes sur 24 h.'
          : riskRibbonStatus === 'hard-breach'
            ? 'La limite maximale de perte est dépassée. Aucun nouvel ordre possible.'
            : 'Votre compte est en blocage temporaire jusqu’au prochain reset à 00:00 UTC.'
        : (quantityError ?? triggerPriceError);

  const rejection: OrderRejectionDetail | null = orderError
    ? { code: orderError, ...(REJECTION_DETAIL[orderError] ?? UNKNOWN_REJECTION_DETAIL) }
    : null;

  // The ticket's Buy/Sell buttons route to openPosition when orderKind is
  // 'market' (unchanged from before this appendix) and to createPendingOrder
  // otherwise — submitted directly, same as market orders from the ticket,
  // no extra confirmation step (a deliberate multi-field ticket submission
  // is already the confirmation; only the chart's quicker "at this price"
  // shortcut gets PendingOrderConfirm, mirroring QuickOrderConfirm).
  const submitTicket = useCallback(
    (side: 'buy' | 'sell') => {
      if (orderKind === 'market') {
        submitMarketOrder(side);
      } else {
        submitPendingOrder(pendingOrderTypeFor(orderKind, side), triggerPrice.trim());
      }
    },
    [orderKind, submitMarketOrder, submitPendingOrder, triggerPrice],
  );

  const closePosition = useCallback(
    (positionId: string) => {
      if (!clientRef.current) return;
      setPending(true);
      const command: SubmitOrderMessage = {
        orderType: 'full_close',
        accountId,
        idempotencyKey: crypto.randomUUID(),
        positionId,
      };
      pendingCommandRef.current = { kind: 'order', payload: command };
      clientRef.current.submitOrder(command);
    },
    [accountId],
  );

  const openModifyDialog = useCallback((positionId: string) => {
    setModifyPositionId(positionId);
  }, []);

  const closeModifyDialog = useCallback(() => {
    setModifyPositionId(null);
  }, []);

  const submitPositionRiskModification = useCallback(
    (params: { positionId: string; field: 'stop_loss' | 'take_profit'; value: string | null }) => {
      if (!clientRef.current) return;
      const command: SubmitOrderMessage =
        params.field === 'stop_loss'
          ? {
              orderType: 'modify_sl',
              accountId,
              idempotencyKey: crypto.randomUUID(),
              positionId: params.positionId,
              stopLoss: params.value,
            }
          : {
              orderType: 'modify_tp',
              accountId,
              idempotencyKey: crypto.randomUUID(),
              positionId: params.positionId,
              takeProfit: params.value,
            };
      setPending(true);
      setOrderError(null);
      setPendingRiskAction({ positionId: params.positionId, field: params.field });
      pendingCommandRef.current = { kind: 'order', payload: command };
      clientRef.current.submitOrder(command);
    },
    [accountId],
  );

  // Settles (success or rejection) the same instant `pending` itself does —
  // see pendingRiskAction's own doc comment above.
  useEffect(() => {
    if (!pending) setPendingRiskAction(null);
  }, [pending]);

  const openCloseAllDialog = useCallback(() => {
    setCloseAllResult(null);
    setCloseAllDialogOpen(true);
  }, []);

  const confirmCloseAll = useCallback(() => {
    if (!clientRef.current || !snapshot || snapshot.openPositions.length === 0) return;
    const command: CloseAllMessage = { accountId, idempotencyKey: crypto.randomUUID() };
    closeAllTrackerRef.current = {
      idempotencyKey: command.idempotencyKey,
      expectedCount: snapshot.openPositions.length,
      outcomes: new Map(),
    };
    setCloseAllResult(null);
    setPending(true);
    pendingCommandRef.current = { kind: 'close_all', payload: command };
    clientRef.current.closeAll(command);
  }, [accountId, snapshot]);

  const orderTicket = useMemo(
    () => (
      <div className="flex flex-col gap-4">
        <OrderTicket
          accountPublicId={accountId.slice(0, 8).toUpperCase()}
          symbol={selectedSymbol}
          spec={symbolSpecs[selectedSymbol] ?? null}
          tick={selectedTick}
          quantity={quantity}
          onQuantityChange={setQuantity}
          quantityError={quantityError}
          stopLoss={stopLoss}
          onStopLossChange={setStopLoss}
          takeProfit={takeProfit}
          onTakeProfitChange={setTakeProfit}
          onSubmit={submitTicket}
          pending={pending}
          submitDisabled={submitDisabled}
          disabledMessage={disabledMessage}
          rejection={rejection}
          orderKind={orderKind}
          onOrderKindChange={setOrderKind}
          triggerPrice={triggerPrice}
          onTriggerPriceChange={setTriggerPrice}
          triggerPriceError={triggerPriceError}
        />

        {guardianProps ? (
          <Guardian {...guardianProps} />
        ) : (
          <Text variant="body-sm" color="tertiary">
            Guardian sera actif après votre première journée de trading.
          </Text>
        )}
      </div>
    ),
    [
      accountId,
      selectedSymbol,
      symbolSpecs,
      selectedTick,
      quantity,
      quantityError,
      stopLoss,
      takeProfit,
      submitTicket,
      pending,
      submitDisabled,
      disabledMessage,
      rejection,
      guardianProps,
      orderKind,
      triggerPrice,
      triggerPriceError,
    ],
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <div aria-live="polite" className="sr-only">
        {statusAnnouncement}
      </div>
      <div className="flex flex-col gap-2 border-b border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)]">
        <TradeHeaderPanel
          accountId={accountId}
          nominalFormatted={snapshot ? `${snapshot.nominalBalance} USD` : '—'}
          balanceFormatted={snapshot ? `${snapshot.balance} USD` : '—'}
          equityFormatted={snapshot ? `${snapshot.equity} USD` : '—'}
          programEligibleBalanceFormatted={
            snapshot ? `${snapshot.programEligibleBalance} USD` : '—'
          }
          connectionOk={connectionOk}
          riskRibbonStatus={riskRibbonStatus}
          risk={risk}
          isResyncing={isResyncing}
        />
        {/* UX Architecture §22.2's layout diagram lists "Market Status" as its
            own header element alongside Account Context/Risk Ribbon — the
            selected symbol's session state, distinct from RiskRibbon's own
            dot (WS connection quality, a different concern entirely). Stays
            outside TradeHeaderPanel since, unlike the rest of the header, it
            genuinely needs the selected symbol's tick. */}
        <div className="flex items-center justify-between gap-2 text-[length:var(--wariba-font-size-body-sm)]">
          <div className="flex items-center gap-2">
            <Text as="span" color="secondary">
              Marché {selectedSymbol}
            </Text>
            <span
              className={`font-medium ${
                selectedTick?.marketStatus === 'stale'
                  ? 'text-[color:var(--wariba-status-warning-text)]'
                  : 'text-[color:var(--wariba-text-primary)]'
              }`}
            >
              {selectedTick ? MARKET_STATUS_LABEL[selectedTick.marketStatus] : '—'}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setNotificationCenterOpen(true)}>
            Notifications
            {unreadCount > 0 && (
              <Badge variant="danger" className="ml-1.5">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        <WatchlistPanel
          store={tickStore}
          symbolSpecs={symbolSpecs}
          selectedSymbol={selectedSymbol}
          onSelectSymbol={setSelectedSymbol}
        />

        <div className="flex min-h-[280px] flex-1 flex-col gap-2 border-b border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)] lg:border-b-0 lg:border-r">
          <TradeChart
            symbol={selectedSymbol}
            tick={selectedTick}
            positions={symbolPositions}
            fills={symbolFills}
            connectionState={connectionState}
            spec={symbolSpecs[selectedSymbol] ?? null}
            accountEquity={snapshot?.equity ?? '0'}
            dailyLossRemaining={risk?.dailyLoss.remaining ?? null}
            pendingRiskAction={pendingRiskAction}
            commandPending={pending}
            onCommitLevel={submitPositionRiskModification}
            onOpenManage={openModifyDialog}
            onClosePosition={closePosition}
            onMarketOrderRequest={requestMarketOrderFromChart}
            onOpenPartialClose={openPartialClose}
            pendingOrders={symbolPendingOrders}
            alerts={symbolAlerts}
            onModifyPendingOrderTrigger={submitModifyPendingOrder}
            onOpenManagePendingOrder={openManagePendingOrder}
            onCancelPendingOrder={cancelPendingOrderRequest}
            onModifyAlertThreshold={submitModifyAlertThreshold}
            onOpenManageAlert={openManageAlert}
            onDeleteAlert={deleteAlertRequest}
            onPendingOrderRequest={requestPendingOrderFromChart}
            onCreateAlertHere={createAlertHereFromChart}
          />
          <Button variant="secondary" className="lg:hidden" onClick={() => setTicketOpen(true)}>
            Trader {selectedSymbol}
          </Button>
        </div>

        <aside className="hidden p-[var(--wariba-component-trade-panel-padding)] lg:flex lg:w-[var(--wariba-size-trade-order-ticket-max)] lg:flex-col">
          {orderTicket}
        </aside>
      </div>

      <BottomSheet
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
        title={`Trader ${selectedSymbol}`}
      >
        {orderTicket}
      </BottomSheet>

      <CloseAllDialog
        open={closeAllDialogOpen}
        onClose={() => setCloseAllDialogOpen(false)}
        onConfirm={confirmCloseAll}
        positionCount={snapshot?.openPositions.length ?? 0}
        accountPublicId={accountId.slice(0, 8).toUpperCase()}
        pending={pending}
        result={closeAllResult}
      />

      <ModifyPositionDialog
        open={modifyPositionId !== null}
        onClose={closeModifyDialog}
        position={snapshot?.openPositions.find((p) => p.id === modifyPositionId) ?? null}
        store={tickStore}
        pending={pending}
        rejection={rejection}
        onSubmit={submitPositionRiskModification}
      />

      <QuickOrderConfirm
        open={quickOrderSide !== null}
        onClose={() => setQuickOrderSide(null)}
        symbol={selectedSymbol}
        side={quickOrderSide ?? 'buy'}
        quantity={quantity}
        tick={selectedTick}
        spec={symbolSpecs[selectedSymbol] ?? null}
        stopLoss={stopLoss}
        takeProfit={takeProfit}
        pending={pending}
        onConfirm={confirmQuickOrder}
      />

      <PartialCloseSheet
        open={partialClosePositionId !== null}
        onClose={closePartialClose}
        position={partialClosePosition}
        spec={partialClosePosition ? (symbolSpecs[partialClosePosition.symbol] ?? null) : null}
        tick={partialCloseTick}
        pending={pending}
        rejection={rejection}
        queuedReductions={snapshot?.queuedReductions ?? []}
        onSubmitPartialClose={(params) => {
          submitPartialClose(params);
          closePartialClose();
        }}
        onSubmitFullClose={(positionId) => {
          closePosition(positionId);
          closePartialClose();
        }}
        onQueueReduction={(params) => {
          queueReductionRequest(params);
          closePartialClose();
        }}
        onCancelQueuedReduction={cancelQueuedReductionRequest}
      />

      <PendingOrderConfirm
        open={pendingOrderRequest !== null}
        onClose={() => setPendingOrderRequest(null)}
        symbol={selectedSymbol}
        orderType={pendingOrderRequest?.orderType ?? 'buy_limit'}
        triggerPrice={pendingOrderRequest?.triggerPrice ?? ''}
        quantity={quantity}
        tick={selectedTick}
        spec={symbolSpecs[selectedSymbol] ?? null}
        stopLoss={stopLoss}
        takeProfit={takeProfit}
        pending={pending}
        onConfirm={confirmPendingOrderRequest}
      />

      <ModifyPendingOrderDialog
        open={managePendingOrderId !== null}
        onClose={closeManagePendingOrder}
        order={snapshot?.pendingOrders.find((o) => o.id === managePendingOrderId) ?? null}
        store={tickStore}
        pending={pending}
        rejection={rejection}
        onSubmit={(params) => {
          submitModifyPendingOrder(params);
          closeManagePendingOrder();
        }}
        onCancelOrder={(pendingOrderId) => {
          cancelPendingOrderRequest(pendingOrderId);
          closeManagePendingOrder();
        }}
      />

      <NotificationCenter
        open={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
        symbol={selectedSymbol}
        notifications={notifications}
        unreadCount={unreadCount}
        alerts={alerts}
        pending={pending}
        rejection={rejection}
        onMarkAllRead={markAllNotificationsRead}
        onEnableAlert={enableAlertRequest}
        onDisableAlert={disableAlertRequest}
        onDeleteAlert={deleteAlertRequest}
        onCreateAlert={createAlert}
      />

      <div className="border-t border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)]">
        <Tabs value={tab} onValueChange={setTab}>
          <TabList aria-label="Compte">
            <Tab value="positions">Positions</Tab>
            <Tab value="pending">En attente</Tab>
            <Tab value="orders">Ordres</Tab>
            <Tab value="history">Historique</Tab>
            <Tab value="journal">Journal</Tab>
          </TabList>
          <TabPanel value="positions">
            <PositionsTabPanel
              store={tickStore}
              openPositions={snapshot?.openPositions ?? []}
              symbolSpecs={symbolSpecs}
              onClosePosition={closePosition}
              onModifyPosition={openModifyDialog}
              onPartialClosePosition={openPartialClose}
              onOpenCloseAll={openCloseAllDialog}
              pending={pending}
            />
          </TabPanel>
          <TabPanel value="pending">
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>Type</DataTableHeaderCell>
                  <DataTableHeaderCell>Symbole</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Quantité</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Déclenchement</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Actions</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {!snapshot || snapshot.pendingOrders.length === 0 ? (
                  <DataTableRow>
                    <DataTableCell
                      colSpan={5}
                      className="text-center text-[color:var(--wariba-text-secondary)]"
                    >
                      Aucun ordre en attente.
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  snapshot.pendingOrders.map((o) => (
                    <DataTableRow key={o.id}>
                      <DataTableCell>{PENDING_ORDER_TYPE_LABEL[o.orderType]}</DataTableCell>
                      <DataTableCell>{o.symbol}</DataTableCell>
                      <DataTableCell numeric>{o.quantity}</DataTableCell>
                      <DataTableCell numeric>{o.triggerPrice}</DataTableCell>
                      <DataTableCell align="right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openManagePendingOrder(o.id)}
                          disabled={pending}
                        >
                          Gérer
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelPendingOrderRequest(o.id)}
                          disabled={pending}
                          className="text-[color:var(--wariba-status-danger-text)]"
                        >
                          Annuler
                        </Button>
                      </DataTableCell>
                    </DataTableRow>
                  ))
                )}
              </DataTableBody>
            </DataTable>
          </TabPanel>
          <TabPanel value="orders">
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>Type</DataTableHeaderCell>
                  <DataTableHeaderCell>Symbole</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Statut</DataTableHeaderCell>
                  <DataTableHeaderCell>Raison</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {!snapshot || snapshot.recentOrders.length === 0 ? (
                  <DataTableRow>
                    <DataTableCell
                      colSpan={4}
                      className="text-center text-[color:var(--wariba-text-secondary)]"
                    >
                      Aucun ordre.
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  snapshot.recentOrders.map((o) => (
                    <DataTableRow key={o.id}>
                      <DataTableCell>{ORDER_TYPE_LABEL[o.orderType]}</DataTableCell>
                      <DataTableCell>{o.symbol ?? '—'}</DataTableCell>
                      <DataTableCell align="right">
                        <Badge variant={ORDER_STATUS_BADGE_VARIANT[o.status]}>
                          {ORDER_STATUS_LABEL[o.status]}
                        </Badge>
                      </DataTableCell>
                      <DataTableCell className="text-[color:var(--wariba-text-secondary)]">
                        {o.status === 'rejected'
                          ? (REJECTION_DETAIL[o.rejectionCode ?? '']?.reason ??
                            UNKNOWN_REJECTION_DETAIL.reason)
                          : '—'}
                      </DataTableCell>
                    </DataTableRow>
                  ))
                )}
              </DataTableBody>
            </DataTable>
          </TabPanel>
          <TabPanel value="history">
            {snapshot?.profitEligibility.enabled && (
              <Text variant="body-sm" color="secondary" className="mb-3 block max-w-4xl">
                La balance réelle inclut chaque résultat. Pour la progression WARIBA, seul le profit
                net positif d’une clôture détenue moins de 60 secondes est exclu. Les pertes nettes
                comptent toujours ; les commissions sont appliquées avant la classification.
              </Text>
            )}
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>Clôture</DataTableHeaderCell>
                  <DataTableHeaderCell>Symbole</DataTableHeaderCell>
                  <DataTableHeaderCell>Sens</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Quantité</DataTableHeaderCell>
                  <DataTableHeaderCell>Ouverture → clôture</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Durée</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">PnL net</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">PnL éligible</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Règle</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {!snapshot ||
                snapshot.recentFills.filter((fill) => fill.fillType === 'close').length === 0 ? (
                  <DataTableRow>
                    <DataTableCell
                      colSpan={9}
                      className="text-center text-[color:var(--wariba-text-secondary)]"
                    >
                      Aucune clôture exécutée.
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  snapshot.recentFills
                    .filter(
                      (
                        fill,
                      ): fill is FillDTO & {
                        eligibilityReason: NonNullable<FillDTO['eligibilityReason']>;
                      } => fill.fillType === 'close' && fill.eligibilityReason !== null,
                    )
                    .map((fill) => (
                      <DataTableRow key={fill.id}>
                        <DataTableCell numeric>
                          {formatOrderTimestamp(fill.occurredAt)}
                        </DataTableCell>
                        <DataTableCell>{fill.symbol}</DataTableCell>
                        <DataTableCell>{fill.side === 'buy' ? 'Achat' : 'Vente'}</DataTableCell>
                        <DataTableCell numeric>{fill.quantity}</DataTableCell>
                        <DataTableCell numeric>
                          {fill.openingPrice} → {fill.price}
                        </DataTableCell>
                        <DataTableCell numeric>{formatDuration(fill.durationMs)}</DataTableCell>
                        <DataTableCell numeric>{fill.netRealizedPnl ?? '—'} USD</DataTableCell>
                        <DataTableCell numeric>{fill.eligibleRealizedPnl ?? '—'} USD</DataTableCell>
                        <DataTableCell align="right">
                          <Badge variant={ELIGIBILITY_BADGE_VARIANT[fill.eligibilityReason]}>
                            {ELIGIBILITY_LABEL[fill.eligibilityReason]}
                          </Badge>
                        </DataTableCell>
                      </DataTableRow>
                    ))
                )}
              </DataTableBody>
            </DataTable>
          </TabPanel>
          <TabPanel value="journal">
            <Text variant="body-sm" color="tertiary">
              Le journal de trading (annotations, tags, revue de session) arrive dans un prompt
              ultérieur.
            </Text>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
