# WARIBA Phase 3.4.1 — Repository Rule Inventory

> Statut : **AUDIT COMPLET AU START SHA — V2 NOUVELLE SOURCE NORMATIVE**
> Branche/SHA audités : `main@9dff986e5880130725a64866431ec8e3635f2a16`
> Date : 27 août 2026
> Scope : documents, code, schéma/migrations, Risk, Payout, WariX, Hub, Checkout, site public, Help, Control, tests et modèles financiers.

## 1. Méthode et périmètre

L’audit a lu les deux documents d’entrée en entier, puis parcouru les 1 164
fichiers suivis du dépôt et les changements préexistants pertinents. Le manifest
ci-dessous retient 191 fichiers uniques directement normatifs,
consommateurs de règles, migrations historiques, preuves ou doublons
superseded. Les tests/fixtures touchés par les scans V1 sont inclus en C.

Changements préexistants observés et préservés : suppression de
`docs/WARIBA_Actuarial_Risk_Model_v1.0.md`; deux copies non suivies du
Rulebook candidat; workbook/notebook/report source d’offre non suivis. L’audit
n’a restauré, supprimé ni modifié aucun de ces éléments.

## 2. Résumé des classifications

| Classe | Signification | Fichiers |
|---|---|---:|
| A — NORMATIVE_CURRENT | nouvelle vérité V2 et décision de supersession | 3 |
| B — NORMATIVE_SUPPORTING | gouvernance, finance, architecture, QA et propagation | 14 |
| C — IMPLEMENTATION_REFERENCE | runtime/tests à ne pas modifier en 3.4.1 | 128 |
| D — HISTORICAL_EVIDENCE | migrations appliquées, preuves et modèles historiques | 38 |
| E — DEPRECATED/SUPERSEDED | documents V1 ou copies au mauvais emplacement | 8 |
| **Total** | fichiers uniques | **191** |

### A — NORMATIVE_CURRENT — 3 fichiers

Ces fichiers gouvernent désormais les nouvelles offres et les futurs comptes pilotes V2.

- `docs/00-decisions/DECISION_LOG.md`
- `docs/02-program/WARIBA_Program_Rulebook_Candidate_V2.md`
- `docs/02-program/WARIBA_Canonical_Policy_Contract_V2.md`

### B — NORMATIVE_SUPPORTING — 14 fichiers

Ils soutiennent la décision sans pouvoir contredire le contrat V2. Les hypothèses financières restent des hypothèses.

- `AGENTS.md`
- `docs/00-decisions/architecture/ADR-024-policy-symbol-specs-immuables.md`
- `docs/00-decisions/WARIBA_PRODUCT_OS_MASTER_CONSTITUTION_2026.md`
- `docs/01-product/WARIBA_HELP_FRENCH_EDITORIAL_STANDARD.md`
- `docs/03-finance/WARIBA_Offer_Economics_Acquisition_V1.xlsx`
- `docs/03-finance/WARIBA_Offer_Economics_Acquisition_V1.ipynb`
- `docs/03-finance/report-source.md`
- `docs/03-finance/WARIBA_MARGIN_EXPOSURE_CALIBRATION_V1.md`
- `docs/06-engineering/WARIBA_Engineering_Constitution_v1.0.md`
- `docs/06-engineering/WARIBA_System_Architecture_v1.0.md`
- `docs/06-engineering/WARIBA_RULE_SOURCE_OF_TRUTH_MAP_V2.md`
- `docs/06-engineering/WARIBA_PHASE_3_4_POLICY_BLAST_RADIUS.md`
- `docs/07-assurance/WARIBA_CI_E2E_Test_Architecture_v1.0.md`
- `docs/07-assurance/WARIBA_Security_QA_Operations_Standard_v1.0.md`

### C — IMPLEMENTATION_REFERENCE — 128 fichiers

