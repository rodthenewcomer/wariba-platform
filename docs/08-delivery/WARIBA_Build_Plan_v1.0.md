---
title: "WARIBA Build Plan"
version: "1.0"
document_id: "WARIBA-BUILD-PLAN"
status: "EN EXÉCUTION — PROMPTS 01 À 04 IMPLÉMENTÉS ET AUDITÉS"
language: "fr-FR"
brand: "WARIBA"
domain: "wariba.app"
market: "Afrique francophone"
owner: "WARIBA Product, Engineering, Risk & Operations"
source_of_truth_priority: 9
depends_on:
  - "WARIBA Product Master Document v1.0"
  - "WARIBA Program Rulebook v1.0"
  - "WARIBA Financial Model v1.0"
  - "WARIBA UX Architecture v1.0"
  - "WARIBA Design System v1.0"
  - "WARIBA Engineering Constitution v1.0"
  - "WARIBA System Architecture v1.0"
  - "WARIBA Security, QA & Operations Standard v1.0"
next_documents:
  - "WARIBA Prompt Pack v1.0"
---

# WARIBA Build Plan v1.0

> **Construire une bêta privée crédible en huit semaines sans sacrifier les règles, la sécurité ni l’auditabilité.**

> **Addendum Rules v1.1 — 2026-08-03**
> Toute référence aux règles financières v1.0 est remplacée par le Program
> Rulebook v1.1 et `WARIBA_RULESET_v1.1.json`. La séquence de construction reste
> inchangée. Le catalogue Prompt 03 comprend 5K, 10K, 25K, 50K et 100K sous
> feature flags indépendants. Prompt 05 construit 10 % target réalisé, DLL 3 %,
> Maximum Loss 10 % EOD trailing, Best Day 50 %, sans minimum ni qualified day.
> Prompt 08 construit le buffer permanent 10 %, cinq Performance Days à 0,50 %,
> splits 85/15 puis 90/10, caps nets et Review après payout 5.

## Contrôle du document

| Champ | Valeur |
|---|---|
| Marque | WARIBA |
| Domaine | `wariba.app` |
| Dépôt | GitHub privé `wariba-platform` |
| État réel | Prompts 01 à 04 implémentés ; migrations, intégration, RLS, E2E et UI audités le 2026-08-03 |
| Agents IA autorisés | Codex, Claude Code ou tout autre agent IA explicitement mandaté |
| Rôles autorisés | Construction, modification, audit et documentation — voir AI-015 |
| Durée cible | 8 semaines de build après préparation |
| Phase actuelle | Fin Semaine 3 — prochain scope autorisé : Prompt 05 / Policy, Risk & Evaluation |
| Budget initial | Environ 1 000 USD |
| Produit cible | Bêta privée sandbox |
| Bêta initiale | 10 à 25 traders |
| Paiements réels | Non dans la première bêta |
| Payouts réels | Non dans la première bêta |
| Capital réel | Non en V1 |
| Produits | WARIBA ONE, WARIBA Performance, WARIBA Review |
| Instruments | EURUSD, GBPUSD, USDJPY, XAUUSD, NAS100 |
| Support | Web responsive + PWA |
| Langue | Français |
| Statut | Construction active — vente publique toujours fermée |

---

# 1. Objet du Build Plan

Ce document transforme l’architecture WARIBA en séquence d’exécution.

Il définit :

1. ce qui doit être construit ;
2. dans quel ordre ;
3. par qui ;
4. avec quelles dépendances ;
5. avec quels critères d’acceptation ;
6. avec quels tests ;
7. avec quels checkpoints ;
8. avec quels risques ;
9. avec quels stop conditions ;
10. avec quels livrables ;
11. avec quels prompts d’exécution ;
12. avec quels gates de passage entre semaines.

Ce plan ne constitue pas une promesse commerciale de livraison publique en huit semaines.

La cible est :

> Une bêta privée sandbox, stable, testable, mobile, auditable et opérable par une petite équipe.

---

# 2. Résultat attendu à la fin des huit semaines

À la fin du cycle, WARIBA doit permettre à un bêta-testeur autorisé de :

1. créer un compte ;
2. se connecter ;
3. consulter une offre WARIBA ONE ;
4. effectuer un paiement sandbox ;
5. recevoir un compte Evaluation ;
6. comprendre sa Mission ;
7. ouvrir WariX ;
8. voir cinq instruments sandbox ;
9. soumettre un ordre marché ;
10. recevoir un fill simulé ;
11. suivre balance, equity et PnL ;
12. voir DLL, Maximum Loss et consistance ;
13. subir un soft lock correct ;
14. subir un hard breach correct ;
15. réussir l’évaluation si toutes les conditions sont remplies ;
16. recevoir un compte Performance ;
17. compléter un cycle ;
18. devenir éligible à un payout sandbox ;
19. demander un payout ;
20. suivre la revue ;
21. voir le payout sandbox marqué payé ;
22. entrer dans le cycle suivant ;
23. ouvrir un ticket ;
24. ouvrir une contestation ;
25. consulter l’historique et la preuve ;
26. utiliser l’application sur mobile ;
27. recevoir des notifications in-app et email sandbox.

L’équipe WARIBA doit pouvoir :

1. voir les utilisateurs ;
2. voir les comptes ;
3. consulter les ordres, fills et positions ;
4. consulter les règles ;
5. consulter les violations ;
6. revoir une demande de payout ;
7. approuver ou rejeter avec motif ;
8. voir la timeline ;
9. gérer un incident ;
10. activer un kill switch ;
11. voir la couverture de réserve simulée ;
12. auditer les actions.

---

# 3. Ce que la bêta ne doit pas faire

La première bêta ne doit pas inclure :

- paiement Mobile Money réel ;
- paiement carte réel ;
- payout Mobile Money réel ;
- capital réel ;
- compte broker ;
- données de marché commerciales non licenciées ;
- KYC réel complet ;
- application iOS/Android native ;
- API publique ;
- Expert Advisors ;
- bots externes ;
- copy trading ;
- futures ;
- crypto ;
- affiliation publique ;
- leaderboard ;
- community ;
- Academy complète ;
- certificats publics ;
- Live allocation ;
- infrastructure multi-région ;
- microservices ;
- Redis obligatoire ;
- Kafka ;
- Kubernetes.

---

# 4. Principes de séquençage

## 4.1 Vertical slices

Chaque semaine doit produire une capacité testable de bout en bout.

Interdit :

- construire tout le frontend avant le backend ;
- construire toutes les tables avant les parcours ;
- créer un terminal visuel sans moteur ;
- créer des payouts sans cycle ;
- créer Control sans permissions.

