---
title: "WARIBA Prompt Pack"
version: "1.0"
document_id: "WARIBA-PROMPT-PACK"
status: "READY FOR AN AUTHORIZED AI AGENT — AUCUN PROMPT NE DOIT ÊTRE EXÉCUTÉ HORS SÉQUENCE"
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

> **Addendum Rules v1.1 — 2026-08-03**
> Les règles financières v1.0 des prompts sont superseded par le Program
> Rulebook v1.1 et `WARIBA_RULESET_v1.1.json`. Prompt 03 utilise cinq produits
> sous feature flags et les prix FCFA candidats. Prompt 04 ajoute levier
> 100/50/20, exposition agrégée et gates de marge. Prompt 05 applique 10/3/10
> EOD, Best Day 50 %, zéro minimum/qualified day. Prompt 08 applique buffer 10 %,
> cinq Performance Days à 0,50 %, excédent réalisé seulement, splits 85/15 puis
> 90/10 et caps nets sans limite universelle de distribution à 50 %. Prompt 12
> audite EOD trailing, buffer, non-réutilisation, débit brut, exposition et réserve.

## Contrôle du document

| Champ | Valeur |
|---|---|
| Marque | WARIBA |
| Domaine | `wariba.app` |
| Dépôt cible | GitHub privé `wariba-platform` |
| État actuel | Dossier créé, aucun code produit commencé |
| Agents IA autorisés | Codex, Claude Code ou tout autre agent IA explicitement mandaté |
| Rôles autorisés | Construction, modification, audit et documentation — voir AI-015 |
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

## 1.1 Ne pas envoyer tout le pack à un agent en une seule fois

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
Prompt 07 — WariX
Prompt 08 — Performance & Payout
Prompt 09 — WARIBA Control
Prompt 10 — Help, Support & Assist
Prompt 11 — Marketing Site
Prompt 12 — Security & Reliability Audit
Prompt 13 — Private Beta Release
```

## 1.2 Prompt 00 est utilisé avant chaque nouvelle grande session

Le Prompt 00 recharge le contexte, inspecte le dépôt et empêche l’agent IA de travailler sur une compréhension ancienne.

## 1.3 Un prompt n’autorise pas automatiquement la fusion

Après chaque prompt :

1. l’agent IA exécute les tests ;
2. l’agent IA produit un rapport ;
3. la PR est inspectée ;
4. la CI doit être verte ;
5. Rod valide ;
6. la branche est fusionnée.

## 1.4 Ne jamais exécuter deux agents sur la même branche

- tout agent IA explicitement mandaté peut construire ou modifier ;
- un audit indépendant est confié à un agent distinct sur une branche ou un commit terminé ;
- les corrections reviennent ensuite à un agent IA mandaté dans une nouvelle branche.

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
- au début d’une nouvelle session d’agent IA ;
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

Le rapport doit permettre de vérifier que l’agent IA comprend l’état réel et non seulement le plan théorique.

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

SCOPE COMMERCE — v1.1

1. Product versions :
   - 5K
   - 10K
   - 25K actif en sandbox
   - 50K actif en sandbox
   - 100K actif en sandbox
2. Prix candidats (FCFA — voir Program Rulebook §7, statut `CANDIDATE_PENDING_ACTUARIAL_VALIDATION`) :
   - 5K : 22 500 FCFA
   - 10K : 39 900 FCFA
   - 25K : 84 900 FCFA, achetable via checkout sandbox
   - 50K : 144 900 FCFA, achetable via checkout sandbox
   - 100K : 259 900 FCFA, achetable via checkout sandbox
3. Chaque taille utilise un feature flag commercial indépendant.
4. Ne jamais exposer le prix fondateur sans cohorte explicitement activée.
5. Activer les cinq tailles pour la bêta sandbox conformément à OFFER-023, sans interpréter cette activation comme une autorisation de vente publique.
6. Pages offre.
7. Purchase order state machine.
8. Payment attempt.
9. PSP sandbox adapter.
10. Signed sandbox webhook.
11. Replay protection.
12. Receipt sandbox.
13. Refund state placeholder documenté, sans fausse politique.

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
- cinq tailles actives en sandbox ;
- flags commerciaux indépendants et révocables ;
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

# 10. Prompt 07 — WariX

## Branche

```text
feat/wariba-trade
```

## Objectif

Finaliser le terminal propriétaire après la stabilité du Trading Core.

## Prompt prêt à copier

```text
Tu es Principal Trading UX Engineer chargé de WariX.

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
  `feat: complete WariX terminal experience`

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
- 25K is active in sandbox; its independent feature flag remains available as a kill switch.
- 50K and 100K payout caps remain OPEN; do not invent or publish Performance payout flows for those sizes.

PRIX CANDIDATS POUR SIMULATION — v1.1

The payout and reserve simulation must use the candidate commercial prices (FCFA, see Program Rulebook §7):
- 5K 22 500 FCFA
- 10K 39 900 FCFA
- 25K 84 900 FCFA
- 50K 144 900 FCFA
- 100K 259 900 FCFA
Do not treat these prices as financially approved until the WARIBA Actuarial & Risk Model v1.0 stress model passes.

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
- gates commerciaux indépendants des cinq tailles ;
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

5K, 10K, 25K, 50K et 100K visibles et achetables en sandbox.
Si un feature flag est coupé, afficher honnêtement la taille comme indisponible.

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

Claude Code, Codex ou tout autre agent IA mandaté, distinct de l’implémentation auditée.

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
9. Ensure all five tiers remain active for sandbox beta while public paid launch stays disabled.
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

Lancer l’agent IA mandaté.

## Étape 6

Envoyer Prompt 00.

## Étape 7

Lire le rapport. Ne pas continuer si `BLOCKED`.

## Étape 8

Envoyer Prompt 01.

## Étape 9

Exiger le plan avant code.

## Étape 10

Valider, puis laisser l’agent IA mandaté implémenter la fondation.

---

# 22. Checklist avant le premier lancement d’un agent IA

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
- [ ] Outil de l’agent IA sélectionné installé et accessible.
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

Si l’agent IA ne peut pas traiter un prompt complet :

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
| PP-001 | Tout agent IA explicitement mandaté peut construire et modifier | `LOCKED` | AI-015 |
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
9. aucun agent IA ne peut inventer la stack ;
10. aucun agent IA ne peut inventer les règles ;
11. les audits indépendants sont confiés à un agent distinct ;
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

La prochaine étape est de préparer le dépôt local avec les documents, créer les quatre fichiers machine de Semaine 0, installer l’outil de l’agent IA retenu, lancer Prompt 00, puis Prompt 01 sur la branche `feat/repository-foundation`.

---