Ils prouvent la vérité runtime actuelle et constituent le blast radius futur. Aucune modification en Phase 3.4.1.

- `packages/policies/src/schema.ts`
- `packages/policies/src/loader.ts`
- `packages/policies/src/hash.ts`
- `packages/policies/src/risk-engine.ts`
- `packages/policies/src/profit-eligibility-policy.ts`
- `packages/domain/src/risk-math.ts`
- `packages/domain/src/performance-math.ts`
- `packages/domain/src/trading-math.ts`
- `packages/domain/src/profit-eligibility.ts`
- `packages/domain/src/treasury-math.ts`
- `packages/database/src/schema.ts`
- `packages/database/src/policy.ts`
- `packages/database/src/activation.ts`
- `packages/database/src/accounts.ts`
- `packages/database/src/risk.ts`
- `packages/database/src/daily-finalization.ts`
- `packages/database/src/program-eligibility.ts`
- `packages/database/src/trading.ts`
- `packages/database/src/exposure-gate.ts`
- `packages/database/src/performance.ts`
- `packages/database/src/performance-onboarding.ts`
- `packages/database/src/payouts.ts`
- `packages/database/src/financial-reconciliation.ts`
- `packages/database/src/contestations.ts`
- `packages/database/src/contestation-evidence.ts`
- `packages/database/src/treasury.ts`
- `packages/database/src/control-policies.ts`
- `packages/database/src/control-accounts.ts`
- `packages/database/src/control-payout-review.ts`
- `packages/database/src/control-treasury-cockpit.ts`
- `packages/application/src/commerce.ts`
- `packages/application/src/identity.ts`
- `packages/application/src/offer-configuration.ts`
- `packages/application/src/help-policy-facts.ts`
- `packages/application/src/risk-engine-inputs.ts`
- `packages/application/src/risk-view.ts`
- `packages/application/src/mission-view.ts`
- `packages/application/src/performance-mission-view.ts`
- `packages/application/src/evaluation-performance-handoff.ts`
- `packages/application/src/hub-view.ts`
- `packages/application/src/payout-lifecycle.ts`
- `packages/application/src/kyc-state.ts`
- `packages/application/src/control-feature-gates.ts`
- `packages/application/src/control-payouts-actions.ts`
- `packages/application/src/control-treasury-actions.ts`
- `services/realtime/src/market.ts`
- `services/realtime/src/snapshot.ts`
- `services/realtime/src/websocket.ts`
- `services/realtime/src/payout-handler.ts`
- `services/worker/src/jobs/daily-finalization.ts`
- `apps/web/app/(public)/page.tsx`
- `apps/web/app/(public)/offres/page.tsx`
- `apps/web/app/(public)/programme/page.tsx`
- `apps/web/app/(public)/legal/risques/page.tsx`
- `apps/web/app/catalog/page.tsx`
- `apps/web/app/(platform)/comptes/nouveau/Configurator.tsx`
- `apps/web/app/(platform)/comptes/nouveau/page.tsx`
- `apps/web/app/(platform)/checkout/CheckoutClient.tsx`
- `apps/web/app/(platform)/checkout/page.tsx`
- `apps/web/app/(platform)/hub/page.tsx`
- `apps/web/app/(platform)/payouts/PayoutCenterPanel.tsx`
- `apps/web/app/(platform)/payouts/page.tsx`
- `apps/web/app/(trade)/trade/execution/execution-gating.ts`
- `apps/web/app/(trade)/trade/trade-session.ts`
- `apps/web/app/(trade)/trade/workstation/CalendarNewsPanel.tsx`
- `apps/web/content/help/index.ts`
- `apps/web/content/help/wariba-one.ts`
- `apps/web/content/help/risque-regles.ts`
- `apps/web/content/help/performance.ts`
- `apps/web/content/help/payouts.ts`
- `apps/web/app/(control)/control/policies/page.tsx`
- `apps/web/app/(control)/control/policies/[policyVersionId]/page.tsx`
- `apps/web/app/(control)/control/payouts/page.tsx`
- `apps/web/app/(control)/control/payouts/actions.ts`
- `apps/web/app/(control)/control/treasury/page.tsx`
- `apps/web/app/(control)/control/treasury/actions.ts`
- `apps/web/app/(control)/control/contestations/page.tsx`
- `apps/web/app/(control)/control/contestations/actions.ts`
- `packages/application/tests/activation.integration.test.ts`
- `packages/application/tests/billing-summary.test.ts`
- `packages/application/tests/evaluation-performance-handoff.integration.test.ts`
- `packages/application/tests/hub-read-models.integration.test.ts`
- `packages/application/tests/performance-mission-view.integration.test.ts`
- `packages/database/tests/activation.integration.test.ts`
- `packages/database/tests/actuarial-scenarios.integration.test.ts`
- `packages/database/tests/actuarial-variance.integration.test.ts`
- `packages/database/tests/control-accounts.integration.test.ts`
- `packages/database/tests/control-financial.integration.test.ts`
- `packages/database/tests/control-operations.integration.test.ts`
- `packages/database/tests/control-users.integration.test.ts`
- `packages/database/tests/daily-finalization.integration.test.ts`
- `packages/database/tests/identity-commerce-rls.integration.test.ts`
- `packages/database/tests/payouts-rls.integration.test.ts`
- `packages/database/tests/payouts.integration.test.ts`
- `packages/database/tests/pending-orders-alerts-rls.integration.test.ts`
- `packages/database/tests/pending-orders.integration.test.ts`
- `packages/database/tests/performance.integration.test.ts`
- `packages/database/tests/position-protections.integration.test.ts`
- `packages/database/tests/position-reduction-queue.integration.test.ts`
- `packages/database/tests/realtime-leadership.integration.test.ts`
- `packages/database/tests/risk-rls.integration.test.ts`
- `packages/database/tests/risk.integration.test.ts`
- `packages/database/tests/support-rls.integration.test.ts`
- `packages/database/tests/support.integration.test.ts`
- `packages/database/tests/trading-properties.integration.test.ts`
- `packages/database/tests/trading-rls.integration.test.ts`
- `packages/database/tests/trading.integration.test.ts`
- `packages/database/tests/treasury.integration.test.ts`
- `packages/domain/tests/actuarial-scenario.test.ts`
- `packages/domain/tests/actuarial-variance.test.ts`
- `packages/domain/tests/performance-math.test.ts`
- `packages/policies/tests/hash.test.ts`
- `packages/policies/tests/parity.test.ts`
- `packages/policies/tests/profit-eligibility-policy.test.ts`
- `packages/policies/tests/risk-engine.test.ts`
- `packages/policies/tests/schema.test.ts`
- `packages/test-utils/src/hub-account-fixture.ts`
- `packages/test-utils/src/lifecycle-fixture.ts`
- `packages/test-utils/src/payout-account-fixture.ts`
- `packages/test-utils/src/support-fixture.ts`
- `packages/test-utils/src/trade-account-fixture.ts`
- `packages/validation/tests/commerce.test.ts`
- `services/realtime/scripts/load-test.ts`
- `services/realtime/tests/auth-isolation.e2e.test.ts`
- `services/realtime/tests/multi-node-failover.e2e.test.ts`
- `services/realtime/tests/pending-order-lifecycle.e2e.test.ts`
- `services/realtime/tests/pending-order-restart-recovery.e2e.test.ts`
- `services/worker/tests/daily-finalization-job.integration.test.ts`