## 4.2 Domaine avant décor

Pour les fonctions critiques :

```text
règle
→ modèle domaine
→ tests
→ persistance
→ API
→ UI
```

## 4.3 Sandbox avant provider réel

Chaque intégration externe commence par un adapter sandbox.

## 4.4 Une branche, un objectif

L’agent IA mandaté travaille sur une branche courte.

## 4.5 CI dès le premier commit

Aucun travail important avant la CI.

La boucle d'implémentation utilise `pnpm test:fast` puis un test feature exact. La PR bloque sur
les jobs parallèles static/unit/build/DB/RLS smoke/E2E smoke. Le full fonctionnel et la
certification s'exécutent une fois au jalon approprié, selon
`docs/07-assurance/WARIBA_CI_E2E_Test_Architecture_v1.0.md`, et non après chaque correction.

## 4.6 Mobile chaque semaine

Le mobile n’est pas repoussé à la fin.

## 4.7 Assurance continue

Sécurité et QA ne constituent pas une phase unique finale.

---

# 5. Gouvernance du build

## 5.1 Rod

Responsable de :

- décisions produit ;
- validation du scope ;
- validation visuelle ;
- validation commerciale ;
- test utilisateur ;
- décision de fusion finale ;
- gestion GitHub ;
- choix futurs des providers ;
- budget.

## 5.2 ChatGPT

Responsable de :

- documents ;
- prompts ;
- analyse des décisions ;
- audit fonctionnel ;
- clarification des règles ;
- préparation des critères d’acceptation ;
- revue des résultats fournis.

## 5.3 Agent IA mandaté

Codex, Claude Code ou tout autre agent IA explicitement mandaté peut être responsable de :

- inspection du dépôt ;
- plan de tâche ;
- implémentation ;
- tests ;
- documentation ;
- préparation des PR ;
- correction des erreurs.

L’agent IA ne décide pas :

- des règles ;
- des prix ;
- des caps ;
- de la stack ;
- d’une dérogation sécurité.

## 5.4 Audit indépendant

Un agent distinct de l’implémentation auditée intervient aux checkpoints requis pour auditer :

- fondation ;
- architecture ;
- sécurité ;
- moteur trading/risk ;
- payout ;
- pré-bêta.

Deux agents IA ne modifient pas la même branche en parallèle.

---

# 6. Cadence de travail

## 6.1 Cycle quotidien recommandé

```text
1. Lire la tâche et les documents
2. Inspecter le dépôt
3. Produire le plan
4. Faire valider le plan
5. Implémenter un lot limité
6. Exécuter les tests
7. Auditer le diff
8. Documenter
9. Ouvrir la PR
10. Fusionner uniquement après CI et revue
```

## 6.2 Limite de travail en cours

Maximum :

- une grande branche fonctionnelle ;
- une petite branche corrective.

## 6.3 Fin de journée

Conserver :

- branche poussée ;
- PR ou draft PR ;
- notes ;
- tests exécutés ;
- erreurs restantes ;
- prochaine action.

---

# 7. Structure des milestones

| Milestone | Résultat |
|---|---|
| M0 | Documents, dépôt et Prompt Pack prêts |
| M1 | Fondation technique et design system en code |
| M2 | Identité, checkout sandbox et activation |
| M3 | Market sandbox et moteur de trading |
| M4 | Policy Engine, risque et Evaluation |
| M5 | Hub et terminal complets |
| M6 | Performance et payout sandbox |
| M7 | WARIBA Control, support et incidents |
| M8 | Hardening et bêta privée |

---

# 8. Semaine 0 — Préparation

## Objectif

Créer toutes les conditions nécessaires avant la première ligne de produit.

## Livrables déjà produits

- Product Master ;
- Program Rulebook ;
- Financial Model ;
- UX Architecture ;
- Design System ;
- Engineering Constitution ;
- System Architecture ;
- Security, QA & Operations Standard ;
- Build Plan.

## Livrables restants

- Prompt Pack ;
- Decision Log initial ;
- architecture ADR files ;
- ruleset JSON ;
- design tokens JSON ;
- AGENTS.md ;
- dépôt GitHub configuré.

## Actions

### W0-001 — Créer/valider le dépôt

```text
wariba-platform
Private
README
.gitignore Node
No license
```

### W0-002 — Protéger `main`

- no force push ;
- no deletion ;
- PR required ;
- CI required après workflow ;
- conversation resolved.

### W0-003 — Créer l’arborescence docs

```text
docs/
  00-decisions/
  01-product/
  02-program/
  03-finance/
  04-ux/
  05-design/
  06-engineering/
  07-assurance/
  08-delivery/
  09-prompts/
```

### W0-004 — Ajouter les documents

Placer les versions de référence dans les dossiers appropriés.

### W0-005 — Générer les fichiers machine

- `WARIBA_RULESET_v1.0.json`
- `tokens.json`
- `AGENTS.md`
- `DECISION_LOG.md`

### W0-006 — Créer Prompt Pack

Prompts 00 à 13.

## Exit gate Semaine 0

- tous les documents présents ;
- aucun fichier R1STER actif ;
- dépôt privé ;
- Prompt Foundation prêt ;
- décisions majeures verrouillées ;
- aucun code produit.

---

# 9. Semaine 1 — Fondation

## Objectif

Obtenir un dépôt reproductible, strict, testable et déployable.

## Scope

- monorepo ;
- Next.js ;
- services Realtime et Worker ;
- Supabase local ;
- packages ;
- TypeScript strict ;
- design tokens ;
- UI primitives ;
- observability shell ;
- CI ;
- previews ;
- auth shell.

## Tâches

### W1-001 — Initialiser le monorepo

- pnpm ;
- Turborepo ;
- workspace ;
- Node version ;
- Corepack ;
- scripts standards.

### W1-002 — Créer les applications

- `apps/web` ;
- `services/realtime` ;
- `services/worker`.

### W1-003 — Créer les packages

- design-tokens ;
- ui ;
- contracts ;
- domain ;
- policies ;
- database ;
- validation ;
- observability ;
- adapters ;
- config ;
- test-utils.

### W1-004 — TypeScript strict

Activer toutes les règles constitutionnelles.

### W1-005 — Qualité

- formatter ;
- linter ;
- import boundaries ;
- forbidden patterns ;
- test runner.

### W1-006 — Supabase local

- config ;
- première migration ;
- health ;
- seed minimal ;
- scripts start/reset/test.

### W1-007 — Design tokens en code

- couleurs ;
- typography ;
- spacing ;
- radius ;
- themes ;
- CSS variables.

### W1-008 — UI primitives

