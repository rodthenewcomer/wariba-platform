import { expect, test } from '@playwright/test';
import { ensureFlexActivationObligation } from '@wariba/application';
import { assertAccessible } from './accessibility';
import { createFixtureDb } from './fixtures';
import { STORAGE_STATE_FILE } from './global-setup';

test.use({ storageState: STORAGE_STATE_FILE });

async function deleteAccountFixtureRows(
  db: ReturnType<typeof createFixtureDb>,
  accountId: string,
): Promise<void> {
  await db.deleteFrom('app.performance_cycles').where('account_id', '=', accountId).execute();
  await db
    .deleteFrom('app.account_state_transitions')
    .where('account_id', '=', accountId)
    .execute();
  await db.deleteFrom('app.trading_ledger_entries').where('account_id', '=', accountId).execute();
  await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', accountId).execute();
  await db.deleteFrom('app.trading_accounts').where('id', '=', accountId).execute();
}

async function deleteOrderFixtureRows(
  db: ReturnType<typeof createFixtureDb>,
  orderId: string,
): Promise<void> {
  await db.deleteFrom('app.receipts').where('purchase_order_id', '=', orderId).execute();
  await db.deleteFrom('app.payment_events').where('purchase_order_id', '=', orderId).execute();
  await db.deleteFrom('app.payment_attempts').where('purchase_order_id', '=', orderId).execute();
  await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', orderId).execute();
  await db.deleteFrom('app.purchase_orders').where('id', '=', orderId).execute();
}

async function deleteCommerceOrderFixture(
  db: ReturnType<typeof createFixtureDb>,
  orderId: string,
): Promise<void> {
  const evaluation = await db
    .selectFrom('app.trading_accounts')
    .select('id')
    .where('source_purchase_order_id', '=', orderId)
    .executeTakeFirst();
  const obligation = evaluation
    ? await db
        .selectFrom('app.flex_activation_obligations')
        .select(['id', 'activation_order_id'])
        .where('evaluation_account_id', '=', evaluation.id)
        .executeTakeFirst()
    : undefined;
  const performance = evaluation
    ? await db
        .selectFrom('app.trading_accounts')
        .select('id')
        .where('source_evaluation_account_id', '=', evaluation.id)
        .executeTakeFirst()
    : undefined;

  if (obligation) {
    await db
      .deleteFrom('app.flex_activation_obligations')
      .where('id', '=', obligation.id)
      .execute();
    await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', obligation.id).execute();
  }

  if (performance) await deleteAccountFixtureRows(db, performance.id);
  // The activation order points to the Evaluation account, so it must be
  // removed before the parent account. The initial order is the inverse: the
  // Evaluation points to it, so it is removed last.
  if (obligation) await deleteOrderFixtureRows(db, obligation.activation_order_id);
  if (evaluation) await deleteAccountFixtureRows(db, evaluation.id);
  await deleteOrderFixtureRows(db, orderId);
}

