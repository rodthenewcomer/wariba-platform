import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { clickThrough } from './navigation';
import { seedSupportWorld, teardownSupportWorld, type SupportWorld } from './support-world';

type Page = import('@playwright/test').Page;
type Locator = import('@playwright/test').Locator;

/**
 * What Support looks like, and whether a phone can use it.
 *
 * ## Why the captures are here and not with the flow
 *
 * A screenshot proves nothing about whether Reply works, and Reply working
 * proves nothing about whether the reply box sits under the mobile navigation
 * at 320 px. Keeping both in one file meant the expensive half set the budget
 * for the cheap half, and a timeout could not say which had failed.
 *
 * This suite runs against records that already exist, so it spends its time on
 * layout rather than on re-walking a form. It is the one Support suite that is
 * allowed to be slow, and the one that does not need to run on every candidate.
 */
const OUT = '../../docs/04-ux/evidence/wariba-phase-3-2-support';
const HELP_VISUAL_OUT = '../../docs/04-ux/evidence/wariba-help-visual-system/product';

const SIZES = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
  mobileCapture: { width: 390, height: 1200 },
  small: { width: 320, height: 568 },
} as const;

async function shoot(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true, animations: 'disabled' });
}

async function shootHelpAsset(locator: Locator, name: string) {
  mkdirSync(HELP_VISUAL_OUT, { recursive: true });
  await locator.screenshot({ path: `${HELP_VISUAL_OUT}/${name}.png`, animations: 'disabled' });
}

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
}

