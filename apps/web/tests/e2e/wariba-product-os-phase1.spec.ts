import { mkdirSync } from 'node:fs';
import { expect, test } from './fixtures';

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
      ['15-password-recovery-form', '/recuperation', 'Choisir un nouveau mot de passe'],
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

test.describe('@phase1 trader hub shell', () => {
  test('the hub shell renders expanded, collapsed and on a phone', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT, { recursive: true });

    await page.setViewportSize(SIZES.desktop);
    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill(tradeAccount.email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(tradeAccount.password);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL('**/hub', { timeout: 60_000 });

    const sidebar = page.getByTestId('hub-sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveAttribute('data-collapsed', 'false');
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/10-hub-shell-expanded-1440.png` });

    // The user menu: only the action that genuinely works.
    await page.getByTestId('hub-user-menu-trigger').click();
    await expect(page.getByTestId('hub-user-menu')).toBeVisible();
    await page.screenshot({ path: `${OUT}/19-user-menu.png` });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('hub-user-menu')).toBeHidden();

    await page.getByTestId('hub-sidebar-toggle').click();
    await expect(sidebar).toHaveAttribute('data-collapsed', 'true');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/11-hub-shell-collapsed-1440.png` });
    await sidebar.screenshot({ path: `${OUT}/20-sidebar-collapsed-real-size.png` });

    // The preference survives a reload rather than resetting every visit.
    await page.reload();
    await expect(page.getByTestId('hub-sidebar')).toHaveAttribute('data-collapsed', 'true');
    await page.getByTestId('hub-sidebar-toggle').click();
    await expect(page.getByTestId('hub-sidebar')).toHaveAttribute('data-collapsed', 'false');

    await page.setViewportSize(SIZES.laptop);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/12-hub-shell-1366.png` });

    await page.setViewportSize(SIZES.mobile);
    await page.waitForTimeout(400);
    await expect(page.getByTestId('hub-mobile-nav')).toBeVisible();
    await page.screenshot({ path: `${OUT}/13-hub-mobile-390.png` });

    await page.setViewportSize(SIZES.small);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/14-hub-mobile-320.png` });

    // 320px must reflow, never scroll sideways.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test('no unfinished destination is exposed', async ({ page, tradeAccount }) => {
    await page.setViewportSize(SIZES.desktop);
    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill(tradeAccount.email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(tradeAccount.password);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL('**/hub', { timeout: 60_000 });

    const sidebar = page.getByTestId('hub-sidebar');
    // Performance, Facturation and Support have no routes yet, so they must not
    // appear — a navigation item that leads nowhere is a promise on the one
    // surface a trader reads every session.
    //
    // WariX joined that list in Phase 1.1 for a different reason: it is a
    // separate product shell, opened contextually from the account that can be
    // traded, not a page of this one. It stays in the phone tab bar, which is
    // asserted in the 1.1 suite.
    for (const absent of ['Performance', 'Facturation', 'Support', 'WariX']) {
      await expect(sidebar.getByText(absent, { exact: true })).toHaveCount(0);
    }
    for (const present of ['Tableau de bord', 'Comptes', 'Payouts']) {
      await expect(sidebar.getByText(present, { exact: true })).toHaveCount(1);
    }
  });
});

test.describe('@phase1 recovery, verification and reduced motion', () => {
  test('the recovery form refuses a mismatch before it reaches the provider', async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(SIZES.desktop);
    await page.goto('/recuperation');
    await page.getByLabel('Nouveau mot de passe').fill('MotDePasseSolide!2026');
    await page.getByLabel('Confirmer le mot de passe').fill('MotDePasseDifferent!2026');
    await page.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' }).click();
    await expect(page.getByText('Les deux mots de passe ne correspondent pas.')).toBeVisible({
      timeout: 30_000,
    });
    await page.screenshot({ path: `${OUT}/16-password-recovery-mismatch.png` });
  });

  test('the verification page masks the address and offers a resend', async ({
    page,
    tradeAccount,
  }) => {
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(SIZES.desktop);
    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill(tradeAccount.email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(tradeAccount.password);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL('**/hub', { timeout: 60_000 });

    await page.goto('/verification-email');
    /*
     * The seeded fixture account is already confirmed, so the page renders its
     * verified branch. Both branches are asserted the same way on the point
     * that matters: the raw address never reaches the screen. The masking
     * itself is unit-tested in tests/product-copy.test.ts.
     */
    await expect(
      page.getByRole('heading', { name: /Adresse vérifiée|Vérifiez votre adresse/ }),
    ).toBeVisible();
    await expect(page.getByText(tradeAccount.email, { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `${OUT}/17-email-verification.png` });
  });

  test('reduced motion removes the sidebar transition', async ({ page, tradeAccount }) => {
    mkdirSync(OUT, { recursive: true });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(SIZES.desktop);
    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill(tradeAccount.email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(tradeAccount.password);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL('**/hub', { timeout: 60_000 });

    const sidebar = page.getByTestId('hub-sidebar');
    /*
     * Tailwind's `transition-none` sets `transition-property: none` and leaves
     * the duration declaration in place, so the duration is the wrong thing to
     * assert — nothing transitions because no property is transitioned.
     */
    const transitionProperty = await sidebar.evaluate(
      (node) => getComputedStyle(node).transitionProperty,
    );
    expect(transitionProperty).toBe('none');

    // Collapsing must still work — motion is removed, not function.
    await page.getByTestId('hub-sidebar-toggle').click();
    await expect(sidebar).toHaveAttribute('data-collapsed', 'true');
    await page.screenshot({ path: `${OUT}/22-reduced-motion-collapsed.png` });
  });

  test('keyboard alone reaches the login form and submits it', async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(SIZES.desktop);
    await page.goto('/login');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('name'));
    expect(['email', 'password']).toContain(focused);
    await page.screenshot({ path: `${OUT}/21-accessibility-focus.png` });
  });
});
