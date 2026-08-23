import { Skeleton } from '@wariba/ui';

/**
 * The Hub's own shape while it loads — not a spinner, and not the old shape.
 *
 * A skeleton is a promise about what is arriving. When it draws one shape and
 * the page then renders another, the loading state has told the trader
 * something false about their own dashboard and the layout jumps when the
 * truth arrives.
 *
 * Phase 2.5 changed that shape substantially, so this had to change with it.
 * The hero is no longer a 196px card with a balance and three figures: it
 * carries the identity row, the five-figure telemetry strip, two risk meters
 * and the details footer, which is a little over 300px at desktop widths. The
 * evolution chart is no longer full width — it shares a row with the daily
 * results at 2/1. Both are reflected below.
 *
 * The performance snapshot is deliberately *not* drawn. It renders only for an
 * account with closed trades, and a skeleton that promises a KPI grid to a
 * trader who has never traded is the loading-state version of inventing data:
 * it implies a record that will not appear.
 */
export default function HubLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      {/* Hero — identity, telemetry strip, risk meters, details seam. */}
      <Skeleton height="316px" rounded="lg" />

      {/* Mission checklist beside the health panel. */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Skeleton height="288px" rounded="lg" />
        </div>
        <Skeleton height="288px" rounded="lg" />
      </div>

      {/* Quick actions. */}
      <Skeleton height="132px" rounded="lg" />

      {/* Evolution curve, two thirds, beside the daily results strip. */}
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Skeleton height="272px" rounded="lg" />
        </div>
        <Skeleton height="272px" rounded="lg" />
      </div>

      {/* Open positions and recent activity. */}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Skeleton height="176px" rounded="lg" />
        <Skeleton height="176px" rounded="lg" />
      </div>
    </div>
  );
}
