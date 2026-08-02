---
title: "WARIBA Prompt Pack"
version: "1.0"
document_id: "WARIBA-PROMPT-PACK"
status: "READY FOR CODEX — AUCUN PROMPT NE DOIT ÊTRE EXÉCUTÉ HORS SÉQUENCE"
language: "fr-FR"
brand: "WARIBA"
domain: "wariba.app"
market: "Afrique francophone"
owner: "WARIBA Product, Engineering, Risk & AI"
source_of_truth_priority: 10
depends_on:
  - "WARIBA Product Master Document v1.0"
  - "WARIBA Program Rulebook v1.0"
  - "WARIBA Financial Model v1.0"
  - "WARIBA UX Architecture v1.0"
  - "WARIBA Design System v1.0"
  - "WARIBA Engineering Constitution v1.0"
  - "WARIBA System Architecture v1.0"
  - "WARIBA Security, QA & Operations Standard v1.0"
  - "WARIBA Build Plan v1.0"
---

# WARIBA Prompt Pack v1.0

> **Le contexte d’abord. Le plan ensuite. Le code après validation.**

## Contrôle du document

| Champ | Valeur |
|---|---|
| Marque | WARIBA |
| Domaine | `wariba.app` |
| Dépôt cible | GitHub privé `wariba-platform` |
| État actuel | Dossier créé, aucun code produit commencé |
| Agent principal | Codex |
| Auditeur secondaire | Claude Code aux checkpoints uniquement |
| Nombre de prompts | 14 |
| Séquence | Prompt 00 → Prompt 13 |
| Produit cible | Bêta privée sandbox |
| Paiements réels | Non dans la première bêta |
| Payouts réels | Non dans la première bêta |
| Capital réel | Non |
| Application native | Non |
| Langue de l’interface | Français |
| Statut | Prêt à être placé dans `docs/09-prompts/` |

---

# 1. Mode d’emploi obligatoire

## 1.1 Ne pas envoyer tout le pack à Codex en une seule fois

Chaque prompt correspond à une phase précise.

La séquence correcte est :

```text
Prompt 00 — Context Loader
Prompt 01 — Repository Foundation
Prompt 02 — Design System & App Shell
Prompt 03 — Identity, Commerce & Activation
Prompt 04 — Trading Core
Prompt 05 — Policy, Risk & Evaluation
Prompt 06 — Trader Hub
Prompt 07 — WARIBA Trade
Prompt 08 — Performance & Payout
Prompt 09 — WARIBA Control
Prompt 10 — Help, Support & Assist
Prompt 11 — Marketing Site
Prompt 12 — Security & Reliability Audit
Prompt 13 — Private Beta Release
```

## 1.2 Prompt 00 est utilisé avant chaque nouvelle grande session

Le Prompt 00 recharge le contexte, inspecte le dépôt et empêche Codex de travailler sur une compréhension ancienne.

## 1.3 Un prompt n’autorise pas automatiquement la fusion

Après chaque prompt :

1. Codex exécute les tests ;
2. Codex produit un rapport ;
3. la PR est inspectée ;
4. la CI doit être verte ;
5. Rod valide ;
6. la branche est fusionnée.

## 1.4 Ne jamais exécuter deux agents sur la même branche

- Codex construit ;
- Claude Code audite une branche ou un commit terminé ;
- les corrections reviennent ensuite à Codex dans une nouvelle branche.

## 1.5 Les documents dominent les prompts

Si ce Prompt Pack contredit un document supérieur :

- arrêter ;
- signaler la contradiction ;
- ne pas choisir silencieusement ;
- demander une décision.

---

# 2. Instructions communes à tous les prompts

Les instructions suivantes s’appliquent à chaque prompt, même lorsqu’elles ne sont pas répétées intégralement.

## 2.1 Sources de vérité à lire

```text
docs/01-product/WARIBA_Product_Master_Document_v1.0.md
docs/02-program/WARIBA_Program_Rulebook_v1.0.md
docs/03-finance/WARIBA_Financial_Model_v1.0.xlsx
docs/04-ux/WARIBA_UX_Architecture_v1.0.md
docs/05-design/WARIBA_Design_System_v1.0.md
docs/06-engineering/WARIBA_Engineering_Constitution_v1.0.md
docs/06-engineering/WARIBA_System_Architecture_v1.0.md
docs/07-assurance/WARIBA_Security_QA_Operations_Standard_v1.0.md
docs/08-delivery/WARIBA_Build_Plan_v1.0.md
docs/00-decisions/DECISION_LOG.md
AGENTS.md
```

Le fichier Excel est consulté pour les hypothèses économiques. Il n’est jamais utilisé comme moteur runtime.

## 2.2 Workflow obligatoire

```text
INSPECT
→ SUMMARIZE
→ IDENTIFY CONFLICTS
→ PROPOSE PLAN
→ WAIT FOR APPROVAL WHEN REQUIRED
→ IMPLEMENT
→ TEST
→ AUDIT
→ DOCUMENT
→ REPORT
```

## 2.3 Interdictions permanentes

L’agent ne peut pas :

- renommer WARIBA ;
- réintroduire R1STER ;
- modifier une règle métier ;
- inventer un prix ;
- inventer un cap ;
- utiliser un float JavaScript pour une valeur financière ;
- calculer l’autorité financière dans le frontend ;
- exposer une clé service role ;
- affaiblir RLS ;
- ajouter un provider réel sans décision ;
- ajouter Redis, Kafka ou Kubernetes ;
- créer des microservices métier ;
- ajouter une app native ;
- ajouter futures, crypto ou copy trading ;
- utiliser des données de marché commerciales non licenciées ;
- créer de faux payouts ou faux témoignages ;
- copier l’interface d’une autre prop firm ;
- utiliser un template générique sans l’adapter ;
- modifier une migration déjà appliquée ;
- pousser directement sur `main` ;
- fusionner sa propre PR ;
- masquer un test échoué ;
- désactiver un test pour obtenir du vert ;
- utiliser `any` comme raccourci ;
- laisser un TODO critique ;
- prétendre qu’une commande a réussi sans l’avoir exécutée ;
- laisser un mock sandbox actif en production ;
- introduire une dépendance sans justification ;
- réécrire massivement une zone non concernée.

## 2.4 Règles de sortie

À la fin de chaque prompt, l’agent répond avec :

```text
1. Résumé du travail
2. Fichiers créés/modifiés
3. Décisions appliquées
4. Tests exécutés
5. Résultats exacts
6. Risques ou limites
7. Décisions encore ouvertes
8. Commandes pour vérifier localement
9. Proposition de PR
10. Statut : PASS / PASS WITH ACTIONS / BLOCKED
```

## 2.5 Stop conditions

L’agent s’arrête sans coder si :

- un document requis manque ;
- une règle nécessaire est `OPEN` et empêche l’implémentation ;
- la branche n’est pas correcte ;
- le dépôt contient une architecture incompatible non décidée ;
- une action détruirait des données ;
- un secret est détecté ;
- les tests de base sont déjà rouges pour une cause inconnue ;
- le scope du prompt est impossible à isoler.

---

# 3. Prompt 00 — Context Loader

## Usage

À envoyer :

- au début de la première session ;
- au début d’une nouvelle session Codex ;
- après une longue interruption ;
- après un changement documentaire majeur ;
- avant un audit.

## Prompt prêt à copier

```text
Tu travailles sur WARIBA, une plateforme francophone de trading simulé et de progression pour traders, destinée initialement à l’Afrique francophone.

Ta première tâche est strictement une tâche d’inspection et de chargement du contexte. Ne modifie aucun fichier, ne génère aucun code, n’installe aucune dépendance et ne lance aucune migration.

1. Inspecte le dépôt complet.
2. Lis intégralement, dans cet ordre :
   - AGENTS.md
   - docs/00-decisions/DECISION_LOG.md
   - docs/01-product/WARIBA_Product_Master_Document_v1.0.md
   - docs/02-program/WARIBA_Program_Rulebook_v1.0.md
   - docs/04-ux/WARIBA_UX_Architecture_v1.0.md
   - docs/05-design/WARIBA_Design_System_v1.0.md
   - docs/06-engineering/WARIBA_Engineering_Constitution_v1.0.md
   - docs/06-engineering/WARIBA_System_Architecture_v1.0.md
   - docs/07-assurance/WARIBA_Security_QA_Operations_Standard_v1.0.md
   - docs/08-delivery/WARIBA_Build_Plan_v1.0.md
3. Inspecte les scripts, le package manager, les workflows GitHub, les migrations, les packages et la structure des applications.
4. Identifie la branche actuelle, les changements non commités, les tests disponibles et l’état de la CI si visible.
5. Cherche explicitement :
   - toute référence active à R1STER ;
   - toute règle codée en dur ;
   - tout calcul financier en number/float ;
   - tout accès frontend direct à une donnée financière ;
   - tout secret ;
   - tout TODO critique ;
   - toute migration modifiée ;
   - toute divergence entre documents et code ;
   - toute dépendance ou service non autorisé.

Produis uniquement un rapport structuré :

A. État actuel du dépôt
B. Dernier milestone réellement terminé
C. Architecture réellement observée
D. Documents trouvés et manquants
E. Tests et commandes disponibles
F. Divergences ou risques
G. Travail recommandé pour la prochaine session
H. Questions bloquantes
I. Statut : READY / READY WITH ACTIONS / BLOCKED

Ne propose aucun changement de stack.
Ne commence aucun code.
Ne suppose jamais qu’une fonctionnalité existe sans preuve dans le dépôt.
```

