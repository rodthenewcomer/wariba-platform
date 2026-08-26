import { expect, test } from '@playwright/test';
import {
  acknowledgePerformanceRules,
  activatePerformanceAccountInTransaction,
  assertLifecycleOrder,
  assertUntradedPerformanceAccount,
  createStaffFixtureDb,
  deleteLifecycleFixture,
  seedLifecycleFixture,
  type Db,
  type LifecycleFixture,
  type PerformanceReadyFacts,
} from '@wariba/test-utils';
import { randomUUID } from 'node:crypto';
import { lifecycleEnv } from './fixtures';
import { SessionPool } from './sessions';

/**
 * Financial truth, asserted against the state the platform actually holds.
 *
 * ## Why these assertions and not others
 *
 * A brand-new Performance account was rendered as 91 % complete for as long as
 * the product existed, past every screenshot campaign and every human review,
 * because `10 000 / 11 000` looks like progress and nothing was measuring
 * whether it *was* progress. Screenshots cannot catch that; a person reading
 * one cannot reliably catch it either. Only an assertion that starts from the
 * canonical figures — buffer built, days completed, amount available — and then
 * looks at what the screen says can.
 *
 * So every test here reads the fixture's own numbers first, then asserts the UI
 * agrees. None of them hardcodes a policy value: if the published Performance
 * policy changes its buffer rate tomorrow, these still hold.
 */
