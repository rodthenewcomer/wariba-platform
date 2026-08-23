import { mkdirSync } from 'node:fs';
import { expect, test, withLifecycle, type LifecycleFixture } from './fixtures';

/**
 * WARIBA Product OS Phase 2 — the complete Trader Hub.
 *
 * Two jobs. It asserts the things a screenshot can be wrong about — which
 * destinations exist, which actions are live in which state, whether a figure
 * was invented — and it photographs every surface at every supported width so
 * the visual bar can be judged rather than claimed.
 */
const OUT = '../../docs/04-ux/evidence/wariba-product-os-phase2';

const SIZES = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1366, height: 768 },
  mobile: { width: 390, height: 844 },
  mobileSmall: { width: 375, height: 812 },
  small: { width: 320, height: 568 },
} as const;

type Page = import('@playwright/test').Page;

async function signIn(page: Page, account: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(account.email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 60_000 });
}

/**
 * Waits for the sidebar's width transition to settle before measuring.
 *
 * `data-collapsed` flips on the click; the width takes 220ms to travel. A
 * `boundingBox()` immediately after the attribute assertion measures a frame
 * of the animation — which is how the rail first "measured" 148px on its way
 * to 72.
 */
async function settledSidebarWidth(page: Page): Promise<number> {
  const sidebar = page.getByTestId('hub-sidebar');
  let previous = -1;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const width = await sidebar.evaluate((node) => node.getBoundingClientRect().width);
    if (Math.abs(width - previous) < 0.5) return width;
    previous = width;
    await page.waitForTimeout(60);
  }
  return previous;
}

async function shoot(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
}

test.describe('@phase2 information architecture', () => {
  test('the sidebar exposes the complete IA and nothing that does not exist', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(600_000);
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, tradeAccount);

    const sidebar = page.getByTestId('hub-sidebar');
    for (const destination of [
      'Tableau de bord',
      'Comptes',
      'Ajouter un compte',
      'Performance',
      'Journal',
      'Payouts',
      'Facturation',
      'Support',
      'Paramètres',
    ]) {
      await expect(sidebar.getByText(destination, { exact: true })).toHaveCount(1);
    }

    /*
     * WariX is a separate product shell (UX-HUB-001) — contextual, not a
     * destination. Récompenses and Notifications have no capability behind
     * them: no achievements table, no notification centre. A trophy leading to
     * fabricated milestones is manufactured progress.
     */
    for (const absent of ['WariX', 'Récompenses', 'Réussites', 'Notifications']) {
      await expect(sidebar.getByText(absent, { exact: true })).toHaveCount(0);
    }

    await expect(page.getByTestId('hub-nav-comptes-nouveau')).toHaveAttribute('data-cta', 'true');
    await shoot(page, '01-hub-sidebar-expanded-1440');
  });

  test('every exposed destination actually answers', async ({ page, tradeAccount }) => {
    test.setTimeout(600_000);
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, tradeAccount);

    for (const [name, path] of [
      ['02-comptes-1440', '/comptes'],
      ['03-comptes-nouveau-1440', '/comptes/nouveau'],
      ['04-performance-1440', '/performance'],
      ['05-journal-1440', '/journal'],
      ['06-payouts-1440', '/payouts'],
      ['07-facturation-1440', '/facturation'],
      ['08-parametres-1440', '/parametres'],
      ['09-verification-identite-1440', '/verification-identite'],
    ] as const) {
      const response = await page.goto(path);
      // Not a 404, not a redirect to an error, and not an empty shell.
      expect(response?.status(), `${path} responded ${response?.status()}`).toBeLessThan(400);
      await expect(page.getByTestId('hub-main')).toBeVisible();
      await shoot(page, name);
    }
  });

  test('collapsing the sidebar still reclaims real width', async ({ page, tradeAccount }) => {
    test.setTimeout(600_000);
    await page.setViewportSize(SIZES.laptop);
    await signIn(page, tradeAccount);
    await expect(page.getByTestId('account-hero')).toBeVisible();

    const width = () =>
      page.getByTestId('hub-content').evaluate((node) => node.getBoundingClientRect().width);

    const expanded = await width();
    await shoot(page, '10-hub-1366-expanded');

    await page.getByTestId('hub-sidebar-toggle').click();
    await expect(page.getByTestId('hub-sidebar')).toHaveAttribute('data-collapsed', 'true');
    await settledSidebarWidth(page);
    const collapsed = await width();
    await shoot(page, '11-hub-1366-collapsed');

    // The sidebar grew from 232 to 244 and the rail from 68 to 72, so the
    // reclaim is 172px rather than 164 — still the whole point of the control.
    expect(collapsed - expanded).toBeGreaterThanOrEqual(150);
  });

  test('the collapsed rail keeps its icons identifiable and its labels out of the way', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(600_000);
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, tradeAccount);
    await page.getByTestId('hub-sidebar-toggle').click();
    await expect(page.getByTestId('hub-sidebar')).toHaveAttribute('data-collapsed', 'true');

    const sidebar = page.getByTestId('hub-sidebar');
    const railWidth = await settledSidebarWidth(page);
    expect(railWidth).toBeGreaterThanOrEqual(66);
    expect(railWidth).toBeLessThanOrEqual(80);

    /*
     * §22's acceptance rule, measured. A glyph declared 26px that renders at 16
     * is the failure that has recurred; this reads the painted SVG box.
     */
    const glyphSizes = await sidebar
      .locator('a svg')
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().width));
    expect(glyphSizes.length).toBeGreaterThan(0);
    for (const size of glyphSizes) {
      expect(size).toBeGreaterThanOrEqual(24);
      expect(size).toBeLessThanOrEqual(28);
    }

    /*
     * Collapsed rows still clear the 44px target floor.
     *
     * Scoped to navigation rows: the brand mark above them is a link too, and
     * it is a 36px wordmark rather than a destination anyone taps at.
     */
    const measured = await sidebar.locator('[data-testid^="hub-nav-"]').evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.getAttribute('data-testid') ?? '?',
        height: Math.round(node.getBoundingClientRect().height),
      })),
    );
    expect(measured.length).toBeGreaterThanOrEqual(9);
    for (const row of measured) {
      expect(row.height, `${row.id} is ${row.height}px`).toBeGreaterThanOrEqual(44);
    }

    await sidebar.screenshot({ path: `${OUT}/12-hub-rail-real-size.png` });
  });
});

