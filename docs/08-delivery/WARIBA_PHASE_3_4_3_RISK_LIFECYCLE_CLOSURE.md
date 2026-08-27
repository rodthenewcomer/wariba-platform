# WARIBA Phase 3.4.3 — Risk Engine V2, Lifecycle, Performance & Payout Closure

> Verdict : **READY WITH EXTERNAL ACTIVATION BLOCKERS**
> Date : 27 août 2026
> Branche : `feat/phase-3-4-2-runtime-foundation`
> Start SHA : `9dff986e5880130725a64866431ec8e3635f2a16`
> End SHA : `9dff986e5880130725a64866431ec8e3635f2a16` — aucun commit créé
> Norme : `POLICY-GOV-003` + Canonical Policy Contract V2; V1 conservée par policy historique épinglée

## 1. Ce que cette phase a rendu exécutable

Phase 3.4.2 avait rendu V1 et V2 représentables. Phase 3.4.3 rend les règles
financières et lifecycle V2 exécutables de bout en bout côté serveur, sur un
moteur unique piloté par la policy attachée au compte. Aucune branche
`if (product === 'FLEX')` n'a été introduite : les trois familles diffèrent
uniquement par leurs paramètres.

Cinq chantiers ont été livrés.

**Chaîne pré-trade unique.** Les moteurs marge et permission news/session
existaient depuis 3.4.2 mais n'étaient appelés par aucun chemin d'ordre. Ils
sont désormais composés dans `packages/database/src/v2-pre-trade.ts` et
appelés par l'Order Gateway. La chaîne applique, dans l'ordre : session
marché, news, levier par asset group, marge, puis l'état daily/Maximum Loss
vivant du compte. Elle rend un seul ALLOW/DENY avec un reason code canonique.
Un compte épinglé à une policy V1 reçoit `applicable: false` et conserve
exactement les gates avec lesquels il a été livré.

**Neutralité payout jusqu'aux règles de jour.** 3.4.2 neutralisait le débit
payout dans la projection de risque. Il restait un trou : Best Day et
Performance Days lisaient le chiffre éligible brut, donc un payout autorisé
tombant un jour où le trader avait gagné rendait ce jour négatif, le sortait
du dénominateur des jours positifs, gonflait le ratio Best Day et pouvait
bloquer le payout suivant. La résolution du profit du jour est maintenant
unique (`resolveRuleDailyProfit`) et pilotée par le drapeau de policy
`payout_debit_risk_neutral`, absent de toute policy V1.

**Calibration marge exécutée.** Le blocker `20/15/10 CALIBRATION_REQUIRED`
est traité, pas reporté. Le calcul manuel de la V1 du document a été porté
dans `packages/domain/src/margin-calibration.ts`, dérivé des specs
réellement seedées. Résultat sur 75 cellules : zéro infaisable, deux
cellules contraintes (5K INSTANT sur XAUUSD et NAS100, deux positions
minimales au lieu de trois), US30 toujours sans prix versionné.

**Preuves lifecycle manquantes.** La non-réutilisation d'un Performance Day
entre deux cycles de payout, la permanence du buffer, la fermeture des
cycles 1 à 5 vers exactement une WARIBA Review, et la concurrence de
finalisation sont désormais prouvées contre la base réelle.

**Registre de reason codes.** `packages/policies/src/reason-codes.ts`
consolide l'inventaire du Canonical Contract V2 §10 et mappe les
vocabulaires historiques persistés sans jamais les renommer.

## 2. Fichiers créés ou modifiés

### Créés

- `packages/policies/src/reason-codes.ts`
- `packages/policies/tests/v1-v2-engine-regression.test.ts`
- `packages/policies/tests/risk-lifecycle-invariants.property.test.ts`
- `packages/domain/src/margin-calibration.ts`
- `packages/domain/tests/margin-calibration.test.ts`
- `packages/database/src/v2-pre-trade.ts`
- `packages/database/tests/risk-lifecycle-v2.integration.test.ts`
- `packages/observability/src/risk-lifecycle-metrics.ts`
- `packages/observability/tests/risk-lifecycle-metrics.test.ts`

### Modifiés

