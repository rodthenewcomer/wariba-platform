import { expect, test } from '@playwright/test';
import { assertAccessible } from './accessibility';

/**
 * The homepage — Phase 3.4.5B.
 *
 * Scoped to the contracts a later change could break silently: that the page
 * has real sections rather than a stack of text blocks, that the configurator
 * responds without a server round trip, that no rule is generalised across the
 * three families, and that nothing overflows the narrowest supported screen.
 */
test.describe('Page d’accueil', { tag: ['@home'] }, () => {
  test('présente ses scènes et n’affirme rien de faux sur les trois parcours', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Passez sur Performance');

    /* The named scenes. Their absence would mean a section quietly became
       "headline + paragraph + border" again. */
    /* Two of them: the hero's compact version and the full one in the
       dashboard section. `.first()` rather than a second test id — they are
       the same component, and giving one a different name to satisfy strict
       mode would hide that. */
    await expect(page.getByTestId('performance-showcase').first()).toBeVisible();
    await expect(page.getByTestId('performance-showcase')).toHaveCount(2);
    await expect(page.getByTestId('home-configurator')).toBeVisible();
    await expect(page.getByRole('img', { name: /perte maximale/i })).toBeVisible();
    await expect(page.getByRole('img', { name: /WariX/ })).toBeVisible();

    /*
     * No sentence may claim the three families share a rule. Five of their six
     * risk rules differ, and this is where that error appeared twice before.
     */
    const body = (await page.locator('main').innerText()).toLowerCase();
    for (const claim of [
      'les règles sont les mêmes',
      'mêmes règles pour',
      'ce qui change, c’est quand vous payez',
    ]) {
      expect(body, `généralisation interdite : ${claim}`).not.toContain(claim);
    }

    /* Catalogue counts are not a value proposition. */
    expect(body).not.toContain('15 offres');

    await assertAccessible(page, 'page d’accueil');
  });

  test('le configurateur répond sans quitter la page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const configurator = page.getByTestId('home-configurator');
    await configurator.scrollIntoViewIfNeeded();
    const before = await configurator.getAttribute('data-offer-id');

    await configurator.getByRole('radio', { name: 'FLEX' }).click();
    await expect.poll(() => configurator.getAttribute('data-offer-id')).not.toBe(before);

    /* FLEX never hides its second amount or the total. */
    await expect(configurator.getByText('Après réussite')).toBeVisible();
    await expect(configurator.getByText('Total si vous réussissez')).toBeVisible();

    /* Choosing an account is client state: the homepage is not a shareable
       configuration, so nothing may land in the address bar. */
    expect(new URL(page.url()).search).toBe('');
  });

  test('tient à 320 px sans rien pousser hors de l’écran @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    await page.waitForTimeout(600);

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
    ).toBe(false);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Commencer' }).first()).toBeVisible();
  });
});
