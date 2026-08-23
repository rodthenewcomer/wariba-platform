'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AccountTelemetry } from '@wariba/application/presentation';

/**
 * Keeps one account's moving figures current.
 *
 * ## The rules this obeys, and why each exists
 *
 * **One timer per account, not per figure.** §39. Five KPI tiles each holding
 * their own interval is five requests for one answer, arriving at five
 * slightly different instants, so the balance and the daily budget on screen
 * describe two different moments.
 *
 * **Paused while the document is hidden.** A dashboard left open in a
 * background tab overnight is otherwise ~14 000 requests that nobody will ever
 * look at. On return it refreshes immediately rather than waiting out the
 * interval, so the first thing the trader sees is current.
 *
 * **Never overlapping.** The in-flight guard matters more than it looks: under
 * a slow connection a fixed interval will happily start a second request
 * before the first returns, and responses can then land out of order — an
 * older snapshot overwriting a newer one, which on a P&L figure means the
 * number visibly moves backwards. The `capturedAt` comparison is the second
 * line of defence for the same failure.
 *
 * **Aborted on unmount and on account change.** Switching accounts with a
 * request in flight would otherwise paint account A's balance onto account B's
 * dashboard for one frame.
 *
 * ## Staleness is reported, not hidden
 *
 * On failure the last good snapshot is kept — a dashboard that blanks itself
 * because one poll failed is worse than one showing a figure from ninety
 * seconds ago — but it is marked `stale`, and the surface says so. §23: never
 * silently continue to animate stale values, and never label something live
 * that is not.
 */

const DEFAULT_INTERVAL_MS = 4000;

export interface AccountTelemetryState {
  telemetry: AccountTelemetry | null;
  /** The last successful fetch, or null if none has succeeded yet. */
  updatedAt: Date | null;
  stale: boolean;
  /** Stopped for good — the account has no telemetry to report. */
  stopped: boolean;
}

export function useAccountTelemetry(
  accountId: string,
  options?: { intervalMs?: number; enabled?: boolean },
): AccountTelemetryState {
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const enabled = options?.enabled ?? true;

  const [state, setState] = useState<AccountTelemetryState>({
    telemetry: null,
    updatedAt: null,
    stale: false,
    stopped: false,
  });

  const inFlight = useRef<AbortController | null>(null);
  const lastCapturedAt = useRef<number>(0);
  const stopped = useRef(false);

  const poll = useCallback(async () => {
    if (stopped.current) return;
    // A request is already out. Skipping is correct: the one in flight will
    // deliver a fresher answer than a second one started now.
    if (inFlight.current) return;

    const controller = new AbortController();
    inFlight.current = controller;

    try {
      const response = await fetch(`/api/v1/accounts/${accountId}/telemetry`, {
        signal: controller.signal,
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });

      if (response.status === 409 || response.status === 404 || response.status === 401) {
        // Not a transient failure — this account will never have telemetry, or
        // the session is gone. Stop rather than retry forever.
        stopped.current = true;
        setState((previous) => ({ ...previous, stopped: true, stale: false }));
        return;
      }

      if (!response.ok) throw new Error(`telemetry ${response.status}`);

      const body = (await response.json()) as { data: AccountTelemetry };
      const capturedAt = new Date(body.data.capturedAt).getTime();

      // Out-of-order arrival. Keeping the newer snapshot stops a figure from
      // visibly moving backwards.
      if (capturedAt < lastCapturedAt.current) return;
      lastCapturedAt.current = capturedAt;

      setState({
        telemetry: body.data,
        updatedAt: new Date(),
        stale: false,
        stopped: false,
      });
    } catch (error) {
      // An abort is this hook's own doing, not a failure to report.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setState((previous) => ({ ...previous, stale: true }));
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, [accountId]);

  useEffect(() => {
    if (!enabled) return;

    stopped.current = false;
    lastCapturedAt.current = 0;

    let timer: number | undefined;

    const start = () => {
      window.clearInterval(timer);
      timer = window.setInterval(() => {
        if (document.visibilityState === 'visible') void poll();
      }, intervalMs);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh at once — the trader is looking now, not in four seconds.
        void poll();
        start();
      } else {
        window.clearInterval(timer);
        inFlight.current?.abort();
        inFlight.current = null;
      }
    };

    if (document.visibilityState === 'visible') {
      void poll();
      start();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, [poll, intervalMs, enabled]);

  return state;
}
