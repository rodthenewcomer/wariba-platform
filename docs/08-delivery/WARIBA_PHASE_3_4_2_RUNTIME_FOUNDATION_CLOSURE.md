# WARIBA Phase 3.4.2 — Runtime Foundation Closure

> Verdict : **PASS WITH ACTIONS**
> Date : 27 août 2026
> Branche : `feat/phase-3-4-2-runtime-foundation`
> Start SHA : `9dff986e5880130725a64866431ec8e3635f2a16`
> End SHA : `9dff986e5880130725a64866431ec8e3635f2a16` — aucun commit créé
> Norme : V2 seule source de vérité pour les nouvelles offres et futurs comptes; V1 conservée par policy historique épinglée

## 1. Résumé du travail

La fondation backend permet désormais de représenter simultanément V1 et V2
sans migration silencieuse des comptes. La migration additive crée les cinq
policies machine V2 et les quinze versions d’offre ONE/FLEX/INSTANT, tout en
laissant chaque offre V2 non achetable et non activable.

La chaîne de provenance conserve l’UUID et les hashes exacts de la policy du
consentement jusqu’au compte. Une policy publiée ou référencée et le pin d’un
compte sont immuables en base. FLEX possède une obligation/prix d’activation
figés pendant 30 jours et un enfant Performance unique. INSTANT provisionne
directement un compte Performance sans Evaluation artificielle.

Le modèle financier sépare balance compte, balance éligible programme et
balance ajustée risque. Un débit payout autorisé reste réel et réconciliable,
mais ne peut plus créer seul un soft lock ou breach; toute perte de trading
continue de compter intégralement. Les contrats leverage/marge/news/session
sont versionnés et fail-closed. La calibration 20/15/10 et les sources réelles
restent explicitement non prouvées, donc l’activation V2 publique reste
impossible.

## 2. Fichiers créés ou modifiés

### Migration et schéma

- `supabase/migrations/20260827153325_phase_3_4_2_policy_runtime_foundation.sql`
- `supabase/tests/database_assertions.test.sql`
- `packages/database/src/schema.ts`
- `packages/contracts/src/trading.ts`

### Policy, domaine et runtime backend

- `packages/policies/src/v2.ts`, `schema.ts`, `loader.ts`, `risk-engine.ts`, `index.ts`
- `packages/domain/src/margin-exposure.ts`, `trading-permissions.ts`, `performance-math.ts`, `index.ts`
- `packages/database/src/policy.ts`, `activation.ts`, `performance.ts`, `v2-provisioning.ts`
- `packages/database/src/program-eligibility.ts`, `risk.ts`, `daily-finalization.ts`
- `packages/database/src/payouts.ts`, `financial-reconciliation.ts`, `index.ts`
- `packages/application/src/canonical-offers.ts`, `commerce.ts`, `identity.ts`, `index.ts`
- `packages/application/src/accounts-list.ts`, `control-accounts-view.ts`, `risk-engine-inputs.ts`
- `packages/database/src/control-accounts.ts`, `control-contestations.ts`, `control-policies.ts`
- `services/realtime/src/market.ts`

### Tests

- `packages/policies/tests/v2.test.ts`, `risk-engine.test.ts`
- `packages/domain/tests/margin-exposure.test.ts`, `trading-permissions.test.ts`, `performance-math.test.ts`
- `packages/database/tests/program-eligibility.test.ts`, `v2-provisioning.integration.test.ts`, `payouts.integration.test.ts`
- fixtures de compatibilité : `packages/application/tests/hub-read-models.integration.test.ts`, `evaluation-performance-handoff.integration.test.ts`, `risk-view.test.ts`
- `packages/database/package.json`

### Documentation technique

- `docs/08-delivery/WARIBA_PHASE_3_4_2_RUNTIME_FOUNDATION_AUDIT.md`
- `docs/08-delivery/WARIBA_PHASE_3_4_2_RUNTIME_FOUNDATION_CLOSURE.md`
- `docs/06-engineering/WARIBA_RULE_SOURCE_OF_TRUTH_MAP_V2.md`
- `docs/06-engineering/WARIBA_PHASE_3_4_POLICY_BLAST_RADIUS.md`

