---
title: "WARIBA Engineering Constitution"
version: "1.0"
document_id: "WARIBA-ENGINEERING-CONSTITUTION"
status: "BASELINE D’INGÉNIERIE — OBLIGATOIRE AVANT LE PREMIER COMMIT PRODUIT"
language: "fr-FR"
brand: "WARIBA"
domain: "wariba.app"
market: "Afrique francophone"
owner: "WARIBA Engineering, Product & Security"
source_of_truth_priority: 6
depends_on:
  - "WARIBA Product Master Document v1.0"
  - "WARIBA Program Rulebook v1.0"
  - "WARIBA Financial Model v1.0"
  - "WARIBA UX Architecture v1.0"
  - "WARIBA Design System v1.0"
next_documents:
  - "WARIBA System Architecture v1.0"
  - "WARIBA Security QA Operations Standard v1.0"
  - "WARIBA Build Plan v1.0"
  - "WARIBA Prompt Pack v1.0"
---

# WARIBA Engineering Constitution v1.0

> **Le code sert le produit. Le produit sert les règles. Les règles ne sont jamais improvisées par le code.**

> **Addendum Rules v1.1 — 2026-08-03**
> Les nouvelles policies et symbol spec sets sont publiés en version 1.1 ; une
> policy 1.0 déjà attachée n'est jamais modifiée. Les calculs EOD trailing,
> buffer, Performance Days, caps nets et exposition agrégée demeurent
> server-authoritative. La devise commerciale et de règlement est XOF ; les
> balances, risques et payouts simulés restent comptabilisés en USD décimal.

## Contrôle du document

| Champ | Valeur |
|---|---|
| Marque | WARIBA |
| Domaine | `wariba.app` |
| État réel du projet | Dossier créé, aucun code commencé |
| Dépôt | GitHub privé `wariba-platform` |
| Agents IA autorisés | Codex, Claude Code ou tout autre agent IA explicitement mandaté |
| Rôles autorisés | Construction, modification, audit et documentation — voir AI-015 |
| Architecture | Modular monolith |
| Frontend | Next.js + React + TypeScript strict |
| Backend | Node.js + Fastify ou intégration serveur équivalente validée |
| Base | PostgreSQL / Supabase |
| Auth | Supabase Auth |
| Temps réel | WebSocket |
| Charting | Lightweight Charts |
| Package manager | pnpm via Corepack |
| CI | GitHub Actions |
| Déploiement production | Approbation manuelle |
| Application native | Non en V1 |
| Capital réel | Non en V1 |
| Statut | Baseline obligatoire avant le premier commit produit |

---

# 1. Objet de la Constitution

Cette Constitution définit les règles permanentes de construction de WARIBA.

Elle impose :

1. la qualité minimale du code ;
2. la séparation des responsabilités ;
3. les conventions TypeScript ;
4. la gestion des valeurs financières ;
5. la gestion du temps ;
6. les règles de base de données ;
7. les règles API et temps réel ;
8. la sécurité ;
9. les tests ;
10. Git et GitHub ;
11. CI/CD ;
12. les environnements ;
13. l’observabilité ;
14. l’usage des agents IA ;
15. la documentation ;
16. les critères de fusion ;
17. la Definition of Done.

Elle s’applique :

- à tout agent IA explicitement mandaté, notamment Codex et Claude Code ;
- aux développeurs humains ;
- aux scripts ;
- aux migrations ;
- aux workers ;
- au frontend ;
- au backend ;
- aux tests ;
- aux pipelines ;
- aux outils internes.

---

# 2. Hiérarchie des sources de vérité

En cas de contradiction :

1. lois et obligations applicables ;
2. conditions contractuelles acceptées ;
3. policy version attachée au compte ;
4. WARIBA Program Rulebook ;
5. WARIBA Financial Model ;
6. WARIBA Product Master Document ;
7. WARIBA UX Architecture ;
8. WARIBA Design System ;
9. WARIBA Engineering Constitution ;
10. WARIBA System Architecture ;
11. Security / QA / Operations Standard ;
12. Build Plan ;
13. prompt actif ;
14. code ;
15. commentaire de code.

Un prompt ne peut pas modifier les documents supérieurs.

Un test incorrect ne peut pas légitimer une règle incorrecte.

Une interface ne peut pas devenir source de vérité métier.

---

# 3. Principes d’ingénierie non négociables

## 3.1 Server authoritative

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
- permissions ;
- paiement confirmé ;
- état des comptes.

Le client peut afficher et proposer une action. Il ne décide jamais le résultat.

## 3.2 Policies versionnées

Chaque compte actif référence une policy version immuable.

Aucun changement de règle ne s’applique rétroactivement sans base contractuelle explicite.

## 3.3 Précision financière

Aucun calcul monétaire critique en float binaire natif.

## 3.4 Idempotence

Toute action sensible doit être rejouable sans duplication.

## 3.5 Audit append-only

Toute action sensible laisse une trace immuable.

## 3.6 Séparation des domaines

Un module ne lit pas librement les tables internes d’un autre module.

## 3.7 Simplicité architecturale

WARIBA commence comme modular monolith.

Pas de microservices prématurés.

## 3.8 Tests orientés risque

La priorité est donnée aux invariants financiers, états et permissions.

## 3.9 Sécurité par défaut

L’absence de permission équivaut à un refus.

## 3.10 Échec explicite

Aucun fallback silencieux ne fabrique une valeur métier.

---

# 4. Décisions technologiques de base

## 4.1 Runtime

- Node.js 24 LTS, conformément à ENG-027 ;
- version épinglée dans le dépôt ;
- même version en local, CI, staging et production.

## 4.2 Package manager

- pnpm ;
- activation via Corepack ;
- lockfile obligatoire ;
- aucune installation avec npm ou yarn dans le dépôt.

## 4.3 Langage

- TypeScript strict partout ;
- JavaScript autorisé uniquement pour configuration justifiée ;
- aucun fichier métier critique en JavaScript non typé.

## 4.4 Frontend

- Next.js ;
- React ;
- rendu serveur lorsque pertinent ;
- composants client uniquement lorsque nécessaire ;
- aucune dépendance au navigateur pour une règle métier.

## 4.5 Backend

- Node.js ;
- Fastify pour les services HTTP/temps réel lorsqu’un serveur séparé est requis ;
- modular monolith ;
- workers internes idempotents.

## 4.6 Base et auth

- PostgreSQL ;
- Supabase pour base, Auth et Storage selon architecture validée ;
- RLS obligatoire pour données utilisateur ;
- service role uniquement côté serveur.

## 4.7 Temps réel

- WebSocket ;
- messages versionnés ;
- reconnexion ;
- séquençage ;
- heartbeat ;
- resynchronisation serveur.

## 4.8 Graphique

- Lightweight Charts ;
- aucune dépendance à TradingView Charting Library sans licence explicite ;
- données fournies par adapter.

## 4.9 Validation

- Zod ou équivalent validé ;
- validation aux frontières ;
- schémas partagés contrôlés.

## 4.10 Décimales

- Decimal.js ou équivalent validé côté TypeScript ;
- PostgreSQL `numeric` côté base ;
- unités entières lorsque pertinentes.

## 4.11 Tests

- Vitest ou runner TypeScript équivalent ;
- Playwright pour E2E ;
- outils property-based validés ;
- tests SQL/RLS.

## 4.12 Observabilité

