import { Skeleton } from '@wariba/ui';

/**
 * The shape a Support page has while it loads.
 *
 * `/support` sits outside the `(platform)` route group — one route, two
 * audiences (DEC-3.2-01) — so it does not inherit the Hub's skeleton and needs
 * its own. Drawn from `@wariba/ui`'s `Skeleton`, which paints semantic tokens
 * rather than the Hub's graphite ladder, because this boundary can render
 * inside either shell.
 *
 * It draws what the support surfaces actually share: a lead line, the search
 * field, then a stack of request rows. A skeleton is a promise about what is
 * arriving — one that draws the wrong shape has told the trader something
 * false about their own screen, and the layout jumps when the truth lands.
 * Deliberately no counts, no references and no figures.
 */
export default function SupportLoading() {
  return (
    <div className="flex max-w-3xl flex-col gap-5" aria-busy="true">
      <Skeleton width="70%" height="18px" />
      <Skeleton height="96px" rounded="lg" />
      <Skeleton width="180px" height="14px" />
      <Skeleton height="72px" rounded="lg" />
      <Skeleton height="72px" rounded="lg" />
    </div>
  );
}
