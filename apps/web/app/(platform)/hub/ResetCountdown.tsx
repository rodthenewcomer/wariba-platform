'use client';

import { useEffect, useState } from 'react';

/**
 * Time until the daily limits reset.
 *
 * ## Why this is allowed to exist
 *
 * §13 permits a countdown only when the boundary is authoritative and
 * deterministic. WARIBA's is: `daily-finalization.ts` partitions on UTC
 * calendar days and `account_daily_snapshots` is keyed on a UTC `trading_day`,
 * so midnight UTC is the instant the finalisation job actually acts on. This
 * is not a marketing timer counting down to nothing.
 *
 * ## Why it recomputes instead of decrementing
 *
 * The server sends an instant, not a duration. Every tick subtracts `Date.now()`
 * from that instant rather than taking one off a local counter, for three
 * reasons that all produce the same bug in different ways:
 *
 * - `setInterval` is throttled in background tabs, often to once a minute. A
 *   decrementing counter loses real time and drifts further the longer the tab
 *   is hidden.
 * - A laptop that sleeps for four hours wakes with a counter four hours wrong.
 * - The first paint after hydration would otherwise inherit whatever value the
 *   server serialised, which was already stale in transit.
 *
 * Recomputing makes all three self-correcting: the display is a pure function
 * of the target and the current clock, so it is right on the tick after any
 * disruption. The visibility listener exists to re-render *immediately* on
 * return rather than to fix drift — there is none to fix.
 *
 * ## Why it stops
 *
 * At zero the countdown stops and says so. A negative timer, or one that
 * silently rolls over to 23:59:59, would both claim something the client
 * cannot know: whether the finalisation job has actually run yet.
 */

function remainingLabel(target: number, now: number): string | null {
  const ms = target - now;
  if (ms <= 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function ResetCountdown({ resetAt, className }: { resetAt: string; className?: string }) {
  const target = new Date(resetAt).getTime();

  /*
   * The first render is deliberately the label with no elapsed time applied.
   *
   * Rendering `Date.now()` during SSR and again during hydration produces two
   * different strings for the same markup, which React reports as a hydration
   * mismatch. Starting from the target and correcting on the first effect tick
   * costs one frame and keeps the server and client output identical.
   */
  const [label, setLabel] = useState<string | null>(() => remainingLabel(target, target - 1000));

  useEffect(() => {
    if (!Number.isFinite(target)) return;

    const tick = () => setLabel(remainingLabel(target, Date.now()));
    tick();

    const interval = window.setInterval(tick, 1000);
    // Not for drift — the recompute above handles that — but so the figure is
    // correct in the same frame the tab becomes visible, rather than up to a
    // second later.
    document.addEventListener('visibilitychange', tick);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [target]);

  if (!Number.isFinite(target)) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)] ${className ?? ''}`}
      data-testid="reset-countdown"
    >
      {label === null ? (
        'Reset en cours'
      ) : (
        <>
          Reset dans{' '}
          {/*
           * Tabular numerals, or the whole line shifts left and right once a
           * second as the digits change width — the single most distracting
           * thing a static dashboard can do.
           */}
          <span className="wariba-data tabular-nums text-[color:var(--wariba-text-secondary)]">
            {label}
          </span>
        </>
      )}
    </span>
  );
}