## Critère de réussite

Le rapport doit permettre de vérifier que Codex comprend l’état réel et non seulement le plan théorique.

---

# 4. Prompt 01 — Repository Foundation

## Branche

```text
feat/repository-foundation
```

## Objectif

Initialiser proprement le monorepo sans construire les fonctionnalités métier.

## Prompt prêt à copier

```text
Tu es le Principal Software Architect et Staff Engineer chargé d’initialiser le dépôt WARIBA.

Commence par exécuter le Prompt 00 Context Loader. Ensuite, si le statut est READY ou READY WITH ACTIONS sans blocker critique, prépare un plan détaillé et attends mon approbation avant d’écrire.

OBJECTIF

Créer une fondation reproductible, stricte, minimale et prête pour les vertical slices WARIBA.

SCOPE AUTORISÉ

1. Initialiser pnpm via Corepack.
2. Initialiser Turborepo.
3. Créer :
   - apps/web
   - services/realtime
   - services/worker
   - packages/design-tokens
   - packages/ui
   - packages/contracts
   - packages/domain
   - packages/policies
   - packages/database
   - packages/validation
   - packages/observability
   - packages/adapters
   - packages/config
   - packages/test-utils
4. Configurer Node LTS stable et épinglé.
5. Configurer TypeScript strict selon Engineering Constitution.
6. Configurer formatting, lint, import boundaries et tests.
7. Ajouter les scripts standards :
   - pnpm dev
   - pnpm build
   - pnpm lint
   - pnpm format:check
   - pnpm typecheck
   - pnpm test
   - pnpm test:unit
   - pnpm test:integration
   - pnpm test:e2e
   - pnpm test:rls
   - pnpm test:visual
   - pnpm db:start
   - pnpm db:reset
   - pnpm db:test
   - pnpm run ci
8. Initialiser Supabase local sans table métier financière complète.
9. Créer une première migration non destructive pour les fondations techniques nécessaires.
10. Créer les health endpoints Web, Realtime et Worker.
11. Créer le logger structuré et le correlation ID.
12. Créer la validation de configuration avec fail-fast.
13. Ajouter `.env.example` sans aucune valeur secrète.
14. Créer `AGENTS.md`.
15. Créer ou compléter `docs/00-decisions/DECISION_LOG.md`.
16. Créer les ADR initiales prévues dans System Architecture.
17. Ajouter GitHub Actions :
    - install frozen lockfile
    - format check
    - lint
    - typecheck
    - unit tests
    - build
    - secret scan
18. Ajouter le template de PR et CODEOWNERS minimal.
19. Préparer les route groups Next.js :
    - public
    - auth
    - platform
    - trade
    - control
20. Créer des pages shell très simples, sans faux produit ni fausses données.

DÉCISIONS TECHNIQUES

- pnpm workspaces : obligatoire.
- Turborepo : obligatoire.
- Next.js : obligatoire.
- Fastify pour Realtime : obligatoire.
- PostgreSQL/Supabase : obligatoire.
- Kysely : obligatoire.
- Zod : obligatoire.
- Decimal.js : obligatoire comme dépendance domaine, sans logique métier encore.
- Aucun Redis.
- Aucun Kafka.
- Aucun Kubernetes.
- Aucun provider réel.
- Aucun paiement.
- Aucun moteur trading.
- Aucun payout.

VERSIONING

Utilise des versions stables et compatibles au moment de l’exécution.
Vérifie les documentations officielles si l’accès réseau est disponible.
Épingle la version Node et le lockfile.
Documente les versions choisies dans une ADR.
N’introduis aucune dépendance expérimentale critique.

DESIGN

Ne construis pas encore le Design System complet.
Prépare uniquement la capacité d’importer les tokens au Prompt 02.

TESTS OBLIGATOIRES

- installation propre depuis zéro ;
- typecheck ;
- lint ;
- tests unitaires exemple ;
- build des trois processus ;
- health endpoints ;
- Supabase local start/reset ;
- migration from zero ;
- test import boundaries ;
- secret scan ;
- `pnpm run ci`.

CRITÈRES D’ACCEPTATION

- le dépôt se clone et s’installe avec une procédure documentée ;
- `pnpm run ci` réussit ;
- aucune dépendance cyclique interdite ;
- aucun secret ;
- aucune logique métier inventée ;
- chaque application peut démarrer ;
- la structure respecte System Architecture ;
- les documents sont accessibles depuis README ;
- aucune référence R1STER active.

LIVRABLES

- code fondation ;
- README complet ;
- AGENTS.md ;
- CI ;
- ADR ;
- rapport final ;
- proposition de PR :
  `feat: initialize WARIBA repository foundation`

STOP CONDITIONS

Arrête-toi si la fondation exige une décision produit non documentée.
Ne construis ni auth réelle, ni commerce, ni trading, ni payout dans cette branche.
```

## Exit gate

- `pnpm run ci` vert ;
- CI GitHub verte ;
- preview possible ;
- structure validée ;
- aucun code métier.

---

# 5. Prompt 02 — Design System & App Shell

## Branche

```text
feat/design-system-shell
```

## Objectif

Transformer le Design System Markdown en tokens et composants réellement utilisables.

## Prompt prêt à copier

```text
Tu es Design System Lead et Principal Frontend Engineer pour WARIBA.

Exécute Prompt 00. Inspecte la fondation. Prépare un plan et attends approbation avant implementation.

OBJECTIF

Implémenter la première version du Design System WARIBA et les shells Public, Platform, Trade et Control sans logique métier.

SOURCES DE VÉRITÉ

- WARIBA UX Architecture v1.0
- WARIBA Design System v1.0
- WARIBA Engineering Constitution v1.0
- WARIBA System Architecture v1.0

SCOPE

1. Implémenter `packages/design-tokens`.
2. Créer les tokens :
   - Ink
   - Bone
   - Cobalt
   - Copper
   - semantic success/warning/danger/info
   - typography
   - spacing
   - radius
   - shadow
   - motion
   - breakpoints
3. Générer les CSS variables clair/sombre.
4. Configurer Tailwind uniquement depuis les tokens, sans palette générique directe.
5. Configurer les polices :
   - Manrope Variable
   - IBM Plex Mono
   avec fallbacks stables.
6. Implémenter les primitives :
   - Box
   - Stack
   - Grid
   - Text
   - Icon
   - Divider
   - VisuallyHidden
7. Implémenter les composants fondamentaux :
   - Button
   - Input
   - Select
   - Checkbox
   - Radio
   - Switch
   - Tabs
   - Badge
   - Alert
   - Tooltip
   - Dialog
   - Drawer/BottomSheet
   - Skeleton
   - Card
   - DataTable shell
   - EmptyState
8. Implémenter les composants WARIBA sans logique métier :
   - AccountContext
   - MissionProgress
   - RiskRibbon
   - ConsistencyMeter
   - QualifiedDaysTracker
   - PayoutBreakdown
   - ExecutionState
   - PolicyVersionChip
   - EvidencePanel
   - ReserveCoverage
9. Créer un catalogue interne de composants.
10. Créer les layouts :
    - Public header/footer
    - Platform sidebar
    - Mobile bottom navigation
    - Trade layout sombre
    - Control sidebar
11. Créer les shells :
    - Homepage placeholder honnête
    - Login shell
    - Hub shell
    - Trade shell
    - Payout shell
    - Control shell
12. Ajouter responsive 320 → 1920 px.
13. Ajouter reduced motion et focus visibles.
14. Ajouter les états loading, empty, error, disabled et offline.

ANTI-VIBE-CODE OBLIGATOIRE

- aucun gradient dominant ;
- aucun glassmorphism généralisé ;
- aucun bento répétitif ;
- aucun faux dashboard ;
- aucun faux graphique ;
- aucun faux partenaire ;
- aucun faux témoignage ;
- aucun radius > 20 px ;
- aucune couleur hardcodée hors tokens ;
- aucune ombre sur chaque carte ;
- aucune animation décorative gratuite ;
- aucun texte marketing générique.

DONNÉES DE DÉMONSTRATION

Uniquement des fixtures explicites :
- DEMO
- SANDBOX
- TEST

Ne jamais présenter ces données comme réelles.

ACCESSIBILITÉ

- WCAG 2.2 AA ;
- clavier ;
- focus ;
- contrastes ;
- labels ;
- reduced motion ;
- zones tactiles ≥ 44 px.

TESTS

- unit tests composants ;
- accessibility tests ;
- responsive screenshots ;
- visual regression ciblée ;
- theme tests ;
- no hardcoded color scan ;
- build ;
- `pnpm run ci`.

LIVRABLES

- packages design-tokens et ui ;
- catalogue composants ;
- shells ;
- captures 320, 390, 768, 1280, 1440 ;
- rapport final ;
- PR :
  `feat: implement WARIBA design system and application shells`

NON-SCOPE

- auth fonctionnelle ;
- paiement ;
- trading ;
- calcul risque ;
- payout ;
- Control métier ;
- animations marketing complexes ;
- logo final si non fourni.

STOP CONDITIONS

Arrête-toi si tu dois inventer un logo, une règle ou une donnée financière.
```

---

