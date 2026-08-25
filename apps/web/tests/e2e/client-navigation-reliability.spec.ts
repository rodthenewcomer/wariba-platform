import { expect, test } from '@playwright/test';
import {
  assertUntradedPerformanceAccount,
  deleteLifecycleFixture,
  evaluateAndApplyAccountRisk,
  seedLifecycleFixture,
  seedSupportTicket,
  type Db,
  type LifecycleFixture,
} from '@wariba/test-utils';
import { lifecycleEnv } from './fixtures';
import { SessionPool } from './sessions';
import { seedSupportWorld, teardownSupportWorld, type SupportWorld } from './support-world';

const RUNS = 20;
/*
 * This is a harness ceiling, not a product SLA. The production symptom is a
 * navigation that never commits and requires a reload; the repository has no
 * policy-backed four-second threshold. Keep the standard Playwright ceiling
 * while recording the actual duration of every run below.
 */
const NAVIGATION_TIMEOUT_MS = 10_000;

type Browser = import('@playwright/test').Browser;
type Page = import('@playwright/test').Page;

interface NavigationTelemetry {
  abortedRscRequests: number;
  consoleErrors: string[];
  documentRequests: number;
  rscRequests: number;
}

function observeNavigation(page: Page): NavigationTelemetry {
  const telemetry: NavigationTelemetry = {
    abortedRscRequests: 0,
    consoleErrors: [],
    documentRequests: 0,
    rscRequests: 0,
  };

  page.on('request', (request) => {
    const headers = request.headers();
    if (headers.rsc === '1') telemetry.rscRequests += 1;
    if (request.resourceType() === 'document') telemetry.documentRequests += 1;
  });
  page.on('requestfailed', (request) => {
    const headers = request.headers();
    if (headers.rsc === '1' && request.failure()?.errorText.includes('ERR_ABORTED')) {
      telemetry.abortedRscRequests += 1;
    }
  });
  page.on('console', (message) => {
    if (message.type() === 'error') telemetry.consoleErrors.push(message.text().slice(0, 240));
  });
  return telemetry;
}

