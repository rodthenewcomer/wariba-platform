import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * WARIBA Product OS Phase 1 — auth and shell evidence.
 *
 * Auth routes are public, so these captures need no fixture account. Every
 * image is the running application at a real viewport.
 */
const OUT = '../../docs/04-ux/evidence/wariba-product-os-phase1-auth-shell';

const SIZES = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1366, height: 768 },
  mobile: { width: 390, height: 844 },
  small: { width: 320, height: 568 },
} as const;

test.describe('@phase1 auth experience', () => {
  test('login at every supported width', async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    for (const [name, size] of [
      ['01-login-1440', SIZES.desktop],
      ['02-login-1366', SIZES.laptop],
      ['03-login-390', SIZES.mobile],
    ] as const) {
      await page.setViewportSize(size);
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: 'Bon retour' })).toBeVisible();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/${name}.png` });
    }
  });
});

test.describe('@phase1 auth pages and system states', () => {
  test('every auth surface and system state renders', async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(SIZES.desktop);

    for (const [name, path, heading] of [
      ['04-signup-1440', '/inscription', 'Créer votre espace WARIBA'],
      ['06-forgot-password-1440', '/mot-de-passe-oublie', 'Mot de passe oublié ?'],
      ['09-session-expired', '/session-expiree', 'Votre session a expiré'],
      ['18-404', '/route-qui-nexiste-pas', 'Page introuvable'],
      ['19-403', '/403', 'Accès non autorisé'],
      ['20-500', '/erreur', 'Un problème est survenu'],
      ['21-offline', '/hors-ligne', 'Connexion interrompue'],
      ['22-maintenance', '/maintenance', 'Maintenance en cours'],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${name}.png` });
    }

    await page.setViewportSize(SIZES.mobile);
    await page.goto('/inscription');
    await expect(page.getByRole('heading', { name: 'Créer votre espace WARIBA' })).toBeVisible();
    await page.screenshot({ path: `${OUT}/05-signup-390.png` });
  });

  test('the login form reports a failure in French without leaking whether the account exists', async ({
    page,
  }) => {
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(SIZES.desktop);
    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill('inconnu@example.com');
    // `exact` matters: "Mot de passe oublié ?" also contains the label text.
    await page.getByLabel('Mot de passe', { exact: true }).fill('MauvaisMotDePasse!1');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    const alert = page.getByText('Adresse e-mail ou mot de passe incorrect.');
    await expect(alert).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: `${OUT}/15-auth-error.png` });
  });
});