- Button ;
- Text ;
- Stack ;
- Grid ;
- Input ;
- Alert ;
- Badge ;
- Card ;
- Skeleton.

### W1-009 — App shell

- public ;
- auth ;
- platform ;
- trade ;
- control ;
- host routing préparé.

### W1-010 — CI

Workflows :

- format ;
- lint ;
- typecheck ;
- unit ;
- build ;
- secret scan.

### W1-011 — Observability shell

- structured logger ;
- correlation ID ;
- error boundary ;
- health endpoints.

### W1-012 — Preview

Configurer preview sans production.

## Tests

- workspace build ;
- dependency boundaries ;
- theme snapshot ;
- accessibility primitive ;
- health endpoints ;
- Supabase migration from zero.

## Livrable visible

- homepage shell ;
- login shell ;
- Hub shell ;
- Trade shell ;
- Control shell ;
- design tokens appliqués.

## Exit gate Semaine 1

- `pnpm run ci` vert ;
- CI GitHub verte ;
- preview disponible ;
- aucun `any` critique ;
- aucun secret ;
- mobile 320 px fonctionnel ;
- première ADR série complète.

---

# 10. Checkpoint Audit A — Fondation

Un agent IA indépendant vérifie :

- arborescence ;
- TypeScript ;
- boundaries ;
- CI ;
- secrets ;
- design tokens ;
- dépendances ;
- scripts ;
- docs ;
- absence de surarchitecture.

Résultat attendu :

```text
PASS
PASS WITH ACTIONS
BLOCK
```

Les actions critiques sont corrigées avant Semaine 2.

---

# 11. Semaine 2 — Identity, Commerce et activation

## Objectif

Créer le parcours complet offre → paiement sandbox → compte actif.

## Scope

- auth ;
- profil ;
- produits ;
- prix ;
- checkout ;
- PSP sandbox ;
- webhook sandbox ;
- fulfillment ;
- account activation ;
- Hub initial.

## Tâches

### W2-001 — Auth

- signup ;
- login ;
- logout ;
- reset ;
- session ;
- email sandbox ;
- protected routes.

### W2-002 — Profil

- nom ;
- pays ;
- langue ;
- consentements ;
- policy acceptance.

### W2-003 — Catalogue

Produits :

- 5K ;
- 10K ;
- 25K ;
- 50K ;
- 100K.

Les cinq tailles sont actives en bêta sandbox. Chaque taille conserve un feature flag indépendant et révocable. Les prix restent candidats et aucune vente publique n’est autorisée par cette activation.

### W2-004 — Pages offres

- comparaison ;
- nature simulée ;
- règles essentielles ;
- policy version ;
- prix FCFA.

### W2-005 — Purchase Order

State machine :

```text
created
→ pending_payment
→ paid
→ fulfilled
```

### W2-006 — PSP sandbox

- initiate ;
- pending ;
- confirmed ;
- failed ;
- duplicate webhook ;
- replay.

### W2-007 — Fulfillment

Après paiement confirmé :

- créer Evaluation ;
- policy version ;
- nominal ;
- symbol set ;
- ledger initial ;
- outbox ;
- notification.

### W2-008 — Checkout UX

- résumé ;
- total ;
- nature simulée ;
- méthode ;
- consentement ;
- double submit.

### W2-009 — Activation

- welcome ;
- Mission intro ;
- compte actif ;
- lien Trade.

### W2-010 — Hub initial

- account context ;
- balance nominale ;
- status ;
- next action ;
- policy chip.

## Tests

- signup permissions ;
- order idempotence ;
- payment webhook signature sandbox ;
- duplicate webhook ;
- double fulfillment ;
- other-user isolation ;
- RLS ;
- E2E checkout.
- matrice catalogue → commande → activation Evaluation pour 5K, 10K, 25K, 50K et 100K.

## Livrable visible

Un bêta-testeur peut s’inscrire, effectuer un paiement sandbox et recevoir un compte WARIBA ONE.

## Exit gate Semaine 2

- un seul compte par fulfillment ;
- aucun retour navigateur autoritaire ;
- policy version enregistrée ;
- consentement versionné ;
- E2E vert ;
- Hub mobile utilisable.

---

# 12. Semaine 3 — Market sandbox et moteur de trading

## Objectif

Placer et exécuter des ordres simulés de façon autoritaire et reproductible.

## Scope

- symbol specs ;
- market sandbox ;
- WebSocket ;
- orders ;
- fills ;
- positions ;
- ledger ;
- PnL ;
- Trade V1.

## Tâches

### W3-001 — Symbol specifications

Pour :

- EURUSD ;
- GBPUSD ;
- USDJPY ;
- XAUUSD ;
- NAS100.

Les valeurs sandbox sont explicitement marquées.

### W3-002 — Market generator

- seed ;
- bid/ask ;
- timestamp ;
- sequence ;
- sessions ;
- status ;
- stale scenarios.

### W3-003 — Realtime connection

- auth ;
- subscribe ;
- heartbeat ;
- reconnect ;
- sequence ;
- resync.

### W3-004 — Order domain

- Market Buy ;
- Market Sell ;
- SL ;
- TP ;
- close partial ;
- close full ;
- Close All.

### W3-005 — Execution

- executable price ;
- spread ;
- deterministic slippage ;
- fill ;
- commission/swap sandbox explicites.

### W3-006 — Positions

- average price ;
- quantity ;
- realized PnL ;
- unrealized PnL ;
- close.

### W3-007 — Ledger

- initial balance ;
- realized PnL ;
- commission ;
- swap ;
- correction pattern.

### W3-008 — Account locking

- row lock ;
- optimistic version ;
- double order protection.

### W3-009 — Trade UI V1

- watchlist ;
- chart ;
- order ticket ;
- positions ;
- orders ;
- history ;
- account context.

### W3-010 — Mobile Trade

- chart ;
- trade bar ;
- bottom sheet ;
- positions list ;
- Close All.

## Tests

- deterministic seed ;
- bid/ask correctness ;
- double order ;
- concurrent orders ;
- position math ;
- ledger reconciliation ;
- reconnect ;
- stale price rejection ;
- mobile E2E.

## Livrable visible

Un utilisateur peut trader les cinq symboles en sandbox et retrouver exactement ses fills et positions après reconnexion.

## Exit gate Semaine 3

- balance réconciliable ;
- aucun calcul autoritaire client ;
- fills immuables ;
- stale data traitée ;
- WebSocket resync ;
- test concurrence vert.

---

# 13. Checkpoint Audit B — Trading core

Audit indépendant :

- order lifecycle ;
- price authority ;
- decimals ;
- ledger ;
- locks ;
- replay ;
- WebSocket ;
- stale handling ;
- frontend logic ;
- RLS.

