# WARIBA Phase 3.4.3A — Owner Decisions & Safety Closure

> Verdict : **PASS WITH ACTIONS**
> Date : 28 août 2026
> Branche : `feat/phase-3-4-2-runtime-foundation`
> Start SHA : `9dff986e5880130725a64866431ec8e3635f2a16`
> Implementation end SHA : `aa6e5334312dc1b85b7709cd10ac82229be57f45`
> Norme : `POLICY-GOV-004` — V2 est la règle définitive; V1 est un historique
> immuable et ne reste dans ce lot que pour la correction de sécurité
> `pass_pending` explicitement approuvée.

Le SHA de clôture documentaire n'est pas inscrit dans son propre contenu :
il est le commit local immédiatement postérieur à l'Implementation end SHA.

## 1. Résumé du travail

Phase 3.4.3A ferme les trois décisions propriétaire laissées ouvertes par
3.4.3 et les rend exécutables côté serveur :

1. les caps de marge Evaluation / Performance / INSTANT `20 % / 15 % / 10 %`
   sont approuvés et les cinq profils passent de `calibration_required` à
   `validated`;
2. l'exposition brute maximale vaut `3,00×` le nominal pour ONE et FLEX, et
   `2,00×` pour INSTANT;
3. l'exposition brute est la somme des notionnels absolus ouverts et du
   nouvel ordre, sans netting entre sens ni symboles;
4. toute création, augmentation ou exécution d'un pending order repasse par
   la même garde pré-trade, sous le verrou transactionnel du compte;
5. le bypass V1 `pass_pending` est fermé : une violation Daily Loss courante
   interdit une nouvelle exposition même si le compte a simultanément
   atteint sa cible. Aucun nombre de policy V1 n'a changé.

Les policies V2 `2.0.0*` n'ont jamais été modifiées. Cinq policies
successeures `2.1.0*` et quinze offres `v2.1.0-candidate` ont été créées; les
anciennes lignes sont conservées en historique. Les gates d'achat et
d'activation restent fermés : ce lot n'effectue ni publication client, ni
propagation WariX/Hub/checkout/site, ni déploiement.

## 2. Fichiers créés ou modifiés

### Gouvernance et documentation

- `docs/00-decisions/DECISION_LOG.md`
- `docs/02-program/WARIBA_Canonical_Policy_Contract_V2.md`
- `docs/02-program/WARIBA_Program_Rulebook_Candidate_V2.md`
- `docs/03-finance/WARIBA_MARGIN_EXPOSURE_CALIBRATION_V1.md`
- `docs/06-engineering/WARIBA_PHASE_3_4_POLICY_BLAST_RADIUS.md`
- `docs/06-engineering/WARIBA_RULE_SOURCE_OF_TRUTH_MAP_V2.md`
- ce rapport

### Runtime, policies et tests

- `packages/domain/src/margin-exposure.ts`, `src/index.ts` et tests associés
- `packages/policies/src/v2.ts`, `src/reason-codes.ts`, `src/index.ts` et
  tests associés
- `packages/database/src/v2-pre-trade.ts`, `src/trading.ts`,
  `src/pending-orders.ts` et tests d'intégration associés
- `packages/application/src/canonical-offers.ts`
- `services/realtime/src/order-handler.ts`
- `supabase/tests/database_assertions.test.sql`

### Migration immuable

- `supabase/migrations/20260827215840_phase_3_4_3a_owner_decisions_safety_closure.sql`

### Hygiène baseline, formatage uniquement

- `apps/web/app/(auth)/layout.tsx`
- `apps/web/app/(platform)/layout.tsx`
- `packages/application/tests/lifecycle-timestamp-consistency.integration.test.ts`
- `packages/test-utils/src/hub-account-fixture.ts`

Ces quatre corrections ne modifient aucune sémantique produit. La suppression
préexistante non reliée de `docs/WARIBA_Actuarial_Risk_Model_v1.0.md` a été
préservée hors des commits.

## 3. Décisions appliquées

1. `POLICY-GOV-004` est `LOCKED` et remplace `POLICY-GOV-003` comme décision
   normative pour la V2.
2. Les caps de marge validés sont 20 % en Evaluation, 15 % en Performance
   ONE/FLEX et 10 % en Performance INSTANT.
