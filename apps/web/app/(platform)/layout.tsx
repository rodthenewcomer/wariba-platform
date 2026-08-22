import type { ReactNode } from 'react';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { HubShell } from './HubShell';

/**
 * Server layout for the Trader Hub.
 *
 * It exists as a server component only to read the signed-in identity once,
 * so the shell can show initials without shipping a profile fetch to the
 * browser. Everything interactive — collapse state, the user menu, active
 * navigation — belongs to `HubShell` on the client.
 */
function initialsFor(email: string | undefined, metadata: Record<string, unknown>): string {
  const first = typeof metadata.first_name === 'string' ? metadata.first_name : '';
  const last = typeof metadata.last_name === 'string' ? metadata.last_name : '';
  const fromName = `${first.charAt(0)}${last.charAt(0)}`.trim().toUpperCase();
  if (fromName.length > 0) return fromName;
  // Falls back to the address's first letters rather than rendering an empty
  // circle. Never the full address: the avatar is a marker, not a disclosure.
  return (email ?? '?').slice(0, 2).toUpperCase();
}

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <HubShell initials={initialsFor(user?.email, user?.user_metadata ?? {})}>{children}</HubShell>
  );
}
