# WARIBA Rule Source of Truth Map V2

> Statut : **ACTIVE — Risk/Lifecycle V2 exécutable; activation publique bloquée**
> Decision Record : `POLICY-GOV-003`
> Date d’audit : 27 août 2026 · mis à jour en Phase 3.4.3
> Référence d’implémentation : `feat/phase-3-4-2-runtime-foundation` depuis `9dff986e5880130725a64866431ec8e3635f2a16`

## 1. Hiérarchie canonique

En cas de contradiction, l’ordre obligatoire est :

1. obligations légales applicables et conditions contractuelles acceptées;
2. `docs/00-decisions/DECISION_LOG.md`, notamment `POLICY-GOV-003`;
3. policy exacte attachée au compte pour l’exécution historique;
4. `docs/02-program/WARIBA_Canonical_Policy_Contract_V2.md`;
5. `docs/02-program/WARIBA_Program_Rulebook_Candidate_V2.md`;
6. finance/actuariat versionnés;
7. documents produit et Product OS;
8. UX/design;
9. engineering/security/QA;
10. build/delivery;
11. code et données d’exécution.

Le code prouve ce qui est actuellement exécuté; il ne peut pas modifier le
contrat V2. Une divergence devient un item de blast radius, jamais une règle
implicite.

## 2. Vérité humaine courante

| Domaine | Source normative V2 | Statut |
|---|---|---|
| Supersession/non-rétroactivité | `docs/00-decisions/DECISION_LOG.md` — `POLICY-GOV-003` | `NORMATIVE_CURRENT` |
| Règles détaillées publiques/internes | `docs/02-program/WARIBA_Program_Rulebook_Candidate_V2.md` | `NORMATIVE_CURRENT`, GO PILOTE |
| 15 produits, prix, risque, payout, permissions | `docs/02-program/WARIBA_Canonical_Policy_Contract_V2.md` | `NORMATIVE_CURRENT` |
| Calibration marge/exposition | `docs/03-finance/WARIBA_MARGIN_EXPOSURE_CALIBRATION_V1.md` | `NORMATIVE_SUPPORTING`, `OPEN_CALIBRATION` |
| Propagation future | `docs/06-engineering/WARIBA_PHASE_3_4_POLICY_BLAST_RADIUS.md` | `NORMATIVE_SUPPORTING` |
| Inventaire/reconciliation | `docs/08-delivery/WARIBA_PHASE_3_4_1_REPOSITORY_RULE_INVENTORY.md` | `HISTORICAL_EVIDENCE` après clôture |

Les Rulebooks, Rulesets, Product Master et décisions chiffrées V1 sont
`SUPERSEDED_NORMATIVE` pour les nouvelles offres et les futurs comptes V2.
Ils restent des preuves historiques des comptes V1.

## 3. Carte règle → source actuelle → source V2 → consommateurs

