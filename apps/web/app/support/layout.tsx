import type { ReactNode } from 'react';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { resolveHubIdentity } from '../../lib/hub-identity';
import { HubShell } from '../(platform)/HubShell';
import { PublicChrome } from '../PublicChrome';

/**
 * `/support` — one route, two audiences.
 *
 * The Constitution names `/support` as a canonical route in both the Public
 * set and the Trader Hub set (§6). Next.js resolves one page per path, so the
 * route lives outside both groups and this layout chooses the shell from the
 * session: marketing chrome for a visitor, the Trader Hub for someone signed
 * in. See DEC-3.2-01.
 *
 * Two things this arrangement gets right that a second route would not. The
 * Hub's Support link no longer leads to a marketing page — the audit's single
 * `PLACEBO_STATUS_UI`. And a trader who follows a `/support` link from an
 * e-mail, a rulebook page or a footer lands in their own support system rather
 * than being shown the brochure for it.
 *
 * Sub-routes are protected in `middleware.ts` under the `/support/` prefix,
 * which leaves `/support` itself reachable while every request, thread and
 * contestation below it requires a session.
 */
export default async function SupportLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <PublicChrome>{children}</PublicChrome>;
  }

  return <HubShell identity={resolveHubIdentity(user.user_metadata ?? null)}>{children}</HubShell>;
}
