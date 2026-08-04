import { Skeleton } from '@wariba/ui';

/** Design System §33.1 — reflects the real Hub structure, no generic spinner. */
export default function HubLoading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6" aria-busy="true">
      <Skeleton height="72px" rounded="lg" />
      <div className="flex items-center justify-between gap-3">
        <Skeleton width="160px" height="28px" />
        <Skeleton width="120px" height="24px" rounded="full" />
      </div>
      <Skeleton height="220px" rounded="lg" />
      <Skeleton height="56px" rounded="lg" />
      <Skeleton height="140px" rounded="lg" />
      <Skeleton height="180px" rounded="lg" />
    </div>
  );
}