Aucun développement Risk avant correction des findings critiques.

---

# 14. Semaine 4 — Policy Engine, Risk et Evaluation

## Objectif

Transformer WARIBA ONE en programme réellement appliqué.

## Scope

- policy JSON ;
- target ;
- DLL ;
- Maximum Loss ;
- consistance ;
- trading days ;
- qualified days ;
- soft lock ;
- hard breach ;
- pass.

## Tâches

### W4-001 — Policy schema

- version ;
- hash ;
- validation ;
- publish workflow ;
- seed 1.0.0.

### W4-002 — Profit target

- realized only ;
- no open positions ;
- conditions restantes.

### W4-003 — Daily Loss

- SOD equity ;
- 4 % nominal ;
- soft lock ;
- next reset.

### W4-004 — Maximum Loss

- static floor ;
- equity ;
- hard breach ;
- close positions ;
- audit.

### W4-005 — Consistency

- best day ;
- total realized profit ;
- 40 % ;
- non-breach.

### W4-006 — Trading days

- fills ;
- finalized UTC day ;
- minimum 4.

### W4-007 — Qualified days

- 3 ;
- 0,20 % ;
- day finalization.

### W4-008 — Daily worker

- snapshot ;
- finalize ;
- reset soft lock ;
- idempotence.

### W4-009 — Pass state

- all conditions ;
- no positions ;
- no orders ;
- transition ;
- outbox.

### W4-010 — Risk Ribbon

- DLL ;
- Maximum Loss ;
- status ;
- reset ;
- connection.

### W4-011 — Mission ONE

- target ;
- days ;
- qualified days ;
- consistency ;
- risk ;
- next action.

### W4-012 — Evidence Panel

- rule ;
- threshold ;
- observed ;
- timestamp ;
- source refs ;
- appeal link.

## Tests

- Rulebook golden scenarios ;
- property tests ;
- target latent ;
- DLL edge ;
- Maximum Loss exact boundary ;
- consistency 40/50 ;
- midnight UTC ;
- double daily job ;
- hard breach concurrency ;
- pass idempotence.

## Livrable visible

WARIBA ONE applique réellement ses règles et explique chaque résultat.

## Exit gate Semaine 4

- parity Rulebook/JSON/tests ;
- soft lock distinct ;
- hard breach terminal ;
- consistency non-breach ;
- Mission correcte ;
- replay violation ;
- 100 % branches critiques testées.

---

# 15. Semaine 5 — Hub, Trade et progression intégrés

## Objectif

Rendre l’expérience trader cohérente, complète et mobile.

## Scope

- Hub complet ;
- Mission complète ;
- Trade amélioré ;
- analytics UX ;
- notifications ;
- help basics ;
- offline/stale ;
- usability.

## Tâches

### W5-001 — Hub complet

- state ;
- next action ;
- mission ;
- risk ;
- activity ;
- notifications.

### W5-002 — Mission details

- formulas ;
- calendar ;
- policy ;
- evidence.

### W5-003 — Trade polishing

- chart lines ;
- SL/TP edit ;
- partial close ;
- execution states ;
- keyboard safe actions ;
- mobile refinements.

### W5-004 — Offline

- shell ;
- disconnected state ;
- no offline order ;
- resync.

### W5-005 — Notifications

- in-app ;
- email sandbox ;
- critical/action required.

### W5-006 — Help Center initial

25 à 35 articles critiques planifiés, minimum 10 implémentés pour bêta.

### W5-007 — WARIBA Assist V1

- search ;
- rule explanation ;
- account status ;
- ticket creation ;
- no trading advice.

### W5-008 — Analytics UX

Funnel et progression.

### W5-009 — Accessibility

- keyboard ;
- focus ;
- screen reader ;
- contrast ;
- zoom.

### W5-010 — Usability round 1

Tester :

- état ;
- DLL ;
- consistency ;
- order ;
- breach ;
- next action.

## Tests

- mobile viewports ;
- visual regression ;
- accessibility ;
- offline/reconnect ;
- Assist boundaries ;
- no hidden rule.

## Livrable visible

Le produit cesse d’être un prototype technique et devient une expérience WARIBA cohérente.

## Exit gate Semaine 5

- état compris en 10 secondes ;
- Trade mobile complet ;
- aucune donnée critique hover-only ;
- accessibilité critique ;
- tests utilisateurs documentés ;
- corrections majeures appliquées.

---

# 16. Semaine 6 — Performance et payout sandbox

## Objectif

Implémenter WARIBA Performance et cinq cycles de payout simulé.

## Scope

- Performance account ;
- cycle ;
- threshold ;
- qualified days ;
- consistency ;
- payout eligibility ;
- Payout Breakdown ;
- request ;
- review ;
- payout sandbox ;
- next cycle ;
- WARIBA Review.

## Tâches

### W6-001 — Performance creation

- source Evaluation unique ;
- nominal reset ;
- policy Performance ;
- cycle #1.

### W6-002 — Performance risk

- DLL 3 % ;
- Maximum Loss 6 % ;
- consistency 40 %.

### W6-003 — Qualified days

- 5 ;
- 0,30 %.

### W6-004 — Threshold

- cycle #1 : 4 % ;
- cycles #2–#5 : 3 %.

### W6-005 — Payout formula

- 50 % profit ;
- cap ;
- split ;
- trader cash ;
- fees sandbox.

### W6-006 — Eligibility checklist

Toutes conditions Rulebook.

### W6-007 — Payout request

- snapshot ;
- freeze ;
- unique ;
- audit.

### W6-008 — Review

- automated checks ;
- human review ;
- approve ;
- request info ;
- reject with reason.

### W6-009 — Payout adapter sandbox

- processing ;
- paid ;
- failed ;
- replay ;
- reconciliation.

### W6-010 — Cycle close

- debit Payout Base ;
- close ;
- next cycle ;
- reset metrics.

### W6-011 — Review after #5

- review case ;
- no Live promise.

### W6-012 — Payout Center

- checklist ;
- breakdown ;
- status ;
- receipt ;
- appeal.

## Tests

- payout ≤ 50 % ;
- payout ≤ cap ;
- split ;
- duplicate request ;
- provider replay ;
- freeze ;
- no open position ;
- cycle reset ;
- fifth payout ;
- no automatic Live ;
- ledger reconciliation.

## Livrable visible

Un trader Performance peut demander un payout sandbox, être revu, être payé et démarrer un nouveau cycle.

## Exit gate Semaine 6

- formules conformes ;
- aucun double payout ;
- ledger debit correct ;
- cycle isolé ;
- Control permissions ;
- payout explanation complète ;
- reserve non utilisée pour réduire un payout.

