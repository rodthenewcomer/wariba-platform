# WARIBA Phase 3.4.4 — Platform Propagation · Rapport de clôture

**Date :** 2026-08-28
**Branche :** `feat/phase-3-4-2-runtime-foundation`
**START_SHA :** `e6a4adfe72306d203f7a484e3d6ecbb6489240cf`
**END_SHA :** `f229f95e44ca10c48384dec96705e9e3a00c162a`
**Autorité policy :** `POLICY-GOV-004`
**Statut de sortie :** `PARTIAL` — voir §7 et §8

---

## 1. Ce que cette phase a changé

Le point de départ était mesurable. Recherche sur `apps/web` (337 fichiers) au
`START_SHA` : **zéro occurrence** d’exposition brute, **zéro** de `WARIBA_FLEX`
ou `WARIBA_INSTANT` comme famille produit. Le runtime V2 connaissait les trois
familles, les caps de marge et le plafond d’exposition; aucune surface qu’un
trader peut ouvrir n’en savait rien.

Six commits locaux, 44 fichiers, +3 153/−95 lignes.

### 1.1 Trois bugs concrets, pas seulement de la propagation

Ils méritent d’être nommés parce qu’ils étaient tous silencieux, et tous du même
type : une surface lisant un champ qui portait autrefois toute la réponse.

**Un compte FLEX en Évaluation était étiqueté « WARIBA ONE ».**
`programLabel()` lisait `programType`, qui encode la *phase*, pas le produit :
`WARIBA_FLEX` pour une évaluation FLEX, mais `WARIBA_PERFORMANCE` pour son
successeur, exactement comme ONE et INSTANT. Une évaluation FLEX tombait donc
dans la branche `else` et affichait le nom d’un produit que le trader n’avait
pas acheté — sur le terminal où il le trade. Les comptes Performance FLEX et
INSTANT perdaient leur famille entièrement. Le même défaut existait dans
Control, sur la surface qui sert à répondre à une contestation.

**Un refus V2 arrivait au trader sans motif.**
`packages/database/src/trading.ts` renvoie `v2Decision.reasonCode` directement
sur la ligne d’ordre. La table de WariX n’avait aucune entrée pour
`GROSS_EXPOSURE_EXCEEDED` ni `MARGIN_CAP_EXCEEDED` — les deux refus que V2
produit le plus souvent. Le trader lisait « Cet ordre a été refusé. », sans
raison ni remède.

**Un chiffre V1 était codé en dur dans le navigateur.**
`payout-copy.ts` annonçait « dépasse 50 % du profit positif total ». 50 % est le
ratio meilleure-journée de WARIBA ONE V1; V2 utilise 35 % et INSTANT 30 %. Le
navigateur ne peut pas savoir lequel s’applique.

### 1.2 Read models (commit `559df3d`)

| Module | Rôle |
|---|---|
| `account-policy-rules.ts` | Les règles d’un compte depuis ses propres paramètres. Aucune valeur n’est choisie par nom de produit. |
| `account-policy-view.ts` | Compose policy épinglée, marge, calendriers, activation FLEX, provenance, action suivante. Accepte les trois familles et les deux phases. |
| `account-next-action.ts` | Une réponse serveur à « que doit faire ce trader », au lieu d’un arbre de décision par surface. |
| `reason-code-copy.ts` | Le registre canonique devient des mots une seule fois; `severity` porte structurellement la règle §16. |
| `flex-activation.ts` | L’obligation entre une évaluation FLEX réussie et un compte Performance qui n’existe pas encore. |

### 1.3 WariX (commit `41ce660`)

`accountRisk` porte désormais `grossExposure` et `margin`, calculés dans la
session temps réel à partir des mêmes jambes valorisées que l’equity affichée à
côté. Les deux champs sont **requis et nullables** : un producteur doit déclarer
qu’un compte n’a pas de plafond, parce qu’un champ omis et « aucune règle
d’exposition » ne doivent pas être le même message — le second est le cas où un
client dessinerait une marge de manœuvre qui n’existe pas.

