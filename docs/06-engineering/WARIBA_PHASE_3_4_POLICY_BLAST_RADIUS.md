# WARIBA Phase 3.4 — Policy Blast Radius

> Statut : **BACKEND V2 LIVRÉ — activation et surfaces publiques bloquées**
> Source : `POLICY-GOV-004` + Canonical Policy Contract V2
> Audit : `main@9dff986e5880130725a64866431ec8e3635f2a16`, 27 août 2026

## 1. Principe de propagation

V2 est la vérité normative et la cible runtime définitive. Les policies 2.1.0
portent l’enforcement backend; V1 n’est conservée que pour l’historique et un
éventuel compte déjà épinglé. Aucune vague ne repin un compte historique.

Ordre obligatoire : gouvernance → schéma/versioning → policy machine → Risk et
Order Gateway → Payout → lifecycle → read models → WariX/Hub → public/Help →
certification → pilote. Aucun consommateur public ne doit devancer les guards
serveur correspondants.

## 2. Matrice de blast radius

| Vague | Domaine | Fichiers/objets concrets audités | Changement V2 futur | Gate de sortie |
|---:|---|---|---|---|
| 0 | Gouvernance | `DECISION_LOG.md`, Rulebook V2, Canonical Contract V2 | adopter/scope/non-rétroactivité | fait en 3.4.1 |
| 1 | DB policy | nouvelle migration; tables `app.policy_versions`, `app.user_consents`, `app.purchase_orders`, `app.trading_accounts` | version immuable; FK exact checkout→order→account; hashes/doc/locale | tests immutabilité/race/replay |
| 1 | DB programmes/catalogue | nouvelle migration; `app.products`, `app.product_versions` | programme × taille; ONE/FLEX/INSTANT; upfront/activation/total; catalogue séparé des gates | 15/15 lignes DB + contraintes |
| 1 | Types DB | `packages/database/src/schema.ts`, `packages/validation/src/commerce.ts` | nouveaux programmes, prix FLEX, gates typés | typecheck + validation frontière |
| 2 | Policy schemas | `packages/policies/src/schema.ts`, `loader.ts`, `hash.ts` | schémas V2 par programme/phase; payout debit neutral; calendars/spec refs | parity human↔machine + hash fixtures |
| 2 | Policy loaders | `packages/database/src/policy.ts`, `packages/database/src/control-policies.ts` | resolver unique; mapping parent→Performance compatible; aucun ordre divergent | un seul résultat canonique |
| 2 | Commerce/consent | `packages/application/src/commerce.ts`, `identity.ts`, `offer-configuration.ts` | consent ID exact; commande pin; 15 produits; gate paid distinct | test changement de policy entre checkout/paiement |
| 3 | Risk math | `packages/domain/src/risk-math.ts`, `packages/policies/src/risk-engine.ts` | ONE 8/3/8/35, FLEX 4/3/6/35, INSTANT 2/5/30; tous policy-driven | unit/property boundary exacts |
| 3 | Daily/EOD | `packages/database/src/risk.ts`, `daily-finalization.ts` | phase/programme V2; equity de reset définie; payout debit exclu | replay UTC et concurrence |
| 3 | Profit eligibility | `packages/domain/src/profit-eligibility.ts`, `packages/policies/src/profit-eligibility-policy.ts`, `packages/database/src/program-eligibility.ts`, `trading.ts` | règle 60 s commune; pertes/coûts toujours comptés | partial closes + lots + fees |
| 4 | Symbols/leverage | nouvelle migration; `app.symbol_spec_sets`, `app.symbol_specs`; `services/realtime/src/market.ts` | profils ONE/FLEX/INSTANT, version pin; US30/énergies seulement si specs validées | spec + provider + contract tests |
| 4 | Marge/exposition | `app.account_exposure_limits`; `packages/database/src/trading.ts`, `accounts.ts`, `exposure-gate.ts`; `packages/domain/src/trading-math.ts` | remplacer gate lots V1 par garde marge calibrée + exposition brute | calibration signée + pre-trade refus serveur |
| 4 | News/session | nouvelle source calendrier; Order Gateway dans `packages/database/src/trading.ts` et pending orders | T−2/T+2 high-impact; blocage 30 min avant fermeture ≥2 h; réduction/close permises | replay calendar/version + reason codes |
| 5 | Performance lifecycle | `packages/database/src/performance.ts`, `performance-onboarding.ts`, migrations Performance | enfant compatible ONE/FLEX; INSTANT direct; activation FLEX 30 j; quotas | exactly-once + lineage policy |
| 5 | Performance math | `packages/domain/src/performance-math.ts`, `packages/database/src/performance.ts` | buffers 2/3, BD 35/30, 5 jours +0,5 | property tests par programme/taille |
| 6 | Payout | `packages/database/src/payouts.ts`, `financial-reconciliation.ts`, `program-eligibility.ts`; migrations payout | splits 80/80/85/85/90, caps V2, review #5, neutralité debit | non-breach test + idempotence/reversal |
| 6 | KYC/rails | tables futures; `packages/application/src/kyc-state.ts`, `payout-lifecycle.ts`; Hub/Control actions | lifecycle KYC séparé; capabilities pays/rail; Wave HOLD | provider sandbox/contract + RBAC |
| 6 | Contestations | `packages/database/src/contestations.ts`, `contestation-evidence.ts`; Support/Control pages | raisons V2, policy/hash exacts, fenêtre légale | preuve rejouable + reviewer distinct |
| 7 | Realtime DTO | `services/realtime/src/snapshot.ts`, `websocket.ts`, contrats `packages/contracts/src/trading.ts`, `market.ts` | exposer policy, permissions, marge, news/session, reason codes V2 | contract + auth isolation |
| 7 | Hub read models | `packages/application/src/hub-view.ts`, `mission-view.ts`, `risk-view.ts`, `performance-mission-view.ts`, `evaluation-performance-handoff.ts` | parcours ONE/FLEX/INSTANT; policy attachée; activation FLEX; KYC/payout | integration tests par lifecycle |
| 8 | WariX | `apps/web/app/(trade)/trade/**`, `packages/ui/src/wariba/**` | afficher seulement vérité serveur; automation/copy unsupported; marge/news | E2E permissions + responsive/a11y |
| 8 | Trader Hub | `apps/web/app/(platform)/hub/**`, `/comptes/**`, `/payouts/**`, `/checkout/**` | 3 offres, nextAction, activation/KYC/payout versionnés | E2E compte/policy exacts |
| 8 | Control | `apps/web/app/(control)/control/**`, `packages/database/src/control-*.ts` | filtres 3 programmes, preuves V2, gates paid distincts | RBAC + zéro mutation policy |
| 9 | Site public | `apps/web/app/(public)/page.tsx`, `offres/page.tsx`, `programme/page.tsx`, `legal/risques/page.tsx` | supprimer chiffres V1; 15 offres; langage GO PILOTE/pas de promesse | content tests + source facts |
| 9 | Help | `packages/application/src/help-policy-facts.ts`, `apps/web/content/help/*.ts`, `components/help/**` | facts V2 + contextualisation compte; EA/copy/payout debit/news/weekend | zéro hardcode + `non publié` |
| 9 | Configurateur/checkout | `apps/web/app/(platform)/comptes/nouveau/**`, `checkout/CheckoutClient.tsx` | prix V2, FLEX deux paiements, consentement ID/hash exact | checkout→account policy parity |
| 10 | Tests/fixtures | `packages/**/tests`, `apps/web/tests`, `services/**/tests`, `packages/test-utils/src/**` | fixtures V2, coexistence V1/V2, aucun repin | suites unit/integration/E2E/property |
| 10 | Observabilité | `packages/observability`, audit/outbox, Control evidence | dimensions programme/taille/policy/cohorte/canal; reason codes | audit/export/replay |
| 11 | Docs/support/legal | Product Master, Product OS, Engineering/QA, scripts Support | faire de V2 l’unique contenu courant, V1 archivé | revue Product/Risk/Legal |
| 12 | Pilote | feature flags et gates futurs | cellule produit×taille×pays×canal, quotas, réserve | GO explicite cellule par cellule |

