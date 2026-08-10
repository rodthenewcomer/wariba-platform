import 'server-only';
import type { RealtimeHealthReport } from '@wariba/application';
import { loadWebConfig } from './config';

/**
 * Server-side probe of the realtime service's own /health report — the
 * source certified in Appendix 08-A, and the only place process, standby
 * and tick state exist.
 *
 * Server-side on purpose: the browser must never call the realtime service
 * directly for operational data. It also means no credential is involved —
 * /health is an unauthenticated liveness report carrying no secret, and
 * Control forwards nothing to it.
 *
 * A failure here is never an error the operator sees as a crash, and never
 * a silent "healthy". It returns null, and the view marks every field this
 * report owns as unavailable.
 */
const PROBE_TIMEOUT_MS = 1500;

export async function probeRealtimeHealth(): Promise<RealtimeHealthReport | null> {
  let healthUrl: string;
  try {
    const wsUrl = loadWebConfig().NEXT_PUBLIC_REALTIME_WS_URL;
    healthUrl = `${wsUrl.replace(/^ws(s?):/, 'http$1:').replace(/\/ws$/, '')}/health`;
  } catch {
    return null;
  }

  // A slow or hung realtime process must not hold the Control page open;
  // an unanswered probe is simply unknown state.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(healthUrl, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as RealtimeHealthReport;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
