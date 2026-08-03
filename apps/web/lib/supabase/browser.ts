'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client — used only to read the current session's
 * access token for the WebSocket connection to services/realtime
 * (Engineering Constitution §24: the connection must be authenticated).
 * It never touches trading tables directly; all writes go through the
 * Realtime service or Server Actions.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}