Les changements documentaires Phase 3.4.1 déjà présents au démarrage sont
préservés. La suppression préexistante de
`docs/WARIBA_Actuarial_Risk_Model_v1.0.md` n’a pas été touchée.

## 3. Décisions appliquées

1. `POLICY-GOV-003` : V2 est normative pour toute nouvelle offre/compte V2;
   aucun compte V1 n’est repinné.
2. Les cinq policies V2 seedées sont `pilot_ready`, jamais `published`, et
   leurs dépendances externes restent non prêtes.
3. Les quinze offres appartiennent au catalogue technique même lorsque les
   gates acquisition/activation sont false.
4. La policy Performance est choisie par lien Evaluation → Performance exact.
5. Le prix FLEX upfront, activation et total est copié dans les commandes et
   ne dépend plus d’un prix futur.
6. INSTANT crée Performance directement; aucune Evaluation INSTANT n’existe.
7. Seules les écritures payout/reversal payout sont neutralisées dans la
   projection risque; aucun autre ledger loss n’est neutralisé.
8. Les caps marge candidats ne deviennent pas normatifs sans décision owner.
9. Une donnée news/session absente ne crée aucune sanction rétroactive; elle
   bloque l’activation V2 qui la requiert.
10. Aucun chiffre V2 n’a été ajouté aux composants frontend.

## 4. Tests exécutés

| Gate | Commande / preuve | Résultat exact |
|---|---|---|
| Fresh DB | `pnpm db:reset` | zero → latest, migration 3.4.2 et seed appliqués |
| Existing V1 DB | reset à `20260825002714`, création compte V1, `supabase migration up --local` | UUID/hash/policy `1.1.1` conservés; 10/3/10/50 inchangés; 15 offres V2 ajoutées |
| pgTAP | `pnpm db:test` | 1 fichier, 40/40 tests PASS |
| Unit | `pnpm test:unit` | 16 tâches, 1 587 tests passés, 10 skips DB-optionnels |
| Property | tests générés domain/database | 3 invariants, 15 000 scénarios déterministes passés |
| DB integration smoke | package database | 6 fichiers, 49/49 tests |
| Application integration | package application | 10 fichiers, 57/57 tests |
| Worker integration | package worker | 1 fichier, 1/1 test |
| Lifecycle V2 ciblé | `v2-provisioning.integration.test.ts` | 3/3 : INSTANT, FLEX paid/exactly-once, FLEX expired |
| Daily/trading properties ciblés | finalisation + invariants DB | 2 fichiers, 13/13 tests |
| RLS full | `pnpm test:rls:full` | 9 fichiers, 68/68 tests |
| Lint | `pnpm lint` | 16/16 tâches |
| Typecheck | `pnpm typecheck` | 15 packages sans erreur |
| Boundaries | `pnpm boundaries:check` | aucune violation |
| Secrets | `pnpm secrets:scan` | aucun match |
| Build | `pnpm build` | 4/4 tâches; Next 105 pages; warning `<img>` baseline uniquement |
| Fast gate agrégé | `pnpm test:fast` | arrêté par `format:check` sur 4 fichiers baseline hors scope; tous les sous-gates restants exécutés séparément et verts |

Le premier smoke d’intégration a exposé une collision entre les deux clés
d’idempotence du consentement et deux fixtures qui tentaient de contourner le
nouveau pin. La racine et les fixtures ont été corrigées, puis le même groupe
complet a été relancé vert.

## 5. Résultats exacts

