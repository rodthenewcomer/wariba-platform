import type { ReactNode } from 'react';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { resolveHubIdentity } from '../../lib/hub-identity';
import { HubShell } from './HubShell';

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