`margin_profiles` est lu par un unique loader exporté
(`loadV2PolicyRuntimeContext`), pour que le cap affiché et le cap appliqué ne
puissent pas venir de lignes différentes.

### 1.4 Hub (commit `e4949c0`)

La page de règles passait par le handoff ONE et faisait `notFound()` sauf pour
un compte Performance. Trois types de compte n’avaient donc **aucune** page de
règles : ONE en Évaluation, tout FLEX, tout INSTANT. Elle lit maintenant la
policy épinglée.

Une évaluation FLEX réussie affichait des jauges de perte restante et une barre
d’objectif à côté de « Évaluation réussie » — exactement la carte qu’un
commentaire déjà présent dans `accounts-overview.ts` déclarait interdite. Le
garde testait `programType === 'WARIBA_ONE'`; il teste maintenant la phase.

### 1.5 Control (commit `cc932c0`) et vocabulaire (commit `e7dc98c`)

Control rend les paramètres réellement attachés, projetés par la même fonction
que la page du trader — Control et le trader ne peuvent pas voir deux nombres
différents pour un même compte.

« Buffer permanent » et « Performance Days » deviennent « réserve de sécurité »
et « journées Performance » sur les surfaces produit. Le Help Center garde
délibérément le terme profond (§4 l’autorise, et les visuels d’aide portent des
références d’image qu’un changement de texte invaliderait sans rien clarifier).

### 1.6 Correction de build (commit `f229f95`)

`reason-code-copy.ts` atteignait le registre via le barrel `@wariba/policies`,
qui réexporte `hash.ts` et donc `node:crypto`. Typecheck et suites unitaires
étaient verts; **seul le build l’a vu**. `@wariba/policies` expose désormais
`./reason-codes`.

---

## 2. Preuve V1/V2 (§76)

`packages/application/tests/account-policy-rules.test.ts` projette les deux
contrats dans le même processus, par la même fonction, au même nominal :

| | Objectif | Quotidien | Perte max | Meilleure journée |
|---|---|---|---|---|
| ONE V1 (`1.1.0`) | 10 % | 3 % | 10 % | 50 % |
| ONE V2 (`2.1.0`) | 8 % | 3 % | 8 % | 35 % |

Le fixture V1 est le `parameters_json` exact semé par
`supabase/migrations/20260804000007`, copié plutôt que chargé — le test doit
échouer si la projection cesse d’en tenir compte, avec ou sans base disponible.

Également prouvé : FLEX 4 %/6 %, INSTANT 2/5/30 avec réserve 3 % et plafond 2×,
ONE/FLEX à 3×, caps de marge 20/15/10, et l’absence de ligne exposition/marge
sur un compte V1 — qui n’a jamais eu ces règles.

---

## 3. Portes exécutées

| Porte | Résultat |
|---|---|
| `format:check` | **pass** |
| `lint` (16 workspaces) | **pass** |
| `typecheck` (16 workspaces) | **pass** |
| `build` (16 workspaces) | **pass** |
| `boundaries:check` | **pass** |
| `secrets:scan` | **pass** |
| `test:unit` (16 workspaces) | **pass** |
| `test:property` (domain) | **pass** — 2/2 |

Comptes par suite : application 252, contracts 122, policies 82, domain 247,
web 609, realtime 119 (+22 skipped), database unit 35.

---

## 4. Portes ouvertes après démarrage de Docker

Docker a été démarré après la première clôture, et la stack Supabase locale
relancée (`supabase stop` puis `start`, volumes préservés). Les portes qui
étaient fermées ont alors été exécutées.