---

# 17. Checkpoint Audit C — Risk et payout

Audit indépendant approfondi :

- Rulebook parity ;
- Decimal ;
- cycles ;
- caps ;
- splits ;
- ledger ;
- idempotence ;
- permissions ;
- freeze ;
- provider retries ;
- audit evidence ;
- race conditions.

Les findings critiques bloquent Semaine 7.

---

# 18. Semaine 7 — WARIBA Control, support et opérations

## Objectif

Permettre à une équipe réduite d’opérer la bêta sans accès dangereux.

## Scope

- Control dashboard ;
- users/accounts ;
- payout queue ;
- disputes ;
- incidents ;
- treasury ;
- feature flags ;
- audit ;
- RBAC ;
- support.

## Tâches

### W7-001 — Control auth

- staff roles ;
- MFA-ready ;
- session ;
- no-index ;
- audit.

### W7-002 — User view

- profile ;
- accounts ;
- payments ;
- tickets ;
- timeline.

### W7-003 — Account view

- orders ;
- fills ;
- positions ;
- risk ;
- violations ;
- policy ;
- evidence.

### W7-004 — Payout queue

- filters ;
- age ;
- amount ;
- status ;
- reviewer ;
- permission.

### W7-005 — Review screen

- eligibility ;
- calculation ;
- KYC sandbox ;
- integrity signals ;
- incidents ;
- decision.

### W7-006 — Disputes

- submitted ;
- acknowledged ;
- investigating ;
- decision ;
- resolved.

### W7-007 — Treasury

- reserve sandbox ;
- projected payouts ;
- coverage ;
- status ;
- gates commerciaux indépendants des cinq tailles.

### W7-008 — Feature flags

- 25K ;
- trading pause ;
- symbol pause ;
- payments ;
- payouts ;
- maintenance.

### W7-009 — Incident Center

- create ;
- severity ;
- status ;
- affected components ;
- timeline ;
- public status draft.

### W7-010 — Audit explorer

- actor ;
- action ;
- target ;
- reason ;
- correlation.

### W7-011 — Runbooks

Implémenter et tester les 15 runbooks prioritaires.

### W7-012 — Support

- ticket queue ;
- response ;
- escalation ;
- Assist summary.

## Tests

- RBAC matrix ;
- no support payout approval ;
- no direct balance edit ;
- kill switch audit ;
- dispute workflow ;
- treasury thresholds ;
- Control accessibility ;
- Control security.

## Livrable visible

L’équipe peut opérer WARIBA depuis Control sans SQL manuel de routine.

## Exit gate Semaine 7

- roles corrects ;
- actions sensibles auditées ;
- no universal admin ;
- incidents opérables ;
- support opérable ;
- runbooks testés ;
- cinq tailles actives en sandbox ; flags indépendants testés ;
- tailles à forte exposition désactivables individuellement avant toute ouverture publique.

---

# 19. Semaine 8 — Hardening et bêta privée

## Objectif

Transformer le produit intégré en bêta exploitable.

## Scope

- security ;
- QA ;
- load ;
- resilience ;
- restore ;
- UX fixes ;
- release ;
- onboarding testers.

## Tâches

### W8-001 — Full regression

- unit ;
- property ;
- integration ;
- RLS ;
- concurrency ;
- E2E ;
- visual ;
- accessibility.

### W8-002 — Security review

- auth ;
- RBAC ;
- RLS ;
- API ;
- WebSocket ;
- uploads ;
- secrets ;
- Control ;
- webhooks.

### W8-003 — Load

- 25 traders ;
- 100 connections ;
- burst ;
- reconnect.

### W8-004 — Resilience

- restart Realtime ;
- restart Worker ;
- stale provider ;
- duplicate webhook ;
- DB latency.

### W8-005 — Backup/restore staging

- DB ;
- policies ;
- ledger ;
- storage ;
- report.

### W8-006 — Incident drill

Scénarios :

- market stale ;
- bad deploy ;
- ledger mismatch ;
- payout stuck.

### W8-007 — Usability round 2

10 à 15 traders/testeurs.

### W8-008 — Fix window

Uniquement :

- blockers ;
- severe bugs ;
- trust issues ;
- mobile ;
- accessibility.

### W8-009 — Beta release

- version ;
- changelog ;
- release notes ;
- onboarding ;
- support channel ;
- feedback form.

### W8-010 — Beta operations

- tester roster ;
- daily review ;
- incident owner ;
- feedback triage ;
- cohort tracking.

## Exit gate Semaine 8

- aucun S0/S1 ouvert ;
- CI verte ;
- restore réussi ;
- load cible ;
- incident drill ;
- beta users isolés ;
- providers sandbox ;
- support prêt ;
- no real money.

---

# 20. Milestone de bêta privée

## Statut attendu

```text
READY_FOR_PRIVATE_BETA
```

## Pas encore

```text
READY_FOR_PAID_BETA
READY_FOR_PUBLIC
```

---

# 21. Après la bêta privée

La phase suivante dépend des résultats.

## Phase A — Correction

- bugs ;
- incompréhensions ;
- latence ;
- support ;
- règles.

## Phase B — Économie réelle

- pass rate ;
- payout rate ;
- cap utilization ;
- CAC ;
- support cost ;
- reserve.

## Phase C — Providers

- market data ;
- PSP ;
- payout rails ;
- KYC ;
- email ;
- observability.

## Phase D — Paid beta

Seulement après gates.

---

# 22. Gates de bêta payante

Avant encaissement réel :

- avis juridique ;
- conditions ;
- privacy ;
- PSP marchand ;
- refund policy ;
- reconciliation ;
- security review ;
- KYC path ;
- support ;
- backups ;
- incident communication ;
- production secrets ;
- reserve policy.

---

# 23. Gates de payout réel

- KYC réel ;
- beneficiary match ;
- payout rail ;
- finance RBAC ;
- dual approval ;
- reconciliation ;
- treasury process ;
- reserve financée ;
- payout failure test ;
- legal/tax confirmation.

---

# 24. Gates de lancement public

- données de marché licenciées ;
- ancien projet BRVM renommé ;
- marque/domaine clarifiés ;
- security audit ;
- load test ;
- restore test ;
- support ;
- status page ;
- SLOs ;
- public rules parity ;
- reserve coverage ;
- pricing validé ;
- caps validés ;
- no critical bugs.

---

# 25. Prompt Pack mapping

