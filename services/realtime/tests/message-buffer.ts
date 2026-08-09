import type { RawData } from 'ws';

export interface RealtimeMessage {
  type: string;
  payload: unknown;
  correlationId?: string;
}

type MessagePredicate = (message: RealtimeMessage) => boolean;
type MessageListener = (raw: RawData) => void;

export interface MessageSocket {
  on(event: 'message', listener: MessageListener): unknown;
  off(event: 'message', listener: MessageListener): unknown;
}

interface PendingWaiter {
  predicate: MessagePredicate;
  resolve: (message: RealtimeMessage) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout> | null;
}

export interface MessageBuffer {
  waitForMessage(predicate: MessagePredicate, timeoutMs?: number): Promise<RealtimeMessage>;
  dispose(): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseMessage(raw: RawData): RealtimeMessage | null {
  try {
    const value: unknown = JSON.parse(raw.toString());
    if (!isRecord(value) || typeof value.type !== 'string' || !Object.hasOwn(value, 'payload')) {
      return null;
    }

    const message: RealtimeMessage = { type: value.type, payload: value.payload };
    if (typeof value.correlationId === 'string') message.correlationId = value.correlationId;
    return message;
  } catch {
    return null;
  }
}

export function createMessageBuffer(ws: MessageSocket, defaultTimeoutMs: number): MessageBuffer {
  const messages: RealtimeMessage[] = [];
  const waiters = new Set<PendingWaiter>();
  let disposed = false;

  const takeMatchingMessage = (predicate: MessagePredicate): RealtimeMessage | undefined => {
    const index = messages.findIndex(predicate);
    if (index < 0) return undefined;
    return messages.splice(index, 1)[0];
  };

  const resolveMatchingWaiters = (): void => {
    for (const waiter of [...waiters]) {
      const message = takeMatchingMessage(waiter.predicate);
      if (!message) continue;

      if (waiter.timer !== null) clearTimeout(waiter.timer);
      waiters.delete(waiter);
      waiter.resolve(message);
    }
  };

  const onMessage = (raw: RawData): void => {
    const message = parseMessage(raw);
    if (!message) return;

    messages.push(message);
    resolveMatchingWaiters();
  };

  ws.on('message', onMessage);

  return {
    waitForMessage(predicate, timeoutMs = defaultTimeoutMs) {
      const message = takeMatchingMessage(predicate);
      if (message) return Promise.resolve(message);
      if (disposed) return Promise.reject(new Error('message buffer has been disposed'));

      return new Promise((resolve, reject) => {
        const waiter: PendingWaiter = {
          predicate,
          resolve,
          reject,
          timer: null,
        };
        waiter.timer = setTimeout(() => {
          waiters.delete(waiter);
          reject(new Error('timed out waiting for a matching message'));
        }, timeoutMs);
        waiters.add(waiter);
        resolveMatchingWaiters();
      });
    },
    dispose() {
      if (disposed) return;

      disposed = true;
      ws.off('message', onMessage);
      messages.length = 0;
      for (const waiter of waiters) {
        if (waiter.timer !== null) clearTimeout(waiter.timer);
        waiter.reject(new Error('message buffer has been disposed'));
      }
      waiters.clear();
    },
  };
}
