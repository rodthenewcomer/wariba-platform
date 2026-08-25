import { expect } from '@playwright/test';

type Locator = import('@playwright/test').Locator;
type Page = import('@playwright/test').Page;

/**
 * Follows a client-side link, and survives the route being rendered for the
 * first time.
 *
 * ## The failure this absorbs, and why it is not a product defect
 *
 * A production server renders each dynamic route for the first time on the
 * first request that reaches it. Next's client router fetches the RSC payload
 * for a soft navigation and gives up if that first render takes too long — the
 * request shows as `net::ERR_ABORTED` and the URL simply never changes. In a
 * test campaign against a server that started seconds ago, *every* route is
 * cold, so the first click into each one can lose this race.
 *
 * It was worth proving rather than assuming. Clicking the same link twice
 * shows the failure following the *order* of the clicks and not the browser
 * context: the first click into a cold route does nothing, the second — into
 * the now-warm route — navigates. A fresh context clicking first fails; the
 * reused page clicking second succeeds. That is a cold-start race, not an
 * authorization bug, not a broken link, and not a session problem.
 *
 * So this retries the click rather than replacing it with `page.goto`. The
 * assertion stays honest — the link must actually lead to that URL — while a
 * cold first render costs a second attempt instead of a false failure. A link
 * that is genuinely broken still fails, it just takes the full budget to say
 * so.
 */
export async function clickThrough(
  page: Page,
  link: Locator,
  urlPattern: string | RegExp,
): Promise<void> {
  const origin = page.url();
  let attempt = 0;
  await expect(async () => {
    attempt += 1;
    /*
     * Reload before retrying, rather than clicking again.
     *
     * A soft navigation that loses this race leaves the router unable to make
     * the next one either — clicking the same link a second time in the same
     * document does nothing at all, which is why a bare retry loop burns its
     * whole budget and still reports a timeout. Only a fresh document gets a
     * fresh router, and by then the route is warm.
     */
    if (attempt > 1) await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await link.click();
    await page.waitForURL(urlPattern, { timeout: 15_000 });
  }).toPass({ timeout: 90_000, intervals: [500, 1_000, 2_000] });
}