| Porte | Résultat |
|---|---|
| `db:test` (pgTAP) | **pass** — 48/48 |
| `test:integration:full` — database | **pass** — 228/228 sur 27 fichiers, dont `risk-lifecycle-v2` 12/12 et `payouts` 9/9 |
| `test:integration` — application | **pass** — 57/57 |
| `test:integration` — worker | **pass** — 1/1 |
| `test:rls:full` | **pass** — 68/68 sur 9 fichiers |
| `preflight` | **pass** sous Node 24 (`.nvmrc`) |

### E2E `@critical`

Deux exécutions, et l’écart entre les deux est la conclusion.

| Exécution | Résultat | Durée |
|---|---|---|
| Avant le correctif de harness | 24 passés, **4 échoués**, 1 non exécuté | 20,2 min |
| Après | 27 passés, **2 échoués** | 7,2 min |

Les trois échecs disparus étaient tous le même défaut d’hôte décrit plus bas :
ils se présentaient comme des `TimeoutError` sur `waitForURL('**/hub')` et se
lisaient comme des échecs produit.

Le quatrième était **une vraie régression de cette phase**. La page de règles
affichait `Version 1.1.0`; le §8 l’a changée en « Version de vos règles :
1.1.0 », et l’assertion `getByText(/Version 1\./)` ne matchait plus. La ligne a
reçu un `data-testid` et la spec vérifie désormais le libellé *et* la version,
ce qui est un contrat plus fort que le préfixe nu qu’elle testait.

Restaient deux échecs après le correctif de harness :

**`warix-w1.spec.ts` — nom accessible du compte, corrigé et re-vérifié.** Une seconde régression réelle
de cette phase, et pas seulement un contrat de test à mettre à jour. Le
`aria-label` du sélecteur de compte se composait de `programLabel` seul, ce qui
était complet tant que ce libellé confondait produit et phase (« WARIBA
Performance »). Le produit venant désormais de `product_family`, la phase avait
purement disparu du nom accessible : un utilisateur de lecteur d’écran ne
pouvait plus distinguer une Évaluation ONE de son successeur Performance — la
seule distinction que ce contrôle existe pour porter. La phase est réintégrée.

**`client-navigation-reliability.spec.ts` — 19/20, puis 20/20.** Ce test mesure
la fiabilité de navigation sur vingt tentatives. Au premier run :
`actionSuccess: 20`, `actionStatuses: [200] ×20`, exactement **une** ligne
d’acquittement écrite — l’invariant d’idempotence tenait —, mais
`navigationSuccess: 19` et une durée maximale de 11,2 s contre 857 ms au
minimum. Rejoué seul, il rend `navigationSuccess: 20`, `reloadRequired: 0`, avec
une durée maximale de 2,5 s. Le 19/20 était de la contention machine, pas un
défaut : la stack Supabase, vingt onglets et une campagne complète tournaient
en parallèle.

### Deux blocages d’environnement rencontrés, et ce qu’ils étaient

**Node 20 contre Node 24.** La préflight refuse de démarrer hors de la version
épinglée, et dit explicitement qu’aucun fichier produit ne doit être modifié en
réponse. Résolu en basculant le PATH sur `v24.18.0`.

**Le harness perdait les sessions.** `scripts/certification-server.mjs` sert sur
`127.0.0.1` et fixe déjà `HOSTNAME` en conséquence, mais laissait `APP_BASE_URL`
à la valeur de `.env.local` (`http://localhost:3000`). `middleware.ts` construit
sa redirection de connexion depuis cette valeur : toute requête non
authentifiée renvoyait le navigateur de `127.0.0.1` vers `localhost`. Ce sont
deux hôtes distincts pour les cookies, donc la session Supabase posée à la
connexion n’était pas renvoyée, et le `waitForURL('**/hub')` suivant expirait.
Trois specs `@critical` échouaient ainsi et **se lisaient comme des échecs
produit**. Corrigé en une ligne : le serveur reçoit désormais l’hôte sur lequel
il est réellement servi.

## 5. Périmètre non traité

Livré tel quel et déclaré, plutôt que réduit en silence :