3. La convention de frontière est stricte : `exposition <= cap` est autorisée;
   `exposition > cap` est refusée.
4. Le notionnel USD est calculé avec `Decimal`; les positions longues et
   courtes sont additionnées en valeur absolue. Une conversion USD non sûre
   échoue fermée avec `EXPOSURE_CONVERSION_UNAVAILABLE`.
5. Les pending orders peuvent être acceptés à la création puis refusés au
   trigger si l'état vivant ne respecte plus les règles. Le trigger relit et
   reverrouille l'état complet; aucune réservation historique ne contourne la
   garde.
6. Les anciennes policies et offres ne sont ni modifiées ni supprimées.
7. La correction V1 est une garde de sécurité comportementale. Cible, Daily
   Loss, Maximum Loss, Best Day, buffer et semver V1 restent inchangés.
8. Les quinze nouvelles offres restent `public_candidate`, avec achat et
   activation à `false`.

## 4. Tests exécutés

Tous les gates de clôture ci-dessous ont été rejoués avec Node `24.19.0`,
conforme à `package.json` (`>=24.14.0 <25.0.0`).

| Gate | Commande | Résultat exact |
| --- | --- | --- |
| Format | `pnpm format:check` | PASS |
| Lint | `pnpm lint` | 16/16 tâches |
| Typecheck | `pnpm typecheck` | 16/16 tâches |
| Boundaries | `pnpm boundaries:check` | aucune violation |
| Secrets | `pnpm secrets:scan` | aucun match |
| Build | `pnpm build` | 4/4 tâches; 105 pages générées |
| Unit | `pnpm test:unit` | 1 650 réussis; 10 ignorés optionnels |
| Property | `pnpm test:property` | 2/2; 10 000 cas générés |
| pgTAP | `pnpm db:test` | 48/48 |
| DB integration | `pnpm test:integration` | 228/228 |
| Application integration | `pnpm test:integration` | 57/57 |
| Worker integration | `pnpm test:integration` | 1/1 |
| RLS full | `pnpm test:rls:full` | 68/68 |
| Diff | `git diff --cached --check` | PASS avant commit |

Le build garde un warning baseline non bloquant :
`apps/web/app/(platform)/HubUserMenu.tsx` utilise encore `<img>` au lieu de
`next/image`. Aucun fichier de logique de cette phase n'est concerné.

## 5. Résultats exacts

- 5 profils de marge `validated` sous `POLICY-GOV-004`;
- 5 policies successeures vérifiées par leur hash machine canonique;
- 15 offres historiques `v2.0.0-candidate` retirées mais conservées;
- 15 offres courantes `v2.1.0-candidate` en `public_candidate`;
- 0 gate d'achat ou d'activation ouvert sur ces 15 offres;
- frontière exposition prouvée à `cap - 1e-8`, `cap`, `cap + 1e-8`;
- deux positions opposées de 100 000 comptent 200 000, jamais zéro;
- sommes inter-symboles et inter-classes d'actifs prouvées;
- indépendance marge/exposition prouvée dans les deux sens;
- concurrence pending prouvée : deux créations acceptées, un seul fill quand
  leur somme dépasserait le cap;
- augmentation refusée, réduction partielle et fermeture toujours autorisées;
- vrai parcours V1 vers `pass_pending` + violation Daily Loss : nouvelle
  exposition refusée avec `DAILY_LOSS_SOFT_LOCKED`;
- valeurs V1 épinglées : cible `10 %`, Daily Loss `3 %`, Maximum Loss `10 %`,
  Best Day `50 %`, buffer Performance `10 %`, policy `1.1.1`.

## 6. Risques ou limites

- Aucun percentile p50/p95 n'est publié : le dépôt ne fournit pas de harness
  de sampling pré-trade exploitable. Le chemin charge une fois les positions
  et une fois les specs en lot; le N+1 a été supprimé. Aucun SLA n'est inventé.
- Les sources réelles news et sessions marché ne sont toujours ni choisies ni
  versionnées. Les guards existent et échouent fermés.
- Les contraintes légales, rails, KYC, réserve, quota et gates commerciales
  restent externes à cette phase.
- Aucun E2E navigateur n'a été requis : aucune surface client V2 n'est livrée
  ici.
- La propagation WariX, Hub, checkout, catalogue public et aide est le scope
  explicite de 3.4.4.

