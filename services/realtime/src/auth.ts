import { createHash } from 'node:crypto';
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

export interface VerifiedAccess {
  userId: string;
}

/**
 * Appendix 08-A — bounded verification cache.
 *
 * Every WebSocket connection used to cost one independent round-trip to
 * Supabase Auth. Under the 150-concurrent-connection load gate that is 150
 * simultaneous requests for what is usually the *same* token (one browser
 * reconnecting, or a fan-out of tabs), and Auth shed roughly 15% of them —
 * which the service then reported to real users as 4401 "unauthenticated".
 * A dropped connection is not an authorization decision, so treating a
 * transient Auth outage as "your token is bad" was the actual defect.
 *
 * Two changes, both narrow:
 *
 * 1. In-flight coalescing. Concurrent verifications of the same token share
 *    one upstream request instead of stampeding. This alone removes the
 *    thundering herd; it changes no security property, because the single
 *    request performs exactly the verification each caller would have.
 *
 * 2. A short positive cache. A token that Supabase Auth has just confirmed
 *    is reused for at most VERIFICATION_TTL_MS, and never past the token's
 *    own expiry.
 *
 * Security model, explicitly:
 * - Signature and issuer are still verified by Supabase Auth. Nothing here
 *   decodes a token and trusts it; the `exp` read below is only ever used
 *   to *shorten* a cache entry, never to admit one.
 * - Expiry is respected twice: an entry cannot outlive the token, and a
 *   token whose `exp` has passed is never served from cache.
 * - Failures are never cached. An invalid, revoked, or expired token is
 *   re-checked upstream on every attempt and still closes the socket 4401.
 * - Entries are keyed by SHA-256 of the exact token, so two users can never
 *   collide, and raw tokens are not held in memory.
 * - Revocation lag is bounded by VERIFICATION_TTL_MS. This is the one real
 *   trade-off: a session revoked mid-window may keep an *already-open*
 *   socket for up to that long. Sized in seconds, not minutes, for that
 *   reason. Sign-out also closes the client's socket directly.
 * - The cache is bounded (MAX_CACHE_ENTRIES, oldest evicted first) so a
 *   token-spraying client cannot grow it without limit.
 *
 * Transient upstream failures are retried once before giving up, so a
 * single dropped packet no longer costs a user their connection. A
 * definitive rejection (Auth answered "no") is never retried.
 */
const VERIFICATION_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 10_000;
const TRANSIENT_RETRY_DELAY_MS = 50;

interface CacheEntry {
  userId: string;
  expiresAtMs: number;
}

const verified = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<VerifiedAccess | null>>();

function cacheKey(accessToken: string): string {
  return createHash('sha256').update(accessToken).digest('hex');
}

/**
 * Reads `exp` from an already-verified token so the cache entry cannot
 * outlive the token itself. Never used to admit a token — only to bound
 * one that Supabase Auth has already accepted — so a malformed or absent
 * claim safely degrades to the default TTL floor.
 */
function tokenExpiryMs(accessToken: string): number | null {
  const payload = accessToken.split('.')[1];
  if (!payload) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      exp?: unknown;
    };
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

function remember(key: string, accessToken: string, userId: string, nowMs: number): void {
  const expiry = tokenExpiryMs(accessToken);
  const expiresAtMs = Math.min(nowMs + VERIFICATION_TTL_MS, expiry ?? Number.POSITIVE_INFINITY);
  if (expiresAtMs <= nowMs) return;
  if (verified.size >= MAX_CACHE_ENTRIES) {
    const oldest = verified.keys().next();
    if (!oldest.done) verified.delete(oldest.value);
  }
  verified.set(key, { userId, expiresAtMs });
}

/** True when Supabase Auth answered definitively that the token is bad. */
function isDefinitiveRejection(status: number | undefined): boolean {
  return status === 400 || status === 401 || status === 403 || status === 422;
}

async function verifyUpstream(
  config: Pick<RealtimeConfig, 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'>,
  accessToken: string,
): Promise<VerifiedAccess | null> {
  const supabase = getClient(config);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { data, error } = await supabase.auth.getUser(accessToken);
      if (!error && data.user) return { userId: data.user.id };
      if (error && isDefinitiveRejection(error.status)) return null;
    } catch {
      // Network-level failure — indistinguishable from a shed request, and
      // explicitly not an authorization decision. Fall through to retry.
    }
    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS));
    }
  }
  return null;
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
): Promise<VerifiedAccess | null> {
  if (!accessToken) return null;
  const key = cacheKey(accessToken);
  const nowMs = Date.now();

  const cached = verified.get(key);
  if (cached) {
    if (cached.expiresAtMs > nowMs) return { userId: cached.userId };
    verified.delete(key);
  }

  const existing = inFlight.get(key);
  if (existing) return existing;

  const pending = verifyUpstream(config, accessToken)
    .then((result) => {
      if (result) remember(key, accessToken, result.userId, Date.now());
      return result;
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, pending);
  return pending;
}

/** Test seam — drops all cached verifications. */
export function resetAccessTokenVerificationCache(): void {
  verified.clear();
  inFlight.clear();
}
