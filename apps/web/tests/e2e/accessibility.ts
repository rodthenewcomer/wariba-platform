import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';

type Page = import('@playwright/test').Page;

/**
 * Runs axe against the page as it comes to rest.
 *
 * ## Why the page has to stop moving first
 *
 * axe composites `opacity` into the colour it measures. A surface that fades
 * in — and most WARIBA surfaces do, by design — therefore reports whatever
 * colour it happened to be wearing at the instant of the sample. Two separate
 * suites hit this and both read as palette defects that no palette change
 * could have fixed: `--wariba-color-bone-50`, which measures 14:1 at rest, was
 * reported at 1.26:1; `--wariba-text-tertiary` was reported at 2.05:1 as
 * `#434852`, a value that appears in no token file because it is the token
 * part-way through a fade.
 *
 * A timer would only move the race. These are the two real signals:
 *
 *   `prefers-reduced-motion: reduce`  is the state a reader who asked for no
 *   motion actually gets, and since globals.css zeroes the delays as well as
 *   the durations it is also the resting state, immediately.
 *
 *   `document.fonts.ready` plus `getAnimations()`  is the page saying it has
 *   finished, rather than the test guessing when it might have.
 *
 * A genuine contrast failure still fails: nothing here changes a colour, it
 * only waits until the colour is the one the design specified.
 */
export async function assertAccessible(page: Page, label = 'page'): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await settled(page);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  );
  expect(blocking, `${label}: ${JSON.stringify(blocking, null, 2)}`).toHaveLength(0);
}

/**
 * Fonts loaded and every running animation finished — or the budget spent.
 *
 * Bounded on purpose. `Animation.finished` never resolves for an animation
 * that repeats forever, and a helper whose job is "wait until the page stops
 * moving" must not be able to wait for ever: an unbounded version turned a
 * six-minute suite into a timeout with no failing assertion to point at, which
 * is a worse diagnostic than the flaky measurement it was meant to fix.
 *
 * If the budget is spent the caller still measures — a page that is genuinely
 * still animating after this long has something else wrong with it, and axe's
 * reading is then evidence rather than noise.
 */
export async function settled(page: Page, budgetMs = 1_500): Promise<void> {
  await page.evaluate(async (budget) => {
    const deadline = new Promise((resolve) => setTimeout(resolve, budget));
    await Promise.race([document.fonts.ready, deadline]);
    await Promise.race([
      Promise.all(
        document
          .getAnimations()
          // An animation that repeats for ever has no finish to wait for.
          .filter((animation) => animation.playState !== 'paused')
          .map((animation) => animation.finished.catch(() => undefined)),
      ),
      deadline,
    ]);
  }, budgetMs);
}