| Prompt | Phase |
|---|---|
| Prompt 00 — Context Loader | Avant chaque session |
| Prompt 01 — Repository Foundation | Semaine 1 |
| Prompt 02 — Design System & App Shell | Semaine 1 |
| Prompt 03 — Identity, Commerce & Activation | Semaine 2 |
| Prompt 04 — Trading Core | Semaine 3 |
| Prompt 05 — Policy, Risk & Evaluation | Semaine 4 |
| Prompt 06 — Trader Hub | Semaine 5 |
| Prompt 07 — WariX | Semaines 3 et 5 |
| Prompt 08 — Performance & Payout | Semaine 6 |
| Prompt 09 — WARIBA Control | Semaine 7 |
| Prompt 10 — Help, Support & Assist | Semaines 5 et 7 |
| Prompt 11 — Marketing Site | Semaines 2 et 5 |
| Prompt 12 — Security & Reliability Audit | Semaine 8 |
| Prompt 13 — Private Beta Release | Semaine 8 |

---

# 26. Décomposition des PR

## PR Foundation

- monorepo ;
- CI ;
- configs.

## PR Design

- tokens ;
- primitives ;
- app shell.

## PR Auth

- auth ;
- protected routes.

## PR Commerce

- products ;
- checkout ;
- sandbox payment.

## PR Trading Data

- symbols ;
- generator ;
- WebSocket.

## PR Trading Domain

- orders ;
- fills ;
- positions ;
- ledger.

## PR Trade UI

- chart ;
- ticket ;
- positions.

## PR Risk

- policies ;
- DLL ;
- Maximum Loss ;
- consistency.

## PR Mission

- Hub ;
- progression ;
- evidence.

## PR Performance

- cycles ;
- thresholds ;
- qualified days.

## PR Payout

- eligibility ;
- request ;
- review ;
- sandbox transfer.

## PR Control

- account/payout/support/incident views.

## PR Hardening

- security ;
- resilience ;
- beta.

---

# 27. Branch naming

```text
feat/repository-foundation
feat/design-system-shell
feat/auth-commerce
feat/market-sandbox
feat/trading-core
feat/policy-risk
feat/trader-hub
feat/wariba-trade
feat/performance-payout
feat/wariba-control
feat/help-support
security/private-beta-hardening
```

---

# 28. Definition of Ready par tâche

Une tâche ne commence pas sans :

- objectif ;
- source de vérité ;
- dépendances ;
- design ou architecture ;
- acceptance criteria ;
- test plan ;
- migration impact ;
- security impact ;
- open decisions.

---

# 29. Definition of Done par tâche

- code ;
- types ;
- lint ;
- unit tests ;
- integration tests si nécessaire ;
- E2E si critique ;
- mobile ;
- accessibility ;
- error states ;
- audit ;
- metrics ;
- docs ;
- PR ;
- CI verte ;
- review.

---

# 30. Budget initial

Budget cible : environ 1 000 USD.

## 30.1 Priorités budgétaires

1. domaine et hébergement minimum ;
2. Supabase ;
3. déploiement preview/staging ;
4. email sandbox/transactionnel ;
5. observabilité minimum ;
6. tests utilisateurs ;
7. provider market data uniquement lorsqu’indispensable ;
8. audit ponctuel.

## 30.2 Dépenses à éviter en bêta

- agence ;
- design abonnement coûteux ;
- app native ;
- Kubernetes ;
- multiples providers redondants ;
- data vendor premium public avant besoin ;
- outils entreprise ;
- marketing massif ;
- sponsoring ;
- influenceurs ;
- licence inutile.

## 30.3 Gate budget

Toute nouvelle dépense doit répondre :

- bloque-t-elle la bêta ?
- réduit-elle un risque critique ?
- existe-t-il une alternative gratuite ?
- devient-elle un coût récurrent ?
- est-elle compatible avec 1 000 USD ?

---

# 31. Estimation de charge relative

| Workstream | Charge |
|---|---:|
| Foundation | 10 % |
| Identity/Commerce | 10 % |
| Trading Core | 20 % |
| Risk/Evaluation | 15 % |
| Hub/Trade UX | 15 % |
| Performance/Payout | 15 % |
| Control/Support | 10 % |
| Hardening | 15 % |

Total supérieur à 100 % en effort potentiel car certaines activités se chevauchent.

---

# 32. Chemin critique

```text
Foundation
→ Auth/Commerce
→ Trading Core
→ Risk/Evaluation
→ Performance/Payout
→ Control
→ Hardening
```

Les éléments suivants ne doivent pas bloquer le chemin critique :

- logo final ;
- photographie ;
- Academy ;
- affiliation ;
- certificat ;
- anglais ;
- app native.

---

# 33. Dépendances critiques

## Trading Core dépend de

- symbol specs ;
- database ;
- Realtime ;
- Decimal ;
- account state.

## Risk dépend de

- fills ;
- positions ;
- ledger ;
- policy ;
- clock ;
- market snapshots.

## Payout dépend de

- Performance ;
- cycles ;
- ledger ;
- KYC sandbox ;
- Control ;
- provider adapter.

## Control dépend de

- auth ;
- RBAC ;
- audit ;
- read models.

---

# 34. Stop conditions

Arrêter la progression de semaine si :

- CI rouge persistante ;
- architecture contournée ;
- règle ambiguë ;
- ledger divergent ;
- test critique absent ;
- RLS insuffisante ;
- double action possible ;
- secret exposé ;
- provider sandbox mal isolé ;
- mobile inutilisable ;
- scope en dérive ;
- agent invente une règle.

---

# 35. Scope control

Toute nouvelle demande est classée :

- Must ;
- Should ;
- Could ;
- Deferred ;
- Rejected V1.

Une fonctionnalité entre dans les huit semaines uniquement si :

- elle est Must ;
- elle protège une règle critique ;
- elle est nécessaire à la bêta.

---

# 36. Risques de livraison

## 36.1 Complexité trading

Mitigation :

- market orders d’abord ;
- cinq symboles ;
- sandbox ;
- pas d’EA ;
- pas de pending orders avancés.

## 36.2 Mobile Trade

Mitigation :

- prototype tôt ;
- bottom sheets ;
- tests Semaine 3 et 5.

## 36.3 Payout complexity

Mitigation :

- sandbox ;
- cycles limités ;
- formule explicite ;
- tests propriété.

## 36.4 Perte de contexte de l’agent IA

Mitigation :

- Prompt 00 ;
- AGENTS.md ;
- petites PR ;
- docs ;
- résumés.

## 36.5 Overengineering

Mitigation :

- ADR ;
- modular monolith ;
- no Redis/Kafka/Kubernetes.

## 36.6 Visual inconsistency

Mitigation :

- tokens ;
- Storybook ;
- visual tests ;
- Design System.

---