# 6. Prompt 03 — Identity, Commerce & Activation

## Branche

```text
feat/identity-commerce-activation
```

## Objectif

Construire l’inscription, l’offre, le checkout sandbox et l’activation Evaluation.

## Prompt prêt à copier

```text
Tu es Principal Product Engineer chargé de la vertical slice Identity → Commerce → Activation de WARIBA.

Exécute Prompt 00. Inspecte les fondations, la CI et le Design System. Prépare un plan détaillé, une carte des données et les tests. Attends approbation avant implementation.

OBJECTIF

Permettre à un utilisateur sandbox de :
- s’inscrire ;
- se connecter ;
- voir les offres ;
- accepter la policy version ;
- effectuer un paiement sandbox ;
- recevoir exactement un compte WARIBA ONE ;
- arriver dans son Hub.

SCOPE IDENTITY

1. Supabase Auth.
2. Signup.
3. Login.
4. Logout.
5. Password reset.
6. Session server-side.
7. Protected routes.
8. Profil minimal :
   - prénom
   - nom
   - pays
   - langue
9. Consentements versionnés.
10. Appareils/sessions metadata minimales.
11. RLS et tests d’isolation.

SCOPE COMMERCE

1. Product versions :
   - 5K
   - 10K
   - 25K désactivé par feature flag
2. Prix candidats :
   - 5K : 14 900 FCFA
   - 10K : 27 900 FCFA
   - 25K : 59 900 FCFA, non achetable par défaut
3. Pages offre.
4. Purchase order state machine.
5. Payment attempt.
6. PSP sandbox adapter.
7. Signed sandbox webhook.
8. Replay protection.
9. Receipt sandbox.
10. Refund state placeholder documenté, sans fausse politique.

SCOPE ACTIVATION

Après `payment.confirmed` :
1. créer exactement un compte Evaluation ;
2. attacher policy version ;
3. attacher symbol specification set sandbox ;
4. écrire ledger initial ;
5. créer account state initial ;
6. créer outbox ;
7. notifier ;
8. marquer order fulfilled.

INVARIANTS

- browser return ≠ confirmation ;
- prix serveur uniquement ;
- devise serveur uniquement ;
- un fulfillment par commande ;
- un compte par fulfillment ;
- aucun double compte après retry ;
- policy version immuable ;
- 25K off ;
- aucun frais d’activation ;
- nature simulée visible.

UX

Implémenter :
- signup ;
- login ;
- offre ;
- comparaison ;
- checkout ;
- pending ;
- success ;
- failed ;
- welcome ;
- Hub initial.

Afficher clairement :
- compte simulé ;
- nominal non détenu ;
- policy version ;
- règles essentielles ;
- total ;
- aucune activation fee.

DATABASE

Créer migrations SQL, contraintes, indexes, RLS et repositories Kysely.

EVENTS

- order.created
- payment.pending
- payment.confirmed
- payment.failed
- order.fulfilled
- evaluation.activated

TESTS

- auth ;
- owner vs other user ;
- order idempotence ;
- double click ;
- webhook invalid signature ;
- webhook replay ;
- wrong amount ;
- wrong currency ;
- double fulfillment ;
- RLS ;
- E2E signup → payment → account ;
- mobile ;
- accessibility.

OBSERVABILITY

- correlation ID ;
- payment event logs sans secret ;
- metrics ;
- audit.

LIVRABLES

- migrations ;
- domain/application/infrastructure/presentation ;
- pages ;
- tests ;
- docs ;
- fixtures ;
- rapport ;
- PR :
  `feat: implement identity commerce and sandbox activation`

NON-SCOPE

- provider réel ;
- KYC réel ;
- refund réel ;
- trading ;
- risk ;
- payout.

STOP CONDITIONS

Arrête-toi si le PSP sandbox peut être utilisé en production, si le client contrôle le montant, ou si le compte peut être créé sans webhook confirmé.
```

---

# 7. Prompt 04 — Trading Core

## Branche

```text
feat/trading-core
```

## Objectif

Construire le moteur de marché sandbox, les ordres, fills, positions, ledger et temps réel.

## Prompt prêt à copier

```text
Tu es Principal Trading Systems Engineer et Realtime Engineer pour WARIBA.

Exécute Prompt 00. Inspecte l’activation de compte, la base, les contrats et les services. Prépare :
- architecture de la vertical slice ;
- state machine ordre ;
- modèle transactionnel ;
- modèle de concurrence ;
- plan de tests.
Attends approbation avant implementation.

OBJECTIF

Permettre à un compte Evaluation sandbox actif de recevoir des prix et d’exécuter des ordres marché de manière serveur, déterministe, réconciliable et récupérable.

SCOPE MARKET SANDBOX

1. Cinq symboles :
   - EURUSD
   - GBPUSD
   - USDJPY
   - XAUUSD
   - NAS100
2. Symbol specifications versionnées.
3. Valeurs sandbox explicites pour :
   - precision
   - contract size
   - min/max quantity
   - quantity step
   - leverage
   - margin
   - sessions
   - spread
   - slippage
   - commission
   - swap
   - weekend cutoff placeholder
   - stale threshold
4. Seed déterministe.
5. Bid/ask.
6. Timestamp.
7. Sequence.
8. Market status.
9. Scénarios stale, gap et reconnect.

SCOPE REALTIME

1. Fastify.
2. WebSocket authentifié.
3. Channels versionnés.
4. Heartbeat.
5. Sequence.
6. Gap detection.
7. Reconnect.
8. Snapshot + replay.
9. Rate limits.
10. Message validation.

SCOPE ORDER

V1 :
- Market Buy
- Market Sell
- Stop Loss
- Take Profit
- Modify SL
- Modify TP
- Partial Close
- Full Close
- Close All

State machine :
- received
- validated
- accepted
- filled
- partially_filled si réellement supporté
- rejected
- cancelled

SCOPE EXECUTION

- prix serveur ;
- buy open ask ;
- sell open bid ;
- buy close bid ;
- sell close ask ;
- spread ;
- deterministic slippage ;
- immutable fill ;
- execution snapshot.

SCOPE POSITION

- side ;
- quantity ;
- average price ;
- realized PnL ;
- unrealized PnL ;
- open/closed state ;
- partial close.

SCOPE LEDGER

Entries :
- initial_balance
- realized_pnl
- commission
- swap
- authorized_adjustment
- reversal

Balance réconciliable depuis le ledger.

CONCURRENCE

Pour toute commande modifiant un compte :
- row lock ;
- reload ;
- validate ;
- execute ;
- ledger ;
- position ;
- outbox ;
- commit.

Contrainte idempotence :
`unique(account_id, idempotency_key)`.

INTERDICTIONS

- aucun prix client autoritaire ;
- aucun PnL client autoritaire ;
- aucun float ;
- aucun stockage de tous les ticks en PostgreSQL ;
- aucun fallback vers un ancien prix ;
- aucune exécution sans compte actif ;
- aucun ordre offline ;
- aucun provider réel.

UI MINIMALE

Implémenter une Trade V1 fonctionnelle :
- account context ;
- watchlist ;
- chart Lightweight Charts ;
- order ticket ;
- positions ;
- orders ;
- history ;
- connection state ;
- stale state ;
- mobile bottom sheet.

Ne pas faire encore le polish complet du Prompt 07.

TESTS

- deterministic market ;
- bid/ask ;
- spread ;
- slippage ;
- order idempotence ;
- simultaneous orders ;
- double close ;
- partial close ;
- ledger reconciliation ;
- position math ;
- restart/reload ;
- reconnect ;
- gap ;
- stale rejection ;
- other-account isolation ;
- RLS ;
- WebSocket auth ;
- E2E trade desktop/mobile.

PROPERTY TESTS

- balance = ledger ;
- fill immutable ;
- quantity never negative ;
- closed position has zero open quantity ;
- retry does not duplicate result.

OBSERVABILITY

- order latency ;
- fill latency ;
- rejects by code ;
- WebSocket state ;
- tick lag ;
- DB lock duration.

LIVRABLES

- market sandbox ;
- Realtime service ;
- trading domain ;
- migrations ;
- contracts ;
- UI minimale ;
- tests ;
- scenario packs ;
- rapport ;
- PR :
  `feat: implement deterministic trading core`

STOP CONDITIONS

Arrête-toi si :
- Decimal n’est pas utilisé ;
- la state machine n’est pas claire ;
- un ordre peut être exécuté deux fois ;
- la balance n’est pas réconciliable ;
- la reconnexion perd l’état ;
- une donnée sandbox peut apparaître comme réelle.
```

---

# 8. Prompt 05 — Policy, Risk & Evaluation

## Branche

```text
feat/policy-risk-evaluation
```

## Objectif

Implémenter exactement les règles WARIBA ONE.

## Prompt prêt à copier

