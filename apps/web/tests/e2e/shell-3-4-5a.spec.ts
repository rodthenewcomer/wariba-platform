import { expect, test } from '@playwright/test';
import { assertAccessible } from './accessibility';

/**
 * The global brand shell — Phase 3.4.5A.
 *
 * Scoped deliberately to the shell: header, `Parcours` mega-menu, mobile
 * drawer and footer. The phase asks for fast targeted checks rather than a
 * full-system run, and these are the contracts a later page change could break
 * without anyone noticing — keyboard reachability of the menu, focus return
 * from the drawer, and the fact that the drawer's primary action stays on
 * screen at the smallest supported height.
 */
/**
 * A status code, tolerant of a cold compile but not of a broken route.
 *
 * Hitting every footer destination is the honest way to prove none of them
 * 404s. Against a dev server it also races the compiler: the first request to
 * an uncompiled route can hang up the socket while Next builds it, which is a
 * property of the harness and not of the link. Transport failures are retried;
 * a status is returned as-is, so a genuine 404 or 500 still fails the test.
 */
async function statusOf(page: import('@playwright/test').Page, href: string): Promise<number> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return (await page.request.get(href, { timeout: 45_000 })).status();
    } catch {
      await page.waitForTimeout(1_500);
    }
  }
  return (await page.request.get(href, { timeout: 45_000 })).status();
}

test.describe('Coque de marque globale', { tag: ['@shell'] }, () => {
  test('le méga-menu Parcours s’ouvre, se ferme au clavier et rend les trois familles', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/offres');

    const trigger = page.getByRole('button', { name: 'Parcours' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    for (const family of ['ONE', 'FLEX', 'INSTANT']) {
      await expect(
        page.getByRole('link', { name: new RegExp(`^${family}`) }).first(),
      ).toBeVisible();
    }

    /* Escape closes and hands focus back to the trigger: a menu that closes but
       drops focus to the body leaves a keyboard reader at the top of the page. */
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();

    await assertAccessible(page, 'coque desktop, méga-menu fermé');
  });

  test('le tiroir mobile piège le focus et garde son action principale à l’écran @mobile', async ({
    page,
  }) => {
    /* 320×568 is the smallest supported frame and the one where a drawer is
       most likely to push its own CTA off the bottom — which this one did,
       until the panel became a fixed header / scrolling middle / fixed footer. */
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/offres');

    const open = page.getByRole('button', { name: 'Ouvrir le menu' });
    await open.click();

    const drawer = page.locator('#wariba-mobile-menu');
    await expect(drawer).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fermer le menu' })).toBeFocused();

    const cta = drawer.getByRole('link', { name: 'Commencer' });
    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(568);

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
    ).toBe(false);

    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await expect(open).toBeFocused();
  });

  test('le pied de page expose les routes réelles et la divulgation, sans preuve inventée', async ({
    page,
  }) => {
    /* Compiling a dozen routes on a cold dev server is slower than the default
       budget, and the check is worth keeping: a shell that ships a 404 in its
       own navigation is worse than one with fewer links. */
    test.slow();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/offres');

    const footer = page.locator('footer');
    await expect(footer.getByRole('heading', { name: 'Environnement simulé' })).toBeVisible();
    await expect(footer.getByText(/entièrement simulé/)).toBeVisible();

    /* Every footer destination has to resolve. A shell that ships a 404 in its
       own navigation is worse than one with fewer links. */
    const hrefs = await footer
      .locator('nav a')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
    expect(hrefs.length).toBeGreaterThan(8);

    /* In parallel: against a dev server each of these may be an uncompiled
       route, and thirteen sequential cold compiles overran the test timeout.
       Fanning them out costs one compile's wall time instead of thirteen. */
    const statuses = await Promise.all(
      [...new Set(hrefs)].map(async (href) => [href, await statusOf(page, href)] as const),
    );
    for (const [href, status] of statuses) {
      expect(status, `${href} doit répondre`).toBeLessThan(400);
    }

    await assertAccessible(page, 'pied de page');
  });
});
