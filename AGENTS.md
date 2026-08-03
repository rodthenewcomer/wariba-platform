# AGENTS.md — WARIBA

> Instructions obligatoires pour tout agent IA, développeur, script ou outil automatisé intervenant dans le dépôt `wariba-platform`.

## 1. Identité du projet

| Champ | Valeur |
|---|---|
| Marque | WARIBA |
| Domaine | `wariba.app` |
| Marché initial | Afrique francophone |
| Langue produit | Français |
| Produit | WARIBA ONE → WARIBA Performance → WARIBA Review |
| Environnement V1 | Trading simulé |
| Application | Web responsive + PWA |
| App native | Non en V1 |
| Agents IA autorisés | Codex, Claude Code ou tout autre agent IA explicitement mandaté |
| Rôles autorisés | Construction, modification, audit et documentation — voir DECISION_LOG AI-015 |
| Architecture | Modular monolith |
| État initial | Dossier créé, aucun code produit commencé |

WARIBA est une infrastructure de progression pour traders disciplinés.

WARIBA n’est pas :

- un broker ;
- une plateforme de capital réel au lancement ;
- un casino ;
- une app crypto ;
- une copie de MT5 ;
- une prop firm « facile » ;
- un produit R1STER.

Aucune référence active à **R1STER** ne doit apparaître dans le produit, le code, les branches, les packages, les textes, les variables, les routes ou les documents actifs.

---

## 2. Sources de vérité obligatoires

Avant toute grande tâche, lire dans cet ordre :

```text
docs/00-decisions/DECISION_LOG.md
docs/01-product/WARIBA_Product_Master_Document_v1.1.md
docs/01-product/WARIBA_Product_Master_Document_v1.0.md
docs/02-program/WARIBA_Program_Rulebook_v1.1.md
docs/02-program/WARIBA_RULESET_v1.1.json
docs/02-program/WARIBA_Program_Rulebook_v1.0.md
docs/02-program/WARIBA_RULESET_v1.0.json
docs/03-finance/WARIBA_Financial_Model_v1.1.xlsx
docs/03-finance/WARIBA_Actuarial_Risk_Model_v1.0.md
docs/03-finance/WARIBA_Financial_Model_v1.0.xlsx
docs/04-ux/WARIBA_UX_Architecture_v1.0.md
docs/05-design/WARIBA_Design_System_v1.0.md
docs/05-design/tokens.json
docs/06-engineering/WARIBA_Engineering_Constitution_v1.0.md
docs/06-engineering/WARIBA_System_Architecture_v1.0.md
docs/07-assurance/WARIBA_Security_QA_Operations_Standard_v1.0.md
docs/08-delivery/WARIBA_Build_Plan_v1.0.md
docs/09-prompts/WARIBA_Prompt_Pack_v1.0.md
```

Hiérarchie en cas de contradiction :

1. obligations légales applicables ;
2. conditions contractuelles acceptées ;
3. policy version attachée au compte ;
4. Program Rulebook ;
5. Financial Model ;
6. Product Master ;
7. UX Architecture ;
8. Design System ;
9. Engineering Constitution ;
10. System Architecture ;
11. Security, QA & Operations Standard ;
12. Build Plan ;
13. prompt actif ;
14. code ;
15. commentaire.

Un prompt ne peut pas modifier un document supérieur.

Le code ne peut pas devenir la source de vérité d’une règle non documentée.

---

## 3. Workflow obligatoire des agents

Toute tâche significative suit ce protocole :

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

### 3.1 Inspection

Avant de modifier :

- vérifier la branche ;
- vérifier `git status` ;
- lire les documents applicables ;
- chercher les implémentations existantes ;
- identifier les migrations ;
- identifier les tests ;
- identifier les risques ;
- identifier les décisions ouvertes.

### 3.2 Plan

Le plan doit indiquer :

- objectif ;
- scope ;
- non-scope ;
- fichiers concernés ;
- migrations ;
- tests ;
- risques ;
- décisions requises ;
- rollback ou compensation.

### 3.3 Implémentation

- changements limités au scope ;
- petites unités cohérentes ;
- aucune refonte non demandée ;
- aucune dépendance inutile ;
- aucune règle improvisée.

