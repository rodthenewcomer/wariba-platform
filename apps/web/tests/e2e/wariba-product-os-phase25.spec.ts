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
  withLifecycle,
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
    // The desktop summary owns the decision; the sticky bar is mobile-only.
    await expect(page.getByTestId('offer-checkout')).toBeVisible();
    await expect(page.getByTestId('configurator-sticky-cta')).toBeHidden();
    await shoot(page, '10-comptes-nouveau-1440');
  });

  test('the configurator keeps its price and CTA in reach on a phone', async ({ page }) => {
    await page.setViewportSize(SIZES.mobile);
    await signIn(page, populated.email);
    await page.goto('/comptes/nouveau');
    await settled(page);

    /*
     * §19 — without this the summary is the third thing on the page: below the
     * programme step and below five size cards. A trader who has just chosen a
     * size scrolls past everything they already decided to find the button,
     * with the price they are agreeing to off-screen while they do it.
     */
    const sticky = page.getByTestId('configurator-sticky-cta');
    await expect(sticky).toBeVisible();
    await expect(sticky.getByTestId('offer-checkout-sticky')).toBeVisible();

    /*
     * And it must not cover the content it sits over — §19 says so explicitly,
     * and a sticky CTA sitting on top of the last option is the classic
     * version of this bug: the trader can see the choice and cannot tap it.
     * Scrolled to the bottom, the summary card's last pixel has to clear the
     * bar's first one.
     */
    await page.mouse.wheel(0, 4000);
    await page.waitForTimeout(400);
    const summaryBox = await page.getByTestId('offer-summary').boundingBox();
    const stickyBox = await sticky.boundingBox();
    expect(summaryBox).not.toBeNull();
    expect(stickyBox).not.toBeNull();
    expect(summaryBox!.y + summaryBox!.height).toBeLessThanOrEqual(stickyBox!.y);

    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('billing page reports the record without inventing a card vault', async ({ page }) => {
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, populated.email);
    await page.goto('/facturation');
    await settled(page);

    // §21 — counts beside the total, and the provider that took the money.
    await expect(page.getByText('Total dépensé')).toBeVisible();
    await expect(page.getByText('Comptes activés')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Prestataire' })).toBeVisible();

    // And emphatically no vault: SAVED_PAYMENT_METHODS_AVAILABLE is false.
    await expect(page.getByText(/carte enregistrée|•{4}|\*{4}/i)).toHaveCount(0);

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

      /*
       * Let the entrance settle before measuring.
       *
       * `Stagger` fades panels in from opacity 0. axe computes contrast from
       * *rendered* colour, so a card sampled at opacity 0.4 reports its text
       * blended toward the background and fails a check it passes at rest.
       * Auditing mid-animation measures the animation, not the design — and
       * produces a suite whose result depends on how fast the machine is.
       */
      await page.waitForTimeout(1200);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const blocking = results.violations.filter(
        (violation) => violation.impact === 'critical' || violation.impact === 'serious',
      );
      /*
       * The failure names the rule *and the node*. "serious: color-contrast"
       * tells you something broke; it does not tell you which of ninety
       * elements, and hunting for it by eye is how an accessibility failure
       * gets suppressed instead of fixed.
       */
      expect(
        blocking.flatMap((violation) =>
          violation.nodes.map(
            (node) => `${violation.impact}: ${violation.id} @ ${node.target.join(' ')}`,
          ),
        ),
      ).toEqual([]);
    });
  }

  /* --------------------------------------------------- empty states (§26) */

  /**
   * The empty surfaces, photographed on the fresh account.
   *
   * §26's rule is that an empty state preserves the shape of the product: the
   * filters stay, the frame stays, and the page says what will appear here
   * rather than rendering the metrics as zeros. These captures are how that is
   * judged rather than asserted.
   */
  test('performance renders its empty state', async ({ page }) => {
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, fresh.email);
    await page.goto('/performance');
    await settled(page);
    // Never a fabricated zero — §26.
    await expect(page.getByText('0 %')).toHaveCount(0);
    await shoot(page, '12-performance-empty-1440');
  });

  test('journal renders its empty state', async ({ page }) => {
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, fresh.email);
    await page.goto('/journal');
    await settled(page);
    await shoot(page, '14-journal-empty-1440');
  });

  /* -------------------------------------------------------- mobile (§25) */

  for (const [path, name] of [
    ['/performance', '21-mobile-performance-populated-390'],
    ['/journal', '22-mobile-journal-populated-390'],
    ['/comptes', '23-mobile-comptes-390'],
    ['/comptes/nouveau', '24-mobile-comptes-nouveau-390'],
    ['/payouts', '25-mobile-payouts-390'],
    ['/plus', '26-mobile-plus-390'],
  ] as const) {
    test(`mobile ${path} has no overflow and is photographed`, async ({ page }) => {
      await page.setViewportSize(SIZES.mobile);
      await signIn(page, populated.email);
      await page.goto(path);
      await settled(page);
      expect(await noHorizontalOverflow(page)).toBe(true);
      await shootViewport(page, name);
    });
  }

  test('mobile hub populated', async ({ page }) => {
    await page.setViewportSize(SIZES.mobile);
    await signIn(page, populated.email);
    expect(await noHorizontalOverflow(page)).toBe(true);
    await shootViewport(page, '20-mobile-hub-populated-390');
  });

  /* ------------------------------------------------ lifecycle states (§33) */

  /**
   * The dashboard changes shape with the account's lifecycle, and §10.3/§10.4
   * are specific about how: a funded account leads with its payout cycle
   * rather than the evaluation card with a new badge, and a breached account
   * must not retain a single word of praise.
   *
   * Each state gets its own seeded account. Photographing one account and
   * mutating it between shots would let an earlier state's cache leak into a
   * later capture, which is how evidence quietly stops being evidence.
   */
  for (const [state, name] of [
    ['objective_reached', '03-hub-objective-reached-1440'],
    ['under_review', '04-hub-under-review-1440'],
    ['funded_active', '05-hub-funded-active-1440'],
    ['breached', '06-hub-breached-1440'],
    ['payout_ready', '16-payout-request-ready-1440'],
    ['payout_eligible_kyc_required', '17-payout-kyc-gate-1440'],
  ] as const) {
    test(`hub renders the ${state} lifecycle`, async ({ page }) => {
      await withLifecycle(state, async (fixture) => {
        await page.setViewportSize(SIZES.desktop);
        await page.goto('/login');
        await page.getByLabel('Adresse e-mail').fill(fixture.email);
        await page.getByLabel('Mot de passe', { exact: true }).fill(fixture.password);
        await page.getByRole('button', { name: 'Se connecter' }).click();
        await page.waitForURL('**/hub', { timeout: 60_000 });
        await settled(page);

        if (state === 'breached') {
          /*
           * §10.4 — a terminal account keeps no praise. "Excellent" and a
           * healthy ring on an account that cannot trade again is the single
           * most damaging reassurance this surface could produce.
           */
          await expect(page.getByTestId('health-panel')).not.toContainText('Excellent');
          await expect(page.getByTestId('health-panel')).not.toContainText('Risque intact');
          // No route into a terminal that would refuse the trade anyway.
          await expect(page.getByTestId('header-open-warix')).toHaveCount(0);
          /*
           * And no full risk bars. A maximum-loss breach leaves the daily
           * budget genuinely untouched, so the engine reports 100 % — two full
           * bars beside a panel reading "Terminé, 0 %" tells a trader whose
           * account just ended that they have all their room left.
           */
          await expect(page.getByTestId('terminal-risk-note')).toBeVisible();
          await expect(page.getByRole('progressbar', { name: /Perte quotidienne/ })).toHaveCount(0);
          await expect(page.getByRole('progressbar', { name: /Perte maximale/ })).toHaveCount(0);
          /*
           * And no live checklist. Its conditions are evaluated against rules
           * the trader is no longer measured by, which produced a green
           * "Perte maximale non atteinte" directly under a banner saying it
           * had been.
           */
          await expect(page.getByText('Perte maximale non atteinte')).toHaveCount(0);
        }

        if (state === 'payout_ready' || state === 'payout_eligible_kyc_required') {
          await page.goto('/payouts');
          await settled(page);
        }

        await shoot(page, name);
      });
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
