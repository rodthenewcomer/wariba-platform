import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import {
  createStaffFixtureDb,
  deleteLifecycleFixture,
  deleteStaffFixtureUser,
  seedBreachEvidence,
  seedLifecycleFixture,
  seedStaffUser,
  STAFF_E2E_TEST_PASSWORD,
  type Db,
  type LifecycleFixture,
  type StaffFixtureUser,
} from '@wariba/test-utils';
import { lifecycleEnv } from './fixtures';

/**
 * Phase 3.2 — Support and Contestations, end to end.
 *
 * One narrative, told once: a breached trader opens a request, sees it, an
 * operator finds it in Control and answers, the trader reads the answer, then
 * the same trader contests the breach and a reviewer opens the identical
 * evidence. Plus the two things a screenshot cannot prove — that another
 * trader cannot reach any of it, and that the whole flow works at 390 and does
 * not overflow at 320.
 *
 * Deliberately not a suite per surface. §21 asks for targeted coverage, and a
 * support system is a *sequence*: assertions that each page renders in
 * isolation would miss the only failure that matters, which is the handoff
 * between them.
 */
const OUT = '../../docs/04-ux/evidence/wariba-phase-3-2-support';
const HELP_VISUAL_OUT = '../../docs/04-ux/evidence/wariba-help-visual-system/product';

const SIZES = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
  mobileCapture: { width: 390, height: 1200 },
  small: { width: 320, height: 568 },
} as const;

type Page = import('@playwright/test').Page;
type Locator = import('@playwright/test').Locator;

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 60_000 });
}

async function shoot(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

async function shootHelpAsset(locator: Locator, name: string) {
  mkdirSync(HELP_VISUAL_OUT, { recursive: true });
  await locator.screenshot({
    path: `${HELP_VISUAL_OUT}/${name}.png`,
    animations: 'disabled',
  });
}

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
}