- `packages/policies/src/risk-engine.ts`, `index.ts`
- `packages/domain/src/index.ts`, `tests/profit-eligibility.test.ts`
- `packages/database/src/risk.ts`, `performance.ts`, `trading.ts`, `index.ts`
- `packages/database/package.json` — le nouveau fichier d'intégration entre
  dans les gates `smoke` et `full`, il ne reste pas orphelin
- `packages/observability/src/index.ts`

### Documentation

- `docs/03-finance/WARIBA_MARGIN_EXPOSURE_CALIBRATION_V1.md` — §12 et §13
- `docs/06-engineering/WARIBA_RULE_SOURCE_OF_TRUTH_MAP_V2.md`
- `docs/06-engineering/WARIBA_PHASE_3_4_POLICY_BLAST_RADIUS.md`
- ce rapport

Aucune migration créée. Aucun fichier WariX, Hub, checkout ou site public
touché. Les suppressions préexistantes du worktree n'ont pas été restaurées.

## 3. Décisions appliquées

1. La chaîne pré-trade V2 est réservée aux comptes épinglés V2. §82 (« V1 ne
   change pas ») prime sur la commodité d'un chemin de code unique.
2. La résolution payout-neutral du profit du jour est pilotée par un
   paramètre de policy, jamais par le nom du produit. Une policy V1, qui ne
   porte pas ce drapeau, lit exactement le chiffre qu'elle lisait avant.
3. Le plancher Maximum Loss reste calculé sur le plus haut solde EOD ajusté
   risque, donc un payout ne peut ni le faire monter ni provoquer un breach.
4. La calibration produit une recommandation et un verdict, jamais un cap
   verrouillé en silence. `calibration_status` reste `calibration_required`.
5. Le plafond d'exposition brute recommandé n'est pas ajouté aux policies V2
   seedées : le Canonical Contract V2 §8 interdit d'éditer une version
   publiée, il faudra une nouvelle version en 3.4.4.
6. Aucun reason code existant n'a été renommé; ils sont mappés.
7. Aucune donnée news ou session n'a été fabriquée. Une source absente refuse
   l'augmentation d'exposition et laisse toujours réduire et fermer.

## 4. Constat ouvert — `pass_pending` sur les comptes V1

Le câblage de la chaîne pré-trade a exposé un comportement V1 qui mérite une
décision propriétaire.

Dans `evaluateAccountRisk`, l'ordre de recommandation est breach, puis
`pass_pending`, puis `soft_locked`. Un compte Evaluation qui atteint son
objectif **et** franchit son plancher quotidien dans la même évaluation est
donc recommandé `pass_pending` plutôt que `soft_locked`. Or
`openPositionInTransaction` autorise l'ouverture de position en `active`
**et** en `pass_pending`. Un compte V1 dans cette configuration peut donc
continuer à ouvrir de l'exposition le jour même, malgré une violation Daily
Loss enregistrée dans `app.risk_violations`.

La preuve de la violation est bien écrite; c'est l'effet de pause qui est
contourné. Pour les comptes V2 la chaîne pré-trade ferme le trou : elle
refuse toute augmentation d'exposition avec `DAILY_LOSS_SOFT_LOCKED` dès que
le plancher quotidien est franchi, quel que soit le statut. Pour les comptes
V1 le comportement est laissé inchangé, conformément à §82.

```text
V1_PASS_PENDING_EXPOSURE_GAP = confirmé
SÉVÉRITÉ                     = P1 (la preuve existe, la pause est contournée)
CORRECTIF V2                 = livré
CORRECTIF V1                 = OWNER_DECISION_REQUIRED
```

Recommandation : étendre la garde pré-trade aux comptes V1 en 3.4.4. C'est un
changement de comportement V1 observable et il n'appartient pas à cette phase
de le décider.

## 5. Calibration marge — résultat

```text
cellules évaluées           = 75  (5 tailles × 3 profils × 5 instruments)
cellules infaisables        = 0
cellules « minimum seul »   = 2   (5K INSTANT XAUUSD, 5K INSTANT NAS100)
symboles OPEN_CALIBRATION   = US30
```

Le constat déterminant n'est pas la faisabilité mais la sensibilité. À la
quantité maximale autorisée par le cap Evaluation 20 %, un mouvement adverse
de 1 % sur EURUSD coûte 3,35 fois le budget daily complet. Le cap de marge
borne le collatéral, pas le coût d'un mouvement.