# 31. Prompt 07B — WariX Production Trading Core, Live Market Data, Resilience, Manual Trading and Profit Eligibility

## Branche

```text
feat/wariba-trade-core
```

## Objectif

Construire le socle production du Trading Core derrière WariX — marché temps réel
provider-agnostic (FCS en premier adaptateur), architecture active/standby,
règle d'éligibilité de profit à 60 secondes, protections anti-bot — en
préservant le terminal WariX déjà livré par le Prompt 07. Audit obligatoire
avant tout changement structurel ; ne pas remplacer une architecture qui
fonctionne sans raison concrète.

## Statut des dépendances externes

Ce prompt suppose l'existence d'une clé FCS API Business, de deux serveurs
temps réel (actif + standby) et d'une infrastructure de load testing. Aucune
de ces trois choses n'existe dans ce dépôt au moment où ce prompt est ajouté.
L'agent qui l'exécute doit implémenter l'intégralité de l'adaptateur, du
provider mock, du provider replay, du contrat d'environnement et des tests —
sans jamais simuler une connexion live réussie. Voir §18 (« Production
Readiness ») du prompt ci-dessous pour la classification obligatoire par zone
(READY / READY WITH CONFIGURATION / BLOCKED BY CREDENTIAL / BLOCKED BY
INFRASTRUCTURE / NOT READY).

## Prompt prêt à copier