## 7. Décisions encore ouvertes

Aucune décision P0 de marge, exposition ou bypass `pass_pending` ne reste
ouverte. Restent à exécuter, sans modifier les règles V2 verrouillées :

- sélection et versionnage des sources news/session;
- fermeture des blockers légaux, paiements/payouts réels, réserve et quotas;
- propagation de la policy V2 définitive sur toutes les surfaces en 3.4.4;
- décision de mesure si un SLA p50/p95 pré-trade doit devenir contractuel.

## 8. Commandes de vérification

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm boundaries:check
pnpm secrets:scan
pnpm build
pnpm test:unit
pnpm test:property
pnpm db:test
pnpm test:integration
pnpm test:rls:full
git diff aa6e533^ aa6e533 --check
```

## 9. Proposition de PR

PR proposée, non créée :

```text
feat: verrouiller la policy V2 définitive et ses gardes d'exposition

- verrouille POLICY-GOV-004 et les successeurs 2.1.0
- applique les caps de marge 20/15/10
- applique l'exposition brute 3x/3x/2x sans netting
- revalide les pending orders sous verrou transactionnel
- ferme le bypass V1 pass_pending sans modifier ses valeurs
- conserve toutes les policies/offres historiques
```

## 10. Récap obligatoire

```text
PHASE_3_4_3A_READY = yes

START_SHA = 9dff986e5880130725a64866431ec8e3635f2a16
CONSOLIDATED_V2_RUNTIME_SHA = fc7c3aa91fa127e51866b1bb56e49b178541c71b
END_SHA = aa6e5334312dc1b85b7709cd10ac82229be57f45

MARGIN_CAP_DECISION = approved 20/15/10
GROSS_EXPOSURE_DECISION = approved gross abs notional, no netting
ONE_GROSS_EXPOSURE = 3.00x
FLEX_GROSS_EXPOSURE = 3.00x
INSTANT_GROSS_EXPOSURE = 2.00x
EXPOSURE_BOUNDARY_CONVENTION = <= allow; > deny

V1_PASS_PENDING_BYPASS_FIXED = yes
V1_POLICY_NUMBERS_CHANGED = no

SUCCESSOR_POLICY_VERSIONS = 2.1.0 ONE/FLEX Evaluation; 2.1.0-one, 2.1.0-flex, 2.1.0-instant Performance
SUPERSEDED_NEVER_ACTIVATED_POLICY_VERSIONS = 2.0.0; 2.0.0-one; 2.0.0-flex; 2.0.0-instant

UNIT_TESTS = PASS — 1650 passed, 10 optional skipped
PROPERTY_TESTS = PASS — 2 tests / 10000 generated cases
DB_TESTS = PASS — 48/48 pgTAP
INTEGRATION_TESTS = PASS — 286/286 (228 database, 57 application, 1 worker)
RLS_TESTS = PASS — 68/68
CONCURRENCY_TESTS = PASS — pending trigger, finalization, payout and provisioning
FORMAT_CHECK = PASS

PRETRADE_PERFORMANCE_RESULT = no p50/p95 harness; one positions load plus one bulk specs load; no N+1; no SLA invented

LOCAL_COMMITS_CREATED = fc7c3aa consolidated V2 runtime; aa6e533 definitive V2 exposure guards; this closure document
WORKTREE_REMAINING_CHANGES = unrelated pre-existing deletion only
UNRELATED_PREEXISTING_CHANGES_PRESERVED = docs/WARIBA_Actuarial_Risk_Model_v1.0.md deletion

WARIX_FILES_CHANGED = 0
HUB_FILES_CHANGED = 0 semantic; 1 shared layout formatting-only BASELINE_FORMAT_HYGIENE
PUBLIC_SITE_FILES_CHANGED = 0

PILOT_V2_PUBLICLY_ENABLED = no
PUSHED = no
PR_CREATED = no
DEPLOYED = no

P0_BLOCKERS_REMAINING = none in margin, exposure or risk lifecycle
EXTERNAL_BLOCKERS_REMAINING = real news/session sources; legal/rails/reserve/quota/capability gates; 3.4.4 UI and platform propagation

FINAL_RECOMMENDATION = READY_FOR_PHASE_3_4_4_PLATFORM_PROPAGATION
STATUS = PASS WITH ACTIONS
```
