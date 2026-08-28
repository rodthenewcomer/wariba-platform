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

## 4. Portes NON exécutées

**Docker n’était pas démarré dans la session de clôture.** `DATABASE_URL` pointe
sur `127.0.0.1:54322`, donc Supabase local est requis. N’ont pas tourné :

```text
DB (pgTAP)          non exécuté
INTEGRATION         non exécuté
RLS                 non exécuté
E2E (WariX/Hub/Control)  non exécuté
RESPONSIVE          non exécuté
A11Y                non exécuté
VISUAL              non exécuté
```

Ce ne sont pas des échecs; ce sont des portes non ouvertes. Aucun résultat ne
doit être supposé à partir de leur absence. Pour les ouvrir : démarrer Docker,
puis `pnpm db:start`, puis `pnpm test:integration:full`, `pnpm test:rls:full`,
`pnpm test:e2e:critical`.

---

## 5. Périmètre non traité

Livré tel quel et déclaré, plutôt que réduit en silence :

- **§32-§34, §42-§43** — compteurs de journées Performance, non-réutilisation
  après paiement, paliers de cycle et écran WARIBA Review : les surfaces
  existent depuis la Phase 3.3 et n’ont pas été re-vérifiées contre V2.
- **§15 (estimations pré-trade)** — « marge après ordre » / « exposition après
  ordre » dans le ticket : non ajoutées.
- **§17-§19 (UX news/session)** — la capability est déclarée honnêtement sur la
  page des règles; aucune fenêtre live n’est rendue dans WariX.
- **§28 (paiement d’activation FLEX)** — le CTA existe et pointe vers le Hub;
  aucune route de paiement n’est câblée. Aucun paiement n’est simulé.
- **§66-§67 (atomicité du changement de compte)** — non testé.
- **§75 (fixtures A–T)**, **§77-§83 (preuves visuelles)** — nécessitent la base.

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
FRONTEND_FINANCIAL_RULE_HARDCODES_REMOVED = 1
ACCOUNT_SWITCH_ATOMIC_RULE_SWAP = not_tested

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
PERFORMANCE_DAYS_UI_READY = not_reverified
BEST_DAY_UI_READY = not_reverified
BUFFER_UI_READY = partial
PAYOUT_PROGRESS_UI_READY = not_reverified
PAYOUT_TIER_UI_READY = not_reverified
WARIBA_REVIEW_UI_READY = not_reverified

CONTROL_ATTACHED_POLICY_VISIBLE = yes
CONTROL_V1_V2_DISTINGUISHABLE = yes
CONTROL_RISK_EVIDENCE_READY = partial
CONTROL_FLEX_LIFECYCLE_READY = partial
CONTROL_INSTANT_PROVENANCE_READY = yes
CONTROL_PAYOUT_POLICY_FACTS_READY = not_reverified
RBAC_REGRESSION = none

NATURAL_FRENCH_REVIEW = pass
UNEXPLAINED_INTERNAL_TERMS = 0 (surfaces produit; Help exclu volontairement)
FAKE_FUNDED_REAL_CAPITAL_CLAIMS = 0
FAKE_PROVIDER_CLAIMS = 0
FAKE_PAYOUT_SLA = 0

UNIT = pass          PROPERTY = pass      LINT = pass
TYPECHECK = pass     BUILD = pass         FORMAT = pass
BOUNDARIES = pass    SECRETS = pass
DB = not_run         INTEGRATION = not_run    RLS = not_run
WARIX_CRITICAL_E2E = not_run
HUB_CRITICAL_E2E = not_run
CONTROL_CRITICAL_E2E = not_run
320_OVERFLOW = not_tested   390_OVERFLOW = not_tested
1440_CRITICAL_LAYOUT = not_tested
A11Y_CRITICAL = not_tested  A11Y_SERIOUS = not_tested

REAL_NEWS_PROVIDER_READY = no
REAL_SESSION_SOURCE_READY = no
REAL_MOBILE_MONEY_READY = no
REAL_KYC_PROVIDER_READY = no

PUBLIC_V2_ENABLED = no
PUBLIC_SITE_CHANGED = no
PUBLIC_PRICING_CHANGED = no

LOCAL_COMMITS_CREATED = 6
PUSHED = no    PR_CREATED = no    DEPLOYED = no
```

---

## 8. Recommandation

```text
PHASE_3_4_4_PLATFORM_PROPAGATION_READY = partial
FINAL_RECOMMENDATION = COMPLETE_VERIFICATION_BEFORE_PHASE_3_4_5
```

La propagation structurante est faite et prouvée par des tests qui tournent sans
base : l’UI ne peut plus inventer une règle financière, et les trois familles
sont nommées correctement partout où un trader ou un opérateur les lit. Ce qui
manque n’est pas de l’architecture, c’est de la **vérification** — les portes du
§4 et les surfaces du §5, qui demandent toutes une base démarrée.

Passer en 3.4.5 avant d’avoir ouvert ces portes reviendrait à construire le
commerce sur une propagation dont personne n’a vu tourner les parcours.