```text
Tu es Chief Risk Systems Engineer et Quantitative Software Engineer pour WARIBA.

Exécute Prompt 00. Lis intégralement le Program Rulebook. Inspecte le Trading Core et le ledger. Prépare :
- mapping règle → code ;
- mapping règle → tests ;
- schéma policy ;
- golden scenarios ;
- transitions ;
- plan de replay.
Attends approbation avant implementation.

OBJECTIF

Implémenter WARIBA ONE version 1.0.0 sans interprétation libre.

PARAMÈTRES CANDIDATS À ENCODER

- 1 phase ;
- target 8 % réalisé ;
- DLL 4 % nominal, soft lock ;
- Maximum Loss 8 % statique, hard breach ;
- consistance max 40 %, eligibility only ;
- 4 trading days minimum ;
- 3 qualified profitable days ;
- qualified day minimum 0,20 % nominal ;
- no time limit ;
- inactivity 30 jours ;
- overnight yes ;
- weekend no ;
- news allowed ;
- no trailing drawdown ;
- UTC 00:00 reset.

POLICY PIPELINE

1. schema Zod ;
2. JSON machine ;
3. semantic version ;
4. machine hash ;
5. human document hash placeholder/documenté ;
6. states draft/reviewed/approved/published/retired ;
7. immutable after publish ;
8. account pinned to version.

RISK ENGINE

Entrées :
- account ;
- policy ;
- clock ;
- ledger ;
- positions ;
- executable prices ;
- daily snapshot.

Sorties :
- target status ;
- daily loss used/remaining ;
- maximum loss floor/remaining ;
- consistency ;
- trading days ;
- qualified days ;
- account status ;
- warnings ;
- violations ;
- eligibility facts.

DLL

Utiliser exactement la formule du Rulebook :
- start-of-day equity ;
- current adjusted equity ;
- nominal denominator ;
- soft lock at threshold ;
- no automatic hard breach unless Maximum Loss floor reached.

MAXIMUM LOSS

- static ;
- current equity ;
- floor never moves ;
- terminal hard breach ;
- close/cancel according to policy ;
- immutable evidence.

CONSISTENCY

- best profitable finalized UTC day ;
- total realized net profit ;
- ratio ;
- > 40 % never breaches ;
- blocks pass only ;
- compute required total profit when possible.

TRADING DAYS / QUALIFIED DAYS

- fill creates trading day ;
- finalized UTC day ;
- realized net PnL ;
- exact threshold ;
- no latent PnL.

PASS

Pass only when :
- target realized ;
- no open positions ;
- no pending orders ;
- 4 trading days ;
- 3 qualified days ;
- consistency ≤ 40 % ;
- no hard breach ;
- no blocking review.

DAILY WORKER

- snapshot SOD ;
- finalize previous day ;
- qualified day ;
- reset soft lock ;
- idempotent unique(account, day).

EVIDENCE

Chaque violation :
- rule code ;
- policy version ;
- threshold ;
- observed ;
- event refs ;
- price snapshot ;
- calculation version ;
- occurredAt ;
- consequence.

UI

Implémenter :
- Mission ONE ;
- Risk Ribbon connecté ;
- Consistency Meter ;
- Qualified Days Tracker ;
- soft lock state ;
- hard breach state ;
- Evidence Panel ;
- target reached but waiting state.

GOLDEN SCENARIOS OBLIGATOIRES

1. 10K target atteint en 2 jours → pas de pass.
2. 10K profit 800, best day 400 → 50 %, pas de breach.
3. DLL exact 400 → soft lock.
4. equity exact 9 200 → hard breach.
5. target latent seulement → pas de pass.
6. midnight UTC boundary.
7. negative day lowers total and changes consistency.
8. retry daily job.
9. breach while order concurrent.
10. pass event replay.

PROPERTY TESTS

- floor static ;
- consistency never hard breach ;
- soft lock resets only at correct boundary ;
- target requires realized profit ;
- no duplicate violation ;
- no duplicate pass ;
- no qualified day before finalization.

PARITY CHECK

Créer un test qui compare :
- Rulebook constants source ;
- policy JSON ;
- seed ;
- UI labels critiques.

Ne pas parser le Markdown en production.
Documenter la source manuelle/versionnée.

LIVRABLES

- policy schema ;
- ruleset JSON ;
- risk domain ;
- workers ;
- migrations ;
- UI states ;
- tests ;
- replay tools ;
- docs ;
- PR :
  `feat: implement WARIBA ONE policy risk and evaluation`

STOP CONDITIONS

Arrête-toi si une formule n’est pas explicitement définie.
Ne crée pas une règle plus sévère pour simplifier.
Ne traite jamais la consistance comme breach.
```

---

# 9. Prompt 06 — Trader Hub

## Branche

```text
feat/trader-hub
```

## Objectif

Construire l’espace principal de compréhension et progression.

## Prompt prêt à copier

```text
Tu es Principal Product Designer-Engineer chargé du WARIBA Hub.

Exécute Prompt 00. Inspecte l’UX Architecture, le Design System, les read models et les moteurs Trading/Risk. Prépare un plan d’information par état. Attends approbation avant implementation.

OBJECTIF

Permettre à l’utilisateur de comprendre son compte, sa progression, son risque et sa prochaine action en moins de dix secondes.

SCOPE

1. Liste des comptes.
2. Account selector.
3. Account Context.
4. Hub Evaluation.
5. Mission ONE.
6. Risk summary.
7. Activity timeline.
8. Trading days calendar.
9. Qualified days.
10. Consistency explanation.
11. Policy version.
12. Notifications.
13. Actions rapides.
14. Help links.
15. Multi-account isolation.
16. Mobile bottom navigation.

READ MODELS

Créer ou finaliser :
- account_hub_view ;
- account_mission_view ;
- account_risk_view ;
- recent_activity_view.

Les read models sont calculés côté serveur.

ÉTATS OBLIGATOIRES

- no account ;
- pending activation ;
- active ;
- attention ;
- soft locked ;
- target reached/waiting ;
- passed ;
- breached ;
- inactive ;
- read-only ;
- offline ;
- stale ;
- loading ;
- error.

HIÉRARCHIE MOBILE

1. account + state ;
2. next action ;
3. Mission ;
4. Risk Ribbon ;
5. quick actions ;
6. activity ;
7. help.

INTERDICTIONS

- pas de six cartes de même importance ;
- pas de métrique sans contexte ;
- pas de calcul frontend autoritaire ;
- pas d’upsell agressif après breach ;
- pas de faux countdown ;
- pas de couleur seule ;
- pas de jargon inexpliqué.

CONTENT

Utiliser la terminologie officielle :
- Limite de perte quotidienne ;
- Perte maximale ;
- Consistance ;
- Journée qualifiée ;
- Blocage temporaire ;
- Compte terminé ;
- Version des règles.

ACCESSIBILITÉ

- keyboard ;
- screen reader ;
- 200 % zoom ;
- mobile 320 px ;
- no hover-only.

ANALYTICS

- hub viewed ;
- mission viewed ;
- risk detail opened ;
- policy opened ;
- next action clicked ;
- support opened.

TESTS

- état en moins de 10 secondes via test utilisateur documenté ;
- correct account context ;
- multi-account isolation ;
- soft lock view ;
- breached view ;
- target waiting ;
- mobile ;
- accessibility ;
- visual regression ;
- no fake data.

LIVRABLES

- Hub complet ;
- read models ;
- fixtures ;
- tests ;
- screenshots ;
- usability checklist ;
- rapport ;
- PR :
  `feat: implement WARIBA trader hub and mission`

STOP CONDITIONS

Arrête-toi si une donnée nécessaire n’existe pas côté serveur.
Ne recrée pas un calcul dans le composant.
```

---

# 10. Prompt 07 — WARIBA Trade

## Branche

```text
feat/wariba-trade
```

## Objectif

Finaliser le terminal propriétaire après la stabilité du Trading Core.

## Prompt prêt à copier

```text
Tu es Principal Trading UX Engineer chargé de WARIBA Trade.

Exécute Prompt 00. Inspecte le Trading Core, le Risk Engine, le Design System et le Hub. Prépare une matrice desktop/tablet/mobile et un plan de performance. Attends approbation avant implementation.

OBJECTIF

Transformer l’interface Trade minimale en terminal professionnel, mobile, précis et cohérent avec WARIBA.

DESKTOP LAYOUT

- Account Context ;
- Risk Ribbon ;
- Market Status ;
- Watchlist ;
- Lightweight Charts ;
- Order Ticket ;
- Guardian ;
- Positions ;
- Orders ;
- History ;
- Journal placeholder.

MOBILE LAYOUT

- account/status header ;
- sticky Risk Ribbon ;
- symbol selector ;
- chart ;
- trade action bar ;
- Order Ticket bottom sheet ;
- Positions/Orders/History tabs ;
- position detail drawer ;
- Close All protection.

WATCHLIST

Afficher :
- symbol ;
- bid ;
- ask ;
- spread ;
- market status ;
- restriction.

CHART

- candles ;
- timeframe selection limitée et documentée ;
- crosshair ;
- zoom/pan ;
- bid/ask lines ;
- position lines ;
- SL/TP lines ;
- fill markers ;
- timezone ;
- stale state ;
- reconnect state.

ORDER TICKET

- account ;
- symbol ;
- side ;
- market type ;
- quantity ;
- SL ;
- TP ;
- margin ;
- estimated risk ;
- spread ;
- market state ;
- submit.

GUARDIAN

Déterministe uniquement :
- exposure ;
- margin ;
- DLL remaining ;
- Maximum Loss remaining ;
- concentration informative ;
- stale price ;
- news/weekend restriction.

Guardian ne peut jamais :
- recommander Buy/Sell ;
- donner un signal ;
- proposer un lot optimal ;
- présenter une probabilité de gain.

EXECUTION UX

States :
- preparing ;
- sending ;
- received ;
- validated ;
- accepted ;
- filled ;
- partially filled ;
- rejected ;
- cancelled.

La socket interrompue ne signifie pas échec.
Afficher confirmation en cours puis resync serveur.

CLOSE ALL

- nombre de positions ;
- compte ;
- confirmation ;
- double submit protection ;
- result details.

PERFORMANCE

- ne pas rerender toute l’application à chaque tick ;
- isolate subscriptions ;
- batch visual updates si nécessaire ;
- measure render counts ;
- chart lazy-loaded ;
- no heavy motion.

ACCESSIBILITÉ

- keyboard navigation ;
- no single-key dangerous execution par défaut ;
- focus ;
- no color-only ;
- mobile touch targets ;
- reduced motion.

TESTS

- order lifecycle UX ;
- socket interruption ;
- resync ;
- stale ;
- multiple accounts ;
- wrong account prevention ;
- close all ;
- mobile portrait ;
- mobile landscape optional ;
- keyboard ;
- accessibility ;
- visual ;
- performance.

LIVRABLES

- terminal complet ;
- performance profile ;
- mobile screenshots ;
- E2E ;
- documentation shortcuts ;
- rapport ;
- PR :
  `feat: complete WARIBA Trade terminal experience`

NON-SCOPE

- indicators marketplace ;
- custom scripts ;
- EA ;
- API ;
- social trading ;
- advanced pending orders unless already fully supported.

STOP CONDITIONS

Arrête-toi si l’UX nécessite un ordre non supporté réellement.
Ne montre aucun bouton non fonctionnel.
```