### 3.4 Rapport final

Toujours fournir :

```text
1. Résumé du travail
2. Fichiers créés/modifiés
3. Décisions appliquées
4. Tests exécutés
5. Résultats exacts
6. Risques ou limites
7. Décisions encore ouvertes
8. Commandes de vérification
9. Proposition de PR
10. Statut : PASS / PASS WITH ACTIONS / BLOCKED
```

---

## 4. Stop conditions

Arrêter avant de coder si :

- un document requis manque ;
- une règle nécessaire est ambiguë ;
- une décision `OPEN` bloque l’implémentation ;
- la branche est incorrecte ;
- des changements non compris existent ;
- la CI est déjà rouge pour une cause inconnue ;
- un secret est détecté ;
- une migration appliquée devrait être modifiée ;
- le scope exige un nouveau provider réel ;
- le scope exige un changement de stack ;
- le scope exige un service non autorisé ;
- une action détruirait des données ;
- le client devrait devenir autoritaire sur une donnée financière ;
- l’agent ne peut pas prouver les tests exécutés.

Statut à utiliser :

```text
BLOCKED
```

avec la cause exacte et la décision requise.

---

## 5. Architecture verrouillée

### 5.1 Runtime

WARIBA utilise trois processus :

```text
Web/BFF       → Next.js
Realtime      → Node.js + Fastify + WebSocket
Worker        → Node.js
```

Ces processus partagent :

- les mêmes packages ;
- le même domaine ;
- PostgreSQL ;
- les mêmes policies ;
- les mêmes contrats.

Ils ne constituent pas des microservices métier.

### 5.2 Stack

```text
TypeScript strict
pnpm + Corepack
Turborepo
Next.js
React
Fastify
PostgreSQL / Supabase
Supabase Auth
Supabase Storage privé
Kysely
Zod
Decimal.js
Lightweight Charts
Vitest
Playwright
GitHub Actions
```

### 5.3 Interdictions d’architecture

Ne pas ajouter sans ADR et validation :

- microservices métier ;
- Redis ;
- Kafka ;
- NATS ;
- Kubernetes ;
- service mesh ;
- event sourcing complet ;
- app native ;
- API publique ;
- provider de trading réel ;
- provider de paiement réel ;
- provider de payout réel ;
- vector database ;
- moteur IA de trading.

---

## 6. Structure du dépôt

