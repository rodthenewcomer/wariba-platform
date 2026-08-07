import type { RawData } from 'ws';
import { describe, expect, it } from 'vitest';
import { createMessageBuffer } from './message-buffer.js';

class TestMessageSocket {
  private readonly listeners = new Set<(raw: RawData) => void>();

  on(_event: 'message', listener: (raw: RawData) => void): this {
    this.listeners.add(listener);
    return this;
  }

  off(_event: 'message', listener: (raw: RawData) => void): this {
    this.listeners.delete(listener);
    return this;
  }

  emit(raw: RawData): void {
    for (const listener of this.listeners) listener(raw);
  }
}

describe('createMessageBuffer', () => {
  it('retains concurrently delivered initial frames until each is consumed', async () => {
    const socket = new TestMessageSocket();
    const messages = createMessageBuffer(socket, 100);

    socket.emit(
      Buffer.from(JSON.stringify({ type: 'notifications.snapshot', payload: { alerts: [] } })),
    );
    socket.emit(
      Buffer.from(JSON.stringify({ type: 'account.snapshot', payload: { accountId: 'a1' } })),
    );
    socket.emit(
      Buffer.from(JSON.stringify({ type: 'market.tick', payload: { symbol: 'EURUSD' } })),
    );

    await expect(
      messages.waitForMessage((message) => message.type === 'account.snapshot'),
    ).resolves.toEqual({ type: 'account.snapshot', payload: { accountId: 'a1' } });
    await expect(
      messages.waitForMessage((message) => message.type === 'notifications.snapshot'),
    ).resolves.toEqual({ type: 'notifications.snapshot', payload: { alerts: [] } });
    await expect(
      messages.waitForMessage((message) => message.type === 'market.tick'),
    ).resolves.toEqual({ type: 'market.tick', payload: { symbol: 'EURUSD' } });

    messages.dispose();
  });
});
