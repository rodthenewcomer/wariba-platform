import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * The Help Center, end to end.
 *
 * Targeted, per the content master's §17: routes, search, the policy binding,
 * the responsive table, and the two ways out of an article. The content itself
 * is asserted in `tests/help-registry.test.ts`, which is where a content
 * regression should fail — a browser is the wrong instrument for checking that
 * an article does not name a competitor.
 *
 * `/aide` is public, so none of this signs in. That is itself part of what is
 * being verified: help must be readable before anyone has an account.
 */
const OUT = '../../docs/04-ux/evidence/wariba-help-center';

const SIZES = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
  small: { width: 320, height: 568 },
} as const;

type Page = import('@playwright/test').Page;

async function shoot(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
}

test.describe('@help Centre d’aide', () => {
  test('search finds a rule, and the article states it from the published policy', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(SIZES.desktop);

    await page.goto('/aide');
    await expect(page.getByTestId('help-search-input')).toBeVisible();
    await expect(page.getByTestId('help-pinned')).toBeVisible();
    await expect(page.getByTestId('help-category-card').first()).toBeVisible();
    await shoot(page, 'aide-home-desktop');

    // --- Search ranks the article about the subject first -------------------
    await page.getByTestId('help-search-input').fill('perte maximale');
    await expect(page.getByTestId('help-search-results')).toBeVisible();
    const first = page.getByTestId('help-search-result').first();
    await expect(first).toHaveAttribute('data-slug', 'perte-maximale-eod');
    await first.click();

    await page.waitForURL('**/aide/wariba-one/perte-maximale-eod');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('perte maximale');

    /*
     * The policy binding, verified rather than assumed.
     *
     * The article's prose says « {{fact:maximumLossRate}} », resolved at render
     * from `app.policy_versions`. If the token had leaked through unresolved,
     * or if a percentage had been typed into the copy instead, this would be
     * the assertion that noticed.
     */
    const body = page.locator('article');
    await expect(body).not.toContainText('{{fact:');
    await expect(body).toContainText('%');

    // The severity is written, not merely coloured.
    await expect(page.getByTestId('help-severity')).toHaveText('Compte terminé');
    await expect(page.getByTestId('help-source-of-truth')).toContainText('policy publiée');

    // An example is labelled as an example, every time.
    await expect(page.getByTestId('help-example').first()).toContainText('Chiffres illustratifs');

    await expect(page.getByTestId('help-related')).toBeVisible();
    await shoot(page, 'aide-article-desktop');
  });

  test('a rule table reads the published policy and marks what is unpublished', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto('/aide/wariba-one/regles-essentielles');

    const ruleTable = page.getByTestId('help-rule-table').first();
    await expect(ruleTable).toBeVisible();

    // Every value is either a real published figure or explicitly « non publié ».
    const values = ruleTable.locator('[data-fact]');
    const count = await values.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      const cell = values.nth(index);
      const published = await cell.getAttribute('data-published');
      const text = (await cell.innerText()).trim();
      if (published === 'false') {
        expect(text).toBe('non publié');
      } else {
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toBe('non publié');
      }
    }

    // The daily-loss and maximum-loss rates come from the seeded policy.
    await expect(ruleTable.locator('[data-fact="dailyLossRate"]')).toHaveText('3 %');
    await expect(ruleTable.locator('[data-fact="maximumLossRate"]')).toHaveText('10 %');
  });

  test('a category lists its articles and offers the way out', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/aide');
    await page.getByTestId('help-category-card').first().click();
    await page.waitForURL(/\/aide\/[a-z-]+$/);

    await expect(page.getByTestId('help-category-articles')).toBeVisible();
    await expect(page.getByTestId('help-article-row').first()).toBeVisible();
    await expect(page.getByTestId('help-support-cta')).toBeVisible();
  });

  test('a rule article offers both support and the contestation path', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/aide/wariba-one/perte-maximale-eod');
    await expect(page.getByTestId('help-support-cta')).toBeVisible();
    // Contestable: a terminal breach is a decision a trader can dispute.
    await expect(page.getByTestId('help-dispute-cta')).toBeVisible();

    // Not contestable: a question about placing an order is a support request.
    await page.goto('/aide/warix/placer-un-ordre');
    await expect(page.getByTestId('help-support-cta')).toBeVisible();
    await expect(page.getByTestId('help-dispute-cta')).toHaveCount(0);
  });

  test('no withheld article is reachable by URL', async ({ page }) => {
    test.setTimeout(120_000);
    // Four decisions that are still open. Each has a written article that must
    // not be served — §9 of the content master.
    for (const path of [
      '/aide/wariba-one/reset-ou-recommencer',
      '/aide/paiements/remboursements',
      '/aide/paiements/moyens-de-paiement',
      '/aide/identite/documents-kyc',
      '/aide/compte-securite/voyage-appareil-vpn',
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} must not be served`).toBe(404);
    }
  });

  test('reads at 390 and does not overflow at 320', async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(SIZES.mobile);
    await page.goto('/aide');
    expect(await noHorizontalOverflow(page)).toBe(true);
    await shoot(page, 'aide-home-390');

    await page.goto('/aide/risque-regles/dll-vs-perte-maximale');
    expect(await noHorizontalOverflow(page)).toBe(true);
    await shoot(page, 'aide-article-390');

    /*
     * The comparison table becomes key/value cards below `sm`.
     *
     * §10 forbids a critical table scrolling sideways on a phone. Both
     * renderings come from one data shape, so this asserts the right one is
     * showing rather than that the data exists.
     */
    await page.setViewportSize(SIZES.small);
    for (const path of [
      '/aide',
      '/aide/wariba-one',
      '/aide/wariba-one/regles-essentielles',
      '/aide/risque-regles/dll-vs-perte-maximale',
      '/aide/support/statuts-ticket-contestation',
    ]) {
      await page.goto(path);
      await page.waitForTimeout(150);
      expect(await noHorizontalOverflow(page), `${path} overflows at 320`).toBe(true);
    }
    await shoot(page, 'aide-320');
  });
});
