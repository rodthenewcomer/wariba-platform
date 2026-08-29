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

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Tradez avec des règles claires',
    );

    /* The named scenes. Their absence would mean a section quietly became
       "headline + paragraph + border" again. */
    /*
     * One, not two.
     *
     * The hero used to carry a copy of the dashboard; 3.4.5B.1 replaced it with
     * the Market Field, because WariX has its own section further down and a
     * product mockup in the hero spends that moment early. The dashboard now
     * appears once, where it is the subject.
     */
    await expect(page.getByTestId('performance-showcase')).toHaveCount(1);
    await expect(page.getByTestId('performance-showcase')).toBeVisible();

    /* And the hero carries the atmosphere instead. */
    await expect(page.locator('.wariba-market-field')).toHaveCount(1);
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
    /* The hero's own CTA, not the header's — at 320 the header CTA is
       correctly hidden, and asserting on it would pass only while a cascade
       bug was leaking it onto a phone. */
    await expect(page.getByRole('link', { name: 'Choisir mon parcours' })).toBeVisible();
  });
});