```text
PROMPT 7B — WARIX PRODUCTION TRADING CORE, LIVE MARKET DATA,
RESILIENCE, MANUAL TRADING AND PROFIT ELIGIBILITY

You are continuing the construction of WARIBA at Prompt 7.

The native WARIBA trading platform is called WariX.

This prompt is not for creating another isolated UI mockup.
It must audit, plan and implement the production-grade trading core behind WariX,
while preserving and completing the premium trader-facing terminal already being built.

Do not replace the existing architecture blindly.
Inspect the repository, project documentation, AGENTS.md, DECISION_LOG.md,
WARIBA_RULESET_v1.1.json, Product Master, Rulebook, Engineering Constitution,
System Architecture, Design System and the existing Prompt 7 implementation first.

Follow this execution sequence:

1. AUDIT
2. GAP ANALYSIS
3. IMPLEMENTATION PLAN
4. IMPLEMENTATION
5. TESTS
6. DOCUMENTATION UPDATE
7. FINAL VERIFICATION

Do not stop after the audit or plan.
Proceed through implementation and testing unless a genuinely blocking secret,
provider credential or unavailable external dependency prevents execution.

When an external credential is unavailable, implement the full adapter,
mock provider, replay provider, environment contract and tests.
Do not fake a successful live connection.

======================================================================
1. PRODUCT CONTEXT
======================================================================

WARIBA is launching its own native simulated trading platform, WariX.

Initial commercial scope:

- WariX only
- Simulated trading only
- Forex currency pairs
- XAUUSD / Gold
- No NAS100 at launch
- No futures at launch
- No MetaTrader 5 at launch
- No cTrader at launch
- No TradingView broker integration at launch
- No real-money brokerage execution
- No public execution API
- No bots
- No Expert Advisors
- No trade copiers
- No automated trading
- Manual trading only

Initial capacity target:

- Up to 500 registered traders during the first month
- Design for at least 150 concurrent traders
- Architecture must be capable of scaling beyond this without rewriting the trading core

Initial market-data provider:

- FCS API WebSocket Business
- Provider integration must remain replaceable through an adapter
- WariX clients must never connect directly to FCS API
- Provider secrets must never reach the browser

Initial infrastructure model:

- One active real-time trading node
- One warm standby node
- Shared PostgreSQL/Supabase persistence
- Health-checked routing through a load balancer
- No Redis, Kafka or Kubernetes in the initial architecture
- No premature microservices

======================================================================
2. REQUIRED 35-ROLE AUDIT
======================================================================

Read AGENTS.md and use the existing WARIBA 35-role review framework.

At minimum, provide explicit findings from these perspectives:

- Founder / CEO
- Chief Product Officer
- Product Manager
- Product Designer
- UX Researcher
- UX Writer
- Design Systems Lead
- CTO / Technical Architect
- Frontend Architect
- Backend Architect
- Trading Systems Engineer
- Risk Engine Engineer
- Data Engineer
- DevOps / Platform Engineer
- Security Engineer
- QA / Test Engineer
- Head of Trading
- Risk Manager / CRO
- Quant / Data Scientist
- Actuarial / Quant Analyst
- Fraud Lead
- Treasury
- CFO
- Payments Architect
- Compliance
- Legal
- Customer Support
- Data / Analytics Lead

The audit must identify:

- what already exists;
- what is incomplete;
- what is only visual;
- what is simulated incorrectly;
- what creates a single point of failure;
- what can freeze the browser;
- what can duplicate or lose orders;
- what can calculate PnL incorrectly;
- what can trigger an invalid breach;
- what can allow bots;
- what can create inconsistent account balances;
- what can break during reconnect or server failover.

Do not redesign working components without a concrete reason.

======================================================================
3. NON-NEGOTIABLE PRODUCT DECISIONS
======================================================================

Implement these decisions as authoritative configuration.

PLATFORM

NATIVE_PLATFORM = "WariX"
SIMULATED_TRADING_ONLY = true
MT5_ENABLED = false
CTRADER_ENABLED = false
TRADINGVIEW_BROKER_ENABLED = false
FUTURES_ENABLED = false
NAS100_ENABLED = false

MARKETS

INITIAL_MARKETS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCAD",
  "USDCHF",
  "NZDUSD",
  "EURJPY",
  "GBPJPY",
  "XAUUSD"
]

The symbol list must be configuration-driven.
Do not hardcode provider-specific symbol names throughout the domain.

TRADING MODE

MANUAL_TRADING_ONLY = true
BOTS_ALLOWED = false
EXPERT_ADVISORS_ALLOWED = false
TRADE_COPIERS_ALLOWED = false
AUTOMATED_EXECUTION_ALLOWED = false
PUBLIC_EXECUTION_API_ENABLED = false
THIRD_PARTY_ACCOUNT_MANAGEMENT_ALLOWED = false

NATIVE RISK TOOLS ALLOWED

- Stop loss
- Take profit
- Trailing stop
- Break-even
- OCO orders
- Bracket orders
- Partial close
- Flatten
- Personal daily-loss limit
- Price alerts

These tools are server-side risk-management functions.
They must not autonomously decide when to open a new position.

======================================================================
4. PROFIT ELIGIBILITY — 60-SECOND RULE
======================================================================

WARIBA traders may close positions at any time.

Never disable or delay the close button merely because a trade has not yet reached
the eligibility duration.

However, a positive closed trade portion is eligible only after 60 completed seconds.

MINIMUM_PROFIT_ELIGIBLE_DURATION_SECONDS = 60

Exact rule:

- Duration >= 60,000 milliseconds: positive net PnL is eligible.
- Duration < 60,000 milliseconds: positive net PnL is not eligible.
- Any negative net PnL always counts in full, regardless of duration.
- A zero-PnL closure produces no eligible profit.
- The duration is measured from the authoritative server execution timestamp
  of the opening lot to the authoritative server execution timestamp of the closing lot.
- Never use the browser clock.
- Never use the order-submission timestamp.
- Use execution timestamps.

A positive net result closed before 60 seconds must not contribute to:

- evaluation profit target;
- Performance buffer;
- Performance Day calculation;
- Best Day consistency;
- payout availability;
- progression to WARIBA Review;
- advancement of the EOD trailing maximum-loss floor.

It remains visible in trade history as:

SHORT_DURATION_PROFIT
Profit realized but not program-eligible

Create and maintain separate accounting concepts:

- realized_pnl
- eligible_realized_pnl
- ineligible_short_duration_profit
- program_pnl
- account_balance
- program_eligible_balance

Do not overwrite or hide actual simulated PnL.

ACCOUNT BALANCE

The regular simulated account balance reflects all realized PnL.

PROGRAM ELIGIBLE BALANCE

The program-eligible balance is used for:

- evaluation target;
- Performance buffer;
- Performance Days;
- Best Day consistency;
- payout eligibility;
- payout excess;
- advancement of the EOD trailing floor.

All negative realized PnL must reduce the program-eligible balance.

Use net realized PnL after applicable commissions, fees and adjustments.

Eligibility logic for each closed lot:

if net_realized_pnl > 0 and holding_duration_ms >= 60000:
    eligible_realized_pnl = net_realized_pnl

if net_realized_pnl > 0 and holding_duration_ms < 60000:
    eligible_realized_pnl = 0
    ineligible_short_duration_profit = net_realized_pnl

if net_realized_pnl <= 0:
    eligible_realized_pnl = net_realized_pnl
    ineligible_short_duration_profit = 0

PARTIAL CLOSES

Use deterministic FIFO lot accounting.

Example:

- 1.00 lot opens at 10:00:00.
- 0.50 closes at 10:00:35 with a positive net result.
- That closed portion is not eligible.
- Remaining 0.50 closes at 10:01:20 with a positive net result.
- That portion is eligible.

Each closed lot portion must have its own:

- opening execution ID;
- closing execution ID;
- opened_at;
- closed_at;
- duration_ms;
- gross PnL;
- fees;
- net PnL;
- eligible PnL;
- eligibility reason.

SHORT-DURATION MONITORING

Implement configurable behavioural controls:

SHORT_PROFIT_WARNING_THRESHOLD_24H = 3
SHORT_PROFIT_REVIEW_THRESHOLD_24H = 6

At 3 positive closures below 60 seconds within a rolling 24-hour window:

- display an educational warning;
- log a risk signal;
- do not breach the account.

At 6 within 24 hours:

- block new entries temporarily;
- continue allowing position reductions and closes;
- place the account under risk review;
- do not automatically terminate the account.

Losses and stop-loss closures below 60 seconds do not increment this counter.

A breach for prohibited strategy must require a reviewed and auditable decision.
Do not create an automatic permanent breach based only on this counter.

======================================================================
5. MARKET DATA PROVIDER ARCHITECTURE
======================================================================

Create a provider-agnostic market-data domain.

Required interfaces should cover concepts equivalent to:

MarketDataProvider
MarketDataConnection
MarketDataSubscription
MarketDataSnapshotProvider
MarketDataHealthMonitor

Provide these implementations:

1. FcsMarketDataProvider
2. MockMarketDataProvider
3. ReplayMarketDataProvider

Do not spread FCS-specific payload types across the trading domain.

The normalized market tick must include at least:

- internal symbol
- provider symbol
- bid
- ask
- optional mid
- provider timestamp
- received timestamp
- local monotonic sequence
- source connection ID
- provider name
- freshness state
- validation state

Use decimal-safe arithmetic.
Never calculate money or prices with binary floating-point numbers.

Use the existing project standard, including decimal.js where already specified.

FCS INTEGRATION

Use the official current FCS WebSocket protocol and documentation.
Do not invent endpoint URLs, field names or authentication syntax.

Required environment contract:

MARKET_DATA_PROVIDER=fcs
FCS_API_KEY=
FCS_WS_PRIMARY_URL=
FCS_WS_SECONDARY_URL=
FCS_REST_BASE_URL=
FCS_SYMBOL_MAP=
MARKET_DATA_ENABLED=
MARKET_DATA_REPLAY_MODE=

Do not commit secrets.

Both primary and standby trading nodes may maintain an authenticated market-data
connection, but only the elected active node may publish authoritative ticks,
accept new orders or mutate trading state.

BROWSER RULE

The browser connects only to WARIBA.

Forbidden:

Browser → FCS

Required:

FCS → WARIBA Market Data Core → WARIBA WebSocket Gateway → WariX

======================================================================
6. FEED HEALTH, RECONNECTION AND OUTAGE STATES
======================================================================

Implement per-symbol and system-wide feed health.

Default configurable thresholds:

HEALTHY:
latest valid tick age < 2 seconds

DEGRADED:
latest valid tick age >= 2 seconds and < 5 seconds

STALE:
latest valid tick age >= 5 seconds and < 15 seconds

OUTAGE:
latest valid tick age >= 15 seconds

These values must live in configuration and the versioned ruleset.

HEALTHY

- New orders allowed.
- Pending orders can trigger.
- Stops and take-profits can trigger.
- PnL and risk calculations update normally.

DEGRADED

- Keep the system operational.
- Show a subtle degraded-data indicator.
- Increase monitoring.
- Do not hide the condition.

STALE

- Reject new entries.
- Reject position increases.
- Continue accepting position-reduction or close requests.
- A close request is recorded with the exact server timestamp.
- Do not execute the close against an old price.
- Mark the close request as PENDING_MARKET_RESUME.
- Execute it against the first new valid authoritative tick.
- Do not trigger new SL/TP executions on stale prices.
- Do not create a drawdown breach from stale prices.
- Do not advance the EOD trailing floor.
- Display a clear market-data warning.

OUTAGE

- Switch from the primary provider endpoint to the secondary endpoint.
- Continue automatic reconnection with exponential backoff and jitter.
- Preserve subscriptions.
- Preserve the latest sequence and timestamps.
- Keep account state available.
- Keep close requests queued.
- Block new exposure.
- Show a prominent but calm outage state.
- Never display a moving synthetic price.
- Never invent ticks.
- Never replay old ticks as though they were live.

RECOVERY

After reconnection:

- authenticate;
- restore symbol subscriptions;
- retrieve a fresh snapshot when supported;
- discard duplicate and out-of-order ticks;
- require valid recovery checks before resuming new entries;
- resynchronize account state;
- resynchronize open orders and positions;
- broadcast a fresh authoritative account snapshot;
- execute queued close requests using the first valid post-recovery price;
- record the entire incident timeline.

Do not require the trader to reload the browser.

======================================================================
7. ACTIVE–STANDBY SERVER ARCHITECTURE
======================================================================

Implement an active–warm-standby real-time trading architecture.

NODE A

Primary target:

- Market data ingestion
- Trading engine
- Order engine
- Position engine
- PnL engine
- Risk engine
- WebSocket trading gateway

NODE B

Warm standby target:

- Secondary market-data connection
- Standby trading core
- Application workers
- Recovery capability
- Non-critical application workloads where appropriate

Use PostgreSQL/Supabase for durable state.

Do not use Redis initially.

LEADER ELECTION

Implement a PostgreSQL-backed lease or advisory-lock strategy.

Requirements:

- only one real-time node can be authoritative;
- the active node renews a short lease;
- the standby monitors lease expiry;
- the standby takes over only after safe expiry;
- each leadership term receives a fencing token or epoch;
- every trading-state mutation includes the active epoch;
- stale leaders must be unable to commit orders or executions;
- prevent split brain.

LOAD BALANCER

The active trading node exposes readiness only while it:

- owns the valid leader lease;
- has a healthy database connection;
- has a usable market-data connection;
- has loaded authoritative account state;
- is permitted to accept trading commands.

The standby must not return ready for trading until takeover is complete.

WebSocket clients must reconnect automatically through the load balancer.

TARGETS

- Server failover target: under 10 seconds.
- No duplicated order.
- No lost acknowledged order.
- No stale-leader execution.
- No breach during feed unavailability.
- No manual page refresh required after failover.

======================================================================
8. ORDER AND EXECUTION ENGINE
======================================================================

The WARIBA server is authoritative.

Never trust balances, prices, PnL, order status, risk values or eligibility values
calculated by the browser.

Support at least:

- Market order
- Limit order
- Stop order
- Stop loss
- Take profit
- Bracket order
- OCO
- Partial close
- Cancel pending order
- Flatten account

EXECUTION SEMANTICS

Use bid/ask correctly.

Long position:

- Opens at ask.
- Closes at bid.
- Long stop-loss and take-profit triggers use the bid side.

Short position:

- Opens at bid.
- Closes at ask.
- Short stop-loss and take-profit triggers use the ask side.

Buy pending orders trigger against the appropriate ask price.
Sell pending orders trigger against the appropriate bid price.

All execution decisions use:

- latest authoritative valid tick;
- server receive time;
- server processing time;
- immutable execution record.

No order may execute using a STALE or OUTAGE tick.

IDEMPOTENCY

Every trading command must include a unique client_order_id or idempotency key.

The server must guarantee that a retry cannot create a duplicate order.

Store:

- request ID;
- idempotency key;
- account ID;
- command type;
- normalized payload hash;
- response;
- created timestamp;
- final result.

If the same idempotency key is reused with a different payload, reject it.

ORDER STATES

At minimum:

- RECEIVED
- VALIDATING
- ACCEPTED
- PENDING
- TRIGGERED
- EXECUTED
- PARTIALLY_CLOSED
- FILLED
- CANCELLED
- REJECTED
- PENDING_MARKET_RESUME
- FAILED

Every state transition must be auditable.

SERVER-SIDE RISK CHECKS BEFORE ACCEPTANCE

Check:

- account status;
- platform status;
- symbol availability;
- feed freshness;
- market session;
- allowed direction;
- max aggregate lot exposure;
- margin usage;
- daily-loss state;
- maximum-loss state;
- soft lock;
- manual-trading controls;
- account review status;
- duplicate request;
- pending close state.

Never rely on disabled UI buttons as the only control.

======================================================================
9. WARIx TERMINAL UX
======================================================================

Preserve the premium WARIBA visual identity and existing Design System.

Do not copy MetaTrader, cTrader, TradingView or TopstepX visually.

WariX must feel:

- premium;
- fast;
- calm;
- modern;
- trustworthy;
- mobile-first;
- purpose-built for WARIBA rules.

The terminal must include:

- chart;
- watchlist;
- order ticket;
- open positions;
- pending orders;
- trade history;
- account metrics;
- Risk HUD;
- market status;
- connection status;
- eligible profit information;
- manual-trading policy information.

RISK HUD

Show live server-authoritative values:

- Balance
- Equity
- Program-eligible balance
- Daily Loss remaining
- Maximum Loss floor
- Evaluation progress
- Best Day percentage
- Performance buffer
- Performance Days
- Eligible payout
- Margin usage
- Aggregate exposure

Do not overload the user.
Use progressive disclosure and tooltips.

TRADE HISTORY

Each closed trade or closed portion should display:

- symbol;
- side;
- quantity;
- opening price;
- closing price;
- opening time;
- closing time;
- duration;
- realized PnL;
- eligible PnL;
- eligibility status.

Examples of statuses:

- ELIGIBLE
- SHORT_DURATION_PROFIT
- LOSS_COUNTED
- BREAKEVEN
- UNDER_REVIEW

For a short-duration profit, show:

“Profit réalisé, mais non éligible : position conservée moins de 60 secondes.”

MARKET STATUS UI

HEALTHY:
small green/live indication

DEGRADED:
subtle amber indication

STALE:
visible banner:
“Données de marché momentanément indisponibles. Les nouvelles entrées sont suspendues.”

OUTAGE:
prominent status:
“Connexion au marché en cours de rétablissement. Vos positions et demandes de fermeture sont conservées.”

Do not use fake animation that implies prices are moving during an outage.

RECONNECT UX

When a user changes from Wi-Fi to mobile data or temporarily loses connectivity:

- reconnect automatically;
- restore chart subscriptions;
- retrieve the latest account snapshot;
- restore positions and orders;
- display reconciliation status;
- never duplicate an order;
- never show stale local account state as authoritative.

======================================================================
10. CHART PERFORMANCE AND ANTI-FREEZE REQUIREMENTS
======================================================================

The chart must be isolated from the execution and risk engines.

A browser rendering issue must never stop:

- server-side stops;
- take-profits;
- pending orders;
- PnL;
- drawdown monitoring;
- account lock;
- risk calculations.

Initial chart timeframes:

- 5 seconds
- 15 seconds
- 30 seconds
- 1 minute
- 3 minutes
- 5 minutes
- 15 minutes
- 1 hour
- 4 hours
- 1 day

Tick charts are disabled at launch.

TICK_CHARTS_ENABLED = false

Chart limits:

- Maximum 5 active indicators per chart
- Maximum 4 open charts on desktop
- Maximum 2 open charts on mobile
- Configurable limits
- Clear user feedback when a limit is reached

Performance requirements:

- calculate indicators in Web Workers;
- keep heavy calculations off the main UI thread;
- use bounded ring buffers;
- aggregate candles server-side where appropriate;
- throttle UI rendering without throttling the authoritative engine;
- use requestAnimationFrame for chart painting;
- do not rerender the entire terminal on every tick;
- virtualize large history tables;
- unsubscribe hidden charts;
- clean up WebSocket subscriptions;
- avoid memory leaks;
- limit retained client-side tick history;
- profile XAUUSD volatility bursts.

The authoritative engine may process every required valid provider update.
The browser can receive a controlled rendering cadence.

Do not confuse chart-rendering frequency with execution accuracy.

======================================================================
11. BOT AND AUTOMATION PREVENTION
======================================================================

No public trading API may be exposed.

Do not build:

- API keys for order execution;
- webhooks that open trades;
- EA bridges;
- MetaTrader connectors;
- browser automation endpoints;
- copy-trading endpoints;
- bulk order upload;
- automated signal execution.

Protect trading command endpoints with:

- authenticated session;
- CSRF protection where applicable;
- origin checks;
- short-lived authorization;
- server-side account ownership checks;
- rate limits;
- idempotency;
- device and session telemetry;
- audit logs.

Generate behavioural risk signals for patterns such as:

- impossible order frequency;
- perfectly repeated millisecond intervals;
- repeated identical order sequences;
- excessive SL/TP modifications;
- continuous activity inconsistent with manual trading;
- synchronized trading across unrelated accounts;
- identical trades across multiple identities;
- suspicious session sharing;
- headless browser indicators;
- Selenium or Playwright automation indicators;
- repeated requests outside the WariX UI flow.

Do not automatically terminate an account based solely on a heuristic.

Use statuses such as:

- NORMAL
- FLAGGED
- ENTRY_LOCKED
- UNDER_REVIEW
- CLEARED
- BREACHED_AFTER_REVIEW

All sanctions must create an auditable reason code.

======================================================================
12. PERSISTENCE AND DATA MODEL
======================================================================

Inspect the existing schema first.
Extend existing tables rather than creating duplicate concepts.

Ensure the domain can persist:

- market-data provider configuration;
- provider symbol mappings;
- normalized symbols;
- market-data health state;
- feed connection incidents;
- leadership lease;
- fencing epoch;
- orders;
- order state transitions;
- idempotency keys;
- executions;
- position lots;
- partial closes;
- PnL allocations;
- eligible PnL;
- ineligible short-duration profit;
- account snapshots;
- risk snapshots;
- Performance Day state;
- consistency state;
- queued close requests;
- automation-risk signals;
- account-review cases;
- system incidents;
- audit events;
- transactional outbox events.

Do not retain every UI-rendered tick indefinitely.

Persist at minimum:

- exact authoritative tick used for each execution;
- exact authoritative tick used for each risk breach;
- exact authoritative tick used for each SL/TP trigger;
- connection and outage events;
- normalized candle history required by the product;
- sufficient context to reproduce disputed trades.

Add appropriate indexes and retention rules.

All monetary fields must use fixed-precision decimal database types.

======================================================================
13. OBSERVABILITY
======================================================================

Add structured logs, metrics and alerts for:

MARKET DATA

- tick age;
- ticks per symbol;
- duplicate ticks;
- out-of-order ticks;
- invalid spreads;
- primary connection state;
- secondary connection state;
- reconnect count;
- failover count;
- stale duration;
- outage duration.

TRADING

- order commands;
- accepted orders;
- rejected orders;
- order latency;
- duplicate-prevention hits;
- executions;
- pending close requests;
- execution errors.

RISK

- daily-loss events;
- maximum-loss events;
- soft locks;
- stale-price protections;
- short-duration profit events;
- bot-risk signals;
- manual reviews.

PLATFORM

- active leader node;
- fencing epoch;
- lease renewal;
- database latency;
- WebSocket connections;
- reconnect rate;
- memory;
- CPU;
- event-loop lag;
- browser error rate.

Create health endpoints:

- /health/live
- /health/ready
- /health/market-data
- /health/trading-core

The trading readiness endpoint must be strict.

======================================================================
14. REQUIRED TESTING
======================================================================

Use the existing test stack.
Add unit, integration, end-to-end, property-based where appropriate,
replay, load and failure tests.

UNIT TESTS

Test:

- bid/ask execution;
- long and short PnL;
- spread handling;
- partial closes;
- FIFO lot matching;
- exact 60-second boundary;
- 59,999 ms positive close;
- 60,000 ms positive close;
- short-duration loss;
- zero-PnL close;
- fees turning gross profit into net loss;
- eligible-program balance;
- ineligible profit exclusion;
- Performance Day calculation;
- consistency exclusion;
- payout exclusion;
- trailing-floor exclusion;
- idempotency;
- stale tick rejection;
- out-of-order tick rejection.

INTEGRATION TESTS

Test:

- FCS adapter with recorded fixtures;
- mock provider;
- replay provider;
- subscription recovery;
- primary endpoint failure;
- secondary endpoint takeover;
- queued close during outage;
- execution after first valid recovery tick;
- leadership transfer;
- fencing-token rejection;
- database transaction rollback;
- transactional outbox;
- browser reconnect;
- account snapshot reconciliation.

END-TO-END TESTS

Test:

- sign in;
- open WariX;
- subscribe to EURUSD;
- place market order;
- attach SL and TP;
- partial close before 60 seconds;
- close remaining quantity after 60 seconds;
- verify realized and eligible PnL;
- disconnect user network;
- reconnect;
- verify no duplicate order;
- simulate feed outage;
- verify new entries blocked;
- submit close request;
- restore feed;
- verify close executed once;
- verify no incorrect breach.

LOAD TESTS

Use k6 or the repository’s chosen load-testing tool.

Minimum launch simulation:

- 500 registered accounts;
- 150 concurrent traders;
- 100 traders viewing or trading XAUUSD;
- 50 traders viewing or trading EURUSD;
- multiple timeframes;
- 20 near-simultaneous order submissions;
- WebSocket reconnect storm;
- volatility burst;
- 500 SL/TP mutations;
- primary feed interruption;
- primary node termination;
- standby takeover.

PASS CRITERIA

- Lost acknowledged orders: 0
- Duplicate executions: 0
- Breaches created from stale prices: 0
- Executions created from stale prices: 0
- Ineligible profits counted toward objectives: 0
- Losses excluded because of short duration: 0
- Reconnect without page reload
- Server failover target: under 10 seconds
- P95 internal order-command response: under 250 ms under expected load
- No unbounded memory growth
- No chart-main-thread freeze during tested volatility
- No client secret exposure
- No browser connection to FCS

CHAOS TESTS

Deliberately test:

- primary FCS socket terminated;
- both FCS endpoints unavailable;
- primary server process killed;
- database temporarily slow;
- user submits the same order twice;
- delayed out-of-order tick;
- provider timestamp jump;
- extreme spread;
- corrupted tick;
- browser offline/online transition;
- Wi-Fi to mobile-network transition.

======================================================================
15. DOCUMENTATION AND RULESET UPDATES
======================================================================

Update the existing documents rather than creating conflicting replacements.

Update at minimum:

- WARIBA_RULESET_v1.1.json
- DECISION_LOG.md
- WARIBA Program Rulebook v1.1
- WARIBA Product Master Document v1.1
- WARIBA System Architecture
- WARIBA Security QA Operations Standard
- WARIBA Build Plan
- WARIBA Prompt Pack
- .env.example
- operational runbook

Add or update rules equivalent to:

{
  "platform": {
    "native": "WariX",
    "simulated_trading_only": true,
    "mt5_enabled": false,
    "ctrader_enabled": false,
    "tradingview_broker_enabled": false,
    "futures_enabled": false,
    "nas100_enabled": false
  },
  "market_data": {
    "provider": "fcs",
    "transport": "websocket",
    "primary_and_standby_connections": true,
    "browser_direct_provider_access": false,
    "healthy_threshold_seconds": 2,
    "stale_threshold_seconds": 5,
    "outage_threshold_seconds": 15
  },
  "capacity": {
    "registered_users_initial_target": 500,
    "concurrent_traders_initial_target": 150
  },
  "execution": {
    "simulated": true,
    "manual_only": true,
    "bots_allowed": false,
    "expert_advisors_allowed": false,
    "trade_copiers_allowed": false,
    "automated_execution_allowed": false,
    "public_execution_api_enabled": false
  },
  "profit_eligibility": {
    "minimum_duration_seconds": 60,
    "positive_pnl_below_minimum_eligible": false,
    "loss_below_minimum_counts": true,
    "counts_toward_evaluation_target": false,
    "counts_toward_buffer": false,
    "counts_toward_performance_days": false,
    "counts_toward_consistency": false,
    "counts_toward_payout": false,
    "moves_eod_trailing_floor": false,
    "warning_threshold_24h": 3,
    "review_threshold_24h": 6,
    "automatic_breach": false
  },
  "charts": {
    "tick_charts_enabled": false,
    "max_indicators_per_chart": 5,
    "max_desktop_charts": 4,
    "max_mobile_charts": 2,
    "timeframes": [
      "5s",
      "15s",
      "30s",
      "1m",
      "3m",
      "5m",
      "15m",
      "1h",
      "4h",
      "1d"
    ]
  }
}

Do not copy this JSON blindly if the existing schema uses another structure.
Map the decisions into the existing canonical schema.

Add explicit Decision Log entries for:

- WariX-only launch;
- Forex and XAUUSD launch scope;
- FCS as replaceable initial provider;
- active–standby real-time architecture;
- 500 registered / 150 concurrent target;
- manual trading only;
- bots and trade copiers prohibited;
- no public execution API;
- 60-second positive-profit eligibility;
- all losses always counted;
- short-duration positive profits excluded from all program progression;
- no automatic breach based only on heuristics;
- tick charts disabled;
- MT5, cTrader and futures deferred.

======================================================================
16. FORBIDDEN IMPLEMENTATION SHORTCUTS
======================================================================

Do not:

- connect browsers directly to FCS;
- expose the FCS API key;
- calculate authoritative PnL in React;
- use JavaScript Number for monetary calculations;
- execute orders on stale prices;
- invent prices during outages;
- hide outages;
- block users from closing positions;
- discard losses below 60 seconds;
- count quick profits toward payouts;
- use browser timestamps for eligibility;
- create duplicate orders after retry;
- trigger permanent breaches solely from bot heuristics;
- add Redis without proving it is necessary;
- add Kafka;
- add Kubernetes;
- split the system into premature microservices;
- implement MT5;
- implement cTrader;
- implement futures;
- implement NAS100;
- implement public trading APIs;
- implement bots or EA support;
- create fake live-data behavior;
- claim FCS connectivity works without a real credential test.

======================================================================
17. IMPLEMENTATION ORDER
======================================================================

Implement in this sequence:

PHASE A — Audit and domain decisions

- inspect repository;
- map existing modules;
- identify conflicting logic;
- publish gap analysis;
- confirm canonical domain ownership.

PHASE B — Market-data domain

- provider interfaces;
- normalized ticks;
- mock provider;
- replay provider;
- FCS adapter;
- health monitoring;
- primary/secondary reconnection.

PHASE C — Trading core

- server-authoritative orders;
- execution;
- positions;
- FIFO lots;
- partial closes;
- PnL;
- idempotency;
- stale-price controls.

PHASE D — Profit eligibility

- 60-second rule;
- eligible PnL ledger;
- program-eligible balance;
- short-duration tracking;
- warning and review states;
- Rulebook calculations.

PHASE E — Resilience

- leader lease;
- fencing token;
- active/standby takeover;
- strict readiness;
- queued closes;
- client resynchronization.

PHASE F — WariX frontend

- live chart;
- Risk HUD;
- order ticket;
- market status;
- reconnection;
- trade eligibility labels;
- performance optimizations;
- mobile behavior.

PHASE G — Anti-automation

- endpoint restrictions;
- rate limits;
- telemetry;
- risk signals;
- review workflow.

PHASE H — Tests and operational validation

- unit;
- integration;
- E2E;
- replay;
- load;
- chaos;
- runbook;
- final acceptance report.

======================================================================
18. REQUIRED FINAL OUTPUT
======================================================================

At completion, return:

1. AUDIT SUMMARY

- existing strengths;
- defects found;
- risks found;
- decisions preserved;
- decisions changed.

2. IMPLEMENTATION SUMMARY

- files created;
- files changed;
- database migrations;
- new modules;
- APIs;
- WebSocket channels;
- environment variables.

3. TRADING RULE SUMMARY

- exact 60-second behavior;
- partial-close behavior;
- losses;
- quick profits;
- bots;
- account-review behavior.

4. RESILIENCE SUMMARY

- feed failover;
- server failover;
- stale-price behavior;
- queued closes;
- client reconnect.

5. TEST RESULTS

- unit tests;
- integration tests;
- E2E tests;
- load tests;
- chaos tests;
- failures still unresolved.

6. PRODUCTION READINESS

Classify every major area as:

- READY
- READY WITH CONFIGURATION
- BLOCKED BY CREDENTIAL
- BLOCKED BY INFRASTRUCTURE
- NOT READY

7. MANUAL ACTIONS REQUIRED

List only genuine actions required from the WARIBA owner, such as:

- obtaining the FCS API key;
- configuring production URLs;
- provisioning the two servers;
- configuring DNS and load balancer;
- entering secrets;
- running the final live-feed test.

Do not claim production readiness when live provider credentials,
failover infrastructure or load tests have not actually been validated.

======================================================================
19. SUCCESS DEFINITION
======================================================================

The implementation is successful only when:

- WariX receives real bid/ask Forex and XAUUSD data through a replaceable provider adapter;
- clients never connect directly to the provider;
- the server remains authoritative;
- chart rendering cannot stop the trading engine;
- stale prices cannot execute trades or create breaches;
- acknowledged orders cannot be duplicated;
- users reconnect without reloading;
- the standby can safely replace the primary;
- positive profit below 60 seconds is recorded but excluded;
- every loss counts;
- partial closes are handled correctly;
- bots and external automated execution are unavailable;
- the system supports 500 registered and 150 concurrent users under test;
- every material decision is reflected in code, ruleset, tests and documentation.

Begin by reading the project documentation and auditing the current Prompt 7 implementation.
Then proceed through the full implementation.
```