Le garde-fou dérivé, testé, est un plafond d'exposition brute :

```text
notional / nominal <= daily_loss_rate / mouvement_adverse
ONE / FLEX (3%)  -> 3,00 × nominal
INSTANT    (2%)  -> 2,00 × nominal
```

Détail complet en `docs/03-finance/WARIBA_MARGIN_EXPOSURE_CALIBRATION_V1.md`
§12–13.

## 6. Tests exécutés

| Gate                | Commande                                | Résultat exact                              |
| ------------------- | --------------------------------------- | ------------------------------------------- |
| Unit                | `pnpm test:unit`                        | 16/16 tâches; 1 646 tests, 10 skips optionnels |
| Property            | policies + domain                       | 6 invariants générés; 26 000 scénarios déterministes |
| pgTAP               | `pnpm db:test`                          | 1 fichier, 40/40 PASS                        |
| DB integration      | `test:integration:full` (database)      | 27 fichiers, 226/226                         |
| Application         | `test:integration` (application)        | 10 fichiers, 57/57                           |
| Worker              | `test:integration` (worker)             | 1 fichier, 1/1                               |
| Risk/lifecycle 3.4.3| `risk-lifecycle-v2.integration.test.ts` | 10/10                                        |
| RLS                 | `pnpm test:rls:full`                    | 9 fichiers, 68/68                            |
| Lint                | `pnpm lint`                             | 16/16 tâches                                 |
| Typecheck           | `pnpm typecheck`                        | 16/16 tâches                                 |
| Boundaries          | `pnpm boundaries:check`                 | aucune violation                             |
| Secrets             | `pnpm secrets:scan`                     | aucun match                                  |
| Build               | `pnpm build`                            | 4/4 tâches                                   |
| Format              | `pnpm format:check`                     | rouge sur les **4 mêmes fichiers** baseline  |

Les quatre échecs `format:check` sont exactement ceux hérités de 3.4.2 :
`apps/web/app/(auth)/layout.tsx`, `apps/web/app/(platform)/layout.tsx`,
`packages/application/tests/lifecycle-timestamp-consistency.integration.test.ts`
et `packages/test-utils/src/hub-account-fixture.ts`. Aucun fichier de cette
phase n'y figure; ils n'ont pas été reformatés pour ne pas mêler un lot de
formatage au lot financier (§68).

Deux corrections réelles sont survenues pendant le développement, toutes deux
dans les fixtures de test et non dans le produit : un snapshot quotidien exige
`policy_version_id`, et l'entrée de ledger `initial_balance` d'un compte créé
aujourd'hui doit être antidatée avant une transaction datée d'hier, faute de
quoi la projection de frontière voit le fill sans le capital d'ouverture.

## 7. Preuves de non-régression V1

`packages/policies/tests/v1-v2-engine-regression.test.ts` épingle les
**résultats du moteur**, pas seulement la ligne de policy : cible 10 %,
plancher quotidien à 3 % du nominal, breach à 10 %, Best Day accepté jusqu'à
50 %, et absence de pass pour une policy Performance V1. Le test de propriété
ajoute une preuve d'indépendance : pour 4 000 séquences générées, un compte
V1 produit des résultats identiques que les colonnes de projection V2 soient
présentes ou absentes.

Les suites d'intégration V1 existantes (risk, performance, payouts,
daily-finalization, trading) passent sans modification.

## 8. Risques et limites

- `REAL_NEWS_PROVIDER_READY = no` et `REAL_SESSION_SOURCE_READY = no`. La
  matrice est câblée et testée; aucune source réelle n'existe.
- Le cap de marge attend une décision propriétaire, et le plafond
  d'exposition brute recommandé exigera une nouvelle version de policy.
- Les gates réserve/quota, notamment INSTANT 50K/100K, restent false.
- Le trou d'exposition `pass_pending` sur V1 reste ouvert par décision (§4).
- Aucun E2E navigateur n'a été exécuté : cette phase ne livre aucun frontend.
- La calibration prouve une condition nécessaire. Sans distances de stop,
  gaps et corrélations réelles, elle ne prouve pas la suffisance.

## 9. Recap obligatoire

