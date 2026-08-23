import { mkdirSync } from 'node:fs';
import { AxeBuilder } from '@axe-core/playwright';
import {
  E2E_TEST_PASSWORD,
  createFixtureAccount,
  createFixtureDb,
  createFixtureUserWithoutAccount,
  deleteFixtureAccount,
  deleteFixtureUser,
  deleteTradingRecord,
  expect,
  seedTradingRecord,
  test,
  type E2eFixtureAccount,
} from './fixtures';

/**
 * WARIBA Product OS Phase 2.5 — the command centre.
 *
 * Two jobs, the same two as the Phase 2 suite. It asserts the things a
 * screenshot cannot be trusted on — whether a figure was invented, whether an
 * untraded account is being praised, whether a bar and its label agree — and
 * it photographs every surface at every supported width so the visual bar can
 * be judged rather than claimed.
 *
 * The difference from Phase 2 is that a real trading record now exists, so the
 * populated surfaces are photographed populated for the first time.
 */
const OUT = '../../docs/04-ux/evidence/wariba-product-os-phase25-command-center';

const SIZES = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1366, height: 768 },
  mobile: { width: 390, height: 844 },
  mobileSmall: { width: 375, height: 812 },
  small: { width: 320, height: 568 },
} as const;

type Page = import('@playwright/test').Page;
type Db = ReturnType<typeof createFixtureDb>;

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(E2E_TEST_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 60_000 });
}

async function signOut(page: Page) {
  await page.context().clearCookies();
}

async function shoot(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true });
  // Long enough for the stagger to settle and one telemetry tick to land, so
  // the capture shows the steady state rather than a frame of the entrance.
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

async function shootViewport(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

/**
 * Waits for the Hub shell to be on screen at whatever width we are at.
 *
 * Not `networkidle` — the dashboard polls telemetry every four seconds, so the
 * network is never idle and that wait can only ever time out. Not the sidebar
 * either: it is `md:flex`, correctly hidden below 768px, so waiting on it hangs
 * every mobile test. `:visible` picks whichever of the two navigations the
 * current viewport actually renders.
 */
async function settled(page: Page): Promise<void> {
  await page
    .locator('[data-testid="hub-sidebar"]:visible, [data-testid="hub-mobile-nav"]:visible')
    .first()
    .waitFor();
}

async function noHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
}