### État de propagation après Phase 3.4.3

| Bloc | Statut | Preuve principale |
|---|---|---|
| Vagues 1–2 — policy, pinning, catalogue, schémas | `FOUNDATION_READY` | migration 3.4.2, hashes V2 stables, 15/15 offres, 40/40 pgTAP |
| Vague 3 — projections risque/éligibilité | `EXECUTABLE` | 16 000 scénarios générés en 3.4.3 en plus des 15 000 de 3.4.2; neutralité payout prouvée jusqu’à Best Day et Performance Days |
| Vague 4 — leverage/marge/exposition | `EXECUTABLE` | 20/15/10 + brut 3×/2× dans la chaîne unique; Market et pending trigger testés |
| Vague 4 — news/session | `WIRED_BLOCKED` | chaîne pré-trade câblée; providers de calendriers absents |
| Vague 5 — FLEX/INSTANT lifecycle | `FOUNDATION_READY` | 3/3 intégrations transactionnelles, enfant unique et expiration |
| Vague 6 — payout V2 | `EXECUTABLE` | splits/caps/cycles 1-5/Review prouvés; non-réutilisation d’un Performance Day et permanence du buffer prouvées |
| Vague 7 — read model catalogue backend | `FOUNDATION_READY` | catalogue complet distinct des gates |
| Vagues 7–12 — realtime/UI/public/pilote | `DEFERRED` | aucun fichier WariX, Hub ou site public changé |

### État de propagation après Phase 3.4.4

La ligne « Vagues 7–12 — `DEFERRED` » ci-dessus décrivait l’état à la clôture de
3.4.3 et reste vraie pour cette date. Elle est remplacée, pour les vagues 7 et 8
seulement, par le tableau suivant.