- logs structurés ;
- Sentry ou équivalent ;
- analytics produit séparé des logs techniques ;
- correlation ID.

## 4.13 Versions

Les versions exactes seront choisies au Master Prompt Foundation :

- stable ;
- compatibles ;
- épinglées ;
- documentées ;
- sans dépendance expérimentale critique.

---

# 5. Structure de dépôt recommandée

```text
wariba-platform/
├── apps/
│   └── web/
│       ├── app/
│       ├── public/
│       └── tests/
├── services/
│   ├── realtime/
│   └── workers/
├── packages/
│   ├── design-tokens/
│   ├── ui/
│   ├── domain/
│   ├── policies/
│   ├── database/
│   ├── validation/
│   ├── observability/
│   ├── config/
│   └── test-utils/
├── supabase/
│   ├── migrations/
│   ├── seed/
│   ├── tests/
│   └── config.toml
├── docs/
│   ├── 00-decisions/
│   ├── 01-product/
│   ├── 02-program/
│   ├── 03-finance/
│   ├── 04-ux/
│   ├── 05-design/
│   ├── 06-engineering/
│   ├── 07-assurance/
│   ├── 08-delivery/
│   └── 09-prompts/
├── .github/
│   ├── workflows/
│   ├── pull_request_template.md
│   └── CODEOWNERS
├── scripts/
├── tooling/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .editorconfig
├── .env.example
└── README.md
```

Le System Architecture Document précisera les frontières finales.

---

# 6. Modular monolith

## 6.1 Définition

WARIBA utilise une base de code cohérente avec des modules métier isolés.

Modules initiaux :

1. identity ;
2. commerce ;
3. trading ;
4. policy-risk ;
5. performance-payout ;
6. support ;
7. operations.

## 6.2 Règle d’accès

Un module expose :

- services publics ;
- commandes ;
- queries ;
- événements ;
- DTO.

Il n’expose pas directement :

- repository interne ;
- tables ;
- modèle ORM brut ;
- secrets de calcul.

## 6.3 Interdiction

Le module `support` ne peut pas :

- modifier une balance ;
- écrire une violation ;
- approuver un payout.

Le module `commerce` ne peut pas :

- créer un compte avant confirmation serveur ;
- modifier les règles.

Le module `trading` ne décide pas seul :

- du passage ;
- du payout.

---

# 7. Couches d’un module

Structure recommandée :

```text
module/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── policies/
│   ├── events/
│   └── errors/
├── application/
│   ├── commands/
│   ├── queries/
│   ├── services/
│   └── ports/
├── infrastructure/
│   ├── repositories/
│   ├── adapters/
│   └── persistence/
└── presentation/
    ├── http/
    ├── websocket/
    └── mappers/
```

## 7.1 Domain

Ne dépend pas de :

- Next.js ;
- Supabase client ;
- Fastify ;
- React ;
- API externe.

## 7.2 Application

Orchestre le domaine.

## 7.3 Infrastructure

Implémente les ports.

## 7.4 Presentation

Traduit HTTP/WebSocket en commandes et réponses.

---

# 8. Règles TypeScript

## 8.1 Configuration minimale

```json
{
  "compilerOptions": {
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
}
```

## 8.2 Interdictions

- `any` non justifié ;
- `@ts-ignore` sans ticket ;
- assertions de type pour cacher une erreur ;
- `as unknown as` ;
- enum numérique implicite ;
- valeur externe non validée ;
- JSON non typé ;
- propriété optionnelle utilisée sans vérification ;
- catch silencieux ;
- promesse non attendue ;
- import circulaire.

## 8.3 `unknown`

Toute donnée externe commence en `unknown`.

Elle devient typée après validation.

## 8.4 Unions discriminées

Utiliser pour :

- états d’ordre ;
- état compte ;
- payout ;
- résultat d’opération ;
- messages WebSocket.

## 8.5 Exhaustivité

Les switches métier doivent être exhaustifs.

```ts
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
```

---

# 9. Nommage

## 9.1 Code

- variables : `camelCase` ;
- types/classes : `PascalCase` ;
- constantes globales : `SCREAMING_SNAKE_CASE` ;
- fichiers : `kebab-case` ;
- tables : `snake_case` ;
- événements : `domain.action` ;
- codes erreur : `DOMAIN_REASON`.

## 9.2 Métier

Utiliser les termes du Rulebook :

- `dailyLossLimit` ;
- `maximumLossFloor` ;
- `consistencyRatio` ;
- `qualifiedDay` ;
- `payoutBase` ;
- `traderCash` ;
- `policyVersion`.

Interdit :

- `magicLimit` ;
- `fundedMoney` ;
- `winAmount` ;
- `gameState`.

## 9.3 Booléens

Préfixes :

- `is` ;
- `has` ;
- `can` ;
- `should`.

Pas de paramètres booléens ambigus :

```ts
processAccount(accountId, true, false);
```

Préférer :

```ts
processAccount({
  accountId,
  freezeTrading: true,
  notifyTrader: false
});
```

---

# 10. Fonctions et classes

## 10.1 Responsabilité

Une fonction accomplit une responsabilité claire.

## 10.2 Taille

Aucune limite arbitraire de lignes, mais une fonction trop longue doit être justifiée.

## 10.3 Effets

Les effets doivent être visibles dans le nom ou la couche.

## 10.4 Pureté

Les formules financières doivent être des fonctions pures lorsque possible.

## 10.5 Paramètres

Préférer un objet à plus de trois paramètres liés.

## 10.6 Retour

Pas de retour ambigu `null | false | object`.

Utiliser un résultat typé.

---

# 11. Gestion des erreurs

## 11.1 Erreur domaine

Contient :

- code stable ;
- message interne ;
- message utilisateur ;
- contexte ;
- gravité ;
- retryable ;
- cause ;
- correlation ID.

## 11.2 Pas d’erreurs génériques

Interdit :

```ts
throw new Error("Something went wrong");
```

Préférer :

```ts
throw new DomainError({
  code: "RISK_DAILY_LOSS_LOCK",
  userMessage: "Votre limite de perte quotidienne est atteinte.",
  retryable: false
});
```

## 11.3 Mapping

Les erreurs domaine sont mappées vers :

- HTTP ;
- WebSocket ;
- UI ;
- logs.

## 11.4 Données sensibles

Aucune stack trace ou donnée interne dans la réponse utilisateur.

---

# 12. Résultats d’opération

Structure recommandée :