| Règle | Source d’exécution actuelle | Source V2 normative | Consommateurs réels audités | État après 3.4.2 |
|---|---|---|---|---|
| Sélection policy publiée | `packages/database/src/policy.ts` + `app.policy_versions` | version exacte acceptée puis épinglée | activation, Risk, Performance, Control | ID/hash exacts; Performance liée explicitement, jamais par latest global |
| Policy du compte | `app.trading_accounts.policy_version_id` + trigger de pin | ID, hashes et provenance immuables | Risk, daily finalization, Hub, Control | `READY`; repin et mutation publiée/référencée refusés en DB |
| Programmes | types/DB acceptent ONE, FLEX, INSTANT et la phase | famille/phase du Canonical Contract V2 | loader, commerce, provisioning, Control | `READY`; V1 reste historique et épinglée |
| Catalogue/prix | `app.products`, `app.product_versions`, `canonical-offers.ts` | 3 familles × 5 tailles et prix §2 | backend catalogue et commande future | 15/15 présents; achat et activation V2 restent `false` |
| Catalogue vs gates paid | `app.offer_capability_gates` séparé du catalogue | catalogue distinct de l’acquisition | backend catalogue | `READY`; aucune UI publique changée |
| Consentement | semver historique + FK/hashes exacts | preuve exacte acceptée | checkout/commerce | idempotence concurrente V1/V2 vérifiée |
| Objectif/daily/ML/Best Day | schémas V1/V2, policy attachée, Risk générique | paramètres V2 du compte | Risk, snapshot, lifecycle | exécutable; frontières exactes et priorité breach > soft lock > pass testées |
| Finalisation EOD | snapshots financiers, éligibles et ajustés risque | modèle V2 payout-neutral | worker, Risk, evidence | projection persistée; replay V1 vert |
| Profit ≥60 s | fill serveur + projection programme | règle V2 commune | Risk, Performance Days, payout | frontière 60 000 ms et pertes testées sur 5 000 seeds |
| Performance Days/Best Day payout | policy attachée + schedule explicite | buffers/splits/caps V2 | payout/lifecycle backend | exécutable; non-réutilisation d’un jour et permanence du buffer prouvées |
| Payout | ledger + projections triple + reconciliation | débit autorisé non-breach | Risk, payout, reconciliation | `READY`; seule l’écriture payout est neutralisée pour daily/ML |
| Leverage | `app.margin_profiles` + policy V2 par asset group | FX/METALS/INDICES/ENERGY | moteur marge backend | représentable; profils candidats non activables |
| Marge/exposition | `margin-exposure.ts` + `margin-calibration.ts` + profil versionné | caps après calibration owner | `v2-pre-trade.ts` appelé par `trading.ts` | câblé et fail-closed; calibration exécutée, 20/15/10 reste `CALIBRATION_REQUIRED` |
| News | versions/events + permission matrix | Eval libre; Performance T−2/T+2 | `v2-pre-trade.ts` appelé par `trading.ts` | câblé; refus `NEWS_EXPOSURE_INCREASE_BLOCKED` prouvé; source réelle absente |
| Weekend/session | versions/closures + permission matrix | fermeture ≥2 h, cutoff 30 min | `v2-pre-trade.ts` appelé par `trading.ts` | câblé; absence de source = refus d’augmentation, jamais de sanction |
| Reason codes | `packages/policies/src/reason-codes.ts` | inventaire Canonical Contract V2 §10 | Risk, payout, Order Gateway | registre unique; vocabulaires historiques mappés, jamais renommés |
| Automatisation | aucun connecteur EA/bot/API public | `unsupported` pendant pilote | WariX/API/Help | doit être explicite partout; absence ≠ fraude |
| Copy trading | aucune liaison automatique; décision V1 deferred | automatisé indisponible, manuel propre permis | Hub, Integrity, Help | owner graph/allocation future |
| KYC | flags sandbox sur `trading_accounts`; `performance.ts`/payout eligibility | lifecycle KYC séparé déclenché à `financially_eligible` | Hub, payout, Control | provider et state machine réels absents |
| Rails payout | provider sandbox + copy pays non canonique | capabilities pays/rail; Wave HOLD | payout, Hub, Checkout/Help | aucun registre pays/versionné |
| Contestation | tables/moteur Support + Contestations | fenêtre 30 j sous validation légale | Hub, Support, Control | workflow existe; SLA/texte V2 à propager |
| Vérité publique | `offer-configuration.ts`, `help-policy-facts.ts`, pages publiques | facts dérivés du contrat/policy attachée ou courante | site, Checkout, Help | plusieurs hardcodes V1; loaders divergents |
| Control | `control-policies.ts`, `control-accounts.ts`, `control-payout-review.ts` | lecture des versions V2 et preuves | opérateurs | types backend étendus; aucune refonte UI |

## 4. Carte des tables et migrations actuelles

| Objet | Création/évolution | Rôle actuel | Classification V2 |
|---|---|---|---|
| `app.policy_versions` | historiques + `20260827153325_phase_3_4_2_policy_runtime_foundation.sql` | policies V1/V2, hashes, dépendances | `RUNTIME_FOUNDATION_READY` |
| `app.user_consents`, `app.purchase_orders` | historique + migration 3.4.2 | preuve/policy/prix exacts | `RUNTIME_FOUNDATION_READY` |
| `app.products`, `app.product_versions`, `app.offer_capability_gates` | historique + migration 3.4.2 | V1 actif + catalogue V2 15 offres + gates | `RUNTIME_FOUNDATION_READY`, V2 disabled |
| `app.trading_accounts.policy_version_id` | migration 03 + trigger 3.4.2 | pin exact immuable | `RUNTIME_FOUNDATION_READY` |
| `app.policy_performance_links`, `app.flex_activation_obligations` | migration 3.4.2 | compatibilité exacte et lifecycle FLEX | `RUNTIME_FOUNDATION_READY` |
| calendriers news/session, `app.margin_profiles` | migration 3.4.2 | contrats versionnés et readiness | `CAPABILITY_READY`, sources/calibration bloquées |
| `app.symbol_spec_sets`, `app.symbol_specs` | migrations 03/04/07 | instruments et leverage V1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `app.account_exposure_limits` | `20260804000007_policy_symbol_specs_v1_1.sql` | caps lots + colonnes marge V1 | `IMPLEMENTATION_TO_CHANGE_3_4_X` |
| `app.account_daily_snapshots` | historique + champs risque 3.4.2 | EOD financier/éligible/risque | `RUNTIME_FOUNDATION_READY` |
| champs d’éligibilité fills | `20260805000003_profit_eligibility.sql`, `20260805060651_prompt_07b_program_eligibility.sql` | séparation profit court | `VALID_FOUNDATION` |
| Performance/cycles | historiques + provisioning V2 backend | enfant exact ONE/FLEX; INSTANT direct | `RUNTIME_FOUNDATION_READY` |
| payout/caps/review | migration historique + schedule policy V2 | payout V1 actif; contrat V2 | `FOUNDATION_READY`, activation V2 bloquée |
| ledger/reconciliation | historique + projection risque 3.4.2 | financier, éligible et risque réconciliés | `RUNTIME_FOUNDATION_READY` |