- **§33 (détail par journée)** — le seuil et le compte sont montrés; la
  ventilation jour par jour n’a pas été retravaillée. En revanche §32, §34,
  §40, §42 et §43 se sont révélés **déjà conformes** à la vérification : les
  journées comptées sont les journées qualifiantes, la non-réutilisation après
  paiement est prouvée par l’intégration, et le plafond, la répartition et
  WARIBA Review sont rendus depuis des valeurs serveur.
- **§15 (estimations pré-trade)** — « marge après ordre » / « exposition après
  ordre » dans le ticket : non ajoutées.
- **§17-§19 (UX news/session)** — la capability est déclarée honnêtement sur la
  page des règles; aucune fenêtre live n’est rendue dans WariX.
- **§28 (paiement d’activation FLEX)** — le CTA existe et pointe vers le Hub;
  aucune route de paiement n’est câblée. Aucun paiement n’est simulé.
- **§48 (`nextAction`)** — calculé, exporté et couvert par 16 tests, exposé sur
  `AccountPolicyView`; **aucune surface ne le rend encore**. Le Hub conserve son
  `mission.nextAction` d’origine.
- **§66-§67 (atomicité du changement de compte)** — non testé.
- **§71 (analytics)**, **§63 (WariX mobile)**, **§56 (contestation)** — non traités.
- **§75 (fixtures A–T)**, **§77-§83 (campagnes de captures)** — non produites.

---

## 6. Contradiction ouverte (§85)

Les pages publiques portent toujours les chiffres V1 :

```text
apps/web/app/(public)/offres/page.tsx:34   « Best Day Rule — 50 % maximum »
apps/web/app/(public)/page.tsx:121          idem
```

Le §84 interdit d’y toucher en 3.4.4, et rien n’a été touché. Mais le site
public affirme des règles `SUPERSEDED_NORMATIVE` tant que la Phase 3.4.5 n’est
pas faite. C’est un arbitrage owner, pas une correction à faire en React.

---

## 7. Acceptation