## Non-scope confirmé

- MT5, cTrader, TradingView broker integration, futures, NAS100 : hors scope, `DEFERRED`.
- Bots, EA, trade copiers, API d'exécution publique : interdits en permanence pour WariX, pas seulement différés.
- Redis, Kafka, Kubernetes : à ne pas ajouter sans preuve concrète de nécessité.

## Stop conditions

Arrête-toi (au sens : documente `BLOCKED BY CREDENTIAL`, n'improvise pas une
fausse réussite) si :

- `FCS_API_KEY` n'est pas fourni — implémente `FcsMarketDataProvider` en
  entier mais ne prétends jamais qu'une connexion live a été testée ;
- une infrastructure à deux nœuds réels n'existe pas — implémente et teste le
  bail PostgreSQL/l'élection de leader avec des processus locaux, mais
  classe le déploiement physique `BLOCKED BY INFRASTRUCTURE` ;
- un outil de load testing à l'échelle demandée (500 comptes/150 concurrents)
  ne peut pas être exécuté dans cet environnement — documente le script et la
  méthode, classe le résultat `BLOCKED BY INFRASTRUCTURE`.

---

# 32. Appendice 07-A — Correction du catalogue de marchés WariX

## Portée

Cet appendice corrige uniquement les restrictions de scope de marché
énoncées dans le Prompt 07 et le Prompt 07B. Il ne remplace ni le
terminal, ni le trading core, ni le risk engine, ni la résilience,
ni le trading manuel, ni la règle d'éligibilité de profit à 60 secondes.

