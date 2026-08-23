'use client';

import { useState } from 'react';
import { ActivityTimeline } from '@wariba/ui';
import type { ActivityItem } from '@wariba/application/presentation';

/**
 * What changed recently, without becoming the page.
 *
 * ## Why this is capped
 *
 * The dashboard rendered twelve events at once, and on the populated account
 * that feed was visibly taller than the risk panel, the mission and the
 * performance snapshot combined. A chronological log that outweighs the
 * analytics turns a command centre into a log viewer: the eye lands on the
 * longest column, and the longest column was the one answering the least
 * important question. On a phone it pushed the trader's own numbers several
 * screens down.
 *
 * Five is enough to answer "what just happened". The rest is one tap away.
 *
 * ## Why it expands in place and does not link anywhere
 *
 * There is no activity route, and inventing a link to one would be a
 * navigation promise the product cannot keep. The history is not truncated
 * either — every event the read model returned is still here, behind a
 * disclosure, which is the honest way to say "there is more" without building
 * a page to hold it.
 */

const COLLAPSED_COUNT = 5;

export function RecentActivity({ items }: { items: readonly ActivityItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > COLLAPSED_COUNT;
  const shown = expanded ? items : items.slice(0, COLLAPSED_COUNT);

  return (
    <>
      <ActivityTimeline items={[...shown]} />

      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          data-testid="activity-see-all"
          className="self-start rounded-[8px] text-[length:var(--wariba-font-size-label-sm)] font-medium text-[color:var(--wariba-accent-indigo)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
        >
          {expanded ? 'Réduire l’activité' : `Voir toute l’activité (${items.length})`}
        </button>
      ) : null}
    </>
  );
}