### D — HISTORICAL_EVIDENCE — 38 fichiers

Ils ne doivent jamais être réécrits. Le chemin root Actuarial est indiqué malgré sa suppression préexistante, précisément pour préserver cette vérité du worktree.

- `supabase/migrations/20260803000000_identity_commerce_activation.sql`
- `supabase/migrations/20260804000000_trading_core.sql`
- `supabase/migrations/20260804000003_trading_rls_grants.sql`
- `supabase/migrations/20260804000007_policy_symbol_specs_v1_1.sql`
- `supabase/migrations/20260805000000_policy_risk_evaluation.sql`
- `supabase/migrations/20260805000001_backfill_policy_machine_hash.sql`
- `supabase/migrations/20260805000002_fix_performance_leverage.sql`
- `supabase/migrations/20260805000003_profit_eligibility.sql`
- `supabase/migrations/20260805060700_retire_stale_evaluation_policy_v1_0_0.sql`
- `supabase/migrations/20260807000000_performance_policy_and_activation.sql`
- `supabase/migrations/20260807010000_performance_cycles.sql`
- `supabase/migrations/20260807020000_performance_payout_engine.sql`
- `supabase/migrations/20260807030000_treasury_reserve.sql`
- `supabase/migrations/20260809010000_prompt_08a_financial_integrity.sql`
- `supabase/migrations/20260825002714_phase_3_3_1_evaluation_performance_handoff.sql`
- `docs/WARIBA_Actuarial_Risk_Model_v1.0.md`
- `docs/03-finance/WARIBA_Actuarial_Risk_Model_v1.0.md`
- `docs/03-finance/WARIBA_Financial_Model_v1.0.xlsx`
- `docs/03-finance/WARIBA_Financial_Model_v1.1.xlsx`
- `docs/08-delivery/WARIBA_PHASE_3_3_1_EVALUATION_PERFORMANCE_HANDOFF_REPORT_2026-08-24.md`
- `docs/08-delivery/WARIBA_PHASE_3_3_1_SOURCE_AUDIT_2026-08-24.md`
- `docs/08-delivery/WARIBA_PHASE_3_3_2_PRODUCT_TRUTH_CLOSURE_REPORT_2026-08-25.md`
- `docs/08-delivery/WARIBA_PHASE_3_3_EVIDENCE_RETIREMENT_AND_ARCHIVED_CARD_2026-08-26.md`
- `docs/08-delivery/WARIBA_PHASE_3_3_FINAL_CLOSURE_REPORT_2026-08-25.md`
- `docs/08-delivery/WARIBA_PHASE_3_3_LAST_BLOCKER_CLOSURE_2026-08-26.md`
- `docs/08-delivery/WARIBA_PHASE_3_3_OPERATOR_CLOSURE_REPORT_2026-08-24.md`
- `docs/09-prompts/WARIBA_PHASE_3_3_1_EVALUATION_TO_PERFORMANCE_HANDOFF_PROMPT.md`
- `docs/09-prompts/WARIBA_PHASE_3_3_1_LIFECYCLE_UX_REVIEW.md`
- `docs/09-prompts/WARIBA_PHASE_3_3_1_PERFORMANCE_ONBOARDING_REVIEW.md`
- `docs/09-prompts/WARIBA_Prompt_09_Completion_Record.md`
- `docs/09-prompts/WARIBA_Prompt_Pack_v1.0.md`
- `docs/08-delivery/WARIBA_Build_Plan_v1.0.md`
- `docs/00-decisions/WARIBA_PRODUCT_OS_V2_SELF_QA_AUDIT.md`
- `docs/08-delivery/WARIBA_PHASE_3_SOURCE_AUDIT.md`
- `docs/08-delivery/WARIBA_PHASE_3_GAP_CONTRACT.md`
- `docs/08-delivery/WARIBA_PRODUCT_OS_MASTER_IMPLEMENTATION_AUDIT_2026-08-23.md`
- `docs/08-delivery/WARIBA_Prompts_01_04_Audit_2026-08-03.md`
- `docs/08-delivery/WARIBA_Prompts_05_07B_Appendix_07A_Audit_2026-08-05.md`

