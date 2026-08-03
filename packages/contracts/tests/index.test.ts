import { describe, expect, it } from 'vitest';
import {
  PACKAGE_NAME,
  marketSymbolChannel,
  accountOrdersChannel,
  messageEnvelopeSchema,
  buildEnvelope,
  marketTickSchema,
  submitOrderMessageSchema,
  orderDtoSchema,
} from '../src/index';

describe('@wariba/contracts scaffold', () => {
  it('exposes its package identity', () => {
    expect(PACKAGE_NAME).toBe('@wariba/contracts');
  });
});

describe('channel names', () => {
  it('builds market and account channel names', () => {
    expect(marketSymbolChannel('EURUSD')).toBe('market.symbol.EURUSD');
    expect(accountOrdersChannel('acc-1')).toBe('account.acc-1.orders');
  });
});

describe('message envelope', () => {
  it('builds a well-formed envelope that round-trips through the schema', () => {
    const envelope = buildEnvelope({
      type: 'market.tick',
      sequence: 42,
      correlationId: 'corr-1',
      payload: { hello: 'world' },
    });
    expect(messageEnvelopeSchema.safeParse(envelope).success).toBe(true);
    expect(envelope.version).toBe(1);
    expect(envelope.sequence).toBe(42);
  });

  it('rejects a negative sequence', () => {
    const result = messageEnvelopeSchema.safeParse({
      type: 'market.tick',
      version: 1,
      sequence: -1,
      occurredAt: new Date().toISOString(),
      correlationId: 'corr-1',
      payload: {},
    });
    expect(result.success).toBe(false);
  });
});

describe('marketTickSchema', () => {
  it('accepts a well-formed tick', () => {
    const result = marketTickSchema.safeParse({
      symbol: 'EURUSD',
      bid: '1.08450',
      ask: '1.08460',
      timestamp: new Date().toISOString(),
      sequence: 1,
      marketStatus: 'open',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown symbol', () => {
    const result = marketTickSchema.safeParse({
      symbol: 'BTCUSD',
      bid: '1.0',
      ask: '1.0',
      timestamp: new Date().toISOString(),
      sequence: 1,
      marketStatus: 'open',
    });
    expect(result.success).toBe(false);
  });
});

describe('submitOrderMessageSchema', () => {
  it('accepts a well-formed market_open message with no price field at all', () => {
    const msg = {
      orderType: 'market_open',
      accountId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      idempotencyKey: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.10',
    };
    const result = submitOrderMessageSchema.safeParse(msg);
    expect(result.success).toBe(true);
    if (result.success) {
      expect('price' in result.data).toBe(false);
    }
  });

  it('accepts a well-formed full_close message', () => {
    const result = submitOrderMessageSchema.safeParse({
      orderType: 'full_close',
      accountId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      idempotencyKey: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      positionId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown orderType', () => {
    const result = submitOrderMessageSchema.safeParse({
      orderType: 'limit_open',
      idempotencyKey: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    });
    expect(result.success).toBe(false);
  });
});

describe('orderDtoSchema', () => {
  it('accepts a well-formed order DTO', () => {
    const result = orderDtoSchema.safeParse({
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      accountId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      idempotencyKey: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      orderType: 'market_open',
      symbol: 'EURUSD',
      side: 'buy',
      positionId: null,
      requestedQuantity: '0.10',
      filledQuantity: '0.10',
      status: 'filled',
      rejectionCode: null,
      receivedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });
});
