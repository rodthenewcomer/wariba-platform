import { Skeleton } from '@wariba/ui';

/**
 * Performance, while it loads.
 *
 * The page's real shape: an account switcher, a twelve-tile KPI grid, the
 * balance curve, then the daily results beside the win/loss ring, then the
 * two breakdowns. Drawing that rather than a generic stack means the content
 * lands where the skeleton said it would.
 *
 * Two tile rows, not one: the grid is six across at `xl`, and a single row of
 * placeholders would promise half the figures the page actually reports.
 */
export default function PerformanceLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <Skeleton height="56px" rounded="lg" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 12 }, (_, index) => (
          <Skeleton key={index} height="92px" rounded="lg" />
        ))}
      </div>

      {/* The balance curve. */}
      <Skeleton height="320px" rounded="lg" />

      {/* Daily results, two thirds, beside the win/loss ring. */}
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Skeleton height="276px" rounded="lg" />
        </div>
        <Skeleton height="276px" rounded="lg" />
      </div>

      {/* By instrument, by holding duration. */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Skeleton height="232px" rounded="lg" />
        <Skeleton height="232px" rounded="lg" />
      </div>
    </div>
  );
}
