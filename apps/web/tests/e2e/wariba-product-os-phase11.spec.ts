import { mkdirSync } from 'node:fs';
import { expect, test } from './fixtures';

/**
 * WARIBA Product OS Phase 1.1 — premium closure.
 *
 * Phase 1 proved these surfaces worked. This suite exists because "it works"
 * and "it is finished" are different claims, and the second one is the one
 * that was failing: a 770px content column that ignored the collapse, a
 * database key rendered as the headline, and a chart of an empty account
 * occupying the best third of the dashboard.
 *
 * So the assertions here are visual facts, measured rather than eyeballed —
 * the width the content actually reclaims, the pixel at which the primary
 * action stops being reachable without scrolling, whether a chart was drawn
 * over data that does not exist.
 */
const OUT = '../../docs/04-ux/evidence/wariba-product-os-phase11-premium-closure';

const SIZES = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1366, height: 768 },
  mobile: { width: 390, height: 844 },
  small: { width: 320, height: 568 },
} as const;

async function signIn(
  page: import('@playwright/test').Page,
  account: { email: string; password: string },
) {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(account.email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 60_000 });
}

const contentWidth = (page: import('@playwright/test').Page) =>
  page.getByTestId('hub-content').evaluate((node) => node.getBoundingClientRect().width);

test.describe('@phase11 auth at every supported width', () => {
  test('the split screen and its single-column collapse', async ({ page }) => {
    mkdirSync(OUT, { recursive: true });

    for (const [name, size] of [
      ['auth-01-login-1440', SIZES.desktop],
      ['auth-02-login-1366', SIZES.laptop],
      ['auth-03-login-390', SIZES.mobile],
      ['auth-04-login-320', SIZES.small],
    ] as const) {
      await page.setViewportSize(size);
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: 'Bon retour' })).toBeVisible();
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${OUT}/${name}.png` });
    }

    // The form column stops growing at 440px. Wider than that and it stops
    // being a column; the extra width becomes margin either way.
    await page.setViewportSize(SIZES.desktop);
    await page.goto('/login');
    const formWidth = await page
      .getByTestId('auth-form-column')
      .locator('> div')
      .evaluate((node) => node.getBoundingClientRect().width);
    expect(formWidth).toBeLessThanOrEqual(450);
    expect(formWidth).toBeGreaterThanOrEqual(420);

    // 48px controls, not the workstation's 40px.
    const fieldHeight = await page
      .getByLabel('Adresse e-mail')
      .evaluate((node) => node.getBoundingClientRect().height);
    expect(fieldHeight).toBeGreaterThanOrEqual(46);
    expect(fieldHeight).toBeLessThanOrEqual(52);
  });

  test('the visual side states facts and no figures', async ({ page }) => {
    await page.setViewportSize(SIZES.desktop);
    await page.goto('/login');
    const visual = page.getByTestId('auth-visual');
    await expect(visual).toBeVisible();
    for (const truth of ['Trading simulé', 'Règles publiées', 'Risque contrôlé']) {
      await expect(visual.getByText(truth, { exact: true })).toBeVisible();
    }
    /*
     * No number anywhere on the brand side. This is the slot the category
     * fills with payout totals and win rates; a digit here would be a claim
     * WARIBA has not earned, on the first screen it shows anyone.
     */
    const text = (await visual.innerText()).replace(/\s/g, '');
    expect(text).not.toMatch(/\d/);
  });

  test('the mobile form starts under the brand instead of floating', async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(SIZES.mobile);
    await page.goto('/inscription');
    await expect(page.getByRole('heading', { name: 'Créer votre espace WARIBA' })).toBeVisible();

    const gap = await page.evaluate(() => {
      const header = document.querySelector('header');
      const heading = document.querySelector('h1');
      if (!header || !heading) return Number.NaN;
      return heading.getBoundingClientRect().top - header.getBoundingClientRect().bottom;
    });
    // Was ~200px of nothing on a 844px screen when the column centred itself
    // at every width.
    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeLessThan(80);

    await page.screenshot({ path: `${OUT}/auth-05-signup-390.png` });
  });

  test('the visibility control stays inside the field it belongs to', async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(SIZES.desktop);
    await page.goto('/inscription');

    // The signup password field has requirements under it — the exact case
    // that used to push the eye down beside the help text.
    const field = page.getByLabel('Mot de passe', { exact: true });
    const toggle = page.getByTestId('password-toggle-password');
    const [fieldBox, toggleBox] = await Promise.all([field.boundingBox(), toggle.boundingBox()]);
    expect(fieldBox).not.toBeNull();
    expect(toggleBox).not.toBeNull();
    if (!fieldBox || !toggleBox) return;

    const toggleCentre = toggleBox.y + toggleBox.height / 2;
    expect(toggleCentre).toBeGreaterThan(fieldBox.y);
    expect(toggleCentre).toBeLessThan(fieldBox.y + fieldBox.height);
    // And it is anchored to the right edge of the input, not floating.
    expect(Math.abs(toggleBox.x + toggleBox.width - (fieldBox.x + fieldBox.width))).toBeLessThan(4);

    await page.screenshot({ path: `${OUT}/auth-06-password-field.png` });
  });
});

test.describe('@phase11 outcome screens', () => {
  test('signup states the country, and verification opens on a status mark', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT, { recursive: true });

    await page.setViewportSize(SIZES.desktop);
    await page.goto('/inscription');
    await expect(page.getByRole('heading', { name: 'Créer votre espace WARIBA' })).toBeVisible();
    // The country is chosen, never assumed — and nothing is preselected.
    await expect(page.getByLabel('Pays de résidence')).toHaveValue('');
    await page.screenshot({ path: `${OUT}/auth-07-signup-1440.png` });

    await signIn(page, tradeAccount);
    await page.goto('/verification-email');
    /*
     * The seeded account is already confirmed, so this renders the verified
     * branch. Both branches open on a status mark rather than on a paragraph,
     * and neither ever puts the raw address on screen.
     */
    await expect(page.getByTestId('auth-status-mark')).toBeVisible();
    await expect(page.getByText(tradeAccount.email, { exact: true })).toHaveCount(0);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/auth-08-verification.png` });
  });
});

