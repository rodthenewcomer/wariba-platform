import { cookies } from 'next/headers';
import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { loadWebConfig } from '../config';

/**
 * Server-side Supabase client — reads the session from request cookies.
 * Used in Server Components, Route Handlers, and Server Actions to answer
 * "who is the current user" for RLS-scoped reads. Financial and profile
 * writes go through the Kysely client (lib/db.ts), which connects with
 * full server-side privileges — never through this RLS-scoped client —
 * per ENG-002 (server authoritative).
 */
export async function createSupabaseServerClient() {
  const config = loadWebConfig();
  const cookieStore = await cookies();

  return createServerClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render (not a Route Handler or
          // Server Action) — cookies() is read-only there. Session refresh
          // still happens via middleware, so this is safe to swallow.
        }
      },
    },
  });
}
