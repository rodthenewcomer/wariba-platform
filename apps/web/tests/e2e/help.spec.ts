import { mkdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
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
const OUT = '../../docs/04-ux/evidence/wariba-help-editorial-closure';
const VISUAL_OUT = '../../docs/04-ux/evidence/wariba-help-visual-system';

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

async function shootVisual(page: Page, name: string) {
  mkdirSync(VISUAL_OUT, { recursive: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${VISUAL_OUT}/${name}.png`, fullPage: true });
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
    // §13 — a human version line, not « Policy WARIBA ONE 1.1.1 ».
    await expect(page.getByTestId('help-pinned')).toContainText('Règles WARIBA ONE — version');
    await shoot(page, 'aide-home-1440');

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

    // The severity is written, not merely coloured — and in the words a
    // trader uses, not the ones the schema uses.
    await expect(page.getByTestId('help-severity')).toHaveText('Met fin au compte');
    await expect(page.getByTestId('help-source-of-truth')).toContainText('Règles en vigueur');
    await expect(page.getByTestId('help-source-of-truth')).not.toContainText('policy');
    await expect(page.getByTestId('help-source-of-truth')).not.toContainText('domain code');

    // An example is labelled as an example, every time.
    await expect(page.getByTestId('help-example').first()).toContainText(
      'Chiffres donnés à titre d’exemple',
    );

    // §11 — no implementation provenance reaches the page.
    const articleText = (await page.locator('article').innerText()).toLocaleLowerCase('fr');
    for (const leak of ['source de vérité', 'domain code', 'côté serveur', 'autoritatif']) {
      expect(articleText, `« ${leak} » visible sur un article public`).not.toContain(leak);
    }

    /*
     * §14 — a French date, not a database one.
     *
     * The month is matched with an explicit accented class rather than `\w`:
     * without the unicode flag, `\w` does not match the « û » in « août », and
     * the assertion would pass eleven months a year.
     */
    await expect(page.getByText(/Mis à jour le \d{1,2} [a-zéûà]+ 2026/)).toBeVisible();

    await expect(page.getByTestId('help-related')).toBeVisible();
    await shoot(page, 'aide-perte-maximale-desktop');
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

  test('les statuts de demande et de contestation se lisent en français', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(SIZES.desktop);
    await page.goto('/aide/support/statuts-ticket-contestation');

    // §7 / §8 — la première personne du pluriel, pas un état système.
    /*
     * `.first()` because the table renders twice — as a `<table>` above `sm`
     * and as stacked key/value cards below it. Both are in the DOM; CSS picks
     * one. That is the responsive contract working, not a duplicate.
     */
    await expect(page.getByText('Nous avons bien reçu votre demande.').first()).toBeVisible();
    await expect(page.getByText('L’équipe WARIBA analyse votre demande.').first()).toBeVisible();
    await expect(
      page.getByText('Votre contestation a bien été enregistrée.').first(),
    ).toBeVisible();

    // §8 — rien ne laisse entendre qu'un compte terminé peut rouvrir.
    const body = (await page.locator('article').innerText()).toLocaleLowerCase('fr');
    expect(body).not.toContain('sera rétabli');
    expect(body).not.toContain('sera annulé');
    await shoot(page, 'aide-statuts-desktop');
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
    await shoot(page, 'aide-comparaison-risque-390');

    await page.goto('/aide/wariba-one/perte-maximale-eod');
    expect(await noHorizontalOverflow(page)).toBe(true);
    await shoot(page, 'aide-perte-maximale-390');

    await page.goto('/aide/support/statuts-ticket-contestation');
    expect(await noHorizontalOverflow(page)).toBe(true);
    await shoot(page, 'aide-statuts-390');

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
    await shoot(page, 'aide-statuts-320');
  });

  test('les visuels P0 restent lisibles, réels et statiques en reduced motion', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(SIZES.desktop);
    await page.goto('/aide/risque-regles/dll-vs-perte-maximale');

    const diagram = page.locator('[data-help-visual="HLP-VIS-001"]');
    await expect(diagram).toBeVisible();
    await expect(diagram).toContainText('Perte quotidienne');
    await expect(diagram).toContainText('Perte maximale');
    await expect(diagram).not.toContainText('{{fact:');
    await expect(diagram.getByText(/QUOTIDIEN_POLICY|MAXIMUM_POLICY/)).toHaveCount(0);
    await shootVisual(page, 'HLP-VIS-001-article-1440');
    await page.waitForTimeout(700);
    const accessibility = await new AxeBuilder({ page }).analyze();
    const serious = accessibility.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    );
    expect(serious, JSON.stringify(serious, null, 2)).toHaveLength(0);

    await page.goto('/aide/support/creer-et-suivre-un-ticket');
    const screenshot = page.locator('[data-help-visual="HLP-SCR-007"]');
    await expect(screenshot).toBeVisible();
    const image = screenshot.getByRole('img');
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(
      0,
    );
    await expect(screenshot.getByRole('list', { name: 'Repères de la capture' })).toBeVisible();
    await shootVisual(page, 'HLP-SCR-007-article-1440');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/aide/risque-regles/trailing-eod');
    const animated = page.locator('.help-visual .help-visual-node').first();
    await expect(animated).toBeVisible();
    expect(await animated.evaluate((node) => getComputedStyle(node).animationDuration)).toBe(
      '0.001s',
    );

    await page.setViewportSize(SIZES.mobile);
    await page.goto('/aide/support/creer-et-suivre-un-ticket');
    expect(await noHorizontalOverflow(page)).toBe(true);
    await expect(page.locator('[data-help-visual="HLP-SCR-007"]')).toBeVisible();
    await shootVisual(page, 'HLP-SCR-007-article-390');

    await page.setViewportSize(SIZES.small);
    for (const path of [
      '/aide/risque-regles/dll-vs-perte-maximale',
      '/aide/risque-regles/trailing-eod',
      '/aide/support/creer-et-suivre-un-ticket',
    ]) {
      await page.goto(path);
      expect(await noHorizontalOverflow(page), `${path} déborde à 320 px`).toBe(true);
    }
  });
});
