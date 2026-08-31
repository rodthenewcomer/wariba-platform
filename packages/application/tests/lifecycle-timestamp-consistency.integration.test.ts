import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createFixtureDb,
  seedLifecycleFixture,
  deleteLifecycleFixture,
  assertLifecycleOrder,
  type LifecycleFixture,
  type LifecycleFixtureEnvironment,
} from '@wariba/test-utils';
import { evaluateAndApplyAccountRisk, type Db } from '@wariba/database';

/**
 * The lifecycle timeline must be causally ordered in the database itself.
 *
 * ## What broke
 *
 * `objectiveReachedAt <= dailyFinalizedAt <= passedAt <= performanceCreatedAt`
 * is not a display preference: it is the order these events can happen in, and
 * `evaluation-performance-handoff` renders the trader's timeline straight from
 * these rows. Three of the four timestamps used to come from the *database*
 * clock — the transition inserts and `trading_accounts.created_at` left
 * `occurred_at`/`created_at` to the column default, which is `now()`, the
 * transaction's start — while the finalized snapshot took `params.now`, the
 * application's clock. One causal operation, two clocks. The recorded order was
 * then decided by the skew between them, and inverted by as much as 355 ms.
 *
 * ## Why it is measured this way
 *
 * A single finalization proves nothing here: the inversion is a race, and one
 * run samples it once. Before the fix this loop failed within the first few
 * iterations; the assertion is that *every* run is ordered, not that a lucky
 * one is.
 */
const REQUIRED = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
const describeIfDb = REQUIRED.every((key) => process.env[key]) ? describe : describe.skip;

/** Enough runs to catch a race that inverted 4 times in 6 when it was live. */
const RUNS = 20;

const env = (): LifecycleFixtureEnvironment => ({
  databaseUrl: process.env.DATABASE_URL as string,
  supabaseUrl: process.env.SUPABASE_URL as string,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
});

describeIfDb('lifecycle timestamp consistency — real database', () => {
  let db: Db;
  const seeded: LifecycleFixture[] = [];

  beforeAll(() => {
    db = createFixtureDb();
  });

  afterAll(async () => {
    for (const fixture of seeded) {
      await deleteLifecycleFixture(env(), fixture).catch(() => undefined);
    }
    await db.destroy();
  });

  it('records a causally ordered timeline on every finalization', async () => {
    const inversions: string[] = [];

    for (let run = 0; run < RUNS; run += 1) {
      const owner = await seedLifecycleFixture(env(), 'under_review');
      seeded.push(owner);
      const accountId = owner.accountId as string;

      const outcome = await evaluateAndApplyAccountRisk(db, {
        accountId,
        now: new Date(),
        marketBySymbol: {},
        triggerEventType: 'daily_finalization',
        triggerEventId: `lifecycle-timestamp-consistency:${accountId}:${run}`,
      });
      expect(outcome.newStatus).toBe('passed');

      /*
       * The invariant itself throws on an inverted chain. Collecting the
       * message rather than rethrowing means one report names every run that
       * inverted, instead of the suite stopping at the first.
       */
      try {
        const order = await assertLifecycleOrder(db, accountId);
        expect(order.passedAt).not.toBeNull();
        expect(order.performanceCreatedAt).not.toBeNull();
      } catch (error) {
        inversions.push(`run ${run}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    expect(inversions).toEqual([]);
  }, 600_000);
});