### E — DEPRECATED/SUPERSEDED — 8 fichiers

Ils n’ont plus d’autorité pour un nouveau travail V2. Les deux copies Candidate V2 hors `docs/02-program` sont des doublons préexistants, non supprimés.

- `docs/01-product/WARIBA_Product_Master_Document_v1.0.md`
- `docs/01-product/WARIBA_Product_Master_Document_v1.1.md`
- `docs/02-program/WARIBA_Program_Rulebook_v1.0.md`
- `docs/02-program/WARIBA_Program_Rulebook_v1.1.md`
- `docs/02-program/WARIBA_RULESET_v1.0.json`
- `docs/02-program/WARIBA_RULESET_v1.1.json`
- `docs/00-decisions/WARIBA_Program_Rulebook_Candidate_V2.md`
- `docs/03-finance/WARIBA_Program_Rulebook_Candidate_V2.md`


## 3. Audit des domaines d’exécution

| Domaine | Vérité observée | Classification / conséquence |
|---|---|---|
| Policy DB | compte pin par UUID, hashes vérifiés à la lecture; aucune protection DB contre mutation de la ligne publiée | P0 immutabilité |
| Checkout/activation | consentement = semver texte; commande sans policy ID; activation re-resolve latest | P0 race/non-rétroactivité |
| Programmes | DB/types = WARIBA_ONE + WARIBA_PERFORMANCE | P0 FLEX/INSTANT |
| Risk | policy du compte lue; moteur paramétrique partiel; schémas V1 | foundation valide, propagation requise |
| Payout | cycle/idempotence/reconciliation solides | P0 car payout_debit entre dans la balance de risque |
| Marge | taux stockés mais non lus; gate réel en lots | P0 calibration/enforcement |
| News/weekend | booléens et UI; pas de calendrier serveur T−2/T+2 ou pré-clôture | P0 Order Gateway |
| WariX | snapshot serveur pour risk/leverage; marge surtout informative | implementation future |
| Hub | read models versionnés par compte | foundation à étendre aux trois programmes |
| Site/Help | mélange facts DB et hardcodes V1 | P1 vérité publique |
| Control | policy explorer read-only; deux programmes typés | foundation correcte, extension future |
| Finance | modèle candidat passe Stress, échoue Disaster; aucune donnée réalisée | support, jamais preuve de rentabilité |