test.describe('@phase11 hub layout reclaims width', () => {
  test('collapsing the sidebar gives the dashboard real width back', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, tradeAccount);

    const sidebar = page.getByTestId('hub-sidebar');
    await expect(sidebar).toHaveAttribute('data-collapsed', 'false');
    await expect(page.getByTestId('account-hero')).toBeVisible();
    await page.waitForTimeout(500);
    const expanded1440 = await contentWidth(page);
    await page.screenshot({ path: `${OUT}/hub-01-1440-expanded.png` });

    await page.getByTestId('hub-sidebar-toggle').click();
    await expect(sidebar).toHaveAttribute('data-collapsed', 'true');
    await page.waitForTimeout(400);
    const collapsed1440 = await contentWidth(page);
    await page.screenshot({ path: `${OUT}/hub-02-1440-collapsed.png` });

    /*
     * The failure this replaces: the sidebar animated from 232px to 68px and
     * the content column stayed at 768px, so 164 reclaimed pixels landed
     * entirely in the page margin. A collapse that changes nothing a trader
     * can see is an animation, not a control.
     */
    expect(collapsed1440 - expanded1440).toBeGreaterThanOrEqual(90);
    // And the column is genuinely wide, not a 770px ribbon in a 1440 viewport.
    expect(expanded1440).toBeGreaterThan(1000);

    await page.setViewportSize(SIZES.laptop);
    await page.waitForTimeout(400);
    const collapsed1366 = await contentWidth(page);
    await page.screenshot({ path: `${OUT}/hub-04-1366-collapsed.png` });

    await page.getByTestId('hub-sidebar-toggle').click();
    await expect(sidebar).toHaveAttribute('data-collapsed', 'false');
    await page.waitForTimeout(400);
    const expanded1366 = await contentWidth(page);
    await page.screenshot({ path: `${OUT}/hub-03-1366-expanded.png` });

    expect(collapsed1366 - expanded1366).toBeGreaterThanOrEqual(150);

    // Content starts one gutter after the sidebar, not a page-width later.
    const offset = await page.evaluate(() => {
      const nav = document.querySelector('[data-testid="hub-sidebar"]');
      const content = document.querySelector('[data-testid="hub-content"]');
      if (!nav || !content) return Number.NaN;
      return content.getBoundingClientRect().left - nav.getBoundingClientRect().right;
    });
    expect(offset).toBeGreaterThanOrEqual(28);
    expect(offset).toBeLessThanOrEqual(44);
  });
});