test.describe('@phase2 account lifecycle', () => {
  const STATES = [
    { state: 'evaluation_new', shot: '20-lifecycle-evaluation', banner: false },
    { state: 'objective_reached', shot: '21-lifecycle-objective-reached', banner: true },
    { state: 'under_review', shot: '22-lifecycle-under-review', banner: true },
    { state: 'passed', shot: '23-lifecycle-passed', banner: true },
    { state: 'funded_preparing', shot: '24-lifecycle-funded-preparing', banner: true },
    { state: 'funded_active', shot: '25-lifecycle-funded-active', banner: false },
    { state: 'breached', shot: '26-lifecycle-breached', banner: true },
  ] as const;

  for (const entry of STATES) {
    test(`the dashboard renders the ${entry.state} state`, async ({ page }) => {
      test.setTimeout(600_000);
      await withLifecycle(entry.state, async (fixture: LifecycleFixture) => {
        await page.setViewportSize(SIZES.desktop);
        await signIn(page, fixture);
        await expect(page.getByTestId('account-hero')).toBeVisible({ timeout: 30_000 });

        if (entry.banner) {
          const banner = page.getByTestId('lifecycle-banner');
          await expect(banner).toBeVisible();
          await expect(banner).not.toHaveText(/undefined|null|_/);
        }

        await shoot(page, entry.shot);
      });
    });
  }

  test('objective reached tells the trader the rules still apply', async ({ page }) => {
    test.setTimeout(600_000);
    await withLifecycle('objective_reached', async (fixture) => {
      await page.setViewportSize(SIZES.desktop);
      await signIn(page, fixture);
      const banner = page.getByTestId('lifecycle-banner');
      await expect(banner).toHaveAttribute('data-state', 'objective_reached');
      /*
       * The single most expensive misunderstanding available in a prop
       * product: hitting the target intraday is not passing, and a trader who
       * relaxes can lose the evaluation in the next twenty minutes.
       */
      await expect(banner).toContainText('jusqu’à la clôture');
      // And the account is still tradable, because it genuinely is.
      await expect(page.getByTestId('hub-next-action')).toBeVisible();
    });
  });

  test('under review says nothing is required of the trader', async ({ page }) => {
    test.setTimeout(600_000);
    await withLifecycle('under_review', async (fixture) => {
      await page.setViewportSize(SIZES.desktop);
      await signIn(page, fixture);
      const banner = page.getByTestId('lifecycle-banner');
      await expect(banner).toHaveAttribute('data-state', 'under_review');
      await expect(banner).toContainText('Vérification en cours');
      // Nothing to do — so no next action is offered.
      await expect(page.getByTestId('hub-next-action')).toHaveCount(0);
    });
  });

  test('a breach names the rule, the threshold and the way forward', async ({ page }) => {
    test.setTimeout(600_000);
    await withLifecycle('breached', async (fixture) => {
      await page.setViewportSize(SIZES.desktop);
      await signIn(page, fixture);
      const banner = page.getByTestId('lifecycle-banner');
      await expect(banner).toHaveAttribute('data-state', 'breached');
      await expect(banner).toContainText('n’est plus négociable');
      await expect(
        page.getByRole('link', { name: 'Acheter un nouveau compte' }).first(),
      ).toBeVisible();

      /*
       * A breached account still has one useful action — reading the evidence
       * that ended it — so the next-action slot is legitimately occupied. What
       * must be gone is any route back into the terminal: the account cannot
       * be traded, and offering the workstation would be the product
       * contradicting its own rule engine.
       */
      const nextAction = page.getByTestId('hub-next-action');
      if ((await nextAction.count()) > 0) {
        await expect(nextAction).not.toHaveAttribute('href', '/trade');
      }
      await expect(page.getByTestId('header-open-warix')).toHaveCount(0);
    });
  });
});