```text
PHASE_3_4_3_RISK_LIFECYCLE_READY = yes

START_SHA = 9dff986e5880130725a64866431ec8e3635f2a16
END_SHA = 9dff986e5880130725a64866431ec8e3635f2a16

ONE_V2_RISK_EXECUTABLE = yes
FLEX_V1_RISK_EXECUTABLE = yes
INSTANT_V1_RISK_EXECUTABLE = yes

DAILY_SOFT_LOCK_READY = yes
MAXIMUM_LOSS_EOD_READY = yes
BEST_DAY_READY = yes
TARGET_ELIGIBLE_PNL_READY = yes

ONE_PASS_PENDING_READY = yes
ONE_PERFORMANCE_EXACTLY_ONCE = yes

FLEX_PASS_TO_ACTIVATION_READY = yes
FLEX_PERFORMANCE_AFTER_ACTIVATION_ONLY = yes
FLEX_PERFORMANCE_EXACTLY_ONCE = yes

INSTANT_DIRECT_PERFORMANCE_READY = yes
INSTANT_FAKE_EVALUATIONS_CREATED = 0

PERFORMANCE_DAYS_READY = yes
PERFORMANCE_DAY_NON_REUSE_PROVEN = yes

ONE_BUFFER_READY = yes
FLEX_BUFFER_READY = yes
INSTANT_BUFFER_READY = yes

PAYOUT_SPLITS_READY = yes
PAYOUT_CAP_LADDERS_READY = yes
PAYOUT_CYCLE_LIMIT_READY = yes
WARIBA_REVIEW_AFTER_5_READY = yes

PAYOUT_DEBIT_NEUTRALITY_FULL_RISK_PROOF = yes
PAYOUT_DEBIT_CAN_TRIGGER_BREACH = no
REAL_TRADING_LOSS_CAN_TRIGGER_BREACH = yes
FINANCIAL_RECONCILIATION_DELTA = 0

SIXTY_SECOND_FULL_INTEGRATION_READY = yes
59999MS_WIN_ELIGIBLE = no
60000MS_WIN_ELIGIBLE = yes
60001MS_WIN_ELIGIBLE = yes
SHORT_LOSS_COUNTS = yes
PARTIAL_CLOSE_READY = yes

MARGIN_EXPOSURE_CALIBRATION_READY = yes
20_15_10_VALIDATED = yes as a margin cap; no as a risk bound
MARGIN_RECOMMENDATION = keep 20/15/10 as the margin cap and add a gross-notional cap of 3.00x nominal for ONE/FLEX and 2.00x for INSTANT
OWNER_MARGIN_DECISION_REQUIRED = yes

LEVERAGE_BY_ASSET_ENFORCED = yes

NEWS_RULE_ENGINE_READY = yes
REAL_NEWS_PROVIDER_READY = no
NEWS_PUBLIC_ACTIVATION_BLOCKER = provider not selected or versioned

MARKET_SESSION_RULE_ENGINE_READY = yes
REAL_SESSION_SOURCE_READY = no
SESSION_PUBLIC_ACTIVATION_BLOCKER = session calendar source not selected or versioned

V1_POLICY_REGRESSION = none
V1_ENGINE_RESULT_REGRESSION = none

UNIT_TESTS = PASS — 1646 passed, 10 optional skipped
PROPERTY_TESTS = PASS — 6 invariants / 26000 deterministic scenarios
DB_TESTS = PASS — 40/40 pgTAP
INTEGRATION_TESTS = PASS — 284/284 (226 database, 57 application, 1 worker)
RLS_TESTS = PASS — 68/68
CONCURRENCY_TESTS = PASS — duplicate finalization, duplicate cycle close, duplicate provisioning

FORMAT_CHECK = FAIL — 4 pre-existing baseline files, none from this phase
FORMAT_CHECK_PREEXISTING_FAILURES = 4

NEW_MIGRATIONS = 0
NEW_TABLES = 0
FILES_CHANGED = 19 (9 created, 10 modified) plus 4 documents

WARIX_FILES_CHANGED = 0
HUB_RUNTIME_FILES_CHANGED = 0
CHECKOUT_UI_FILES_CHANGED = 0
PUBLIC_SITE_FILES_CHANGED = 0

PILOT_V2_PUBLICLY_ENABLED = no

P0_BLOCKERS_REMAINING = real news provider; real session source; offer reserve/quota gates
P1_DEFERRED = V1 pass_pending exposure gap; gross-notional cap policy version; WariX/Hub/checkout/site propagation; KYC and payout rail providers; metric exporter wiring

45_ROLE_COUNCIL:
Founder/CEO = PASS WITH ACTIONS
Head of Product = PASS
ONE Product Owner = PASS
FLEX Product Owner = PASS
INSTANT Product Owner = PASS WITH ACTIONS
Chief Risk Officer = PASS WITH ACTIONS
Head of Trading Risk = PASS WITH ACTIONS
Quant Risk Engineer = PASS WITH ACTIONS
Market Risk = PASS WITH ACTIONS
Prop Operations = PASS
Professional Trader = PASS WITH ACTIONS
Funded Trader = PASS
Payout Risk = PASS
Treasury = PASS
CFO = PASS WITH ACTIONS
Actuarial = PASS WITH ACTIONS
Pricing = PASS
Finance Operations = PASS
Ledger Engineer = PASS
Reconciliation Engineer = PASS
Payments = PASS
Fraud = PASS
AML/KYC = PASS WITH ACTIONS
Compliance = PASS WITH ACTIONS
Consumer Legal = PASS WITH ACTIONS
Backend Architect = PASS
PostgreSQL/Supabase Architect = PASS
Distributed Systems Engineer = PASS
Security = PASS
RBAC/Authz = PASS
Realtime Architect = PASS WITH ACTIONS
Market Data Engineer = PASS WITH ACTIONS
WariX Architect = PASS WITH ACTIONS
Trader Hub Architect = PASS WITH ACTIONS
Product Analytics = PASS WITH ACTIONS
Observability = PASS WITH ACTIONS
SRE = PASS WITH ACTIONS
QA Lead = PASS
Property-Based Testing Engineer = PASS
E2E/Test Automation = PASS WITH ACTIONS
Accessibility representative = PASS
French UX Writer = PASS
Customer Advocate = PASS WITH ACTIONS
Responsible Marketing = PASS
Independent Red-Team Auditor = PASS WITH ACTIONS

FINAL_RECOMMENDATION = READY_FOR_PHASE_3_4_4_PLATFORM_PROPAGATION with OWNER_DECISION_REQUIRED on the margin cap, the gross-notional bound and the V1 pass_pending gap

PUSHED = no
PR_CREATED = no
DEPLOYED = no
```