```ts
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

Utiliser pour les erreurs attendues.

Les exceptions sont réservées aux situations réellement exceptionnelles.

---

# 13. Valeurs financières

## 13.1 Interdiction des floats

Interdit :

```ts
const payout = profit * 0.5;
```

si `profit` est un `number`.

## 13.2 Types

Créer des value objects :

- Money ;
- Price ;
- Quantity ;
- Percentage ;
- ExchangeRate ;
- PnL ;
- Balance ;
- Equity.

## 13.3 Représentation

- FCFA : unité entière ;
- USD : decimal explicite ;
- prix instrument : decimal selon précision ;
- pourcentages : chaînes décimales ou Decimal.

## 13.4 Arrondis

Chaque calcul définit :

- précision ;
- mode ;
- moment ;
- devise ;
- source.

Aucun arrondi implicite via `toFixed()` comme logique métier.

## 13.5 Sérialisation

Les décimales sont sérialisées en chaînes.

Exemple :

```json
{
  "amount": "160.00",
  "currency": "USD"
}
```

---

# 14. Temps et dates

## 14.1 UTC

Stocker tous les timestamps en UTC.

## 14.2 Types

Distinguer :

- instant ;
- date civile ;
- timezone ;
- durée ;
- session marché.

## 14.3 Reset

Le reset WARIBA V1 est défini par policy.

L’interface ne calcule pas seule le prochain reset.

## 14.4 Horloge injectable

Les services métier utilisent une interface `Clock`.

Les tests injectent une horloge déterministe.

## 14.5 Interdictions

- `new Date()` dispersé dans le domaine ;
- timezone locale du serveur ;
- comparaison de dates en texte ;
- moment implicite.

---

# 15. Identifiants

## 15.1 Types

Utiliser UUID ou ULID selon décision architecture.

## 15.2 Branded types

```ts
type AccountId = Brand<string, "AccountId">;
type PayoutId = Brand<string, "PayoutId">;
```

## 15.3 Public IDs

Les identifiants affichés peuvent être distincts des clés internes.

## 15.4 Sécurité

Aucune autorisation fondée sur l’impossibilité de deviner un ID.

---

# 16. États et state machines

## 16.1 États explicites

Chaque transition importante est validée.

## 16.2 Pas d’état implicite

Interdit de déduire un état à partir de plusieurs booléens :

```ts
isPaid
isFrozen
isApproved
isRejected
```

Préférer :

```ts
status: "human_review"
```

## 16.3 Transitions

Chaque transition contient :

- état source ;
- état cible ;
- commande ;
- acteur ;
- timestamp ;
- raison ;
- policy ;
- audit.

## 16.4 Invalid transition

Une transition interdite échoue explicitement.

---

# 17. Policy Engine

## 17.1 Immutabilité

Une policy publiée n’est jamais modifiée.

## 17.2 Référence

Chaque compte conserve :

- policy version ID ;
- hash ;
- paramètres ;
- texte accepté ;
- locale ;
- timestamp.

## 17.3 Chargement

Le domaine reçoit la policy explicitement.

Pas de constante globale cachée.

## 17.4 Cache

Un cache ne peut jamais changer la policy applicable.

## 17.5 Comparaison

Les tests doivent comparer :

- texte Rulebook ;
- JSON ;
- seed ;
- résultats.

---

# 18. Base de données

## 18.1 PostgreSQL comme source durable

Les données critiques ne dépendent pas uniquement d’un cache.

## 18.2 Types

- `numeric` pour valeurs financières ;
- `timestamptz` pour instants ;
- contraintes CHECK ;
- enums DB limités ;
- JSONB uniquement pour données réellement flexibles.

## 18.3 Foreign keys

Obligatoires lorsque la relation est durable.

## 18.4 Index

Chaque index doit répondre à un usage.

## 18.5 Transactions

Les opérations multi-écritures critiques utilisent une transaction.

## 18.6 Suppression

Pas de suppression physique :

- trades ;
- fills ;
- violations ;
- payouts ;
- paiements ;
- audit.

## 18.7 Balance

Aucune colonne de balance éditée manuellement depuis Control.

Les corrections utilisent des entrées d’ajustement auditables.

---

# 19. Migrations

## 19.1 Immuabilité

Une migration appliquée n’est jamais modifiée.

## 19.2 Nouvelle migration

Toute correction crée une nouvelle migration.

## 19.3 Revue

Chaque migration inclut :

- objectif ;
- impact ;
- rollback ou stratégie compensatoire ;
- risques ;
- indexes ;
- RLS ;
- données existantes.

## 19.4 Production

Application :

1. backup ;
2. staging ;
3. validation ;
4. approbation ;
5. production ;
6. contrôle.

## 19.5 Destructive change

Utiliser expand-and-contract.

Pas de suppression immédiate d’une colonne utilisée.

---

# 20. Supabase et RLS

## 20.1 RLS obligatoire

Chaque table utilisateur privée possède des policies.

## 20.2 Tests

Tester :

- propriétaire ;
- autre utilisateur ;
- support ;
- risk ;
- finance ;
- admin technique ;
- service role.

## 20.3 Service role

- serveur uniquement ;
- jamais navigateur ;
- jamais log ;
- rotation possible.

## 20.4 Storage

Buckets privés pour :

- KYC ;
- pièces support ;
- documents internes.

Signed URLs courtes.

---

# 21. Authentification

## 21.1 Source

Supabase Auth selon architecture.

## 21.2 Session

- validation serveur ;
- cookies sécurisés ;
- expiration ;
- refresh ;
- révocation ;
- device metadata.

## 21.3 Admin

MFA obligatoire avant production.

## 21.4 Autorisation

AuthN et AuthZ sont séparées.

Être connecté ne donne aucun droit métier.

---

# 22. RBAC et permissions

## 22.1 Rôles initiaux

- trader ;
- support ;
- risk ;
- finance ;
- integrity ;
- technical ;
- administrator.

## 22.2 Permissions fines

Exemples :

- `payout.read` ;
- `payout.review` ;
- `payout.approve` ;
- `payout.second_approve` ;
- `risk.violation.read` ;
- `risk.correction.request` ;
- `support.ticket.update`.

## 22.3 Deny by default

Toute permission non accordée est refusée.

## 22.4 Audit

Chaque action interne sensible enregistre le rôle et la permission utilisés.

---

# 23. API HTTP

## 23.1 Principes

- versionnée ;
- JSON ;
- validation ;
- erreurs stables ;
- pagination ;
- idempotence ;
- auth serveur ;
- rate limit.

## 23.2 Version

```text
/api/v1/
```

## 23.3 DTO

Les DTO ne sont pas les entités domaine.

## 23.4 Pagination

Cursor-based pour événements et historiques.

## 23.5 Idempotency key

Obligatoire pour :

- checkout ;
- paiement ;
- activation ;
- order submit ;
- close all ;
- payout request ;
- payout approval ;
- transfer.

## 23.6 Réponses

Inclure :

- data ;
- error ;
- meta ;
- correlation ID.

---

# 24. WebSocket

## 24.1 Connexion

- authentifiée ;
- heartbeat ;
- timeout ;
- reconnexion ;
- abonnement explicite.

## 24.2 Messages

Chaque message contient :

- type ;
- version ;
- sequence ;
- occurredAt ;
- payload ;
- correlationId.

## 24.3 Séquençage

Le client détecte les trous.

## 24.4 Resync

Après reconnexion :

- snapshot serveur ;
- événements depuis dernier sequence ;
- déduplication.

## 24.5 Interdiction

Le client ne reconstruit pas la balance à partir de ticks seuls.

---

# 25. Market Data Adapter

## 25.1 Interface

Le domaine ne dépend pas d’un fournisseur concret.

## 25.2 Sandbox

- seed déterministe ;
- replay ;
- bid/ask ;
- timestamp ;
- spread ;
- market status.

## 25.3 Stale price

Le serveur décide si un prix est périmé.

## 25.4 Données réelles

Aucune intégration publique sans licence commerciale.

## 25.5 Incident

Le marché peut passer :

- normal ;
- close-only ;
- paused ;
- maintenance.

## 25.6 Contrat WX2

Le contrat canonique de barres couvre `1m`, `3m`, `5m`, `15m`, `30m`, `1h`,
`4h`, `1D`, `1W`, `1M`. L'identité de source et ses capacités sont explicites.
Les bougies observées sont upsertées de façon idempotente dans PostgreSQL ; les
ticks UI ne sont pas conservés indéfiniment. Les frontières des bougies
dérivées `1D`/`1W`/`1M` sont UTC et déterministes.

Le client fusionne historique et temps réel par clé canonique et watermark de
séquence. Un changement de source, une régression de watermark, un gap ou une
réponse périmée échoue fermé vers un resync. Une capability absente ne peut pas
être émulée par le client. Les tables de cache restent privées au serveur, RLS
activée, sans droit direct `anon` ou `authenticated`.

---

# 26. Trading Engine

## 26.1 Responsabilité

- réception ordre ;
- validation ;
- fill ;
- position ;
- PnL ;
- historique.

## 26.2 Ne gère pas

- payout ;
- paiement ;
- contenu ;
- KYC ;
- marketing.

## 26.3 Ordre

Une commande doit inclure :

- account ID ;
- symbol ;
- side ;
- quantity ;
- order type ;
- SL/TP ;
- idempotency key ;
- client timestamp informatif.

## 26.4 Prix

Le prix serveur prévaut.

## 26.5 Replay

Un fill doit être explicable.

---

# 27. Risk Engine

## 27.1 Pureté

Les formules doivent être isolées et testables.

## 27.2 Entrées

- account snapshot ;
- positions ;
- prices ;
- trades ;
- policy ;
- clock.

## 27.3 Sorties

- risk snapshot ;
- status ;
- warnings ;
- violations ;
- eligibility facts.

## 27.4 Frontend

Le frontend ne recalcule pas comme autorité.

## 27.5 Consistance

Supérieure à 40 % :

- statut non conforme ;
- jamais hard breach.

---

# 28. Payout Engine

## 28.1 Responsabilité

- éligibilité ;
- snapshot cycle ;
- Payout Base ;
- split ;
- status ;
- cycle suivant.

## 28.2 Ne transfère pas directement

Le transfert passe par Payment/Payout Adapter.

## 28.3 Gel

La demande valide gèle le compte.

## 28.4 Double demande

Impossible par contrainte et idempotence.

## 28.5 Réserve

La réserve n’altère pas rétroactivement le montant contractuel.

---

# 29. Payment Adapter

## 29.1 Sandbox d’abord

Aucun PSP réel dans la première vertical slice.

## 29.2 Webhook

- signature ;
- timestamp ;
- replay protection ;
- idempotence ;
- amount ;
- currency ;
- status.

## 29.3 Browser return

Jamais source de vérité.

## 29.4 Réconciliation

Chaque paiement et payout possède une référence provider.

---

# 30. Événements de domaine

## 30.1 Usage

Les événements découplent les modules sans microservices.

## 30.2 Outbox transactionnelle

Écriture métier et outbox dans la même transaction.

## 30.3 Worker

- idempotent ;
- retry ;
- dead-letter ;
- métriques.

## 30.4 Événements passés

Un événement publié n’est pas modifié.

## 30.5 Schema version

Chaque événement possède une version.

---

# 31. Idempotence

## 31.1 Clé

La clé est attachée à :

- acteur ;
- opération ;
- ressource ;
- durée.

## 31.2 Réponse

Un retry retourne le résultat original.

## 31.3 Contrainte

La base possède une contrainte unique lorsque possible.

## 31.4 Cas critiques

- paiement confirmé deux fois ;
- activation rejouée ;
- ordre soumis deux fois ;
- payout demandé deux fois ;
- payout webhook rejoué ;
- worker redémarré.

---

# 32. Audit Ledger

## 32.1 Append-only

Aucune mise à jour destructive.

## 32.2 Contenu

- actor ;
- role ;
- action ;
- target ;
- before ;
- after ;
- reason ;
- source ;
- correlation ID ;
- occurredAt.

## 32.3 Données sensibles

Masquer ou hacher lorsque nécessaire.

## 32.4 Export

Les preuves utilisateur utilisent une vue contrôlée, pas le ledger brut.

---

# 33. Frontend architecture

## 33.1 App Router

Organisation par route groups :

```text
app/
├── (public)/
├── (auth)/
├── (platform)/
├── (trade)/
└── (control)/
```

## 33.2 Server Components

Par défaut lorsque possible.

## 33.3 Client Components

Uniquement pour :

- interaction ;
- WebSocket ;
- chart ;
- formulaires dynamiques ;
- browser APIs.

## 33.4 Data fetching

- serveur pour données initiales ;
- client pour temps réel ;
- cache explicite ;
- invalidation explicite.

## 33.5 Business logic

Aucune formule métier dans composants ou hooks UI.

---

# 34. Design System en code

## 34.1 Tokens

Une seule source :

```text
packages/design-tokens
```

## 34.2 UI

```text
packages/ui
```

## 34.3 Interdiction

Pas de couleur hex dispersée dans les composants.

Pas de spacing arbitraire.

Pas de nouveau composant générique si un composant officiel existe.

## 34.4 WARIBA components

Les composants propriétaires sont implémentés après les primitives.

---

# 35. CSS

## 35.1 Approche

Choix final dans System Architecture, avec conditions :

- tokens centralisés ;
- classes prévisibles ;
- thèmes ;
- pas de CSS runtime lourd dans Trade ;
- pas de style inline arbitraire.

## 35.2 Tailwind

Autorisé uniquement si :

- configuré depuis tokens ;
- aucune palette générique utilisée directement ;
- aucune classe arbitraire répétée ;
- extraction en composants ;
- pas de template visuel générique.

## 35.3 Interdictions

- `style={{ color: "#3157F5" }}` ;
- valeurs magic ;
- `!important` non justifié ;
- z-index arbitraire.

---

# 36. React

## 36.1 Composants

- responsabilité unique ;
- props explicites ;
- pas de prop drilling extrême ;
- aucune requête dans composant de présentation pur.

## 36.2 Hooks

Un hook :

- a un but clair ;
- ne cache pas une mutation critique ;
- expose loading/error/data ;
- respecte cancellation.

## 36.3 État

- local pour UI locale ;
- serveur pour données serveur ;
- global uniquement pour contexte réel.

## 36.4 Pas de store universel

Ne pas copier toute la base dans un store frontend.

---

# 37. Formulaires

## 37.1 Validation

- schéma partagé ;
- validation client pour UX ;
- validation serveur obligatoire.

## 37.2 Soumission

- bouton loading ;
- double submit empêché ;
- erreur récupérable ;
- idempotency key.

## 37.3 Données sensibles

Aucune valeur sensible en log analytics.

---

# 38. Accessibilité

## 38.1 Standard

WCAG 2.2 AA.

## 38.2 CI

Inclure des tests automatisés de base.

## 38.3 Manuel

Tester clavier et lecteur d’écran sur parcours critiques.

## 38.4 Focus

Aucun focus supprimé.

## 38.5 Trading

Actions sensibles ne reposent pas sur hover.

---

# 39. Internationalisation

## 39.1 V1

Français.

## 39.2 Strings

Aucune string produit codée profondément dans logique métier.

## 39.3 Formats

- dates ;
- nombres ;
- devises ;
- pluriels.

## 39.4 Rulebook

Les noms de règles ont des codes stables indépendants de la traduction.

---

# 40. Performance

## 40.1 Budgets

À définir dans le Standard QA, avec principes :

- JavaScript minimal ;
- lazy loading ;
- chart isolé ;
- pas de re-render prix global ;
- listes virtualisées si nécessaire ;
- images optimisées.

## 40.2 Trade

Le flux de prix ne doit pas rerender toute l’application.

## 40.3 WebSocket

Backpressure et batching contrôlés.

## 40.4 Mesure

Performance observée, pas supposée.

---

# 41. Logging

## 41.1 Structuré

JSON en serveur.

## 41.2 Champs

- timestamp ;
- level ;
- service ;
- module ;
- event ;
- correlationId ;
- userId haché si nécessaire ;
- accountId ;
- duration ;
- errorCode.

## 41.3 Interdits

- mot de passe ;
- token ;
- secret ;
- document KYC ;
- numéro complet ;
- payload brut sensible.

## 41.4 Niveaux

- debug ;
- info ;
- warn ;
- error ;
- fatal.

---

# 42. Observabilité

## 42.1 Traces

Actions critiques :

- payment → account ;
- order → fill ;
- risk calculation ;
- pass → Performance ;
- payout request → paid.

## 42.2 Metrics

- latency ;
- error rate ;
- queue depth ;
- retry ;
- stale price ;
- WebSocket connections ;
- payout age ;
- reserve coverage.

## 42.3 Alerts

Alertes actionnables seulement.

## 42.4 Correlation

Même correlation ID à travers API, worker, DB et provider.

---

# 43. Secrets

## 43.1 Stockage

- variables d’environnement sécurisées ;
- secret manager provider ;
- jamais dépôt.

## 43.2 `.env.example`

Contient noms, jamais valeurs.

## 43.3 Rotation

Procédure prévue.

## 43.4 CI

Secret scanning obligatoire.

## 43.5 Agent IA

Aucun secret réel dans un prompt.

---

# 44. Dépendances

## 44.1 Critères

Avant ajout :

- besoin ;
- maintenance ;
- licence ;
- sécurité ;
- poids ;
- alternative native ;
- lock-in.

## 44.2 Interdiction

Pas de package pour une fonction triviale.

## 44.3 Versions

Épinglées via lockfile.

## 44.4 Audit

Automatisé en CI.

## 44.5 Mise à jour

PR dédiées, tests et changelog.

---

# 45. Git

## 45.1 Dépôt

GitHub privé.

## 45.2 Branche principale

`main`.

Toujours :

- compilable ;
- testée ;
- déployable.

## 45.3 Branches

```text
feat/*
fix/*
refactor/*
security/*
docs/*
chore/*
```

## 45.4 Pas de `develop`

Inutile en petite équipe.

## 45.5 Branches courtes

Fusion fréquente.

---

# 46. Commits

## 46.1 Conventional commits

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

## 46.2 Qualité

Un commit représente une intention cohérente.

## 46.3 Interdictions

- `update stuff` ;
- commit géant non explicable ;
- secret ;
- fichier build inutile ;
- code cassé volontairement sur main.

---

# 47. Pull Requests

## 47.1 Obligatoires

Les modifications substantielles passent par PR.

## 47.2 Description

- objectif ;
- décisions ;
- captures ;
- tests ;
- risques ;
- migrations ;
- rollback ;
- documents affectés.

## 47.3 Taille

Petite autant que possible.

## 47.4 Review

Même seul, utiliser la PR pour inspecter le diff.

## 47.5 AI

La PR indique l’agent utilisé.

---

# 48. Protection de `main`

Configurer :

- pas de force push ;
- pas de suppression ;
- CI obligatoire ;
- conversation résolue ;
- review requise lorsque possible ;
- signature ou provenance ;
- status checks.

Aucun agent ne pousse directement sur `main`.

---

# 49. CI GitHub Actions

## 49.1 Fondation

À chaque PR :

1. checkout ;
2. setup Node ;
3. setup pnpm ;
4. installation frozen lockfile ;
5. format check ;
6. lint ;
7. typecheck ;
8. unit tests ;
9. build.

## 49.2 Base

Après intégration Supabase :

- migration validation ;
- SQL tests ;
- RLS tests ;
- generated types diff ;
- seed validation.

## 49.3 Domaine

- trading tests ;
- risk tests ;
- payout tests ;
- property-based tests.

## 49.4 App

- integration tests ;
- accessibility smoke ;
- Playwright critique ;
- visual regression ciblée.

## 49.5 Sécurité

- secret scan ;
- dependency audit ;
- static analysis ;
- permissions workflow minimales.

---

# 50. CI matrice

Éviter les matrices excessives.

Tester :

- runtime supporté ;
- environnement principal ;
- navigateur critique E2E.

L’objectif est la confiance, pas un pipeline spectaculaire.

## 50.1 Boucles de validation

La CI suit cinq tiers explicites : boucle locale rapide, validation feature ciblée, gate PR
parallèle, E2E fonctionnel complet, puis certification nightly/release. Les sleeps arbitraires
ne sont pas une synchronisation ; les tests realtime enregistrent l'attente et les subscriptions
avant la commande, via le harness partagé. La norme opérationnelle détaillée est
`docs/07-assurance/WARIBA_CI_E2E_Test_Architecture_v1.0.md`.

---

# 51. CD

## 51.1 Environnements

- local ;
- preview ;
- staging ;
- production.

## 51.2 Preview

Automatique par PR pour UI lorsque possible.

## 51.3 Staging

Automatique après fusion sur main.

## 51.4 Production

Manuelle après validation.

## 51.5 Migrations

Pas d’application aveugle automatique en production.

## 51.6 Rollback

Chaque release possède une stratégie.

---

# 52. Environnements

## 52.1 Isolation

Bases et secrets séparés.

## 52.2 Local

- Supabase local ;
- market data sandbox ;
- PSP sandbox ;
- seed déterministe.

## 52.3 Preview

Aucune donnée production.

## 52.4 Staging

Proche production, données test.

## 52.5 Production

Accès limité et audité.

---

# 53. Feature flags

## 53.1 Usage

- tailles commerciales 5K, 10K, 25K, 50K et 100K ;
- nouvelle fonction ;
- rollout limité ;
- incident ;
- beta group.

## 53.2 Pas de règle cachée

Une feature flag ne modifie pas silencieusement la policy d’un compte actif.

## 53.3 Audit

Les changements sensibles sont audités.

## 53.4 Safe default

Flag inconnue = off.

Pour la bêta sandbox régie par OFFER-023, les cinq flags commerciaux connus sont activés. Cette configuration n’autorise pas une vente publique et peut être coupée indépendamment par taille.

---

# 54. Configuration

## 54.1 Séparation

Configuration runtime distincte du code.

## 54.2 Validation

Au démarrage.

## 54.3 Échec

Application refuse de démarrer si configuration critique invalide.

## 54.4 Pas de valeurs magiques

Les paramètres métier viennent de policies versionnées.

---

# 55. Tests — pyramide adaptée

## 55.1 Unitaires

Priorité :

- formules ;
- value objects ;
- transitions ;
- validations ;
- mappers.

## 55.2 Property-based

Invariants :

- payout jamais négatif ;
- payout ≤ 50 % ;
- payout ≤ cap ;
- max loss statique ;
- consistance non-breach ;
- aucun double résultat.

## 55.3 Intégration

- DB ;
- RLS ;
- outbox ;
- workers ;
- webhook ;
- Supabase.

## 55.4 E2E

Parcours critiques uniquement.

## 55.5 Visuel

Composants critiques.

---

# 56. Tests déterministes

## 56.1 Clock

Injectée.

## 56.2 Market data

Seedée.

## 56.3 IDs

Générateur injecté si besoin.

## 56.4 Pas de sleep

Éviter les attentes temporelles réelles.

## 56.5 Pas de réseau réel

Tests utilisent adapters sandbox.

---

# 57. Couverture

Aucun objectif marketing du type 100 %.

Obligatoire :

- 100 % des branches critiques de calcul ;
- toutes les transitions sensibles ;
- toutes les permissions critiques ;
- tous les invariants.

La couverture ne remplace pas la qualité.

---

# 58. Test naming

Format :

```text
given_when_then
```

ou phrase comportementale claire.

Exemple :

```text
given_consistency_above_40_when_target_reached_then_account_remains_active
```

---

# 59. Fixtures

## 59.1 Builders

Utiliser des builders typés.

## 59.2 Réalisme

Données cohérentes avec Rulebook.

## 59.3 Aucun partage mutable

Fixtures indépendantes.

## 59.4 PII

Aucune donnée réelle.

---

# 60. Security coding

## 60.1 Validation

Toute entrée non fiable validée.

## 60.2 Injection

Queries paramétrées.

## 60.3 XSS

Échapper et limiter HTML.

## 60.4 CSRF

Protection selon méthode auth.

## 60.5 SSRF

Allowlist pour fetch serveur.

## 60.6 Upload

- type ;
- taille ;
- scan futur ;
- bucket privé ;
- nom généré.

## 60.7 Rate limit

Auth, ordre, paiement, payout, support.

---

# 61. Privacy by design

## 61.1 Minimisation

Collecter seulement nécessaire.

## 61.2 Séparation

KYC séparé des données publiques.

## 61.3 Rétention

Définie avant production.

## 61.4 Analytics

Pas de PII inutile.

## 61.5 Logs

Pseudonymisés.

---

# 62. AI Engineering Rules

## 62.1 Agents IA autorisés

Codex, Claude Code ou tout autre agent IA explicitement mandaté peut construire, modifier, auditer et documenter le code.

## 62.2 Mandat et séparation des rôles

Les rôles ne sont pas exclusifs à un outil. Le mandat précise la tâche et la branche. Un audit déclaré indépendant est réalisé par un agent distinct de l’implémentation auditée.

## 62.3 Un agent, une branche

Jamais deux agents modifiant la même branche simultanément.

## 62.4 Contexte obligatoire

Chaque agent lit :

- Product Master ;
- Rulebook ;
- UX Architecture ;
- Design System ;
- Engineering Constitution ;
- Architecture ;
- prompt actif.

## 62.5 Plan avant code

L’agent :

1. inspecte ;
2. résume ;
3. signale conflits ;
4. propose plan ;
5. implémente ;
6. teste ;
7. audite ;
8. documente.

## 62.6 Interdictions IA

L’agent ne peut pas :

- changer une règle ;
- inventer une API ;
- remplacer la stack ;
- désactiver un test ;
- affaiblir RLS ;
- utiliser `any` pour terminer ;
- prétendre qu’un test a réussi sans l’exécuter ;
- supprimer une migration ;
- introduire un mock en production ;
- modifier le design system implicitement ;
- exposer un secret ;
- pousser sur main.

---

# 63. Fichier d’instructions agent

Le dépôt doit contenir un fichier racine clair, par exemple :

```text
AGENTS.md
```

Il résume :

- sources de vérité ;
- commandes ;
- règles ;
- interdictions ;
- Definition of Done ;
- structure ;
- workflow Git.

Les documents complets restent dans `/docs`.

---

# 64. Commandes standard

Le dépôt doit exposer des commandes stables :

```text
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

`pnpm ci` s'invoque en pratique via `pnpm run ci` : pnpm réserve `ci` comme commande interne et le script du même nom est ignoré silencieusement sans `run`. Voir DECISION_LOG ENG-026.

Une commande ne doit pas avoir un comportement surprenant.

---

# 65. Documentation

## 65.1 README

Contient :

- prérequis ;
- installation ;
- env ;
- démarrage ;
- tests ;
- architecture rapide ;
- liens docs.

## 65.2 ADR / Decision Log

Décisions architecturales significatives documentées.

## 65.3 API

OpenAPI ou documentation générée.

## 65.4 Runbooks

Avant bêta :

- payment incident ;
- market data incident ;
- balance divergence ;
- payout stuck ;
- deployment rollback.

## 65.5 Code comments

Expliquer pourquoi, pas répéter le code.

---

# 66. TODO

Un TODO critique est interdit avant fusion.

Un TODO accepté contient :

- ticket ;
- owner ;
- motif ;
- impact.

Exemple :

```ts
// TODO(WAR-214): replace sandbox provider before public launch.
```

---

# 67. Dead code

- supprimé ;
- pas commenté ;
- pas conservé « au cas où » ;
- historique dans Git.

---

# 68. Feature completion

Une fonctionnalité n’est pas terminée si :

- UI sans backend ;
- backend sans permissions ;
- succès sans erreur ;
- desktop sans mobile ;
- code sans tests ;
- migration sans RLS ;
- action sans audit ;
- état sans loading/error ;
- documentation absente.

---

# 69. Definition of Ready

Une tâche est prête si :

- objectif clair ;
- source de vérité identifiée ;
- règles connues ;
- UX définie ;
- design applicable ;
- dépendances connues ;
- critères d’acceptation ;
- risques ;
- test plan ;
- décisions ouvertes signalées.

---

# 70. Definition of Done

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
12. analytics ajouté si requis ;
13. docs mises à jour ;
14. migrations testées ;
15. PR relue ;
16. CI verte ;
17. aucune décision produit improvisée ;
18. preuve de fonctionnement fournie.

---

# 71. Code Review Checklist

## Produit

- conforme aux documents ;
- pas de scope creep ;
- wording correct.

## Domaine

- règles serveur ;
- Decimal ;
- UTC ;
- idempotence ;
- transitions.

## Base

- contraintes ;
- index ;
- RLS ;
- migration.

## Sécurité

- auth ;
- permission ;
- secrets ;
- rate limit ;
- données sensibles.

## UX

- responsive ;
- accessibilité ;
- erreurs ;
- états ;
- design tokens.

## Tests

- cas normal ;
- edge cases ;
- retry ;
- concurrence ;
- permission.

---

# 72. Concurrence

## 72.1 Optimistic locking

Utiliser version ou contrôle adapté pour ressources modifiables.

## 72.2 DB constraints

La base protège :

- unique payout actif ;
- unique activation ;
- idempotency key ;
- transition valide lorsque possible.

## 72.3 Race conditions

Tester :

- deux payout requests ;
- deux order submits ;
- webhook double ;
- worker parallèle ;
- soft lock pendant ordre.

---

# 73. Transactions

## 73.1 Limites

Transaction courte.

## 73.2 External call

Pas d’appel réseau lent au milieu d’une transaction DB.

## 73.3 Pattern

- écrire intent ;
- commit ;
- outbox ;
- worker provider ;
- update résultat.

---

# 74. Caching

## 74.1 Pas source de vérité

Redis/cache n’est pas obligatoire au départ.

## 74.2 Introduction

Seulement après besoin mesuré.

## 74.3 Invalidation

Explicite.

## 74.4 Policies

Policy immuable peut être cachée avec clé versionnée.

---

# 75. Background jobs

## 75.1 Types

- notifications ;
- outbox ;
- reports ;
- payout provider ;
- cleanup non critique.

## 75.2 Retry

Exponentiel et limité.

## 75.3 Dead letter

Obligatoire pour jobs critiques.

## 75.4 Idempotence

Chaque job.

---

# 76. Notifications

## 76.1 Adapter

Email/in-app via ports.

## 76.2 Pas de logique métier

Échec notification ne modifie pas état financier.

## 76.3 Template

Versionné.

## 76.4 PII

Minimisée.

---

# 77. Analytics

## 77.1 Séparée du domaine

Un échec analytics ne bloque pas un ordre.

## 77.2 Événements

Définis dans UX Architecture.

## 77.3 PII

Exclue.

## 77.4 Naming

Stable et versionné.

---

# 78. Feature flags et expérimentation

## 78.1 Scope

User, cohort, environment.

## 78.2 Trading

Aucune expérimentation non contrôlée sur calculs financiers.

## 78.3 Rules

Les règles utilisent policy versions, pas A/B test invisible.

---

# 79. Déploiements

## 79.1 Artefact immuable

Même artefact promu.

## 79.2 Version

Chaque release possède :

- commit SHA ;
- build ID ;
- migration set ;
- changelog.

## 79.3 Health checks

Avant trafic.

## 79.4 Rollback

Application et DB considérées séparément.

---

# 80. Monitoring de release

Après release :

- errors ;
- latency ;
- order rejects ;
- WebSocket ;
- payment ;
- payout ;
- DB ;
- user reports.

---

# 81. Incidents

## 81.1 Incident mode

Le code supporte :

- normal ;
- close-only ;
- orders paused ;
- maintenance.

## 81.2 Kill switch

Action permissionnée et auditée.

## 81.3 Postmortem

Sans blâme, avec actions.

---

# 82. Branching avec un agent IA

Workflow :

```text
main
  ↓
feat/foundation
  ↓
agent IA mandaté travaille
  ↓
tests locaux
  ↓
push
  ↓
PR
  ↓
GitHub Actions
  ↓
review humaine
  ↓
merge
```

Un agent IA ne décide pas seul de fusionner.

---

# 83. Audit indépendant par un agent IA

Claude Code, Codex en mode audit distinct ou tout autre agent IA mandaté peut être utilisé pour :

- audit architecture ;
- sécurité ;
- cohérence ;
- dette ;
- tests manquants ;
- divergence spécifications/code.

L’agent auditeur ne réécrit pas automatiquement tout le dépôt.

Ses findings sont triés avant correction. Les corrections peuvent être confiées à tout agent IA mandaté sur une branche appropriée.

---

# 84. Local development

## 84.1 Une commande

Le projet doit être démarrable avec procédure claire.

## 84.2 Seed

Données test :

- utilisateurs ;
- comptes ;
- ticks ;
- Evaluation ;
- Performance ;
- payout.

## 84.3 Reset

Reproductible.

## 84.4 Pas de dépendance cloud obligatoire

Le cœur sandbox doit fonctionner localement autant que possible.

---

# 85. Données de démo

Toujours marquées :

- demo ;
- sandbox ;
- test.

Aucune donnée de démonstration ne doit apparaître comme preuve publique.

---

# 86. Qualité du code généré

## 86.1 Pas de boilerplate inutile

Chaque abstraction doit résoudre un problème.

## 86.2 Pas de duplication silencieuse

Chercher avant créer.

## 86.3 Pas de fichier géant

Découper par responsabilité.

## 86.4 Pas de surarchitecture

Pas de factory, bus ou repository abstrait sans besoin.

## 86.5 Pas de sous-architecture différente par agent

Les conventions sont uniques.

---

# 87. Critères d’ajout d’un service séparé

Un module devient service séparé uniquement si au moins un besoin réel existe :

- scaling indépendant ;
- isolation sécurité ;
- runtime différent ;
- équipe indépendante ;
- disponibilité différente ;
- charge mesurée.

Un « futur possible » ne suffit pas.

---

# 88. Dette technique

## 88.1 Registre

Toute dette significative possède :

- ticket ;
- impact ;
- owner ;
- date ;
- mitigation.

## 88.2 Pas de dette cachée

Les raccourcis sont documentés.

## 88.3 Critique

Dette sécurité/financière bloque release.

---

# 89. Licences

Chaque dépendance et asset doit avoir une licence compatible.

Interdit :

- code copié sans licence ;
- font redistribuée ;
- chart commercial non autorisé ;
- image non licenciée ;
- package douteux.

---

# 90. En-têtes et métadonnées

Les fichiers de policy, migrations sensibles et documents critiques possèdent :

- version ;
- owner ;
- date ;
- statut ;
- hash lorsque pertinent.

---

# 91. Compatibilité navigateur

Cibles initiales :

- navigateurs modernes principaux ;
- Safari iOS moderne ;
- Chrome Android moderne ;
- desktop Chrome/Edge/Safari/Firefox modernes.

La matrice exacte sera figée avant bêta.

---

# 92. PWA

## 92.1 V1

- installable ;
- manifest ;
- icons ;
- shell ;
- offline limité ;
- updates explicites.

## 92.2 Interdiction

Aucun ordre offline.

Aucun paiement offline.

Aucun payout offline.

---

# 93. SEO

Public uniquement.

- metadata ;
- sitemap ;
- robots ;
- canonical ;
- structured data validé ;
- performance ;
- contenu français.

Aucune donnée privée indexable.

---

# 94. CSP et headers

Avant production :

- CSP ;
- HSTS ;
- frame ancestors ;
- content type ;
- referrer ;
- permissions policy.

Configurations testées.

---

# 95. Uploads

- type allowlist ;
- taille max ;
- nom aléatoire ;
- storage privé ;
- signed URL ;
- scan futur ;
- purge selon rétention.

---

# 96. Email

- domaine vérifié ;
- SPF/DKIM/DMARC avant public ;
- templates versionnés ;
- retries ;
- bounce handling ;
- aucune donnée sensible excessive.

---

# 97. Commandes administratives

Aucune action directe SQL de routine en production.

Les actions passent par :

- Control ;
- commande auditable ;
- script versionné ;
- approval.

Les scripts de correction sont conservés.

---

# 98. Break-glass access

Si nécessaire :

- accès temporaire ;
- MFA ;
- raison ;
- durée ;
- logs ;
- revue postérieure.

---

# 99. Sauvegardes

Le Standard Operations précisera :

- fréquence ;
- rétention ;
- chiffrement ;
- restauration ;
- tests.

La Constitution impose qu’une sauvegarde non testée n’est pas considérée fiable.

---

# 100. Exit criteria avant premier prompt de code

Le premier prompt Foundation ne peut être exécuté que si :

- Product Master disponible ;
- Rulebook disponible ;
- Financial Model disponible ;
- UX Architecture disponible ;
- Design System disponible ;
- Engineering Constitution disponible ;
- dépôt GitHub privé créé ;
- dossier local relié ou prêt à être relié ;
- aucune référence R1STER restante dans les documents actifs ;
- marque WARIBA confirmée comme marque de travail ;
- autorisation multi-agent confirmée conformément à AI-015.

Le System Architecture peut être finalisé avant ou pendant la préparation du Prompt Foundation, mais aucune logique métier ne doit être codée avant sa validation.

---

# 101. Decision Log Engineering initial

| ID | Décision | Statut | Motif |
|---|---|---|---|
| ENG-001 | TypeScript strict | `LOCKED` | Fiabilité |
| ENG-002 | pnpm + Corepack | `LOCKED` | Monorepo reproductible |
| ENG-003 | Modular monolith | `LOCKED` | Simplicité |
| ENG-004 | Next.js + React | `LOCKED` | Produit web/PWA |
| ENG-005 | PostgreSQL/Supabase | `LOCKED` | Base, Auth, RLS |
| ENG-006 | Fastify si serveur séparé | `CANDIDATE` | Temps réel |
| ENG-007 | Lightweight Charts | `LOCKED` | Chart propriétaire |
| ENG-008 | Decimal/numeric | `LOCKED` | Précision |
| ENG-009 | Server authoritative | `LOCKED` | Intégrité |
| ENG-010 | Policy immuable par compte | `LOCKED` | Non-rétroactivité |
| ENG-011 | Outbox transactionnelle | `LOCKED` | Fiabilité événements |
| ENG-012 | GitHub privé | `LOCKED` | Source de vérité |
| ENG-013 | CI obligatoire | `LOCKED` | Contrôle |
| ENG-014 | Production manuelle | `LOCKED` | Réduction du risque |
| ENG-015 | Tout agent IA explicitement mandaté peut construire et modifier | `LOCKED` | AI-015 |
| ENG-016 | Audit indépendant par un agent distinct aux checkpoints requis | `LOCKED` | Séparation |
| ENG-017 | Aucune branche develop | `LOCKED` | Simplicité |
| ENG-018 | RLS obligatoire | `LOCKED` | Isolation |
| ENG-019 | PWA, pas native | `LOCKED` | Scope V1 |
| ENG-020 | Redis non requis au départ | `LOCKED` | Éviter prématurité |
| ENG-021 | Storybook/catalogue | `CANDIDATE` | Design QA |
| ENG-022 | Turborepo | `OPEN` | À décider Foundation |
| ENG-023 | ORM/query builder | `OPEN` | System Architecture |
| ENG-024 | Hosting provider | `OPEN` | System Architecture |
| ENG-025 | Monitoring provider final | `OPEN` | Architecture/Coût |

---

# 102. Décisions ouvertes pour System Architecture

1. Turborepo ou pnpm workspaces seuls ;
2. ORM/query builder ;
3. server actions ou API dédiée selon cas ;
4. hosting web ;
5. hosting realtime ;
6. hosting workers ;
7. environnements Supabase ;
8. queue implementation ;
9. WebSocket provider/runtime ;
10. analytics provider ;
11. observabilité provider ;
12. email provider ;
13. storage details ;
14. feature flag implementation ;
15. secrets manager ;
16. deployment provider ;
17. backup strategy ;
18. API documentation tool ;
19. visual regression tool ;
20. property-based test library ;
21. generated database types workflow ;
22. release versioning ;
23. browser support exact ;
24. build cache ;
25. local Docker requirements.

---

# 103. Audit des 35 rôles

| # | Rôle | Exigence d’ingénierie |
|---:|---|---|
| 1 | CEO | Architecture soutenable et orientée lancement. |
| 2 | COO | Processus reproductible et opérable. |
| 3 | CFO | Précision financière et contrôle des coûts. |
| 4 | CPO | Code subordonné au produit. |
| 5 | Chief of Staff | Decision Log et gouvernance. |
| 6 | Market Strategist | Mobile et contraintes locales. |
| 7 | Brand Strategist | WARIBA uniquement. |
| 8 | Art Director | Design System respecté. |
| 9 | Content Strategist | Terminologie stable. |
| 10 | Growth Lead | Analytics sans dark patterns. |
| 11 | Product Manager | Scope V1 contrôlé. |
| 12 | UX Researcher | Instrumentation et testabilité. |
| 13 | Information Architect | Routes et modules cohérents. |
| 14 | Product Designer | États complets. |
| 15 | Design System Lead | Tokens centralisés. |
| 16 | CRO | Risk Engine déterministe. |
| 17 | Market Specialist | Spécifications instrument. |
| 18 | Execution Specialist | Serveur autoritaire. |
| 19 | Quant Analyst | Decimal et property tests. |
| 20 | Market Data Engineer | Adapter et stale policy. |
| 21 | Software Architect | Modular monolith. |
| 22 | Frontend Lead | TypeScript et UI sans logique métier. |
| 23 | Backend Lead | Domain boundaries et idempotence. |
| 24 | Database Architect | Contraintes et migrations. |
| 25 | Realtime Engineer | Séquences et resync. |
| 26 | Security Engineer | RLS, RBAC, secrets. |
| 27 | SRE | Observabilité et rollback. |
| 28 | QA Lead | CI et tests risque. |
| 29 | Payments Lead | Webhooks signés. |
| 30 | Fraud Lead | Signaux et audit humain. |
| 31 | Legal Counsel | Policies versionnées et preuve. |
| 32 | Privacy Lead | Minimisation et rétention. |
| 33 | Customer Operations | Erreurs et support traçables. |
| 34 | AI Lead | Agents contraints par documents. |
| 35 | Community/Affiliate Lead | Aucun faux proof ou tracking abusif. |

---

# 104. Checklist avant fusion

- [ ] La tâche était Ready.
- [ ] Les sources de vérité ont été lues.
- [ ] Aucun changement métier implicite.
- [ ] TypeScript strict.
- [ ] Aucun `any` injustifié.
- [ ] Aucune valeur financière en float.
- [ ] UTC explicite.
- [ ] Validation externe.
- [ ] Permissions.
- [ ] Idempotence.
- [ ] Audit.
- [ ] Tests.
- [ ] RLS.
- [ ] Responsive.
- [ ] Accessibilité.
- [ ] Design tokens.
- [ ] Erreurs utilisateur.
- [ ] Logs sans secret.
- [ ] Documentation.
- [ ] CI verte.
- [ ] PR relue.
- [ ] Rollback connu.

---

# 105. Conclusion

WARIBA ne doit pas être construit comme une collection de pages générées.

Le produit doit être construit comme un système financier simulé :

- précis ;
- déterministe ;
- auditable ;
- versionné ;
- sécurisé ;
- testable ;
- compréhensible ;
- opérable.

La vitesse n’est pas l’absence de discipline.

La bonne discipline permet à tout agent IA mandaté de produire vite sans détruire la cohérence.

Cette Constitution v1.0 devient obligatoire pour le futur dépôt. Tout agent, développeur, script ou prompt doit la respecter. Toute dérogation significative nécessite un Decision Log, une justification, des tests et une validation explicite.

---

# 106. Appendice 08-A — invariants de certification

- Une mutation financière pilotée par tick exige l'epoch de fencing leader courant dans sa transaction.
- Un payout soumis n'est jamais payé avant réconciliation provider confirmée ou confirmation manuelle autorisée et auditée.
- L'historique financier est corrigé par écritures compensatoires, jamais par mutation rétroactive.
- Un échec de reconstruction pose un integrity hold et bloque exposition/payout.
- Les actions Control sensibles sont autorisées côté serveur, limitées par compteur PostgreSQL et auditées avec acteur, rôle, cible, avant/après, motif et corrélation.
- La certification exécute statique, unit, propriété générée, build, DB, intégration, RLS, E2E, restart, failover et charge ; un skip critique rend le verdict correspondant faux.
