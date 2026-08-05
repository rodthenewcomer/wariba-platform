import { describe, expect, it } from 'vitest';
import { createLogger } from '../src/logger';

describe('createLogger', () => {
  it('emits structured JSON with service, level and event', () => {
    const lines: string[] = [];
    const logger = createLogger({
      service: 'web',
      module: 'health',
      write: (line) => lines.push(line),
      now: () => new Date('2026-08-01T00:00:00.000Z'),
    });

    logger.info('health.checked', { correlationId: 'corr-1' });

    expect(lines).toHaveLength(1);
    const record = JSON.parse(lines[0] as string);
    expect(record).toMatchObject({
      timestamp: '2026-08-01T00:00:00.000Z',
      level: 'info',
      service: 'web',
      module: 'health',
      event: 'health.checked',
      correlationId: 'corr-1',
    });
  });

  it('redacts fields that look like secrets', () => {
    const lines: string[] = [];
    const logger = createLogger({ service: 'worker', write: (line) => lines.push(line) });

    logger.error('payment.webhook_invalid', { token: 'super-secret-value' });

    const record = JSON.parse(lines[0] as string);
    expect(record.token).toBe('[REDACTED]');
  });

  it('respects minLevel and drops lower-severity logs', () => {
    const lines: string[] = [];
    const logger = createLogger({
      service: 'realtime',
      minLevel: 'warn',
      write: (line) => lines.push(line),
    });

    logger.info('ignored.event');
    logger.warn('kept.event');

    expect(lines).toHaveLength(1);
  });

  it('redacts forbidden fields nested inside an object or array', () => {
    const lines: string[] = [];
    const logger = createLogger({ service: 'worker', write: (line) => lines.push(line) });

    logger.error('payment.webhook_invalid', {
      nested: { password: 'hunter2', items: [{ apiKey: 'sk-1' }] },
    });

    const record = JSON.parse(lines[0] as string);
    expect(record.nested.password).toBe('[REDACTED]');
    expect(record.nested.items[0].apiKey).toBe('[REDACTED]');
  });

  it('redacts authorization, cookie, and session fields', () => {
    const lines: string[] = [];
    const logger = createLogger({ service: 'realtime', write: (line) => lines.push(line) });

    logger.warn('auth.rejected', { authorization: 'Bearer xyz', cookie: 'sid=abc', session: 's1' });

    const record = JSON.parse(lines[0] as string);
    expect(record.authorization).toBe('[REDACTED]');
    expect(record.cookie).toBe('[REDACTED]');
    expect(record.session).toBe('[REDACTED]');
  });

  it('never lets caller-supplied context override reserved record fields', () => {
    const lines: string[] = [];
    const logger = createLogger({
      service: 'worker',
      write: (line) => lines.push(line),
      now: () => new Date('2026-08-01T00:00:00.000Z'),
    });

    logger.error('payment.failed', {
      level: 'debug',
      timestamp: 'spoofed',
      service: 'spoofed',
      event: 'spoofed',
      reason: 'card_declined',
    });

    const record = JSON.parse(lines[0] as string);
    expect(record.level).toBe('error');
    expect(record.timestamp).toBe('2026-08-01T00:00:00.000Z');
    expect(record.service).toBe('worker');
    expect(record.event).toBe('payment.failed');
    expect(record.reason).toBe('card_declined');
  });

  it('child() merges bindings without mutating the parent', () => {
    const lines: string[] = [];
    const logger = createLogger({ service: 'web', write: (line) => lines.push(line) });
    const child = logger.child({ accountId: 'acc-1' });

    child.info('order.submitted');
    logger.info('unrelated.event');

    const first = JSON.parse(lines[0] as string);
    const second = JSON.parse(lines[1] as string);
    expect(first.accountId).toBe('acc-1');
    expect(second.accountId).toBeUndefined();
  });
});