test.describe('@phase11 dashboard hierarchy', () => {
  test('the next action is reachable without scrolling at every width', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(SIZES.laptop);
    await signIn(page, tradeAccount);
    await expect(page.getByTestId('account-hero')).toBeVisible();

    const action = page.getByTestId('hub-next-action');
    await expect(action).toBeVisible();
    // Server-derived: for an active account the next safe action is opening
    // the terminal, which is precisely why WariX left the sidebar.
    await expect(action).toHaveText('Ouvrir WariX');

    for (const [name, size] of [
      ['hub-05-1366-fold', SIZES.laptop],
      ['hub-06-390-fold', SIZES.mobile],
      ['hub-07-320-fold', SIZES.small],
    ] as const) {
      await page.setViewportSize(size);
      /*
       * Whichever call to action is actually on screen.
       *
       * The Hub carries two — the desktop one and `hub-next-action-mobile`,
       * which the phone layout shows above the risk meters. Both are in the
       * DOM and exactly one is ever visible, so asking the desktop one for its
       * rectangle at 390px gets `null`: it is not hidden by accident, it is the
       * wrong one at that width. The contract is that *the* next action is
       * above the fold, not that a particular element is.
       */
      const visibleAction = page
        .getByTestId('hub-next-action')
        .or(page.getByTestId('hub-next-action-mobile'))
        .filter({ visible: true })
        .first();
      await expect(visibleAction).toBeVisible();
      const box = await visibleAction.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        // Entirely inside the first viewport — a trader should never have to
        // scroll to find the one thing the screen is asking them to do.
        expect(box.y + box.height).toBeLessThanOrEqual(size.height);
      }
      await page.screenshot({ path: `${OUT}/${name}.png` });
    }

    // 320px must reflow, never scroll sideways.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test('the objective appears before any performance visualisation at 320px', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(SIZES.small);
    await signIn(page, tradeAccount);
    await expect(page.getByTestId('account-hero')).toBeVisible();

    // The objective block is the mission checklist since the 2.5 command-centre
    // pass; `account-objective` no longer exists.
    const objective = await page.getByTestId('mission-checklist').boundingBox();
    const evolution = page.getByTestId('account-evolution');
    const evolutionEmpty = page.getByTestId('account-evolution-empty');

    /*
     * Exactly one of the two renders. The chart is drawn only when the read
     * model says the series is worth drawing; otherwise a compact truthful
     * line stands in its place. There is no third option and in particular no
     * seeded sparkline.
     */
    const drawn = await evolution.count();
    const stated = await evolutionEmpty.count();
    expect(drawn + stated).toBe(1);

    const visual = await (drawn === 1 ? evolution : evolutionEmpty).boundingBox();
    expect(objective).not.toBeNull();
    expect(visual).not.toBeNull();
    if (objective && visual) expect(objective.y).toBeLessThan(visual.y);

    if (stated === 1) {
      await expect(evolutionEmpty).toContainText(
        /Aucune session terminée pour le moment\.|Pas encore assez d’historique/,
      );
    }

    await page.screenshot({ path: `${OUT}/hub-08-320-objective-before-chart.png`, fullPage: true });
  });

  test('the public reference is a footnote, not the headline', async ({ page, tradeAccount }) => {
    test.setTimeout(600_000);
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, tradeAccount);

    const hero = page.getByTestId('account-hero');
    const reference = hero.getByText(tradeAccount.accountPublicId, { exact: true });
    await expect(reference).toBeVisible();

    /*
     * `EVAL-10000-12FE3592` is a database key. It has to be readable — support
     * asks for it — and it must never again be the first thing on the screen,
     * which is what it was when the dashboard opened on it.
     */
    const fontSize = await reference.evaluate((node) =>
      Number.parseFloat(getComputedStyle(node).fontSize),
    );
    expect(fontSize).toBeLessThanOrEqual(13);

    // The program name is what leads instead.
    await expect(hero.getByText('WARIBA ONE').first()).toBeVisible();
    // The compliance clause is present but concise.
    await expect(hero).toContainText('Compte simulé');
    await expect(hero).not.toContainText('nominal non détenu');
  });

  test('the account identity is never a fixture artefact', async ({ page, tradeAccount }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, tradeAccount);
    // The dashboard, not its skeleton: a capture taken mid-navigation
    // documents the loading state and calls it the user menu.
    await expect(page.getByTestId('account-hero')).toBeVisible();

    /*
     * The identity block moved to the foot of the sidebar in Phase 2, where
     * every reference product puts it. The header keeps a compact one below
     * `md`, under its own id — so this scopes to the desktop control.
     */
    const trigger = page.getByTestId('hub-sidebar').getByTestId('hub-user-menu-trigger');
    /*
     * The seeded account has no profile name, so the avatar must fall all the
     * way down to the silhouette. What it must never do is slice the e-mail
     * — which is where "E2" came from in the Phase 1 captures.
     */
    const label = (await trigger.innerText()).trim();
    expect(label).not.toContain('@');
    expect(label.toLowerCase()).not.toContain(tradeAccount.email.slice(0, 2).toLowerCase());

    await trigger.click();
    await expect(page.getByTestId('hub-user-menu')).toBeVisible();
    // Past the 180ms reveal, so the evidence shows the menu rather than a
    // frame of its animation.
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/hub-09-user-menu.png` });
  });
});

test.describe('@phase11 mobile navigation', () => {
  test('the tab bar is reachable and never covers the page', async ({ page, tradeAccount }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(SIZES.mobile);
    await signIn(page, tradeAccount);
    // The dashboard rather than its skeleton — the shell's navigation exists
    // during loading, so waiting on the nav alone would photograph the
    // placeholder and label it the dashboard.
    await expect(page.getByTestId('account-hero')).toBeVisible();

    const nav = page.getByTestId('hub-mobile-nav');
    await expect(nav).toBeVisible();

    const navBox = await nav.boundingBox();
    expect(navBox).not.toBeNull();
    if (navBox) {
      expect(navBox.height).toBeGreaterThanOrEqual(66);
      expect(navBox.height).toBeLessThanOrEqual(78);
    }

    /*
     * Five items, WariX among them — the desktop sidebar drops it, the phone
     * keeps it. "Plus" is a button rather than a link since Phase 2: it opens
     * a sheet instead of navigating away, so the trader keeps their place.
     */
    const items = nav.locator('a, button');
    await expect(items).toHaveCount(5);
    await expect(nav.getByRole('link')).toHaveCount(4);
    for (let index = 0; index < 5; index += 1) {
      const box = await items.nth(index).boundingBox();
      expect(box).not.toBeNull();
      if (box) expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await expect(nav.getByText('WariX', { exact: true })).toHaveCount(1);

    /*
     * The last row of the page must be able to sit above the fixed bar, which
     * is a statement about reserved space rather than about where the page
     * happens to be scrolled. `main` reserves the bar's height plus the home
     * indicator plus a gap; if that reservation ever falls below the bar's own
     * height, the final control on the dashboard becomes unreachable and
     * nothing else in this suite would notice.
     */
    const reserved = await page
      .getByTestId('hub-main')
      .evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingBottom));
    expect(reserved).toBeGreaterThanOrEqual(navBox?.height ?? 70);

    await page.screenshot({ path: `${OUT}/hub-10-390-bottom-nav.png` });

    await page.setViewportSize(SIZES.small);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/hub-11-320-bottom-nav.png` });
  });
});

