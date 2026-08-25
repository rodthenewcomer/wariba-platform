import { expect } from '@playwright/test';

type Page = import('@playwright/test').Page;

/**
 * Readiness, for pages that are about to be photographed.
 *
 * ## Why a screenshot needs more than a navigation
 *
 * `page.goto` resolves on `load`, and these routes are `force-dynamic` with
 * streamed sections behind skeletons — so the document is "loaded" while the
 * only thing on screen is a promise of what is arriving. Two final evidence
 * shots were taken in exactly that window and showed a skeleton where the
 * product was supposed to be.
 *
 * The wrong fix is a sleep: it moves the race rather than removing it, and it
 * makes every capture slower to hide a problem it has not solved. These helpers
 * wait for the thing being certified to exist — the account's own identifier,
 * its figures, both cards of a relationship — and then assert that no
 * placeholder is left anywhere on the page.
 *
 * A page is not ready because it answered 200. It is ready when the content the
 * evidence is *about* is on screen.
 */
async function noPlaceholders(page: Page, label: string): Promise<void> {
  await expect(page.locator('[data-skeleton]'), `${label}: still showing a skeleton`).toHaveCount(
    0,
  );
}

/** The Hub, showing a Performance account: its identity, its cycle, its figures. */
export async function waitForPerformanceDashboardReady(
  page: Page,
  publicId: string,
): Promise<void> {
  await expect(page.getByTestId('mission-checklist')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('payout-summary')).toBeVisible({ timeout: 30_000 });
  // The account it is actually about, not merely "an account".
  await expect(page.getByText(publicId).first()).toBeVisible({ timeout: 30_000 });
  await noPlaceholders(page, `performance dashboard ${publicId}`);
}

/** The accounts page, showing the parent and the child and the link between them. */
export async function waitForAccountsRelationshipReady(
  page: Page,
  params: { performancePublicId: string; evaluationPublicId: string },
): Promise<void> {
  const cards = page.getByTestId('account-card');
  await expect(cards.first()).toBeVisible({ timeout: 30_000 });
  await expect(cards).toHaveCount(2, { timeout: 30_000 });
  await expect(page.getByText(params.performancePublicId).first()).toBeVisible();
  await expect(page.getByText(params.evaluationPublicId).first()).toBeVisible();
  // The relationship itself, which is what this evidence exists to show.
  await expect(page.getByText(`Issu de ${params.evaluationPublicId}`)).toBeVisible({
    timeout: 30_000,
  });
  await noPlaceholders(page, 'accounts parent/child');
}
