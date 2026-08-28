import type { ReactNode } from 'react';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { resolveHubIdentity } from '../../lib/hub-identity';
import { HubShell } from './HubShell';

/*
 * Never prerendered.
 *
 * Pages in this segment reach the Supabase server client, which validates the
 * full server config. Prerendering them at build time therefore demands
 * APP_ENV, DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY and the webhook secret as
 * *build* inputs — and a build argument is readable in image history forever,
 * so a CI build with no secrets is the correct build, and the one that failed.
 *
 * Set here rather than on each page because route segment config is inert in a
 * `'use client'` file: several pages in this segment are client components, so
 * the export they carried was silently doing nothing. A layout is a Server
 * Component and covers every child, whichever kind it is.
 */
export const dynamic = 'force-dynamic';

/**
 * Server layout for the Trader Hub.
 *
 * It exists as a server component only to read the signed-in identity once, so
 * the shell can show who is signed in without shipping a profile fetch to the
 * browser. Everything interactive — collapse state, the user menu, active
 * navigation — belongs to `HubShell` on the client.
 *
 * The e-mail address is deliberately not passed down. It used to be, so the
 * avatar could slice two characters out of it; `resolveHubIdentity` refuses to
 * do that, and not handing the address to a client component means it cannot
 * be reintroduced by accident.
 */
export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <HubShell identity={resolveHubIdentity(user?.user_metadata ?? null)}>{children}</HubShell>;
}