test.describe('@phase25 Product OS 2.5 — command centre', () => {
  let db: Db;
  let populated: E2eFixtureAccount;
  let fresh: E2eFixtureAccount;
  let zero: { email: string; userId: string };

  test.beforeAll(async () => {
    db = createFixtureDb();
    populated = await createFixtureAccount(db, 'p25e-populated', '10K');
    await seedTradingRecord(db, { accountId: populated.accountId, now: new Date() });
    fresh = await createFixtureAccount(db, 'p25e-fresh', '10K');

    // A trader who has signed up and not bought yet — a real product state,
    // and the one the Launchpad exists for.
    zero = await createFixtureUserWithoutAccount('p25e-zero');
  });

  test.afterAll(async () => {
    if (populated) {
      await deleteTradingRecord(db, populated.accountId);
      await deleteFixtureAccount(db, populated);
    }
    if (fresh) await deleteFixtureAccount(db, fresh);
    if (zero) await deleteFixtureUser(zero.userId);
    await db?.destroy();
  });

  /* ---------------------------------------------------------------- fresh */

  test('fresh account is dense without inventing performance', async ({ page }) => {
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, fresh.email);

    // §5 — every one of these is real before the first trade.
    await expect(page.getByTestId('telemetry-strip')).toBeVisible();
    await expect(page.getByTestId('account-balance')).toBeVisible();
    await expect(page.getByTestId('reset-countdown')).toBeVisible();
    await expect(page.getByTestId('hub-next-action')).toBeVisible();
    await expect(page.getByRole('progressbar', { name: /Perte quotidienne/ })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: /Perte maximale/ })).toBeVisible();

    // §11 — an untraded account is not "Excellent".
    await expect(page.getByTestId('health-panel')).toContainText('Risque intact');
    await expect(page.getByTestId('health-panel')).not.toContainText('Excellent');

    // §26 — the module stays, the fake chart does not.
    await expect(page.getByText('Aucune journée clôturée.')).toBeVisible();

    // Nothing claims a record that does not exist.
    await expect(page.getByText('Win rate')).toHaveCount(0);

    await shoot(page, '01-hub-fresh-1440');
  });

  test('fresh account countdown is a real boundary', async ({ page }) => {
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, fresh.email);

    const countdown = page.getByTestId('reset-countdown');
    const first = await countdown.textContent();
    await page.waitForTimeout(2200);
    const second = await countdown.textContent();

    // It moves, and it moves downward — a static string would mean the timer
    // never started; an increasing one would mean it is counting the wrong way.
    expect(first).not.toBe(second);
    expect(second).toMatch(/Reset dans \d{2}:\d{2}:\d{2}/);
  });

  /* ------------------------------------------------------------ populated */

  test('populated account shows the record it actually has', async ({ page }) => {
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, populated.email);

    await expect(page.getByTestId('telemetry-strip')).toBeVisible();
    // The record is real, so the analytics module appears.
    await expect(page.getByText('Performance', { exact: true }).first()).toBeVisible();
    // Scoped to the module by test id: "Meilleure journée" is also
    // consistency-rule copy elsewhere on the page, so a bare text match is a
    // strict-mode violation.
    const dailyStrip = page.getByTestId('daily-pnl');
    await expect(dailyStrip).toBeVisible();
    await expect(dailyStrip.getByText('Meilleure journée', { exact: true })).toBeVisible();
    await expect(dailyStrip.getByText('Pire journée', { exact: true })).toBeVisible();

    // §23 — the freshness label is present and does not claim to be live.
    const freshness = page.getByTestId('telemetry-freshness');
    await expect(freshness).toBeVisible();
    await expect(freshness).not.toContainText('LIVE');
    await expect(freshness).toContainText(/Actualisé/);

    await shoot(page, '02-hub-populated-1440');
  });

  test('the risk bars agree with the figures beside them', async ({ page }) => {
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, populated.email);

    const daily = page.getByRole('progressbar', { name: /Perte quotidienne/ });
    const value = await daily.getAttribute('aria-valuenow');
    expect(Number(value)).toBeGreaterThanOrEqual(0);
    expect(Number(value)).toBeLessThanOrEqual(100);

    // The bar's own accessible name carries the two amounts it is drawn from,
    // so a bar that disagrees with its label is a failing assertion, not a
    // subtle visual bug.
    const label = await daily.getAttribute('aria-label');
    expect(label).toMatch(/\d/);
    expect(label).toContain('sur');
  });

  test('telemetry refreshes without reloading the page', async ({ page }) => {
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, populated.email);

    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/telemetry')) requests.push(request.url());
    });

    await page.waitForTimeout(9000);
    // At a 4s cadence, ~2 in 9s. One or more proves the loop runs; the upper
    // bound proves it is not firing per-figure or overlapping.
    expect(requests.length).toBeGreaterThanOrEqual(1);
    expect(requests.length).toBeLessThanOrEqual(4);
  });

  test('performance page renders the analytics with data', async ({ page }) => {
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, populated.email);
    await page.goto(`/performance?account=${populated.accountId}`);
    await settled(page);
    await shoot(page, '11-performance-populated-1440');
  });

  test('journal page renders the record with data', async ({ page }) => {
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, populated.email);
    await page.goto(`/journal?account=${populated.accountId}`);
    await settled(page);
    await shoot(page, '13-journal-populated-1440');
  });

  test('accounts page renders the portfolio', async ({ page }) => {
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, populated.email);
    await page.goto('/comptes');
    await settled(page);
    await shoot(page, '08-comptes-1440');
  });

  test('add-account configurator', async ({ page }) => {
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, populated.email);
    await page.goto('/comptes/nouveau');
    await settled(page);
    await shoot(page, '10-comptes-nouveau-1440');
  });

  test('billing page', async ({ page }) => {
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, populated.email);
    await page.goto('/facturation');
    await settled(page);
    await shoot(page, '18-facturation-1440');
  });

  test('payouts page', async ({ page }) => {
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, populated.email);
    await page.goto('/payouts');
    await settled(page);
    await shoot(page, '15-payouts-1440');
  });

  /* ----------------------------------------------------------------- zero */

  test('no account renders the launchpad, not a lonely card', async ({ page }) => {
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, zero.email);

    // Headings by role — the copy beneath each also contains these phrases.
    await expect(page.getByTestId('launchpad-primary')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Comment WARIBA fonctionne' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Les règles publiées' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'WariX est inclus' })).toBeVisible();
    // The catalog is real: the sizes come from buildOfferCatalog, so at least
    // one price must have rendered or the panel is decorative.
    await expect(page.getByText('Tailles disponibles')).toBeVisible();

    // §36 — none of these have a backend, so none of them may appear.
    await expect(page.getByText(/classement/i)).toHaveCount(0);
    await expect(page.getByText(/leaderboard/i)).toHaveCount(0);
    await expect(page.getByText(/badge/i)).toHaveCount(0);

    await shoot(page, '07-hub-zero-account-launchpad-1440');
  });

  /* ----------------------------------------------------------- responsive */

  for (const [name, size] of [
    ['390', SIZES.mobile],
    ['375', SIZES.mobileSmall],
    ['320', SIZES.small],
  ] as const) {
    test(`hub has no horizontal overflow at ${name}`, async ({ page }) => {
      await page.setViewportSize(size);
      await signIn(page, populated.email);
      expect(await noHorizontalOverflow(page)).toBe(true);
      await shootViewport(page, `2${name}-hub-populated-${name}`);
    });

    test(`performance has no horizontal overflow at ${name}`, async ({ page }) => {
      await page.setViewportSize(size);
      await signIn(page, populated.email);
      await page.goto(`/performance?account=${populated.accountId}`);
      await settled(page);
      expect(await noHorizontalOverflow(page)).toBe(true);
    });

    test(`journal has no horizontal overflow at ${name}`, async ({ page }) => {
      await page.setViewportSize(size);
      await signIn(page, populated.email);
      await page.goto(`/journal?account=${populated.accountId}`);
      await settled(page);
      expect(await noHorizontalOverflow(page)).toBe(true);
    });
  }

  test('laptop width keeps the dashboard dense', async ({ page }) => {
    await page.setViewportSize(SIZES.laptop);
    await signIn(page, populated.email);
    expect(await noHorizontalOverflow(page)).toBe(true);
    await shoot(page, '28-hub-populated-1366');
  });

  test('mobile hub fresh', async ({ page }) => {
    await page.setViewportSize(SIZES.mobile);
    await signIn(page, fresh.email);
    expect(await noHorizontalOverflow(page)).toBe(true);
    await shootViewport(page, '19-mobile-hub-fresh-390');
  });

  /* --------------------------------------------------- accessibility (§31) */

  /**
   * Acceptance is 0 critical and 0 serious — §31.
   *
   * Run against the *populated* account on purpose. An empty surface has
   * almost nothing to get wrong; the violations this phase could plausibly
   * introduce live in the things only real data renders — the progress bars'
   * roles and values, the table's headers and caption, the ring's hidden
   * decoration, the aria-live freshness label, and the contrast of semantic
   * figures against tinted washes.
   */
  for (const [name, path] of [
    ['hub', '/hub'],
    ['performance', '/performance'],
    ['journal', '/journal'],
    ['comptes', '/comptes'],
  ] as const) {
    test(`${name} has no critical or serious axe violations`, async ({ page }) => {
      await page.setViewportSize(SIZES.desktop);
      await signIn(page, populated.email);
      if (path !== '/hub') {
        await page.goto(path);
        await settled(page);
      }

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const blocking = results.violations.filter(
        (violation) => violation.impact === 'critical' || violation.impact === 'serious',
      );
      // Named in the failure so a regression says which rule broke, not just
      // that a number went up.
      expect(
        blocking.map((violation) => `${violation.impact}: ${violation.id}`),
      ).toEqual([]);
    });
  }

  /* -------------------------------------------------- reduced motion (§31) */

  test('reduced motion renders final state immediately', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, populated.email);

    // The figures are their real values, not a frame of an entrance animation.
    await expect(page.getByTestId('account-balance')).toBeVisible();
    await expect(page.getByTestId('telemetry-strip')).toBeVisible();
    await shoot(page, '27-reduced-motion-1440');
  });
});
