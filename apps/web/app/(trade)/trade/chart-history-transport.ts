'use client';

import type {
  MarketHistoryErrorMessage,
  MarketHistoryRequest,
  MarketHistoryResult,
  MessageEnvelope,
} from '@wariba/contracts';
import type { RealtimeClient } from '../../../lib/realtime-client';
import type { ChartHistoryTransport } from './chart-history';

/**
 * Adapts the session's one `RealtimeClient` to the chart's history port — W3 §26.
 *
 * It exists so the history controller depends on a three-method interface it can
 * be tested against, rather than on the websocket client, while the session
 * still owns exactly one socket and one message handler. The hub is created once
 * per session and outlives each connection: `attach` binds it to whichever
 * client is currently live, so a reconnect swaps the sender underneath the
 * controller without the chart re-subscribing to anything.
 *
 * No React state anywhere in here. A history response must not re-render the
 * workstation shell (W3 §76), so nothing about it passes through `useState`.
 */
export interface ChartHistoryTransportHub extends ChartHistoryTransport {
  /** Bind to a live client for that connection's lifetime. Returns a detach. */
  attach(client: RealtimeClient): () => void;
  /**
   * Route one already-payload-validated envelope. Returns true when it was a
   * history envelope, so the session's handler can stop there.
   */
  deliver(envelope: MessageEnvelope): boolean;
}

export function createChartHistoryTransportHub(): ChartHistoryTransportHub {
  const resultListeners = new Set<(result: MarketHistoryResult) => void>();
  const errorListeners = new Set<(error: MarketHistoryErrorMessage) => void>();
  const socketOpenListeners = new Set<() => void>();
  let send: ((request: MarketHistoryRequest) => void) | null = null;
  let pending: MarketHistoryRequest | null = null;

  return {
    request(request) {
      // Keep the latest read request until a correlated response lands. This
      // closes the narrow mount race where the controller starts while the
      // socket object exists but has not reached OPEN yet: RealtimeClient
      // correctly drops writes in that state, and the socket-open callback now
      // retries that same bounded read instead of leaving the chart loading.
      pending = request;
      send?.(request);
    },
    onResult(listener) {
      resultListeners.add(listener);
      return () => resultListeners.delete(listener);
    },
    onError(listener) {
      errorListeners.add(listener);
      return () => errorListeners.delete(listener);
    },
    onSocketOpen(listener) {
      socketOpenListeners.add(listener);
      return () => socketOpenListeners.delete(listener);
    },
    attach(client) {
      const attachedSend = (request: MarketHistoryRequest) => client.requestMarketHistory(request);
      send = attachedSend;
      const offOpen = client.onSocketOpen(() => {
        if (pending) send?.(pending);
        for (const listener of socketOpenListeners) listener();
      });
      return () => {
        offOpen();
        // A superseded connection can finish closing after its replacement is
        // already attached. Only clear the sender this attachment installed;
        // otherwise that late cleanup disconnects chart history from the live
        // socket while quotes continue normally.
        if (send === attachedSend) send = null;
      };
    },
    deliver(envelope) {
      if (envelope.type === 'market_history_result') {
        const result = envelope.payload as MarketHistoryResult;
        if (pending?.requestId === result.requestId) pending = null;
        for (const listener of resultListeners) listener(result);
        return true;
      }
      if (envelope.type === 'market_history_error') {
        const error = envelope.payload as MarketHistoryErrorMessage;
        if (pending?.requestId === error.requestId) pending = null;
        for (const listener of errorListeners) listener(error);
        return true;
      }
      return false;
    },
  };
}
