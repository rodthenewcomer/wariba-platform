import { Skeleton } from '@wariba/ui';

/**
 * The shape a Hub page has while it loads.
 *
 * Every platform route falls back to this except `/hub`, which has its own
 * because its layout is genuinely different. That is the whole discipline of a
 * skeleton: it is a promise about what is arriving, so when it draws one shape
 * and the page renders another, the loading state has told the trader
 * something false about their own screen and the layout jumps when the truth
 * lands.
 *
 * This one draws what the pages here share — a header line with controls, then
 * stacked modules — rather than a spinner, which promises nothing and reads as
 * a stall.
 */
export default function PlatformLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton width="60%" height="20px" />
        <Skeleton width="180px" height="36px" rounded="lg" />
      </div>
      <Skeleton height="140px" rounded="lg" />
      <Skeleton height="220px" rounded="lg" />
      <div className="grid gap-5 xl:grid-cols-2">
        <Skeleton height="180px" rounded="lg" />
        <Skeleton height="180px" rounded="lg" />
      </div>
    </div>
  );
}
