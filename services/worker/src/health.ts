export interface HealthReport {
  status: 'ok';
  service: 'worker';
  timestamp: string;
}

/**
 * Foundation-phase health check: process + config are up.
 * Queue-age and provider-health checks are added once the outbox/jobs table
 * exists (Prompt 03+) — see WARIBA Build Plan §65 and System Architecture §119.
 */
export function checkHealth(now: () => Date = () => new Date()): HealthReport {
  return {
    status: 'ok',
    service: 'worker',
    timestamp: now().toISOString(),
  };
}
