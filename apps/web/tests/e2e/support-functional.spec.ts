import { expect, test } from '@playwright/test';
import { clickThrough } from './navigation';
import { seedSupportWorld, teardownSupportWorld, type SupportWorld } from './support-world';

/**
 * Does the support system work.
 *
 * ## Scope, deliberately narrow
 *
 * A trader opens a request through the real form, an operator finds it, takes
 * it and answers, the trader reads the answer in the same thread. Then the
 * same trader contests a recorded decision and a reviewer opens the identical
 * evidence. That is the sequence, and it is the only thing this file measures.
 *
 * No screenshots. Twenty-five captures used to share this file's budget, so a
 * suite that ran out of time reported a timeout against whichever step it
 * happened to be on — and "Reply is broken" is not a question a contact sheet
 * can answer. The captures live in `support-visual.spec.ts`, where their cost
 * is visible and their failure means something different.
 */
test.describe('@support @support-functional @critical demande, réponse et contestation', () => {
  let world: SupportWorld;
  let ticketReference = '';
  let contestationReference = '';

  test.beforeAll(async ({ browser }) => {
    // This suite creates its own request through the UI — that is its subject.
    // The seeded pair would only add rows for it to scroll past.
    world = await seedSupportWorld({ browser, withSeededRecords: false });
  });

  test.afterAll(async () => {
    await teardownSupportWorld(world);
  });

  test('un trader ouvre une demande, un opérateur répond, le trader lit la réponse', async ({
    page,
  }) => {
    await world.sessions.actAs(page, world.trader.email);

    // --- Support home is the Hub's own surface, not the marketing page ------
    await page.goto('/support');
    await expect(page.getByTestId('support-help-search')).toBeVisible();
    await expect(page.getByText('Demandes en cours')).toBeVisible();
    // The Hub shell, not the public header: the audit's PLACEBO_STATUS_UI was
    // exactly this link landing on a marketing page.
    await expect(page.locator('[data-wariba-section="hub"]')).toBeVisible();

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

    // --- Control sees it, takes it, and answers ---------------------------
    await world.sessions.actAs(page, world.supportOperator.email);
    await page.goto('/control/support');
    await expect(page.getByText('File Support')).toBeVisible();
    await clickThrough(
      page,
      page.getByRole('link', { name: ticketReference }),
      `**/control/support/${ticketReference}`,
    );
    // Everything needed to answer, without opening Supabase.
    await expect(page.getByTestId('control-ticket-meta')).toBeVisible();
    await expect(page.getByTestId('control-ticket-message')).toHaveCount(1);

    await page.getByTestId('control-ticket-assign').click();
    await expect(page.getByTestId('control-ticket-assign')).toHaveText(/Affectée à vous/);

    await page
      .getByTestId('control-reply-body')
      .fill('Votre ordre a été refusé par la règle de perte maximale. Le détail est ci-dessous.');
    await page.getByTestId('control-reply-send').click();
    await expect(page.getByTestId('control-ticket-message')).toHaveCount(2);

    // --- The trader reads the reply, in the same thread --------------------
    await world.sessions.actAs(page, world.trader.email);
    await page.goto(`/support/demandes/${ticketReference}`);
    await expect(page.getByTestId('ticket-message')).toHaveCount(2);
    const staffMessage = page.locator('[data-testid="ticket-message"][data-author="staff"]');
    await expect(staffMessage).toHaveCount(1);
    // Class, not person: the trader is never handed an operator's identity.
    await expect(staffMessage).toContainText('WARIBA Support');
    await expect(staffMessage).not.toContainText(world.supportOperator.email);
  });

  test('un trader conteste la décision et Control ouvre la même preuve', async ({ page }) => {
    await world.sessions.actAs(page, world.trader.email);

    // --- The entry point is on the breach banner, where the trader stands ---
    await page.goto('/hub');
    const contest = page.getByRole('link', { name: 'Ouvrir une contestation' });
    await expect(contest).toBeVisible();
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

    // --- A second contestation on the same decision is refused -------------
    await page.goto(`/support/contestations/nouvelle?account=${world.trader.accountId}`);
    const locked = page.locator('[data-testid="contestable-decision"][data-locked="true"]');
    await expect(locked).toHaveCount(1);
    await expect(locked).toContainText('Une contestation est déjà ouverte');

    // --- The reviewer opens the identical evidence -------------------------
    await world.sessions.actAs(page, world.riskReviewer.email);
    await page.goto('/control/contestations');
    await expect(page.getByText('File de contestations')).toBeVisible();
    await clickThrough(
      page,
      page.getByRole('link', { name: contestationReference }),
      `**/control/contestations/${contestationReference}`,
    );

    const controlEvidence = page.getByTestId('control-contestation-evidence');
    await expect(controlEvidence).toBeVisible();
    // The same projection, so the two sides cannot read different numbers.
    const reviewerThreshold = await controlEvidence.locator('tr', { hasText: 'Seuil' }).innerText();
    expect(reviewerThreshold).toBe(traderThreshold);

    /*
     * Les deux surfaces racontent la même histoire.
     *
     * WARIBA Control affirmait « la décision provient d'une finalisation de
     * journée » dès qu'aucun ordre n'était rattaché au dossier — une
     * déduction, écrite en dur, pendant que la ligne de violation portait
     * `trigger_event_type = manual_review` et que la page trader affichait
     * « Une vérification manuelle ». Deux écrans, deux causes, un seul fait.
     * Control lit maintenant la colonne.
     */
    await expect(controlEvidence).toContainText('Une vérification manuelle');
    await expect(page.getByText(/finalisation de journée/)).toHaveCount(0);

    // The trader's account of events is labelled as exactly that.
    await expect(page.getByText('Déclaration du trader')).toBeVisible();
    await expect(page.getByTestId('control-contestation-statement')).toBeVisible();

    /*
     * No reversal is offered — asserted as a contract, not as a sentence.
     *
     * The Phase 3.2 version of this test matched the exact words of the notice
     * and the exact list of option labels. UX-SUPPORT-004 then added a third
     * outcome (`correction_required`) and rewrote the notice, and the test
     * failed on wording while the rule it existed to protect was intact. What
     * must never change is the *value*: `overturned` is in the column's check
     * constraint for a future corrective transition and the command layer
     * refuses it, so it must never be selectable. Editorial wording is checked
     * once, in `apps/web/tests/help-editorial.test.ts`, not in every flow.
     */
    const decisionValues = await page
      .getByTestId('contestation-decision-select')
      .locator('option')
      .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
    expect(decisionValues).not.toContain('overturned');
    expect(decisionValues).toContain('upheld');
    expect(decisionValues).toContain('requires_escalation');
    // And the panel explains what a correction can and cannot touch, so a
    // reviewer does not go looking for a reversal on another surface.
    await expect(page.getByText('Historique d’origine protégé')).toBeVisible();
  });
});
