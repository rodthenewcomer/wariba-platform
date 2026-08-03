# wariba-platform

WARIBA — plateforme francophone d’évaluation, de trading simulé et de progression pour traders.

> Statut : Prompts 01 à 04 implémentés — fondation, design system/app shell,
> identité/commerce/activation sandbox et Trading Core déterministe. Les Prompts
> 05 à 13 restent à construire et auditer selon leur séquence.

Les cinq tailles WARIBA ONE (5K, 10K, 25K, 50K et 100K) sont actives dans le
catalogue, le checkout et l'activation de la bêta sandbox privée. Cela
n'autorise pas une vente publique. Les règles 10/3/10, les caps Performance et
la grille FCFA sont versionnés en v1.1 ; les prix et caps restent candidats
jusqu'à validation actuarielle et financière.

Le terminal de trading s'appelle **WariX**. Le site public expose les routes
`/programme`, `/warix`, `/offres`, `/aide` et `/support`.

## Sources de vérité

Lire `AGENTS.md` avant toute tâche. Les addenda v1.1 du Product Master et du
Program Rulebook, le ruleset v1.1, le modèle financier v1.1 et le modèle
actuariel complètent les baselines v1.0 dans `docs/`.

## Prérequis

- Node.js 24 LTS (voir `.nvmrc`)
- pnpm via Corepack (`corepack enable`)
- Docker (pour Supabase local)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

## Démarrage

```bash
corepack enable
pnpm install
pnpm db:start     # Supabase local (nécessite Docker)
pnpm dev
```

## Commandes principales

```bash
pnpm dev
pnpm build
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:rls
pnpm run ci        # tout ce qui tourne en CI, dans l'ordre (pnpm réserve "ci", "run" est obligatoire)
```

## Structure

```text
apps/web/        Next.js — Web/BFF (Public, Platform, Trade, Control via route groups)
services/realtime/  Fastify + WebSocket — moteur temps réel
services/worker/    Jobs asynchrones
packages/*        Packages partagés (voir AGENTS.md §6)
supabase/          Config, migrations et tests Supabase locaux
docs/              Documents de référence WARIBA (source de vérité)
```

## Architecture

Voir `docs/06-engineering/WARIBA_System_Architecture_v1.0.md` et les ADR dans
`docs/00-decisions/architecture/`.