---

# 11. Prompt 08 — Performance & Payout

## Branche

```text
feat/performance-payout
```

## Objectif

Implémenter WARIBA Performance, les cycles et les payouts sandbox.

## Prompt prêt à copier

```text
Tu es Principal Payout Systems Engineer, Risk Engineer et Finance Systems Architect pour WARIBA.

Exécute Prompt 00. Lis les sections Performance/Payout du Rulebook et le Financial Model. Inspecte le ledger, le Risk Engine et les permissions. Prépare :
- state machines ;
- formules ;
- transaction boundaries ;
- concurrency model ;
- provider sandbox ;
- tests propriété.
Attends approbation avant implementation.

OBJECTIF

Permettre :
- création Performance après Evaluation passée ;
- cycle #1 ;
- cinq cycles maximum avant Review ;
- eligibility ;
- payout request ;
- human review ;
- payout sandbox ;
- cycle suivant ;
- Review après payout #5.

PERFORMANCE CREATION

- one Performance account per passed Evaluation ;
- unique constraint ;
- nominal reset ;
- Evaluation profit not transferred ;
- Performance policy version ;
- cycle #1 ;
- idempotent.

RULES PERFORMANCE

- DLL 3 % soft lock ;
- Maximum Loss 6 % static hard breach ;
- consistency 40 % per cycle, non-breach ;
- five qualified days ;
- qualified day 0,30 % nominal ;
- cycle #1 threshold 4 % ;
- cycles #2–#5 threshold 3 % ;
- no fixed calendar waiting ;
- overnight allowed ;
- weekend forbidden ;
- news restriction ±2 minutes ;
- no trailing drawdown.

PAYOUT FORMULA

1. net cycle profit ;
2. proportional limit = 50 % ;
3. applicable cap ;
4. payout base = min(limit, cap) ;
5. trader split :
   - #1–#4 = 80 %
   - #5 = 90 %
6. trader cash ;
7. provider fee sandbox if configured ;
8. debit full payout base from simulated account.

CAPS

5K:
- P1–P2 100 USD
- P3–P4 150 USD
- P5 250 USD

10K:
- P1–P2 200 USD
- P3–P4 300 USD
- P5 500 USD

25K:
- P1–P2 400 USD
- P3–P4 600 USD
- P5 1 000 USD
- 25K remains feature-flagged off.

ELIGIBILITY

Toutes les conditions du Rulebook :
- active Performance ;
- active cycle ;
- threshold ;
- five qualified days ;
- consistency ;
- no position ;
- no pending order ;
- no lock/breach ;
- KYC sandbox state ;
- payout method sandbox ;
- no open payout ;
- no blocking dispute ;
- no blocking integrity review ;
- audit complete.

REQUEST TRANSACTION

- lock account/cycle ;
- re-evaluate ;
- snapshot ;
- amount ;
- freeze account ;
- create unique request ;
- audit ;
- outbox ;
- commit.

CONTROL REVIEW

- automatic checks ;
- human review ;
- request information ;
- approve ;
- reject with structured reason ;
- no discretionary blank rejection.

PAYOUT SANDBOX PROVIDER

States :
- pending ;
- processing ;
- paid ;
- failed ;
- returned.

Provider idempotency :
`wariba-payout:{payout_request_id}`.

CYCLE CLOSE

After paid :
- ledger payout debit ;
- close cycle ;
- create next cycle after #1–#4 ;
- reset cycle metrics ;
- create Review case after #5 ;
- no automatic Live.

RESERVE

Reserve coverage may affect future sales only.
It cannot reduce an existing earned payout.

UI

Implement :
- Performance Mission ;
- cycle progress ;
- consistency ;
- qualified days ;
- payout eligibility checklist ;
- payout breakdown ;
- confirmation ;
- frozen state ;
- status tracking ;
- receipt ;
- rejection evidence ;
- Review after #5.

PROPERTY TESTS

- payout base >= 0 ;
- payout base <= 50 % ;
- payout base <= cap ;
- trader cash <= payout base ;
- no payout from unrealized profit ;
- one open payout ;
- no duplicate transfer ;
- paid cycle not payable again ;
- consistency > 40 % not breach ;
- reserve never changes earned amount.

CONCURRENCY TESTS

- double request ;
- double approve ;
- worker retry ;
- provider replay ;
- approve while account state changes ;
- simultaneous close and payout request.

RECONCILIATION

- request ;
- provider transfer ;
- ledger debit ;
- cycle close ;
- receipt.

LIVRABLES

- Performance domain ;
- payout domain ;
- migrations ;
- provider sandbox ;
- Control review minimum ;
- UI ;
- tests ;
- reports ;
- PR :
  `feat: implement WARIBA Performance and sandbox payouts`

STOP CONDITIONS

Arrête-toi si une formule est ambiguë, si le ledger debit n’est pas transactionnel, si une demande peut être dupliquée, ou si une réserve peut réduire rétroactivement un payout.
```

---

# 12. Prompt 09 — WARIBA Control

## Branche

```text
feat/wariba-control
```

## Objectif

Construire l’outil interne sans créer un super-admin dangereux.

## Prompt prêt à copier

```text
Tu es Principal Internal Tools Engineer, Security Engineer et Operations Architect pour WARIBA.

Exécute Prompt 00. Inspecte RBAC, RLS, audit, payouts, support et incidents. Prépare :
- matrice rôle/permission ;
- parcours internes ;
- actions sensibles ;
- audit requirements ;
- test plan.
Attends approbation avant implementation.

OBJECTIF

Permettre à l’équipe WARIBA d’opérer la bêta depuis Control sans accès SQL manuel de routine et sans pouvoir universel.

HOST

`control.wariba.app`

SCOPE

1. Control authentication shell.
2. MFA-ready staff flow.
3. Role/permission management.
4. Overview.
5. Users.
6. Accounts.
7. Orders/fills/positions.
8. Risk/violations/evidence.
9. Payout queue.
10. Payout review.
11. Payments sandbox.
12. Support tickets.
13. Disputes.
14. Integrity signals.
15. Incidents.
16. Market operations.
17. Treasury.
18. Policies read/publish workflow.
19. Feature flags.
20. Audit explorer.
21. Team access.

ROLES

- support ;
- risk ;
- finance ;
- integrity ;
- technical ;
- administrator.

No role receives all financial permissions automatically.

ACCOUNT VIEW

- account context ;
- policy ;
- balance/equity ;
- orders ;
- fills ;
- positions ;
- ledger summary ;
- risk snapshots ;
- violations ;
- timeline ;
- disputes.

PAYOUT REVIEW

Panels :
- summary ;
- calculation ;
- eligibility ;
- KYC sandbox ;
- integrity ;
- incidents ;
- history ;
- decision.

DECISION ACTIONS

- request information ;
- approve ;
- second approve if threshold configured ;
- reject with code/reason ;
- escalate ;
- pause for incident.

TREASURY

- reserve sandbox ;
- projected payouts ;
- coverage ;
- status ;
- 25K gate ;
- no direct edit of earned payout.

FEATURE FLAGS

- 25K ;
- payments ;
- payouts ;
- trading global close-only ;
- symbol pause ;
- maintenance.

KILL SWITCH

Every action requires :
- permission ;
- reason ;
- timestamp ;
- actor ;
- duration if applicable ;
- audit.

INTERDICTIONS

- no balance edit ;
- no delete fill ;
- no delete payout ;
- no modify published policy ;
- no delete audit ;
- no support payout approval ;
- no universal CRUD admin ;
- no impersonation unless a future audited feature is explicitly approved.

UX

- dense but clear ;
- table filters ;
- keyboard ;
- responsive to tablet ;
- no mobile trading requirement for staff ;
- high-risk actions visually explicit ;
- no decorative dashboard.

SECURITY

- no-index ;
- CSP strict ;
- session shorter ;
- object authorization ;
- RLS ;
- audit ;
- sensitive field masking ;
- export permission.

TESTS

- full permission matrix ;
- owner/role denial ;
- support cannot approve payout ;
- finance cannot modify risk ;
- technical cannot read KYC ;
- admin does not bypass without permission ;
- kill switch audit ;
- feature flag safe default ;
- payout decision ;
- dispute workflow ;
- no direct balance mutation ;
- accessibility ;
- security.

LIVRABLES

- Control routes ;
- components ;
- read models ;
- actions ;
- tests ;
- audit ;
- docs ;
- screenshots ;
- PR :
  `feat: implement WARIBA Control operations console`

STOP CONDITIONS

Arrête-toi si une action sensible n’a pas de permission, raison, audit ou test.
```

