import { Skeleton } from '@wariba/ui';

/**
 * The Hub's own shape while it loads — not a spinner, and not the old shape.
 *
 * A skeleton is a promise about what is arriving. When it draws a 768px column
 * and a 220px chart and the page then renders a full-width hero and a 2/1
 * split, the loading state has told the trader something false about their
 * own dashboard and the layout jumps when the truth arrives.
 */
export default function HubLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      {/* Hero: identity and balance on the left, objective and action right. */}
      <Skeleton height="196px" rounded="lg" />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Skeleton height="260px" rounded="lg" />
        </div>
        <Skeleton height="260px" rounded="lg" />
      </div>
      <Skeleton height="120px" rounded="lg" />
      <div className="grid gap-5 xl:grid-cols-2">
        <Skeleton height="160px" rounded="lg" />
        <Skeleton height="160px" rounded="lg" />
      </div>
    </div>
  );
}
