import { expect, test } from '@playwright/test';
import { seedSupportWorld, teardownSupportWorld, type SupportWorld } from './support-world';

/**
 * Who can reach a support record, and who cannot.
 *
 * ## Why this is its own suite
 *
 * These are the assertions that must never be skipped and must always be
 * cheap. They need a request and a contestation to *exist*; they do not need
 * either to have been created through the form, and they need no screenshot at
 * all. Seeding the records and reusing four captured sessions turns what used
 * to be the tail of a five-minute narrative into a few seconds that can run on
 * every candidate.
 *
 * The separation also fixes a diagnostic problem. When authorization checks
 * shared a file with twenty-five captures, a suite-level timeout was reported
 * against whichever test happened to be running — and a login refused by
 * GoTrue's rate limiter looks exactly like an authorization failure. A
 * failure here now means one thing.
 */
test.describe('@support @support-rbac accès aux demandes et contestations', () => {
  let world: SupportWorld;

  test.beforeAll(async ({ browser }) => {
    world = await seedSupportWorld({ browser });
  });

  test.afterAll(async () => {
    await teardownSupportWorld(world);
  });

  test('le sous-arbre Support reste privé pour un visiteur', async ({ page }) => {
    await world.sessions.signOut(page);

    await page.goto('/support');
    await expect(page.locator('[data-wariba-section="public"]')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Une question claire mérite une réponse traçable.',
    );
    // The public page offers the door, not the system behind it.
    await expect(page.getByTestId('support-help-search')).toHaveCount(0);

    /*
     * DEC-3.2-01, the other half.
     *
     * `/support` is canonical in the Public set *and* in the Trader Hub set
     * (Constitution §6), and Next.js resolves one page per path — so the route
     * chooses its shell from the session. Both halves are one middleware
     * character apart: `/support` in PROTECTED_PREFIXES instead of `/support/`
     * would send an anonymous visitor to /login from a page the Constitution
     * says is public, and nothing else in the suite would notice.
     */
    for (const route of ['/support/nouveau', `/support/demandes/${world.seededTicketReference}`]) {
      await page.goto(route);
      await page.waitForURL('**/login**');
    }
  });

  test('un autre trader n’atteint ni la demande ni la contestation', async ({ page }) => {
    await world.sessions.actAs(page, world.intruder.email);

    await page.goto(`/support/demandes/${world.seededTicketReference}`);
    // Not "forbidden": the same page a reference that was never issued
    // produces. B learns nothing about whether WRB-xxxxx exists.
    await expect(page.getByText('Cette demande n’est pas accessible.')).toBeVisible();

    await page.goto(`/support/contestations/${world.seededContestationReference}`);
    await expect(page.getByText('Cette contestation n’est pas accessible.')).toBeVisible();
  });

  test('WARIBA Control n’est pas atteignable depuis une session trader', async ({ page }) => {
    await world.sessions.actAs(page, world.trader.email);

    for (const route of ['/control/support', '/control/contestations']) {
      await page.goto(route);
      await page.waitForURL('**/hub');
    }
  });

  test('le propriétaire atteint ses propres dossiers', async ({ page }) => {
    /*
     * The control case for the two refusals above.
     *
     * Without it, a bug that made *every* support record unreachable would
     * turn this suite green: two "not accessible" assertions pass beautifully
     * when nothing is accessible to anyone.
     */
    await world.sessions.actAs(page, world.trader.email);

    await page.goto(`/support/demandes/${world.seededTicketReference}`);
    await expect(page.getByTestId('ticket-reference')).toHaveText(world.seededTicketReference);

    await page.goto(`/support/contestations/${world.seededContestationReference}`);
    await expect(page.getByTestId('contestation-reference')).toHaveText(
      world.seededContestationReference,
    );
  });

  test('un opérateur Support ouvre la file, un reviewer Risk ouvre les contestations', async ({
    page,
  }) => {
    await world.sessions.actAs(page, world.supportOperator.email);
    await page.goto('/control/support');
    await expect(page.getByText('File Support')).toBeVisible();
    await expect(page.getByRole('link', { name: world.seededTicketReference })).toBeVisible();

    await world.sessions.actAs(page, world.riskReviewer.email);
    await page.goto('/control/contestations');
    await expect(page.getByText('File de contestations')).toBeVisible();
    await expect(page.getByRole('link', { name: world.seededContestationReference })).toBeVisible();
  });
});