test.describe('@phase11 system states', () => {
  test('every system state is a composition, not text on a void', async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(SIZES.desktop);

    for (const [name, path, heading] of [
      ['sys-01-404', '/route-qui-nexiste-pas', 'Page introuvable'],
      ['sys-02-403', '/403', 'Accès non autorisé'],
      ['sys-03-500', '/erreur', 'Un problème est survenu'],
      ['sys-04-offline', '/hors-ligne', 'Connexion interrompue'],
      ['sys-05-maintenance', '/maintenance', 'Maintenance en cours'],
      ['sys-06-session-expired', '/session-expiree', 'Votre session a expiré'],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${OUT}/${name}.png` });
    }

    // Brand ownership on every one of them: whatever failed, the visitor is
    // still inside a product that is minded.
    await page.goto('/403');
    await expect(page.getByText('WARIBA', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Retour au tableau de bord' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contacter le support' })).toBeVisible();

    await page.goto('/route-qui-nexiste-pas');
    await expect(page.getByRole('button', { name: 'Page précédente' })).toBeVisible();
  });

  test('500 shows a safe correlation reference and refuses an unsafe one', async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(SIZES.desktop);

    await page.goto('/erreur?ref=WRB-2026-08-22-14ff');
    await expect(page.getByTestId('system-state-reference')).toHaveText(
      'Référence : WRB-2026-08-22-14ff',
    );
    await page.screenshot({ path: `${OUT}/sys-07-500-reference.png` });

    /*
     * The query string is attacker-controlled. Without the guard, a link could
     * put arbitrary text under the WARIBA mark on an error page — a phishing
     * primitive assembled entirely out of our own 500.
     */
    await page.goto('/erreur?ref=Votre%20compte%20est%20suspendu%20appelez%20le%2000');
    await expect(page.getByTestId('system-state-reference')).toHaveCount(0);
  });

  test('the auth error is compact, semantic and does not shake', async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(SIZES.desktop);
    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill('inconnu@example.com');
    await page.getByLabel('Mot de passe', { exact: true }).fill('MauvaisMotDePasse!1');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    const notice = page.getByTestId('auth-notice');
    await expect(notice).toBeVisible({ timeout: 30_000 });
    await expect(notice).toHaveAttribute('data-tone', 'danger');
    // Says nothing about whether the account exists.
    await expect(notice).toContainText('Adresse e-mail ou mot de passe incorrect.');

    const box = await notice.boundingBox();
    expect(box).not.toBeNull();
    if (box) expect(box.height).toBeLessThanOrEqual(110);

    await page.screenshot({ path: `${OUT}/sys-08-auth-error.png` });
  });

  test('reduced motion removes the reveal as well as the sidebar transition', async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(SIZES.desktop);
    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill('inconnu@example.com');
    await page.getByLabel('Mot de passe', { exact: true }).fill('MauvaisMotDePasse!1');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    const notice = page.getByTestId('auth-notice');
    await expect(notice).toBeVisible({ timeout: 30_000 });
    const animation = await notice.evaluate((node) => getComputedStyle(node).animationName);
    expect(animation).toBe('none');

    await page.screenshot({ path: `${OUT}/sys-09-reduced-motion.png` });
  });
});
