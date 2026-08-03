'use client';

import type { MessageEnvelope, SubmitOrderMessage, CloseAllMessage } from '@wariba/contracts';

export type RealtimeConnectionState = 'connecting' | 'open' | 'closed';

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

  constructor(
    private readonly wsUrl: string,
    private readonly getAccessToken: () => Promise<string | null>,
  ) {}

  async connect(): Promise<void> {
    this.closedByCaller = false;
    const token = await this.getAccessToken();
    if (!token) return;

    this.emitState('connecting');
    const socket = new WebSocket(`${this.wsUrl}?token=${encodeURIComponent(token)}`);
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.reconnectAttempt = 0;
      this.emitState('open');
      if (this.subscribedChannels.size > 0) {
        this.send({ type: 'subscribe', channels: [...this.subscribedChannels] });
      }
    });

    socket.addEventListener('message', (event: MessageEvent<string>) => {
      try {
        const envelope = JSON.parse(event.data) as MessageEnvelope;
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
  }
}
