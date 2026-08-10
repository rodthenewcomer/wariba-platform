import type { ReactNode } from 'react';

export interface AccountSwitchLinkProps {
  href: string;
  className?: string;
  'aria-current'?: 'page' | undefined;
  prefetch?: boolean;
  children: ReactNode;
}

/**
 * The account switcher's link — a real anchor, deliberately not `next/link`.
 *
 * Switching account changes only a search parameter, so Next resolves it on
 * the same route segment: there is no segment boundary to swap and no
 * `loading.tsx` to fall back on, and the router commits the URL only once it
 * has applied the new payload. In that shape the client navigation proved
 * unreliable here: the server rendered the target account correctly every
 * time (confirmed in its own logs — `hub_viewed … state=soft_locked`), but
 * the client aborted the RSC response (`net::ERR_ABORTED`) and silently kept
 * the old URL. Both `next/link` and `router.push()` inside a transition
 * behaved the same way, so a trader clicking their other account simply got
 * nothing — no error, no navigation, no feedback.
 *
 * A plain anchor performs an ordinary document navigation, which for this
 * control is also the honest thing: switching account replaces the entire
 * page's data context — balance, mission, risk, positions, payouts — so
 * there is no partial update to preserve, and a full navigation cannot race
 * an in-flight payload or leave a stale account snapshot behind. Keyboard,
 * middle-click and open-in-new-tab keep working exactly as they always did.
 */
export function AccountSwitchLink({
  href,
  className,
  children,
  ...rest
}: AccountSwitchLinkProps): ReactNode {
  return (
    <a href={href} className={className} aria-current={rest['aria-current']}>
      {children}
    </a>
  );
}