test.describe('@support @support-visual rendu et responsive', () => {
  let world: SupportWorld;

  test.beforeAll(async ({ browser }) => {
    world = await seedSupportWorld({ browser });
  });

  test.afterAll(async () => {
    await teardownSupportWorld(world);
  });

  test('les surfaces Support et Control se rendent en desktop', async ({ page }) => {
    await world.sessions.actAs(page, world.trader.email);
    await page.setViewportSize(SIZES.desktop);

    await page.goto('/support');
    await expect(page.getByTestId('support-help-search')).toBeVisible();
    await shoot(page, 'support-desktop');

    await page.goto(`/support/demandes/${world.seededTicketReference}`);
    await expect(page.getByTestId('ticket-reference')).toBeVisible();
    await shoot(page, 'support-ticket-desktop');
    await shootHelpAsset(
      page.locator('main .max-w-3xl').first(),
      'HLP-SCR-007-support-ticket-desktop',
    );

    await page.goto(`/support/contestations/${world.seededContestationReference}`);
    await expect(page.getByTestId('contestation-evidence')).toBeVisible();
    await shoot(page, 'contestation-detail-trader');
    await shootHelpAsset(
      page.getByRole('region', { name: 'Décision contestée' }),
      'HLP-SCR-005-breach-evidence-desktop',
    );

    await page.goto('/hub');
    await expect(page.getByRole('link', { name: 'Ouvrir une contestation' })).toBeVisible();
    await shoot(page, 'hub-breached-activity');

    await world.sessions.actAs(page, world.supportOperator.email);
    await page.goto('/control/support');
    await expect(page.getByText('File Support')).toBeVisible();
    await shoot(page, 'control-support-queue');
    await clickThrough(
      page,
      page.getByRole('link', { name: world.seededTicketReference }),
      `**/control/support/${world.seededTicketReference}`,
    );
    await expect(page.getByTestId('control-ticket-meta')).toBeVisible();
    await shoot(page, 'control-ticket-detail');

    await world.sessions.actAs(page, world.riskReviewer.email);
    await page.goto(`/control/contestations/${world.seededContestationReference}`);
    await expect(page.getByTestId('control-contestation-evidence')).toBeVisible();
    await shoot(page, 'control-contestation-detail');
  });

  test('@mobile le parcours tient à 390 et ne déborde pas à 320', async ({ page }) => {
    await world.sessions.actAs(page, world.trader.email);
    await page.setViewportSize(SIZES.mobile);

    await page.goto('/support');
    await expect(page.getByTestId('support-help-search')).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
    await shoot(page, 'support-home-390');

    await page.goto(`/support/demandes/${world.seededTicketReference}`);
    await expect(page.getByTestId('ticket-reference')).toBeVisible();
    await expect(page.getByTestId('ticket-message').first()).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
    await shoot(page, 'support-ticket-390');
    await page.setViewportSize(SIZES.mobileCapture);
    await shootHelpAsset(
      page.locator('main .max-w-3xl').first(),
      'HLP-SCR-007-support-ticket-mobile',
    );

    // A composer a phone can actually use: 44px minimum, in the viewport.
    await page.setViewportSize(SIZES.mobile);
    const submit = page.getByTestId('reply-submit');
    if (await submit.count()) {
      const box = await submit.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }

    // --- 320: the narrowest supported width (DS-014 LOCKED) ---------------
    await page.setViewportSize(SIZES.small);
    for (const route of [
      '/support',
      '/support/nouveau',
      `/support/demandes/${world.seededTicketReference}`,
      `/support/contestations/${world.seededContestationReference}`,
    ]) {
      await page.goto(route);
      await expect(page.locator('[data-wariba-section="hub"]')).toBeVisible();
      expect(await noHorizontalOverflow(page), `${route} overflows at 320`).toBe(true);
    }
    await shoot(page, 'support-320');

    // La contestation sur téléphone : c'est là que la table de preuve devient
    // une pile de cartes, et que le superflu se voit le plus.
    await page.setViewportSize(SIZES.mobile);
    await page.goto(`/support/contestations/${world.seededContestationReference}`);
    await expect(page.getByTestId('contestation-reference')).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
    await shoot(page, 'contestation-detail-390');
    await page.setViewportSize(SIZES.mobileCapture);
    await shootHelpAsset(
      page.getByRole('region', { name: 'Décision contestée' }),
      'HLP-SCR-005-breach-evidence-mobile',
    );
  });

  /**
   * La barre de navigation ne doit jamais passer devant ce qu'on tape.
   *
   * Elle est en `position: fixed` en bas de l'écran, et `<main>` réserve sa
   * hauteur en `padding-bottom`. Ce test mesure le contrat plutôt que de le
   * croire : il fait défiler jusqu'en bas du fil, puis compare le rectangle de
   * la barre à celui du champ de réponse, du bouton d'envoi et de la dernière
   * ligne de texte.
   *
   * Une capture pleine page ne peut pas répondre à cette question — un élément
   * fixe y est dessiné là où était la fenêtre au moment du cliché, c'est-à-dire
   * au milieu de l'image. Il faut mesurer dans le repère de la fenêtre, à
   * quatre largeurs, ce que fait cette boucle.
   */
  test('@mobile la barre de navigation ne recouvre jamais le formulaire de réponse', async ({
    page,
  }) => {
    await world.sessions.actAs(page, world.trader.email);

    for (const width of [320, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 780 });
      await page.goto(`/support/demandes/${world.seededTicketReference}`);
      await expect(page.getByTestId('reply-composer')).toBeVisible();

      // Tout en bas : la position la plus défavorable pour un élément fixe.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      /*
       * Attendre que le défilement s'arrête, pas un nombre de millisecondes.
       * Un `waitForTimeout` ici est une course qui passe sur une machine
       * rapide : la mesure doit être prise quand la page a fini de bouger.
       */
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            let last = -1;
            const tick = () => {
              if (window.scrollY === last) {
                resolve();
                return;
              }
              last = window.scrollY;
              requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }),
      );

      const nav = await page.getByTestId('hub-mobile-nav').boundingBox();
      expect(nav, `${width}px: la barre mobile devrait être rendue`).not.toBeNull();

      for (const testId of ['reply-body', 'reply-submit']) {
        const box = await page.getByTestId(testId).boundingBox();
        expect(box, `${width}px: ${testId} devrait être mesurable`).not.toBeNull();
        // Entièrement dans la fenêtre…
        expect(box!.y, `${width}px: ${testId} sort par le haut`).toBeGreaterThanOrEqual(0);
        // …et entièrement au-dessus de la barre.
        expect(box!.y + box!.height, `${width}px: la barre recouvre ${testId}`).toBeLessThanOrEqual(
          nav!.y + 1,
        );
      }

      // Et la dernière ligne de la page, pas seulement les champs.
      const tail = await page.getByTestId('ticket-footer-reference').boundingBox();
      if (tail) {
        expect(
          tail.y + tail.height,
          `${width}px: la barre recouvre la fin de page`,
        ).toBeLessThanOrEqual(nav!.y + 1);
      }
    }
  });
});