---

# 13. Prompt 10 — Help, Support & Assist

## Branche

```text
feat/help-support-assist
```

## Objectif

Créer l’aide, les tickets, les contestations et WARIBA Assist sans conseil de trading.

## Prompt prêt à copier

```text
Tu es Principal Support Systems Engineer, Content Architect et AI Safety Engineer pour WARIBA.

Exécute Prompt 00. Inspecte Support, Control, Rulebook, UX et les états de compte. Prépare le modèle de contenu, les permissions et les limites d’Assist. Attends approbation avant implementation.

OBJECTIF

Permettre à un trader de :
- trouver une règle ;
- comprendre une métrique ;
- comprendre un rejet ;
- connaître son statut ;
- créer un ticket ;
- créer une contestation ;
- suivre la réponse.

HELP CENTER

Catégories :
- Commencer
- WARIBA ONE
- Risque
- Trading
- Performance
- Payouts
- Paiements
- Compte et sécurité
- Incidents
- Contestations

Implémenter au moins 10 articles critiques pour bêta, avec structure prête pour 25–35.

ARTICLE

- question title ;
- short answer ;
- detailed answer ;
- example ;
- policy version ;
- updated at ;
- related articles ;
- escalation.

SEARCH

PostgreSQL full-text.
Pas de vector database obligatoire.
Pas de LLM obligatoire.

TICKETS

- category ;
- account ;
- subject ;
- description ;
- attachment ;
- status ;
- timeline ;
- messages ;
- escalation.

DISPUTES

Categories :
- violation ;
- payout ;
- payment ;
- correction ;
- trade ;
- identity.

States :
- submitted ;
- acknowledged ;
- investigating ;
- action_required ;
- decision_pending ;
- resolved ;
- closed.

WARIBA ASSIST V1

Déterministe et permissionné.

Peut :
- rechercher article ;
- expliquer règle ;
- lire policy version ;
- afficher account status ;
- afficher payout status ;
- expliquer consistency ;
- expliquer rejected order ;
- créer ticket ;
- résumer pour support.

Ne peut pas :
- recommander Buy/Sell ;
- recommander lot ;
- proposer entrée/sortie ;
- modifier balance ;
- annuler violation ;
- approuver/rejeter payout ;
- conclure fraude ;
- bannir ;
- inventer une réponse.

RÉPONSE ASSIST

Doit distinguer :
- donnée actuelle ;
- règle ;
- explication ;
- action ;
- source interne.

Si confiance insuffisante :
- dire qu’il ne peut pas conclure ;
- escalader.

SECURITY/PRIVACY

- no KYC content in prompts ;
- no secrets ;
- no raw sensitive logs ;
- permissioned data access ;
- attachment private ;
- audit escalation.

ANALYTICS

- search ;
- article view ;
- assist session ;
- ticket ;
- resolution ;
- escalation.

TESTS

- search relevance ;
- rule version ;
- account isolation ;
- no advice prompts ;
- refusal boundaries ;
- hallucination prevention ;
- ticket creation ;
- dispute timeline ;
- attachment security ;
- accessibility ;
- mobile.

LIVRABLES

- Help Center ;
- article model ;
- search ;
- tickets ;
- disputes ;
- Assist V1 ;
- Control queue ;
- tests ;
- content seed ;
- PR :
  `feat: implement WARIBA help support and Assist`

STOP CONDITIONS

Arrête-toi si Assist doit inventer une règle ou si une réponse nécessite un LLM non cadré.
```

---

# 14. Prompt 11 — Marketing Site

## Branche

```text
feat/marketing-site
```

## Objectif

Construire le site public sans fausses preuves ni promesses.

## Prompt prêt à copier

```text
Tu es Brand Product Designer, Conversion Strategist et Senior Frontend Engineer pour WARIBA.

Exécute Prompt 00. Inspecte le Design System, l’UX Architecture, le Product Master, le Rulebook et l’état réellement implémenté du produit. Prépare une architecture éditoriale et liste les preuves réellement disponibles. Attends approbation avant implementation.

OBJECTIF

Construire un site public premium, clair, français et crédible qui explique WARIBA et conduit vers la bêta ou le checkout autorisé.

DIRECTION

Quiet Financial Authority.

PAGES

- Home
- Offres
- Fonctionnement
- Règles Evaluation
- Règles Performance
- Payout
- Instruments
- Plateforme
- Confiance
- Status
- Help
- Legal placeholders clearly marked
- Login
- Signup
- Checkout

HOMEPAGE

1. proposition de valeur ;
2. nature simulée ;
3. fonctionnement en trois étapes ;
4. règles essentielles ;
5. Hub product proof ;
6. Trade product proof ;
7. Performance/Payout explanation ;
8. pricing ;
9. trust architecture ;
10. FAQ ;
11. CTA.

OFFRES

5K et 10K visibles.
25K off ou clearly unavailable based on feature flag.

Afficher :
- nominal simulated ;
- price FCFA ;
- target ;
- DLL ;
- Maximum Loss ;
- consistency ;
- days ;
- instruments ;
- leverage ;
- overnight/weekend ;
- no activation fee ;
- policy version.

PREUVES AUTORISÉES

- vraies captures du produit ;
- prototypes clairement étiquetés ;
- règles ;
- formules ;
- status ;
- changelog ;
- résultats de tests internes clairement présentés comme tels.

PREUVES INTERDITES

- faux payout ;
- faux user count ;
- faux testimonial ;
- faux partner ;
- faux success rate ;
- faux waiting list ;
- fake countdown ;
- fake scarcity ;
- guaranteed Live ;
- guaranteed payout.

DESIGN

- Bone light marketing ;
- Ink sections with intent ;
- Cobalt CTA ;
- Copper limited accent ;
- no generic gradients ;
- no blobs ;
- no 3D mockup ;
- no tilted floating screenshots ;
- no repetitive bento ;
- no crypto aesthetic.

SEO

- French metadata ;
- sitemap ;
- robots ;
- canonical ;
- structured data only if valid ;
- no private indexing.

PERFORMANCE

- optimized images ;
- stable fonts ;
- responsive ;
- LCP target ;
- no heavy animation.

ACCESSIBILITY

WCAG 2.2 AA.

LEGAL GATE

Do not invent final legal text.
Use clearly identified placeholders if legal documents are not yet approved.
Do not enable public paid launch merely through UI.

TESTS

- responsive ;
- accessibility ;
- no fake claims scan ;
- links ;
- feature flag 25K ;
- SEO ;
- performance ;
- visual regression.

LIVRABLES

- public site ;
- content ;
- real product screenshots ;
- tests ;
- report ;
- PR :
  `feat: implement WARIBA public marketing experience`

STOP CONDITIONS

Arrête-toi si le contenu exige un chiffre ou une preuve non disponible.
```

---

# 15. Prompt 12 — Security & Reliability Audit

## Branche

Audit sur commit ou branche terminée.

## Agent recommandé

Claude Code comme auditeur indépendant, ou Codex en mode audit strict sans modification initiale.

## Objectif

Trouver les failles avant la bêta, pas valider par complaisance.

## Prompt prêt à copier

