# wariba-platform

WARIBA — plateforme francophone d’évaluation, de trading simulé et de progression pour traders.

> Statut : fondation du dépôt (Prompt 01). Aucune logique métier (auth, commerce,
> trading, risk, payout) n'est encore implémentée.

## Sources de vérité

Lire `AGENTS.md` avant toute tâche. Tous les documents de référence sont dans `docs/`.

## Prérequis

- Node.js 20 LTS (voir `.nvmrc`)
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
pnpm ci            # tout ce qui tourne en CI, dans l'ordre
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
