'use client';

import {
  messageEnvelopeSchema,
  marketTickSchema,
  accountSnapshotSchema,
  orderResultMessageSchema,
  symbolSpecsMessageSchema,
  accountRiskPreviewMessageSchema,
  type MessageEnvelope,
  type SubmitOrderMessage,
  type CloseAllMessage,
} from '@wariba/contracts';

export type RealtimeConnectionState = 'connecting' | 'resyncing' | 'open' | 'closed';

type MessageListener = (envelope: MessageEnvelope) => void;
type StateListener = (state: RealtimeConnectionState) => void;

const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000];

/**
 * Thin reconnecting WebSocket client. System Architecture §62-64: on
 * reconnect, re-subscribe to the same channels — the server replies with a
 * fresh full snapshot per channel rather than replaying from an arbitrary
 * sequence (the documented V1 resync strategy), so there's no client-side
 * gap-filling logic to get wrong here.
 */
export class RealtimeClient {
  private socket: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByCaller = false;
  private readonly subscribedChannels = new Set<string>();
  private readonly messageListeners = new Set<MessageListener>();
  private readonly stateListeners = new Set<StateListener>();
  private readonly lastSequenceByChannel = new Map<string, number>();

  constructor(
    private readonly wsUrl: string,
    private readonly getAccessToken: () => Promise<string | null>,
  ) {}

  async connect(): Promise<void> {
    this.closedByCaller = false;
    const token = await this.getAccessToken();
    if (!token) {
      // No socket gets created, so the 'close' listener that normally
      // arms scheduleReconnect() never fires — without this, a session
      // whose access token happens to be unavailable/expired on any one
      // reconnect attempt (not just the first connect) would stop
      // retrying forever, with no further recovery short of a manual
      // page reload, even after the token becomes available again (e.g.
      // Supabase finishes a background refresh).
      this.emitState('closed');
      if (!this.closedByCaller) this.scheduleReconnect();
      return;
    }

    this.emitState('connecting');
    const socket = new WebSocket(`${this.wsUrl}?token=${encodeURIComponent(token)}`);
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.reconnectAttempt = 0;
      this.lastSequenceByChannel.clear();
      this.emitState('open');
      if (this.subscribedChannels.size > 0) {
        this.send({ type: 'subscribe', channels: [...this.subscribedChannels] });
      }
    });

    socket.addEventListener('message', (event: MessageEvent<string>) => {
      try {
        const parsed = messageEnvelopeSchema.safeParse(JSON.parse(event.data) as unknown);
        if (!parsed.success) return;
        const envelope = parsed.data;
        if (!this.hasValidPayload(envelope)) return;
        const channel = this.channelForEnvelope(envelope);
        if (channel) {
          const previous = this.lastSequenceByChannel.get(channel);
          if (previous !== undefined && envelope.sequence <= previous) return;
          if (previous !== undefined && envelope.sequence > previous + 1) {
            this.lastSequenceByChannel.delete(channel);
            this.emitState('resyncing');
            this.send({ type: 'subscribe', channels: [channel] });
            return;
          }
          this.lastSequenceByChannel.set(channel, envelope.sequence);
          this.emitState('open');
        }
        for (const listener of this.messageListeners) listener(envelope);
      } catch {
        // Malformed frame — ignore rather than crash the UI.
      }
    });

    socket.addEventListener('close', () => {
      this.emitState('closed');
      if (!this.closedByCaller) this.scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      // 'close' always follows 'error' for browser WebSocket — reconnect logic lives there.
    });
  }

  private hasValidPayload(envelope: MessageEnvelope): boolean {
    if (envelope.type === 'market.tick')
      return marketTickSchema.safeParse(envelope.payload).success;
    if (envelope.type === 'account.snapshot')
      return accountSnapshotSchema.safeParse(envelope.payload).success;
    if (envelope.type === 'order_result')
      return orderResultMessageSchema.safeParse(envelope.payload).success;
    if (envelope.type === 'symbol_specs')
      return symbolSpecsMessageSchema.safeParse(envelope.payload).success;
    if (envelope.type === 'account.risk_preview')
      return accountRiskPreviewMessageSchema.safeParse(envelope.payload).success;
    if (envelope.type === 'error') {
      const payload = envelope.payload as { code?: unknown; message?: unknown };
      return typeof payload.code === 'string' && typeof payload.message === 'string';
    }
    if (envelope.type === 'pong') {
      const payload = envelope.payload as { serverTime?: unknown };
      return typeof payload.serverTime === 'string';
    }
    // Fail closed, not open: every envelope type services/realtime actually
    // sends is listed above. An unrecognized type reaching here means either
    // a new server message type shipped without updating this list, or a
    // malformed/adversarial payload — either way, downstream code treats
    // `envelope.payload` as pre-validated (blind `as` casts in
    // TradeClient.tsx), so it must never fall through unchecked.
    return false;
  }

  private channelForEnvelope(envelope: MessageEnvelope): string | null {
    if (envelope.type === 'market.tick') {
      const payload = envelope.payload as { symbol?: unknown };
      return typeof payload.symbol === 'string' ? `market.symbol.${payload.symbol}` : null;
    }
    if (envelope.type === 'account.snapshot') {
      const payload = envelope.payload as { accountId?: unknown };
      return typeof payload.accountId === 'string' ? `account.${payload.accountId}.state` : null;
    }
    // symbol_specs and account.risk_preview are deliberately untracked here —
    // see accountRiskPreviewMessageSchema's doc comment (packages/contracts):
    // they don't carry trading_accounts.version-based sequence numbers, so
    // gap-detection would misfire on them.
    return null;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay =
      RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  subscribe(channels: string[]): void {
    for (const c of channels) this.subscribedChannels.add(c);
    this.send({ type: 'subscribe', channels });
  }

  unsubscribe(channels: string[]): void {
    for (const c of channels) this.subscribedChannels.delete(c);
    this.send({ type: 'unsubscribe', channels });
  }

  submitOrder(order: SubmitOrderMessage): void {
    this.send({ type: 'submit_order', order });
  }

  closeAll(closeAll: CloseAllMessage): void {
    this.send({ type: 'close_all', closeAll });
  }

  private send(payload: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private emitState(state: RealtimeConnectionState): void {
    for (const listener of this.stateListeners) listener(state);
  }

  close(): void {
    this.closedByCaller = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.lastSequenceByChannel.clear();
  }
}