```text
wariba-platform/
├── apps/
│   └── web/
├── services/
│   ├── realtime/
│   └── worker/
├── packages/
│   ├── design-tokens/
│   ├── ui/
│   ├── contracts/
│   ├── domain/
│   ├── policies/
│   ├── database/
│   ├── validation/
│   ├── observability/
│   ├── adapters/
│   ├── config/
│   └── test-utils/
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   ├── tests/
│   └── config.toml
├── docs/
├── scripts/
├── tooling/
├── .github/
├── AGENTS.md
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

Ne pas créer une structure parallèle sans ADR.

---

## 7. Modules métier

Modules initiaux :

```text
identity
commerce
trading
policy-risk
performance-payout
support
operations
```

Chaque module expose :

- commandes ;
- queries ;
- services publics ;
- DTO ;
- événements ;
- erreurs.

Chaque module garde privés :

- repositories internes ;
- modèles de persistance ;
- tables ;
- détails d’infrastructure.

### 7.1 Interdictions de dépendance

- UI → infrastructure interne : interdit ;
- Support → trading repository : interdit ;
- Commerce → payout internals : interdit ;
- frontend → database package : interdit ;
- navigateur → tables financières : interdit.

---

## 8. Règles TypeScript

Configuration minimale :

```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true,
  "useUnknownInCatchVariables": true,
  "forceConsistentCasingInFileNames": true
}
```

Interdits :

- `any` non justifié ;
- `@ts-ignore` sans ticket ;
- `as unknown as` ;
- assertion pour cacher une erreur ;
- switch non exhaustif ;
- catch silencieux ;
- promesse non attendue ;
- import circulaire ;
- entrée externe non validée.

Toute donnée externe commence comme `unknown` puis est validée.

---

## 9. Règles financières

### 9.1 Server authoritative

Le serveur est l’unique autorité pour :

- ordres ;
- fills ;
- prix d’exécution ;
- positions ;
- PnL ;
- balance ;
- equity ;
- risque ;
- violations ;
- passage ;
- payout ;
- paiements confirmés ;
- permissions.

### 9.2 Pas de float financier

Interdit :

```ts
const payout = profit * 0.5;
```

lorsque `profit` est un `number`.

Obligatoire :

- Decimal.js côté TypeScript ;
- PostgreSQL `numeric` ;
- sérialisation décimale en chaîne ;
- mode d’arrondi explicite.

### 9.3 Value objects

Créer et utiliser :

- Money ;
- Price ;
- Quantity ;
- Percentage ;
- ExchangeRate ;
- PnL ;
- Balance ;
- Equity.

### 9.4 Ledger

Aucune balance ne doit être corrigée par édition directe.

Utiliser :

- entrée ;
- reversal ;
- adjustment autorisé ;
- audit.

---

## 10. Temps et timezone

- stocker les instants en UTC ;
- utiliser `timestamptz` ;
- injecter une `Clock` dans le domaine ;
- ne pas disperser `new Date()` dans la logique métier ;
- le reset V1 est 00:00 UTC selon policy ;
- le frontend ne décide pas seul du prochain reset.

---

## 11. Policies et règles

### 11.1 Immutabilité

Une policy publiée n’est jamais modifiée.

Chaque compte conserve :

- policy version ID ;
- hash machine ;
- hash document ;
- date d’acceptation ;
- locale.

### 11.2 Règles WARIBA ONE v1.1

```text
1 phase
Target : 10 % réalisé uniquement
Daily Loss Limit : 3 %, soft lock
Maximum Loss : 10 %, EOD trailing, hard breach
Best Day Rule : 50 %, non-breach, bloque seulement le passage
Jours minimums : 0
Journées qualifiées : aucune en Evaluation
Durée : illimitée
Inactivité : 30 jours
Overnight : autorisé
Weekend : interdit
News : autorisées
Activation fee : non
```

Le plancher Maximum Loss est recalculé uniquement sur les balances EOD finalisées,
ne baisse jamais et se verrouille au nominal. Le moteur surveille ensuite l'equity
contre ce plancher versionné.

### 11.3 Règles Performance v1.1

```text
DLL : 3 %
Maximum Loss : 10 %, EOD trailing
Best Day Rule : 50 % par cycle, non-breach
Performance Days : 5 nouvelles journées par payout
Seuil Performance Day : 0,50 % du nominal réalisé
Buffer permanent : 10 %, non retirable, construit une seule fois
Payout : excédent réalisé au-dessus du buffer, limité par le cap applicable
Split cycles 1–4 : 85/15
Split cycle 5 : 90/10
5 payouts maximum avant Review
Aucun Live garanti
```

Le JSON machine et le Rulebook doivent rester cohérents.

---

## 12. Idempotence

Obligatoire pour :

- création commande ;
- tentative paiement ;
- webhook paiement ;
- fulfillment ;
- activation ;
- ordre ;
- Close All ;
- daily worker ;
- passage Evaluation → Performance ;
- payout request ;
- payout approval ;
- payout transfer ;
- cycle suivant ;
- notification critique.

Le retry doit retourner le résultat original sans créer un second effet.

---

## 13. Base de données

### 13.1 Migrations

- SQL versionné ;
- Supabase CLI ;
- une migration appliquée n’est jamais modifiée ;
- toute correction crée une nouvelle migration ;
- expand-and-contract pour changement destructif.

### 13.2 Contraintes

Utiliser :

- primary keys ;
- foreign keys ;
- unique constraints ;
- check constraints ;
- indexes justifiés ;
- `numeric` ;
- `timestamptz`.

### 13.3 RLS

RLS obligatoire sur toute table privée utilisateur.

Tests minimums :

- propriétaire ;
- autre utilisateur ;
- staff autorisé ;
- staff interdit ;
- anonymous ;
- service role.

### 13.4 Écritures financières

Aucune écriture client directe sur :

- comptes ;
- ordres ;
- fills ;
- positions ;
- ledger ;
- violations ;
- payouts ;
- policies.

---

## 14. Transactions et concurrence

Pour toute commande modifiant un compte :

```text
1. Lock account row
2. Reload state
3. Validate policy
4. Execute domain command
5. Persist fills/positions/ledger
6. Recalculate risk
7. Write audit/outbox
8. Commit
```

Tester :

- double order ;
- deux ordres concurrents ;
- double close ;
- soft lock pendant ordre ;
- double payout ;
- double webhook ;
- worker retry.

---

## 15. API et WebSocket

### 15.1 HTTP

Base :

```text
/api/v1
```

Réponse succès :

```json
{
  "data": {},
  "meta": {
    "correlationId": "..."
  }
}
```

Réponse erreur :

```json
{
  "error": {
    "code": "STABLE_ERROR_CODE",
    "message": "Message utilisateur",
    "retryable": false
  },
  "meta": {
    "correlationId": "..."
  }
}
```

### 15.2 WebSocket

Chaque message contient :

```text
type
version
sequence
occurredAt
correlationId
payload
```

Le client doit gérer :

- heartbeat ;
- gap detection ;
- replay ;
- snapshot ;
- resync ;
- stale state.

Une déconnexion ne signifie pas automatiquement qu’une commande a échoué.

---

## 16. Market Data

### 16.1 V1

Market sandbox déterministe :

- seed ;
- bid ;
- ask ;
- timestamp ;
- sequence ;
- status ;
- scénarios stale/gap.

### 16.2 Interdictions

- ne pas stocker tous les ticks indéfiniment ;
- ne pas utiliser un ancien prix comme prix courant ;
- ne pas utiliser un provider réel sans licence ;
- ne pas afficher une donnée sandbox comme réelle.

### 16.3 Evidence

Stocker les snapshots associés à :

- fill ;
- violation ;
- dispute ;
- replay.

---

## 17. Trading Engine

V1 supporte :

- Market Buy ;
- Market Sell ;
- Stop Loss ;
- Take Profit ;
- modification SL/TP ;
- partial close ;
- full close ;
- Close All.

Le serveur décide :

- du prix ;
- du spread ;
- du slippage sandbox ;
- du fill ;
- du rejet.

Le frontend n’envoie jamais un prix autoritaire.

---

## 18. Risk Engine

Entrées :

- compte ;
- policy ;
- clock ;
- ledger ;
- positions ;
- prix ;
- daily snapshot.

Sorties :

- target ;
- DLL ;
- Maximum Loss ;
- consistance ;
- journées ;
- qualified days ;
- warnings ;
- violations ;
- éligibilité.

La consistance > 40 % :

- ne constitue jamais un breach ;
- bloque uniquement le passage ou le payout.

---

## 19. Payout Engine

Le calcul suit strictement :

```text
profit net du cycle
→ limite 50 %
→ cap applicable
→ Payout Base
→ split
→ Trader Cash
```

Invariants :

- payout ≥ 0 ;
- payout ≤ 50 % ;
- payout ≤ cap ;
- Trader Cash ≤ Payout Base ;
- aucune position ouverte ;
- un seul payout actif ;
- cycle payé non payable à nouveau ;
- compte gelé pendant la demande ;
- réserve non rétroactive.

---

## 20. Sécurité

### 20.1 Deny by default

Tout accès absent est refusé.

### 20.2 Staff

- MFA avant staging réaliste ;
- RBAC ;
- permissions fines ;
- session courte ;
- audit.

### 20.3 Control

`control.wariba.app`

Interdits :

- balance edit ;
- delete fill ;
- delete payout ;
- delete audit ;
- modification policy publiée ;
- super-admin silencieux.

### 20.4 Secrets

Jamais dans :

- Git ;
- prompts ;
- logs ;
- screenshots ;
- README ;
- `.env.example`.

### 20.5 Sandbox fail-fast

En production :

```text
sandbox provider detected
→ refuse startup
```

---

## 21. Design System

Direction :

> Quiet Financial Authority

Obligatoire :

- Manrope Variable ;
- IBM Plex Mono ;
- Ink ;
- Bone ;
- Cobalt ;
- Copper limité ;
- tokens centralisés ;
- WCAG 2.2 AA ;
- mobile 320 px.

Interdits :

- gradient dominant ;
- glassmorphism généralisé ;
- bento générique ;
- blobs ;
- faux dashboard ;
- faux graphiques ;
- faux témoignages ;
- faux partenaires ;
- radius > 20 px ;
- couleur hardcodée ;
- animation gratuite ;
- marketing dans Trade.

La logique métier ne doit pas être calculée dans les composants UI.

---

## 22. Tests obligatoires

### 22.1 Static

- format ;
- lint ;
- typecheck ;
- build ;
- boundaries ;
- secret scan.

### 22.2 Unit

- value objects ;
- state machines ;
- formulas ;
- errors ;
- permissions.

### 22.3 Property-based

- risk invariants ;
- payout invariants ;
- ledger invariants.

### 22.4 Integration

- PostgreSQL ;
- migrations ;
- RLS ;
- outbox ;
- workers ;
- webhooks ;
- adapters.

### 22.5 Concurrency

- double order ;
- double close ;
- double payout ;
- double webhook ;
- retries.

### 22.6 E2E

- signup ;
- checkout sandbox ;
- activation ;
- trade ;
- soft lock ;
- breach ;
- pass ;
- Performance ;
- payout ;
- dispute.

### 22.7 Visual et accessibilité

- mobile ;
- desktop ;
- themes ;
- keyboard ;
- screen reader ;
- zoom ;
- reduced motion.

---

## 23. Commandes standards

Le dépôt doit exposer :

```bash
pnpm dev
pnpm build
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:rls
pnpm test:visual
pnpm db:start
pnpm db:reset
pnpm db:test
pnpm ci
```

`pnpm ci` doit être invoqué comme `pnpm run ci` — pnpm réserve `ci` comme commande interne (équivalent de `npm ci`) et ignore silencieusement le script du même nom sans le préfixe `run`.

Ne pas inventer des commandes concurrentes sans raison.

---

## 24. Git et branches

Branche principale :

```text
main
```

Branches autorisées :

```text
feat/*
fix/*
refactor/*
security/*
docs/*
chore/*
```

Pas de branche `develop`.

Aucun agent ne pousse directement sur `main`.

Aucun agent ne fusionne sa propre PR.

---

## 25. Commits

Conventional commits :

```text
feat:
fix:
refactor:
test:
docs:
chore:
security:
perf:
ci:
```

Interdits :

- `update stuff` ;
- commits géants non cohérents ;
- code cassé sur main ;
- secrets ;
- fichiers build inutiles.

---

## 26. Pull Requests

Chaque PR contient :

- objectif ;
- scope ;
- documents appliqués ;
- décisions ;
- tests ;
- captures si UI ;
- migrations ;
- risques ;
- rollback ;
- agent utilisé.

Une PR ne doit pas mélanger plusieurs milestones majeurs.

---

## 27. CI/CD

### 27.1 PR

```text
install
→ format
→ lint
→ typecheck
→ unit
→ build
→ migrations/RLS
→ integration
→ E2E ciblés
```

### 27.2 Main

```text
merge
→ immutable build
→ staging
→ smoke
→ E2E
```

### 27.3 Production

Manuelle uniquement :

```text
approval
→ backup
→ migration
→ deploy
→ smoke
→ monitor
```

---

## 28. Environnements

```text
local
preview
staging
production
```

Isolation obligatoire :

- base ;
- secrets ;
- providers ;
- storage ;
- URLs.

Aucune donnée production en preview/staging.

---

## 29. Observabilité

### 29.1 Logs

JSON structurés avec :

- timestamp ;
- level ;
- service ;
- module ;
- event ;
- correlationId ;
- accountId ;
- duration ;
- errorCode.

### 29.2 Interdits dans les logs

- password ;
- token ;
- secret ;
- KYC brut ;
- card data ;
- payload sensible.

### 29.3 Metrics critiques

- Web latency ;
- WebSocket ;
- tick lag ;
- order latency ;
- rejects ;
- queue depth ;
- payout age ;
- payment webhook failures ;
- ledger mismatch ;
- reserve coverage.

---

## 30. Incidents et kill switches

Kill switches prévus :

```text
trading.global.close_only
trading.symbol.{id}.paused
payments.new_orders.disabled
payouts.requests.disabled
product.{5k|10k|25k|50k|100k}.disabled
platform.maintenance
```

Chaque activation exige :

- permission ;
- raison ;
- timestamp ;
- durée ;
- audit.

---

## 31. Definition of Ready

Une tâche est prête si :

- objectif clair ;
- source de vérité identifiée ;
- règles connues ;
- UX définie ;
- architecture définie ;
- critères d’acceptation ;
- tests ;
- risques ;
- décisions ouvertes signalées.

---

## 32. Definition of Done

Une tâche est terminée lorsque :

1. code implémenté ;
2. typecheck vert ;
3. lint vert ;
4. tests verts ;
5. build vert ;
6. permissions vérifiées ;
7. erreurs couvertes ;
8. loading/empty/offline couverts ;
9. mobile vérifié ;
10. accessibilité critique vérifiée ;
11. audit ajouté si sensible ;
12. metrics ajoutées si requises ;
13. docs mises à jour ;
14. migrations testées ;
15. PR relue ;
16. CI verte ;
17. aucune règle improvisée ;
18. preuve fournie.

---

## 33. Scope V1 strict

Inclus :

- WARIBA ONE ;
- Performance ;
- Review ;
- cinq instruments ;
- market orders ;
- web/PWA ;
- sandbox ;
- Hub ;
- Trade ;
- payout sandbox ;
- Control ;
- support.

Différé :

- capital réel ;
- paiement réel initial ;
- payout réel initial ;
- app native ;
- futures ;
- crypto ;
- copy trading ;
- affiliation publique ;
- Academy complète ;
- community ;
- leaderboard ;
- public API ;
- EA ;
- bots ;
- Live allocation.

---

## 34. Séquence de construction

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

Ne pas réordonner cette séquence sans Decision Log.

---

## 35. Règle de changement

Toute modification significative de :

- stack ;
- architecture ;
- règle ;
- prix ;
- cap ;
- policy ;
- payout ;
- provider ;
- produit ;
- scope ;

nécessite :

```text
impact analysis
→ Decision Log
→ documents mis à jour
→ tests
→ nouvelle version si nécessaire
→ implémentation
```

---

## 36. Checklist agent avant modification

- [ ] Bonne branche.
- [ ] `git status` compris.
- [ ] Documents lus.
- [ ] Scope compris.
- [ ] Aucun conflit non résolu.
- [ ] Plan prêt.
- [ ] Migrations identifiées.
- [ ] Tests définis.
- [ ] Risques définis.
- [ ] Aucune règle inventée.
- [ ] Aucun secret.
- [ ] Aucun provider réel prématuré.

---

## 37. Checklist agent avant rapport final

- [ ] Diff inspecté.
- [ ] Tests réellement exécutés.
- [ ] Résultats exacts.
- [ ] Échecs signalés.
- [ ] Aucun test désactivé.
- [ ] Aucun TODO critique.
- [ ] Aucun `any` injustifié.
- [ ] Aucun float financier.
- [ ] Aucune permission affaiblie.
- [ ] Documentation mise à jour.
- [ ] Proposition de PR fournie.
- [ ] Statut honnête.

---

## 38. Verdict attendu

Utiliser uniquement :

```text
PASS
PASS WITH ACTIONS
BLOCKED
```

Ne jamais utiliser `PASS` si :

- un test critique échoue ;
- une migration n’est pas vérifiée ;
- une règle est ambiguë ;
- la CI est rouge ;
- un finding critique reste ouvert ;
- le résultat n’a pas été exécuté ou inspecté.

---

## 39. Principe final

WARIBA doit être construit comme un système financier simulé :

- déterministe ;
- versionné ;
- auditable ;
- sécurisé ;
- testable ;
- mobile ;
- compréhensible ;
- opérable.

La vitesse n’autorise jamais :

- l’improvisation ;
- la perte de précision ;
- la duplication ;
- l’affaiblissement de la sécurité ;
- la dissimulation d’un échec ;
- la transformation du produit en template générique.
