/**
 * Where one trading day ends and the next begins.
 *
 * ## Why this is a module and not a line of code
 *
 * The boundary is already load-bearing in three places that must agree:
 * `daily-finalization.ts` advances snapshots with `setUTCDate(getUTCDate()+1)`,
 * `account_daily_snapshots` is uniquely keyed on a UTC `trading_day`, and
 * `performance-analytics.ts` buckets fills by `toISOString().slice(0,10)`. A
 * fourth definition written inline for a countdown would be a fourth thing to
 * keep in sync, and the first one to drift would be the one on screen.
 *
 * ## Why the countdown is allowed to exist at all
 *
 * §13 of the phase brief permits a reset countdown only when the boundary is
 * authoritative and deterministic. WARIBA's is both: it is midnight UTC, it is
 * not a rolling window from the trader's first trade, and it is not a
 * marketing timer. So the figure a trader reads off the dashboard is the same
 * instant the finalisation job will act on.
 *
 * The value is exposed as an absolute instant rather than a duration on
 * purpose. A duration computed on the server is already wrong by the time it
 * is painted, and a client that decrements it forever drifts further with
 * every throttled background tick. An instant lets the client recompute the
 * remaining time from its own clock on every frame it cares about, and to
 * reconcile exactly after the tab has been hidden for an hour.
 */

/**
 * The next midnight-UTC boundary strictly after `now`.
 *
 * Exactly-midnight input returns the *following* midnight, never itself: at
 * 00:00:00.000 the day that just started has a full day left to run, and
 * returning the current instant would render a countdown frozen at zero.
 */
export function nextResetAt(now: Date): Date {
  const next = new Date(now);
  next.setUTCHours(0, 0, 0, 0);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

/** The UTC calendar day `now` falls in, as `YYYY-MM-DD`. */
export function tradingDayOf(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Milliseconds from `now` until the next reset. Never negative.
 *
 * Server-side callers use this for tests and for the initial paint; the client
 * countdown recomputes from `nextResetAt` instead of trusting a number that
 * stopped being true the moment it was serialised.
 */
export function millisecondsUntilReset(now: Date): number {
  return Math.max(0, nextResetAt(now).getTime() - now.getTime());
}