```text
Tu es un auditeur indépendant combinant les rôles :
- Principal Security Engineer
- Staff Software Architect
- Database Security Engineer
- Quantitative QA Lead
- Realtime Reliability Engineer
- Payments/Payout Auditor
- SRE
- Privacy Engineer

Tu n’es pas l’auteur du code. Ton objectif n’est pas de confirmer qu’il est bon, mais de trouver des preuves de divergence, de vulnérabilité ou de fragilité.

PHASE 1 — INSPECTION ONLY

Ne modifie aucun fichier au départ.

1. Exécute Prompt 00.
2. Lis tous les documents de référence.
3. Inspecte le code, migrations, RLS, CI, configs, workflows, dependencies et tests.
4. Construis une matrice :
   - requirement ;
   - implementation ;
   - test ;
   - evidence ;
   - gap.
5. Exécute les commandes disponibles.
6. N’affirme jamais qu’un test passe sans l’exécuter.

AUDIT SCOPE

A. Architecture
- modular monolith boundaries ;
- no unauthorized service ;
- no circular dependency ;
- no frontend financial authority.

B. Type/financial safety
- strict TypeScript ;
- no critical any ;
- no float ;
- rounding ;
- UTC ;
- Decimal serialization.

C. Database
- constraints ;
- indexes ;
- RLS ;
- migrations ;
- ledger ;
- immutable evidence ;
- direct mutation paths.

D. Auth/RBAC
- object authorization ;
- Control permissions ;
- super-admin risk ;
- session ;
- MFA readiness.

E. API/WebSocket
- validation ;
- rate limits ;
- replay ;
- sequence ;
- resync ;
- origin ;
- auth ;
- stale data.

F. Trading
- price authority ;
- bid/ask ;
- fills ;
- positions ;
- concurrency ;
- ledger reconciliation ;
- restart recovery.

G. Risk
- target ;
- DLL ;
- Maximum Loss ;
- consistency ;
- days ;
- UTC ;
- evidence ;
- pass idempotence.

H. Payout
- eligibility ;
- caps ;
- split ;
- freeze ;
- double payout ;
- provider replay ;
- ledger debit ;
- cycle reset ;
- reserve non-retroactivity.

I. Payment
- signed webhook ;
- browser return ;
- amount/currency ;
- double fulfillment.

J. Privacy
- PII ;
- logs ;
- storage ;
- uploads ;
- analytics.

K. Supply chain
- dependency risk ;
- licenses ;
- postinstall ;
- secret scan.

L. Operations
- logs ;
- metrics ;
- alerts ;
- runbooks ;
- backups ;
- restore ;
- kill switches ;
- incident mode.

M. UX trust
- nature simulated ;
- no fake claims ;
- no hidden rules ;
- soft lock vs breach ;
- payout explanation.

ATTACK TESTS

Attempt or inspect for:
- other user account read ;
- direct financial write ;
- double order ;
- double webhook ;
- double payout ;
- stale price exploitation ;
- reconnect duplication ;
- staff permission bypass ;
- sandbox provider in production ;
- secret leakage ;
- disabled test ;
- migration mismatch ;
- policy divergence.

SEVERITY

- CRITICAL
- HIGH
- MEDIUM
- LOW
- INFO

REPORT FORMAT

1. Executive verdict
2. Release status:
   - READY
   - READY WITH REQUIRED FIXES
   - NOT READY
3. Critical findings
4. High findings
5. Medium findings
6. Low findings
7. Test evidence
8. Missing evidence
9. Rulebook/code parity
10. Security gate matrix
11. QA gate matrix
12. Operations gate matrix
13. Recommended remediation order
14. Files/lines concerned
15. False positives or uncertainties

Chaque finding doit inclure :
- ID ;
- severity ;
- evidence ;
- impact ;
- exploit/failure scenario ;
- required fix ;
- required test.

PHASE 2 — REMEDIATION PLAN

Après validation humaine du rapport, produire un plan de corrections.
Ne corrige rien automatiquement avant cette validation.
Ne réécris pas massivement le dépôt.
```

## Exit gate

Aucun finding Critical ou High non traité avant bêta privée.

---

# 16. Prompt 13 — Private Beta Release

## Branche

```text
security/private-beta-hardening
```

## Objectif

Préparer une release sandbox contrôlée pour 10 à 25 testeurs.

## Prompt prêt à copier

```text
Tu es Release Manager, SRE, QA Lead et Security Engineer pour la bêta privée WARIBA.

Exécute Prompt 00. Vérifie que Prompt 12 a produit un audit et que tous les findings Critical/High sont résolus ou explicitement bloquants. Prépare un plan de release et attends approbation avant modification.

OBJECTIF

Produire une version `READY_FOR_PRIVATE_BETA` :
- sandbox uniquement ;
- aucun argent réel ;
- 10 à 25 testeurs ;
- support et incidents opérables ;
- données isolées ;
- restore testé.

PRÉCONDITIONS

- CI verte ;
- architecture conforme ;
- Rulebook parity ;
- RLS tests ;
- no critical/high findings ;
- no S0/S1 open bugs ;
- market sandbox ;
- payment sandbox ;
- payout sandbox ;
- Control ;
- support ;
- audit ;
- monitoring ;
- runbooks.

TASKS

1. Full regression :
   - static
   - unit
   - property
   - integration
   - RLS
   - concurrency
   - contract
   - E2E
   - visual
   - accessibility
2. Load tests :
   - 25 traders
   - 100 WebSocket connections
   - 5 symbols
   - burst orders
   - reconnect storm
3. Resilience :
   - restart Realtime
   - restart Worker
   - duplicate webhook
   - stale market
   - provider timeout
   - DB latency
4. Backup and restore staging.
5. Incident drills :
   - market stale
   - bad deployment
   - ledger mismatch
   - payout stuck
6. Verify sandbox fail-fast in production config.
7. Verify all beta accounts are explicitly sandbox.
8. Create beta feature flag/cohort.
9. Ensure 25K remains off.
10. Configure status page components.
11. Prepare beta support channel and escalation.
12. Prepare beta feedback flow.
13. Create release notes.
14. Create changelog.
15. Create tester onboarding.
16. Create known limitations.
17. Create daily operations checklist.
18. Create go/no-go checklist.
19. Tag release candidate.
20. Deploy staging/private beta environment after approval.

BETA TESTER EXPERIENCE

Must include:
- sandbox disclosure ;
- no real money ;
- no payout entitlement ;
- feedback expectations ;
- support route ;
- privacy notice ;
- account expiry/retention notice if defined.

OBSERVABILITY

Verify dashboards for:
- Web ;
- Realtime ;
- Worker ;
- DB ;
- orders ;
- stale prices ;
- risk ;
- payouts ;
- queue ;
- incidents.

GO CRITERIA

- no Critical/High security issue ;
- no S0/S1 bug ;
- ledger reconciliation passes ;
- no duplicate results ;
- restore succeeds ;
- target load succeeds ;
- incident drill succeeds ;
- support owner named ;
- rollback known ;
- all providers sandbox ;
- no public paid checkout.

NO-GO CRITERIA

- balance divergence ;
- payout duplication ;
- RLS failure ;
- stale execution ;
- unknown migration ;
- missing audit ;
- failed restore ;
- unavailable support ;
- sandbox confusion ;
- unresolved Rulebook divergence.

FINAL REPORT

1. Release candidate
2. Commit SHA
3. Environment
4. Tests executed
5. Load results
6. Resilience results
7. Restore results
8. Security status
9. Open bugs
10. Known limitations
11. Rollback
12. Support/incident owners
13. Go/No-Go recommendation
14. Status:
    READY_FOR_PRIVATE_BETA
    or BLOCKED

PR

`security: harden WARIBA for private sandbox beta`

INTERDICTIONS

- no real payment ;
- no real payout ;
- no production public launch ;
- no silent waived test ;
- no auto-merge ;
- no fabricated release status.
```

---

# 17. Prompt de correction standard

Ce prompt est utilisé après un audit ou une CI rouge.

```text
Tu dois corriger uniquement les findings validés ci-dessous.

Avant toute modification :
1. Exécute Prompt 00.
2. Reproduis chaque finding.
3. Confirme les fichiers concernés.
4. Propose un plan minimal.
5. Attends approbation.

RÈGLES

- ne refactorise pas les zones non concernées ;
- ne change aucune règle métier ;
- ajoute un test qui échoue avant la correction ;
- applique la correction minimale robuste ;
- exécute les tests ciblés puis `pnpm run ci` ;
- documente la cause racine ;
- ne masque pas le problème ;
- ne supprime pas le contrôle.

FINDINGS VALIDÉS

[COLLER ICI LES FINDINGS]

RAPPORT

- reproduction ;
- cause ;
- correction ;
- test ajouté ;
- résultats ;
- risques restants ;
- PR proposée.
```

---

# 18. Prompt de revue de PR

```text
Audite cette PR WARIBA sans la modifier.

1. Lis les documents applicables.
2. Inspecte le diff uniquement, puis les fichiers connexes nécessaires.
3. Vérifie :
   - scope ;
   - architecture ;
   - rules parity ;
   - TypeScript ;
   - Decimal ;
   - UTC ;
   - auth/RBAC/RLS ;
   - idempotence ;
   - audit ;
   - migrations ;
   - tests ;
   - mobile ;
   - accessibility ;
   - observability ;
   - rollback.
4. Exécute les tests ciblés si possible.
5. Classe les findings :
   - BLOCKER
   - REQUIRED
   - RECOMMENDED
   - OPTIONAL
6. Ne propose aucune réécriture stylistique inutile.
7. Donne un verdict :
   - APPROVE
   - REQUEST CHANGES
   - BLOCK.
```

---

# 19. Prompt de migration database

```text
Prépare une migration PostgreSQL/Supabase pour la tâche décrite.

Avant écriture :
1. Inspecte toutes les migrations existantes.
2. Identifie les tables, contraintes, indexes, RLS et données affectées.
3. Vérifie qu’aucune migration appliquée ne sera modifiée.
4. Propose :
   - migration ;
   - impact ;
   - stratégie expand/contract ;
   - tests ;
   - rollback/compensation ;
   - locks potentiels.
5. Attends approbation.

Après approbation :
- écris une nouvelle migration ;
- ajoute les RLS policies ;
- ajoute tests owner/other/staff/anonymous ;
- teste fresh install ;
- teste upgrade ;
- teste données ;
- génère les types ;
- vérifie le diff ;
- exécute `pnpm db:test` et `pnpm run ci`.

Ne crée jamais une table financière sans contraintes et audit.
```

---

# 20. Prompt de changement de règle

Ce prompt ne doit pas être utilisé pour coder directement.

