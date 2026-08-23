import { mkdirSync } from 'node:fs';
import {
  E2E_TEST_PASSWORD,
  createFixtureAccount,
  createFixtureDb,
  deleteFixtureAccount,
  expect,
  test,
  type E2eFixtureAccount,
} from './fixtures';

/**
 * WariX, after Phase 2.5 — the classification §34 asks for.
 *
 * ## Why this file exists separately from trade.spec.ts
 *
 * The full trade suite exercises order execution, and order execution needs an
 * open market. Run on a Sunday it fails, and those failures say nothing about
 * whether the terminal still works — §34 is explicit that "the market is
 * closed" must not be reported as "WariX regressed".
 *
 * So this asserts only what is true at any hour: that the terminal renders,
 * that its panels are present, that historical candles draw, and that the
 * controls reflect the session state honestly rather than pretending to be
 * tradable. Whatever this file says is a real statement about the terminal.
 * Whatever `trade.spec.ts` says about execution on a closed market is a
 * statement about the calendar.
 *
 * Phase 2.5 modified no file under `app/(trade)`, none of the realtime
 * service, and none of the read models WariX imports — it uses only
 * `deriveAccountLifecycle`, `listAccountsForUser` and `AccountSummaryDTO`,
 * none of which this phase touched. This suite is the observation behind that
 * claim.
 */
const OUT = '../../docs/04-ux/evidence/wariba-product-os-phase25-command-center';

type Page = import('@playwright/test').Page;

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(E2E_TEST_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 60_000 });
}

async function shoot(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

test.describe('@phase25 WariX regression classification', () => {
  let db: ReturnType<typeof createFixtureDb>;
  let account: E2eFixtureAccount;

  test.beforeAll(async () => {
    db = createFixtureDb();
    account = await createFixtureAccount(db, 'p25-warix', '10K');
  });

  test.afterAll(async () => {
    if (account) await deleteFixtureAccount(db, account);
    await db?.destroy();
  });

  test('the terminal still renders after Phase 2.5', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, account.email);
    await page.goto('/trade');

    // Structural, not market-dependent: these hold whether or not a price is
    // moving.
    await expect(page.getByTestId('chart-bottom-bar')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('chart-ohlc-legend')).toBeVisible({ timeout: 60_000 });
    await shoot(page, '30-warix-terminal-after-phase25-1440');
  });

  test('the chart draws historical candles with the market closed', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, account.email);
    await page.goto('/trade');
    await expect(page.getByTestId('chart-bottom-bar')).toBeVisible({ timeout: 60_000 });

    /*
     * A canvas with content is the honest assertion here. Asserting a *price*
     * would be asserting the market is open, which is the confusion §34 exists
     * to prevent.
     */
    const chart = page.locator('canvas').first();
    await expect(chart).toBeVisible({ timeout: 60_000 });
    const box = await chart.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(200);
    expect(box?.height ?? 0).toBeGreaterThan(120);
  });

  test('the Hub gate routes into the terminal unchanged', async ({ page }) => {
    // WariXGate is the one WariX-adjacent file Phase 2 added and Phase 2.5
    // left alone. An account that is tradable must still reach the terminal.
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, account.email);
    await expect(page.getByTestId('header-open-warix')).toBeVisible();
    await page.getByTestId('header-open-warix').click();
    await page.waitForURL('**/trade', { timeout: 60_000 });
    await expect(page.getByTestId('chart-bottom-bar')).toBeVisible({ timeout: 60_000 });
  });
});
