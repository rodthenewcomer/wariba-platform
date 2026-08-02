export interface HealthReport {
  status: 'ok';
  service: 'realtime';
  timestamp: string;
}

/**
 * Foundation-phase health check: process + config are up.
 * DB and market-adapter checks are added in Prompt 04 (Trading Core) alongside
 * the realtime connection itself — see System Architecture §119.
 */
export function checkHealth(now: () => Date = () => new Date()): HealthReport {
  return {
    status: 'ok',
    service: 'realtime',
    timestamp: now().toISOString(),
  };
}