Les migrations appliquées sont `HISTORICAL_EVIDENCE` et ne doivent jamais
être réécrites. Toute propagation V2 utilisera de nouvelles migrations.

## 5. Consommateurs et règle de lecture

### Risk et Payout

Ils doivent lire exclusivement `account.policy_version_id`, vérifier hash et
version, puis produire un snapshot audit-able. Aucun taux hardcodé, fallback
plausible, ou « latest policy » n’est autorisé sur un compte existant.

### WariX

WariX affiche la vérité serveur : état, thresholds, reset, permissions, raison
de refus, marge et news. Il ne décide ni policy, ni éligibilité payout, ni gate
d’acquisition. Il ne doit pas annoncer EA/copy support.

### Hub, Checkout et Help

Le Hub explique la policy attachée au compte. Checkout affiche et fait accepter
la version exacte qui sera attachée. Help public utilise la policy courante V2;
Help contextualisé utilise celle du compte. Une valeur absente = `non publié`.

### Control

Control inspecte les versions, leurs usages et les preuves. Il ne modifie pas
les paramètres d’une version, ne repin pas un compte et ne recalcule pas une
décision financière à la main.

## 6. Invariants de résolution

1. Une seule fonction canonique résout une policy publiée pour les futurs
   achats; tous les consommateurs partagent son ordre et son statut.
2. Le checkout fige l’ID exact, pas seulement une chaîne semver.
3. La commande conserve cet ID et l’activation l’utilise; aucun re-resolve.
4. La policy Performance compatible est dérivée explicitement du contrat
   parent/programme, jamais de « latest WARIBA_PERFORMANCE » global.
5. Les symbol specs, calendriers et capabilities rails sont versionnés et
   épinglés avec la policy ou référencés par ID immuable.
6. Les pages publiques n’utilisent aucun chiffre V1 hardcodé.
7. Les gates internes n’effacent pas le catalogue public.
8. `payout_debit` est réconcilié financièrement mais neutralisé pour le risque.

## 7. État des blockers après Phase 3.4.2

| ID | Sévérité | État |
|---|---|---|
| `P0-POLICY-IMMUTABILITY` | P0 | `CLOSED` — trigger DB et tests de mutation/repin |
| `P0-CONSENT-PINNING` | P0 | `CLOSED` — FK/hash exacts de consentement à compte |
| `P0-PROGRAM-SCHEMA` | P0 | `CLOSED` — trois familles, cinq policies, quinze offres |
| `P0-PAYOUT-RISK` | P0 | `CLOSED` — projection payout-neutral et reconciliation delta 0 |
| `P0-MARGIN-ENFORCEMENT` | P0 | `EXPLICITLY_BLOCKED` — moteur câblé au pré-trade et calibration exécutée; décision owner requise sur le cap et sur le plafond d’exposition brute |
| `P0-NEWS-SESSION` | P0 | `EXPLICITLY_BLOCKED` — matrice câblée au pré-trade; sources réelles absentes |
| `P0-RISK-LIFECYCLE-V2` | P0 | `CLOSED` — Risk/lifecycle/payout V2 exécutables de bout en bout, V1 inchangée |
| `P1-PUBLIC-V1` | P1 | `DEFERRED` — aucune UI/site/Help modifié en 3.4.2 |
| `P1-LOADER-DIVERGENCE` | P1 | `PARTIAL` — activation exacte; audit global Help/public différé |
| `P1-CATALOG-GATE` | P1 | `FOUNDATION_CLOSED` — read model et gates séparés; UI différée |

Les états `EXPLICITLY_BLOCKED` empêchent toute activation V2 publique. Ils ne
réouvrent pas la norme : V2 reste la source de vérité; le runtime refuse de
l’appliquer tant que ses dépendances versionnées ne sont pas prouvées.
