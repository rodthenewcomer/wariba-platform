import { afterEach, describe, expect, it } from 'vitest';
import { buildEnvelope } from '@wariba/contracts';
import { RealtimeClient, type RealtimeConnectionState } from '../lib/realtime-client';

type Listener = (event: Event | MessageEvent<string>) => void;

class FakeWebSocket {
  static readonly OPEN = 1;
  static latest: FakeWebSocket | null = null;
  readonly OPEN = 1;
  readyState = FakeWebSocket.OPEN;
  readonly sent: string[] = [];
  private readonly listeners = new Map<string, Listener[]>();

  constructor(readonly url: string) {
    FakeWebSocket.latest = this;
  }

  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  send(payload: string): void {
    this.sent.push(payload);
  }

  close(): void {
    this.readyState = 3;
  }

  emit(type: string, event: Event | MessageEvent<string> = new Event(type)): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

const originalWebSocket = globalThis.WebSocket;

afterEach(() => {
  globalThis.WebSocket = originalWebSocket;
  FakeWebSocket.latest = null;
});

describe('RealtimeClient sequence handling', () => {
  it('detects a market gap, blocks delivery, and requests a fresh channel snapshot', async () => {
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    const states: RealtimeConnectionState[] = [];
    const sequences: number[] = [];
    const client = new RealtimeClient('ws://wariba.test/ws', () => Promise.resolve('token'));
    client.onStateChange((state) => states.push(state));
    client.onMessage((message) => sequences.push(message.sequence));

    await client.connect();
    const socket = FakeWebSocket.latest;
    if (!socket) throw new Error('expected a websocket');
    socket.emit('open');
    client.subscribe(['market.symbol.EURUSD']);

    const tick = (sequence: number) =>
      buildEnvelope({
        type: 'market.tick',
        sequence,
        correlationId: 'EURUSD',
        payload: {
          symbol: 'EURUSD',
          bid: '1.08450',
          ask: '1.08460',
          timestamp: '2026-08-03T00:00:00.000Z',
          sequence,
          marketStatus: 'open',
        },
      });
    socket.emit('message', new MessageEvent('message', { data: JSON.stringify(tick(1)) }));
    socket.emit('message', new MessageEvent('message', { data: JSON.stringify(tick(3)) }));

    expect(sequences).toEqual([1]);
    expect(states).toContain('resyncing');
    expect(socket.sent.map((payload) => JSON.parse(payload) as unknown)).toContainEqual({
      type: 'subscribe',
      channels: ['market.symbol.EURUSD'],
    });

    socket.emit('message', new MessageEvent('message', { data: JSON.stringify(tick(3)) }));
    expect(sequences).toEqual([1, 3]);
    expect(states.at(-1)).toBe('open');
    client.close();
  });

  it('delivers a same-sequence account.snapshot instead of dropping it as a duplicate', async () => {
    // Unlike market.tick's sequence (bumped on every broadcast tick),
    // account.snapshot's sequence is trading_accounts.version — unchanged
    // by a rejected order, even though recentOrders grew by one. A resync
    // fetched after a rejection must still reach the UI (regression guard
    // for the bug the WariX History tab surfaced: a rejected order was
    // silently dropped and never appeared in Positions/Orders/History).
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    const equitySeen: string[] = [];
    const client = new RealtimeClient('ws://wariba.test/ws', () => Promise.resolve('token'));
    client.onMessage((message) => {
      if (message.type === 'account.snapshot') {
        equitySeen.push((message.payload as { equity: string }).equity);
      }
    });
    await client.connect();
    const socket = FakeWebSocket.latest;
    if (!socket) throw new Error('expected a websocket');
    socket.emit('open');
    client.subscribe(['account.11111111-1111-1111-1111-111111111111.state']);

    const snapshot = (equity: string) =>
      buildEnvelope({
        type: 'account.snapshot',
        sequence: 5,
        correlationId: 'conn-1',
        payload: {
          accountId: '11111111-1111-1111-1111-111111111111',
          balance: '10000.00',
          equity,
          accountSequence: 5,
          openPositions: [],
          recentOrders: [],
          risk: null,
        },
      });

    socket.emit('message', new MessageEvent('message', { data: JSON.stringify(snapshot('10000.00')) }));
    // Same sequence (a rejected order never bumps account.version) but a
    // fresh full snapshot fetched afterwards — must still land, not be
    // dropped as a "duplicate".
    socket.emit('message', new MessageEvent('message', { data: JSON.stringify(snapshot('9950.00')) }));

    expect(equitySeen).toEqual(['10000.00', '9950.00']);
    client.close();
  });

  it('drops malformed or duplicate envelopes', async () => {
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    const sequences: number[] = [];
    const client = new RealtimeClient('ws://wariba.test/ws', () => Promise.resolve('token'));
    client.onMessage((message) => sequences.push(message.sequence));
    await client.connect();
    const socket = FakeWebSocket.latest;
    if (!socket) throw new Error('expected a websocket');
    socket.emit('open');
    socket.emit('message', new MessageEvent('message', { data: '{}' }));
    const envelope = buildEnvelope({
      type: 'market.tick',
      sequence: 1,
      correlationId: 'EURUSD',
      payload: {
        symbol: 'EURUSD',
        bid: '1.08450',
        ask: '1.08460',
        timestamp: '2026-08-03T00:00:00.000Z',
        sequence: 1,
        marketStatus: 'open',
      },
    });
    socket.emit('message', new MessageEvent('message', { data: JSON.stringify(envelope) }));
    socket.emit('message', new MessageEvent('message', { data: JSON.stringify(envelope) }));
    expect(sequences).toEqual([1]);
    client.close();
  });
});
