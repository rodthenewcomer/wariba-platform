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
