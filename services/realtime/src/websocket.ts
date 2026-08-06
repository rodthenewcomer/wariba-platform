import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import {
  executeQueuedReductions,
  triggerPendingOrders,
  evaluateAlerts,
  loadActiveAlertsForUser,
  loadNotificationsForUser,
  type Db,
  type TradableSymbol,
} from '@wariba/database';
import type { MarketDataProvider } from '@wariba/adapters';
import {
  subscribeMessageSchema,
  unsubscribeMessageSchema,
  pingMessageSchema,
  submitOrderMessageSchema,
  closeAllMessageSchema,
  queueReductionMessageSchema,
  cancelQueuedReductionMessageSchema,
  createPendingOrderMessageSchema,
  modifyPendingOrderMessageSchema,
  cancelPendingOrderMessageSchema,
  cancelAllPendingOrdersMessageSchema,
  createPriceAlertMessageSchema,
  modifyPriceAlertMessageSchema,
  alertIdMessageSchema,
  markNotificationsReadMessageSchema,
  buildEnvelope,
  accountStateChannel,
  accountOrdersChannel,
  accountPositionsChannel,
  marketSymbolChannel,
  userNotificationsChannel,
  TRADABLE_SYMBOLS,
  type OrderResultMessage,
  type QueueReductionResultMessage,
  type PendingOrderResultMessage,
  type AlertResultMessage,
  type SymbolSpec,
} from '@wariba/contracts';
import type { Logger } from '@wariba/observability';
import type { RealtimeConfig } from './config';
import { resolveLeverage, type LoadedSymbolSpec } from './market';
import { verifyAccessToken } from './auth';
import { ConnectionRegistry } from './registry';
import { buildAccountSnapshot, buildAccountRiskPreview } from './snapshot';
import { toAlertNotificationDTO, toPendingOrderDTO, toPriceAlertDTO } from './dto-mappers';
import {
  handleSubmitOrder,
  handleCloseAll,
  handleQueueReduction,
  handleCancelQueuedReduction,
  handleCreatePendingOrder,
  handleModifyPendingOrder,
  handleCancelPendingOrder,
  handleCancelAllPendingOrders,
  handleCreatePriceAlert,
  handleModifyPriceAlert,
  handleEnablePriceAlert,
  handleDisablePriceAlert,
  handleDeletePriceAlert,
  handleMarkNotificationsRead,
  verifyAccountOwnership,
  buildResultMessage,
  readAllMarkets,
} from './order-handler';

const clientMessageSchema = z.discriminatedUnion('type', [
  subscribeMessageSchema,
  unsubscribeMessageSchema,
  pingMessageSchema,
  z.object({ type: z.literal('submit_order'), order: submitOrderMessageSchema }),
  z.object({ type: z.literal('close_all'), closeAll: closeAllMessageSchema }),
  z.object({ type: z.literal('queue_reduction'), reduction: queueReductionMessageSchema }),
  z.object({
    type: z.literal('cancel_queued_reduction'),
    cancelReduction: cancelQueuedReductionMessageSchema,
  }),
  z.object({
    type: z.literal('create_pending_order'),
    pendingOrder: createPendingOrderMessageSchema,
  }),
  z.object({
    type: z.literal('modify_pending_order'),
    pendingOrder: modifyPendingOrderMessageSchema,
  }),
  z.object({
    type: z.literal('cancel_pending_order'),
    pendingOrder: cancelPendingOrderMessageSchema,
  }),
  z.object({
    type: z.literal('cancel_all_pending_orders'),
    pendingOrder: cancelAllPendingOrdersMessageSchema,
  }),
  z.object({ type: z.literal('create_price_alert'), alert: createPriceAlertMessageSchema }),
  z.object({ type: z.literal('modify_price_alert'), alert: modifyPriceAlertMessageSchema }),
  z.object({ type: z.literal('enable_price_alert'), alert: alertIdMessageSchema }),
  z.object({ type: z.literal('disable_price_alert'), alert: alertIdMessageSchema }),
  z.object({ type: z.literal('delete_price_alert'), alert: alertIdMessageSchema }),
  z.object({
    type: z.literal('mark_notifications_read'),
    notifications: markNotificationsReadMessageSchema,
  }),
]);

