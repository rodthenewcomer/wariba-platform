import { Skeleton } from '@wariba/ui';

/**
 * The catalogue's placeholder, shaped like the catalogue.
 *
 * Three cards with a plate-sized block on the left and three text lines on the
 * right — the geometry the real cards occupy, so the page does not jump when
 * they arrive. What was here before was three 176px grey rectangles.
 */
export default function OffersLoading() {
  return (
    <main className="commerce-shell py-16" aria-busy="true" aria-label="Chargement des offres">
      <Skeleton height="0.75rem" width="16rem" />
      <Skeleton className="mt-6" height="3.5rem" width="min(44rem, 100%)" rounded="md" />
      <Skeleton className="mt-3" height="0.9rem" width="min(30rem, 100%)" />

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((card) => (
          <div key={card} className="commerce-panel flex items-start gap-5 p-5">
            <Skeleton index={card} width="104px" height="78px" rounded="xl" />
            <div className="min-w-0 flex-1">
              <Skeleton index={card} height="0.7rem" width="3rem" />
              <Skeleton index={card} className="mt-3" height="1.1rem" width="80%" />
              <Skeleton index={card} className="mt-3" height="0.7rem" />
              <Skeleton index={card} className="mt-2" height="0.7rem" width="60%" />
            </div>
          </div>
        ))}
      </div>
      <p className="sr-only">Chargement des prix et des versions de règles canoniques.</p>
    </main>
  );
}
