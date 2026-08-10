import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser } }),
}));

const { verifyAccessToken, resetAccessTokenVerificationCache } = await import('../src/auth');

const CONFIG = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_ANON_KEY: 'anon' };

/** A structurally real JWT whose `exp` the cache is allowed to read. */
function token(subject: string, expiresInSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub: subject, exp: Math.floor(Date.now() / 1000) + expiresInSeconds }),
  ).toString('base64url');
  return `${header}.${payload}.signature-not-checked-here`;
}

describe('access token verification cache', () => {
  beforeEach(() => {
    resetAccessTokenVerificationCache();
    getUser.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces concurrent verifications of the same token into one upstream call', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null });
    const accessToken = token('user-a', 3600);

    const results = await Promise.all(
      Array.from({ length: 150 }, () => verifyAccessToken(CONFIG, accessToken)),
    );

    expect(results.every((result) => result?.userId === 'user-a')).toBe(true);
    // This is the load-gate fix: 150 simultaneous connections, one round trip.
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it('serves a repeat verification from cache without another upstream call', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null });
    const accessToken = token('user-a', 3600);

    expect(await verifyAccessToken(CONFIG, accessToken)).toEqual({ userId: 'user-a' });
    expect(await verifyAccessToken(CONFIG, accessToken)).toEqual({ userId: 'user-a' });
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it('never caches a rejection — an invalid token is re-checked and refused every time', async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { status: 401, message: 'invalid token' },
    });
    const accessToken = token('user-a', 3600);

    expect(await verifyAccessToken(CONFIG, accessToken)).toBeNull();
    expect(await verifyAccessToken(CONFIG, accessToken)).toBeNull();
    expect(getUser).toHaveBeenCalledTimes(2);
  });

  it('keeps two users on separate cache entries', async () => {
    const tokenA = token('user-a', 3600);
    const tokenB = token('user-b', 3600);
    getUser.mockImplementation((value: string) =>
      Promise.resolve({
        data: { user: { id: value === tokenA ? 'user-a' : 'user-b' } },
        error: null,
      }),
    );

    expect(await verifyAccessToken(CONFIG, tokenA)).toEqual({ userId: 'user-a' });
    expect(await verifyAccessToken(CONFIG, tokenB)).toEqual({ userId: 'user-b' });
    expect(await verifyAccessToken(CONFIG, tokenA)).toEqual({ userId: 'user-a' });
    expect(await verifyAccessToken(CONFIG, tokenB)).toEqual({ userId: 'user-b' });
    expect(getUser).toHaveBeenCalledTimes(2);
  });

  it('expires the cache entry and re-verifies upstream', async () => {
    vi.useFakeTimers();
    getUser.mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null });
    const accessToken = token('user-a', 3600);

    expect(await verifyAccessToken(CONFIG, accessToken)).toEqual({ userId: 'user-a' });
    vi.advanceTimersByTime(31_000);
    expect(await verifyAccessToken(CONFIG, accessToken)).toEqual({ userId: 'user-a' });
    expect(getUser).toHaveBeenCalledTimes(2);
  });

  it('never caches past the token’s own expiry, even inside the TTL window', async () => {
    vi.useFakeTimers();
    getUser.mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null });
    // Token dies in 5s; the 30s TTL must not extend it.
    const accessToken = token('user-a', 5);

    expect(await verifyAccessToken(CONFIG, accessToken)).toEqual({ userId: 'user-a' });
    vi.advanceTimersByTime(6_000);
    await verifyAccessToken(CONFIG, accessToken);
    expect(getUser).toHaveBeenCalledTimes(2);
  });

  it('retries a transient upstream failure once instead of reporting unauthenticated', async () => {
    getUser
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce({ data: { user: { id: 'user-a' } }, error: null });

    expect(await verifyAccessToken(CONFIG, token('user-a', 3600))).toEqual({ userId: 'user-a' });
    expect(getUser).toHaveBeenCalledTimes(2);
  });

  it('does not retry a definitive rejection', async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { status: 403, message: 'forbidden' },
    });

    expect(await verifyAccessToken(CONFIG, token('user-a', 3600))).toBeNull();
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it('rejects an empty token without touching upstream', async () => {
    expect(await verifyAccessToken(CONFIG, '')).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });
});
