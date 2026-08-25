import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const OUT = resolve(process.cwd(), '../../docs/04-ux/evidence/wariba-help-p0-visual-clarity');

const VISUALS = [
  ['HLP-VIS-001', '/aide/risque-regles/dll-vs-perte-maximale'],
  ['HLP-VIS-002', '/aide/risque-regles/trailing-eod'],
  ['HLP-VIS-003', '/aide/wariba-one/perte-quotidienne'],
  ['HLP-VIS-004', '/aide/wariba-one/meilleur-jour'],
  ['HLP-VIS-005', '/aide/wariba-one/profit-court-terme'],
  ['HLP-VIS-006', '/aide/wariba-one/objectif-atteint'],
  ['HLP-VIS-008', '/aide/commencer/parcours-one-performance-review'],
  ['HLP-VIS-009', '/aide/performance/buffer-permanent'],
  ['HLP-VIS-010', '/aide/performance/performance-days'],
  ['HLP-VIS-011', '/aide/payouts/eligibilite-payout'],
  ['HLP-VIS-012', '/aide/performance/split-des-payouts'],
  ['HLP-VIS-013', '/aide/performance/apres-cinquieme-payout'],
  ['HLP-VIS-014', '/aide/payouts/statuts-payout'],
  ['HLP-VIS-015', '/aide/risque-regles/ordre-refuse'],
  ['HLP-SCR-001', '/aide/warix/placer-un-ordre'],
  ['HLP-SCR-002', '/aide/warix/stop-loss-take-profit'],
  ['HLP-SCR-003', '/aide/warix/reduire-cloturer-close-all'],
  ['HLP-SCR-004', '/aide/warix/decouvrir-warix'],
  ['HLP-SCR-005', '/aide/risque-regles/lire-preuve-breach'],
  ['HLP-SCR-006', '/aide/support/ouvrir-une-contestation'],
  ['HLP-SCR-007', '/aide/support/creer-et-suivre-un-ticket'],
  ['HLP-VIS-016', '/aide/support/statuts-ticket-contestation'],
  ['HLP-VIS-017', '/aide/risque-regles/permissions-de-trading'],
  ['HLP-VIS-018', '/aide/wariba-one/objectif-atteint'],
  ['HLP-VIS-019', '/aide/wariba-one/regles-essentielles'],
] as const;

const CRITICAL = new Map<string, string>([
  ['HLP-VIS-001', 'daily-vs-maximum-loss'],
  ['HLP-VIS-002', 'maximum-loss-trailing'],
  ['HLP-VIS-009', 'payout-buffer'],
  ['HLP-VIS-004', 'best-day'],
  ['HLP-VIS-005', 'profit-eligibility'],
  ['HLP-VIS-015', 'order-refusal'],
  ['HLP-VIS-011', 'payout-eligibility'],
]);

const MODIFIED = new Set([
  'HLP-VIS-001',
  'HLP-VIS-002',
  'HLP-VIS-004',
  'HLP-VIS-009',
  'HLP-VIS-010',
  'HLP-VIS-012',
  'HLP-VIS-013',
  'HLP-SCR-001',
  'HLP-SCR-004',
]);

const FORBIDDEN_PUBLIC_JARGON =
  /\b(?:policy|EOD|DLL|MLL|soft lock|hard breach|server|server-side|snapshot|projection|ledger|authoritative|risk engine|state machine|enum|webhook|correlation ID)\b/i;

type Page = import('@playwright/test').Page;

async function openVisual(page: Page, id: string, path: string) {
  await page.goto(path);
  await page.addStyleTag({
    content: 'nextjs-portal,[data-wariba-section="public"]>header{display:none!important}',
  });
  const visual = page.locator(`[data-help-visual="${id}"]`);
  await expect(visual).toBeVisible();
  await expect(visual).not.toContainText('{{fact:');
  const images = visual.locator('img');
  for (let index = 0; index < (await images.count()); index += 1) {
    const image = images.nth(index);
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('complete', true);
    expect(
      await image.evaluate(async (node) => {
        const htmlImage = node as HTMLImageElement;
        await htmlImage.decode();
        return htmlImage.naturalWidth;
      }),
    ).toBeGreaterThan(0);
  }
  return visual;
}

/**
 * Waits for the page to stop changing, rather than for a number of
 * milliseconds to elapse.
 *
 * Fonts and running animations both alter what a contrast checker measures, so
 * "wait 250 ms and hope" is a race that passes on a fast machine and fails on a
 * loaded one. `document.fonts.ready` and `getAnimations()` are the real state.
 */