## 4. Scan sémantique V1 — 78 occurrences / 30 fichiers

Le scan a été capturé avant les modifications Phase 3.4.1 avec des motifs
sémantiques ciblés : objectif/ML 10%, Best Day 50%, buffer 10%, split 85%,
`weekend_allowed=false` et marge 30/25. Chaque occurrence a exactement une
classification.

| Fichier | Occurrences | Classification |
|---|---:|---|
| `apps/web/app/(public)/offres/page.tsx` | 3 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `apps/web/app/(public)/page.tsx` | 4 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `apps/web/app/(public)/programme/page.tsx` | 4 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `apps/web/app/catalog/page.tsx` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `docs/00-decisions/DECISION_LOG.md` | 1 | `SUPERSEDED_NORMATIVE` |
| `docs/00-decisions/WARIBA_PRODUCT_OS_MASTER_CONSTITUTION_2026.md` | 2 | `SUPERSEDED_NORMATIVE` |
| `docs/00-decisions/WARIBA_Program_Rulebook_Candidate_V2.md` | 1 | `FALSE_POSITIVE` |
| `docs/01-product/WARIBA_Product_Master_Document_v1.1.md` | 2 | `SUPERSEDED_NORMATIVE` |
| `docs/02-program/WARIBA_Program_Rulebook_v1.1.md` | 1 | `SUPERSEDED_NORMATIVE` |
| `docs/02-program/WARIBA_RULESET_v1.0.json` | 2 | `SUPERSEDED_NORMATIVE` |
| `docs/02-program/WARIBA_RULESET_v1.1.json` | 2 | `SUPERSEDED_NORMATIVE` |
| `docs/03-finance/WARIBA_Actuarial_Risk_Model_v1.0.md` | 1 | `HISTORICAL` |
| `docs/03-finance/WARIBA_Program_Rulebook_Candidate_V2.md` | 1 | `FALSE_POSITIVE` |
| `docs/06-engineering/WARIBA_System_Architecture_v1.0.md` | 1 | `SUPERSEDED_NORMATIVE` |
| `docs/08-delivery/WARIBA_Build_Plan_v1.0.md` | 1 | `SUPERSEDED_NORMATIVE` |
| `docs/09-prompts/WARIBA_PHASE_3_3_1_EVALUATION_TO_PERFORMANCE_HANDOFF_PROMPT.md` | 1 | `HISTORICAL` |
| `docs/09-prompts/WARIBA_Prompt_09_Completion_Record.md` | 1 | `HISTORICAL` |
| `packages/application/src/commerce.ts` | 1 | `FALSE_POSITIVE` |
| `packages/application/src/offer-configuration.ts` | 1 | `FALSE_POSITIVE` |
| `packages/domain/tests/performance-math.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/policies/tests/hash.test.ts` | 5 | `FALSE_POSITIVE` |
| `packages/policies/tests/parity.test.ts` | 4 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/policies/tests/profit-eligibility-policy.test.ts` | 4 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/policies/tests/risk-engine.test.ts` | 6 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/policies/tests/schema.test.ts` | 9 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/test-utils/src/support-fixture.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `supabase/migrations/20260804000007_policy_symbol_specs_v1_1.sql` | 5 | `HISTORICAL` |
| `supabase/migrations/20260805060651_prompt_07b_program_eligibility.sql` | 4 | `HISTORICAL` |
| `supabase/migrations/20260807000000_performance_policy_and_activation.sql` | 4 | `HISTORICAL` |
| `supabase/migrations/20260807020000_performance_payout_engine.sql` | 4 | `HISTORICAL` |

Totaux : `HISTORICAL=20`,
`SUPERSEDED_NORMATIVE=12`,
`IMPLEMENTATION_TO_CHANGE_3_4_X=37`,
`FALSE_POSITIVE=9`, `VALID_V1=0`,
`UNCLASSIFIED=0`.

## 5. Scan prix V1/chevauchements — 103 occurrences / 58 fichiers

Le scan inclut les anciennes grilles et les nombres qui chevauchent
accidentellement V2 (par exemple 39 900). Les valeurs V2 ou simples exemples de
format sont `FALSE_POSITIVE`, pas des références V1 valides.

| Fichier | Occurrences | Classification |
|---|---:|---|
| `docs/00-decisions/DECISION_LOG.md` | 6 | `SUPERSEDED_NORMATIVE` |
| `docs/00-decisions/WARIBA_Program_Rulebook_Candidate_V2.md` | 5 | `FALSE_POSITIVE` |
| `docs/01-product/WARIBA_Product_Master_Document_v1.0.md` | 3 | `SUPERSEDED_NORMATIVE` |
| `docs/01-product/WARIBA_Product_Master_Document_v1.1.md` | 3 | `SUPERSEDED_NORMATIVE` |
| `docs/02-program/WARIBA_Program_Rulebook_v1.0.md` | 3 | `SUPERSEDED_NORMATIVE` |
| `docs/02-program/WARIBA_Program_Rulebook_v1.1.md` | 3 | `SUPERSEDED_NORMATIVE` |
| `docs/02-program/WARIBA_RULESET_v1.0.json` | 3 | `SUPERSEDED_NORMATIVE` |
| `docs/02-program/WARIBA_RULESET_v1.1.json` | 3 | `SUPERSEDED_NORMATIVE` |
| `docs/03-finance/WARIBA_Actuarial_Risk_Model_v1.0.md` | 4 | `HISTORICAL` |
| `docs/03-finance/WARIBA_Program_Rulebook_Candidate_V2.md` | 5 | `FALSE_POSITIVE` |
| `docs/03-finance/report-source.md` | 3 | `FALSE_POSITIVE` |
| `docs/05-design/WARIBA_Design_System_v1.0.md` | 1 | `FALSE_POSITIVE` |
| `docs/09-prompts/WARIBA_Prompt_Pack_v1.0.md` | 6 | `HISTORICAL` |
| `packages/application/tests/activation.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/application/tests/billing-summary.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/application/tests/evaluation-performance-handoff.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/application/tests/hub-read-models.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/application/tests/performance-mission-view.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/activation.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/actuarial-scenarios.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/actuarial-variance.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/control-accounts.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/control-financial.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/control-operations.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/control-users.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/daily-finalization.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/identity-commerce-rls.integration.test.ts` | 4 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/payouts-rls.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/payouts.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/pending-orders-alerts-rls.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/pending-orders.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/performance.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/position-protections.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/position-reduction-queue.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/realtime-leadership.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/risk-rls.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/risk.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/support-rls.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/support.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/trading-properties.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/trading-rls.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/trading.integration.test.ts` | 2 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/database/tests/treasury.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/domain/tests/actuarial-scenario.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/domain/tests/actuarial-variance.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/test-utils/src/hub-account-fixture.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/test-utils/src/lifecycle-fixture.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/test-utils/src/payout-account-fixture.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/test-utils/src/trade-account-fixture.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `packages/validation/tests/commerce.test.ts` | 3 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `services/realtime/scripts/load-test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `services/realtime/tests/auth-isolation.e2e.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `services/realtime/tests/multi-node-failover.e2e.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `services/realtime/tests/pending-order-lifecycle.e2e.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `services/realtime/tests/pending-order-restart-recovery.e2e.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `services/worker/tests/daily-finalization-job.integration.test.ts` | 1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `supabase/migrations/20260803000000_identity_commerce_activation.sql` | 3 | `HISTORICAL` |
| `supabase/migrations/20260803000002_commercial_pricing_v1_1.sql` | 3 | `HISTORICAL` |

Totaux : `HISTORICAL=16`,
`SUPERSEDED_NORMATIVE=24`,
`IMPLEMENTATION_TO_CHANGE_3_4_X=49`,
`FALSE_POSITIVE=14`, `VALID_V1=0`,
`UNCLASSIFIED=0`.

## 6. Réconciliation des contradictions

| Contradiction | Résolution |
|---|---|
| V1 10/3/10/50/10 vs V2 | V2 gouverne tout nouveau travail; V1 historique par compte |
| V1 prix ONE vs V2 15 lignes | grille V2 canonique; runtime V1 à changer ultérieurement |
| catalogue masqué par réserve | catalogue public 15/15 distinct du gate paid/activation |
| EA/bots autorisés dans le candidat initial | non supportés pendant pilote; absence ≠ fraude |
| copy propre automatisé autorisé | automatisé indisponible; décisions manuelles propres permises |
| payout debit dans risque | invariant V2 non-breach; P0 runtime |
| 20/15/10 présentés comme cap | CALIBRATION_REQUIRED, aucune promesse active |
| ADR-024 dit immutabilité garantie | intention acceptée, mais absence de guard DB = P0 factuel |
| loader latest par created_at vs effective_from | une seule résolution future; divergence P1 |
| Wave potentiellement disponible | promesse globale HOLD |

## 7. Conclusion d’audit

La vérité documentaire V2 est désormais univoque. La vérité d’exécution reste
V1 et présente cinq P0 avant pilote V2 : immutabilité/pinning, programmes et
catalogue, payout debit non-breach, marge/exposition, news/sessions. Les scans
ont zéro occurrence non classifiée. Aucune migration ni ligne runtime n’a été
modifiée.
