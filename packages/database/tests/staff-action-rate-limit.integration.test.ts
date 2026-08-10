import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  consumeStaffActionRateLimit,
  createDbClient,
  StaffActionRateLimitExceededError,
  type Db,
} from '../src/index';

let db: Db;

beforeAll(() => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required.');
  db = createDbClient(databaseUrl);
});

afterAll(async () => {
  await db.destroy();
});

describe('staff action rate limit', () => {
  it('is atomic within a window and resets in the next window', async () => {
    const actorId = randomUUID();
    const action = 'payout.reverse';
    const firstWindow = new Date('2026-08-09T00:00:10.000Z');
    await consumeStaffActionRateLimit(db, {
      actorId,
      action,
      limit: 2,
      windowMs: 60_000,
      now: firstWindow,
    });
    await consumeStaffActionRateLimit(db, {
      actorId,
      action,
      limit: 2,
      windowMs: 60_000,
      now: firstWindow,
    });
    await expect(
      consumeStaffActionRateLimit(db, {
        actorId,
        action,
        limit: 2,
        windowMs: 60_000,
        now: firstWindow,
      }),
    ).rejects.toBeInstanceOf(StaffActionRateLimitExceededError);
    await expect(
      consumeStaffActionRateLimit(db, {
        actorId,
        action,
        limit: 2,
        windowMs: 60_000,
        now: new Date('2026-08-09T00:01:00.000Z'),
      }),
    ).resolves.toBeUndefined();

    await db.deleteFrom('app.staff_action_rate_limits').where('actor_id', '=', actorId).execute();
  });
});