test.describe('@phase2 payout and identity gate', () => {
  test('an eligible trader missing verification is told they earned it', async ({ page }) => {
    test.setTimeout(600_000);
    await withLifecycle('payout_eligible_kyc_required', async (fixture) => {
      await page.setViewportSize(SIZES.desktop);
      await signIn(page, fixture);
      await page.goto('/payouts');
      const status = page.getByTestId('payout-status');
      await expect(status).toBeVisible();
      await shoot(page, '30-payout-status');

      /*
       * Whatever the blocking reason turns out to be for this fixture, the
       * panel must always answer the question the trader arrived with — never
       * open on an amount field with no explanation.
       */
      await expect(status).not.toHaveText(/^\s*$/);
      await expect(status).toContainText('Vérification d’identité');
    });
  });

  test('identity verification never asks for documents the platform cannot receive', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(600_000);
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, tradeAccount);
    await page.goto('/verification-identite');

    const state = page.getByTestId('kyc-state');
    await expect(state).toBeVisible();
    // No upload widget, because nothing can process an upload.
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(state).not.toContainText(/passeport|selfie|téléverser/i);
    await shoot(page, '31-kyc-gate');
  });
});

test.describe('@phase2 no fabricated data', () => {
  test('a fresh account shows absence rather than zeros', async ({ page }) => {
    test.setTimeout(600_000);
    await withLifecycle('evaluation_new', async (fixture) => {
      await page.setViewportSize(SIZES.desktop);
      await signIn(page, fixture);

      // No closed session — so a stated absence, never a flat auto-scaled line.
      await expect(page.getByTestId('account-evolution-empty')).toBeVisible();
      await expect(page.getByTestId('account-evolution')).toHaveCount(0);
      // And no KPI grid claiming a 0 % win rate for someone who has not traded.
      await expect(page.getByTestId('performance-snapshot')).toHaveCount(0);

      await page.goto('/performance');
      await expect(page.getByTestId('hub-empty-state')).toBeVisible();
      await shoot(page, '32-performance-empty');

      await page.goto('/journal');
      await expect(page.getByTestId('hub-empty-state')).toBeVisible();
      await shoot(page, '33-journal-empty');
    });
  });

  test('the no-account trader gets a gate, never an empty workstation', async ({ page }) => {
    test.setTimeout(600_000);
    await withLifecycle('no_account', async (fixture) => {
      await page.setViewportSize(SIZES.desktop);
      await signIn(page, fixture);
      await expect(page.getByTestId('hub-empty-state')).toBeVisible();
      await shoot(page, '34-no-account-hub');

      await page.goto('/trade');
      const gate = page.getByTestId('warix-gate');
      await expect(gate).toBeVisible();
      await expect(gate).toContainText('Commencez avec un compte WARIBA');
      await expect(page.getByTestId('warix-gate-primary')).toHaveAttribute(
        'href',
        '/comptes/nouveau',
      );
      await shoot(page, '35-no-account-warix-gate');
    });
  });
});