test.describe('@critical @handoff vérité produit du passage Evaluation → Performance', () => {
  let db: Db;
  let sessions: SessionPool;
  let owner: LifecycleFixture;
  let facts: PerformanceReadyFacts;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    db = createStaffFixtureDb();
    sessions = new SessionPool();

    owner = await seedLifecycleFixture(lifecycleEnv(), 'passed');
    const evaluationAccountId = owner.accountId as string;

    /*
     * The causal chain, written in the order it happens.
     *
     * The objective is reached during a session, the day it belonged to closes,
     * and only that finalization produces `passed` (ONE-026). Writing them a
     * second apart rather than all at `now()` is what makes the ordering
     * assertion below meaningful instead of vacuous.
     */
    const base = Date.now() - 10_000;
    await db
      .insertInto('app.account_state_transitions')
      .values([
        {
          account_id: evaluationAccountId,
          from_status: 'active',
          to_status: 'pass_pending',
          reason: 'profit_target_reached',
          occurred_at: new Date(base),
        },
        {
          account_id: evaluationAccountId,
          from_status: 'pass_pending',
          to_status: 'passed',
          reason: 'evaluation_pass_finalized',
          occurred_at: new Date(base + 2_000),
        },
      ])
      .execute();

    await activatePerformanceAccountInTransaction(db, { evaluationAccountId });
    facts = await assertUntradedPerformanceAccount(db, evaluationAccountId);
    // The rules have been read, so the account is in its ready state rather
    // than its onboarding one.
    await acknowledgePerformanceRules(db, {
      userId: owner.userId,
      accountId: facts.performanceAccountId,
      correlationId: randomUUID(),
      now: new Date(),
    });

    await sessions.capture(browser, owner.email, owner.password);
  });

  test.afterAll(async () => {
    test.setTimeout(120_000);
    await deleteLifecycleFixture(lifecycleEnv(), owner);
    await db.destroy();
  });

  test('un compte Performance neuf n’annonce aucune progression qu’il n’a pas faite', async ({
    page,
  }) => {
    await sessions.actAs(page, owner.email);
    await page.goto(`/hub?account=${facts.performanceAccountId}`);

    const checklist = page.getByTestId('mission-checklist');
    await expect(checklist).toBeVisible();

    /*
     * The regression, stated as a rule rather than as a forbidden number.
     *
     * Asserting "not 91 %" would only catch this one arithmetic mistake on
     * this one account size. The rule is that a percentage on a screen must be
     * the percentage of something the trader has done, and here they have done
     * nothing.
     */
    expect(Number(facts.builtBufferAmount)).toBe(0);
    await expect(checklist).toContainText('0 %');
    await expect(checklist).not.toContainText('91 %');

    // The bar names what it measures. A Performance policy applies no profit
    // objective, so "Objectif" here would describe a rule the account lacks.
    await expect(checklist).toContainText('Buffer à construire');
    await expect(checklist).not.toContainText('Objectif');

    // And the two figures behind the percentage are shown, so a reader can
    // check the arithmetic instead of trusting it.
    await expect(checklist).toContainText(
      `${Math.round(Number(facts.builtBufferAmount)).toLocaleString('fr-FR')} USD`,
    );
    await expect(checklist).toContainText(
      `${facts.performanceDaysCompleted} / ${facts.performanceDaysRequired}`,
    );
  });

  test('une évaluation réussie se lit comme une archive, pas comme un compte négociable', async ({
    page,
  }) => {
    await sessions.actAs(page, owner.email);
    await page.goto(`/hub?account=${facts.evaluationAccountId}`);

    const archive = page.getByTestId('evaluation-archive');
    await expect(archive).toBeVisible();
    await expect(archive).toHaveAttribute('data-account-tradable', 'false');

    // The successor is the way out, and it is on the screen.
    const successor = page.getByTestId('evaluation-successor');
    await expect(successor).toContainText(facts.performanceAccountPublicId);
    await expect(page.getByRole('link', { name: 'Voir mon compte Performance' })).toHaveAttribute(
      'href',
      `/hub?account=${facts.performanceAccountId}`,
    );

    // What a finished evaluation must not offer: a way to trade it, or a live
    // progress bar toward an objective it is no longer being measured against.
    await expect(page.getByTestId('mission-checklist')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Ouvrir WariX' })).toHaveCount(0);
  });

  test('la chronologie du passage est causalement possible et datée en UTC', async ({ page }) => {
    // The rows first: a timeline can only be as honest as what it reads.
    const order = await assertLifecycleOrder(db, facts.evaluationAccountId);
    expect(order.objectiveReachedAt).not.toBeNull();
    expect(order.passedAt).not.toBeNull();

    await sessions.actAs(page, owner.email);
    await page.goto(`/comptes/${owner.accountPublicId}/bienvenue-performance`);

    const timeline = page.getByTestId('performance-timeline');
    await expect(timeline).toBeVisible();

    const entries = await timeline.locator('li').evaluateAll((items) =>
      items.map((item) => ({
        label: item.querySelector('p')?.textContent?.trim() ?? '',
        occurredAt: item.querySelector('time')?.getAttribute('datetime') ?? '',
        shown: item.querySelector('time')?.textContent?.trim() ?? '',
      })),
    );
    expect(entries.length).toBeGreaterThan(1);

    // Rendered in order, and every stamp says which clock it is on. "24 août
    // 02:57" above "25 août 02:56" was possible precisely because neither did.
    const stamps = entries.map((entry) => entry.occurredAt);
    expect([...stamps].sort()).toEqual(stamps);
    for (const entry of entries) {
      expect(entry.shown, `${entry.label} must name its timezone`).toMatch(/UTC$/);
    }

    // The objective cannot follow the finalization that finalized it.
    const objective = entries.find((entry) => entry.label === 'Objectif atteint');
    const passed = entries.find((entry) => entry.label === 'Évaluation réussie');
    expect(objective).toBeDefined();
    expect(passed).toBeDefined();
    expect(objective!.occurredAt <= passed!.occurredAt).toBe(true);
  });

  test('après la lecture des règles, le compte courant est le compte Performance', async ({
    page,
  }) => {
    await sessions.actAs(page, owner.email);

    /*
     * A6 — no `?account=` at all.
     *
     * This is the state a trader arrives in the morning after passing: they
     * open WARIBA and the product decides which account they are working in.
     * It must decide the Performance one. The passed evaluation stays
     * reachable, but a finished account is not where trading happens, and
     * presenting it as the current context is how a trader ends up asking
     * support what happened to their funded account.
     */
    await page.goto('/hub');
    await expect(page.getByTestId('mission-checklist')).toBeVisible();
    await expect(page.getByTestId('mission-checklist')).toContainText('Buffer à construire');
    await expect(page.getByTestId('evaluation-archive')).toHaveCount(0);

    // WariX resolves its account from the same ordering, so an unparameterised
    // launch lands on the same place.
    await page.goto('/trade');
    await expect(page.getByTestId('warix-gate')).toHaveCount(0);
    await expect(page).toHaveURL(/\/trade/);

    // The evaluation is still reachable — as history, by its own identifier.
    await page.goto(`/hub?account=${facts.evaluationAccountId}`);
    await expect(page.getByTestId('evaluation-archive')).toBeVisible();
  });
  /**
   * A17 — the decision is above the fold, at every width WARIBA supports.
   *
   * "Ouvrir WariX" used to render after the rule comparison, the buffer panel,
   * the payout path and the full rule list: two to three thousand pixels of
   * reading on a phone before the one control the screen exists for. Measuring
   * the button's own rectangle against the viewport is the only assertion that
   * catches that — a full-page screenshot contains the button either way.
   */
  test('@mobile le bouton Ouvrir WariX est dans le premier écran, de 320 à 1440', async ({
    page,
  }) => {
    await sessions.actAs(page, owner.email);

    for (const viewport of [
      { width: 320, height: 640 },
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(`/comptes/${facts.performanceAccountPublicId}/bienvenue-performance`);
      await expect(page.getByTestId('performance-handoff')).toHaveAttribute(
        'data-stage',
        'performance_ready',
      );

      const cta = page.getByTestId('performance-ready-actions').getByRole('link', {
        name: 'Ouvrir WariX',
      });
      await expect(cta).toBeVisible();
      const box = await cta.boundingBox();
      expect(box, `${viewport.width}px: le bouton doit être mesurable`).not.toBeNull();
      expect(
        box!.y + box!.height,
        `${viewport.width}px: le bouton tombe sous le premier écran`,
      ).toBeLessThanOrEqual(viewport.height);

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        `${viewport.width}px: débordement horizontal`,
      ).toBe(true);
    }
  });
  /**
   * The accounts list must agree with the Hub about a finished evaluation.
   *
   * The Hub archive landed in Phase 3.3.2; `/comptes` did not, so the card kept
   * drawing an objective bar and two remaining-loss meters beside "Évaluation
   * réussie" — an account the trader could still read as losable. This asserts
   * the state, not the wording: what must be absent is *active-account*
   * presentation, and what must be present is the successor.
   */
  test('une évaluation réussie ne se présente plus comme un compte négociable dans /comptes', async ({
    page,
  }) => {
    await sessions.actAs(page, owner.email);
    await page.goto('/comptes');

    const evaluationCard = page
      .getByTestId('account-card')
      .filter({ hasText: facts.evaluationAccountId ? 'WARIBA ONE' : 'WARIBA ONE' })
      .filter({ hasText: 'Évaluation réussie' });
    await expect(evaluationCard).toHaveCount(1);
    await expect(evaluationCard).toHaveAttribute('data-lifecycle', 'passed');

    // The archive body renders, and the live one does not.
    await expect(evaluationCard.getByTestId('account-card-archive')).toBeVisible();
    for (const active of [
      'Objectif de profit',
      'Perte quotidienne restante',
      'Perte maximale restante',
      'Journées clôturées',
    ]) {
      await expect(evaluationCard.getByText(active)).toHaveCount(0);
    }
    await expect(evaluationCard.getByRole('progressbar')).toHaveCount(0);
    await expect(evaluationCard.getByRole('link', { name: 'Ouvrir WariX' })).toHaveCount(0);

    // The successor is named, and it is the primary way out.
    const successor = evaluationCard.getByTestId('account-card-successor');
    await expect(successor).toContainText(facts.performanceAccountPublicId);
    await expect(
      evaluationCard.getByRole('link', { name: 'Voir mon compte Performance' }),
    ).toHaveAttribute('href', `/hub?account=${facts.performanceAccountId}`);
  });

  test('@mobile la carte archivée tient à 320 et 390 sans déborder', async ({ page }) => {
    await sessions.actAs(page, owner.email);

    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/comptes');
      const card = page.getByTestId('account-card').filter({ hasText: 'Évaluation réussie' });
      await expect(card.getByTestId('account-card-archive')).toBeVisible();
      await expect(card.getByRole('progressbar')).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        `${width}px: débordement horizontal`,
      ).toBe(true);
    }
  });
});