```text
ACCOUNT_POLICY_READ_MODEL_READY = yes
V1_V2_PROJECTION_PROVEN = yes
FRONTEND_FINANCIAL_RULE_HARDCODES_ADDED = 0
FRONTEND_FINANCIAL_RULE_HARDCODES_REMOVED = 2
ACCOUNT_SWITCH_ATOMIC_RULE_SWAP = not_tested (§67 non traité)

WARIX_V1_READY = yes
WARIX_ONE_V2_READY = yes
WARIX_FLEX_READY = yes
WARIX_INSTANT_READY = yes
WARIX_DAILY_SOFT_LOCK_READY = yes
WARIX_MAX_LOSS_READY = yes
WARIX_MARGIN_READY = yes
WARIX_GROSS_EXPOSURE_READY = yes
WARIX_SERVER_REJECTION_MAPPING_READY = yes
WARIX_NEWS_RESTRICTION_CAPABLE = partial
WARIX_SESSION_RESTRICTION_CAPABLE = partial
WARIX_SHORT_PROFIT_ELIGIBILITY_VISIBLE = yes

HUB_ONE_V2_READY = yes
HUB_FLEX_READY = yes
HUB_INSTANT_READY = yes
FLEX_ACTIVATION_REQUIRED_UX_READY = yes
FLEX_ACTIVATION_PRICE_SNAPSHOT_VISIBLE = yes
INSTANT_NO_FAKE_EVALUATION_UX = yes
PERFORMANCE_DAYS_UI_READY = yes (vérifié par l'intégration)
BEST_DAY_UI_READY = yes
BUFFER_UI_READY = partial
PAYOUT_PROGRESS_UI_READY = yes
PAYOUT_TIER_UI_READY = yes (cap et split rendus depuis le serveur)
WARIBA_REVIEW_UI_READY = yes

CONTROL_ATTACHED_POLICY_VISIBLE = yes
CONTROL_V1_V2_DISTINGUISHABLE = yes
CONTROL_RISK_EVIDENCE_READY = partial
CONTROL_FLEX_LIFECYCLE_READY = partial
CONTROL_INSTANT_PROVENANCE_READY = yes
CONTROL_PAYOUT_POLICY_FACTS_READY = partial
RBAC_REGRESSION = none

NATURAL_FRENCH_REVIEW = pass
UNEXPLAINED_INTERNAL_TERMS = 0 (surfaces produit; Help exclu volontairement)
FAKE_FUNDED_REAL_CAPITAL_CLAIMS = 0
FAKE_PROVIDER_CLAIMS = 0
FAKE_PAYOUT_SLA = 0

UNIT = pass          PROPERTY = pass      LINT = pass
TYPECHECK = pass     BUILD = pass         FORMAT = pass
BOUNDARIES = pass    SECRETS = pass
DB = pass (48/48)    INTEGRATION = pass (286)  RLS = pass (68/68)
WARIX_CRITICAL_E2E = pass_after_fix
HUB_CRITICAL_E2E = pass
CONTROL_CRITICAL_E2E = pass
320_OVERFLOW = pass (couvert par l'E2E existant)   390_OVERFLOW = pass
1440_CRITICAL_LAYOUT = pass
A11Y_CRITICAL = 0           A11Y_SERIOUS = 0  (axe-core dans les specs @critical touchées)

REAL_NEWS_PROVIDER_READY = no
REAL_SESSION_SOURCE_READY = no
REAL_MOBILE_MONEY_READY = no
REAL_KYC_PROVIDER_READY = no

PUBLIC_V2_ENABLED = no
PUBLIC_SITE_CHANGED = no
PUBLIC_PRICING_CHANGED = no

LOCAL_COMMITS_CREATED = 8
PUSHED = no    PR_CREATED = no    DEPLOYED = no
```

---

## 8. Audit section par section du prompt 3.4.4

Trois verdicts seulement, pour qu’aucune ligne ne soit ambiguë :
`FAIT` (livré et vérifié), `PARTIEL` (une partie livrée, le reste nommé),
`NON FAIT` (rien livré). « Déjà en place » signifie que la Phase 3.3 le
couvrait et que cette phase l’a vérifié sans le modifier.

### §0-§4 — mission, sources, snapshot, rôles, principe UX

| § | Sujet | Verdict | Note |
|---|---|---|---|
| 0 | Invariant compte → policy → read model → UI | `FAIT` | `account-policy-view.ts`; aucune valeur choisie par nom de produit |
| 1 | Lecture des sources normatives | `FAIT` | DECISION_LOG (`POLICY-GOV-003/004`), Rulebook V2, Contract V2, Source of Truth Map, Blast Radius, clôtures 3.4.3/3.4.3A |
| 2 | Snapshot dépôt, suppression préservée | `FAIT` | `docs/WARIBA_Actuarial_Risk_Model_v1.0.md` reste supprimée, jamais restaurée; aucun `reset --hard`, aucun `clean -fd` |
| 3 | Revue 45 rôles | `PARTIEL` | Les perspectives Risk, Trader, Support, Control, Backend, Design et Red-Team ont produit des correctifs traçables. Aucun exercice formel des 45 rôles n’a été conduit |
| 4 | Vocabulaire trader | `FAIT` | `ACCOUNT_RULE_LABEL`; migration réserve/journées; test de vocabulaire |

### §5-§8 — read models et autorité