En particulier, il annule :

- `NAS100_ENABLED = false` (Prompt 07B §3) — NAS100 est déjà un symbole
  supporté au niveau du ruleset et du code (`packages/adapters`,
  `packages/database`) depuis le Prompt 04 ; cette restriction aurait
  constitué une régression contre une fonctionnalité déjà livrée et
  testée. L'appendice réactive NAS100 explicitement et ajoute SPX500.
- la liste fixe à dix symboles (`INITIAL_MARKETS`) comme plafond
  définitif du catalogue.

## Prompt prêt à copier

```text
APPENDIX 07-A — CORRECTION DU CATALOGUE DE MARCHÉS WARIX

This appendix overrides only the market-scope restrictions previously stated
in Prompt 7 or Prompt 7B.

Do not regenerate or replace Prompt 7.
Do not remove existing terminal, trading-core, risk, resilience,
manual-trading or 60-second profit-eligibility requirements.

======================================================================
1. CORRECTED MARKET SCOPE
======================================================================

WariX must not be limited to a manually selected list of ten Forex pairs.

The production market catalogue must support:

1. All Forex currency pairs made available in real time by the configured
   FCS API WebSocket Business subscription.

2. Gold:
   - XAUUSD

3. Major indices:
   - NAS100 / Nasdaq 100
   - SPX500 / S&P 500

4. Energy instruments included in the provider subscription and returned
   as active real-time instruments:
   - WTI crude oil
   - Brent crude oil
   - Natural gas

5. Additional instruments may be activated later through configuration
   without rewriting the trading engine.

The following previous restrictions are cancelled:

NAS100_ENABLED = false
INITIAL_MARKETS = fixed ten-symbol list

Replace them with:

FOREX_CATALOG_MODE = "ALL_PROVIDER_AVAILABLE"
NAS100_ENABLED = true
SPX500_ENABLED = true
XAUUSD_ENABLED = true
ENERGY_MARKETS_ENABLED = true
FUTURES_ENABLED = false

NASDAQ and S&P 500 in this launch scope are simulated index/CFD-style
instruments based on the available provider feed.

They are not CME futures contracts.

======================================================================
2. PROVIDER-DRIVEN SYMBOL DISCOVERY
======================================================================

Do not manually hardcode every available Forex pair.

The market-data service must retrieve the available provider catalogue
through the official FCS Symbols List API or equivalent current provider
endpoint.

At startup and on a scheduled refresh:

1. Retrieve the current FCS symbol catalogue.
2. Filter symbols by the enabled asset classes.
3. Validate that the instrument has a current real-time quote.
4. Map the provider symbol to a stable WARIBA internal symbol.
5. Store the mapping in the database.
6. Mark unavailable or stale symbols as temporarily unavailable.
7. Never invent a provider ticker.

Required internal asset classes:

FOREX
METAL
INDEX
ENERGY

Example internal canonical symbols:

EURUSD
GBPUSD
USDJPY
XAUUSD
NAS100
SPX500
WTIUSD
BRENTUSD
NGASUSD

Provider-specific names must remain inside the provider adapter.

Example:

WARIBA internal symbol:
NAS100

Possible provider symbol:
resolved dynamically from FCS catalogue

Do not assume that the provider always uses NAS100, NDX, US100
or another specific identifier.

======================================================================
3. ALL FOREX PAIRS AVAILABLE, BUT NOT ALL STREAMED SIMULTANEOUSLY
======================================================================

Every eligible Forex pair returned by the provider must be searchable
and available in WariX.

This includes, when present:

- major pairs;
- minor pairs;
- cross pairs;
- exotic pairs.

However, do not subscribe every connected trader to every symbol.

Use on-demand subscriptions:

- subscribe when the symbol is visible in a watchlist;
- subscribe when its chart is open;
- subscribe when an order or position exists;
- unsubscribe after the symbol is no longer required;
- maintain server-side subscriptions for symbols with open exposure;
- aggregate identical symbol subscriptions across users.

One upstream subscription must serve all WariX clients interested
in the same instrument.

Example:

100 traders viewing EURUSD
=
one or a small controlled number of upstream EURUSD subscriptions,
then internal WARIBA redistribution.

Do not open one FCS connection per trader.

======================================================================
4. MARKET CATALOGUE UX
======================================================================

The WariX market selector must provide these categories:

- Favoris
- Forex
- Métaux
- Indices
- Énergies

Default featured instruments:

Forex:
- EURUSD
- GBPUSD
- USDJPY
- AUDUSD
- USDCAD
- USDCHF
- NZDUSD
- EURJPY
- GBPJPY

Metals:
- XAUUSD

Indices:
- NAS100
- SPX500

Energies:
- WTI
- Brent
- Natural Gas

All other available Forex pairs remain accessible through search.

Do not display thousands of symbols in one unfiltered list.

Provide:

- instant symbol search;
- favourites;
- recently viewed;
- recently traded;
- asset-class filters;
- market availability state;
- spread;
- bid;
- ask;
- daily change when available.

======================================================================
5. ENERGY INSTRUMENT ACTIVATION
======================================================================

Energy instruments must be enabled only when all of these conditions are met:

- the symbol exists in the provider catalogue;
- a valid bid and ask are available;
- the feed is classified as real time;
- the instrument is currently enabled in WARIBA configuration;
- its contract specification exists;
- its trading schedule exists;
- its margin and exposure limits exist.

Initial energy candidates:

- WTI crude oil
- Brent crude oil
- Natural gas

If an energy instrument is included in the FCS Business package
but lacks a valid real-time bid/ask feed, keep it hidden or marked
temporarily unavailable.

Do not substitute delayed values for live values.

======================================================================
6. INSTRUMENT SPECIFICATIONS
======================================================================

Market data alone does not define a simulated trading instrument.

Create a versioned Instrument Specification for every enabled symbol.

Each specification must include:

- internal symbol;
- provider symbol;
- display name;
- asset class;
- base currency;
- quote currency;
- price precision;
- tick size;
- contract size;
- lot step;
- minimum lot;
- maximum lot by WARIBA account size;
- margin rate or leverage;
- commission;
- spread treatment;
- trading sessions;
- daily maintenance window;
- swap or overnight-financing policy;
- weekend policy;
- status;
- effective version date.

Do not reuse Forex contract specifications blindly for:

- Gold;
- Nasdaq;
- S&P 500;
- WTI;
- Brent;
- Natural Gas.

Each asset class requires its own PnL and exposure tests.

======================================================================
7. CONFIGURATION OVERRIDE
======================================================================

Map the following decisions into the existing canonical ruleset schema:

{
  "markets": {
    "catalog_mode": "provider_driven",
    "forex": {
      "enabled": true,
      "availability": "all_realtime_provider_pairs"
    },
    "metals": {
      "enabled": true,
      "initial_symbols": ["XAUUSD"]
    },
    "indices": {
      "enabled": true,
      "initial_symbols": ["NAS100", "SPX500"]
    },
    "energies": {
      "enabled": true,
      "initial_symbols": ["WTIUSD", "BRENTUSD", "NGASUSD"],
      "activation_condition": "provider_realtime_available"
    },
    "futures": {
      "enabled": false
    }
  }
}

Do not copy this structure blindly when the repository already has
a different canonical schema.

The final configuration must preserve these meanings.

======================================================================
8. TESTS TO ADD
======================================================================

Add automated tests covering:

- provider catalogue discovery;
- all eligible Forex pairs becoming searchable;
- unknown provider symbols being rejected;
- provider-to-WARIBA symbol mapping;
- NAS100 live subscription;
- SPX500 live subscription;
- XAUUSD live subscription;
- WTI subscription when available;
- Brent subscription when available;
- natural-gas subscription when available;
- unavailable energy symbol remaining disabled;
- delayed symbol not being represented as live;
- one upstream symbol stream serving multiple WariX clients;
- automatic subscribe and unsubscribe;
- open positions preserving their market-data subscription;
- correct bid/ask execution for Forex;
- correct PnL for Gold;
- correct PnL for indices;
- correct PnL for energy instruments;
- asset-specific trading sessions;
- asset-specific contract sizes;
- stale-price protections for every asset class.

======================================================================
9. DOCUMENTATION UPDATE
======================================================================

Update only the affected market-scope sections in:

- WARIBA_RULESET_v1.1.json
- DECISION_LOG.md
- WARIBA Program Rulebook
- WARIBA Product Master
- WARIBA System Architecture
- Prompt Pack
- Instrument Specification documentation

Add Decision Log entries equivalent to:

MARKET-001 — LOCKED
All real-time Forex pairs made available by the provider are eligible
for the WariX catalogue.

MARKET-002 — LOCKED
XAUUSD is enabled at launch.

MARKET-003 — LOCKED
NAS100 and SPX500 are enabled at launch as simulated index instruments.

MARKET-004 — LOCKED
Available real-time energy instruments included in the provider package
may be enabled at launch after contract-specification validation.

MARKET-005 — LOCKED
CME futures remain outside the initial launch.

MARKET-006 — LOCKED
The catalogue is provider-driven and searchable rather than hardcoded.

======================================================================
10. FINAL MARKET DECISION
======================================================================

WariX launch catalogue:

- All available real-time Forex pairs
- XAUUSD
- NAS100
- SPX500
- WTI, Brent and Natural Gas when present as valid real-time instruments

Not included yet:

- CME futures contracts
- Cryptocurrency
- Individual equities
- ETFs
- options

Do not remove the previously locked requirements concerning:

- simulated trading;
- server-authoritative execution;
- manual trading only;
- prohibition of bots and trade copiers;
- 60-second minimum profit eligibility;
- active–standby resilience;
- stale-price protection;
- no direct browser connection to FCS.
```

## Note d'implémentation

`packages/adapters/src/market-data-provider.ts` expose aujourd'hui
`TradableSymbol` comme une union TypeScript figée à cinq valeurs
(`EURUSD | GBPUSD | USDJPY | XAUUSD | NAS100`), reprise telle quelle dans
`packages/contracts`, `packages/database` et l'intégralité du terminal
WariX livré au Prompt 07. Migrer vers un catalogue « n'importe quelle
paire Forex retournée par FCS » sans rupture nécessite une refonte de
cette frontière de type à travers cinq paquets — voir le Gap Analysis
et le plan de phases publiés lors de l'exécution de ce prompt dans
DECISION_LOG.md pour l'approche retenue (catalogue de découverte séparé
du jeu « featured/tradable » entièrement spécifié).
