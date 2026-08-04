import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Db, TradableSymbol } from '@wariba/database';
import type { SandboxMarketDataProvider } from '@wariba/adapters';
import {
  subscribeMessageSchema,
  unsubscribeMessageSchema,
  pingMessageSchema,
  submitOrderMessageSchema,
  closeAllMessageSchema,
  buildEnvelope,
  accountStateChannel,
  accountOrdersChannel,
  accountPositionsChannel,
  marketSymbolChannel,
  TRADABLE_SYMBOLS,
  type OrderResultMessage,
  type SymbolSpec,
} from '@wariba/contracts';
import type { Logger } from '@wariba/observability';
import type { RealtimeConfig } from './config';
import { resolveLeverage, type LoadedSymbolSpec } from './market';
import { verifyAccessToken } from './auth';
import { ConnectionRegistry } from './registry';
import { buildAccountSnapshot, buildAccountRiskPreview } from './snapshot';
import { handleSubmitOrder, handleCloseAll, verifyAccountOwnership } from './order-handler';

const clientMessageSchema = z.discriminatedUnion('type', [
  subscribeMessageSchema,
  unsubscribeMessageSchema,
  pingMessageSchema,
  z.object({ type: z.literal('submit_order'), order: submitOrderMessageSchema }),
  z.object({ type: z.literal('close_all'), closeAll: closeAllMessageSchema }),
]);

const HEARTBEAT_INTERVAL_MS = 15_000;
const HEARTBEAT_TIMEOUT_MS = 45_000;
const RATE_LIMIT_MAX_MESSAGES = 30;
const RATE_LIMIT_WINDOW_MS = 10_000;

export function registerWebSocketRoute(
  app: FastifyInstance,
  deps: {
    db: Db;
    market: SandboxMarketDataProvider;
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

    const dispatch = (raw: Buffer): void => {
      if (!connectionId || !userId) {
        queue.push(raw);
        return;
      }
      void processMessage(
        { db, market, symbolSpecs, registry, logger },
        connectionId,
        userId,
        raw,
      ).catch((error: unknown) => {
        logger.error('ws.message_handler_failed', {
          connectionId,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        if (connectionId) {
          sendError(
            registry,
            connectionId,
            'internal_error',
            'Something went wrong processing that message.',
          );
        }
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

  // Server-initiated heartbeat: ping every connection, drop ones that never pong back.
  setInterval(() => {
    for (const connectionId of registry.connectionsStaleSince(HEARTBEAT_TIMEOUT_MS)) {
      const conn = registry.get(connectionId);
      conn?.socket.terminate();
      registry.unregister(connectionId);
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
  market: SandboxMarketDataProvider,
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
  market: SandboxMarketDataProvider;
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
    for (const channel of msg.channels) {
      if (!(await channelAllowed(db, userId, channel))) {
        sendError(
          registry,
          connectionId,
          'forbidden_channel',
          `Not authorized for channel: ${channel}`,
        );
        continue;
      }
      registry.subscribe(connectionId, channel);
      await sendInitialSnapshot(registry, connectionId, db, market, symbolSpecs, channel);
    }
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

  // close_all
  const outcome = await handleCloseAll(db, market, symbolSpecs, userId, msg.closeAll);
  if (outcome === 'not_owner') {
    sendError(registry, connectionId, 'not_owner', 'You do not own this account.');
    return;
  }
  for (const message of outcome.messages) {
    broadcastOrderResult(registry, msg.closeAll.accountId, message);
  }
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
  market: SandboxMarketDataProvider,
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
