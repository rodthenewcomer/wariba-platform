# WARIBA

**Plateforme francophone d'évaluation, de trading simulé et de progression pour traders.**

[![CI](https://github.com/rodthenewcomer/wariba-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/rodthenewcomer/wariba-platform/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-24%20LTS-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-workspaces-F69220?logo=pnpm&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)

Le terminal de trading s'appelle **WariX**. WARIBA fait passer des traders par un
programme d'évaluation simulé (WARIBA ONE) puis, en cas de réussite, un compte
WARIBA Performance avec partage de profit — sans jamais engager de fonds réels
des traders sur un marché live.

> **Statut** — Prompts 01 à 07 implémentés et audités, y compris les Appendices
> 07-A à 07-D (règles d'éligibilité, gestion visuelle de position, ordres en
> attente et alertes de prix). Prompt 08 (Performance & Payout — buffer 10 %,
> Performance Days, review) reste à construire. Aucune vente publique n'est
> autorisée avant les gates actuariels, juridiques et de réserve — voir
> `docs/00-decisions/DECISION_LOG.md`.

## Ce qui est construit

| Domaine                       | Fonctionnalités                                                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Commerce & activation**     | Catalogue cinq tailles (5K–100K), checkout sandbox, consentement versionné, activation de compte idempotente                                          |
| **Moteur de risque**          | DLL 3 % soft lock, Maximum Loss 10 % EOD trailing, Best Day Rule 50 %, éligibilité de profit sous 60 s, snapshots quotidiens                          |
| **WariX — exécution**         | Market orders, Stop Loss / Take Profit, clôture partielle (25/50/75/personnalisée), Close All atomique, réduction en file pendant une donnée obsolète |
| **WariX — ordres en attente** | Achat/Vente Limit/Stop server-authoritative (GTC), déclenchement sur tick réel, lignes glissables sur le graphique                                    |
| **WariX — alertes de prix**   | Franchissement de seuil (pas d'égalité), évaluation serveur, centre de notifications                                                                  |
| **WariX — graphique**         | Chandeliers `lightweight-charts`, lignes de position/SL/TP interactives, menu contextuel clic droit / appui long                                      |
| **Trader Hub**                | État de compte, mission, historique de journées, fil d'activité, multi-comptes                                                                        |
| **Control**                   | Panneau staff RBAC (support/finance/admin) — intégrité, utilisateurs, payouts                                                                         |
| **Fiabilité**                 | RLS Postgres sur chaque table sensible, idempotence sur chaque commande financière, resync WebSocket sur reconnexion                                  |

## Routes publiques

| Route                                            | Description                                             |
| ------------------------------------------------ | ------------------------------------------------------- |
| `/`, `/programme`, `/warix`, `/offres`           | Site public — vitrine, programme, terminal démo, tarifs |
| `/aide`, `/support`                              | Centre d'aide et support                                |
| `/inscription`, `/login`, `/mot-de-passe-oublie` | Authentification                                        |
| `/catalog`, `/checkout`                          | Achat d'un compte WARIBA ONE                            |
| `/hub`, `/trade`, `/comptes`, `/payouts`         | Espace trader authentifié                               |
| `/control/*`                                     | Espace staff (RBAC support/finance/admin)               |

## Sources de vérité

Lire `AGENTS.md` avant toute tâche. Toute décision produit/technique engageante
est enregistrée dans `docs/00-decisions/DECISION_LOG.md` — une décision non
écrite est une hypothèse, jamais une règle. Les addenda v1.1 du Product Master
et du Program Rulebook, le ruleset v1.1, le modèle financier v1.1 et le modèle
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
apps/web/           Next.js — Web/BFF (Public, Platform, Trade, Control via route groups)
services/realtime/   Fastify + WebSocket — moteur temps réel (exécution, ticks, ordres en attente, alertes)
services/worker/     Jobs asynchrones
packages/*           Packages partagés (voir AGENTS.md §6) :
                      adapters, application, config, contracts, database,
                      design-tokens, domain, observability, policies,
                      test-utils, ui, validation
supabase/            Config, migrations et tests Supabase locaux
docs/                Documents de référence WARIBA (source de vérité)
```

## Architecture

Voir `docs/06-engineering/WARIBA_System_Architecture_v1.0.md` et les ADR dans
`docs/00-decisions/architecture/`.
