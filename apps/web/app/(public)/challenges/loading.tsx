import { Skeleton } from '@wariba/ui';

/**
 * A product page's placeholder: hero copy on the left, the plate-and-ledger
 * panel on the right, then the four journey steps. The same shape the route
 * resolves to.
 */
export default function ChallengeLoading() {
  return (
    <main className="commerce-shell py-16" aria-busy="true">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
        <div>
          <Skeleton height="0.75rem" width="14rem" />
          <Skeleton className="mt-6" height="4rem" width="min(30rem, 100%)" rounded="md" />
          <Skeleton className="mt-6" height="0.9rem" />
          <Skeleton className="mt-2" height="0.9rem" width="72%" />
          <div className="mt-9 flex gap-3">
            <Skeleton height="50px" width="11rem" rounded="full" />
            <Skeleton index={1} height="50px" width="12rem" rounded="full" />
          </div>
        </div>
        <div className="commerce-hero-ledger">
          <div className="flex justify-center pb-6">
            <Skeleton width="210px" height="158px" rounded="xl" />
          </div>
          <Skeleton height="0.7rem" width="8rem" />
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {[0, 1, 2, 3].map((cell) => (
              <div key={cell}>
                <Skeleton index={cell} height="0.7rem" width="7rem" />
                <Skeleton index={cell} className="mt-2" height="1.2rem" width="5.5rem" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-16 grid gap-5 lg:grid-cols-4">
        {[0, 1, 2, 3].map((step) => (
          <div key={step} className="commerce-panel p-6">
            <Skeleton index={step} width="36px" height="36px" rounded="full" />
            <Skeleton index={step} className="mt-6" height="1.1rem" width="80%" />
            <Skeleton index={step} className="mt-3" height="0.7rem" />
            <Skeleton index={step} className="mt-2" height="0.7rem" width="65%" />
          </div>
        ))}
      </div>
      <p className="sr-only">Chargement du parcours.</p>
    </main>
  );
}