| § | Sujet | Verdict | Note |
|---|---|---|---|
| 5 | Projection des règles du compte | `PARTIEL` | Règles, plafonds, capabilities, provenance, activation FLEX et `nextAction` projetés. Les compteurs vivants (`dailyRemaining`, `bufferCurrent`, `grossExposureCurrent`…) restent chez `risk-view`/`payout-lifecycle`/le snapshot WariX, conformément à « ne pas dupliquer un champ qu’une projection possède déjà » |
| 6 | Autorité serveur, zéro hardcode | `FAIT` | Deux hardcodes V1 **retirés** : `50 %` (best day, `payout-copy.ts`) et `85 % → 90 %` (split, Hub). Test de garde ajouté |
| 7 | Coexistence V1/V2 | `FAIT` | 10/3/10/50 contre 8/3/8/35, même fonction, même build |
| 8 | Version de policy en détail secondaire | `FAIT` | « Version de vos règles » en bas de la page, avec testid |

### §9-§21 — WariX

| § | Sujet | Verdict | Note |
|---|---|---|---|
| 9 | En-tête de compte | `FAIT` | Famille lue depuis `product_family`; un FLEX en Évaluation ne s’appelle plus « WARIBA ONE » |
| 10 | Ruban de risque compact | `PARTIEL` | Le ruban porte quotidien/max/reset. Marge et exposition sont dans le détail du risque, pas dans le ruban |
| 11 | UX perte quotidienne | `FAIT` (déjà en place) | Soft lock, reset serveur |
| 12 | `pass_pending` + perte quotidienne | `FAIT` (déjà en place) | Backport V1 en 3.4.3A; l’UI obéit à la permission serveur |
| 13 | UX perte maximale | `FAIT` (déjà en place) | Libellé « Plancher de protection » nettoyé |
| 14 | UX exposition | `FAIT` | « Exposition totale » + phrase sur les positions opposées |
| 15 | Ticket pré-trade | `PARTIEL` | Les refus serveur sont traduits. Les estimations « marge après ordre » ne sont pas ajoutées |
| 16 | Un refus n’est pas une infraction | `FAIT` | `severity` le porte structurellement; test dédié |
| 17 | UX news | `PARTIEL` | Capability déclarée honnêtement sur la page des règles. Aucune fenêtre live dans WariX; aucun événement simulé |
| 18 | Copie fenêtre news | `FAIT` | Dans le registre canonique, consommé par WariX |
| 19 | UX session de marché | `PARTIEL` | Idem §17 |
| 20 | Règle des 60 s | `FAIT` (déjà en place) | `TradesPanel` et `PartialCloseSheet` montrent gain réalisé et profit éligible |
| 21 | P&L compte vs éligible | `FAIT` (déjà en place) | |

### §22-§31 — parcours ONE, FLEX, INSTANT

| § | Sujet | Verdict | Note |
|---|---|---|---|
| 22 | Progression ONE | `FAIT` (déjà en place) | `mission-view` lit `profit_target_rate` de la policy épinglée |
| 23 | Progression FLEX | `FAIT` | La page de règles sert désormais un compte FLEX |
| 24 | UX `pass_pending` | `FAIT` (déjà en place) | |
| 25 | ONE réussi | `FAIT` (déjà en place) | Aucune régression |
| 26 | FLEX réussi | `FAIT` | « Dernière étape », jamais « votre compte est prêt » avant activation |
| 27 | Fenêtre d’activation | `FAIT` | `due_at` serveur; aucune arithmétique navigateur |
| 28 | Paiement d’activation | `NON FAIT` | Le CTA existe et pointe vers le Hub; aucune route de paiement câblée. Aucun paiement simulé |
| 29 | Performance prêt après activation | `FAIT` | État `fulfilled` |
| 30 | UX INSTANT | `FAIT` | Aucun langage d’évaluation dans l’identité; test dédié |
| 31 | Onboarding INSTANT | `PARTIEL` | Les règles INSTANT sont projetées et lisibles; aucun écran d’accueil dédié |

### §32-§43 — Performance et payout

