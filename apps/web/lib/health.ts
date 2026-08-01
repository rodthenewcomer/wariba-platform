export interface HealthReport {
  status: 'ok';
  service: 'web';
  timestamp: string;
}

/**
 * Foundation-phase health check: process + config are up.
 * DB read check is added once Supabase migrations exist beyond the
 * foundation migration — see System Architecture §119.
 */
export function checkHealth(now: () => Date = () => new Date()): HealthReport {
  return {
    status: 'ok',
    service: 'web',
    timestamp: now().toISOString(),
  };
}
