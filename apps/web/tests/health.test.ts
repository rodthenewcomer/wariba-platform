import { describe, expect, it } from 'vitest';
import { checkHealth } from '../lib/health';

describe('web checkHealth', () => {
  it('reports ok with the service name and an ISO timestamp', () => {
    const report = checkHealth(() => new Date('2026-08-01T00:00:00.000Z'));
    expect(report).toEqual({
      status: 'ok',
      service: 'web',
      timestamp: '2026-08-01T00:00:00.000Z',
    });
  });
});
