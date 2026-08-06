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
  symbolSpecSchema,
  symbolSpecsMessageSchema,
  accountRiskSchema,
  accountRiskPreviewMessageSchema,
  subscribeMessageSchema,
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

  it.each(['NaN', 'abc', '', '-5', '1e400', '0.1.0', ' '])(
    'rejects a malformed quantity string %j before it can crash Decimal.js downstream',
    (quantity) => {
      const result = submitOrderMessageSchema.safeParse({
        orderType: 'market_open',
        accountId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        idempotencyKey: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        symbol: 'EURUSD',
        side: 'buy',
        quantity,
      });
      expect(result.success).toBe(false);
    },
  );

  it('rejects a malformed stopLoss string on modify_sl', () => {
    const result = submitOrderMessageSchema.safeParse({
      orderType: 'modify_sl',
      accountId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      idempotencyKey: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      positionId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      stopLoss: 'not-a-number',
    });
    expect(result.success).toBe(false);
  });
});

describe('subscribeMessageSchema', () => {
  it('accepts a normal-sized channel list', () => {
    const result = subscribeMessageSchema.safeParse({
      type: 'subscribe',
      channels: ['account.acc-1.state', 'account.acc-1.orders', 'market.EURUSD'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unbounded channel array (DoS: one query per entry against a shared DB pool)', () => {
    const result = subscribeMessageSchema.safeParse({
      type: 'subscribe',
      channels: Array.from({ length: 5000 }, (_, i) => `account.acc-1.state-${i}`),
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate channel entries', () => {
    const result = subscribeMessageSchema.safeParse({
      type: 'subscribe',
      channels: ['market.EURUSD', 'market.EURUSD'],
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

describe('symbolSpecsMessageSchema — Prompt 07', () => {
  it('accepts a well-formed symbol spec', () => {
    const result = symbolSpecSchema.safeParse({
      symbol: 'EURUSD',
      pricePrecision: 5,
      contractSize: '100000',
      minimumQuantity: '0.01',
      maximumQuantity: '10',
      quantityStep: '0.01',
      leverage: 100,
      commissionPerLot: '3.5000',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a full specs message with no top-level type field (lives on the envelope)', () => {
    const result = symbolSpecsMessageSchema.safeParse({
      specs: [
        {
          symbol: 'XAUUSD',
          pricePrecision: 2,
          contractSize: '100',
          minimumQuantity: '0.01',
          maximumQuantity: '5',
          quantityStep: '0.01',
          leverage: 20,
          commissionPerLot: '4.0000',
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('accountRiskSchema — concentration (Prompt 07 Guardian)', () => {
  const base = {
    status: 'active' as const,
    programEligibleBalance: '10000.00',
    programEligibleEquity: '10000.00',
    target: { required: '1000.00', current: '0.00', reached: false },
    dailyLoss: {
      reference: '10000.00',
      floor: '9700.00',
      used: '0.00',
      remaining: '300.00',
      softLockTriggered: false,
    },
    maximumLoss: { floor: '9000.00', remaining: '1000.00', breached: false },
    bestDay: { ratio: null, compliant: true },
    eligibility: { passEligible: false, blockingReasons: [] },
    shortDurationMonitoring: { status: 'normal' as const, count24h: 0 },
  };

  it('requires a concentration array — dropping partial-fill-era assumptions forward, not silently optional', () => {
    expect(accountRiskSchema.safeParse(base).success).toBe(false);
  });

  it('accepts an empty concentration array (legacy account with no v1.1 exposure row)', () => {
    const result = accountRiskSchema.safeParse({ ...base, concentration: [] });
    expect(result.success).toBe(true);
  });

  it('accepts populated concentration buckets', () => {
    const result = accountRiskSchema.safeParse({
      ...base,
      concentration: [
        { bucket: 'forex', usedQuantity: '0.30', limitQuantity: '1.00', usedRatio: '0.3000' },
        { bucket: 'xauusd', usedQuantity: '0', limitQuantity: '0.50', usedRatio: '0.0000' },
        { bucket: 'nas100', usedQuantity: '0', limitQuantity: '1', usedRatio: '0.0000' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown bucket name', () => {
    const result = accountRiskSchema.safeParse({
      ...base,
      concentration: [{ bucket: 'crypto', usedQuantity: '0', limitQuantity: '1', usedRatio: '0' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('accountRiskPreviewMessageSchema — Prompt 07 throttled push', () => {
  it('accepts a preview with risk still null (no daily snapshot yet)', () => {
    const result = accountRiskPreviewMessageSchema.safeParse({
      accountId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      equity: '10050.00',
      risk: null,
    });
    expect(result.success).toBe(true);
  });
});