# 37. Risques de calendrier

## 37.1 Réalité

Huit semaines sont une cible agressive.

La date glisse si :

- Rod n’est pas disponible pour valider ;
- les règles changent ;
- l’architecture change ;
- les agents refactorisent sans nécessité ;
- trop de polish marketing est ajouté ;
- des providers réels sont intégrés tôt.

## 37.2 Réponse

Protéger :

1. moteur ;
2. risque ;
3. payout ;
4. Control ;
5. mobile ;
6. sécurité.

Réduire :

- marketing ;
- illustrations ;
- fonctionnalités secondaires.

---

# 38. Revue hebdomadaire

Chaque fin de semaine :

## Produit

- objectif atteint ?
- scope respecté ?
- UX cohérente ?

## Engineering

- CI ?
- dette ?
- architecture ?

## Risk/Finance

- règles ?
- calculs ?
- invariants ?

## Security/QA

- tests ?
- permissions ?
- incidents ?

## Delivery

- milestone ?
- blockers ?
- décision go/no-go ?

---

# 39. Tableau de suivi

| Champ | Valeur |
|---|---|
| Task ID | W3-004 |
| Titre | Order domain |
| Owner | Agent IA mandaté |
| Reviewer | Rod/ChatGPT |
| Status | Todo/In Progress/Review/Done/Blocked |
| Branch | feat/trading-core |
| PR | URL |
| Tests | Liste |
| Risks | Liste |
| Decision | ID |
| Evidence | Capture/log/test |
| Next | Action |

---

# 40. Statuts standards

```text
NOT_STARTED
READY
IN_PROGRESS
IN_REVIEW
BLOCKED
DONE
DEFERRED
REJECTED
```

---

# 41. Reporting quotidien

Format recommandé :

```text
Terminé
- ...

Tests
- ...

Problèmes
- ...

Décisions nécessaires
- ...

Prochaine étape
- ...
```

---

# 42. Reporting hebdomadaire

```text
Milestone
Scope prévu
Scope livré
Tests
Findings
Risques
Décisions
Budget
Go / No-Go
```

---

# 43. Versioning des documents pendant le build

Une modification majeure crée :

- Product Master 1.1 ;
- Rulebook 1.1 ;
- Architecture 1.1 ;
- Build Plan 1.1.

Le code ne précède pas la décision.

---

# 44. Gestion des changements de règles

Processus :

```text
proposition
→ impact produit
→ impact financier
→ impact UX
→ impact architecture
→ tests
→ Decision Log
→ nouvelle policy
→ nouveaux comptes seulement
```

---

# 45. Gestion des bugs financiers

Un bug touchant :

- balance ;
- equity ;
- risk ;
- payout ;
- payment ;
- ledger ;

est classé minimum S1, potentiellement S0.

Actions :

- freeze ;
- reproduce ;
- replay ;
- correct ;
- audit ;
- communicate.

---

# 46. Utilisabilité

## Round 1 — Semaine 5

Objectif :

- compréhension ;
- Trade ;
- Mission.

## Round 2 — Semaine 8

Objectif :

- parcours complet ;
- confiance ;
- payout ;
- support.

---

# 47. Bêta-testeurs

Profil :

- débutant discipliné ;
- intermédiaire ;
- confirmé.

Éviter uniquement les proches ou profils trop techniques.

## 47.1 Accord

Les testeurs comprennent :

- sandbox ;
- aucun argent réel ;
- données test ;
- feedback attendu ;
- aucune garantie de conservation.

---

# 48. Feedback bêta

Catégories :

- bug ;
- incompréhension ;
- manque ;
- performance ;
- confiance ;
- mobile ;
- règle ;
- support.

Priorisation :

- sécurité ;
- finance ;
- règle ;
- blocage ;
- confiance ;
- polish.

---

# 49. Métriques de bêta

## Activation

- signup ;
- payment sandbox ;
- account activation ;
- first trade.

## Trading

- orders ;
- rejects ;
- reconnect ;
- mobile use.

## Understanding

- rule views ;
- support questions ;
- consistency confusion ;
- soft lock confusion.

## Operations

- tickets ;
- incidents ;
- replay ;
- reviewer time.

---

# 50. Critères de succès de bêta

- aucun double résultat ;
- aucun ledger mismatch ;
- aucune isolation cassée ;
- règles comprises ;
- Trade mobile utilisable ;
- payout sandbox complet ;
- Control opérable ;
- incidents détectés ;
- support capable de répondre.

---

# 51. Critères d’échec de bêta

- utilisateurs confondent nominal et argent réel ;
- balance divergente ;
- order status ambigu ;
- soft lock incompris ;
- payout incompréhensible ;
- Control trop puissant ;
- bugs non détectés ;
- système non récupérable.

---

# 52. Plan de correction post-bêta

## Sprint 1

S0/S1.

## Sprint 2

Compréhension et UX.

## Sprint 3

Performance et operations.

## Sprint 4

Provider readiness.

---

# 53. Marketing pendant build

Autorisé :

- documentation du processus ;
- waitlist ;
- contenu éducatif ;
- transparence ;
- prototype étiqueté.

Interdit :

- vendre avant gates ;
- promettre payout ;
- faux screenshots ;
- faux traders ;
- compte à rebours ;
- faux launch date.

---

# 54. Ancien projet BRVM

Avant lancement public WARIBA :

- renommer l’ancien projet ;
- séparer domaine et assets ;
- clarifier marque ;
- éviter confusion.

Cette tâche ne bloque pas nécessairement la bêta privée interne.

---

# 55. Decision Log Build initial

| ID | Décision | Statut | Motif |
|---|---|---|---|
| BP-001 | Cible 8 semaines | `CANDIDATE` | Bêta privée |
| BP-002 | Semaine 0 avant code | `LOCKED` | Préparation |
| BP-003 | Vertical slices | `LOCKED` | Valeur testable |
| BP-004 | CI Semaine 1 | `LOCKED` | Qualité |
| BP-005 | Sandbox avant réel | `LOCKED` | Risque |
| BP-006 | Market orders d’abord | `LOCKED` | Scope |
| BP-007 | 5 symboles | `LOCKED` | Simplicité |
| BP-008 | 10–25 testeurs | `CANDIDATE` | Bêta contrôlée |
| BP-009 | Paiement réel exclu bêta 1 | `LOCKED` | Sécurité |
| BP-010 | Payout réel exclu bêta 1 | `LOCKED` | Sécurité |
| BP-011 | Audit après Foundation | `LOCKED` | Architecture |
| BP-012 | Audit après Trading | `LOCKED` | Intégrité |
| BP-013 | Audit après Payout | `LOCKED` | Finance |
| BP-014 | 25K off | `SUPERSEDED` | Remplacé par BP-021 / OFFER-023 |
| BP-015 | Mobile chaque semaine | `LOCKED` | Marché |
| BP-016 | No parallel agent branch | `LOCKED` | Cohérence |
| BP-017 | Public launch séparé | `LOCKED` | Gates |
| BP-018 | Budget ~1 000 USD | `CANDIDATE` | Contrainte |
| BP-019 | Logo non critique | `LOCKED` | Chemin critique |
| BP-020 | Restriction historique à Claude seul | `SUPERSEDED` | Remplacé par AI-015 |
| BP-021 | 5K/10K/25K/50K/100K actifs en sandbox, sans autorisation publique | `LOCKED` | Couverture de construction et tests de bout en bout |

