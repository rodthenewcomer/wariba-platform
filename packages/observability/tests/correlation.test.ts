import { describe, expect, it } from 'vitest';
import {
  correlationIdFromHeaders,
  createCorrelationId,
  CORRELATION_ID_HEADER,
} from '../src/correlation';

describe('correlation id', () => {
  it('creates a non-empty unique id', () => {
    const a = createCorrelationId();
    const b = createCorrelationId();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('reuses an incoming correlation id header when present', () => {
    const id = correlationIdFromHeaders({ [CORRELATION_ID_HEADER]: 'incoming-id' });
    expect(id).toBe('incoming-id');
  });

  it('generates a new id when the header is missing', () => {
    const id = correlationIdFromHeaders({});
    expect(id.length).toBeGreaterThan(0);
  });
});