test.describe('Commerce V2 définitif', { tag: ['@commerce'] }, () => {
  test('publie exactement 15 offres V2 sans ouvrir les gates publiques', async ({ page }) => {
    const response = await page.request.get('/api/v1/products');
    expect(response.ok()).toBe(true);
    const payload = (await response.json()) as {
      data: Array<{
        offerId: string;
        purchaseEnabled: boolean;
        activationEnabled: boolean;
      }>;
    };

    expect(payload.data).toHaveLength(15);
    expect(new Set(payload.data.map((offer) => offer.offerId)).size).toBe(15);
    expect(payload.data.every((offer) => !offer.purchaseEnabled && !offer.activationEnabled)).toBe(
      true,
    );

    /*
     * `/programme` explains the journey; it no longer redirects.
     *
     * The redirect was introduced so a stale V1 rules table could not compete
     * with the canonical catalogue, and that invariant still holds — but it
     * also left the "how it works" entry point pointing at a price list, and a
     * redirect-only page without `force-dynamic` broke the production build by
     * being prerendered. The page is back, reading the same canonical offers
     * the catalogue reads.
     *
     * So the assertion moves from "this URL goes somewhere else" to the thing
     * that actually mattered: the figures on it are the published ones, not
     * literals. 8 % is WARIBA ONE's current target — if a policy version
     * changes it and this page keeps saying 8 %, this test fails, which is the
     * whole point.
     */
    await page.goto('/programme');
    await expect(page).toHaveURL(/\/programme$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Comprendre avant de payer',
    );
    const publishedTarget = payload.data.find((offer) => offer.offerId === 'ONE-10');
    expect(publishedTarget).toBeDefined();
    await expect(page.getByText('Objectif de performance · WARIBA ONE')).toBeVisible();

    await page.goto('/offres?offre=FLEX-25&utm_source=e2e&utm_campaign=phase-3-4-5');
    await expect(page.getByTestId('v2-offer-configurator')).toHaveAttribute(
      'data-offer-id',
      'FLEX-25',
    );
    await expect(page.getByText('24 900 FCFA').first()).toBeVisible();
    await expect(page.getByText('109 900 FCFA').first()).toBeVisible();
    await expect(page.getByText('134 800 FCFA').first()).toBeVisible();
    /*
     * Wait for hydration, not for a click to happen to land.
     *
     * The previous version clicked and treated that as proof the island was
     * live. It is not: every control is server-rendered and enabled, so
     * Playwright's auto-wait passes and a click before React attaches is
     * swallowed silently — after which the keyboard assertion fails for a
     * reason the trace cannot show. On a cold compile this failed reliably.
     */
    const configurator = page.getByTestId('v2-offer-configurator');
    await expect(configurator).toHaveAttribute('data-hydrated', 'true');

    const flexRadio = page.getByRole('radio', { name: /FLEX/ });
    await flexRadio.click();
    await flexRadio.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('v2-offer-configurator')).toHaveAttribute(
      'data-offer-id',
      'INSTANT-25',
    );
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('v2-offer-configurator')).toHaveAttribute(
      'data-offer-id',
      'FLEX-25',
    );
    await assertAccessible(page, 'catalogue V2 FLEX-25');
  });

  test(
    'refus puis retry conserve la même commande et provisionne INSTANT directement en Performance @mobile',
    { tag: ['@critical'] },
    async ({ page }) => {
      const db = createFixtureDb();
      let orderId: string | null = null;
      try {
        await page.setViewportSize({ width: 320, height: 800 });
        await page.goto('/checkout?offer=INSTANT-5');

        await expect(page.getByText('WARIBA INSTANT · 5K')).toBeVisible();
        await expect(page.getByText('Départ').locator('..')).toContainText('Performance');
        await expect(page.getByTestId('hub-header')).toHaveCount(0);
        await expect(page.getByTestId('checkout-submit-mobile')).toBeVisible();
        await assertAccessible(page, 'checkout INSTANT-5 à 320 px');

        const disclosureConsent = page.getByRole('checkbox', {
          name: /J’accepte la divulgation/,
        });
        await disclosureConsent.focus();
        await page.keyboard.press('Space');
        await expect(disclosureConsent).toBeChecked();
        const mobileSubmit = page.getByTestId('checkout-submit-mobile');
        await mobileSubmit.focus();
        await expect(mobileSubmit).toBeFocused();
        await page.keyboard.press('Enter');
        await page.waitForURL(/\/checkout\/sandbox-pay/);

        orderId = new URL(page.url()).searchParams.get('order');
        expect(orderId).toMatch(/^[0-9a-f-]{36}$/);

        await page.getByRole('button', { name: 'Simuler un refus' }).click();
        await expect(
          page.locator('[role="alert"]').filter({ hasText: 'Aucun compte n’a été créé' }),
        ).toBeVisible();
        await page.getByRole('button', { name: 'Réessayer la même commande' }).click();
        await expect(page.getByRole('button', { name: 'Simuler la réussite' })).toBeVisible();
        expect(new URL(page.url()).searchParams.get('order')).toBe(orderId);

        await page.getByRole('button', { name: 'Simuler la réussite' }).click();
        await page.waitForURL(new RegExp(`/bienvenue\\?order=${orderId}$`));
        const welcomeAccount = page.getByText(/WARIBA INSTANT Performance/);
        await expect(welcomeAccount).toBeVisible();
        await expect(welcomeAccount).toContainText(/5\s*000 USD/);

        const [attempts, accounts] = await Promise.all([
          db
            .selectFrom('app.payment_attempts')
            .select(({ fn }) => fn.countAll<number>().as('count'))
            .where('purchase_order_id', '=', orderId as string)
            .executeTakeFirstOrThrow(),
          db
            .selectFrom('app.trading_accounts')
            .select(['program_type', 'product_family', 'nominal_balance'])
            .where('source_purchase_order_id', '=', orderId as string)
            .execute(),
        ]);

        expect(Number(attempts.count)).toBe(1);
        expect(accounts).toHaveLength(1);
        expect(accounts[0]).toMatchObject({
          program_type: 'WARIBA_PERFORMANCE',
          product_family: 'WARIBA_INSTANT',
          nominal_balance: '5000.00',
        });
      } finally {
        if (orderId) await deleteCommerceOrderFixture(db, orderId);
        await db.destroy();
      }
    },
  );

  test(
    'FLEX conserve le prix initial puis active exactement un compte Performance @mobile',
    { tag: ['@critical'] },
    async ({ page }) => {
      const db = createFixtureDb();
      let initialOrderId: string | null = null;
      try {
        await page.setViewportSize({ width: 320, height: 800 });
        await page.goto('/checkout?offer=FLEX-10');
        await expect(page.getByText('WARIBA FLEX · 10K')).toBeVisible();
        await page.getByRole('checkbox', { name: /J’accepte la divulgation/ }).check();
        await page.getByTestId('checkout-submit-mobile').click();
        await page.waitForURL(/\/checkout\/sandbox-pay/);
        initialOrderId = new URL(page.url()).searchParams.get('order');
        expect(initialOrderId).toMatch(/^[0-9a-f-]{36}$/);

        await page.getByRole('button', { name: 'Simuler la réussite' }).click();
        await page.waitForURL(new RegExp(`/bienvenue\\?order=${initialOrderId}$`));
        await expect(page.getByText(/WARIBA FLEX Evaluation/)).toBeVisible();

        const evaluation = await db
          .selectFrom('app.trading_accounts')
          .select('id')
          .where('source_purchase_order_id', '=', initialOrderId as string)
          .executeTakeFirstOrThrow();
        await db
          .updateTable('app.trading_accounts')
          .set({ status: 'passed' })
          .where('id', '=', evaluation.id)
          .execute();
        const activation = await ensureFlexActivationObligation(db, {
          evaluationAccountId: evaluation.id,
          now: new Date(),
        });
        const retryActivation = await ensureFlexActivationObligation(db, {
          evaluationAccountId: evaluation.id,
          now: new Date(),
        });
        expect(retryActivation).toMatchObject({
          activationOrderId: activation.activationOrderId,
          obligationId: activation.obligationId,
          alreadyExisted: true,
        });

        await page.goto(`/checkout?activation=${activation.activationOrderId}`);
        await expect(page.getByRole('heading', { level: 1 })).toContainText(
          'Votre Evaluation est réussie',
        );
        await expect(page.getByText(/figé lors de votre achat initial/)).toBeVisible();
        await page.getByRole('checkbox', { name: /J’accepte la divulgation/ }).check();
        await page.getByTestId('checkout-submit-mobile').click();
        await page.waitForURL(/\/checkout\/sandbox-pay/);
        expect(new URL(page.url()).searchParams.get('order')).toBe(activation.activationOrderId);
        await page.getByRole('button', { name: 'Simuler la réussite' }).click();
        await page.waitForURL(new RegExp(`/bienvenue\\?order=${activation.activationOrderId}$`));
        await expect(page.getByText(/WARIBA FLEX Performance/)).toBeVisible();

        const duplicateOk = await page.evaluate(async (activationOrderId) => {
          const response = await fetch('/api/v1/checkout/sandbox-pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: activationOrderId, outcome: 'confirmed' }),
          });
          return response.ok;
        }, activation.activationOrderId);
        expect(duplicateOk).toBe(true);

        const [sourceOrder, activationOrder, children, obligation] = await Promise.all([
          db
            .selectFrom('app.purchase_orders')
            .select('activation_price_snapshot')
            .where('id', '=', initialOrderId as string)
            .executeTakeFirstOrThrow(),
          db
            .selectFrom('app.purchase_orders')
            .select(['total_amount', 'activation_price_snapshot'])
            .where('id', '=', activation.activationOrderId)
            .executeTakeFirstOrThrow(),
          db
            .selectFrom('app.trading_accounts')
            .select(['program_type', 'product_family'])
            .where('source_evaluation_account_id', '=', evaluation.id)
            .execute(),
          db
            .selectFrom('app.flex_activation_obligations')
            .select(['status', 'amount_snapshot'])
            .where('id', '=', activation.obligationId)
            .executeTakeFirstOrThrow(),
        ]);
        expect(activationOrder.total_amount).toBe(sourceOrder.activation_price_snapshot);
        expect(activationOrder.activation_price_snapshot).toBe(
          sourceOrder.activation_price_snapshot,
        );
        expect(children).toEqual([
          { program_type: 'WARIBA_PERFORMANCE', product_family: 'WARIBA_FLEX' },
        ]);
        expect(obligation).toEqual({
          status: 'fulfilled',
          amount_snapshot: sourceOrder.activation_price_snapshot,
        });
      } finally {
        if (initialOrderId) await deleteCommerceOrderFixture(db, initialOrderId);
        await db.destroy();
      }
    },
  );
});