```text
V1_V2_COEXISTENCE_READY = yes
PUBLISHED_POLICY_IMMUTABLE = yes
ACCOUNT_POLICY_PINNING_READY = yes
SILENT_POLICY_MIGRATION = 0

ONE_OFFERS = 5
FLEX_OFFERS = 5
INSTANT_OFFERS = 5
TOTAL_OFFERS = 15

FLEX_PERFORMANCE_BEFORE_ACTIVATION_PAYMENT = impossible
FLEX_PERFORMANCE_EXACTLY_ONCE = yes
INSTANT_DIRECT_PERFORMANCE_READY = yes
FAKE_EVALUATION_CREATED_FOR_INSTANT = 0

ACCOUNT_PNL_SEPARATED_FROM_ELIGIBLE_PNL = yes
SHORT_WIN_ACCOUNT_PNL_COUNTS = yes
SHORT_WIN_ELIGIBLE_PNL_COUNTS = no
ALL_LOSSES_COUNT = yes
PARTIAL_CLOSE_ELIGIBILITY_CORRECT = yes

PAYOUT_DEBIT_CAN_CAUSE_BREACH_BY_ITSELF = no
REAL_TRADING_LOSS_CAN_CAUSE_BREACH = yes
RECONCILIATION_DELTA = 0

MARGIN_CALIBRATION_COMPLETE = no
20_15_10_VALIDATED = no
OWNER_DECISION_REQUIRED = yes

NEWS_POLICY_CONTRACT_READY = yes
REAL_NEWS_PROVIDER_READY = no
MARKET_SESSION_CONTRACT_READY = yes
REAL_MARKET_SESSION_PROVIDER_READY = no

NEW_TABLES_RLS_REVIEWED = yes
ANON_FINANCIAL_ACCESS_ADDED = 0
AUTHENTICATED_CROSS_USER_ACCESS = 0
```

Les cinq hashes V2 seedés et vérifiés sont :

- ONE Evaluation : `sha256:2df974ac9d497d9b928d61725f8539e492f5514f51b6510dfc43796c2dd09fb6`
- FLEX Evaluation : `sha256:f3a2347cf9beaffaf9293fc39158da74b05aa5eaba1f650ed59e5bcadfc89051`
- ONE Performance : `sha256:248f59456d036513f59f6a8809e73f5c74af5460e7275f074b6785a583e1f098`
- FLEX Performance : `sha256:f42d637e6ba2714b94e3ff9aee13410a50deda2e56664c0850d302ddea3c05e6`
- INSTANT Performance : `sha256:f1e8b4413af408f3c914822566dd0ea88c25c7301be7d48510ec0527867f89b4`

## 6. Risques ou limites

- `MARGIN_CALIBRATION_READY = no`. US30, énergie, stop-distance, gaps,
  corrélations et données cohorte manquent. La recommandation courante reste
  `20/15/10 = CALIBRATION_REQUIRED`, pas une limite active.
- `REAL_NEWS_PROVIDER_READY = no` et `REAL_SESSION_SOURCE_READY = no`.
- Les gates réserve/quota, notamment INSTANT 50K/100K, restent false.
- Le moteur de capability marge/news/session n’est pas relié à un compte V2
  actif puisque l’activation est volontairement impossible; ce raccordement
  et le Risk/Lifecycle V2 exhaustif appartiennent à Phase 3.4.3.
- Aucun grand E2E navigateur, audit visuel ou certification exhaustive n’était
  requis avant la propagation WariX/Hub.
- `format:check` reste rouge sur quatre fichiers non modifiés par cette phase :
  `apps/web/app/(auth)/layout.tsx`, `apps/web/app/(platform)/layout.tsx`,
  `packages/application/tests/lifecycle-timestamp-consistency.integration.test.ts`
  et `packages/test-utils/src/hub-account-fixture.ts`. Ils ont été préservés.

## 7. Décisions encore ouvertes

1. Owner : confirmer ou remplacer 20/15/10 après données instrument/risque.
2. Choisir et contractualiser le provider news réel.
3. Choisir et versionner la source market sessions/closures réelle.
4. Définir réserve/quota d’activation par offre, surtout INSTANT 50K/100K.
5. Définir la remediation Support après expiration FLEX; le pass reste
   aujourd’hui préservé et le provisioning est refusé.

## 8. Commandes de vérification

```bash
PATH=/Users/rodrigueadebigni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm db:reset
PATH=/Users/rodrigueadebigni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm db:test
PATH=/Users/rodrigueadebigni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm test:unit
PATH=/Users/rodrigueadebigni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm test:integration:smoke
PATH=/Users/rodrigueadebigni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm test:rls:full
PATH=/Users/rodrigueadebigni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm test:fast
PATH=/Users/rodrigueadebigni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm build
```

## 9. Proposition de PR

Aucune PR n’a été créée, conformément au scope. Proposition future :

