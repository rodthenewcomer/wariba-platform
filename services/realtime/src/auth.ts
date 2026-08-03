import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeConfig } from './config';

// This service never opens a Supabase Realtime channel — it only uses
// .auth — but the supabase-js client constructor unconditionally
// initializes a Realtime subsystem that requires a native WebSocket global,
// which Node 20 doesn't have. Without this stub, createClient() throws on
// every call and the failure is silently swallowed (an async route handler
// rejecting with no attached .catch), which looks like the connection just
// hangs — no error, no auth, nothing.
globalThis.WebSocket ??= class {} as unknown as typeof WebSocket;

let client: SupabaseClient | undefined;

function getClient(
  config: Pick<RealtimeConfig, 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'>,
): SupabaseClient {
  client ??= createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  return client;
}

/**
 * Engineering Constitution §24: a WebSocket connection must be
 * authenticated. The client sends its Supabase access token; this verifies
 * it against Supabase Auth (not just decodes the JWT locally) so a revoked
 * or expired session is rejected even if the token is still well-formed.
 */
export async function verifyAccessToken(
  config: Pick<RealtimeConfig, 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'>,
  accessToken: string,
): Promise<{ userId: string } | null> {
  const supabase = getClient(config);
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }
  return { userId: data.user.id };
}