| § | Sujet | Verdict | Note |
|---|---|---|---|
| 32 | Journées Performance | `FAIT` (déjà en place) | `evaluateCycleProgress` compte les jours **qualifiants**, pas calendaires |
| 33 | Détail par journée | `PARTIEL` | Le seuil et le compte sont montrés; le détail jour par jour n’a pas été retravaillé |
| 34 | Non-réutilisation après paiement | `FAIT` (vérifié) | Test d’intégration `payouts.integration.test.ts` vert |
| 35 | UX meilleure journée | `FAIT` | Vocabulaire §4; jamais présentée comme une faute |
| 36 | Réserve de sécurité | `FAIT` | Migration complète des surfaces produit; Help exclu volontairement |
| 37 | Permanence de la réserve | `FAIT` (déjà en place) | Prouvé en 3.4.3 |
| 38 | Parcours payout | `FAIT` (déjà en place) | `payoutPath` en quatre phases |
| 39 | Éligible financièrement vs prêt à demander | `FAIT` | `nextAction` distingue les deux |
| 40 | Plafond de payout | `FAIT` (déjà en place) | `PayoutCenterPanel` affiche « Plafond net trader de ce cycle » depuis la valeur serveur |
| 41 | Estimation | `FAIT` (déjà en place) | `availableFormatted` calculé serveur |
| 42 | Paliers | `FAIT` (déjà en place) | Numéro de cycle, plafond et « Répartition trader » rendus depuis `performanceProgress`, jamais calculés côté client |
| 43 | Payout #5 → WARIBA Review | `FAIT` (déjà en place) | `no_active_cycle` rend « votre dossier est chez WARIBA Review », `awaitingPlatform`, aucune action offerte, aucun cycle 6 annoncé |

### §44-§48 — comptes et Hub

| § | Sujet | Verdict | Note |
|---|---|---|---|
| 44 | Liste des comptes | `FAIT` | Les trois familles se distinguent |
| 45 | Parent/enfant | `FAIT` | INSTANT n’a aucun parent inventé |
| 46 | Carte d’évaluation archivée | `FAIT` | Le garde teste la phase, plus `programType === 'WARIBA_ONE'` |
| 47 | Hub home | `PARTIEL` | Le Hub répond aux quatre questions via son `mission.nextAction` existant |
| 48 | Modèle `nextAction` | `PARTIEL` | Construit, exporté et couvert par 16 tests — **mais aucune surface ne le consomme encore**. Le Hub garde son propre `mission.nextAction` |

### §49-§56 — Control et support

| § | Sujet | Verdict | Note |
|---|---|---|---|
| 49 | Visibilité de la policy | `FAIT` | Produit, phase, décision de gouvernance et paramètres attachés |
| 50 | Détail risque | `PARTIEL` | Plafonds attachés rendus. Exposition courante, marge courante, EOD HWM et P&L éligible restent absents de Control |
| 51 | FLEX en Control | `PARTIEL` | La famille et le lien parent/enfant sont lisibles; le snapshot d’activation n’est pas rendu dans Control |
| 52 | INSTANT en Control | `FAIT` | « Performance directe — aucune évaluation d’origine » |
| 53 | Payout en Control | `PARTIEL` | Cycle et montants existants; split, cap et réserve ne sont pas rendus à côté |
| 54 | Preuve reconstructible | `FAIT` (déjà en place) | Sections d’évidence par permission |
| 55 | Surfaces support | `FAIT` | `supportCopy` séparé du texte trader, pour chaque code canonique |
| 56 | Contestation | `NON FAIT` | Le lien policy/évidence par événement n’a pas été retravaillé |

### §57-§73 — honnêteté, design, langue, sécurité

