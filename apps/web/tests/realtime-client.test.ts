import { afterEach, describe, expect, it, vi } from 'vitest';
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

  it('accepts a same-sequence authoritative snapshot after an explicit resync', async () => {
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    const sequences: number[] = [];
    const client = new RealtimeClient('ws://wariba.test/ws', () => Promise.resolve('token'));
    client.onMessage((message) => sequences.push(message.sequence));
    await client.connect();
    const socket = FakeWebSocket.latest;
    if (!socket) throw new Error('expected a websocket');
    socket.emit('open');

    const tick = buildEnvelope({
      type: 'market.tick',
      sequence: 7,
      correlationId: 'EURUSD',
      payload: {
        symbol: 'EURUSD',
        bid: '1.08450',
        ask: '1.08460',
        timestamp: '2026-08-03T00:00:00.000Z',
        sequence: 7,
        marketStatus: 'open',
      },
    });
    socket.emit('message', new MessageEvent('message', { data: JSON.stringify(tick) }));
    socket.emit('message', new MessageEvent('message', { data: JSON.stringify(tick) }));
    expect(sequences).toEqual([7]);

    client.resync(['market.symbol.EURUSD']);
    socket.emit('message', new MessageEvent('message', { data: JSON.stringify(tick) }));

    expect(sequences).toEqual([7, 7]);
    expect(socket.sent.map((payload) => JSON.parse(payload) as unknown)).toContainEqual({
      type: 'subscribe',
      channels: ['market.symbol.EURUSD'],
    });
    client.close();
  });

  it('accepts a pong envelope and rejects an envelope of an unrecognized type', async () => {
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    const received: string[] = [];
    const client = new RealtimeClient('ws://wariba.test/ws', () => Promise.resolve('token'));
    client.onMessage((message) => received.push(message.type));
    await client.connect();
    const socket = FakeWebSocket.latest;
    if (!socket) throw new Error('expected a websocket');
    socket.emit('open');

    const pong = buildEnvelope({
      type: 'pong',
      sequence: 0,
      correlationId: 'conn-1',
      payload: { serverTime: '2026-08-05T00:00:00.000Z' },
    });
    socket.emit('message', new MessageEvent('message', { data: JSON.stringify(pong) }));

    const unknownType = buildEnvelope({
      type: 'mystery_type',
      sequence: 0,
      correlationId: 'conn-1',
      payload: { anything: 'goes' },
    });
    socket.emit('message', new MessageEvent('message', { data: JSON.stringify(unknownType) }));

    expect(received).toEqual(['pong']);
    client.close();
  });

  it('schedules a reconnect attempt instead of stalling forever when no access token is available', async () => {
    vi.useFakeTimers();
    try {
      globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
      const states: RealtimeConnectionState[] = [];
      let tokenCallCount = 0;
      const client = new RealtimeClient('ws://wariba.test/ws', () => {
        tokenCallCount += 1;
        return Promise.resolve(tokenCallCount === 1 ? null : 'token');
      });
      client.onStateChange((state) => states.push(state));

      await client.connect();
      expect(states).toEqual(['closed']);
      expect(FakeWebSocket.latest).toBeNull();

      await vi.advanceTimersByTimeAsync(1000);
      expect(tokenCallCount).toBe(2);
      expect(FakeWebSocket.latest).not.toBeNull();
      client.close();
    } finally {
      vi.useRealTimers();
    }
  });
});
