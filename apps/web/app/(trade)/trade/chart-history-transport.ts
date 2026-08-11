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

  return {
    request(request) {
      // Before the first connection, or between a drop and a reconnect, there
      // is nothing to send on. Dropping the request is correct rather than
      // queueing it: the reconnect fires `onSocketOpen`, which makes the
      // controller start a fresh hydration with a fresh generation anyway.
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
      send = (request) => client.requestMarketHistory(request);
      const offOpen = client.onSocketOpen(() => {
        for (const listener of socketOpenListeners) listener();
      });
      return () => {
        offOpen();
        send = null;
      };
    },
    deliver(envelope) {
      if (envelope.type === 'market_history_result') {
        const result = envelope.payload as MarketHistoryResult;
        for (const listener of resultListeners) listener(result);
        return true;
      }
      if (envelope.type === 'market_history_error') {
        const error = envelope.payload as MarketHistoryErrorMessage;
        for (const listener of errorListeners) listener(error);
        return true;
      }
      return false;
    },
  };
}