```text
Analyse cette proposition de changement de règle WARIBA.

PROPOSITION
[COLLER LA PROPOSITION]

Ne modifie aucun code.

Produis :
1. impact Product Master ;
2. impact Rulebook ;
3. impact Financial Model ;
4. impact UX ;
5. impact Design ;
6. impact Architecture ;
7. impact Security/QA/Ops ;
8. impact comptes existants ;
9. impact non-rétroactivité ;
10. impact tests ;
11. impact communication ;
12. nouvelle policy version requise ;
13. risques ;
14. recommandation ;
15. Decision Log draft.

Aucune implémentation n’est autorisée avant validation de ces impacts et mise à jour des documents.
```

---

# 21. Ordre concret d’utilisation à partir du dossier vide

## Étape 1

Placer tous les documents dans le dépôt.

## Étape 2

Créer :

```text
AGENTS.md
docs/00-decisions/DECISION_LOG.md
docs/02-program/WARIBA_RULESET_v1.0.json
docs/05-design/tokens.json
```

Ces fichiers peuvent être préparés manuellement ou générés sous contrôle avant le Prompt 01.

## Étape 3

Ouvrir le terminal dans le dossier WARIBA.

## Étape 4

Créer la branche :

```bash
git checkout -b feat/repository-foundation
```

## Étape 5

Lancer Codex.

## Étape 6

Envoyer Prompt 00.

## Étape 7

Lire le rapport. Ne pas continuer si `BLOCKED`.

## Étape 8

Envoyer Prompt 01.

## Étape 9

Exiger le plan avant code.

## Étape 10

Valider, puis laisser Codex implémenter la fondation.

---

# 22. Checklist avant le premier lancement Codex

- [ ] Dépôt `wariba-platform` privé.
- [ ] Branche `main` existe.
- [ ] README initial existe.
- [ ] Tous les documents Markdown sont copiés.
- [ ] Financial Model est dans `docs/03-finance/`.
- [ ] Aucun fichier R1STER actif.
- [ ] Prompt Pack est dans `docs/09-prompts/`.
- [ ] Aucun secret dans le dossier.
- [ ] Git installé.
- [ ] Node installé ou installable.
- [ ] Codex CLI installé.
- [ ] Branche Foundation créée.
- [ ] Prompt 00 prêt.
- [ ] Prompt 01 prêt.
- [ ] Rod est disponible pour valider le plan.

---

# 23. Règle de consommation de contexte

Pour éviter qu’un agent oublie WARIBA :

1. nouveau chat/session → Prompt 00 ;
2. nouveau milestone → Prompt 00 ;
3. nouvelle branche majeure → Prompt 00 ;
4. après modification documentaire → Prompt 00 ;
5. après audit → Prompt 00 avant correction.

Ne pas supposer que l’agent « se rappelle ».

---

# 24. Règle de taille des prompts d’exécution

Si Codex ne peut pas traiter un prompt complet :

- ne pas supprimer les contraintes ;
- diviser par sous-livrables ;
- conserver l’objectif, les invariants, tests et stop conditions ;
- faire une PR par sous-livrable.

Exemple Prompt 04 :

```text
04A Market Sandbox
04B Realtime
04C Orders/Fills/Ledger
04D Trade UI Minimum
```

---

# 25. Règle de validation humaine

Rod doit explicitement valider :

- changement de stack ;
- nouvelle dépendance structurelle ;
- nouveau provider ;
- nouvelle règle ;
- nouvelle policy version ;
- nouveau produit ;
- prix ;
- cap ;
- payout ;
- feature publique ;
- merge d’une grande PR ;
- lancement beta ;
- production.

---

# 26. Signaux d’alerte dans les réponses d’un agent

Arrêter immédiatement si l’agent dit :

- « j’ai simplifié les règles » ;
- « j’ai remplacé Supabase » ;
- « j’ai ajouté Redis pour être scalable » ;
- « j’ai créé des microservices » ;
- « j’ai calculé le PnL dans React » ;
- « j’ai temporairement désactivé RLS » ;
- « j’ai utilisé des floats mais cela suffit » ;
- « j’ai ignoré les tests » ;
- « j’ai mocké la réussite » ;
- « j’ai mis les secrets dans `.env.example` » ;
- « j’ai fusionné sur main » ;
- « j’ai ajouté le 25K au lancement » ;
- « j’ai créé des témoignages placeholders publics » ;
- « j’ai fait un design similaire à [concurrent] ».

---

# 27. Decision Log Prompt Pack initial

| ID | Décision | Statut | Motif |
|---|---|---|---|
| PP-001 | Codex constructeur principal | `LOCKED` | Exécution |
| PP-002 | Prompt 00 avant grande session | `LOCKED` | Contexte |
| PP-003 | Plan avant code | `LOCKED` | Contrôle |
| PP-004 | Un prompt par phase | `LOCKED` | Scope |
| PP-005 | Une branche par objectif | `LOCKED` | Isolation |
| PP-006 | Claude audit seulement | `LOCKED` | Indépendance |
| PP-007 | Aucune fusion agent autonome | `LOCKED` | Gouvernance |
| PP-008 | Sandbox avant providers réels | `LOCKED` | Risque |
| PP-009 | Tests dans chaque prompt | `LOCKED` | Qualité |
| PP-010 | Stop conditions obligatoires | `LOCKED` | Sécurité |
| PP-011 | Prompt 12 indépendant | `LOCKED` | Audit |
| PP-012 | Prompt 13 ne lance pas public | `LOCKED` | Scope |
| PP-013 | Correction minimale après audit | `LOCKED` | Dette |
| PP-014 | Documents dominent prompts | `LOCKED` | Source de vérité |
| PP-015 | Aucun agent ne change une règle | `LOCKED` | Gouvernance |

---

# 28. Audit des 35 rôles

| # | Rôle | Exigence du Prompt Pack |
|---:|---|---|
| 1 | CEO | Le pack protège la vision et le scope. |
| 2 | COO | Chaque prompt produit un livrable opérable. |
| 3 | CFO | Les prompts payout et trésorerie sont contrôlés. |
| 4 | CPO | Le parcours complet structure l’ordre. |
| 5 | Chief of Staff | Plans, rapports et Decision Log. |
| 6 | Market Strategist | Français, mobile et contexte initial. |
| 7 | Brand Strategist | WARIBA uniquement. |
| 8 | Art Director | Anti-vibe-code obligatoire. |
| 9 | Content Strategist | Terminologie et microcopy. |
| 10 | Growth Lead | Aucun lancement avant preuve. |
| 11 | Product Manager | Scope prompt par prompt. |
| 12 | UX Researcher | Tests d’usage intégrés. |
| 13 | Information Architect | Public, Platform, Control. |
| 14 | Product Designer | États et mobile. |
| 15 | Design System Lead | Tokens avant pages. |
| 16 | CRO | Risk prompt exact. |
| 17 | Market Specialist | Symbol specs. |
| 18 | Execution Specialist | Trading core autoritaire. |
| 19 | Quant Analyst | Property tests. |
| 20 | Market Data Engineer | Sandbox seedé et stale. |
| 21 | Software Architect | Fondation et frontières. |
| 22 | Frontend Lead | UI sans autorité financière. |
| 23 | Backend Lead | Transactions et idempotence. |
| 24 | Database Architect | Migrations, RLS, ledger. |
| 25 | Realtime Engineer | Sequence et resync. |
| 26 | Security Engineer | Audit et stop conditions. |
| 27 | SRE | Release, resilience et restore. |
| 28 | QA Lead | Tests obligatoires. |
| 29 | Payments Lead | Webhooks et reconciliation. |
| 30 | Fraud Lead | Signaux, décision humaine. |
| 31 | Legal Counsel | Aucun public launch implicite. |
| 32 | Privacy Lead | Aucun secret ou PII dans prompts. |
| 33 | Customer Operations | Support et disputes. |
| 34 | AI Lead | Agent constraints et context loader. |
| 35 | Community/Affiliate Lead | Marketing honnête. |

---

# 29. Definition of Done du Prompt Pack

Le Prompt Pack est considéré complet lorsque :

1. chaque phase du Build Plan possède un prompt ;
2. chaque prompt possède un objectif ;
3. chaque prompt possède un scope ;
4. chaque prompt possède des non-objectifs ;
5. chaque prompt possède des tests ;
6. chaque prompt possède des stop conditions ;
7. chaque prompt possède un rapport final ;
8. les documents sont toujours prioritaires ;
9. Codex ne peut pas inventer la stack ;
10. Codex ne peut pas inventer les règles ;
11. Claude Code possède un rôle d’audit séparé ;
12. la bêta privée est distincte du public ;
13. aucun prompt ne demande de paiement ou payout réel prématuré ;
14. le contexte est rechargé à chaque grande session ;
15. Rod conserve la décision de fusion.

---

# 30. Conclusion

Ce Prompt Pack ne remplace pas la supervision.

Il transforme la supervision en protocole.

WARIBA sera construit avec des agents, mais ne sera pas dirigé par leurs improvisations.

La séquence correcte reste :

```text
Contexte
→ Plan
→ Validation
→ Code
→ Tests
→ Audit
→ PR
→ CI
→ Revue
→ Merge
```

À partir de ce document, la préparation intellectuelle de WARIBA est complète.

La prochaine étape n’est pas encore de construire tout le produit.

La prochaine étape est de préparer le dépôt local avec les documents, créer les quatre fichiers machine de Semaine 0, installer Codex, lancer Prompt 00, puis Prompt 01 sur la branche `feat/repository-foundation`.
