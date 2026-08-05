import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import { ConnectionRegistry } from '../src/registry';

function fakeSocket(): WebSocket {
  return {
    readyState: 1,
    OPEN: 1,
    send: () => {},
    ping: () => {},
    terminate: () => {},
  } as unknown as WebSocket;
}

describe('ConnectionRegistry', () => {
  it('allConnectionIds returns every registered connection', () => {
    const registry = new ConnectionRegistry();
    registry.register('a', fakeSocket(), 'user-1');
    registry.register('b', fakeSocket(), 'user-2');

    expect(registry.allConnectionIds().sort()).toEqual(['a', 'b']);
  });

  it('drops a connection from allConnectionIds after unregister', () => {
    const registry = new ConnectionRegistry();
    registry.register('a', fakeSocket(), 'user-1');
    registry.unregister('a');

    expect(registry.allConnectionIds()).toEqual([]);
  });

  it('a freshly registered connection is not stale', () => {
    const registry = new ConnectionRegistry();
    registry.register('a', fakeSocket(), 'user-1');

    expect(registry.connectionsStaleSince(45_000)).toEqual([]);
  });

  it('touchPong resets staleness — this is the only thing that keeps a real connection alive, so it must actually work', async () => {
    const registry = new ConnectionRegistry();
    registry.register('a', fakeSocket(), 'user-1');

    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(registry.connectionsStaleSince(0)).toEqual(['a']);
    registry.touchPong('a');
    expect(registry.connectionsStaleSince(0)).toEqual([]);
  });
});