```text
feat: establish canonical V2 policy runtime foundation
```

Scope PR proposé : migration additive, policy/pinning/catalogue, lifecycle
FLEX/INSTANT, projections payout-neutral, contracts marge/news/session, tests et
documents techniques. Rollback : conserver tous les gates V2 à false et, si
une correction DB est requise, ajouter une migration compensatrice; ne jamais
réécrire ni supprimer les preuves/policies déjà référencées.

## 10. Statut

`PASS WITH ACTIONS`

La fondation est prête pour la revue propriétaire puis Phase 3.4.3. Elle n’est
pas une autorisation d’acheter, d’activer ou d’exposer publiquement V2.

## Conseil simulé — 35 rôles

```text
Founder / CEO = PASS WITH ACTIONS
Head of Product = PASS
ONE Product Owner = PASS
FLEX Product Owner = PASS
INSTANT Product Owner = PASS
Chief Risk Officer = PASS WITH ACTIONS
Head of Trading Risk = PASS WITH ACTIONS
Market Risk = PASS WITH ACTIONS
Quant / Risk Engineer = PASS WITH ACTIONS
Prop Operations = PASS
Payout Risk = PASS
Treasury = PASS WITH ACTIONS
CFO = PASS WITH ACTIONS
Actuarial = PASS WITH ACTIONS
Pricing = PASS
Payments = PASS WITH ACTIONS
AML/KYC = PASS WITH ACTIONS
Fraud = PASS WITH ACTIONS
Consumer Legal = PASS WITH ACTIONS
Compliance = PASS WITH ACTIONS
Backend Architect = PASS
PostgreSQL/Supabase Architect = PASS
Distributed Systems Engineer = PASS
Security = PASS
RBAC/Authz = PASS
Finance/Ledger Engineer = PASS
Reconciliation Engineer = PASS
WariX Architect = PASS WITH ACTIONS
Trader Hub Architect = PASS WITH ACTIONS
Product Analytics = PASS WITH ACTIONS
Observability = PASS WITH ACTIONS
SRE = PASS WITH ACTIONS
QA Lead = PASS
Property-Based Testing Engineer = PASS
Independent Red-Team Auditor = PASS WITH ACTIONS
```

## Recap obligatoire