async function settled(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

async function assertMobileReadable(page: Page, id: string) {
  const visual = page.locator(`[data-help-visual="${id}"]`);
  const viewport = page.viewportSize();
  const box = await visual.boundingBox();
  expect(box, `${id} must have a box`).not.toBeNull();
  expect(box?.x ?? -1, `${id} starts outside the viewport`).toBeGreaterThanOrEqual(0);
  expect(
    (box?.x ?? 0) + (box?.width ?? 0),
    `${id} extends outside the ${viewport?.width}px viewport`,
  ).toBeLessThanOrEqual((viewport?.width ?? 0) + 0.5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
    `${id} creates horizontal page overflow at ${viewport?.width}px`,
  ).toBe(true);

  const microscopic = await visual.evaluate((root) =>
    [...root.querySelectorAll<HTMLElement>('*')]
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (node.textContent?.trim().length ?? 0) > 0;
      })
      .filter((node) => Number.parseFloat(getComputedStyle(node).fontSize) < 11)
      .map((node) => `${node.tagName}:${node.textContent?.trim().slice(0, 40)}`),
  );
  expect(microscopic, `${id} contains text smaller than 11px`).toEqual([]);
}

test.describe('@help @help-p0-clarity preuves de clôture visuelle', () => {
  test('capture les 25 visuels et valide 320, 375, 390 et 430 px', async ({ page }) => {
    test.setTimeout(600_000);
    for (const folder of ['raw/desktop', 'raw/mobile', 'critical']) {
      mkdirSync(resolve(OUT, folder), { recursive: true });
    }

    for (const [id, path] of VISUALS) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const desktop = await openVisual(page, id, path);
      const publicText = await desktop.innerText();
      expect(publicText, `${id} exposes internal jargon`).not.toMatch(FORBIDDEN_PUBLIC_JARGON);
      const desktopPath = resolve(OUT, 'raw/desktop', `${id}.png`);
      await desktop.screenshot({ path: desktopPath, animations: 'disabled' });

      await page.setViewportSize({ width: 390, height: 1000 });
      const mobile = await openVisual(page, id, path);
      await assertMobileReadable(page, id);
      const mobilePath = resolve(OUT, 'raw/mobile', `${id}.png`);
      await mobile.screenshot({ path: mobilePath, animations: 'disabled' });

      const criticalName = CRITICAL.get(id);
      if (criticalName) {
        copyFileSync(desktopPath, resolve(OUT, 'critical', `${criticalName}-1440.png`));
        copyFileSync(mobilePath, resolve(OUT, 'critical', `${criticalName}-390.png`));
      }

      for (const width of [320, 375, 430]) {
        await page.setViewportSize({ width, height: 1000 });
        const small = await openVisual(page, id, path);
        await assertMobileReadable(page, id);
        if (width === 320 && criticalName) {
          await small.screenshot({
            path: resolve(OUT, 'critical', `${criticalName}-320.png`),
            animations: 'disabled',
          });
        }
      }
    }
  });

  test('axe passe sur chaque page modifiée et reduced motion conserve le sens', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 390, height: 1000 });

    /*
     * Reduced motion first, and for the whole run.
     *
     * These visuals enter on a staggered fade. axe composites `opacity` into
     * the colour it measures, so sampling the page mid-fade reports the
     * *transition* rather than the design: `--wariba-color-bone-50` (14:1 at
     * rest) was read as `#363940` and failed at 1.56:1. That is not a palette
     * defect and no token change could have fixed it.
     *
     * `reducedMotion: 'reduce'` is also the honest thing to assert against: it
     * is the state a reader who asked for no motion actually gets, and after
     * the delay fix in globals.css it is the resting state immediately, with
     * nothing left to settle. Waiting on a timer instead would only move the
     * race, not remove it.
     */
    await page.emulateMedia({ reducedMotion: 'reduce' });

    for (const [id, path] of VISUALS.filter(([candidate]) => MODIFIED.has(candidate))) {
      await openVisual(page, id, path);
      await settled(page);
      const accessibility = await new AxeBuilder({ page }).analyze();
      const blocking = accessibility.violations.filter(
        (violation) => violation.impact === 'critical' || violation.impact === 'serious',
      );
      expect(blocking, `${id}: ${JSON.stringify(blocking, null, 2)}`).toHaveLength(0);
    }

    await openVisual(page, 'HLP-VIS-002', '/aide/risque-regles/trailing-eod');
    const animated = page.locator('.help-visual .help-visual-node').first();
    const motion = await animated.evaluate((node) => {
      const style = getComputedStyle(node);
      return { duration: style.animationDuration, delay: style.animationDelay };
    });
    expect(motion.duration).toBe('0.001s');
    // The delay is half the contract: a 275 ms wait on an element held at
    // `opacity: 0` by `animation-fill-mode: both` is motion by another name.
    expect(motion.delay).toBe('0s');
    await expect(page.getByText('Il ne redescend plus')).toBeVisible();
  });
});
