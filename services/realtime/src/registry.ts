import type { WebSocket } from 'ws';
import type { MessageEnvelope } from '@wariba/contracts';

interface Connection {
  socket: WebSocket;
  userId: string;
  subscribedChannels: Set<string>;
  lastPongAt: number;
  messageTimestamps: number[];
}

/**
 * In-process only — System Architecture §41: a single Realtime instance is
 * acceptable for beta, so there's no cross-instance pub/sub to build yet.
 * Runtime connection/subscription state is an accelerator, never the source
 * of truth (that's always Postgres) — losing this map on restart just means
 * clients reconnect and resync (§62-64).
 */
export class ConnectionRegistry {
  private readonly connections = new Map<string, Connection>();
  private readonly channelSubscribers = new Map<string, Set<string>>();

  register(connectionId: string, socket: WebSocket, userId: string): void {
    this.connections.set(connectionId, {
      socket,
      userId,
      subscribedChannels: new Set(),
      lastPongAt: Date.now(),
      messageTimestamps: [],
    });
  }

  unregister(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;
    for (const channel of conn.subscribedChannels) {
      this.channelSubscribers.get(channel)?.delete(connectionId);
    }
    this.connections.delete(connectionId);
  }

  subscribe(connectionId: string, channel: string): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;
    conn.subscribedChannels.add(channel);
    if (!this.channelSubscribers.has(channel)) {
      this.channelSubscribers.set(channel, new Set());
    }
    this.channelSubscribers.get(channel)?.add(connectionId);
  }

  unsubscribe(connectionId: string, channel: string): void {
    this.connections.get(connectionId)?.subscribedChannels.delete(channel);
    this.channelSubscribers.get(channel)?.delete(connectionId);
  }

  get(connectionId: string): Connection | undefined {
    return this.connections.get(connectionId);
  }

  touchPong(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (conn) conn.lastPongAt = Date.now();
  }

  send(connectionId: string, envelope: MessageEnvelope): void {
    const conn = this.connections.get(connectionId);
    if (!conn || conn.socket.readyState !== conn.socket.OPEN) return;
    conn.socket.send(JSON.stringify(envelope));
  }

  broadcast(channel: string, envelope: MessageEnvelope): void {
    for (const connectionId of this.channelSubscribers.get(channel) ?? []) {
      this.send(connectionId, envelope);
    }
  }

  /** Fixed-window rate limit: at most `limit` messages per `windowMs` per connection. */
  checkRateLimit(connectionId: string, limit: number, windowMs: number): boolean {
    const conn = this.connections.get(connectionId);
    if (!conn) return false;
    const now = Date.now();
    conn.messageTimestamps = conn.messageTimestamps.filter((t) => now - t < windowMs);
    if (conn.messageTimestamps.length >= limit) {
      return false;
    }
    conn.messageTimestamps.push(now);
    return true;
  }

  connectionsStaleSince(cutoffMs: number): string[] {
    const now = Date.now();
    const stale: string[] = [];
    for (const [connectionId, conn] of this.connections) {
      if (now - conn.lastPongAt > cutoffMs) {
        stale.push(connectionId);
      }
    }
    return stale;
  }

  /** Prompt 07 — account IDs with at least one live subscriber on their state channel, for the throttled risk preview loop. */
  subscribedAccountIds(): string[] {
    const ids = new Set<string>();
    for (const [channel, subscribers] of this.channelSubscribers) {
      if (subscribers.size === 0) continue;
      const match = /^account\.([0-9a-f-]+)\.state$/.exec(channel);
      if (match?.[1]) ids.add(match[1]);
    }
    return [...ids];
  }
}
