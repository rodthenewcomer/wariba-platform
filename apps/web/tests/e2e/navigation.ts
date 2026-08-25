import { expect } from '@playwright/test';

type Locator = import('@playwright/test').Locator;
type Page = import('@playwright/test').Page;

/**
 * Follows the link once and proves its visible destination.
 *
 * Phase 3.3.3 deliberately removed the old retries and `page.goto` fallback:
 * a critical click that only works after a second attempt is a product defect,
 * and a direct test navigation cannot certify what the operator clicked.
 */
export async function clickThrough(
  page: Page,
  link: Locator,
  urlPattern: string | RegExp,
): Promise<void> {
  const href = await link.getAttribute('href');
  expect(href, 'the link must have a destination').not.toBeNull();

  await link.click();
  await page.waitForURL(urlPattern, { timeout: 10_000 });
}