## 10. Objectif final vérifié (§87)

Preuve : `packages/policies/tests/v1-v2-engine-regression.test.ts`, bloc
« §87 — three accounts, three rulebooks, one engine ». ONE 100K, FLEX 50K et
INSTANT 25K y traversent le même scénario. La seule chose qui change entre
les trois colonnes est l'objet policy passé à la même fonction; aucun code ne
sélectionne un comportement par nom de produit.

Résultats épinglés par le test :

| | ONE 100K | FLEX 50K | INSTANT 25K |
|---|---:|---:|---:|
| Cible éligible | 8 000,00 | 2 000,00 | aucune |
| Plancher quotidien | 97 000,00 | 48 500,00 | 24 500,00 |
| Plancher Maximum Loss initial | 92 000,00 | 47 000,00 | 23 750,00 |
| Limite Best Day | 35 % | 35 % | 30 % |
| Verdict sur une perte de 5,5 % | `soft_locked` | `soft_locked` | `breached` |

La dernière ligne est la démonstration la plus directe : la même perte
relative met deux comptes en pause et en termine un troisième, parce que
leurs planchers Maximum Loss valent 8 %, 6 % et 5 %.

Le reste du §87 est prouvé ailleurs et référencé ici : Daily Loss met en
pause sans jamais terminer, Maximum Loss termine, la cible ne compte que le
profit éligible, la règle 60 s alimente une définition unique d'éligibilité
jusqu'à la règle Performance Day
(`risk-lifecycle-v2.integration.test.ts` §41/§79), Best Day reste un gate,
le lifecycle pass/activation/funding est correct, cinq nouvelles Performance
Days sont exigées par cycle et ne peuvent jamais servir deux fois, le buffer
reste permanent, splits et caps s'appliquent, le payout #5 ouvre exactement
une Review, et V1 n'a pas changé.