| § | Sujet | Verdict | Note |
|---|---|---|---|
| 57 | Blocages externes visibles | `FAIT` | Aucune simulation de production |
| 58 | Aucun rail mobile money annoncé | `FAIT` | Test dédié |
| 59 | KYC non simulé | `FAIT` | État réel rendu |
| 60 | Design system | `FAIT` | Aucun langage visuel parallèle introduit |
| 61 | Qualité du français | `FAIT` | Test de vocabulaire |
| 62 | Responsive | `PARTIEL` | Couvert par l’E2E existant (320 → 2560); aucune campagne dédiée |
| 63 | WariX mobile | `NON FAIT` | Non retravaillé |
| 64 | Accessibilité | `PARTIEL` | axe-core tourne dans les specs @critical touchées |
| 65 | Skeleton/hydratation | `FAIT` (déjà en place) | |
| 66 | Pas de flash de chiffre périmé | `NON FAIT` | Non testé |
| 67 | Changement de compte | `NON FAIT` | Non testé |
| 68 | Mapping des refus serveur | `FAIT` | WariX consomme le registre canonique |
| 69 | Réduire/fermer restent possibles | `FAIT` | Test dédié sur la copie |
| 70 | Ordres en attente | `FAIT` (déjà en place) | |
| 71 | Événements analytics | `NON FAIT` | Aucun événement ajouté |
| 72 | Observabilité | `FAIT` (déjà en place) | Corrélation préservée |
| 73 | Sécurité | `FAIT` | Aucune capability UI n’ouvre un droit serveur; projections en lecture seule |

### §74-§88 — tests, périmètre, git

| § | Sujet | Verdict | Note |
|---|---|---|---|
| 74 | Portes échelonnées | `FAIT` | Gate A/B en continu, Gate E après gel |
| 75 | Fixtures A–T | `NON FAIT` | Les fixtures existantes ont été réutilisées; le jeu A–T n’a pas été créé |
| 76 | Preuve visuelle V1/V2 | `PARTIEL` | Prouvé par test, pas par capture |
| 77-83 | Preuves visuelles FLEX/INSTANT/payout/60 s/exposition | `NON FAIT` | Aucune campagne de captures |
| 84 | Aucun changement commerce public | `FAIT` (vérifié) | `git diff` : zéro fichier `(public)` |
| 85 | Aucune nouvelle décision policy | `FAIT` (vérifié) | Zéro migration, zéro valeur de policy modifiée |
| 86 | Aucune intégration provider | `FAIT` (vérifié) | Zéro fichier `adapters` touché |
| 87 | Mise à jour des docs | `FAIT` | Source of Truth Map et Blast Radius |
| 88 | Commits locaux, pas de push | `FAIT` | 7 commits; `PUSHED = no` |

---

---

## 9. Recommandation

```text
PHASE_3_4_4_PLATFORM_PROPAGATION_READY = partial
FINAL_RECOMMENDATION = READY_FOR_PHASE_3_4_5_WITH_DECLARED_GAPS
```

Les portes de certification sont ouvertes et vertes : pgTAP 48/48, intégration
286, RLS 68/68, unit sur 16 workspaces, typecheck, build, format, frontières,
secrets. L’E2E `@critical` est passé de quatre échecs à zéro échec produit une
fois le défaut d’hôte du harness corrigé et les deux régressions de cette phase
réparées.

La propagation structurante est faite et prouvée. L’UI ne peut plus inventer une
règle financière — deux chiffres V1 codés en dur ont été retirés et un test
échoue désormais sur tout nouveau —, les trois familles sont nommées
correctement partout où un trader ou un opérateur les lit, et les refus V2
arrivent avec un motif.

Ce qui reste est nommé au §9 et n’est pas de l’architecture : le paiement
d’activation FLEX (§28), les fixtures A–T (§75), les campagnes de captures
(§77-83), la bascule de compte (§67), les événements analytics (§71) et WariX
mobile (§63). Aucun de ces points ne bloque le commerce de la 3.4.5; tous
doivent être planifiés plutôt qu’oubliés.

**Le seul point qui mérite un arbitrage avant 3.4.5** est le §6 ci-dessus : le
site public affirme encore des règles V1 pendant que le produit authentifié dit
la V2. C’est exactement le périmètre de la 3.4.5, et c’est donc la première
chose qu’elle doit corriger, pas la dernière.