```text
PHASE_3_4_2_RUNTIME_FOUNDATION_READY = yes

START_SHA = 9dff986e5880130725a64866431ec8e3635f2a16
END_SHA = 9dff986e5880130725a64866431ec8e3635f2a16

POLICY_RUNTIME_AUDIT_READY = yes
POLICY_RUNTIME_AUDIT_PATH = docs/08-delivery/WARIBA_PHASE_3_4_2_RUNTIME_FOUNDATION_AUDIT.md

V1_V2_COEXISTENCE_READY = yes
PUBLISHED_POLICY_IMMUTABLE = yes
ACCOUNT_POLICY_PINNING_READY = yes
V1_ACCOUNTS_CHANGED = no

TOTAL_V2_OFFERS_RUNTIME = 15

ONE_5K_READY = yes
ONE_10K_READY = yes
ONE_25K_READY = yes
ONE_50K_READY = yes
ONE_100K_READY = yes

FLEX_5K_READY = yes
FLEX_10K_READY = yes
FLEX_25K_READY = yes
FLEX_50K_READY = yes
FLEX_100K_READY = yes

INSTANT_5K_READY = yes
INSTANT_10K_READY = yes
INSTANT_25K_READY = yes
INSTANT_50K_READY = yes
INSTANT_100K_READY = yes

FLEX_PRICE_SNAPSHOT_READY = yes
FLEX_ACTIVATION_LIFECYCLE_READY = yes
FLEX_PERFORMANCE_EXACTLY_ONCE = yes

INSTANT_DIRECT_PERFORMANCE_READY = yes
INSTANT_FAKE_EVALUATION_COUNT = 0

ACCOUNT_PNL_VS_ELIGIBLE_PNL_READY = yes
SIXTY_SECOND_RULE_READY = yes
PARTIAL_CLOSE_ELIGIBILITY_READY = yes

PAYOUT_DEBIT_NEUTRALITY_READY = yes
PAYOUT_DEBIT_CAN_TRIGGER_BREACH_BY_ITSELF = no
REAL_TRADING_LOSS_STILL_BREACHES = yes
FINANCIAL_RECONCILIATION_DELTA = 0

MARGIN_EXPOSURE_CALIBRATION_READY = no
CURRENT_MARGIN_CAP_RECOMMENDATION = 20/15/10 CALIBRATION_REQUIRED; no active cap recommendation
OWNER_MARGIN_DECISION_REQUIRED = yes

LEVERAGE_BY_ASSET_POLICY_READY = yes

NEWS_POLICY_CONTRACT_READY = yes
REAL_NEWS_PROVIDER_READY = no
NEWS_PROVIDER_BLOCKER = provider not selected or versioned

MARKET_SESSION_CONTRACT_READY = yes
REAL_SESSION_SOURCE_READY = no

NEW_MIGRATIONS = 1
NEW_TABLES = 8
RLS_TESTS = 68 integration tests plus 2 pgTAP RLS/grant assertions
PROPERTY_TESTS = 3 generated invariants / 15000 deterministic scenarios
INTEGRATION_TESTS = 120 tests: 107 smoke plus 13 daily/trading property integrations
DB_TESTS = 40 pgTAP assertions plus fresh and V1-upgrade migration proofs

UNIT_TEST_RESULT = PASS — 1587 passed, 10 optional DB-dependent skipped
PROPERTY_TEST_RESULT = PASS — 15000/15000 generated scenarios
DB_TEST_RESULT = PASS — 40/40
INTEGRATION_TEST_RESULT = PASS — 120/120
RLS_TEST_RESULT = PASS — 68/68 plus DB privilege assertions

V1_REGRESSION_RESULT = PASS — UUID/hash/policy 1.1.1 and 10/3/10/50 preserved through upgrade

RUNTIME_FRONTEND_FILES_CHANGED = 0
WARIX_FILES_CHANGED = 0
HUB_FILES_CHANGED = 0
PUBLIC_SITE_FILES_CHANGED = 0

PILOT_V2_PUBLICLY_ENABLED = no
PUSHED = no
PR_CREATED = no
DEPLOYED = no

P0_BLOCKERS_REMAINING = margin calibration; real news provider; real session source; offer reserve/quota gates
P1_ITEMS_DEFERRED = Risk/Lifecycle V2 exhaustive; realtime DTO; WariX/Hub/checkout/site/Help propagation; providers/KYC/rails/observability

35_ROLE_COUNCIL:
Founder / CEO = PASS WITH ACTIONS
Head of Product = PASS
ONE Product Owner = PASS
FLEX Product Owner = PASS
INSTANT Product Owner = PASS
Chief Risk Officer = PASS WITH ACTIONS
Head of Trading Risk = PASS WITH ACTIONS
Market Risk = PASS WITH ACTIONS
Quant / Risk Engineer = PASS WITH ACTIONS
Prop Operations = PASS
Payout Risk = PASS
Treasury = PASS WITH ACTIONS
CFO = PASS WITH ACTIONS
Actuarial = PASS WITH ACTIONS
Pricing = PASS
Payments = PASS WITH ACTIONS
AML/KYC = PASS WITH ACTIONS
Fraud = PASS WITH ACTIONS
Consumer Legal = PASS WITH ACTIONS
Compliance = PASS WITH ACTIONS
Backend Architect = PASS
PostgreSQL/Supabase Architect = PASS
Distributed Systems Engineer = PASS
Security = PASS
RBAC/Authz = PASS
Finance/Ledger Engineer = PASS
Reconciliation Engineer = PASS
WariX Architect = PASS WITH ACTIONS
Trader Hub Architect = PASS WITH ACTIONS
Product Analytics = PASS WITH ACTIONS
Observability = PASS WITH ACTIONS
SRE = PASS WITH ACTIONS
QA Lead = PASS
Property-Based Testing Engineer = PASS
Independent Red-Team Auditor = PASS WITH ACTIONS

FINAL_RECOMMENDATION = READY_FOR_PHASE_3_4_3_RISK_AND_LIFECYCLE_IMPLEMENTATION
```