---

# 56. Décisions ouvertes

1. dates calendaires exactes ;
2. temps disponible de Rod ;
3. provider preview ;
4. provider staging ;
5. provider container ;
6. logo final ;
7. exact beta roster ;
8. feedback tooling ;
9. Storybook final ;
10. visual regression tool ;
11. email sandbox ;
12. exact market sandbox specs ;
13. pending orders scope ;
14. SL/TP interaction exacte ;
15. KYC sandbox UX ;
16. dual approval sandbox ;
17. test users count ;
18. support channel ;
19. bug tracker ;
20. analytics provider ;
21. public waitlist ;
22. visibilité et disponibilité publique des tailles 25K, 50K et 100K ;
23. certificate timing ;
24. onboarding length ;
25. daily coding availability.

---

# 57. Audit des 35 rôles

| # | Rôle | Exigence Build Plan |
|---:|---|---|
| 1 | CEO | Milestones alignés sur une bêta réelle. |
| 2 | COO | Cadence, owners et gates. |
| 3 | CFO | Budget et payout sandbox. |
| 4 | CPO | Parcours complet livré. |
| 5 | Chief of Staff | Reporting et Decision Log. |
| 6 | Market Strategist | Mobile et français dès le début. |
| 7 | Brand Strategist | WARIBA uniquement. |
| 8 | Art Director | Design System dès S1. |
| 9 | Content Strategist | Help et microcopy intégrés. |
| 10 | Growth Lead | Pas de scale avant stabilité. |
| 11 | Product Manager | Scope Must/Deferred. |
| 12 | UX Researcher | Deux rounds de tests. |
| 13 | Information Architect | Sitemaps implémentés progressivement. |
| 14 | Product Designer | Mobile et états chaque semaine. |
| 15 | Design System Lead | Tokens et visual QA. |
| 16 | CRO | Risk engine en S4. |
| 17 | Market Specialist | Symbol specs en S3. |
| 18 | Execution Specialist | Trading core avant polish. |
| 19 | Quant Analyst | Property tests. |
| 20 | Market Data Engineer | Sandbox seedé. |
| 21 | Software Architect | Foundation et audits. |
| 22 | Frontend Lead | Shell, Hub, Trade. |
| 23 | Backend Lead | Domaine, transactions, outbox. |
| 24 | Database Architect | Migrations et RLS. |
| 25 | Realtime Engineer | S3 et hardening. |
| 26 | Security Engineer | Assurance continue. |
| 27 | SRE | CI, staging, incidents, restore. |
| 28 | QA Lead | Gates et regression. |
| 29 | Payments Lead | Sandbox puis providers. |
| 30 | Fraud Lead | Integrity sans automation punitive. |
| 31 | Legal Counsel | Public launch séparé. |
| 32 | Privacy Lead | Données fictives en bêta. |
| 33 | Customer Operations | Support et disputes S7. |
| 34 | AI Lead | Prompt Pack et agent controls. |
| 35 | Community/Affiliate Lead | Affiliation différée. |

---

# 58. Definition of Done du Build Plan

Le plan est considéré exploitable lorsque :

1. chaque semaine possède un objectif ;
2. chaque semaine possède des livrables ;
3. chaque semaine possède des tests ;
4. chaque semaine possède un exit gate ;
5. le chemin critique est explicite ;
6. les dépendances sont explicites ;
7. les audits sont planifiés ;
8. la bêta est clairement distincte du public ;
9. les providers réels sont différés ;
10. le budget est protégé ;
11. les stop conditions sont définies ;
12. les rôles humains et IA sont définis ;
13. les prompts peuvent être écrits sans inventer une séquence ;
14. tout agent IA mandaté peut travailler par PR limitée ;
15. aucune fonctionnalité V1 critique n’est oubliée.

---

# 59. Gate avant Prompt Pack — franchi

Ce gate a été franchi avant la construction. État vérifié au 2026-08-03 :

- ce Build Plan est accepté ;
- tous les documents sont disponibles ;
- la séquence 00 à 13 est confirmée ;
- les agents IA autorisés sont définis par AI-015 ;
- le dépôt est initialisé et les Prompts 01 à 04 sont implémentés ;
- les sources de vérité et décisions AI-015/OFFER-023 sont synchronisées ;
- la prochaine phase reste Prompt 05, sans réordonner le chemin critique ;
- la revue indépendante et la CI de PR restent des gates avant merge.

---

# 60. Conclusion

WARIBA ne doit pas être construit comme une démonstration spectaculaire qui s’effondre dès le premier payout.

Le plan protège l’ordre correct :

```text
Fondation
→ Commerce
→ Trading
→ Risk
→ Experience
→ Performance/Payout
→ Control
→ Hardening
```

La première victoire n’est pas le lancement public.

La première victoire est une bêta privée dans laquelle :

- chaque compte est isolé ;
- chaque ordre est traçable ;
- chaque règle est appliquée ;
- chaque violation est explicable ;
- chaque payout sandbox est réconciliable ;
- chaque action interne est auditée ;
- chaque incident possède une réponse.

Cette version 1.0 devient la source de vérité de livraison de WARIBA. Aucun prompt ou agent ne peut réordonner le chemin critique, introduire un provider réel prématurément ou élargir le périmètre sans Decision Log et validation explicite.

---

# 61. Appendice 08-A — gate Prompt 08

Le gate Prompt 08 exige : provider payout `mock/manual` agnostique, soumission
distincte du règlement, payout freeze, hypothèses actuarielles persistées,
reconstruction/hold/reversal, trigger atomique, SL/TP, ticks ordonnés,
actif/standby fenced, matrice RBAC, audit/rate limit, runbooks et pipeline complet.
Les providers réels, credentials market data commerciaux, load balancer déployé,
secrets production et approbations légales restent des gates externes ; ils ne
sont ni simulés ni déclarés livrés.