async function reached(
  page: Page,
  url: string | RegExp,
  visible: import('@playwright/test').Locator,
): Promise<boolean> {
  try {
    await page.waitForURL(url, { timeout: NAVIGATION_TIMEOUT_MS });
    await visible.waitFor({ state: 'visible', timeout: NAVIGATION_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

async function adoptSession(
  browser: Browser,
  sessions: SessionPool,
  email: string,
): Promise<import('@playwright/test').BrowserContext> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await sessions.actAs(page, email);
  await page.close();
  return context;
}

test.describe('@critical @navigation Phase 3.3.3 client navigation reliability', () => {
  let db: Db;
  let performanceOwner: LifecycleFixture;
  let performanceAccount: { id: string; publicId: string };
  let performanceSessions: SessionPool;
  let support: SupportWorld;
  let supportReferences: string[];

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240_000);
    db = (await import('@wariba/test-utils')).createStaffFixtureDb();

    /*
     * A canonical handoff fixture: coherent 10% history and a finalized day
     * are created by the lifecycle builder, then the production risk command
     * owns pass_pending -> passed and exactly-once provisioning. The browser
     * test never invents a Performance balance or status.
     */
    performanceOwner = await seedLifecycleFixture(lifecycleEnv(), 'under_review');
    const finalized = await evaluateAndApplyAccountRisk(db, {
      accountId: performanceOwner.accountId as string,
      now: new Date(),
      marketBySymbol: {},
      triggerEventType: 'daily_finalization',
      triggerEventId: `navigation-reliability:${performanceOwner.accountId}`,
    });
    if (finalized.newStatus !== 'passed') {
      throw new Error(`Navigation fixture did not finalize: ${finalized.newStatus}.`);
    }
    const performance = await db
      .selectFrom('app.trading_accounts')
      .select(['id', 'public_id'])
      .where('source_evaluation_account_id', '=', performanceOwner.accountId as string)
      .executeTakeFirstOrThrow();
    performanceAccount = { id: performance.id, publicId: performance.public_id };
    await assertUntradedPerformanceAccount(db, performanceOwner.accountId as string);

    performanceSessions = new SessionPool();
    await performanceSessions.capture(browser, performanceOwner.email, performanceOwner.password);

    support = await seedSupportWorld({ browser, withSeededRecords: false });
    supportReferences = [];
    for (let index = 0; index < RUNS; index += 1) {
      const ticket = await seedSupportTicket(support.db, {
        userId: support.trader.userId,
        accountId: support.trader.accountId as string,
        subject: `Navigation critique ${String(index + 1).padStart(2, '0')}`,
      });
      supportReferences.push(ticket.reference);
    }
  });

  test.afterAll(async () => {
    test.setTimeout(180_000);
    await teardownSupportWorld(support);
    await deleteLifecycleFixture(lifecycleEnv(), performanceOwner);
    await db.destroy();
  });

  test('writes one acknowledgement and reaches the Performance dashboard 20/20', async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    const context = await adoptSession(browser, performanceSessions, performanceOwner.email);
    const pages: Page[] = [];
    const telemetry: NavigationTelemetry[] = [];

    try {
      /*
       * Load every stale form before the first write. This makes attempts
       * 2..20 real duplicate submits against one immutable acknowledgement,
       * without deleting or rewriting the first evidence row between runs.
       */
      for (let index = 0; index < RUNS; index += 1) {
        const page = await context.newPage();
        telemetry.push(observeNavigation(page));
        await page.goto(
          `/comptes/${performanceAccount.publicId}/bienvenue-performance?run=${index + 1}`,
        );
        await expect(page.getByTestId('performance-rules-acknowledgement')).toBeVisible();
        pages.push(page);
      }

      let actionSuccess = 0;
      let navigationSuccess = 0;
      let reloadRequired = 0;
      const actionStatuses: number[] = [];
      let abortedDuringActions = 0;
      let destinationDocumentRequests = 0;
      const completionDurationsMs: number[] = [];
      for (const [index, page] of pages.entries()) {
        const before = telemetry[index] as NavigationTelemetry;
        const abortedBefore = before.abortedRscRequests;
        const documentsBefore = before.documentRequests;
        const startedAt = Date.now();
        await page.getByRole('checkbox').check();
        const actionResponse = page.waitForResponse(
          (response) => response.request().headers()['next-action'] !== undefined,
          { timeout: 20_000 },
        );
        await page.getByTestId('performance-rules-submit').click();
        const response = await actionResponse.catch(() => null);
        if (response) actionStatuses.push(response.status());
        if (response && response.status() >= 200 && response.status() < 400) actionSuccess += 1;

        if (
          await reached(
            page,
            new RegExp(`/hub\\?account=${performanceAccount.id}$`),
            page.getByTestId('mission-checklist'),
          )
        ) {
          navigationSuccess += 1;
        } else {
          reloadRequired += 1;
        }
        abortedDuringActions += before.abortedRscRequests - abortedBefore;
        destinationDocumentRequests += before.documentRequests - documentsBefore;
        completionDurationsMs.push(Date.now() - startedAt);

        /*
         * A real trader leaves the onboarding document after success. Closing
         * each completed tab prevents nineteen synthetic Hub pages from
         * polling account telemetry while the remaining runs are measured.
         */
        await page.close();
      }

      const acknowledgementRows = await db
        .selectFrom('app.performance_rule_acknowledgements')
        .select('id')
        .where('account_id', '=', performanceAccount.id)
        .execute();
      const result = {
        runs: RUNS,
        actionSuccess,
        navigationSuccess,
        duplicateRows: Math.max(0, acknowledgementRows.length - 1),
        reloadRequired,
        actionStatuses,
        abortedDuringActions,
        destinationDocumentRequests,
        completionDurationsMs,
      };
      console.warn(`NAV_RELIABILITY_ACK=${JSON.stringify(result)}`);

      expect(actionSuccess).toBe(RUNS);
      expect(navigationSuccess).toBe(RUNS);
      expect(acknowledgementRows).toHaveLength(1);
      expect(reloadRequired).toBe(0);
      expect(destinationDocumentRequests).toBe(RUNS);
    } finally {
      await context.close();
    }
  });

  test('moves queue to detail and detail to the next destination 20/20', async ({ browser }) => {
    test.setTimeout(420_000);
    const context = await adoptSession(browser, support.sessions, support.supportOperator.email);
    const page = await context.newPage();
    const telemetry = observeNavigation(page);
    let queueToDetail = 0;
    let detailToNext = 0;
    let brokenAfterAbort = 0;
    let reloadRequired = 0;

    try {
      for (const reference of supportReferences) {
        const queueUrl = `/control/support?q=${encodeURIComponent(reference)}`;
        const detailUrl = `/control/support/${reference}`;
        await page.goto(queueUrl);
        const row = page.getByRole('link', { name: reference });
        await expect(row).toBeVisible();
        await row.click();

        const firstNavigation = await reached(
          page,
          new RegExp(`${detailUrl}$`),
          page.getByTestId('control-ticket-meta'),
        );
        if (firstNavigation) {
          queueToDetail += 1;
          const back = page.getByRole('link', { name: 'Retour à la file' }).first();
          await back.click();
          if (await reached(page, /\/control\/support$/, page.getByText('File Support'))) {
            detailToNext += 1;
          } else {
            reloadRequired += 1;
          }
        } else {
          reloadRequired += 1;
          /* A second soft click in the same document exposes stale router state. */
          await row.click();
          if (
            !(await reached(
              page,
              new RegExp(`${detailUrl}$`),
              page.getByTestId('control-ticket-meta'),
            ))
          ) {
            brokenAfterAbort += 1;
          }
        }
      }

      const result = {
        runs: RUNS,
        queueToDetail,
        detailToNext,
        brokenAfterAbort,
        reloadRequired,
        placeboClicks: RUNS - queueToDetail,
        abortedRscRequests: telemetry.abortedRscRequests,
        documentRequests: telemetry.documentRequests,
        rscRequests: telemetry.rscRequests,
        consoleErrors: telemetry.consoleErrors,
      };
      console.warn(`NAV_RELIABILITY_QUEUE=${JSON.stringify(result)}`);

      expect(queueToDetail).toBe(RUNS);
      expect(detailToNext).toBe(RUNS);
      expect(brokenAfterAbort).toBe(0);
      expect(reloadRequired).toBe(0);
      expect(telemetry.rscRequests).toBe(0);
    } finally {
      await context.close();
    }
  });

  test('applies same-path Server Action feedback 20/20', async ({ browser }) => {
    test.setTimeout(300_000);
    const context = await adoptSession(browser, performanceSessions, performanceOwner.email);
    const pages: Page[] = [];
    const telemetry: NavigationTelemetry[] = [];

    try {
      for (let index = 0; index < RUNS; index += 1) {
        const page = await context.newPage();
        telemetry.push(observeNavigation(page));
        await page.goto(`/verification-identite?run=${index + 1}`);
        await expect(page.getByTestId('kyc-action')).toBeVisible();
        await page.locator('input[name="accountId"]').evaluate((input) => {
          (input as HTMLInputElement).value = '';
        });
        pages.push(page);
      }

      let actionSuccess = 0;
      let navigationSuccess = 0;
      const actionStatuses: number[] = [];
      let abortedDuringActions = 0;
      let destinationDocumentRequests = 0;
      for (const [index, page] of pages.entries()) {
        const before = telemetry[index] as NavigationTelemetry;
        const abortedBefore = before.abortedRscRequests;
        const documentsBefore = before.documentRequests;
        const actionResponse = page.waitForResponse(
          (response) => response.request().headers()['next-action'] !== undefined,
          { timeout: 20_000 },
        );
        await page.getByTestId('kyc-action').click();
        const response = await actionResponse.catch(() => null);
        if (response) actionStatuses.push(response.status());
        if (response && response.status() >= 200 && response.status() < 400) actionSuccess += 1;
        if (
          await reached(page, /\/verification-identite\?error=compte$/, page.getByRole('alert'))
        ) {
          navigationSuccess += 1;
        }
        abortedDuringActions += before.abortedRscRequests - abortedBefore;
        destinationDocumentRequests += before.documentRequests - documentsBefore;
      }

      const result = {
        runs: RUNS,
        actionSuccess,
        navigationSuccess,
        actionStatuses,
        abortedDuringActions,
        destinationDocumentRequests,
      };
      console.warn(`NAV_RELIABILITY_SAME_PATH=${JSON.stringify(result)}`);

      expect(actionSuccess).toBe(RUNS);
      expect(navigationSuccess).toBe(RUNS);
      expect(destinationDocumentRequests).toBe(RUNS);
    } finally {
      await context.close();
    }
  });
});