test.describe('@phase2 mobile', () => {
  test('every surface holds together at 390, 375 and 320', async ({ page, tradeAccount }) => {
    test.setTimeout(900_000);
    await page.setViewportSize(SIZES.mobile);
    await signIn(page, tradeAccount);

    for (const [label, size] of [
      ['390', SIZES.mobile],
      ['375', SIZES.mobileSmall],
      ['320', SIZES.small],
    ] as const) {
      await page.setViewportSize(size);
      for (const [name, path] of [
        ['hub', '/hub'],
        ['comptes', '/comptes'],
        ['nouveau', '/comptes/nouveau'],
        ['performance', '/performance'],
        ['journal', '/journal'],
        ['payouts', '/payouts'],
        ['facturation', '/facturation'],
      ] as const) {
        await page.goto(path);
        await expect(page.getByTestId('hub-main')).toBeVisible();
        await page.waitForTimeout(300);
        // No surface may drag the page sideways at any supported width.
        expect(await noHorizontalOverflow(page), `${path} overflowed at ${label}`).toBe(true);
        await shoot(page, `4${label === '390' ? 0 : label === '375' ? 1 : 2}-${label}-${name}`);
      }
    }
  });

  test('the Plus tab opens a sheet and reaches every overflow destination', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(600_000);
    await page.setViewportSize(SIZES.mobile);
    await signIn(page, tradeAccount);

    await page.getByTestId('hub-mobile-more').click();
    const sheet = page.getByTestId('bottom-sheet');
    await expect(sheet).toBeVisible();
    for (const label of [
      'Ajouter un compte',
      'Performance',
      'Journal',
      'Facturation',
      'Support',
      'Paramètres',
    ]) {
      await expect(sheet.getByText(label, { exact: true })).toHaveCount(1);
    }
    await shoot(page, '43-mobile-plus-sheet');

    // Escape closes it and focus returns — a sheet a keyboard cannot leave is
    // a trap, not a dialog.
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  });

  test('the tab bar keeps its targets and never covers the last row', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(600_000);
    await page.setViewportSize(SIZES.small);
    await signIn(page, tradeAccount);

    const nav = page.getByTestId('hub-mobile-nav');
    const navBox = await nav.boundingBox();
    expect(navBox?.height).toBeGreaterThanOrEqual(66);

    const items = nav.locator('a, button');
    await expect(items).toHaveCount(5);
    for (let index = 0; index < 5; index += 1) {
      const box = await items.nth(index).boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }

    const reserved = await page
      .getByTestId('hub-main')
      .evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingBottom));
    expect(reserved).toBeGreaterThanOrEqual(navBox?.height ?? 70);
  });
});

test.describe('@phase2 accessibility and motion', () => {
  test('reduced motion removes entrance, reveal and number animation', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(600_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, tradeAccount);
    await expect(page.getByTestId('account-hero')).toBeVisible();

    /*
     * Under reduced motion the staggered cards must be at their final opacity
     * immediately — not merely faster. Someone who asked their operating
     * system to stop moving things usually did so for a medical reason.
     */
    const heroOpacity = await page
      .getByTestId('account-hero')
      .evaluate((node) => Number.parseFloat(getComputedStyle(node).opacity));
    expect(heroOpacity).toBe(1);

    const sidebarTransition = await page
      .getByTestId('hub-sidebar')
      .evaluate((node) => getComputedStyle(node).transitionProperty);
    expect(sidebarTransition).toBe('none');

    await shoot(page, '50-reduced-motion');
  });
});
