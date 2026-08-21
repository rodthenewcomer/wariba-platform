/**
 * What the plot shows of a session's executions — VX1-D.1.2 §2.
 *
 * **Presentation only.** Nothing here touches execution history: every fill
 * stays in state, and the authoritative record stays in Trades and Activity,
 * with prices and timestamps. This decides how many *arrows* the chart draws.
 *
 * **The pile this exists to stop.** lightweight-charts stacks markers that
 * share a bar, so on a 5-second timeframe a handful of round trips — which the
 * sandbox feed makes easy, all within a few seconds of each other — produces a
 * vertical column of arrows welded to the right price scale, over the live
 * edge where the entry line, the current-price plate and any nearby protective
 * level are read. Removing the text labels (VX1-D.1.1 §4) took the words away
 * and left the column.
 *
 * Two rules fix it, and both are about *coincidence* rather than about age:
 *
 * 1. Fills that share a bar collapse into one marker carrying `×N`. Four
 *    executions in one five-second bucket are one event at this zoom, and
 *    drawing them as four arrows claims a precision the timeframe does not
 *    have.
 * 2. A phone keeps only the most recent clusters. 390px of chart cannot afford
 *    a growing archive at the live edge, and a closed fill from twenty minutes
 *    ago is history — it belongs in the dock, which is one tap away and states
 *    it exactly.
 */

/**
 * The part of a fill this module needs.
 *
 * Structurally typed rather than importing `FillMarker` from `TradeChart`:
 * this is a pure rule with unit tests, and it should not drag a chart
 * component — and lightweight-charts with it — into a test environment that
 * has no canvas.
 */
export interface ExecutionFill {
  time: number;
  side: 'buy' | 'sell';
  effect: 'open' | 'close';
}

/** How many distinct execution clusters a phone will draw before dropping the oldest. */
export const COMPACT_MARKER_CLUSTER_LIMIT = 3;

export interface ExecutionMarkerCluster {
  time: number;
  /** The side of the most recent fill in the cluster — what the arrow points. */
  side: 'buy' | 'sell';
  /** `open` only when the cluster's latest fill opened a position. */
  effect: 'open' | 'close';
  /** How many fills collapsed into this marker. 1 means a plain arrow. */
  count: number;
}

/**
 * Collapse a session's fills into the clusters the chart should draw.
 *
 * @param compact a phone, which keeps only the most recent clusters.
 */
export function resolveExecutionMarkers(
  fills: readonly ExecutionFill[],
  options: { compact: boolean },
): ExecutionMarkerCluster[] {
  const byBar = new Map<number, ExecutionFill[]>();
  for (const fill of fills) {
    const bucket = byBar.get(fill.time);
    if (bucket) bucket.push(fill);
    else byBar.set(fill.time, [fill]);
  }

  const clusters: ExecutionMarkerCluster[] = [];
  for (const [time, bucket] of byBar) {
    // The latest fill in the bar decides what the single arrow says, because it
    // is the one whose consequence is still on screen.
    const latest = bucket[bucket.length - 1]!;
    clusters.push({ time, side: latest.side, effect: latest.effect, count: bucket.length });
  }
  clusters.sort((a, b) => a.time - b.time);

  return options.compact ? clusters.slice(-COMPACT_MARKER_CLUSTER_LIMIT) : clusters;
}
