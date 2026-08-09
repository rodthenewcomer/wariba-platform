import { describe, expect, it } from 'vitest';
import { RealtimeOperationalMetrics } from '../src/metrics';

describe('RealtimeOperationalMetrics', () => {
  it('tracks reconnects, tick rejection reasons, and latency percentiles', () => {
    const metrics = new RealtimeOperationalMetrics();
    metrics.connectionOpened('user-a');
    metrics.connectionClosed();
    metrics.connectionOpened('user-a');
    metrics.tick('accepted');
    metrics.tick('duplicate');
    metrics.tick('out_of_order');
    metrics.commandReceived();
    metrics.commandRejected();
    for (const latency of [10, 20, 30, 40, 50]) metrics.observeCommandLatency(latency);

    expect(metrics.snapshot()).toMatchObject({
      connectedClients: 1,
      connectionsTotal: 2,
      reconnects: 1,
      acceptedTicks: 1,
      duplicateTicks: 1,
      outOfOrderTicks: 1,
      commandsReceived: 1,
      commandsRejected: 1,
      commandLatencyMs: { p50: 30, p95: 50, p99: 50 },
    });
  });
});