| Bloc | Statut | Preuve principale |
|---|---|---|
| Vague 7 — realtime DTO | `PROPAGATED` | `accountRisk.grossExposure` et `accountRisk.margin` calculés dans la session temps réel, aux mêmes prix que l’equity affichée à côté; échec fermé sur conversion manquante |
| Vague 7 — Hub read models | `PROPAGATED` | `account-policy-view.ts` accepte les trois familles et les deux phases; `account-next-action.ts`; `flex-activation.ts`; V1/V2 projetés côte à côte dans un même build |
| Vague 8 — WariX | `PROPAGATED` | famille produit lue depuis `product_family`; refus V2 traduits via le registre canonique; exposition et marge dans le détail du risque |
| Vague 8 — Trader Hub | `PARTIAL` | page de règles ouverte à tout compte; activation FLEX visible des deux côtés du handoff; vocabulaire réserve/journées propagé. Compteurs de cycle, paliers de payout et écrans WARIBA Review non re-vérifiés cette phase |
| Vague 8 — Control | `PROPAGATED` | famille/phase, décision de gouvernance et paramètres réellement attachés rendus depuis la version épinglée |
| Vague 9 — site public/Help/checkout | `DEFERRED` | aucun fichier public changé; les chiffres V1 publics restent en place et sont documentés comme contradiction ouverte |
| Vagues 10–12 — fixtures E2E, observabilité, pilote | `DEFERRED` | Docker indisponible dans la session de clôture : DB, RLS, intégration et E2E non exécutés |

## 3. P0 après Phase 3.4.2

### P0-1 — Policy immuable et consentement exact

`CLOSED`. Une policy publiée ou référencée ne peut plus être modifiée/supprimée.
Consentement, commande et compte conservent l’UUID et les hashes exacts.

### P0-2 — Programmes et prix V2

`CLOSED`. ONE/FLEX/INSTANT, phases Evaluation/Performance, quinze versions
d’offre et prix upfront/activation/total sont représentés séparément des gates.

### P0-3 — Débit payout non-breach

`CLOSED`. Les projections financière, éligible et ajustée risque coexistent.
Seul l’effet ledger payout/reversal est neutralisé pour Daily/Maximum Loss.

### P0-4 — Marge/exposition

`CLOSED` par `POLICY-GOV-004`. Les caps de marge 20/15/10 sont validés et les
plafonds bruts 3,00× ONE/FLEX et 2,00× INSTANT sont portés par cinq policies
successeures 2.1.0. Le moteur additionne les notionnels absolus sans netting,
autorise l’égalité, refuse tout dépassement ou conversion manquante, et est
appelé par Market, pending create/modify et pending trigger. Le lock du compte
rend deux triggers concurrents sûrs. US30/énergies restent hors catalogue
d’exécution sans spec; cela ne réouvre pas la décision sur les caps.

### P0-5 — News et sessions

`WIRED_BLOCKED`. La matrice de permission est appelée par le même pré-trade.
Une source absente refuse l’augmentation d’exposition et laisse
réduire/fermer; aucune sanction rétroactive n’est inventée. Les sources
réelles restent absentes et l’activation reste bloquée.

### P0-6 — Risk et lifecycle V2

`CLOSED` en Phase 3.4.3A. ONE/FLEX/INSTANT exécutent leurs règles sur un moteur
unique piloté par la policy attachée, sans branche par produit. Daily Loss
reste une pause, Maximum Loss reste terminal, Best Day reste un gate, la
règle 60 s alimente une seule définition d’éligibilité. Le seul backport V1
ferme le bypass Daily Loss de `pass_pending` sans changer un seuil ni un hash.

## 4. P1 de vérité et UX

- pages publiques et Help comportent encore des chiffres V1;
- propagation du read model catalogue vers les surfaces UI différée;
- WariX affiche la marge mais ne reçoit pas une permission news/session V2;
- aucune capacité pays/rail versionnée; Wave reste `HOLD`.

## 5. Coexistence V1/V2 — scénarios de certification

1. Un compte V1 continue de calculer ses valeurs V1 après publication V2.
2. Un consentement V2-A suivi d’une publication V2-B crée encore un compte
   V2-A, ou bloque explicitement et demande un nouveau consentement; jamais B
   silencieusement.
3. Un parent ONE/FLEX V2 reçoit la policy Performance compatible définie par
   son contrat, pas la dernière globale.
4. Un payout autorisé modifie la balance financière et non le statut de risque.
5. Les quinze offres restent visibles même si une cellule paid/activation est
   fermée; le CTA explique le gate.
6. Les anciens documents/migrations/evidence V1 ne changent pas de hash.
7. Help public montre V2; Help d’un compte V1 montre V1 avec son badge version.
8. Aucun reason code client ne peut autoriser un ordre refusé par le serveur.

## 6. Hors scope Phase 3.4.3A

Sont restés hors scope : refonte ou propagation WariX/Hub/site/Help/checkout,
provider réel, activation publique, déploiement, push, PR, merge ou rollout.
La migration, les packages backend, les tests et la gouvernance étaient
explicitement autorisés. Aucun push, PR, merge ou déploiement n’est réalisé.