const HEARTBEAT_INTERVAL_MS = 15_000;
const HEARTBEAT_TIMEOUT_MS = 45_000;
const RATE_LIMIT_MAX_MESSAGES = 30;
const RATE_LIMIT_WINDOW_MS = 10_000;

export function registerWebSocketRoute(
  app: FastifyInstance,
  deps: {
    db: Db;
    market: MarketDataProvider;
    symbolSpecs: Record<TradableSymbol, LoadedSymbolSpec>;
    config: RealtimeConfig;
    logger: Logger;
    registry: ConnectionRegistry;
  },
): void {
  const { db, market, symbolSpecs, config, logger, registry } = deps;

  app.get('/ws', { websocket: true }, (socket, request) => {
    // @fastify/websocket's own README: event handlers must attach
    // SYNCHRONOUSLY on connection, before any async work — a message
    // arriving while we're still awaiting auth verification would
    // otherwise be silently dropped (no listener yet to receive it).
    // So: attach 'message' immediately and queue anything that arrives
    // before auth resolves, then drain the queue once it's ready.
    const queue: Buffer[] = [];
    let connectionId: string | null = null;
    let userId: string | null = null;
    // Serializes this connection's message processing: without this, each
    // incoming frame kicked off its own independent, unawaited
    // processMessage() call, so two frames sent back-to-back (e.g. subscribe
    // immediately followed by submit_order — a legitimate fast client, or a
    // reconnect flow that issues both right away) could interleave. The
    // in-subscribe two-pass fix below (registry.subscribe before any
    // sendInitialSnapshot I/O) only protects ordering *within* one subscribe
    // call; it does nothing for a subscribe racing a submit_order sent as a
    // separate frame right after it, which could still let submit_order's
    // broadcastOrderResult run before the subscribe that registers this
    // connection as a listener has finished — silently dropping order_result.
    // Chaining every dispatch onto the same promise makes processMessage
    // calls run strictly one at a time, in arrival order, per connection.
    let processingChain: Promise<void> = Promise.resolve();

    const dispatch = (raw: Buffer): void => {
      if (!connectionId || !userId) {
        queue.push(raw);
        return;
      }
      const cid = connectionId;
      const uid = userId;
      processingChain = processingChain
        .then(() => processMessage({ db, market, symbolSpecs, registry, logger }, cid, uid, raw))
        .catch((error: unknown) => {
          logger.error('ws.message_handler_failed', {
            connectionId: cid,
            errorMessage: error instanceof Error ? error.message : String(error),
          });
          sendError(
            registry,
            cid,
            'internal_error',
            'Something went wrong processing that message.',
          );
        });
    };

    socket.on('message', dispatch);
    socket.on('pong', () => {
      if (connectionId) registry.touchPong(connectionId);
    });
    socket.on('close', () => {
      if (connectionId) {
        registry.unregister(connectionId);
        logger.info('ws.disconnected', { connectionId, userId });
      }
    });

    void (async () => {
      const query = request.query as { token?: string };
      const auth = query.token ? await verifyAccessToken(config, query.token) : null;
      if (!auth) {
        socket.close(4401, 'unauthenticated');
        return;
      }

      connectionId = randomUUID();
      userId = auth.userId;
      registry.register(connectionId, socket, userId);
      logger.info('ws.connected', { connectionId, userId });

      const pending = queue.splice(0, queue.length);
      for (const raw of pending) {
        dispatch(raw);
      }
    })().catch((error: unknown) => {
      logger.error('ws.connection_handler_failed', {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      try {
        socket.close(1011, 'internal_error');
      } catch {
        // socket may already be closed — nothing to do.
      }
    });
  });

  // Server-initiated heartbeat: ping every connection, drop ones that never
  // pong back. The actual `.ping()` call below is what makes this work — a
  // browser's WebSocket implementation answers a protocol-level ping frame
  // with a pong frame automatically, no client-side application code
  // needed, which is what updates each connection's lastPongAt via the
  // 'pong' listener registered per-connection above. Without it (a prior
  // version of this loop only ever terminated already-stale connections and
  // never sent a ping to keep the non-stale ones alive), lastPongAt is only
  // ever set once at register() and every real connection gets force-closed
  // ~HEARTBEAT_TIMEOUT_MS after opening regardless of trading activity.
  setInterval(() => {
    for (const connectionId of registry.connectionsStaleSince(HEARTBEAT_TIMEOUT_MS)) {
      const conn = registry.get(connectionId);
      conn?.socket.terminate();
      registry.unregister(connectionId);
    }
    for (const connectionId of registry.allConnectionIds()) {
      const conn = registry.get(connectionId);
      if (conn && conn.socket.readyState === conn.socket.OPEN) {
        conn.socket.ping();
      }
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Broadcast every market tick to its channel's subscribers.
  market.subscribe(Object.keys(symbolSpecs) as TradableSymbol[], (tick) => {
    registry.broadcast(
      marketSymbolChannel(tick.symbol),
      buildEnvelope({
        type: 'market.tick',
        sequence: tick.sequence,
        correlationId: tick.symbol,
        payload: tick,
      }),
    );

    // Prompt 7 Appendix 07-C §12 — this tick is fresh the instant it's
    // published (age ~0ms against `now` below), so it's exactly the "first
    // valid post-recovery executable price" any reduction queued while this
    // symbol was stale/outage has been waiting for. Fire-and-forget: never
    // blocks the tick broadcast above, which every subscriber (chart, order
    // ticket, watchlist) depends on regardless of whether anything is
    // queued. services/realtime is the only part of this system with live
    // market data (packages/database has none, by design — ENG-028), so
    // this is the only place execution can happen.
    void executeQueuedReductions(db, {
      symbol: tick.symbol,
      market: {
        bid: tick.bid,
        ask: tick.ask,
        timestamp: tick.timestamp,
        sequence: String(tick.sequence),
      },
      marketBySymbol: readAllMarkets(market),
      now: new Date(),
    })
      .then((executed) => {
        // The order_result broadcast alone is enough: it's the exact same
        // signal a normal immediate partial/full close produces, and every
        // client already resubscribes to account.state after any
        // order_result (see the order_result handler below), which
        // refreshes AccountSnapshot.queuedReductions for free — a settled
        // entry simply stops appearing there (only 'queued' rows are
        // included), no separate "it settled" message needed.
        for (const entry of executed) {
          broadcastOrderResult(
            registry,
            entry.accountId,
            buildResultMessage(
              entry.accountId,
              entry.idempotencyKey,
              entry.queueEntry.mode === 'partial' ? 'partial_close' : 'full_close',
              entry.commandResult,
            ),
          );
        }
      })
      .catch((error: unknown) => {
        logger.error('ws.queued_reduction_execution_failed', {
          symbol: tick.symbol,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      });

    // Prompt 7 Appendix 07-D — same hook point, same fire-and-forget
    // reasoning as executeQueuedReductions above: this fresh tick is the
    // only place a Buy/Sell Limit/Stop order's trigger condition can be
    // evaluated against live prices.
    void triggerPendingOrders(db, {
      symbol: tick.symbol,
      market: {
        bid: tick.bid,
        ask: tick.ask,
        timestamp: tick.timestamp,
        sequence: String(tick.sequence),
      },
      marketBySymbol: readAllMarkets(market),
      now: new Date(),
    })
      .then((triggered) => {
        for (const entry of triggered) {
          broadcastPendingOrderResult(registry, entry.accountId, {
            type: 'pending_order_result',
            idempotencyKey: null,
            status: entry.order.status === 'filled' ? 'active' : 'rejected',
            rejectionCode: entry.order.rejectionCode,
            order: toPendingOrderDTO(entry.order),
          });
          // The order itself settled (filled or failed) via openPosition —
          // broadcast the exact same order_result signal a trader-submitted
          // market order produces, so the client's order/position/fill UI
          // updates through the one code path it already knows how to
          // render, not a second bespoke one.
          if (entry.commandResult) {
            broadcastOrderResult(
              registry,
              entry.accountId,
              buildResultMessage(
                entry.accountId,
                `pending-order:${entry.order.id}`,
                'market_open',
                entry.commandResult,
              ),
            );
          }
        }
      })
      .catch((error: unknown) => {
        logger.error('ws.pending_order_trigger_failed', {
          symbol: tick.symbol,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      });

    // Prompt 7 Appendix 07-D §16/§17 — crossing-based price alerts, same
    // tick-driven evaluation as above. Pushed on userNotificationsChannel,
    // not an account channel — an alert is a personal watch on a symbol,
    // unrelated to any specific trading account.
    void evaluateAlerts(db, {
      symbol: tick.symbol,
      tick: { bid: tick.bid, ask: tick.ask },
      now: new Date(),
    })
      .then((notifications) => {
        for (const notification of notifications) {
          registry.broadcast(
            userNotificationsChannel(notification.userId),
            buildEnvelope({
              type: 'notification.new',
              sequence: 0,
              correlationId: notification.userId,
              payload: { notification: toAlertNotificationDTO(notification) },
            }),
          );
        }
      })
      .catch((error: unknown) => {
        logger.error('ws.alert_evaluation_failed', {
          symbol: tick.symbol,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      });
  });

  // Prompt 07 — Guardian/RiskRibbon liveness: buildAccountSnapshot already
  // live-prices equity/risk on every call, but only runs on (re)subscribe or
  // after an order. This periodically re-runs it (skipping accounts with no
  // open positions) for every account with a live state-channel subscriber,
  // as a separate untracked message type — see accountRiskPreviewMessageSchema's
  // doc comment for why it can't just reuse account.snapshot's sequence.
  //
  // Self-rescheduling setTimeout, not setInterval: each round of per-account
  // DB queries must fully finish before the next round is scheduled, or a
  // slow round (many subscribed accounts, a slow DB) would let ticks pile up
  // concurrently and exhaust the pg.Pool's default 10 connections — starving
  // every other query the service needs to run, not just this loop's own.
  let riskPreviewTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleRiskPreviewTick = (): void => {
    riskPreviewTimer = setTimeout(() => {
      void broadcastRiskPreviews(registry, db, market, symbolSpecs, logger).finally(
        scheduleRiskPreviewTick,
      );
    }, config.ACCOUNT_RISK_PREVIEW_INTERVAL_MS);
  };
  scheduleRiskPreviewTick();
  app.addHook('onClose', (_instance, done) => {
    if (riskPreviewTimer) clearTimeout(riskPreviewTimer);
    done();
  });
}

async function broadcastRiskPreviews(
  registry: ConnectionRegistry,
  db: Db,
  market: MarketDataProvider,
  symbolSpecs: Record<TradableSymbol, LoadedSymbolSpec>,
  logger: Logger,
): Promise<void> {
  const accountIds = registry.subscribedAccountIds();
  await Promise.all(
    accountIds.map(async (accountId) => {
      try {
        const preview = await buildAccountRiskPreview(db, accountId, market, symbolSpecs);
        if (!preview) return;
        registry.broadcast(
          accountStateChannel(accountId),
          buildEnvelope({
            type: 'account.risk_preview',
            sequence: 0,
            correlationId: accountId,
            payload: preview,
          }),
        );
      } catch (error) {
        logger.error('ws.risk_preview_failed', {
          accountId,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }),
  );
}

interface MessageDeps {
  db: Db;
  market: MarketDataProvider;
  symbolSpecs: Record<TradableSymbol, LoadedSymbolSpec>;
  registry: ConnectionRegistry;
  logger: Logger;
}

async function processMessage(
  deps: MessageDeps,
  connectionId: string,
  userId: string,
  raw: Buffer,
): Promise<void> {
  const { db, market, symbolSpecs, registry } = deps;

  if (!registry.checkRateLimit(connectionId, RATE_LIMIT_MAX_MESSAGES, RATE_LIMIT_WINDOW_MS)) {
    sendError(registry, connectionId, 'rate_limited', 'Too many messages — slow down.');
    return;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw.toString());
  } catch {
    sendError(registry, connectionId, 'invalid_json', 'Message must be valid JSON.');
    return;
  }

  const parsed = clientMessageSchema.safeParse(parsedJson);
  if (!parsed.success) {
    sendError(registry, connectionId, 'invalid_message', 'Message failed schema validation.');
    return;
  }
  const msg = parsed.data;

  if (msg.type === 'ping') {
    registry.touchPong(connectionId);
    registry.send(
      connectionId,
      buildEnvelope({
        type: 'pong',
        sequence: 0,
        correlationId: connectionId,
        payload: { serverTime: new Date().toISOString() },
      }),
    );
    return;
  }

  if (msg.type === 'subscribe') {
    // Two passes, each fully parallel — not one sequential await-in-loop.
    // registry.subscribe() must complete for every allowed channel before
    // ANY of the slower sendInitialSnapshot I/O starts: a client that
    // subscribes to [account.state, account.orders, ...] and then fires
    // submit_order right away races broadcastOrderResult against this
    // subscribe handler. If .orders were registered only after .state's
    // (now heavier — buildAccountSnapshot + the symbol_specs query) initial
    // snapshot finished, an order filled in that window would broadcast to
    // .orders before this connection was listed as a subscriber, silently
    // dropping order_result. Found via a real browser check against /trade
    // where the Buy button never left its pending state.
    const checks = await Promise.all(
      msg.channels.map(async (channel) => ({
        channel,
        allowed: await channelAllowed(db, userId, channel),
      })),
    );
    const allowedChannels: string[] = [];
    for (const { channel, allowed } of checks) {
      if (!allowed) {
        sendError(
          registry,
          connectionId,
          'forbidden_channel',
          `Not authorized for channel: ${channel}`,
        );
        continue;
      }
      registry.subscribe(connectionId, channel);
      allowedChannels.push(channel);
    }
    await Promise.all(
      allowedChannels.map((channel) =>
        sendInitialSnapshot(registry, connectionId, db, market, symbolSpecs, channel),
      ),
    );
    return;
  }

  if (msg.type === 'unsubscribe') {
    for (const channel of msg.channels) {
      registry.unsubscribe(connectionId, channel);
    }
    return;
  }

  if (msg.type === 'submit_order') {
    const outcome = await handleSubmitOrder(db, market, userId, msg.order);
    if (outcome === 'not_owner') {
      sendError(registry, connectionId, 'not_owner', 'You do not own this account.');
      return;
    }
    broadcastOrderResult(registry, msg.order.accountId, outcome.message);
    return;
  }

  if (msg.type === 'close_all') {
    const outcome = await handleCloseAll(db, market, symbolSpecs, userId, msg.closeAll);
    if (outcome === 'not_owner') {
      sendError(registry, connectionId, 'not_owner', 'You do not own this account.');
      return;
    }
    for (const message of outcome.messages) {
      broadcastOrderResult(registry, msg.closeAll.accountId, message);
    }
    return;
  }

  if (msg.type === 'queue_reduction') {
    const outcome = await handleQueueReduction(db, market, userId, msg.reduction);
    if (outcome === 'not_owner') {
      sendError(registry, connectionId, 'not_owner', 'You do not own this account.');
      return;
    }
    broadcastQueueReductionResult(registry, msg.reduction.accountId, outcome);
    return;
  }

  if (msg.type === 'cancel_queued_reduction') {
    const outcome = await handleCancelQueuedReduction(db, userId, msg.cancelReduction);
    if (outcome === 'not_owner') {
      sendError(registry, connectionId, 'not_owner', 'You do not own this account.');
      return;
    }
    broadcastQueueReductionResult(registry, msg.cancelReduction.accountId, outcome);
    return;
  }

  if (msg.type === 'create_pending_order') {
    const outcome = await handleCreatePendingOrder(db, market, userId, msg.pendingOrder);
    if (outcome === 'not_owner') {
      sendError(registry, connectionId, 'not_owner', 'You do not own this account.');
      return;
    }
    broadcastPendingOrderResult(registry, msg.pendingOrder.accountId, outcome);
    return;
  }

  if (msg.type === 'modify_pending_order') {
    const outcome = await handleModifyPendingOrder(db, market, userId, msg.pendingOrder);
    if (outcome === 'not_owner') {
      sendError(registry, connectionId, 'not_owner', 'You do not own this account.');
      return;
    }
    broadcastPendingOrderResult(registry, msg.pendingOrder.accountId, outcome);
    return;
  }

  if (msg.type === 'cancel_pending_order') {
    const outcome = await handleCancelPendingOrder(db, userId, msg.pendingOrder);
    if (outcome === 'not_owner') {
      sendError(registry, connectionId, 'not_owner', 'You do not own this account.');
      return;
    }
    broadcastPendingOrderResult(registry, msg.pendingOrder.accountId, outcome);
    return;
  }

  if (msg.type === 'cancel_all_pending_orders') {
    const outcome = await handleCancelAllPendingOrders(db, userId, msg.pendingOrder);
    if (outcome === 'not_owner') {
      sendError(registry, connectionId, 'not_owner', 'You do not own this account.');
      return;
    }
    for (const message of outcome) {
      broadcastPendingOrderResult(registry, msg.pendingOrder.accountId, message);
    }
    return;
  }

  if (msg.type === 'create_price_alert') {
    const outcome = await handleCreatePriceAlert(db, userId, msg.alert);
    broadcastAlertResult(registry, userId, outcome);
    return;
  }

  if (msg.type === 'modify_price_alert') {
    const outcome = await handleModifyPriceAlert(db, userId, msg.alert);
    broadcastAlertResult(registry, userId, outcome);
    return;
  }

  if (msg.type === 'enable_price_alert') {
    const outcome = await handleEnablePriceAlert(db, userId, msg.alert);
    broadcastAlertResult(registry, userId, outcome);
    return;
  }

  if (msg.type === 'disable_price_alert') {
    const outcome = await handleDisablePriceAlert(db, userId, msg.alert);
    broadcastAlertResult(registry, userId, outcome);
    return;
  }

  if (msg.type === 'delete_price_alert') {
    const outcome = await handleDeletePriceAlert(db, userId, msg.alert);
    broadcastAlertResult(registry, userId, outcome);
    return;
  }

  // mark_notifications_read
  await handleMarkNotificationsRead(db, userId, msg.notifications);
}

async function channelAllowed(db: Db, userId: string, channel: string): Promise<boolean> {
  if (channel.startsWith('market.symbol.')) return true;
  const accountMatch = /^account\.([0-9a-f-]+)\./.exec(channel);
  if (accountMatch?.[1]) {
    return verifyAccountOwnership(db, accountMatch[1], userId);
  }
  const userMatch = /^user\.([0-9a-f-]+)\./.exec(channel);
  if (userMatch?.[1]) {
    return userMatch[1] === userId;
  }
  return false;
}

async function sendInitialSnapshot(
  registry: ConnectionRegistry,
  connectionId: string,
  db: Db,
  market: MarketDataProvider,
  symbolSpecs: Record<TradableSymbol, LoadedSymbolSpec>,
  channel: string,
): Promise<void> {
  const accountMatch = /^account\.([0-9a-f-]+)\.state$/.exec(channel);
  if (accountMatch?.[1]) {
    const accountId = accountMatch[1];
    const snapshot = await buildAccountSnapshot(db, accountId, market, symbolSpecs);
    registry.send(
      connectionId,
      buildEnvelope({
        type: 'account.snapshot',
        sequence: snapshot.accountSequence,
        correlationId: connectionId,
        payload: snapshot,
      }),
    );

    // Static for the session — one program-resolved spec set per account,
    // not re-sent on every resubscribe/reconnect noise, just once here.
    const account = await db
      .selectFrom('app.trading_accounts')
      .select('program_type')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    const specs: SymbolSpec[] = (Object.keys(symbolSpecs) as TradableSymbol[]).map((symbol) => ({
      symbol,
      pricePrecision: symbolSpecs[symbol].pricePrecision,
      contractSize: symbolSpecs[symbol].contractSize,
      minimumQuantity: symbolSpecs[symbol].minimumQuantity,
      maximumQuantity: symbolSpecs[symbol].maximumQuantity,
      quantityStep: symbolSpecs[symbol].quantityStep,
      leverage: resolveLeverage(symbolSpecs[symbol], account.program_type),
      commissionPerLot: symbolSpecs[symbol].commissionPerLot,
    }));
    registry.send(
      connectionId,
      buildEnvelope({
        type: 'symbol_specs',
        sequence: 0,
        correlationId: connectionId,
        payload: { specs },
      }),
    );
    return;
  }

  const marketMatch = /^market\.symbol\.([A-Z0-9]+)$/.exec(channel);
  const symbol = marketMatch?.[1];
  if (symbol && TRADABLE_SYMBOLS.includes(symbol as TradableSymbol)) {
    const tick = market.getSnapshot(symbol as TradableSymbol);
    registry.send(
      connectionId,
      buildEnvelope({
        type: 'market.tick',
        sequence: tick.sequence,
        correlationId: symbol,
        payload: tick,
      }),
    );
    return;
  }

  // Prompt 7 Appendix 07-D — user.{userId}.notifications existed in
  // @wariba/contracts since Prompt 01 with no producer/consumer until this
  // appendix. The userId is already encoded in the channel string itself
  // (and was already ownership-checked by channelAllowed before this ever
  // runs), so no separate userId parameter is needed here.
  const notificationsMatch = /^user\.([0-9a-f-]+)\.notifications$/.exec(channel);
  const notificationsUserId = notificationsMatch?.[1];
  if (notificationsUserId) {
    const [alerts, notifications] = await Promise.all([
      loadActiveAlertsForUser(db, notificationsUserId),
      loadNotificationsForUser(db, { userId: notificationsUserId }),
    ]);
    registry.send(
      connectionId,
      buildEnvelope({
        type: 'notifications.snapshot',
        sequence: 0,
        correlationId: connectionId,
        payload: {
          alerts: alerts.map(toPriceAlertDTO),
          notifications: notifications.map(toAlertNotificationDTO),
          unreadCount: notifications.filter((n) => n.readAt === null).length,
        },
      }),
    );
  }
}

function broadcastOrderResult(
  registry: ConnectionRegistry,
  accountId: string,
  message: OrderResultMessage,
): void {
  const envelope = buildEnvelope({
    type: 'order_result',
    sequence: 0,
    correlationId: accountId,
    payload: message,
  });
  registry.broadcast(accountOrdersChannel(accountId), envelope);
  registry.broadcast(accountPositionsChannel(accountId), envelope);
}

function broadcastQueueReductionResult(
  registry: ConnectionRegistry,
  accountId: string,
  message: QueueReductionResultMessage,
): void {
  registry.broadcast(
    accountPositionsChannel(accountId),
    buildEnvelope({
      type: 'queue_reduction_result',
      sequence: 0,
      correlationId: accountId,
      payload: message,
    }),
  );
}

function broadcastPendingOrderResult(
  registry: ConnectionRegistry,
  accountId: string,
  message: PendingOrderResultMessage,
): void {
  const envelope = buildEnvelope({
    type: 'pending_order_result',
    sequence: 0,
    correlationId: accountId,
    payload: message,
  });
  registry.broadcast(accountOrdersChannel(accountId), envelope);
  registry.broadcast(accountPositionsChannel(accountId), envelope);
}

function broadcastAlertResult(
  registry: ConnectionRegistry,
  userId: string,
  message: AlertResultMessage,
): void {
  registry.broadcast(
    userNotificationsChannel(userId),
    buildEnvelope({
      type: 'alert_result',
      sequence: 0,
      correlationId: userId,
      payload: message,
    }),
  );
}

function sendError(
  registry: ConnectionRegistry,
  connectionId: string,
  code: string,
  message: string,
): void {
  registry.send(
    connectionId,
    buildEnvelope({
      type: 'error',
      sequence: 0,
      correlationId: connectionId,
      payload: { code, message },
    }),
  );
}
