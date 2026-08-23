import { Suspense } from 'react';
import { ServerErrorState } from './ServerErrorState';
import { safeSupportReference } from '../../../lib/support-reference';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * The standalone 500 route.
 *
 * A correlation id may arrive as `?ref=` when something upstream — a failed
 * server action, an edge redirect, an operator link — has one to hand. It is
 * validated rather than printed: the query string is attacker-controlled, and
 * an unchecked value here would let anyone put arbitrary text on a page
 * wearing the WARIBA mark.
 */
async function ServerError({ searchParams }: PageProps) {
  const params = await searchParams;
  const reference = safeSupportReference(params.ref);
  return <ServerErrorState {...(reference ? { reference } : {})} />;
}

export default function ServerErrorPage(props: PageProps) {
  return (
    <Suspense fallback={<div className="min-h-dvh" role="status" aria-label="Chargement" />}>
      <ServerError {...props} />
    </Suspense>
  );
}
