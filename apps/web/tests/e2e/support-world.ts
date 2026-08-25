import {
  createStaffFixtureDb,
  deleteLifecycleFixture,
  deleteStaffFixtureUser,
  seedBreachEvidence,
  seedContestation,
  seedLifecycleFixture,
  seedStaffUser,
  seedSupportTicket,
  type Db,
  type LifecycleFixture,
  type StaffFixtureUser,
} from '@wariba/test-utils';
import { lifecycleEnv } from './fixtures';
import { SessionPool } from './sessions';

type Browser = import('@playwright/test').Browser;

/**
 * The people and records every Support suite needs, seeded once per suite.
 *
 * ## Why the suites were split, and why this is shared
 *
 * The Support spec was one narrative covering the request flow, the
 * contestation flow, cross-trader authorization, four responsive widths and
 * twenty-five screenshots — 300 s of budget, a login inside almost every test,
 * and a single timeout that said nothing about which of those five things had
 * actually broken. "Reply is broken" and "the reply box is under the mobile
 * nav at 320" are different investigations with different owners, and neither
 * needs the other's evidence.
 *
 * They are three suites now, and this module is what stops the split costing
 * three times the setup: one world description, one session pool per suite,
 * and the records seeded through `@wariba/test-utils` rather than re-driven
 * through the UI. The functional suite still creates its ticket through the
 * form, because that is the thing it exists to prove.
 */
export interface SupportWorld {
  db: Db;
  sessions: SessionPool;
  trader: LifecycleFixture;
  intruder: LifecycleFixture;
  supportOperator: StaffFixtureUser;
  riskReviewer: StaffFixtureUser;
  /** A request that already exists, for suites that are not testing creation. */
  seededTicketReference: string;
  /** An open contestation on the trader's real recorded violation. */
  seededContestationReference: string;
}

export interface SeedSupportWorldOptions {
  /** Capture browser sessions up front. Omit for a suite that never signs in. */
  browser?: Browser;
  /** Skip the pre-made ticket and contestation when the suite creates its own. */
  withSeededRecords?: boolean;
}

export async function seedSupportWorld(options: SeedSupportWorldOptions): Promise<SupportWorld> {
  const db = createStaffFixtureDb();
  // A breached account, and the recorded decision behind it. A breach with no
  // violation row is the incoherent state — a contestation points at the row.
  const trader = await seedLifecycleFixture(lifecycleEnv(), 'breached');
  const breach = await seedBreachEvidence(db, { accountId: trader.accountId as string });
  const intruder = await seedLifecycleFixture(lifecycleEnv(), 'evaluation_new');
  const supportOperator = await seedStaffUser(db, 'support');
  const riskReviewer = await seedStaffUser(db, 'risk');

  let seededTicketReference = '';
  let seededContestationReference = '';
  if (options.withSeededRecords !== false) {
    seededTicketReference = (
      await seedSupportTicket(db, {
        userId: trader.userId,
        accountId: trader.accountId as string,
      })
    ).reference;
    seededContestationReference = (
      await seedContestation(db, {
        userId: trader.userId,
        accountId: trader.accountId as string,
        riskViolationId: breach.riskViolationId,
      })
    ).reference;
  }

  const sessions = new SessionPool();
  if (options.browser) {
    // Lifecycle fixtures carry their own generated password, not the shared
    // one — so the pool is handed the credential rather than guessing it.
    await sessions.capture(options.browser, trader.email, trader.password);
    await sessions.capture(options.browser, intruder.email, intruder.password);
    await sessions.captureStaff(options.browser, supportOperator.email);
    await sessions.captureStaff(options.browser, riskReviewer.email);
  }

  return {
    db,
    sessions,
    trader,
    intruder,
    supportOperator,
    riskReviewer,
    seededTicketReference,
    seededContestationReference,
  };
}

/**
 * Traders before staff, and the order is not incidental.
 *
 * A staff reply lives in `app.ticket_messages.actor_staff_id`, which is a NOT
 * NULL foreign key for a staff message. Deleting the operator first would fail
 * on that reference — correctly, because a conversation cannot lose its author.
 * Removing the trader's tickets takes their messages with them (the one delete
 * the append-only trigger permits), and only then is the operator
 * unreferenced.
 */
export async function teardownSupportWorld(world: SupportWorld): Promise<void> {
  await deleteLifecycleFixture(lifecycleEnv(), world.trader);
  await deleteLifecycleFixture(lifecycleEnv(), world.intruder);
  await deleteStaffFixtureUser(world.db, world.supportOperator);
  await deleteStaffFixtureUser(world.db, world.riskReviewer);
  await world.db.destroy();
}