test.describe('@support Phase 3.2 — support and contestations', () => {
  let db: Db;
  let trader: LifecycleFixture;
  let intruder: LifecycleFixture;
  let supportOperator: StaffFixtureUser;
  let riskReviewer: StaffFixtureUser;
  let ticketReference: string;
  let contestationReference: string;

  test.beforeAll(async () => {
    db = createStaffFixtureDb();
    // A breached account, and the recorded decision behind it. A breach with no
    // violation row is the incoherent state — a contestation points at the row.
    trader = await seedLifecycleFixture(lifecycleEnv(), 'breached');
    await seedBreachEvidence(db, { accountId: trader.accountId as string });
    intruder = await seedLifecycleFixture(lifecycleEnv(), 'evaluation_new');
    supportOperator = await seedStaffUser(db, 'support');
    riskReviewer = await seedStaffUser(db, 'risk');
  });

  test.afterAll(async () => {
    /*
     * Traders before staff, and the order is not incidental.
     *
     * A staff reply lives in `app.ticket_messages.actor_staff_id`, which is a
     * NOT NULL foreign key for a staff message. Deleting the operator first
     * would fail on that reference — correctly, because a conversation cannot
     * lose its author. Removing the trader's tickets takes their messages with
     * them (the one delete the append-only trigger permits), and only then is
     * the operator unreferenced.
     */
    await deleteLifecycleFixture(lifecycleEnv(), trader);
    await deleteLifecycleFixture(lifecycleEnv(), intruder);
    await deleteStaffFixtureUser(db, supportOperator);
    await deleteStaffFixtureUser(db, riskReviewer);
    await db.destroy();
  });

  test('a visitor sees the public explainer, and the sub-tree stays private', async ({ page }) => {
    /*
     * DEC-3.2-01, both halves.
     *
     * `/support` is a canonical route in the Public set *and* in the Trader Hub
     * set (Constitution §6), and Next.js resolves one page per path — so the
     * route chooses its shell from the session. This test is the guard on that
     * arrangement: a visitor must still land on the explainer in the marketing
     * chrome, and everything below `/support/` must still require a session.
     *
     * Both halves are one middleware character apart. `/support` in
     * PROTECTED_PREFIXES instead of `/support/` would send an anonymous visitor
     * to /login from a page the Constitution says is public, and nothing else
     * in the suite would notice.
     */
    await page.goto('/support');
    await expect(page.locator('[data-wariba-section="public"]')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Une question claire mérite une réponse traçable.',
    );
    // The public page offers the door, not the system behind it.
    await expect(page.getByTestId('support-help-search')).toHaveCount(0);

    for (const route of ['/support/nouveau', '/support/demandes/WRB-00001']) {
      await page.goto(route);
      await page.waitForURL('**/login**');
    }
  });

  test('a trader opens a request, an operator answers, and the trader reads it', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, trader.email, trader.password);

    // --- Support home is the Hub's own surface, not the marketing page ------
    await page.goto('/support');
    await expect(page.getByTestId('support-help-search')).toBeVisible();
    await expect(page.getByText('Demandes en cours')).toBeVisible();
    // The Hub shell, not the public header: the audit's PLACEBO_STATUS_UI was
    // exactly this link landing on a marketing page.
    await expect(page.locator('[data-wariba-section="hub"]')).toBeVisible();
    await shoot(page, 'support-desktop');

    // --- Help search answers before a ticket is opened ---------------------
    // Les alias de recherche comprennent toujours l'anglais, même si aucune
    // surface ne l'affiche plus.
    await page.getByTestId('support-help-search').fill('Maximum Loss');
    await expect(page.getByTestId('support-help-results')).toBeVisible();
    await page.getByTestId('support-help-search').fill('');

    // --- New request -------------------------------------------------------
    await page
      .getByTestId('header-new-request')
      .or(page.getByTestId('empty-new-request'))
      .first()
      .click();
    await page.waitForURL('**/support/nouveau');
    await page.getByTestId('new-request-category').selectOption('trading');
    await page.getByTestId('new-request-subject').fill('Ordre refusé sur XAUUSD');
    await page
      .getByTestId('new-request-body')
      .fill(
        'Mon ordre a été refusé alors que la marge me semblait suffisante. Pouvez-vous vérifier ?',
      );
    await page.getByTestId('new-request-submit').click();

    await page.waitForURL('**/support/demandes/**');
    ticketReference = (await page.getByTestId('ticket-reference').innerText()).trim();
    expect(ticketReference).toMatch(/^WRB-\d{5}$/);
    await expect(page.getByTestId('ticket-next-action')).toBeVisible();
    await expect(page.getByTestId('ticket-message')).toHaveCount(1);

    // --- It appears in My Requests ----------------------------------------
    await page.goto('/support');
    await expect(page.locator(`[data-reference="${ticketReference}"]`)).toBeVisible();

    // --- Control sees it, and answers -------------------------------------
    const staffContext = await page.context().browser()?.newContext();
    if (!staffContext) throw new Error('No browser available for the operator session.');
    try {
      const staffPage = await staffContext.newPage();
      await signIn(staffPage, supportOperator.email, STAFF_E2E_TEST_PASSWORD);
      await staffPage.goto('/control/support');
      await expect(staffPage.getByText('File Support')).toBeVisible();
      await expect(staffPage.getByRole('link', { name: ticketReference })).toBeVisible();
      await staffPage.setViewportSize(SIZES.desktop);
      await shoot(staffPage, 'control-support-queue');

      await staffPage.getByRole('link', { name: ticketReference }).click();
      await staffPage.waitForURL(`**/control/support/${ticketReference}`);
      // Everything needed to answer, without opening Supabase.
      await expect(staffPage.getByTestId('control-ticket-meta')).toBeVisible();
      await expect(staffPage.getByTestId('control-ticket-message')).toHaveCount(1);

      await staffPage.getByTestId('control-ticket-assign').click();
      await expect(staffPage.getByTestId('control-ticket-assign')).toHaveText(/Affectée à vous/);

      await staffPage
        .getByTestId('control-reply-body')
        .fill('Votre ordre a été refusé par la règle de perte maximale. Le détail est ci-dessous.');
      await staffPage.getByTestId('control-reply-send').click();
      await expect(staffPage.getByTestId('control-ticket-message')).toHaveCount(2);
      await shoot(staffPage, 'control-ticket-detail');
    } finally {
      await staffContext.close();
    }

    // --- The trader reads the reply, in the same thread --------------------
    await page.goto(`/support/demandes/${ticketReference}`);
    await expect(page.getByTestId('ticket-message')).toHaveCount(2);
    const staffMessage = page.locator('[data-testid="ticket-message"][data-author="staff"]');
    await expect(staffMessage).toHaveCount(1);
    // Class, not person: the trader is never handed an operator's identity.
    await expect(staffMessage).toContainText('WARIBA Support');
    await expect(staffMessage).not.toContainText(supportOperator.email);
    await shoot(page, 'support-ticket-desktop');
    await shootHelpAsset(
      page.locator('main .max-w-3xl').first(),
      'HLP-SCR-007-support-ticket-desktop',
    );
  });

  test('a breached trader contests the decision and Control opens the same evidence', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await page.setViewportSize(SIZES.desktop);
    await signIn(page, trader.email, trader.password);

    // --- The entry point is on the breach banner, where the trader stands ---
    // `signIn` has already navigated to `/hub`. Starting a second navigation
    // to the same server-rendered page here can leave Playwright waiting for a
    // redundant `load` while the first document is still settling.
    const contest = page.getByRole('link', { name: 'Ouvrir une contestation' });
    await expect(contest).toBeVisible();
    await shoot(page, 'breach-contestation-entry');
    await contest.click();

    await page.waitForURL('**/support/contestations/nouvelle**');
    // The decision is chosen from what is recorded, never typed.
    await expect(page.getByTestId('contestable-decision').first()).toBeVisible();
    await page.getByTestId('contestation-reason').selectOption('rule_misapplied');
    await page
      .getByTestId('contestation-statement')
      .fill(
        'Le plancher de perte maximale retenu ne correspond pas à ma meilleure balance de clôture.',
      );

    // Fresh current-product tutorial crop — form, not the Hub banner whose
    // other actions depend on an unrelated open product decision.
    await shootHelpAsset(
      page.getByTestId('contestation-form'),
      'HLP-SCR-006-dispute-entry-desktop',
    );
    // Keep the true 390 px phone breakpoint while giving the cropped form
    // enough vertical room to sit above the fixed Hub navigation.
    await page.setViewportSize(SIZES.mobileCapture);
    await shootHelpAsset(page.getByTestId('contestation-form'), 'HLP-SCR-006-dispute-entry-mobile');
    await page.setViewportSize(SIZES.desktop);
    await page.getByTestId('contestation-submit').click();

    await page.waitForURL('**/support/contestations/**');
    contestationReference = (await page.getByTestId('contestation-reference').innerText()).trim();
    expect(contestationReference).toMatch(/^CTS-\d{5}$/);

    // The evidence is on the trader's own page: rule, threshold, observed value.
    const evidence = page.getByTestId('contestation-evidence');
    await expect(evidence).toBeVisible();
    await expect(evidence).toContainText('Seuil');
    await expect(evidence).toContainText('Valeur observée');
    await expect(evidence).toContainText('Version des règles');
    /*
     * Ce que la page trader ne montre pas.
     *
     * `Version de calcul` (risk-engine-v1), `Transition du compte` et
     * `Événement déclencheur` sont des lignes d'instruction : WARIBA Control
     * les lit, la personne dont c'est le compte n'en fait rien. Le code de
     * règle et l'UUID de corrélation ont disparu pour la même raison — la
     * référence publique CTS suffit à retrouver le dossier.
     */
    for (const internal of ['Version de calcul', 'Transition du compte', 'risk-engine-v1']) {
      await expect(page.getByText(internal)).toHaveCount(0);
    }
    await expect(page.getByText('RISK_MAXIMUM_LOSS_BREACH')).toHaveCount(0);
    await expect(page.getByTestId('contestation-narrative')).toBeVisible();
    const traderThreshold = await evidence.locator('tr', { hasText: 'Seuil' }).innerText();
    await shoot(page, 'contestation-detail-trader');
    await shootHelpAsset(
      page.getByRole('region', { name: 'Décision contestée' }),
      'HLP-SCR-005-breach-evidence-desktop',
    );

    // --- A second contestation on the same decision is refused -------------
    await page.goto(`/support/contestations/nouvelle?account=${trader.accountId}`);
    const locked = page.locator('[data-testid="contestable-decision"][data-locked="true"]');
    await expect(locked).toHaveCount(1);
    await expect(locked).toContainText('Une contestation est déjà ouverte');

    // --- The reviewer opens the identical evidence -------------------------
    const reviewerContext = await page.context().browser()?.newContext();
    if (!reviewerContext) throw new Error('No browser available for the reviewer session.');
    try {
      const reviewerPage = await reviewerContext.newPage();
      await signIn(reviewerPage, riskReviewer.email, STAFF_E2E_TEST_PASSWORD);
      await reviewerPage.setViewportSize(SIZES.desktop);
      await reviewerPage.goto('/control/contestations');
      await expect(reviewerPage.getByText('File de contestations')).toBeVisible();
      await reviewerPage.getByRole('link', { name: contestationReference }).click();
      await reviewerPage.waitForURL(`**/control/contestations/${contestationReference}`);

      const controlEvidence = reviewerPage.getByTestId('control-contestation-evidence');
      await expect(controlEvidence).toBeVisible();
      // The same projection, so the two sides cannot read different numbers.
      const reviewerThreshold = await controlEvidence
        .locator('tr', { hasText: 'Seuil' })
        .innerText();
      expect(reviewerThreshold).toBe(traderThreshold);

      /*
       * Les deux surfaces racontent la même histoire.
       *
       * WARIBA Control affirmait « la décision provient d'une finalisation de
       * journée » dès qu'aucun ordre n'était rattaché au dossier — une
       * déduction, écrite en dur, pendant que la ligne de violation portait
       * `trigger_event_type = manual_review` et que la page trader affichait
       * « Une vérification manuelle ». Deux écrans, deux causes, un seul
       * fait. Control lit maintenant la colonne.
       */
      await expect(controlEvidence).toContainText('Une vérification manuelle');
      await expect(reviewerPage.getByText(/finalisation de journée/)).toHaveCount(0);

      // The trader's account of events is labelled as exactly that.
      await expect(reviewerPage.getByText('Déclaration du trader')).toBeVisible();
      await expect(reviewerPage.getByTestId('control-contestation-statement')).toBeVisible();

      // No reversal is offered, and the panel says why rather than leaving a
      // reviewer to go looking for it.
      await expect(reviewerPage.getByText('Aucune réversion automatique')).toBeVisible();
      const options = await reviewerPage
        .getByTestId('contestation-decision-select')
        .locator('option')
        .allInnerTexts();
      expect(options).toEqual(['Décision maintenue', 'Dossier escaladé']);
      await shoot(reviewerPage, 'control-contestation-detail');
    } finally {
      await reviewerContext.close();
    }
  });

  test('another trader cannot reach the request or the contestation', async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page, intruder.email, intruder.password);

    await page.goto(`/support/demandes/${ticketReference}`);
    // Not "forbidden": the same page a reference that was never issued
    // produces. B learns nothing about whether WRB-xxxxx exists.
    await expect(page.getByText('Cette demande n’est pas accessible.')).toBeVisible();

    await page.goto(`/support/contestations/${contestationReference}`);
    await expect(page.getByText('Cette contestation n’est pas accessible.')).toBeVisible();

    // And Control is not reachable at all from a trader session.
    await page.goto('/control/support');
    await page.waitForURL('**/hub');
  });

  test('the whole flow works on a phone, and does not overflow at 320', async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize(SIZES.mobile);
    await signIn(page, trader.email, trader.password);

    await page.goto('/support');
    await expect(page.getByTestId('support-help-search')).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
    await shoot(page, 'support-home-390');

    await page.goto(`/support/demandes/${ticketReference}`);
    await expect(page.getByTestId('ticket-reference')).toBeVisible();
    await expect(page.getByTestId('ticket-message').first()).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
    await shoot(page, 'support-ticket-390');
    await page.setViewportSize(SIZES.mobileCapture);
    await shootHelpAsset(
      page.locator('main .max-w-3xl').first(),
      'HLP-SCR-007-support-ticket-mobile',
    );

    // A composer a phone can actually use: 44px minimum, in the viewport.
    const submit = page.getByTestId('reply-submit');
    if (await submit.count()) {
      const box = await submit.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }

    // --- 320: the narrowest supported width (DS-014 LOCKED) ---------------
    await page.setViewportSize(SIZES.small);
    for (const route of [
      '/support',
      '/support/nouveau',
      `/support/demandes/${ticketReference}`,
      `/support/contestations/${contestationReference}`,
    ]) {
      await page.goto(route);
      await page.waitForTimeout(200);
      expect(await noHorizontalOverflow(page), `${route} overflows at 320`).toBe(true);
    }
    await shoot(page, 'support-320');

    // La contestation sur téléphone : c'est là que la table de preuve
    // devient une pile de cartes, et que le superflu se voit le plus.
    await page.setViewportSize(SIZES.mobile);
    await page.goto(`/support/contestations/${contestationReference}`);
    await expect(page.getByTestId('contestation-reference')).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
    await shoot(page, 'contestation-detail-390');
    await page.setViewportSize(SIZES.mobileCapture);
    await shootHelpAsset(
      page.getByRole('region', { name: 'Décision contestée' }),
      'HLP-SCR-005-breach-evidence-mobile',
    );
  });

  /**
   * La barre de navigation ne doit jamais passer devant ce qu'on tape.
   *
   * Elle est en `position: fixed` en bas de l'écran, et `<main>` réserve sa
   * hauteur en `padding-bottom`. Ce test mesure le contrat plutôt que de le
   * croire : il fait défiler jusqu'en bas du fil, puis compare le rectangle
   * de la barre à celui du champ de réponse, du bouton d'envoi et de la
   * dernière ligne de texte.
   *
   * Une capture pleine page ne peut pas répondre à cette question — un
   * élément fixe y est dessiné là où était la fenêtre au moment du cliché,
   * c'est-à-dire au milieu de l'image. Il faut mesurer dans le repère de la
   * fenêtre, à quatre largeurs, ce que fait cette boucle.
   */
  test('the bottom navigation never covers the reply form', async ({ page }) => {
    test.setTimeout(300_000);
    await signIn(page, trader.email, trader.password);

    const WIDTHS = [320, 375, 390, 430];
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 780 });
      await page.goto(`/support/demandes/${ticketReference}`);
      await expect(page.getByTestId('reply-composer')).toBeVisible();

      // Tout en bas : la position la plus défavorable pour un élément fixe.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(250);

      const nav = await page.getByTestId('hub-mobile-nav').boundingBox();
      expect(nav, `${width}px: la barre mobile devrait être rendue`).not.toBeNull();

      for (const testId of ['reply-body', 'reply-submit']) {
        const box = await page.getByTestId(testId).boundingBox();
        expect(box, `${width}px: ${testId} devrait être mesurable`).not.toBeNull();
        // Entièrement dans la fenêtre…
        expect(box!.y, `${width}px: ${testId} sort par le haut`).toBeGreaterThanOrEqual(0);
        // …et entièrement au-dessus de la barre.
        expect(box!.y + box!.height, `${width}px: la barre recouvre ${testId}`).toBeLessThanOrEqual(
          nav!.y + 1,
        );
      }

      // Et la dernière ligne de la page, pas seulement les champs.
      const tail = await page.getByTestId('ticket-footer-reference').boundingBox();
      if (tail) {
        expect(
          tail.y + tail.height,
          `${width}px: la barre recouvre la fin de page`,
        ).toBeLessThanOrEqual(nav!.y + 1);
      }
    }
  });
});
