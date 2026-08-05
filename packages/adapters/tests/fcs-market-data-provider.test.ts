import { describe, expect, it, vi } from 'vitest';
import {
  FcsMarketDataProvider,
  MarketDataProviderBlockedError,
  parseFcsMessage,
  type FcsProviderConfig,
  type WebSocketLike,
} from '../src/fcs-market-data-provider';

const BASE_CONFIG: FcsProviderConfig = {
  apiKey: '',
  wsPrimaryUrl: 'wss://primary.example/fcs',
  wsSecondaryUrl: 'wss://secondary.example/fcs',
  restBaseUrl: 'https://rest.example/fcs',
  symbols: {
    EURUSD: { providerSymbol: 'EUR/USD', staleThresholdMs: 5000 },
  } as FcsProviderConfig['symbols'],
};

describe('FcsMarketDataProvider — fails fast without a credential (Prompt 07B §16)', () => {
  it('throws MarketDataProviderBlockedError with BLOCKED_BY_CREDENTIAL when FCS_API_KEY is empty', () => {
    expect(() => new FcsMarketDataProvider(BASE_CONFIG)).toThrow(MarketDataProviderBlockedError);
    try {
      new FcsMarketDataProvider(BASE_CONFIG);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MarketDataProviderBlockedError);
      expect((error as MarketDataProviderBlockedError).reason).toBe('BLOCKED_BY_CREDENTIAL');
    }
  });

  it('never attempts to construct a WebSocket when the key is missing', () => {
    const factory = vi.fn();
    expect(() => new FcsMarketDataProvider(BASE_CONFIG, factory)).toThrow();
    expect(factory).not.toHaveBeenCalled();
  });

  it('throws when the primary URL or REST base URL is missing even with a key present', () => {
    expect(
      () => new FcsMarketDataProvider({ ...BASE_CONFIG, apiKey: 'real-key', wsPrimaryUrl: '' }),
    ).toThrow(MarketDataProviderBlockedError);
  });
});

function fakeSocket(): WebSocketLike & {
  emit: (type: string, event?: unknown) => void;
  sent: string[];
} {
  const listeners = new Map<string, Set<(event?: unknown) => void>>();
  const sent: string[] = [];
  return {
    readyState: 1,
    send: (data: string) => sent.push(data),
    close: () => {},
    addEventListener: ((type: string, listener: (event?: unknown) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(listener);
    }) as WebSocketLike['addEventListener'],
    emit: (type: string, event?: unknown) => {
      for (const listener of listeners.get(type) ?? []) listener(event);
    },
    sent,
  };
}

describe('FcsMarketDataProvider — with a credential, using an injected socket factory', () => {
  it('sends a subscription once the socket opens', () => {
    const socket = fakeSocket();
    const provider = new FcsMarketDataProvider(
      { ...BASE_CONFIG, apiKey: 'real-key' },
      () => socket,
    );
    provider.subscribe(['EURUSD'], () => {});
    provider.start();
    socket.emit('open');
    expect(socket.sent.length).toBe(1);
    expect(socket.sent[0]).toContain('EUR/USD');
  });

  it('caches and serves the last received tick via getSnapshot', () => {
    const socket = fakeSocket();
    const provider = new FcsMarketDataProvider(
      { ...BASE_CONFIG, apiKey: 'real-key' },
      () => socket,
    );
    provider.start();
    socket.emit('message', {
      data: JSON.stringify({
        symbol: 'EUR/USD',
        bid: '1.08000',
        ask: '1.08010',
        timestamp: '2026-08-05T00:00:00.000Z',
      }),
    });
    const tick = provider.getSnapshot('EURUSD');
    expect(tick.bid).toBe('1.08000');
    expect(tick.ask).toBe('1.08010');
  });

  it('throws when asked for a snapshot before any tick has arrived — never fabricates a price', () => {
    const socket = fakeSocket();
    const provider = new FcsMarketDataProvider(
      { ...BASE_CONFIG, apiKey: 'real-key' },
      () => socket,
    );
    provider.start();
    expect(() => provider.getSnapshot('EURUSD')).toThrow();
  });

  it('reports its provider name as fcs', () => {
    const socket = fakeSocket();
    const provider = new FcsMarketDataProvider(
      { ...BASE_CONFIG, apiKey: 'real-key' },
      () => socket,
    );
    expect(provider.providerName).toBe('fcs');
  });
});

describe('parseFcsMessage — fails closed on anything unexpected', () => {
  const bySymbol = new Map([['EUR/USD', 'EURUSD' as const]]);

  it('parses a well-formed message', () => {
    const tick = parseFcsMessage(
      JSON.stringify({ symbol: 'EUR/USD', bid: '1.1', ask: '1.2' }),
      bySymbol,
    );
    expect(tick?.symbol).toBe('EURUSD');
  });

  it('returns null for an unmapped provider symbol', () => {
    expect(
      parseFcsMessage(JSON.stringify({ symbol: 'GBP/USD', bid: '1', ask: '1' }), bySymbol),
    ).toBeNull();
  });

  it('returns null for non-JSON data', () => {
    expect(parseFcsMessage('not json', bySymbol)).toBeNull();
  });

  it('returns null when bid/ask are missing', () => {
    expect(parseFcsMessage(JSON.stringify({ symbol: 'EUR/USD' }), bySymbol)).toBeNull();
  });
});
